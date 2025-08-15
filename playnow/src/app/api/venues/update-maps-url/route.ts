"use server";

import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { getPlaceMapsUrl } from "@/lib/google-places";

// SMALL ADMIN ENDPOINT: Populate maps_url for venues using Google Places details when possible
export async function POST(req: Request) {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "DB client not configured" }, { status: 500 });
  }

  // Load a batch of venues that do not yet have maps_url
  const { data: venues, error } = await supabase
    .from("venues")
    .select("id, place_id, latitude, longitude")
    .is("maps_url", null)
    .limit(100);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!venues || venues.length === 0) {
    return NextResponse.json({ updated: 0, updatedIds: [] }, { status: 200 });
  }

  const results: { id: string; url?: string; error?: string }[] = [];

  for (const v of venues) {
    try {
      let url: string | null = null;
      if (v.place_id) {
        url = await getPlaceMapsUrl(v.place_id as string);
      }
      if (!url && typeof v.latitude === "number" && typeof v.longitude === "number") {
        // Fallback to a coordinate-based maps entry
        url = `https://www.google.com/maps/place/${v.latitude},${v.longitude}`;
      }
      if (url) {
        const { error: updError } = await supabase
          .from("venues")
          .update({ maps_url: url })
          .eq("id", v.id);
        if (updError) {
          results.push({ id: v.id, error: updError.message });
        } else {
          results.push({ id: v.id, url });
        }
      } else {
        results.push({ id: v.id, error: "No map URL found" });
      }
    } catch (err: any) {
      results.push({ id: v.id, error: err?.message ?? String(err) });
    }
  }

  const updatedIds = venues.filter((v: any) => !!v && v.id).map((v: any) => v.id);
  return NextResponse.json({ updated: results.filter(r => !!r.url).length, updatedIds: updatedIds, details: results }, { status: 200 });
}


