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

async function fetchJson(url) {
  const res = await fetch(url);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { ok: res.ok, status: res.status, json };
}

async function main() {
  await loadEnvLocal();
  const apiKey = getEnv('GOOGLE_MAPS_API_KEY');
  const name = process.argv[2] || 'Kikoff Football Alexandria';
  const address = process.argv[3] || '99 Mitchell Road, Alexandria NSW 2015';
  const city = process.argv[4] || 'Alexandria';
  const country = process.argv[5] || 'Australia';
  const lat = Number(process.argv[6] || -33.90072);
  const lng = Number(process.argv[7] || 151.19305);

  const variants = [
    `${name}`,
    name.replace(/football/ig, '').trim(),
    `KIKOFF Alexandria`,
    `KIKOFF - Alexandria`,
    `KIKOFF (Alexandria)`,
    `${name} ${city}`,
    `${name} ${address}`,
  ];

  console.log('Trying variants:', variants);

  for (const q of variants) {
    const fp = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(q)}&inputtype=textquery&fields=place_id,name,formatted_address&key=${apiKey}`;
    const { ok, status, json } = await fetchJson(fp);
    console.log('\nFindPlace:', q, ok, status, json.status, json.candidates?.slice(0,3));
    if (json.candidates?.length) break;
  }

  const fpBias = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(name)}&inputtype=textquery&fields=place_id,name,formatted_address&locationbias=circle:1500@${lat},${lng}&key=${apiKey}`;
  console.log('\nFindPlace with bias:');
  console.log((await fetchJson(fpBias)).json);

  const ts1 = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(name)}&location=${lat},${lng}&radius=1500&key=${apiKey}`;
  console.log('\nTextSearch near coords (name):');
  console.log((await fetchJson(ts1)).json);

  const full = [name, address, city, country].filter(Boolean).join(', ');
  const ts2 = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(full)}&key=${apiKey}`;
  console.log('\nTextSearch full string:');
  console.log((await fetchJson(ts2)).json);

  const kw = name.split(' ')[0];
  const nb = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=1500&keyword=${encodeURIComponent(kw)}&key=${apiKey}`;
  console.log('\nNearbySearch keyword:');
  console.log((await fetchJson(nb)).json);
}

main().catch(err => { console.error(err); process.exit(1); });


