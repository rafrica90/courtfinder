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

function normalizeSport(raw) {
  if (!raw) return null;
  let s = String(raw).toLowerCase().trim();
  s = s.replace(/\s*\([^)]*\)\s*/g, ''); // remove parenthetical qualifiers
  s = s.replace(/[._-]/g, ' ').replace(/\s+/g, ' ').trim();
  // synonyms
  if (s === 'football' || s === 'indoor soccer' || s === '5 a side' || s === 'five a side') return 'soccer';
  return s;
}

function parseSupportedSports(val) {
  if (!val) return [];
  const parts = Array.isArray(val) ? val : String(val).split(/[,/;]|\band\b/i);
  const result = [];
  for (const p of parts) {
    const s = normalizeSport(p);
    if (!s) continue;
    if (!result.includes(s)) result.push(s);
  }
  return result;
}

async function main() {
  const filePath = process.argv.slice(2).join(' ').trim();
  if (!filePath) throw new Error('Usage: node scripts/update-venue-sports-from-csv.mjs "/absolute/path/to/file.csv"');
  const absPath = path.resolve(filePath);
  const text = await fs.readFile(absPath, 'utf8');
  const rows = parseCsv(text);
  if (!rows.length) throw new Error('No rows parsed from CSV');

  // Expect columns: id, supported_sports (optional)
  const updates = [];
  for (const r of rows) {
    const id = (r['id'] || '').trim();
    const supported = (r['supported_sports'] || r['sports'] || '').trim();
    if (!id) continue;
    const sports = parseSupportedSports(supported);
    if (sports.length === 0) continue; // skip empties
    updates.push({ id, sports });
  }

  console.log(`Prepared ${updates.length} venue sport updates from CSV.`);
  if (updates.length === 0) return;

  const supabase = getSupabase();

  // Backup existing sports for target ids
  const ids = updates.map(u => u.id);
  const { data: existing, error: exErr } = await supabase
    .from('venues')
    .select('id,name,sport_id,sports')
    .in('id', ids);
  if (exErr) throw new Error(`Backup fetch failed: ${exErr.message}`);

  const outDir = path.resolve(process.cwd(), 'playnow', 'CSVs');
  try { await fs.mkdir(outDir, { recursive: true }); } catch {}
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const backupCsv = path.join(outDir, `backup-before-sports-update-${ts}.csv`);
  const backupJson = path.join(outDir, `backup-before-sports-update-${ts}.json`);
  const header = ['id','name','sport_id','sports'].join(',');
  const csv = [header]
    .concat((existing || []).map(v => [
      v.id,
      JSON.stringify(v.name ?? ''),
      JSON.stringify(v.sport_id ?? ''),
      JSON.stringify(Array.isArray(v.sports) ? v.sports : [])
    ].join(',')))
    .join('\n');
  await fs.writeFile(backupCsv, csv, 'utf8');
  await fs.writeFile(backupJson, JSON.stringify(existing || [], null, 2), 'utf8');
  console.log(`Backed up ${existing?.length || 0} rows.`);

  // Apply updates one-by-one to capture per-row errors and because updates per id are tiny
  let ok = 0, skipped = 0, failed = 0, missing = 0;
  for (const u of updates) {
    try {
      const { data, error } = await supabase
        .from('venues')
        .update({ sports: u.sports, sport_id: u.sports[0] })
        .eq('id', u.id)
        .select('id');
      if (error) { failed++; console.warn(`Failed ${u.id}: ${error.message}`); continue; }
      if (!data || data.length === 0) { missing++; continue; }
      ok++;
    } catch (e) {
      failed++;
      console.warn(`Error updating ${u.id}: ${e.message || e}`);
    }
    // small pacing
    await new Promise(r => setTimeout(r, 20));
  }

  console.log(`\nDone. Updated=${ok}, missing=${missing}, failed=${failed}, skipped=${skipped}`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});


