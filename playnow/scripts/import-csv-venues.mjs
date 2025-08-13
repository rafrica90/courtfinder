import fs from 'fs/promises';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

function getEnv(name, required = true) {
  const val = process.env[name];
  if (required && !val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

function normalizeUrl(url) {
  try {
    const u = new URL(url.trim());
    // lower-case host and pathname, remove trailing slash
    const path = u.pathname.replace(/\/$/, '').toLowerCase();
    const host = u.hostname.toLowerCase();
    const search = u.searchParams.toString();
    return `${u.protocol}//${host}${path}${search ? `?${search}` : ''}`;
  } catch {
    return url.trim().toLowerCase().replace(/\/$/, '');
  }
}

function parseCsv(text) {
  const rows = [];
  let i = 0, field = '', row = [], inQuotes = false;
  const pushField = () => { row.push(field); field = ''; };
  const pushRow = () => { rows.push(row); row = []; };
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i+1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else { field += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { pushField(); }
      else if (ch === '\n' || ch === '\r') {
        // consume CRLF
        if (ch === '\r' && text[i+1] === '\n') i++;
        pushField(); pushRow();
      } else { field += ch; }
    }
    i++;
  }
  // flush last
  if (field.length > 0 || row.length > 0) { pushField(); pushRow(); }
  // remove empty trailing rows
  while (rows.length && rows[rows.length-1].every(c => c === '')) rows.pop();
  if (!rows.length) return [];
  const header = rows[0].map(h => h.trim());
  return rows.slice(1).map(r => Object.fromEntries(header.map((h, idx) => [h, (r[idx] ?? '').trim()])));
}

async function geocode(address, apiKey) {
  const url = new URL('https://geocode.search.hereapi.com/v1/geocode');
  url.searchParams.set('q', address);
  url.searchParams.set('apiKey', apiKey);
  url.searchParams.set('limit', '1');
  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const data = await res.json();
  const item = data.items?.[0];
  if (!item?.position) return null;
  return { lat: item.position.lat, lng: item.position.lng };
}

function parseCity(address) {
  if (!address) return '';
  const parts = address.split(',').map(s => s.trim());
  // heuristic: the second last token often is suburb/city in AU format
  if (parts.length >= 2) return parts[parts.length - 2];
  return parts[0];
}

function normalizeSports(s) {
  return (s || '')
    .split(/[;,\/]|\band\b/i)
    .map(x => x.trim().toLowerCase())
    .filter(Boolean);
}

function parseArrayish(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  const raw = String(value).trim();
  if (!raw) return [];
  if (raw.startsWith('[') && raw.endsWith(']')) {
    try {
      // tolerate single quotes
      const jsonish = raw.replace(/'([^']*)'/g, '"$1"');
      const arr = JSON.parse(jsonish);
      return Array.isArray(arr) ? arr.filter(Boolean) : [];
    } catch {
      // fallback: strip brackets and split
      return raw.slice(1, -1)
        .split(',')
        .map(s => s.replace(/^\s*["']|["']\s*$/g, '').trim())
        .filter(Boolean);
    }
  }
  return raw.split(/[;,]/).map(s => s.trim()).filter(Boolean);
}

async function fetchDescription(url) {
  try {
    const res = await fetch(url, { redirect: 'follow', timeout: 10000 });
    if (!res.ok) return null;
    const html = await res.text();
    const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1]
      || html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1];
    if (metaDesc) return metaDesc.trim().slice(0, 280);
    const firstP = html.match(/<p[^>]*>(.*?)<\/p>/is)?.[1]
      ?.replace(/<[^>]+>/g, ' ')
      ?.replace(/\s+/g, ' ')
      ?.trim();
    return firstP ? firstP.slice(0, 280) : null;
  } catch {
    return null;
  }
}

function getSupabase() {
  const url = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const key = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  return createClient(url, key, { auth: { persistSession: false } });
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) throw new Error('Usage: node scripts/import-csv-venues.mjs <path-to-csv>');

  const apiKey = getEnv('HERE_API_KEY');
  const supabase = getSupabase();
  const country = process.env.GEO_COUNTRY || 'Australia';

  const csv = await fs.readFile(filePath, 'utf8');
  const rows = parseCsv(csv);
  if (!rows.length) throw new Error('No rows parsed from CSV');

  // Fetch existing venues to dedupe by booking_url
  const { data: existing, error: exErr } = await supabase
    .from('venues')
    .select('id,name,address,city,booking_url,latitude,longitude');
  if (exErr) throw new Error(`Fetch existing failed: ${exErr.message}`);
  const byBooking = new Map();
  const byNameCity = new Map();
  for (const v of existing || []) {
    if (v.booking_url) byBooking.set(normalizeUrl(v.booking_url), v);
    const nameKey = (v.name || '').trim().toLowerCase();
    const cityKey = (v.city || parseCity(v.address) || '').trim().toLowerCase();
    if (nameKey) {
      byNameCity.set(`${nameKey}|${cityKey}`, v);
    }
  }

  const inserts = [];
  const updates = [];

  for (const r of rows) {
    const name = (r['Name'] || r['Venue Name'] || r['venue_name'] || '').trim();
    const street = (r['Address'] || r['address'] || '').trim();
    const suburbCity = (r['Suburb/City'] || r['City'] || '').trim();
    const state = (r['State'] || '').trim();
    const postcode = (r['Postcode'] || r['Postal Code'] || '').trim();
    const city = (suburbCity || parseCity(street))?.trim();
    const address = (() => {
      const cityStatePost = [suburbCity, [state, postcode].filter(Boolean).join(' ')].filter(Boolean).join(' ');
      return [street, cityStatePost].filter(Boolean).join(', ');
    })();
    const bookingUrl = (r['Booking Link'] || r['Booking URL'] || r['booking_url'] || '').trim();
    if (!name || !address || !bookingUrl) continue;

    const sportsRaw = r['Sport(s)'] ?? r['Sport'] ?? r['sports'];
    const sportsArr = parseArrayish(sportsRaw);
    const sports = (sportsArr.length ? sportsArr : normalizeSports(sportsRaw))
      .map(s => s.toLowerCase());
    const key = normalizeUrl(bookingUrl);
    const existingMatch = byBooking.get(key);
    const existingByNameCity = byNameCity.get(`${name.toLowerCase()}|${(city || '').toLowerCase()}`);

    // Geocode
    const q = `${address}, ${country}`;
    let coords = null;
    try { coords = await geocode(q, apiKey); } catch {}

    if (existingMatch || existingByNameCity) {
      const target = existingMatch || existingByNameCity;
      // update only coords if missing
      if ((!target.latitude || !target.longitude) && coords) {
        updates.push({ id: target.id, latitude: coords.lat, longitude: coords.lng });
      }
      continue;
    }

    // Attempt to fetch a short description from the booking URL if no notes provided
    let notes = (r['notes'] || r['Amenities/Notes'] || r['Description'] || '')?.toString().trim() || null;
    if (!notes) {
      notes = await fetchDescription(bookingUrl);
    }

    inserts.push({
      name,
      address,
      city,
      booking_url: bookingUrl,
      sports,
      indoor_outdoor: (() => {
        const io = (r['Indoor/Outdoor'] || r['indoor_outdoor'] || '').toString().trim().toLowerCase();
        return ['indoor','outdoor','both'].includes(io) ? io : null;
      })(),
      notes,
      is_public: true,
      latitude: coords?.lat ?? null,
      longitude: coords?.lng ?? null,
      image_urls: parseArrayish(r['image_urls']),
      amenities: (() => {
        const arr = parseArrayish(r['amenities'] || r['Amenities']);
        return arr.length ? arr : [];
      })(),
      photos: parseArrayish(r['backup_urls']),
    });
  }

  console.log(`Prepared ${inserts.length} new inserts, ${updates.length} updates (coords).`);

  // Apply updates first
  for (const u of updates) {
    const { error } = await supabase.from('venues').update({ latitude: u.latitude, longitude: u.longitude }).eq('id', u.id);
    if (error) console.warn(`Update failed for ${u.id}: ${error.message}`);
    await new Promise(r => setTimeout(r, 30));
  }

  // Upsert inserts on (name,address) to avoid dupes
  const chunkSize = 100;
  for (let i = 0; i < inserts.length; i += chunkSize) {
    const chunk = inserts.slice(i, i + chunkSize);
    const { error } = await supabase.from('venues').upsert(chunk, { onConflict: 'name,address' });
    if (error) throw new Error(`Insert failed: ${error.message}`);
    console.log(`Inserted ${Math.min(i + chunk.length, inserts.length)}/${inserts.length}`);
  }

  console.log('CSV import complete.');
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});


