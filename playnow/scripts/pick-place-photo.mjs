#!/usr/bin/env node
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
  } catch (_) {}
}

function getEnv(name, required = true) {
  const val = process.env[name];
  if (required && !val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

async function main() {
  await loadEnvLocal();
  const apiKey = getEnv('GOOGLE_MAPS_API_KEY');
  const placeId = process.argv[2];
  if (!placeId) throw new Error('Usage: node scripts/pick-place-photo.mjs <place_id>');
  const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=photos&key=${apiKey}`;
  const res = await fetch(detailsUrl);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  const json = await res.json();
  const photos = json?.result?.photos || [];
  if (!photos.length) { console.log('No photos'); return; }
  let idx = 0;
  for (const p of photos) {
    const ref = p.photoreference || p.photo_reference;
    const w = p.width || 0;
    const h = p.height || 0;
    const attrs = Array.isArray(p.html_attributions) ? p.html_attributions.join(' | ') : '';
    const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photoreference=${encodeURIComponent(ref)}&key=${getEnv('NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY', false) || apiKey}`;
    console.log(`#${idx} ${w}x${h} ${ref}`);
    console.log(`   author: ${attrs}`);
    console.log(`   url: ${url}`);
    idx++;
  }
}

main().catch(err => { console.error(err.message || err); process.exit(1); });


