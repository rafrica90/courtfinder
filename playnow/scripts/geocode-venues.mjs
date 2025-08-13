import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

function getEnv(name, required = true) {
  const val = process.env[name];
  if (required && !val) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return val;
}

function getSupabase() {
  const url = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const key = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  return createClient(url, key, { auth: { persistSession: false } });
}

async function geocodeAddress(q, apiKey) {
  const url = new URL('https://geocode.search.hereapi.com/v1/geocode');
  url.searchParams.set('q', q);
  url.searchParams.set('apiKey', apiKey);
  url.searchParams.set('limit', '1');
  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HERE geocode failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  const item = data.items?.[0];
  if (!item?.position) return null;
  return { lat: item.position.lat, lng: item.position.lng };
}

async function main() {
  const apiKey = getEnv('HERE_API_KEY');
  const supabase = getSupabase();

  console.log('Fetching venues missing coordinates...');
  const { data: venues, error } = await supabase
    .from('venues')
    .select('id,name,address,city,latitude,longitude')
    .or('latitude.is.null,longitude.is.null')
    .limit(5000);

  if (error) throw new Error(`Supabase fetch error: ${error.message}`);
  if (!venues || venues.length === 0) {
    console.log('No venues without coordinates found.');
    return;
  }

  console.log(`Found ${venues.length} venues to geocode.`);

  const updates = [];
  for (const v of venues) {
    const qParts = [];
    if (v.address) qParts.push(v.address);
    if (v.city) qParts.push(v.city);
    // Add country hint to improve accuracy
    qParts.push('Australia');
    const q = qParts.join(', ');

    try {
      const pos = await geocodeAddress(q, apiKey);
      if (pos) {
        updates.push({ id: v.id, latitude: pos.lat, longitude: pos.lng });
        console.log(`✓ ${v.name} → ${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`);
      } else {
        console.warn(`✗ No result for: ${v.name} (${q})`);
      }
    } catch (e) {
      console.warn(`✗ Geocode failed for ${v.name}: ${e.message}`);
    }
    // Gentle pacing
    await new Promise(r => setTimeout(r, 200));
  }

  if (updates.length === 0) {
    console.log('No coordinates to update.');
    return;
  }

  console.log(`Updating ${updates.length} venues with coordinates...`);
  for (const row of updates) {
    const { error: updErr } = await supabase
      .from('venues')
      .update({ latitude: row.latitude, longitude: row.longitude })
      .eq('id', row.id);
    if (updErr) {
      console.warn(`✗ Update failed for ${row.id}: ${updErr.message}`);
    }
    await new Promise(r => setTimeout(r, 50));
  }
  console.log('Coordinate update complete.');
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});


