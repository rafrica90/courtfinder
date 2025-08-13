import fetch from 'node-fetch';
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

function normalizeWhitespace(str) {
  return String(str || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function looksLikeStreetName(text) {
  const s = normalizeWhitespace(text).toLowerCase();
  if (!s) return false;
  if (/\d/.test(s)) return true;
  if (/( road| rd\.?| street| st\.?| avenue| ave\.?| hwy| highway| drive| dr\.?| lane| ln\.?| boulevard| blvd\.?| court| ct\.?| place| pl\.?| way )/.test(` ${s} `)) return true;
  return false;
}

async function hereGeocode(q, apiKey) {
  const url = new URL('https://geocode.search.hereapi.com/v1/geocode');
  url.searchParams.set('q', q);
  url.searchParams.set('apiKey', apiKey);
  url.searchParams.set('limit', '1');
  url.searchParams.set('lang', 'en');
  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  const item = data?.items?.[0];
  if (!item) return null;
  const a = item.address || {};
  return {
    suburb: a.district || a.subdistrict || '',
    city: a.city || '',
    state: a.stateCode || a.state || '',
    countryCode: a.countryCode || '',
  };
}

async function main() {
  const supabase = getSupabase();
  const apiKey = getEnv('HERE_API_KEY');

  // Pull all venues; we will only update rows where city looks like a street or is empty
  const { data, error } = await supabase
    .from('venues')
    .select('id,name,address,city,country')
    .limit(10000);
  if (error) throw new Error(error.message);

  const candidates = (data || []).filter((v) => !v.city || looksLikeStreetName(v.city));
  console.log(`Total venues: ${(data || []).length}`);
  console.log(`Candidates to normalize: ${candidates.length}`);

  for (const v of candidates) {
    const parts = [];
    if (v.address) parts.push(v.address);
    if (v.city && !looksLikeStreetName(v.city)) parts.push(v.city);
    parts.push(v.country || 'Australia');
    const q = normalizeWhitespace(parts.join(', '));
    let h = null;
    try { h = await hereGeocode(q, apiKey); } catch {}
    const newCity = normalizeWhitespace(h?.suburb || h?.city || v.city || '');
    const newState = normalizeWhitespace(h?.state || '');
    if (!newCity && !newState) continue;

    const payload = {};
    if (newCity && newCity !== normalizeWhitespace(v.city)) payload.city = newCity;
    if (newState) payload.state = newState.toUpperCase();
    if (Object.keys(payload).length === 0) continue;

    const { error: updErr } = await supabase
      .from('venues')
      .update(payload)
      .eq('id', v.id)
      .select('id');
    if (updErr) {
      console.warn(`Update failed for ${v.id} (${v.name}): ${updErr.message}`);
    } else {
      console.log(`✓ ${v.name} → ${JSON.stringify(payload)}`);
    }
    await new Promise((r) => setTimeout(r, 180));
  }

  console.log('Normalization complete.');
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});



