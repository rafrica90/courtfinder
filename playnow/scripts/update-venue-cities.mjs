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

function normalizeWhitespace(str) {
  return String(str || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

async function main() {
  const supabase = getSupabase();

  // Manual corrections from user
  const manual = [
    {
      // Action Indoor Sports – Box Hill: ensure city=suburb Box Hill
      match: { type: 'name', value: 'Action Indoor Sports – Box Hill' },
      update: { city: 'Box Hill' },
    },
    {
      // Albert Reserve Tennis Centre on Queens Rd is in Melbourne (suburb+city)
      match: { type: 'address', value: '46 Queens Rd' },
      // Keep Melbourne as city; no change needed but we normalize to "Melbourne"
      update: { city: 'Melbourne' },
    },
  ];

  for (const task of manual) {
    const selector = supabase.from('venues').select('id,name,address,city').limit(1000);
    let resp;
    if (task.match.type === 'name') {
      resp = await selector.ilike('name', `%${task.match.value}%`);
    } else if (task.match.type === 'address') {
      resp = await selector.ilike('address', `%${task.match.value}%`);
    } else {
      continue;
    }
    const { data: rows, error } = resp;
    if (error) throw new Error(`Fetch failed: ${error.message}`);

    const candidates = (rows || []);
    if (candidates.length === 0) {
      console.log(`No matches for: ${task.match.type} ~ ${task.match.value}`);
      continue;
    }

    for (const v of candidates) {
      const payload = { ...task.update };
      Object.keys(payload).forEach((k) => (payload[k] = normalizeWhitespace(payload[k])));
      if (Object.keys(payload).length === 0) continue;
      const { error: updErr } = await supabase.from('venues').update(payload).eq('id', v.id).select('id');
      if (updErr) {
        console.warn(`Update failed for ${v.id} (${v.name}): ${updErr.message}`);
      } else {
        console.log(`Updated ${v.id} (${v.name}) → ${JSON.stringify(payload)}`);
      }
      await new Promise((r) => setTimeout(r, 25));
    }
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});



