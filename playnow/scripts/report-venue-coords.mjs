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

async function main() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('venues')
    .select('id,name,city,address,booking_url,latitude,longitude')
    .order('name', { ascending: true })
    .limit(5000);
  if (error) throw new Error(error.message);

  const total = data?.length || 0;
  const withCoords = (data || []).filter(v => typeof v.latitude === 'number' && typeof v.longitude === 'number');
  const missing = (data || []).filter(v => !v.latitude || !v.longitude);

  console.log(`Total venues: ${total}`);
  console.log(`With coordinates: ${withCoords.length}`);
  console.log(`Missing coordinates: ${missing.length}`);

  if (missing.length > 0) {
    console.log('\nMissing list (name | city | booking_url):');
    for (const v of missing) {
      console.log(`- ${v.name} | ${v.city || ''} | ${v.booking_url || ''}`);
    }
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});


