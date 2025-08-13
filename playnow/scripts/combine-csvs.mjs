import fs from 'fs/promises';
import path from 'path';

function parseCsv(text) {
  const rows = [];
  let i = 0, field = '', row = [], inQuotes = false;
  const pushField = () => { row.push(field); field = ''; };
  const pushRow = () => { rows.push(row); row = []; };
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i+1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else { field += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { pushField(); }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i+1] === '\n') i++;
        pushField(); pushRow();
      } else { field += ch; }
    }
    i++;
  }
  if (field.length > 0 || row.length > 0) { pushField(); pushRow(); }
  while (rows.length && rows[rows.length-1].every(c => c === '')) rows.pop();
  if (!rows.length) return [];
  const header = rows[0].map(h => h.trim());
  return rows.slice(1).map(r => Object.fromEntries(header.map((h, idx) => [h, (r[idx] ?? '').trim()])));
}

function toCsvLine(values) {
  return values.map((v) => {
    if (v == null) return '';
    const s = String(v);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }).join(',');
}

function normalizeRow(r) {
  const venueName = (r['Venue Name'] || r['Name'] || r['venue_name'] || '').trim();
  const address = (r['Address'] || r['address'] || '').trim();
  const suburbCity = (r['Suburb/City'] || r['City'] || '').trim();
  const state = (r['State'] || '').trim();
  const postcode = (r['Postcode'] || r['Postal Code'] || '').trim();
  const bookingUrl = (r['Booking URL'] || r['Booking Link'] || r['booking_url'] || '').trim();
  const sports = (r['Sport(s)'] || r['Sport'] || r['sports'] || '').trim();
  const description = (r['Description'] || r['Amenities/Notes'] || r['notes'] || '').toString().trim();
  const amenities = (r['Amenities'] || r['amenities'] || '').toString().trim();
  if (!venueName || !address || !bookingUrl) return null;
  return {
    'Venue Name': venueName,
    'Sport(s)': sports,
    'Address': address,
    'Suburb/City': suburbCity,
    'State': state,
    'Postcode': postcode,
    'Booking URL': bookingUrl,
    'Description': description,
    'Amenities': amenities,
  };
}

function normalizeUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url.trim());
    const pathn = u.pathname.replace(/\/$/, '').toLowerCase();
    const host = u.hostname.toLowerCase();
    const search = u.searchParams.toString();
    return `${u.protocol}//${host}${pathn}${search ? `?${search}` : ''}`;
  } catch {
    return String(url).trim().toLowerCase().replace(/\/$/, '');
  }
}

async function readCsvFile(filePath) {
  try {
    const text = await fs.readFile(filePath, 'utf8');
    return parseCsv(text);
  } catch {
    return [];
  }
}

async function main() {
  const outPath = process.argv[2] || path.resolve(process.cwd(), 'CSVs/all-venues-combined.csv');
  const inputs = process.argv.slice(3).filter(Boolean);

  const defaultCandidates = [
    path.resolve(process.cwd(), 'CSVs/Brisbane Bookable Venues.csv'),
    path.resolve(process.cwd(), 'CSVs/New Zealand Bookable Venues.csv'),
    path.resolve(process.cwd(), 'CSVs/Perth Bookable Courts.csv'),
    path.resolve(process.cwd(), 'CSVs/Perth Bookable Venues.csv'),
    path.resolve(process.cwd(), 'CSVs/Tasmania%20Bookable%20Venues.csv'),
    '/Users/ram/Downloads/Tasmania Bookable Venues.csv',
    '/Users/ram/Downloads/Adelaide Sports Venues.csv',
    '/Users/ram/Downloads/Melbourne Bookable Sports Venues.csv',
    '/Users/ram/Downloads/Brisbane Bookable Venues New Additions Aug 2025.csv',
  ];

  const files = (inputs.length ? inputs : defaultCandidates);
  const seenByBooking = new Set();
  const rowsOut = [];

  for (const f of files) {
    try {
      const stats = await fs.stat(f);
      if (!stats.isFile()) continue;
    } catch { continue; }

    const rows = await readCsvFile(f);
    for (const r of rows) {
      const norm = normalizeRow(r);
      if (!norm) continue;
      const bookingKey = normalizeUrl(norm['Booking URL']);
      if (seenByBooking.has(bookingKey)) continue;
      seenByBooking.add(bookingKey);
      rowsOut.push(norm);
    }
  }

  // Sort by city then name for readability
  rowsOut.sort((a, b) => {
    const ac = (a['Suburb/City'] || '').toLowerCase();
    const bc = (b['Suburb/City'] || '').toLowerCase();
    if (ac < bc) return -1; if (ac > bc) return 1;
    const an = (a['Venue Name'] || '').toLowerCase();
    const bn = (b['Venue Name'] || '').toLowerCase();
    if (an < bn) return -1; if (an > bn) return 1; return 0;
  });

  const header = [
    'Venue Name','Sport(s)','Address','Suburb/City','State','Postcode','Booking URL','Description','Amenities'
  ];
  const lines = rowsOut.map(r => toCsvLine(header.map(h => r[h] ?? '')));
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, header.join(',') + '\n' + lines.join('\n') + (lines.length ? '\n' : ''), 'utf8');
  console.log(`Wrote ${rowsOut.length} rows to ${outPath}`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});


