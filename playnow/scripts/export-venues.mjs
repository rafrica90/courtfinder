import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

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

function toCsvLine(values) {
  return values.map((v) => {
    if (v == null) return '';
    const s = String(v);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }).join(',');
}

function toExportRow(v) {
  return {
    'Venue Name': v.name || '',
    'Sport(s)': Array.isArray(v.sports) ? v.sports.join(', ') : '',
    'Address': v.address || '',
    'Suburb/City': v.city || '',
    'State': '',
    'Postcode': '',
    'Booking URL': v.booking_url || '',
    'Description': v.notes || '',
    'Amenities': Array.isArray(v.amenities) ? v.amenities.join(', ') : '',
  };
}

async function main() {
  const outPath = process.argv[2] || path.resolve(process.cwd(), 'CSVs/all-venues-from-db.csv');
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('venues')
    .select('id,name,address,city,booking_url,sports,notes,amenities')
    .order('city', { ascending: true, nullsFirst: true })
    .order('name', { ascending: true });

  if (error) throw new Error(`Supabase fetch error: ${error.message}`);
  const rows = data || [];
  console.log(`Fetched ${rows.length} venues from the database.`);

  const header = ['Venue Name','Sport(s)','Address','Suburb/City','State','Postcode','Booking URL','Description','Amenities'];
  const lines = rows.map(v => toExportRow(v)).map(r => toCsvLine(header.map(h => r[h] ?? '')));
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, header.join(',') + '\n' + lines.join('\n') + (lines.length ? '\n' : ''), 'utf8');
  console.log(`Wrote CSV to ${outPath}`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});


