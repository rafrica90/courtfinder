import fs from 'fs/promises';
import path from 'path';

const INPUT_CSV = path.resolve(process.cwd(), 'CSVs/all-venues-from-db-validated.csv');
const REPORT_JSON = path.resolve(process.cwd(), 'CSVs/all-venues-from-db-validate-report.json');
const OUTPUT_CSV = path.resolve(process.cwd(), 'CSVs/all-venues-from-db-fixed.csv');
const OUTPUT_REPORT = path.resolve(process.cwd(), 'CSVs/all-venues-from-db-fixed-report.json');

function toCsvLine(values) {
  return values
    .map((v) => {
      if (v == null) return '';
      const s = String(v);
      if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    })
    .join(',');
}

function parseCsv(content) {
  const rows = [];
  let i = 0;
  let field = '';
  let inQuotes = false;
  let row = [];
  while (i < content.length) {
    const char = content[i];
    if (inQuotes) {
      if (char === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        field += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      }
      if (char === ',') {
        row.push(field);
        field = '';
        i++;
        continue;
      }
      if (char === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
        i++;
        continue;
      }
      if (char === '\r') {
        i++;
        continue;
      }
      field += char;
      i++;
    }
  }
  row.push(field);
  if (row.length > 1 || (row.length === 1 && row[0] !== '')) rows.push(row);
  return rows;
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function extractDomain(u) {
  try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; }
}

function decodeDuckDuckGoLink(href) {
  try {
    const url = new URL(href, 'https://duckduckgo.com');
    if (url.hostname.endsWith('duckduckgo.com')) {
      const uddg = url.searchParams.get('uddg');
      if (uddg) return decodeURIComponent(uddg);
    }
    return href;
  } catch {
    return href;
  }
}

async function ddgSearch(query) {
  const q = encodeURIComponent(query);
  const url = `https://duckduckgo.com/html/?q=${q}`;
  const res = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; VenueLinkFinder/1.0)'
    },
  });
  if (!res.ok) throw new Error(`DuckDuckGo HTTP ${res.status}`);
  const html = await res.text();
  const links = [];
  const re = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const href = decodeDuckDuckGoLink(m[1]);
    links.push(href);
  }
  return links;
}

function isLikelyBookingUrl(url) {
  const u = url.toLowerCase();
  return (
    u.includes('book') ||
    u.includes('booking') ||
    u.includes('bookings') ||
    u.includes('court') ||
    u.includes('venue-hire') ||
    u.includes('facility-hire') ||
    u.includes('perfectmind') ||
    u.includes('playspots') ||
    u.includes('clubSpark'.toLowerCase()) ||
    u.includes('play.tennis.com.au') ||
    u.includes('tennisworld') ||
    u.includes('skedda') ||
    u.includes('bookable.net')
  );
}

async function tryFindReplacement(venue, city, state, originalUrl) {
  const parts = [venue, city, state].filter(Boolean).join(' ');
  const queries = [
    `${parts} booking`,
    `${parts} book court`,
    `${venue} official booking`,
  ];
  const originalDomain = extractDomain(originalUrl);
  for (const q of queries) {
    try {
      const links = await ddgSearch(q);
      const ranked = links
        .map((l, i) => ({ url: l, i, domain: extractDomain(l) }))
        .filter((x) => x.url.startsWith('http'));
      // Prefer same domain first, then likely booking URLs
      const sameDomain = ranked.find((x) => x.domain && originalDomain && x.domain.endsWith(originalDomain));
      if (sameDomain && isLikelyBookingUrl(sameDomain.url)) return sameDomain.url;
      const likely = ranked.find((x) => isLikelyBookingUrl(x.url));
      if (likely) return likely.url;
      // Fallback to first result on same domain even if not obviously booking
      if (sameDomain) return sameDomain.url;
      // Otherwise first likely looking link
      if (ranked.length) return ranked[0].url;
    } catch (e) {
      // try next query
    }
    await sleep(500);
  }
  return null;
}

async function main() {
  const [csv, reportRaw] = await Promise.all([
    fs.readFile(INPUT_CSV, 'utf8'),
    fs.readFile(REPORT_JSON, 'utf8'),
  ]);
  const rows = parseCsv(csv);
  const header = rows[0];
  const data = rows.slice(1);
  const changedIdx = header.indexOf('Booking URL Changed');
  const bookingIdx = header.indexOf('Booking URL');
  if (bookingIdx === -1) throw new Error('Missing Booking URL column');

  const report = JSON.parse(reportRaw);
  const failures = report.failures || [];

  const updated = [];
  let fixedCount = 0;
  let attempted = 0;
  for (const f of failures) {
    const rowIndex = f.index - 1; // data offset
    const row = data[rowIndex];
    if (!row) continue;
    attempted++;
    const venue = f.venue || row[header.indexOf('Venue Name')] || '';
    const city = f.city || row[header.indexOf('Suburb/City')] || '';
    const state = f.state || row[header.indexOf('State')] || '';
    const currentUrl = row[bookingIdx] || f.normalizedUrl || f.originalUrl || '';
    try {
      const replacement = await tryFindReplacement(venue, city, state, currentUrl);
      if (replacement && replacement !== currentUrl) {
        row[bookingIdx] = replacement;
        if (changedIdx !== -1) row[changedIdx] = 'TRUE';
        fixedCount++;
        updated.push({ index: f.index, venue, old: currentUrl, new: replacement });
      }
    } catch (e) {
      // ignore
    }
    await sleep(250);
  }

  const outLines = data.map((r) => toCsvLine(r));
  await fs.writeFile(OUTPUT_CSV, header.join(',') + '\n' + outLines.join('\n') + (outLines.length ? '\n' : ''), 'utf8');
  await fs.writeFile(OUTPUT_REPORT, JSON.stringify({ fixedCount, attempted, updated }, null, 2) + '\n', 'utf8');

  console.log(`Attempted fixes for ${attempted} failures; fixed ${fixedCount}.`);
  console.log(`Wrote updated CSV to ${OUTPUT_CSV}`);
  console.log(`Details written to ${OUTPUT_REPORT}`);
}

main().catch((e) => {
  console.error(e?.stack || e?.message || String(e));
  process.exit(1);
});


