import fs from 'fs/promises';
import path from 'path';
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
  const header = rows[0].map(h => h.trim());
  return rows.slice(1).map(r => Object.fromEntries(header.map((h, idx) => [h, (r[idx] ?? '').trim()])));
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) throw new Error('Usage: node scripts/report-inserted-from-csv.mjs <path-to-csv>');

  const abs = path.resolve(process.cwd(), filePath);
  const csv = await fs.readFile(abs, 'utf8');
  const rows = parseCsv(csv);
  if (!rows.length) throw new Error('No rows parsed from CSV');

  const bookingUrls = rows
    .map(r => r['Booking URL']?.trim())
    .filter(Boolean);

  const supabase = createClient(
    getEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    { auth: { persistSession: false } }
  );

  // Fetch matches by booking_url first pass
  const { data, error } = await supabase
    .from('venues')
    .select('id,name,city,booking_url,latitude,longitude')
    .in('booking_url', bookingUrls)
    .limit(1000);
  if (error) throw new Error(`Supabase fetch error: ${error.message}`);

  const byBooking = new Map();
  for (const v of data || []) {
    byBooking.set(normalizeUrl(v.booking_url), v);
  }

  console.log(`Found ${data?.length || 0} records matching booking URLs from CSV.`);
  console.log('Name | City | Latitude,Longitude | Booking URL');
  for (const r of rows) {
    const key = normalizeUrl(r['Booking URL']);
    const v = byBooking.get(key);
    if (v) {
      const lat = (typeof v.latitude === 'number') ? v.latitude.toFixed(6) : 'null';
      const lng = (typeof v.longitude === 'number') ? v.longitude.toFixed(6) : 'null';
      console.log(`${v.name} | ${v.city || ''} | ${lat},${lng} | ${v.booking_url}`);
    } else {
      console.log(`${r['Venue Name']} | (not found) | -, - | ${r['Booking URL']}`);
    }
  }
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });


