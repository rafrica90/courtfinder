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

async function main() {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('venues')
    .select('id,name,city,address,booking_url,sport_id,sports')
    .order('name', { ascending: true })
    .limit(10000);
  if (error) throw new Error(error.message);

  const rows = data || [];
  const total = rows.length;

  const missingSportsArray = rows.filter(v => !Array.isArray(v.sports) || v.sports.length === 0);
  const missingBoth = rows.filter(v => (!Array.isArray(v.sports) || v.sports.length === 0) && (v.sport_id == null || String(v.sport_id).trim() === ''));
  const onlySportId = rows.filter(v => (Array.isArray(v.sports) && v.sports.length > 0 ? false : true) && v.sport_id != null && String(v.sport_id).trim() !== '');
  const onlySportsArray = rows.filter(v => Array.isArray(v.sports) && v.sports.length > 0 && (v.sport_id == null || String(v.sport_id).trim() === ''));

  console.log(`Total venues: ${total}`);
  console.log(`Missing sports array (what UI shows as empty): ${missingSportsArray.length}`);
  console.log(`Missing BOTH sports array and sport_id: ${missingBoth.length}`);
  console.log(`Have sport_id but empty/NULL sports array: ${onlySportId.length}`);
  console.log(`Have sports array but NULL sport_id: ${onlySportsArray.length}`);

  if (missingSportsArray.length > 0) {
    console.log('\nSample venues missing sports array (name | city | booking_url):');
    for (const v of missingSportsArray.slice(0, 50)) {
      console.log(`- ${v.name} | ${v.city || ''} | ${normalizeUrl(v.booking_url)}`);
    }
    // Write full lists to CSV and JSON for downstream processing
    const outDir = path.resolve(process.cwd(), 'playnow', 'CSVs');
    try { await fs.mkdir(outDir, { recursive: true }); } catch {}
    const csvPath = path.join(outDir, 'missing-sports-venues.csv');
    const jsonPath = path.join(outDir, 'missing-sports-venues.json');
    const header = ['id','name','city','address','booking_url','sport_id','sports'].join(',');
    const csv = [header]
      .concat(missingSportsArray.map(v => [
        v.id,
        JSON.stringify(v.name ?? ''),
        JSON.stringify(v.city ?? ''),
        JSON.stringify(v.address ?? ''),
        JSON.stringify(normalizeUrl(v.booking_url) ?? ''),
        JSON.stringify(v.sport_id ?? ''),
        JSON.stringify(Array.isArray(v.sports) ? v.sports : [])
      ].join(',')))
      .join('\n');
    await fs.writeFile(csvPath, csv, 'utf8');
    await fs.writeFile(jsonPath, JSON.stringify(missingSportsArray, null, 2), 'utf8');
    console.log(`\nSaved full list to: ${csvPath}`);
    console.log(`Saved JSON to: ${jsonPath}`);
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});


