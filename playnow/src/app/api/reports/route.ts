import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

function getUserFromHeaders(req: NextRequest): { id: string | null; email: string | null } {
  const id = req.headers.get("x-user-id");
  const email = req.headers.get("x-user-email");
  return { id: id || null, email: email || null };
}

export async function POST(req: NextRequest) {
  try {
    const { id: userId, email } = getUserFromHeaders(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const venueId: string | null = body?.venueId ?? null;
    const category: string | null = body?.category ? String(body.category).slice(0, 60) : null;
    const messageRaw: string = String(body?.message || "");
    const pageUrl: string | null = body?.pageUrl ? String(body.pageUrl).slice(0, 800) : null;

    const message = messageRaw.trim();
    if (!message || message.length < 5) {
      return NextResponse.json({ error: "Please provide a brief description of the issue." }, { status: 400 });
    }
    if (message.length > 4000) {
      return NextResponse.json({ error: "Message too long (max 4000 characters)." }, { status: 400 });
    }

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    }

    const { error } = await supabase.from("issue_reports").insert({
      user_id: userId,
      user_email: email,
      venue_id: venueId,
      page_url: pageUrl,
      category,
      message,
      status: "open",
    });

    if (error) {
      return NextResponse.json({ error: error.message || "Failed to submit report" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to submit report" }, { status: 500 });
  }
}

// Admin: list recent reports
export async function GET(req: NextRequest) {
  try {
    const { id: userId, email } = getUserFromHeaders(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adminEmails = [
      'ramiafeich@gmail.com',
      ...((process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim()).filter(Boolean)),
    ];
    const isAdmin = !!email && adminEmails.includes(email);
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '200', 10), 500);
    const status = url.searchParams.get('status');

    const supabase = getSupabaseServiceClient();
    if (!supabase) return NextResponse.json({ error: 'Server not configured' }, { status: 500 });

    let query = supabase
      .from('issue_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Enrich with venue names if available
    const reports = Array.isArray(data) ? data : [];
    const venueIds = Array.from(new Set(reports.map((r: any) => r.venue_id).filter(Boolean)));
    let idToVenueName: Record<string, string> = {};
    if (venueIds.length) {
      const { data: venues, error: vErr } = await (getSupabaseServiceClient()!
        .from('venues')
        .select('id,name')
        .in('id', venueIds));
      if (!vErr && Array.isArray(venues)) {
        idToVenueName = Object.fromEntries(venues.map((v: any) => [v.id, v.name]));
      }
    }

    const enriched = reports.map((r: any) => ({ ...r, venue_name: r.venue_id ? idToVenueName[r.venue_id] || null : null }));
    return NextResponse.json({ reports: enriched });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to fetch reports' }, { status: 500 });
  }
}


