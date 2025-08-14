#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

async function loadEnvLocal() {
  const envPath = path.join(process.cwd(), 'playnow', '.env.local');
  try {
    const content = await fs.readFile(envPath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) {
        const key = m[1];
        let value = m[2];
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = value;
      }
    }
  } catch (_) {}
}

function getEnv(name, required = true) {
  const val = process.env[name];
  if (required && !val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

async function main() {
  await loadEnvLocal();
  const q = process.argv.slice(2).join(' ').trim();
  if (!q) throw new Error('Usage: node scripts/find-venue-by-name.mjs "<name substring>"');
  const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'), { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from('venues')
    .select('id,name,city,place_id')
    .ilike('name', `%${q}%`)
    .limit(20);
  if (error) throw new Error(error.message);
  for (const v of data || []) {
    console.log(`${v.name} (${v.city || ''}) -> id=${v.id} place_id=${v.place_id || 'null'}`);
  }
  if (!data || data.length === 0) console.log('No matches');
}

main().catch(err => { console.error(err.message || err); process.exit(1); });


