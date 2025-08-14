import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const FIXES = path.resolve(process.cwd(), 'CSVs/booking-url-fixes-with-city.csv');

function getEnv(name, required = true) {
  const val = process.env[name];
  if (required && !val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

function getSupabase() {
  const url = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const key = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  return createClient(url, key, { auth: { persistSession: false } });
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
  if (!rows.length) return { header: [], data: [] };
  const header = rows[0];
  const data = rows.slice(1);
  return { header, data };
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

async function main() {
  const supabase = getSupabase();
  const fixesText = await fs.readFile(FIXES, 'utf8');
  const { header, data } = parseCsv(fixesText);
  const hIdx = Object.fromEntries(header.map((h, i) => [h, i]));

  const { data: existing, error } = await supabase
    .from('venues')
    .select('id,name,city,address,booking_url');
  if (error) throw new Error(error.message);

  const byNameCity = new Map();
  const byBooking = new Map();
  for (const v of existing || []) {
    const nk = (v.name || '').trim().toLowerCase();
    const ck = (v.city || '').trim().toLowerCase();
    if (nk) byNameCity.set(`${nk}|${ck}`, v);
    if (v.booking_url) byBooking.set(normalizeUrl(v.booking_url), v);
  }

  const unmatched = [];
  for (const r of data) {
    const name = (r[hIdx['Venue Name']] || '').trim();
    const city = (r[hIdx['Suburb/City']] || '').trim();
    const currentUrl = (r[hIdx['Booking URL']] || '').trim();
    const corrected = (r[hIdx['Correct Booking URL']] || '').trim();

    let match = null;
    if (name && city) match = byNameCity.get(`${name.toLowerCase()}|${city.toLowerCase()}`) || null;
    if (!match && currentUrl) match = byBooking.get(normalizeUrl(currentUrl)) || null;
    if (!match) unmatched.push({ name, city, currentUrl, corrected });
  }

  if (unmatched.length) {
    console.log('Unmatched fixes:', JSON.stringify(unmatched, null, 2));
  } else {
    console.log('All fixes matched.');
  }
}

main().catch((e) => {
  console.error(e?.stack || e?.message || String(e));
  process.exit(1);
});


