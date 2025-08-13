import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

// --- Config & Utilities ---

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

function getSupabase() {
  const url = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const key = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  return createClient(url, key, { auth: { persistSession: false } });
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Fetch a short description from a page (for notes)
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

// --- Geocoding bounding boxes for NZ cities (HERE) ---

async function geocodeCityBounds(city, apiKey) {
  const url = new URL('https://geocode.search.hereapi.com/v1/geocode');
  url.searchParams.set('q', `${city}, New Zealand`);
  url.searchParams.set('apiKey', apiKey);
  url.searchParams.set('limit', '1');
  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const data = await res.json();
  const item = data.items?.[0];
  if (!item) return null;
  const mv = item.mapView;
  if (!mv) return null;
  // Return [south, west, north, east]
  return [mv.south, mv.west, mv.north, mv.east];
}

// --- OpenStreetMap Overpass ---

async function queryOverpass(bbox) {
  // bbox: [south, west, north, east]
  const [s, w, n, e] = bbox;
  const sportsPattern = 'tennis|basketball|netball|badminton|table_tennis|volleyball|futsal|pickleball|squash';
  const query = `
  [out:json][timeout:60];
  (
    nwr["leisure"="sports_centre"](${s},${w},${n},${e});
    nwr["leisure"="pitch"]["sport"~"${sportsPattern}"](${s},${w},${n},${e});
    nwr["leisure"="court"](${s},${w},${n},${e});
    nwr["sport"~"${sportsPattern}"](${s},${w},${n},${e});
  );
  out center tags;`;

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ data: query }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Overpass error: ${res.status} ${txt.slice(0, 200)}`);
  }
  const data = await res.json();
  return Array.isArray(data.elements) ? data.elements : [];
}

function extractAddressFromTags(tags) {
  if (!tags) return { address: null, city: null };
  const parts = [];
  const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
  if (street) parts.push(street);
  if (tags['addr:suburb']) parts.push(tags['addr:suburb']);
  if (tags['addr:city']) parts.push(tags['addr:city']);
  if (tags['addr:postcode']) parts.push(tags['addr:postcode']);
  const address = parts.join(', ');
  const city = tags['addr:city'] || tags['addr:suburb'] || null;
  return { address: address || null, city };
}

function extractSportsFromTags(tags) {
  if (!tags) return [];
  const s = tags['sport'] || '';
  return s.split(/;|,|\//).map(x => x.trim().toLowerCase()).filter(Boolean);
}

function getCandidateWebsite(tags) {
  if (!tags) return null;
  return (
    tags['website'] ||
    tags['contact:website'] ||
    tags['url'] ||
    null
  );
}

// Discover a booking link on a given site
async function discoverBookingLink(baseUrl) {
  if (!baseUrl) return null;
  let homepageUrl = baseUrl;
  try {
    // Ensure protocol
    if (!/^https?:\/\//i.test(homepageUrl)) homepageUrl = 'https://' + homepageUrl;
  } catch {}

  // Known booking provider host patterns
  const providerHosts = [
    'clubspark.','courtreserve.','skedda.','ezfacility.','bookeo.','mindbodyonline.','enrolmy.','eventbrite.','friendlymanager.','sportsground.','perfectmind.','activecarrot.','activenetwork.','legendonlineservices.','sporty.co.nz','aucklandleisure.co.nz','bookings.aucklandleisure.co.nz','gymmasteronline.com','posse.nz'
  ];

  const keywordPattern = /book|booking|bookings|book\s*now|reserve|hire|court|facility|venue|enrol|register/i;

  async function fetchHtml(url) {
    try {
      const res = await fetch(url, { redirect: 'follow', timeout: 12000 });
      if (!res.ok) return null;
      const html = await res.text();
      return html;
    } catch {
      return null;
    }
  }

  function absolutize(href, origin) {
    try { return new URL(href, origin).toString(); } catch { return null; }
  }

  // 1) Scan homepage for obvious booking links
  const homepageHtml = await fetchHtml(homepageUrl);
  if (homepageHtml) {
    // Provider direct matches
    const providerLink = homepageHtml.match(/href=["']([^"']+)["'][^>]*>/gi)?.map(m => m.match(/href=["']([^"']+)["']/i)?.[1]).find(h => {
      const abs = absolutize(h, homepageUrl) || '';
      return providerHosts.some(ph => abs.includes(ph));
    });
    if (providerLink) return absolutize(providerLink, homepageUrl);

    // Keyword anchors
    const anchors = [...homepageHtml.matchAll(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gis)];
    const scored = anchors.map((m) => {
      const href = m[1];
      const text = (m[2] || '').replace(/<[^>]+>/g, ' ');
      const title = (m[0].match(/title=["']([^"']+)["']/i)?.[1] || '');
      const label = `${text} ${title}`;
      let score = 0;
      if (keywordPattern.test(label)) score += 2;
      if (/court|hire|reserve/i.test(label)) score += 1;
      const abs = absolutize(href, homepageUrl) || '';
      if (providerHosts.some(ph => abs.includes(ph))) score += 3;
      return { href: abs, score };
    }).filter(x => x.href);
    scored.sort((a, b) => b.score - a.score);
    if (scored[0]?.score >= 2) return scored[0].href;
  }

  // 2) Try common booking paths
  const commonPaths = ['/book','/booking','/bookings','/book-now','/bookonline','/book-online','/court-hire','/court-bookings','/venue-hire','/facility-hire','/hire'];
  for (const p of commonPaths) {
    const url = absolutize(p, homepageUrl);
    if (!url) continue;
    try {
      const res = await fetch(url, { redirect: 'follow', timeout: 12000 });
      if (res.ok) {
        const html = await res.text();
        if (keywordPattern.test(html) || providerHosts.some(ph => (url + html).includes(ph))) {
          return url;
        }
      }
    } catch {}
    await sleep(150);
  }

  return null;
}

function toVenueRow(osmElement, cityLabel, bookingUrl, notes) {
  const tags = osmElement.tags || {};
  const name = tags.name || tags.operator || null;
  const { address, city } = extractAddressFromTags(tags);
  const sports = extractSportsFromTags(tags);
  const lat = osmElement.lat || osmElement.center?.lat || null;
  const lon = osmElement.lon || osmElement.center?.lon || null;
  return {
    name,
    address: address || [cityLabel, 'New Zealand'].filter(Boolean).join(', '),
    city: city || cityLabel || null,
    booking_url: bookingUrl,
    sports,
    indoor_outdoor: null,
    notes: notes || null,
    is_public: true,
    latitude: lat,
    longitude: lon,
    image_urls: [],
    amenities: [],
    photos: [],
  };
}

async function main() {
  const HERE_API_KEY = getEnv('HERE_API_KEY');
  const supabase = getSupabase();

  // Fetch existing venues to dedupe by booking_url
  const { data: existing, error: exErr } = await supabase
    .from('venues')
    .select('id,booking_url');
  if (exErr) throw new Error(`Fetch existing failed: ${exErr.message}`);
  const byBooking = new Map();
  for (const v of existing || []) {
    if (v.booking_url) byBooking.set(normalizeUrl(v.booking_url), v.id);
  }

  const cities = [
    'Auckland','Wellington','Christchurch','Hamilton','Tauranga','Dunedin','Palmerston North','Napier','Hastings','Rotorua','New Plymouth','Nelson','Queenstown','Invercargill'
  ];

  const prepared = [];

  for (const city of cities) {
    console.log(`City: ${city} → fetching bounds`);
    const bbox = await geocodeCityBounds(city, HERE_API_KEY);
    if (!bbox) { console.warn(`No bounds for ${city}`); continue; }

    // Overpass query per city
    console.log(`Querying Overpass for ${city}...`);
    let elements = [];
    try { elements = await queryOverpass(bbox); }
    catch (e) { console.warn(`Overpass failed for ${city}: ${e.message}`); continue; }
    console.log(`Found ${elements.length} elements in ${city}`);

    // Process each element, attempt to find a booking link
    for (const el of elements) {
      const tags = el.tags || {};
      const name = tags.name || tags.operator;
      if (!name) continue;

      const candidateWebsite = getCandidateWebsite(tags);
      if (!candidateWebsite) continue; // Require a site to verify booking link

      let bookingUrl = null;
      try {
        bookingUrl = await discoverBookingLink(candidateWebsite);
      } catch {}
      if (!bookingUrl) continue; // skip if no verified booking link

      const norm = normalizeUrl(bookingUrl);
      if (byBooking.has(norm)) continue; // already have this booking link

      const notes = await fetchDescription(bookingUrl);
      const row = toVenueRow(el, city, bookingUrl, notes);

      // Ensure required
      if (!row.name || !row.address || !row.booking_url) continue;
      prepared.push(row);

      // Gentle pacing to be nice to servers
      await sleep(120);
    }

    // Overpass courtesy delay between cities
    await sleep(800);
  }

  console.log(`Prepared ${prepared.length} new NZ venues with verified booking links.`);
  if (prepared.length === 0) {
    console.log('Nothing to insert.');
    return;
  }

  // Deduplicate within prepared to avoid multi-row conflicts on (name,address) and booking_url
  const unique = [];
  const seenByNameAddr = new Set();
  const seenByBooking = new Set();
  for (const row of prepared) {
    const keyNA = `${String(row.name).toLowerCase()}|${String(row.address || '').toLowerCase()}`;
    const keyBU = normalizeUrl(row.booking_url);
    if (seenByNameAddr.has(keyNA)) continue;
    if (seenByBooking.has(keyBU)) continue;
    seenByNameAddr.add(keyNA);
    seenByBooking.add(keyBU);
    unique.push(row);
  }
  if (unique.length !== prepared.length) {
    console.log(`Deduplicated ${prepared.length - unique.length} rows within batch; proceeding with ${unique.length}.`);
  }

  // Upsert prepared rows
  const chunkSize = 75;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const { error } = await supabase
      .from('venues')
      .upsert(chunk, { onConflict: 'name,address' });
    if (error) throw new Error(`Insert failed: ${error.message}`);
    console.log(`Inserted ${Math.min(i + chunk.length, unique.length)}/${unique.length}`);
    await sleep(200);
  }

  console.log('NZ discovery complete.');
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});


