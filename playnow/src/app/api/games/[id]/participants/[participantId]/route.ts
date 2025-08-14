import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

// PUT /api/games/[id]/participants/[participantId] - Approve/Deny participant
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; participantId: string }> }
) {
  const { id: gameId, participantId } = await params;

  try {
    const authenticatedUserId = req.headers.get('x-user-id');
    if (!authenticatedUserId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { action } = await req.json().catch(() => ({ action: undefined }));
    if (!action || !['approve','deny'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Verify the requester is the host
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('host_user_id, max_players')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.host_user_id !== authenticatedUserId) {
      return NextResponse.json({ error: 'Unauthorized - only the host can manage participants' }, { status: 403 });
    }

    // Ensure participant exists and belongs to this game
    const { data: participant, error: partErr } = await supabase
      .from('participants')
      .select('id, status, user_id')
      .eq('id', participantId)
      .eq('game_id', gameId)
      .single();

    if (partErr || !participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
    }

    if (action === 'deny') {
      const { data: updated, error: updErr } = await supabase
        .from('participants')
        .update({ status: 'denied' })
        .eq('id', participantId)
        .select()
        .single();
      if (updErr) {
        return NextResponse.json({ error: 'Failed to deny participant' }, { status: 500 });
      }
      return NextResponse.json({ participant: updated });
    }

    // Approve: move to joined if capacity allows, else waitlist
    const { data: counts } = await supabase
      .from('participants')
      .select('id, status')
      .eq('game_id', gameId);

    const joinedCount = (counts || []).filter((p: any) => p.status === 'joined').length;
    const targetStatus = joinedCount < (game.max_players as number) ? 'joined' : 'waitlist';

    const { data: updated, error: updErr } = await supabase
      .from('participants')
      .update({ status: targetStatus })
      .eq('id', participantId)
      .select()
      .single();
    if (updErr) {
      return NextResponse.json({ error: 'Failed to approve participant' }, { status: 500 });
    }
    return NextResponse.json({ participant: updated });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in PUT /api/games/[id]/participants/[participantId]:', error);
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


