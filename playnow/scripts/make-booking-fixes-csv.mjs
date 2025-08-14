import fs from 'fs/promises';
import path from 'path';

const REPORT = path.resolve(process.cwd(), 'CSVs/all-venues-from-db-fixed-report.json');
const OUT = path.resolve(process.cwd(), 'CSVs/booking-url-fixes.csv');

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

async function main() {
  const raw = await fs.readFile(REPORT, 'utf8');
  const data = JSON.parse(raw);
  const updates = Array.isArray(data.updated) ? data.updated : [];
  const header = ['Venue Name','Suburb/City','Booking URL','Correct Booking URL'];
  const lines = updates.map(u => toCsvLine([
    u.venue || '',
    '', // Suburb/City left blank; script can match by current Booking URL
    u.old || '',
    u.new || '',
  ]));
  await fs.writeFile(OUT, header.join(',') + '\n' + lines.join('\n') + (lines.length ? '\n' : ''), 'utf8');
  console.log(`Wrote fixes CSV: ${OUT} (rows: ${updates.length})`);
}

main().catch((e) => {
  console.error(e?.stack || e?.message || String(e));
  process.exit(1);
});


