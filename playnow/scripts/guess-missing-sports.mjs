import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
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

const DETECT = {
  tennis: [/\btennis\b/i],
  pickleball: [/\bpickleball\b/i],
  futsal: [/\bfutsal\b/i],
  soccer: [/\bsoccer\b/i, /\bfootball\b/i, /5\s*-?\s*a\s*-?\s*side/i, /five\s*a\s*side/i],
  badminton: [/\bbadminton\b/i],
  squash: [/\bsquash\b/i],
  netball: [/\bnetball\b/i],
  swimming: [/\bswim(ing)?\b/i, /\bpool\b/i],
  basketball: [/\bbasketball\b/i],
  cricket: [/\bcricket\b/i],
  golf: [/\bgolf\b/i],
  gym: [/\bgym\b/i, /fitness\b/i, /strength\b/i]
};

async function fetchText(url, timeoutMs = 12000) {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; VenueSportsBot/1.0)'
      }
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const html = await res.text();
    return html;
  } catch {
    return null;
  }
}

function htmlToSearchableText(html) {
  if (!html) return '';
  try {
    // Extract title and meta descriptions quickly
    const title = html.match(/<title[^>]*>(.*?)<\/title>/is)?.[1] || '';
    const metas = [...html.matchAll(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']*)["'][^>]*>/ig)].map(m => m[1]).join(' ');
    const stripped = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ');
    return `${title} ${metas} ${stripped}`;
  } catch {
    return html;
  }
}

function detectSportsFromText(text) {
  const found = new Set();
  const hay = text || '';
  // Detect futsal first to not lose it to generic soccer terms
  if (DETECT.futsal.some(r => r.test(hay))) found.add('futsal');
  if (DETECT.soccer.some(r => r.test(hay))) found.add('soccer');
  for (const [sport, regexes] of Object.entries(DETECT)) {
    if (sport === 'futsal' || sport === 'soccer') continue;
    if (regexes.some(r => r.test(hay))) found.add(sport);
  }
  return Array.from(found);
}

async function main() {
  const supabase = getSupabase();

  // Prefer live DB to ensure fresh list; fallback to saved JSON if needed
  let venues = [];
  try {
    const { data, error } = await supabase
      .from('venues')
      .select('id,name,city,address,booking_url,sport_id,sports')
      .order('name', { ascending: true })
      .limit(10000);
    if (error) throw new Error(error.message);
    venues = (data || []).filter(v => !Array.isArray(v.sports) || v.sports.length === 0);
  } catch {
    try {
      const fallbackPath = path.resolve(process.cwd(), 'playnow', 'CSVs', 'missing-sports-venues.json');
      const txt = await fs.readFile(fallbackPath, 'utf8');
      venues = JSON.parse(txt);
    } catch {}
  }

  if (!venues.length) {
    console.log('No venues missing sports found.');
    return;
  }

  console.log(`Scanning ${venues.length} venues for sport keywords...`);

  const outDir = path.resolve(process.cwd(), 'playnow', 'CSVs');
  try { await fs.mkdir(outDir, { recursive: true }); } catch {}
  const csvPath = path.join(outDir, 'missing-sports-venues-with-guess.csv');
  const jsonPath = path.join(outDir, 'missing-sports-venues-with-guess.json');

  const results = [];

  // Throttle to avoid hammering sites
  const concurrency = 5;
  let idx = 0;
  async function worker() {
    while (idx < venues.length) {
      const i = idx++;
      const v = venues[i];
      const url = normalizeUrl(v.booking_url);
      let detected = [];
      if (url) {
        const html = await fetchText(url, 12000);
        const text = htmlToSearchableText(html || '');
        detected = detectSportsFromText(text);
      }
      results.push({
        id: v.id,
        name: v.name,
        city: v.city || '',
        address: v.address || '',
        booking_url: url,
        detected_sports: detected
      });
      console.log(`Processed ${i + 1}/${venues.length}: ${v.name} -> [${detected.join(', ')}]`);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  // Write outputs
  const header = ['id','name','city','address','booking_url','detected_sports'].join(',');
  const csv = [header]
    .concat(results.map(r => [
      r.id,
      JSON.stringify(r.name ?? ''),
      JSON.stringify(r.city ?? ''),
      JSON.stringify(r.address ?? ''),
      JSON.stringify(r.booking_url ?? ''),
      JSON.stringify(r.detected_sports)
    ].join(',')))
    .join('\n');
  await fs.writeFile(csvPath, csv, 'utf8');
  await fs.writeFile(jsonPath, JSON.stringify(results, null, 2), 'utf8');

  console.log(`\nSaved guesses to: ${csvPath}`);
  console.log(`Saved JSON to: ${jsonPath}`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});


