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

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) args[m[1]] = m[2];
  }
  return args;
}

async function main() {
  const { name, city, new: newUrl } = parseArgs(process.argv);
  if (!name || !newUrl) {
    console.log('Usage: node -r dotenv/config scripts/update-booking-url-manual.mjs --name="Venue Name" --city="City" --new="https://new.url"');
    process.exit(1);
  }

  const supabase = getSupabase();

  // First, try precise case-insensitive equality
  let query = supabase.from('venues').select('id,name,city,address,booking_url');
  let { data: rows, error } = await query.ilike('name', name).ilike('city', city || '%');
  if (error) throw new Error(error.message);

  // If no results, try partial match
  if (!rows || rows.length === 0) {
    const namePattern = `%${name}%`;
    const cityPattern = city ? `%${city}%` : '%';
    ({ data: rows, error } = await supabase
      .from('venues')
      .select('id,name,city,address,booking_url')
      .ilike('name', namePattern)
      .ilike('city', cityPattern));
    if (error) throw new Error(error.message);
  }

  // If still none, try address fallback
  if (!rows || rows.length === 0 && city) {
    const namePattern = `%${name}%`;
    ({ data: rows, error } = await supabase
      .from('venues')
      .select('id,name,city,address,booking_url')
      .ilike('name', namePattern)
      .ilike('address', `%${city}%`));
    if (error) throw new Error(error.message);
  }

  // If still none, try name-only fuzzy search
  if (!rows || rows.length === 0) {
    ({ data: rows, error } = await supabase
      .from('venues')
      .select('id,name,city,address,booking_url')
      .ilike('name', `%${name}%`));
    if (error) throw new Error(error.message);
  }

  if (!rows || rows.length === 0) {
    console.log('No matching venue found.');
    return;
  }

  if (rows.length > 1) {
    console.log('Multiple matches found, refusing to update. Candidates:');
    console.log(rows.map(r => ({ id: r.id, name: r.name, city: r.city, address: r.address })).slice(0, 10));
    return;
  }

  const venue = rows[0];
  const { error: updErr } = await supabase
    .from('venues')
    .update({ booking_url: newUrl })
    .eq('id', venue.id)
    .select('id');
  if (updErr) throw new Error(updErr.message);
  console.log(`Updated booking_url for ${venue.name} (${venue.city}) to ${newUrl}`);
}

main().catch((e) => {
  console.error(e?.stack || e?.message || String(e));
  process.exit(1);
});


