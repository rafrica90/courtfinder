// Verifies sports normalization in the database without exposing secrets.
// Usage:
//   DOTENV_CONFIG_PATH=playnow/.env.local node -r dotenv/config scripts/check-db-normalization.mjs

import { createClient } from "@supabase/supabase-js";

function getEnv(name, fallback) {
  const value = process.env[name];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseServiceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY", getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"));

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY)");
  process.exit(2);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

function toLowerArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map((s) => String(s || "").trim().toLowerCase()).filter(Boolean);
}

try {
  const { data: sportsRows, error: sportsError } = await supabase
    .from("sports")
    .select("id, name, slug")
    .order("slug");
  if (sportsError) throw sportsError;

  const allowedSlugs = new Set((sportsRows || []).map((s) => String(s.slug).toLowerCase()));

  const { data: venues, error: venuesError } = await supabase
    .from("venues")
    .select("id, name, sports, sport_id")
    .limit(10000);
  if (venuesError) throw venuesError;

  let totalVenues = Array.isArray(venues) ? venues.length : 0;
  let unknownSportVenues = [];
  for (const v of venues || []) {
    const sports = toLowerArray(v.sports);
    const hasUnknown = sports.some((s) => !allowedSlugs.has(s));
    if (hasUnknown) unknownSportVenues.push({ id: v.id, name: v.name, sports: sports });
    if (v.sport_id && !allowedSlugs.has(String(v.sport_id).toLowerCase())) {
      if (!hasUnknown) unknownSportVenues.push({ id: v.id, name: v.name, sports: sports.concat([String(v.sport_id)]) });
    }
  }

  const result = {
    sportsSeeded: Array.isArray(sportsRows) ? sportsRows.map((s) => s.slug) : [],
    totalVenues,
    unknownSportVenueCount: unknownSportVenues.length,
    unknownSportVenueSamples: unknownSportVenues.slice(0, 10),
  };

  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
} catch (err) {
  console.error(err);
  process.exit(1);
}


