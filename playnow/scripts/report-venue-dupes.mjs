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

function normalizeUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url.trim());
    const path = u.pathname.replace(/\/$/, '').toLowerCase();
    const host = u.hostname.toLowerCase();
    const search = u.searchParams.toString();
    return `${u.protocol}//${host}${path}${search ? `?${search}` : ''}`;
  } catch {
    return String(url).trim().toLowerCase().replace(/\/$/, '');
  }
}

function keyNameAddress(name, address) {
  const n = (name || '').trim().toLowerCase();
  const a = (address || '').trim().toLowerCase();
  return `${n}|${a}`;
}

async function main() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('venues')
    .select('id,name,address,city,booking_url')
    .limit(10000);
  if (error) throw new Error(error.message);

  const rows = data || [];
  const byBooking = new Map();
  const byNameAddr = new Map();

  for (const v of rows) {
    const b = normalizeUrl(v.booking_url);
    if (b) {
      const arr = byBooking.get(b) || [];
      arr.push(v);
      byBooking.set(b, arr);
    }
    const k = keyNameAddress(v.name, v.address);
    if (k.trim() !== '|') {
      const arr2 = byNameAddr.get(k) || [];
      arr2.push(v);
      byNameAddr.set(k, arr2);
    }
  }

  const dupBooking = [...byBooking.values()].filter(arr => arr.length > 1);
  const dupNameAddr = [...byNameAddr.values()].filter(arr => arr.length > 1);

  console.log(`Total venues scanned: ${rows.length}`);
  console.log(`Duplicate groups by booking_url: ${dupBooking.length}`);
  console.log(`Duplicate groups by name+address: ${dupNameAddr.length}`);

  if (dupBooking.length) {
    console.log('\nSample duplicate groups by booking_url (up to 10 groups):');
    dupBooking.slice(0, 10).forEach((group, i) => {
      const b = normalizeUrl(group[0].booking_url);
      console.log(`\n[Group ${i + 1}] booking_url=${b}`);
      group.forEach(v => {
        console.log(`- id=${v.id} | ${v.name} | ${v.city || ''} | ${v.address}`);
      });
    });
  }

  if (dupNameAddr.length) {
    console.log('\nSample duplicate groups by name+address (up to 10 groups):');
    dupNameAddr.slice(0, 10).forEach((group, i) => {
      const k = keyNameAddress(group[0].name, group[0].address);
      console.log(`\n[Group ${i + 1}] key=${k}`);
      group.forEach(v => {
        console.log(`- id=${v.id} | ${v.name} | ${v.city || ''} | ${v.booking_url || ''}`);
      });
    });
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
