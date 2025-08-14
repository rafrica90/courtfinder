import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

// Helper to read user id from middleware header
function getUserId(req: NextRequest): string | null {
  const userId = req.headers.get("x-user-id");
  return userId || null;
}

export async function GET(req: NextRequest) {
  try {
    const userId = getUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getSupabaseServiceClient();
    if (!supabase) return NextResponse.json({ error: "Server not configured" }, { status: 500 });

    const { data, error } = await supabase
      .from("profiles")
      .select("favorite_venues")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    const favorites: string[] = Array.isArray(data?.favorite_venues) ? data!.favorite_venues : [];
    return NextResponse.json({ favorites });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to fetch favorites" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = getUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const venueId: string | undefined = body?.venueId;
    const action: "add" | "remove" | "toggle" = body?.action || "toggle";
    if (!venueId) return NextResponse.json({ error: "Missing venueId" }, { status: 400 });

    const supabase = getSupabaseServiceClient();
    if (!supabase) return NextResponse.json({ error: "Server not configured" }, { status: 500 });

    // Get current favorites (or create profile row if needed)
    const { data: existing, error: selectError } = await supabase
      .from("profiles")
      .select("favorite_venues")
      .eq("user_id", userId)
      .maybeSingle();
    if (selectError) throw selectError;

    let favorites: string[] = Array.isArray(existing?.favorite_venues) ? existing!.favorite_venues : [];
    const set = new Set<string>(favorites);
    if (action === "add") set.add(venueId);
    else if (action === "remove") set.delete(venueId);
    else if (action === "toggle") set.has(venueId) ? set.delete(venueId) : set.add(venueId);

    const newFavorites = Array.from(set);

    // Upsert profile row with new favorites list
    const { error: upsertErr } = await supabase
      .from("profiles")
      .upsert({ user_id: userId, favorite_venues: newFavorites }, { onConflict: "user_id" });
    if (upsertErr) throw upsertErr;

    return NextResponse.json({ favorites: newFavorites });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to update favorites" }, { status: 500 });
  }
}


