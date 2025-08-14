import fs from 'fs/promises';
import path from 'path';

const REPORT = path.resolve(process.cwd(), 'CSVs/all-venues-from-db-fixed-report.json');
const SOURCE = path.resolve(process.cwd(), 'CSVs/all-venues-from-db.csv');
const OUT = path.resolve(process.cwd(), 'CSVs/booking-url-fixes-with-city.csv');

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
  if (!rows.length) return { header: [], data: [] };
  const header = rows[0];
  const data = rows.slice(1);
  return { header, data };
}

async function main() {
  const [reportRaw, sourceCsv] = await Promise.all([
    fs.readFile(REPORT, 'utf8'),
    fs.readFile(SOURCE, 'utf8'),
  ]);
  const report = JSON.parse(reportRaw);
  const updates = Array.isArray(report.updated) ? report.updated : [];
  const { header, data } = parseCsv(sourceCsv);
  const nameIdx = header.indexOf('Venue Name');
  const cityIdx = header.indexOf('Suburb/City');
  const bookingIdx = header.indexOf('Booking URL');
  const indexToCity = new Map();
  const nameToCity = new Map();
  for (const row of data) {
    const nm = (row[nameIdx] || '').trim();
    const ct = (row[cityIdx] || '').trim();
    const bu = (row[bookingIdx] || '').trim();
    if (nm) nameToCity.set(nm, ct);
    if (bu) indexToCity.set(bu, ct);
  }

  const outHeader = ['Venue Name','Suburb/City','Booking URL','Correct Booking URL'];
  const lines = updates.map(u => {
    const nm = u.venue || '';
    const old = u.old || '';
    const ct = indexToCity.get(old) || nameToCity.get(nm) || '';
    return toCsvLine([nm, ct, old, u.new || '']);
  });
  await fs.writeFile(OUT, outHeader.join(',') + '\n' + lines.join('\n') + (lines.length ? '\n' : ''), 'utf8');
  console.log(`Wrote fixes CSV with city: ${OUT} (rows: ${updates.length})`);
}

main().catch((e) => {
  console.error(e?.stack || e?.message || String(e));
  process.exit(1);
});


