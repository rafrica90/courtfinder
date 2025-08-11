import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const venueId = searchParams.get('venueId');
  const redirect = searchParams.get('redirect');

  if (!venueId || !redirect) {
    return NextResponse.json({ error: 'Missing venueId or redirect' }, { status: 400 });
  }

  // Fire-and-forget insert; if no Supabase env, skip
  try {
    const supabase = getSupabaseServiceClient();
    if (supabase) {
      await supabase.from('clicks').insert({ venue_id: venueId });
    }
  } catch {
    // swallow errors in MVP
  }

  return NextResponse.redirect(redirect);
}
