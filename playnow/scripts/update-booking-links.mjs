import fs from 'fs/promises';
import { createClient } from '@supabase/supabase-js';

function getEnv(name, required = true) {
  const val = process.env[name];
  if (required && !val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

function normalizeUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url.trim());
    const path = u.pathname.replace(/\/$/, '').toLowerCase();
    const host = u.hostname.toLowerCase();
    const search = u.searchParams.toString();
    return `${u.protocol}//${host}${path}${search ? `?${search}` : ''}`;
  } catch {
    return String(url).trim().toLowerCase().replace(/\/$/, '');
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
        if (ch === '\r' && text[i+1] === '\n') i++;
        pushField(); pushRow();
      } else { field += ch; }
    }
    i++;
  }
  if (field.length > 0 || row.length > 0) { pushField(); pushRow(); }
  while (rows.length && rows[rows.length-1].every(c => c === '')) rows.pop();
  if (!rows.length) return [];
  // Find the first non-empty row to use as header (skip any leading blank lines)
  let headerIndex = -1;
  for (let idx = 0; idx < rows.length; idx++) {
    const r = rows[idx];
    if (r && r.some(c => String(c || '').trim() !== '')) { headerIndex = idx; break; }
  }
  if (headerIndex === -1) return [];
  const header = rows[headerIndex].map(h => String(h || '').trim());
  // Build row objects from rows after header; skip fully empty rows
  const dataRows = rows.slice(headerIndex + 1).filter(r => r && r.some(c => String(c || '').trim() !== ''));
  const out = dataRows.map(r => Object.fromEntries(header.map((h, idx) => [h, (r[idx] ?? '').trim()])));
  return out;
}

function parseCityFromAddress(address) {
  if (!address) return '';
  const parts = address.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length >= 2) return parts[parts.length - 2];
  return parts[0] || '';
}

function getSupabase() {
  const url = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const key = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  return createClient(url, key, { auth: { persistSession: false } });
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) throw new Error('Usage: node scripts/update-booking-links.mjs <path-to-csv>');

  const supabase = getSupabase();

  const csv = await fs.readFile(filePath, 'utf8');
  const rows = parseCsv(csv);
  if (!rows.length) {
    console.log('No rows parsed from CSV');
    return;
  }

  // Fetch existing venues for matching
  const { data: existing, error: exErr } = await supabase
    .from('venues')
    .select('id,name,address,city,booking_url');
  if (exErr) throw new Error(`Fetch existing failed: ${exErr.message}`);

  const byNameCity = new Map();
  const byBooking = new Map();
  for (const v of existing || []) {
    const nameKey = (v.name || '').trim().toLowerCase();
    const cityKey = (v.city || parseCityFromAddress(v.address) || '').trim().toLowerCase();
    if (nameKey) byNameCity.set(`${nameKey}|${cityKey}`, v);
    if (v.booking_url) byBooking.set(normalizeUrl(v.booking_url), v);
  }

  let prepared = 0;
  let applied = 0;
  let skipped = 0;
  let notFound = 0;
  let withCorrected = 0;
  const seenVenueIds = new Set();

  const normalizeKey = (k) => String(k || '')
    .toLowerCase()
    .replace(/\u00a0/g, ' ') // NBSP → space
    .replace(/\s+/g, ' ')    // collapse spaces
    .trim();

  function getField(obj, candidates) {
    const keys = Object.keys(obj);
    const normalizedToActual = new Map(keys.map(k => [normalizeKey(k), k]));
    for (const cand of candidates) {
      const actual = normalizedToActual.get(normalizeKey(cand));
      if (actual && obj[actual] != null && String(obj[actual]).trim().length > 0) {
        return String(obj[actual]).trim();
      }
    }
    // Fallback: try partial contains match (e.g., stray spaces)
    for (const k of keys) {
      const nk = normalizeKey(k);
      if (candidates.some(c => nk.includes(normalizeKey(c)))) {
        const v = obj[k];
        if (v != null && String(v).trim().length > 0) return String(v).trim();
      }
    }
    return '';
  }

  for (const r of rows) {
    const currentUrl = getField(r, ['Booking URL','Booking Link','booking_url']);
    const correctedUrl = getField(r, ['Correct Booking URL','Updated Booking URL','New Booking URL','Fixed Booking URL','Correct Link','Correct URL']);
    if (correctedUrl) withCorrected++;
    if (!correctedUrl) { skipped++; continue; }

    // Basic sanity: ignore if corrected is identical to current
    if (currentUrl && normalizeUrl(currentUrl) === normalizeUrl(correctedUrl)) { skipped++; continue; }

    const name = getField(r, ['Venue Name','Name','venue_name']);
    const suburbCity = getField(r, ['Suburb/City','City']);
    const street = getField(r, ['Address','address']);
    const inferredCity = suburbCity || parseCityFromAddress(street);
    const nameCityKey = `${name.toLowerCase()}|${(inferredCity || '').toLowerCase()}`;

    let match = null;
    if (name && inferredCity) match = byNameCity.get(nameCityKey) || null;
    if (!match && currentUrl) match = byBooking.get(normalizeUrl(currentUrl)) || null;
    if (!match) { notFound++; continue; }

    if (seenVenueIds.has(match.id)) { skipped++; continue; }
    prepared++;

    const { error: updErr } = await supabase
      .from('venues')
      .update({ booking_url: correctedUrl })
      .eq('id', match.id)
      .select('id');
    if (updErr) {
      console.warn(`Update failed for ${match.id} (${match.name}): ${updErr.message}`);
      continue;
    }
    seenVenueIds.add(match.id);
    applied++;
    // Mild pacing to avoid rate limits
    await new Promise(r => setTimeout(r, 25));
  }

  console.log(`Rows containing a corrected URL: ${withCorrected}`);
  console.log(`Rows matched and prepared to update: ${prepared}`);
  console.log(`Applied updates: ${applied}`);
  console.log(`Skipped (no change/duplicate): ${skipped}`);
  console.log(`No match found: ${notFound}`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});


