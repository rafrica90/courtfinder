import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

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

function normalizeUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(String(url).trim());
    const path = u.pathname.replace(/\/$/, '').toLowerCase();
    const host = u.hostname.toLowerCase();
    const search = u.searchParams.toString();
    return `${u.protocol}//${host}${path}${search ? `?${search}` : ''}`;
  } catch {
    return String(url).trim().toLowerCase().replace(/\/$/, '');
  }
}

const NZ_CITIES = [
  'Auckland','Wellington','Christchurch','Hamilton','Tauranga','Dunedin','Palmerston North','Napier','Hastings','Rotorua','New Plymouth','Nelson','Queenstown','Invercargill'
];

async function main() {
  const supabase = getSupabase();

  // 1) Identify candidates using multiple queries (avoid complex OR on DELETE)
  const [qCity, qAddr, qDomain] = await Promise.all([
    supabase.from('venues').select('id,name,city,address,booking_url').in('city', NZ_CITIES).limit(10000),
    supabase.from('venues').select('id,name,city,address,booking_url').ilike('address', '%New Zealand%').limit(10000),
    supabase.from('venues').select('id,name,city,address,booking_url').ilike('booking_url', '%.nz%').limit(10000),
  ]);
  for (const r of [qCity.error, qAddr.error, qDomain.error]) {
    if (r) throw new Error(`Select failed: ${r.message}`);
  }
  const combine = (q) => (Array.isArray(q.data) ? q.data : []);
  const unionMap = new Map();
  [...combine(qCity), ...combine(qAddr), ...combine(qDomain)].forEach(v => {
    if (v && v.id && !unionMap.has(v.id)) unionMap.set(v.id, v);
  });
  const rows = [...unionMap.values()];
  console.log(`Found ${rows.length} NZ candidate venues.`);

  // 2) Backup to CSV/JSON
  const outDir = path.resolve(process.cwd(), 'playnow', 'CSVs');
  try { await fs.mkdir(outDir, { recursive: true }); } catch {}
  const csvPath = path.join(outDir, 'nz-venues-before-delete.csv');
  const jsonPath = path.join(outDir, 'nz-venues-before-delete.json');
  const header = ['id','name','city','address','booking_url'].join(',');
  const csv = [header]
    .concat(rows.map(v => [
      v.id,
      JSON.stringify(v.name ?? ''),
      JSON.stringify(v.city ?? ''),
      JSON.stringify(v.address ?? ''),
      JSON.stringify(normalizeUrl(v.booking_url) ?? '')
    ].join(',')))
    .join('\n');
  await fs.writeFile(csvPath, csv, 'utf8');
  await fs.writeFile(jsonPath, JSON.stringify(rows, null, 2), 'utf8');
  console.log(`Backed up ${rows.length} rows to:`);
  console.log(`- ${csvPath}`);
  console.log(`- ${jsonPath}`);

  if (rows.length === 0) {
    console.log('Nothing to delete.');
    return;
  }

  // 3) Delete by IDs
  const ids = rows.map(r => r.id);
  const { data: deleted, error: delErr } = await supabase
    .from('venues')
    .delete()
    .in('id', ids)
    .select('id');
  if (delErr) throw new Error(`Delete failed: ${delErr.message}`);
  console.log(`Deleted ${deleted?.length || 0} venues that matched NZ filters.`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});


