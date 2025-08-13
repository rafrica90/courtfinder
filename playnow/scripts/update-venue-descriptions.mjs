import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
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

async function fetchDescription(url) {
  try {
    const res = await fetch(url, { redirect: 'follow', timeout: 12000 });
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
  if (!filePath) throw new Error('Usage: node scripts/update-venue-descriptions.mjs <path-to-csv>');

  const supabase = getSupabase();

  const csv = await fs.readFile(filePath, 'utf8');
  const rows = parseCsv(csv);
  if (!rows.length) {
    console.log('No rows parsed from CSV');
    return;
  }

  // Build lookup of existing venues by normalized booking_url
  const { data: existing, error: exErr } = await supabase
    .from('venues')
    .select('id, name, booking_url, notes');
  if (exErr) throw new Error(`Fetch existing failed: ${exErr.message}`);
  const byBooking = new Map();
  for (const v of existing || []) {
    if (v.booking_url) byBooking.set(normalizeUrl(v.booking_url), v);
  }

  let updated = 0;
  for (const r of rows) {
    const bookingUrl = r['Booking Link']?.trim();
    const name = r['Name']?.trim();
    if (!bookingUrl || !name) continue;
    const key = normalizeUrl(bookingUrl);
    const match = byBooking.get(key);
    if (!match) continue;
    if (match.notes && match.notes.trim().length > 0) continue;

    const desc = await fetchDescription(bookingUrl);
    if (!desc) continue;

    const { error: updErr } = await supabase
      .from('venues')
      .update({ notes: desc })
      .eq('id', match.id);
    if (!updErr) {
      updated++;
      // rate limit mild
      await new Promise(r => setTimeout(r, 120));
    }
  }

  console.log(`Updated descriptions for ${updated} venues.`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});

