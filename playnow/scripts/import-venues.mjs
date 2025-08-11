import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

function extractJsonObjectsFromRtf(rtfText) {
  // Try to find fenced json block first
  const fenceStart = rtfText.indexOf('```json');
  let text = rtfText;
  if (fenceStart !== -1) {
    text = rtfText.slice(fenceStart + 7); // after ```json
  }
  // Remove RTF control words and typical RTF groups, then unescape braces and line continuations
  text = text
    // remove RTF control words like \ansi, \paperw, etc.
    .replace(/\\[a-z]+\d* ?/gi, '')
    // remove RTF groups like {\fonttbl ...}, {\colortbl ...}, {\* ...}
    .replace(/\{\\(?:fonttbl|colortbl)[^}]*\}/gi, '')
    .replace(/\{\\\*[^}]*\}/g, '')
    // convert escaped braces to literal braces
    .replace(/\\\{/g, '{')
    .replace(/\\\}/g, '}')
    // remove trailing RTF line-continuation backslashes
    .replace(/\\\n/g, '\n')
    // normalize line breaks
    .replace(/\r?\n/g, '\n')
    // collapse all newlines to avoid broken JSON strings across lines
    .replace(/\n+/g, '');

  // Find the sydney_sports_venues: [ ... ] section (be tolerant about quotes/casing)
  const lower = text.toLowerCase();
  let keyIdx = lower.indexOf('sydney_sports_venues');
  if (keyIdx === -1) {
    // Try to locate a top-level array start if key is slightly different
    const topArray = text.indexOf('[');
    if (topArray !== -1) {
      keyIdx = Math.max(0, topArray - 20);
    }
  }
  if (keyIdx === -1) throw new Error('Could not find sydney_sports_venues in file');
  const arrayStart = text.indexOf('[', keyIdx);
  if (arrayStart === -1) throw new Error('Could not find venues array start');

  // Stream-parse JSON objects from the array, tolerating truncation
  const buf = text.slice(arrayStart + 1); // after [
  const objects = [];
  let i = 0;
  let depth = 0;
  let inString = false;
  let escaped = false;
  let current = '';
  while (i < buf.length) {
    const ch = buf[i];
    current += ch;
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
    } else {
      if (ch === '"') inString = true;
      if (ch === '{') depth++;
      if (ch === '}') depth--;
      if (depth === 0 && current.trim().endsWith('}')) {
        const jsonStr = current.trim().replace(/,$/, '');
        try {
          const obj = JSON.parse(jsonStr);
          objects.push(obj);
        } catch {
          // stop at first malformed object
          break;
        }
        current = '';
      }
      if (ch === ']') break; // end of array
    }
    i++;
  }
  return objects;
}

function parseCityFromAddress(address) {
  if (!address) return 'Sydney';
  // Try to take the suburb before ' NSW '
  const nswIdx = address.toUpperCase().indexOf(' NSW ');
  if (nswIdx > -1) {
    const before = address.slice(0, nswIdx);
    // Split by comma and take the last part (the suburb)
    const parts = before.split(',');
    const suburb = parts[parts.length - 1]?.trim();
    
    // Also extract any suburb mentioned in the street name
    // e.g., "Balmain Road" might indicate the venue serves Balmain area
    const streetPart = parts[0]?.trim() || '';
    const potentialSuburbs = [];
    
    if (suburb) potentialSuburbs.push(suburb);
    
    // Common Sydney suburb names that might appear in street names
    const suburbsInStreets = ['Balmain', 'Glebe', 'Newtown', 'Bondi', 'Manly', 'Parramatta', 
                              'Chatswood', 'Coogee', 'Randwick', 'Paddington'];
    for (const sub of suburbsInStreets) {
      if (streetPart.includes(sub) && !potentialSuburbs.includes(sub)) {
        // Store this as additional metadata, but primary city remains the actual suburb
        // This could be used for search purposes
      }
    }
    
    return suburb || 'Sydney';
  }
  const parts = address.split(',');
  return parts.length > 1 ? parts[parts.length - 1].trim() : 'Sydney';
}

function normalizeVenue(raw) {
  const name = raw.venue_name?.trim();
  const address = raw.address?.trim();
  const city = parseCityFromAddress(address);
  const sports = Array.isArray(raw.sports) ? raw.sports.map(s => String(s).toLowerCase()) : [];
  const indoorOutdoor = raw.indoor_outdoor === 'indoor' || raw.indoor_outdoor === 'outdoor' || raw.indoor_outdoor === 'both'
    ? raw.indoor_outdoor
    : null;
  const bookingUrl = raw.booking_url?.trim();
  const imageUrls = Array.isArray(raw.image_urls) ? raw.image_urls.filter(Boolean) : [];
  const amenities = typeof raw.amenities === 'string'
    ? raw.amenities.split(',').map(s => s.trim()).filter(Boolean)
    : Array.isArray(raw.amenities) ? raw.amenities : [];
  const priceText = raw.price_estimate ? String(raw.price_estimate) : null;
  const priceNumMatch = priceText ? priceText.replace(/[,]/g, '').match(/\$?(\d+(?:\.\d+)?)/) : null;
  const priceEstimate = priceNumMatch ? Number(priceNumMatch[1]) : null;
  const notes = raw.notes ? String(raw.notes) : null;
  return {
    name,
    address,
    city,
    sports,
    indoor_outdoor: indoorOutdoor,
    booking_url: bookingUrl,
    image_urls: imageUrls,
    amenities,
    price_estimate: priceEstimate,
    price_estimate_text: priceText,
    notes,
    is_public: true,
  };
}

async function readVenueObjectsFromFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const content = await fs.readFile(filePath, 'utf8');
  if (ext === '.json') {
    try {
      const json = JSON.parse(content);
      if (Array.isArray(json)) return json;
      if (Array.isArray(json.sydney_sports_venues)) return json.sydney_sports_venues;
      if (Array.isArray(json.venues)) return json.venues;
      if (Array.isArray(json.data)) return json.data;
      return [];
    } catch {
      return [];
    }
  }
  // Default to RTF extractor
  return extractJsonObjectsFromRtf(content);
}

async function main() {
  const supabase = getSupabase();
  const argPath = process.argv[2];
  const candidatePaths = [
    argPath,
    'venues.json',
    'Untitled.rtf'
  ].filter(Boolean).map(p => path.resolve(process.cwd(), p));

  let objects = [];
  let usedPath = '';
  for (const p of candidatePaths) {
    try {
      const stats = await fs.stat(p);
      if (stats.isFile()) {
        const list = await readVenueObjectsFromFile(p);
        if (Array.isArray(list) && list.length > 0) {
          objects = list;
          usedPath = p;
          break;
        }
      }
    } catch {}
  }
  if (!usedPath) {
    console.error('No input data found. Provide a JSON file (venues.json) or the existing Untitled.rtf.');
    process.exit(1);
  }
  if (objects.length === 0) {
    console.error('No venues found to import from', usedPath);
    process.exit(1);
  }
  const rows = objects.map(normalizeVenue).filter(r => r.name && r.address && r.booking_url);
  console.log(`Preparing to import ${rows.length} venues from ${path.basename(usedPath)}...`);

  // Insert in chunks to avoid payload limits
  const chunkSize = 200;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error, count } = await supabase
      .from('venues')
      .insert(chunk, { count: 'exact' })
      .select('*');
    if (error) {
      // Try upsert on unique (name,address)
      const { error: upsertError } = await supabase
        .from('venues')
        .upsert(chunk, { onConflict: 'name,address' });
      if (upsertError) {
        console.error('Failed to import venues chunk:', upsertError.message);
        process.exit(1);
      }
    }
    console.log(`Imported ${Math.min(i + chunk.length, rows.length)}/${rows.length}`);
  }
  console.log('Import complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


