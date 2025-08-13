import fs from 'fs/promises';
import fetch from 'node-fetch';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function csvEscape(value) {
  const s = String(value ?? '');
  if (s.includes('"') || s.includes(',') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

// Discover a booking link on a given site
async function discoverBookingLink(baseUrl) {
  if (!baseUrl) return null;
  let homepageUrl = baseUrl;
  try {
    if (!/^https?:\/\//i.test(homepageUrl)) homepageUrl = 'https://' + homepageUrl;
  } catch {}

  const providerHosts = [
    'play.tennis.com.au',
    'clubspark.'
  ];

  const keywordPattern = /book|booking|bookings|book\s*now|reserve|hire|court|facility|venue/i;

  async function fetchHtml(url) {
    try {
      const res = await fetch(url, { redirect: 'follow', timeout: 12000 });
      if (!res.ok) return null;
      return await res.text();
    } catch {
      return null;
    }
  }

  function absolutize(href, origin) {
    try { return new URL(href, origin).toString(); } catch { return null; }
  }

  const homepageHtml = await fetchHtml(homepageUrl);
  if (homepageHtml) {
    const anchors = [...homepageHtml.matchAll(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gis)];
    const scored = anchors.map((m) => {
      const href = m[1];
      const text = (m[2] || '').replace(/<[^>]+>/g, ' ');
      const title = (m[0].match(/title=["']([^"']+)["']/i)?.[1] || '');
      const label = `${text} ${title}`;
      let score = 0;
      if (keywordPattern.test(label)) score += 2;
      const abs = absolutize(href, homepageUrl) || '';
      if (providerHosts.some(ph => abs.includes(ph))) score += 3;
      return { href: abs, score };
    }).filter(x => x.href);
    scored.sort((a, b) => b.score - a.score);
    if (scored[0]?.score >= 2) return scored[0].href;
  }

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

async function queryOverpassTasmaniaTennis() {
  const query = `
  [out:json][timeout:60];
  area["name"="Tasmania"]["admin_level"="4"]->.a;
  (
    nwr["leisure"="sports_centre"]["sport"="tennis"](area.a);
    nwr["leisure"="court"]["sport"="tennis"](area.a);
    nwr["leisure"="pitch"]["sport"="tennis"](area.a);
    nwr["sport"="tennis"](area.a);
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

function getCandidateWebsite(tags) {
  if (!tags) return null;
  return (
    tags['website'] ||
    tags['contact:website'] ||
    tags['url'] ||
    null
  );
}

function titleCaseSlugParts(name) {
  const cleaned = String(name || '')
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z0-9\s-]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return [];
  const words = cleaned.split(' ').filter(Boolean);
  return words.map(w => w[0].toUpperCase() + w.slice(1).toLowerCase());
}

async function checkUrlOk(url) {
  try {
    const res = await fetch(url, { redirect: 'follow', timeout: 12000 });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

async function guessPlayTennisBooking(name) {
  if (!name) return null;
  const base = 'https://play.tennis.com.au';
  const variants = [];
  const raw = String(name);
  const simplified = raw.replace(/tennis\s*(club|centre|courts)?/i, '').trim();
  const candidates = [raw, simplified].filter(Boolean);
  for (const cand of candidates) {
    const parts = titleCaseSlugParts(cand);
    if (parts.length === 0) continue;
    const pascal = parts.join('');
    const hyphen = parts.join('-');
    const justLetters = pascal.replace(/[^a-z0-9]/gi, '');
    const unique = new Set([pascal, hyphen, justLetters]);
    for (const seg of unique) {
      variants.push(`${base}/${seg}`);
      variants.push(`${base}/${seg}/Booking`);
      variants.push(`${base}/${seg}/Booking/BookByDate`);
    }
  }
  for (const url of variants) {
    const html = await checkUrlOk(url);
    if (!html) continue;
    if (url.includes('/Booking') || /Book\s?Now|Book\s?Court|Booking/i.test(html)) {
      // Prefer deep booking paths if available
      if (!url.endsWith('/BookByDate') && /href=["'][^"']*BookByDate/i.test(html)) {
        const match = html.match(/href=["']([^"']*BookByDate[^"']*)["']/i);
        if (match) {
          try { return new URL(match[1], url).toString(); } catch { return url; }
        }
      }
      return url;
    }
  }
  return null;
}

function toCsvRow(element, bookingUrl, notes) {
  const tags = element.tags || {};
  const name = tags.name || tags.operator || '';
  const { address, city } = extractAddressFromTags(tags);
  const addr = address || [city, 'Tasmania'].filter(Boolean).join(', ');
  const sport = 'Tennis';
  return [
    name,
    sport,
    addr,
    bookingUrl || '',
    notes || ''
  ];
}

async function main() {
  const outPath = process.argv[2] || 'playnow/CSVs/Tasmania Bookable Venues.csv';

  const elements = await queryOverpassTasmaniaTennis();
  const rows = [];

  // Deduplicate by candidate website domain+name
  const seenByName = new Set();

  for (const el of elements) {
    const tags = el.tags || {};
    const name = tags.name || tags.operator;
    if (!name) continue;

    let bookingUrl = null;
    const site = getCandidateWebsite(tags);
    if (site) {
      try { bookingUrl = await discoverBookingLink(site); } catch {}
    }
    if (!bookingUrl) {
      try { bookingUrl = await guessPlayTennisBooking(name); } catch {}
    }
    if (!bookingUrl) continue;

    const key = `${name.toLowerCase()}|${bookingUrl.toLowerCase()}`;
    if (seenByName.has(key)) continue;
    seenByName.add(key);

    const notes = await fetchDescription(bookingUrl);
    rows.push(toCsvRow(el, bookingUrl, notes));

    // be polite to servers
    await sleep(120);
  }

  // Prepare CSV content
  const header = ['Name','Sport(s)','Address','Booking Link','Amenities/Notes'];
  const csv = [header.map(csvEscape).join(',')]
    .concat(rows.map(r => r.map(csvEscape).join(',')))
    .join('\n') + '\n';

  await fs.writeFile(outPath, csv, 'utf8');
  console.log(`Wrote ${rows.length} rows to ${outPath}`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});


