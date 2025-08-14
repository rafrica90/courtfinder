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
  } catch (_) {
    // ignore if missing
  }
}

async function main() {
  await loadEnvLocal();
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error('GOOGLE_MAPS_API_KEY not set. Add it to playnow/.env.local or export it in your shell.');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const placeIdFlagIndex = args.indexOf('--place-id');
  const providedPlaceId = placeIdFlagIndex >= 0 ? args[placeIdFlagIndex + 1] : null;
  const query = providedPlaceId ? '' : (args.join(' ') || 'Sydney Opera House');
  if (providedPlaceId) {
    console.log(`Using provided place_id: ${providedPlaceId}`);
  } else {
    console.log(`Query: ${query}`);
  }

  let placeId = providedPlaceId || '';
  if (!placeId) {
    const findPlaceUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=place_id,name&key=${apiKey}`;
    const findRes = await fetch(findPlaceUrl);
    if (!findRes.ok) {
      console.error('Find Place request failed:', findRes.status);
      process.exit(1);
    }
    const findJson = await findRes.json();
    const status = findJson?.status;
    if (status !== 'OK') {
      console.error(`Find Place status: ${status}${findJson?.error_message ? ' - ' + findJson.error_message : ''}`);
    }
    const candidate = findJson?.candidates?.[0];
    if (!candidate?.place_id) {
      console.error('No place found for query; falling back to Sydney Opera House place_id.');
      placeId = 'ChIJ3S-JXmauEmsRUcIaWtf4MzE';
    } else {
      placeId = candidate.place_id;
      console.log(`Found place: ${candidate.name} (${placeId})`);
    }
  }

  const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=photos,name&key=${apiKey}`;
  const detRes = await fetch(detailsUrl);
  if (!detRes.ok) {
    console.error('Place Details request failed:', detRes.status);
    process.exit(1);
  }
  const detJson = await detRes.json();
  if (detJson?.status && detJson.status !== 'OK') {
    console.error(`Place Details status: ${detJson.status}${detJson?.error_message ? ' - ' + detJson.error_message : ''}`);
  }
  const photos = detJson?.result?.photos || [];
  if (photos.length === 0) {
    console.error('No photos available for this place. Try another query.');
    process.exit(1);
  }
  const first = photos[0];
  const photoRef = first.photoreference || first.photo_reference;
  if (!photoRef) {
    console.error('No photo_reference on first photo.');
    process.exit(1);
  }
  const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${encodeURIComponent(photoRef)}&key=${apiKey}`;

  // Parse author attributions (HTML <a> tags)
  const htmlAttrs = Array.isArray(first.html_attributions) ? first.html_attributions : [];
  const attributions = htmlAttrs.map(h => {
    const m = h.match(/href="([^"]+)"[^>]*>([^<]+)<\/a>/i);
    if (m) return { name: m[2], url: m[1] };
    return null;
  }).filter(Boolean);

  console.log('Photo URL:');
  console.log(photoUrl);
  if (attributions.length > 0) {
    console.log('Author attribution(s):');
    for (const a of attributions) {
      console.log(`- ${a.name}: ${a.url}`);
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});


