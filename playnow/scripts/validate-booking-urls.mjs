import fs from 'fs/promises';
import path from 'path';

const DEFAULT_INPUT = path.resolve(process.cwd(), 'CSVs/all-venues-from-db.csv');
const DEFAULT_OUTPUT = (p) => p.replace(/\.csv$/i, '-validated.csv');
const DEFAULT_REPORT = (p) => p.replace(/\.csv$/i, '-validate-report.json');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function withTimeout(promise, ms, label = 'operation') {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return Promise.race([
    promise(controller.signal),
    (async () => {
      await sleep(ms + 5);
      throw new Error(`${label} timed out after ${ms}ms`);
    })(),
  ]).finally(() => clearTimeout(timeout));
}

function normalizeUrl(raw) {
  if (!raw) return '';
  let url = String(raw).trim();
  if (!url) return '';
  // Fix common CSV artifacts and whitespace
  url = url.replace(/^"|"$/g, '').replace(/\s+/g, ' ');
  url = url.replace(/\u00A0/g, ' ').trim();
  // Add scheme if missing
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url.replace(/^\/*/, '');
  }
  // Fix accidental commas or trailing punctuation
  url = url.replace(/[\s,;]+$/g, '');
  return url;
}

async function resolveUrl(url) {
  const headers = {
    'user-agent': 'Mozilla/5.0 (compatible; VenueLinkValidator/1.0; +https://example.com) NodeFetch',
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  };

  const tryRequest = async (method) => {
    const res = await fetch(url, {
      method,
      redirect: 'follow',
      headers,
    });
    return res;
  };

  try {
    // Some servers block HEAD — try HEAD then GET fallback
    let res = await withTimeout((signal) => fetch(url, { method: 'HEAD', redirect: 'follow', headers, signal }), 12000, 'HEAD');
    if (res.status === 405 || res.status === 403 || res.status === 501) {
      res = await withTimeout((signal) => fetch(url, { method: 'GET', redirect: 'follow', headers, signal }), 15000, 'GET');
    }
    const ok = res.ok || (res.status >= 200 && res.status < 400);
    if (!ok) throw new Error(`HTTP ${res.status}`);
    return { finalUrl: res.url || url, status: res.status };
  } catch (e) {
    // Final GET attempt if HEAD failed for network reasons
    try {
      const res = await withTimeout((signal) => fetch(url, { method: 'GET', redirect: 'follow', headers, signal }), 15000, 'GET');
      const ok = res.ok || (res.status >= 200 && res.status < 400);
      if (!ok) throw new Error(`HTTP ${res.status}`);
      return { finalUrl: res.url || url, status: res.status };
    } catch (err) {
      throw new Error(err?.message || 'Network error');
    }
  }
}

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
      // handle CRLF
      if (char === '\r') {
        i++;
        continue;
      }
      field += char;
      i++;
    }
  }
  // last field
  row.push(field);
  if (row.length > 1 || (row.length === 1 && row[0] !== '')) rows.push(row);
  return rows;
}

async function pLimit(concurrency) {
  const queue = [];
  let activeCount = 0;
  const next = () => {
    activeCount--;
    if (queue.length > 0) {
      const fn = queue.shift();
      fn();
    }
  };
  const run = async (fn, resolve, reject) => {
    activeCount++;
    try {
      const result = await fn();
      resolve(result);
    } catch (e) {
      reject(e);
    } finally {
      next();
    }
  };
  return (fn) =>
    new Promise((resolve, reject) => {
      const task = () => run(fn, resolve, reject);
      if (activeCount < concurrency) task();
      else queue.push(task);
    });
}

async function main() {
  const inputPath = process.argv[2] ? path.resolve(process.cwd(), process.argv[2]) : DEFAULT_INPUT;
  const outputPath = process.argv[3] ? path.resolve(process.cwd(), process.argv[3]) : DEFAULT_OUTPUT(inputPath);
  const reportPath = process.argv[4] ? path.resolve(process.cwd(), process.argv[4]) : DEFAULT_REPORT(inputPath);

  const content = await fs.readFile(inputPath, 'utf8');
  const rows = parseCsv(content);
  if (rows.length === 0) throw new Error('Empty CSV');

  const header = rows[0];
  const dataRows = rows.slice(1);
  const idx = {
    venue: header.indexOf('Venue Name'),
    sports: header.indexOf('Sport(s)'),
    address: header.indexOf('Address'),
    city: header.indexOf('Suburb/City'),
    state: header.indexOf('State'),
    postcode: header.indexOf('Postcode'),
    booking: header.indexOf('Booking URL'),
    description: header.indexOf('Description'),
    amenities: header.indexOf('Amenities'),
  };
  if (idx.booking === -1) throw new Error('Missing "Booking URL" column');

  const limiter = await pLimit(10);
  const results = [];
  const failures = [];

  let processed = 0;
  await Promise.all(
    dataRows.map((row, i) =>
      limiter(async () => {
        const originalUrlRaw = row[idx.booking] || '';
        const normalizedUrl = normalizeUrl(originalUrlRaw);
        let finalUrl = normalizedUrl;
        let changed = false;
        let status = null;
        let error = null;
        if (normalizedUrl) {
          try {
            const { finalUrl: resolved, status: st } = await resolveUrl(normalizedUrl);
            finalUrl = resolved;
            status = st;
            if (finalUrl !== originalUrlRaw && finalUrl !== normalizedUrl) changed = true;
            // If we only added scheme, also mark as changed
            if (!changed && normalizedUrl !== originalUrlRaw) changed = true;
          } catch (e) {
            error = e.message || String(e);
            failures.push({
              index: i + 1,
              venue: row[idx.venue],
              city: row[idx.city],
              state: row[idx.state],
              sports: row[idx.sports],
              originalUrl: originalUrlRaw,
              normalizedUrl,
              error,
            });
          }
        } else {
          // Missing URL
          error = 'Missing booking URL';
          failures.push({
            index: i + 1,
            venue: row[idx.venue],
            city: row[idx.city],
            state: row[idx.state],
            sports: row[idx.sports],
            originalUrl: originalUrlRaw,
            normalizedUrl: '',
            error,
          });
        }
        const outRow = row.slice();
        outRow[idx.booking] = finalUrl || originalUrlRaw || '';
        results[i] = { row: outRow, changed };
        processed++;
        if (processed % 25 === 0) process.stdout.write(`Processed ${processed}/${dataRows.length}\n`);
      })
    )
  );

  const outHeader = header.concat(['Booking URL Changed']);
  const outLines = results.map((r) => toCsvLine(outHeader.map((h, j) => {
    if (h === 'Booking URL Changed') return r.changed ? 'TRUE' : 'FALSE';
    // Map to original columns by header
    const srcIdx = header.indexOf(h);
    return srcIdx >= 0 ? r.row[srcIdx] ?? '' : '';
  })));

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, outHeader.join(',') + '\n' + outLines.join('\n') + (outLines.length ? '\n' : ''), 'utf8');

  const report = {
    inputPath,
    outputPath,
    failedCount: failures.length,
    total: dataRows.length,
    failures,
  };
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf8');

  console.log(`Wrote validated CSV to ${outputPath}`);
  console.log(`Report written to ${reportPath} (failures: ${failures.length}/${dataRows.length})`);
}

main().catch((e) => {
  console.error(e?.stack || e?.message || String(e));
  process.exit(1);
});


