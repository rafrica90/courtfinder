import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';

function getEnv(name, required = true) {
  const val = process.env[name];
  if (required && !val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

function normalizeUrl(url) {
  try {
    const u = new URL(url.trim());
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

function getSupabase() {
  const url = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const key = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  return createClient(url, key, { auth: { persistSession: false } });
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) throw new Error('Usage: node scripts/report-venue-notes.mjs <path-to-csv>');
  const csv = await fs.readFile(filePath, 'utf8');
  const rows = parseCsv(csv);
  if (!rows.length) throw new Error('No rows parsed from CSV');

  const supabase = getSupabase();
  const byBooking = new Map();
  for (const r of rows) {
    const bu = r['Booking Link']?.trim();
    const name = r['Name']?.trim();
    if (!bu || !name) continue;
    byBooking.set(normalizeUrl(bu), name);
  }

  const { data, error } = await supabase
    .from('venues')
    .select('id,name,booking_url,notes');
  if (error) throw new Error(error.message);

  let withNotes = 0, withoutNotes = 0;
  for (const v of data || []) {
    const key = v.booking_url ? normalizeUrl(v.booking_url) : null;
    if (!key) continue;
    if (!byBooking.has(key)) continue;
    if (v.notes && v.notes.trim().length > 0) withNotes++; else withoutNotes++;
  }
  console.log(`CSV venues with notes: ${withNotes}, without notes: ${withoutNotes}`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});


