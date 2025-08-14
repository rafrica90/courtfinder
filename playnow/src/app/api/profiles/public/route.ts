import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

// GET /api/profiles/public?ids=uuid1,uuid2
// Returns public-safe profile info: sports and skill level only
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const idsParam = searchParams.get("ids") || searchParams.get("userIds");

    if (!idsParam) {
      return NextResponse.json({ error: "Missing ids parameter" }, { status: 400 });
    }

    const userIds = idsParam
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (userIds.length === 0) {
      return NextResponse.json({ profiles: [] }, { status: 200 });
    }

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    type PublicProfileRow = {
      user_id: string;
      display_name: string | null;
      sports_preferences: string[] | null;
      skill_level: string | null;
      sport_skill_levels: Record<string, string> | null;
      city: string | null;
      state: string | null;
      country_code: string | null;
    };

    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, display_name, sports_preferences, skill_level, sport_skill_levels, city, state, country_code")
      .in("user_id", userIds);

    if (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Error fetching public profiles:", error);
      }
      return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 });
    }

    const profiles = ((data || []) as PublicProfileRow[]).map((row) => ({
      userId: row.user_id,
      displayName: row.display_name,
      sports: row.sports_preferences || [],
      skillLevel: row.skill_level || "All Levels",
      sportSkillLevels: row.sport_skill_levels || {},
      city: row.city || null,
      state: row.state || null,
      countryCode: row.country_code || null,
    }));

    return NextResponse.json({ profiles });
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error in GET /api/profiles/public:", err);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


