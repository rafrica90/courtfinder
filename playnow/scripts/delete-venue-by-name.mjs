import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

async function loadEnvLocal() {
  const envPath = path.join(process.cwd(), 'playnow', '.env.local');
  try {
    const content = await fs.readFile(envPath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) {
        const key = m[1];
        let value = m[2];
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = value;
      }
    }
  } catch (_) {
    // ignore if missing
  }
}

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
  await loadEnvLocal();
  const nameArg = process.argv.slice(2).join(' ').trim();
  if (!nameArg) throw new Error('Usage: node scripts/delete-venue-by-name.mjs "<venue name>"');
  const target = nameArg.toLowerCase();

  const supabase = getSupabase();

  // Find matches using ilike then exact compare in JS
  const { data, error } = await supabase
    .from('venues')
    .select('id,name,city,address,booking_url')
    .ilike('name', `%${nameArg}%`)
    .limit(1000);
  if (error) throw new Error(`Select failed: ${error.message}`);

  const matches = (data || []).filter(v => String(v.name || '').trim().toLowerCase() === target);
  console.log(`Matches for name = "${nameArg}": ${matches.length}`);

  if (matches.length === 0) {
    console.log('No exact matches found. Aborting.');
    return;
  }

  // Backup
  const outDir = path.resolve(process.cwd(), 'playnow', 'CSVs');
  try { await fs.mkdir(outDir, { recursive: true }); } catch {}
  const safe = target.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const csvPath = path.join(outDir, `backup-before-delete-${safe}.csv`);
  const jsonPath = path.join(outDir, `backup-before-delete-${safe}.json`);
  const header = ['id','name','city','address','booking_url'].join(',');
  const csv = [header]
    .concat(matches.map(v => [
      v.id,
      JSON.stringify(v.name ?? ''),
      JSON.stringify(v.city ?? ''),
      JSON.stringify(v.address ?? ''),
      JSON.stringify(normalizeUrl(v.booking_url) ?? '')
    ].join(',')))
    .join('\n');
  await fs.writeFile(csvPath, csv, 'utf8');
  await fs.writeFile(jsonPath, JSON.stringify(matches, null, 2), 'utf8');
  console.log(`Backed up to:\n- ${csvPath}\n- ${jsonPath}`);

  // Delete
  const ids = matches.map(v => v.id);
  const { data: deleted, error: delErr } = await supabase
    .from('venues')
    .delete()
    .in('id', ids)
    .select('id');
  if (delErr) throw new Error(`Delete failed: ${delErr.message}`);
  console.log(`Deleted ${deleted?.length || 0} row(s).`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});


