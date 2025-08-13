// Verifies sports normalization in the Supabase database.
// Usage (from playnow/):
//   DOTENV_CONFIG_PATH=.env.local node -r dotenv/config scripts/check-db-normalization.mjs

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing env: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(2);
}

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

const toLowerArray = (arr) => (Array.isArray(arr) ? arr.map((s) => String(s || "").trim().toLowerCase()).filter(Boolean) : []);

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

  let unknown = [];
  for (const v of venues || []) {
    const sports = toLowerArray(v.sports);
    const bad = sports.filter((s) => !allowedSlugs.has(s));
    if (bad.length > 0) unknown.push({ id: v.id, name: v.name, sports });
    if (v.sport_id && !allowedSlugs.has(String(v.sport_id).toLowerCase())) {
      unknown.push({ id: v.id, name: v.name, sports: sports.concat([String(v.sport_id)]) });
    }
  }

  console.log(
    JSON.stringify(
      {
        sportsSeeded: (sportsRows || []).map((s) => s.slug),
        totalVenues: Array.isArray(venues) ? venues.length : 0,
        unknownSportVenueCount: unknown.length,
        unknownSportVenueSamples: unknown.slice(0, 10),
      },
      null,
      2
    )
  );
  process.exit(0);
} catch (e) {
  console.error(e);
  process.exit(1);
}


