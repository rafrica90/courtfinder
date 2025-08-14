#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
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

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function findPlaceId(name, address, city, country, apiKey, latitude, longitude) {
  const parts = [name, address, city, country].filter(Boolean).join(', ');
  // Strategy 1: Plain Find Place
  {
    const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(parts)}&inputtype=textquery&fields=place_id,name,formatted_address&key=${apiKey}`;
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      if (json.status === 'OK' && json.candidates?.length) {
        const best = json.candidates[0];
        return { place_id: best.place_id, resolved_name: best.name, resolved_address: best.formatted_address };
      }
    }
  }
  // Strategy 2: Find Place with locationbias if coords available
  if (typeof latitude === 'number' && typeof longitude === 'number') {
    const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(name)}&inputtype=textquery&fields=place_id,name,formatted_address&locationbias=circle:1000@${latitude},${longitude}&key=${apiKey}`;
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      if (json.status === 'OK' && json.candidates?.length) {
        const best = json.candidates[0];
        return { place_id: best.place_id, resolved_name: best.name, resolved_address: best.formatted_address };
      }
    }
  }
  // Strategy 3: Text Search near coords
  if (typeof latitude === 'number' && typeof longitude === 'number') {
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(name)}&location=${latitude},${longitude}&radius=1500&key=${apiKey}`;
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      if ((json.status === 'OK' || json.status === 'ZERO_RESULTS') && json.results?.length) {
        const best = json.results[0];
        return { place_id: best.place_id, resolved_name: best.name, resolved_address: best.formatted_address || '' };
      }
    }
  }
  // Strategy 4: Text Search with full name + address string (no location)
  {
    const full = [name, address, city, country].filter(Boolean).join(', ');
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(full)}&key=${apiKey}`;
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      if (json.status === 'OK' && json.results?.length) {
        const best = json.results[0];
        return { place_id: best.place_id, resolved_name: best.name, resolved_address: best.formatted_address || '' };
      }
    }
  }
  // Strategy 5: Nearby Search with keyword when coords available
  if (typeof latitude === 'number' && typeof longitude === 'number') {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=1500&keyword=${encodeURIComponent(name.split(' ')[0])}&key=${apiKey}`;
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      if (json.status === 'OK' && json.results?.length) {
        const best = json.results[0];
        return { place_id: best.place_id, resolved_name: best.name, resolved_address: best.vicinity || '' };
      }
    }
  }
  return null;
}

async function main() {
  await loadEnvLocal();
  const supabase = getSupabase();
  const apiKey = getEnv('GOOGLE_MAPS_API_KEY');

  const dryRun = process.argv.includes('--dry');
  const batchSizeFlag = process.argv.indexOf('--batch');
  const batchSize = batchSizeFlag >= 0 ? Math.max(1, Number(process.argv[batchSizeFlag + 1] || 50)) : 50;

  let updated = 0, lookedUp = 0, batch = 0;
  const attemptedIds = new Set();
  while (true) {
    batch++;
    const { data: rows, error } = await supabase
      .from('venues')
      .select('id, name, address, city, country, place_id, latitude, longitude')
      .is('place_id', null)
      .order('id', { ascending: true })
      .limit(batchSize);
    if (error) throw new Error(`Supabase fetch error: ${error.message}`);
    if (!rows || rows.length === 0) {
      if (batch === 1) console.log('No venues missing place_id.');
      break;
    }

    const unattempted = rows.filter(v => !attemptedIds.has(v.id));
    if (unattempted.length === 0) {
      // We have already attempted this window; likely only non-match remain at the front.
      break;
    }

    for (const v of unattempted) {
      attemptedIds.add(v.id);
      lookedUp++;
      const result = await findPlaceId(v.name, v.address, v.city, v.country || 'Australia', apiKey, v.latitude, v.longitude);
      if (!result) {
        console.log(`No match: ${v.name} (${v.city || ''})`);
        await delay(120);
        continue;
      }
      console.log(`Match: ${v.name} -> ${result.resolved_name} | ${result.resolved_address} | ${result.place_id}`);
      if (!dryRun) {
        const { error: updErr } = await supabase
          .from('venues')
          .update({ place_id: result.place_id })
          .eq('id', v.id);
        if (updErr) {
          console.warn(`Update failed for ${v.id}: ${updErr.message}`);
        } else {
          updated++;
        }
        await delay(150);
      }
    }
  }

  console.log(`Looked up: ${lookedUp}, Updated: ${updated}${dryRun ? ' (dry-run)' : ''}`);
}

main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});


