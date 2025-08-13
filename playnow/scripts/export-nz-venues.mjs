import fs from 'fs/promises';
import fetch from 'node-fetch';

// Minimal delay helper
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
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

// --- OpenStreetMap Overpass using fixed city bounding boxes (no external APIs) ---
const CITY_BBOX = {
  Auckland:       [-37.30, 174.40, -36.50, 175.30],
  Wellington:     [-41.40, 174.60, -41.10, 174.95],
  Christchurch:   [-43.65, 172.50, -43.45, 172.80],
  Hamilton:       [-37.90, 175.10, -37.60, 175.40],
  Tauranga:       [-37.80, 176.10, -37.55, 176.35],
  Dunedin:        [-45.95, 170.40, -45.75, 170.70],
  'Palmerston North': [-40.42, 175.50, -40.28, 175.70],
  Napier:         [-39.55, 176.80, -39.45, 176.95],
  Hastings:       [-39.72, 176.76, -39.56, 176.95],
  Rotorua:        [-38.18, 176.17, -38.01, 176.35],
  'New Plymouth': [-39.15, 174.02, -39.00, 174.20],
  Nelson:         [-41.35, 173.18, -41.22, 173.31],
  Queenstown:     [-45.07, 168.60, -44.95, 168.80],
  Invercargill:   [-46.50, 168.20, -46.35, 168.45],
};

async function queryOverpassByCity(city) {
  const bbox = CITY_BBOX[city];
  if (!bbox) return [];
  const [s, w, n, e] = bbox;
  const sportsPattern = 'tennis|basketball|netball|badminton|table_tennis|volleyball|futsal|pickleball|squash|padel';
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
    body: new URLSearchParams({ data: query })
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
    if (!/^https?:\/\//i.test(homepageUrl)) homepageUrl = 'https://' + homepageUrl;
  } catch {}

  const providerHosts = [
    'clubspark.', 'courtreserve.', 'skedda.', 'ezfacility.', 'bookeo.', 'mindbodyonline.', 'enrolmy.',
    'eventbrite.', 'friendlymanager.', 'sportsground.', 'perfectmind.', 'activecarrot.', 'activenetwork.',
    'legendonlineservices.', 'sporty.co.nz', 'aucklandleisure.co.nz', 'bookings.aucklandleisure.co.nz',
    'gymmasteronline.com', 'posse.nz', 'hello.club', 'helloclub.'
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

  // Scan homepage for obvious booking links
  const homepageHtml = await fetchHtml(homepageUrl);
  if (homepageHtml) {
    const providerLink = homepageHtml.match(/href=["']([^"']+)["'][^>]*>/gi)?.map(m => m.match(/href=["']([^"']+)["']/i)?.[1]).find(h => {
      const abs = absolutize(h, homepageUrl) || '';
      return providerHosts.some(ph => abs.includes(ph));
    });
    if (providerLink) return absolutize(providerLink, homepageUrl);

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

  // Try common booking paths
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
    await sleep(120);
  }

  return null;
}

function toVenueRow(osmElement, cityLabel, bookingUrl, notes) {
  const tags = osmElement.tags || {};
  const name = tags.name || tags.operator || null;
  const { address } = extractAddressFromTags(tags);
  const sports = extractSportsFromTags(tags);
  return {
    name,
    address: address || [cityLabel, 'New Zealand'].filter(Boolean).join(', '),
    booking_url: bookingUrl,
    sports,
    notes: notes || null,
  };
}

function toCsvLine(values) {
  return values.map((v) => {
    if (v == null) return '';
    const s = String(v);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }).join(',');
}

async function main() {
  const outFile = process.argv[2] || 'playnow/CSVs/New Zealand Bookable Venues.csv';
  const cities = (
    process.env.NZ_CITIES?.split(',').map(s => s.trim()).filter(Boolean) ||
    ['Auckland','Wellington','Christchurch','Hamilton','Tauranga','Dunedin','Palmerston North','Napier','Hastings','Rotorua','New Plymouth','Nelson','Queenstown','Invercargill']
  );

  const prepared = [];
  const seenByBooking = new Set();

  for (const city of cities) {
    console.log(`City: ${city} → querying Overpass area`);
    let elements = [];
    try { elements = await queryOverpassByCity(city); }
    catch (e) { console.warn(`Overpass failed for ${city}: ${e.message}`); continue; }
    console.log(`Found ${elements.length} elements in ${city}`);

    for (const el of elements) {
      const tags = el.tags || {};
      const name = tags.name || tags.operator;
      if (!name) continue;

      const candidateWebsite = getCandidateWebsite(tags);
      if (!candidateWebsite) continue;

      let bookingUrl = null;
      try { bookingUrl = await discoverBookingLink(candidateWebsite); } catch {}
      if (!bookingUrl) continue;

      const norm = normalizeUrl(bookingUrl);
      if (seenByBooking.has(norm)) continue;
      seenByBooking.add(norm);

      const notes = await fetchDescription(bookingUrl);
      const row = toVenueRow(el, city, bookingUrl, notes);
      if (!row.name || !row.address || !row.booking_url) continue;
      prepared.push(row);

      // Be gentle
      await sleep(120);
    }

    await sleep(600);
  }

  console.log(`Prepared ${prepared.length} NZ venues with verified booking links.`);

  const header = 'Name,Sport(s),Address,Booking Link,Amenities/Notes\n';
  const lines = prepared.map(r => toCsvLine([
    r.name,
    (r.sports || []).map(s => s.replace(/_/g, ' ')).join(', '),
    r.address,
    r.booking_url,
    r.notes || ''
  ]));

  await fs.writeFile(outFile, header + lines.join('\n') + (lines.length ? '\n' : ''), 'utf8');
  console.log(`Wrote ${lines.length} rows to ${outFile}`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});


