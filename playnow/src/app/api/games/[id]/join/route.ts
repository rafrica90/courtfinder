import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

// POST /api/games/[id]/join - Join a game
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: gameId } = await params;

  try {
    // Get authenticated user from middleware
    const authenticatedUserId = req.headers.get('x-user-id');
    
    if (!authenticatedUserId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    const userId = authenticatedUserId;

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // First check if the game exists
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select(`
        *,
        participants (id, status)
      `)
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Check if user is already a participant
    const { data: existingParticipant, error: participantError } = await supabase
      .from('participants')
      .select('id, status')
      .eq('game_id', gameId)
      .eq('user_id', userId)
      .single();

    if (existingParticipant) {
      return NextResponse.json({ 
        error: 'Already joined this game',
        status: existingParticipant.status 
      }, { status: 400 });
    }

    // Add the participant as pending approval by host
    const { data: participant, error } = await supabase
      .from('participants')
      .insert({
        game_id: gameId,
        user_id: userId,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error joining game:', error);
      }
      return NextResponse.json({ error: 'Failed to join game' }, { status: 500 });
    }

    return NextResponse.json({ 
      participant,
      message: 'Join request sent to host for approval'
    }, { status: 201 });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in POST /api/games/[id]/join:', error);
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/games/[id]/join - Leave a game
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: gameId } = await params;

  try {
    // Get authenticated user from middleware
    const authenticatedUserId = req.headers.get('x-user-id');
    
    if (!authenticatedUserId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    const userId = authenticatedUserId;

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Remove the participant
    const { error } = await supabase
      .from('participants')
      .delete()
      .eq('game_id', gameId)
      .eq('user_id', userId);

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error leaving game:', error);
      }
      return NextResponse.json({ error: 'Failed to leave game' }, { status: 500 });
    }

    // TODO: In a full implementation, you might want to:
    // 1. Move someone from waitlist to joined if a spot opened up
    // 2. Send notifications to waitlisted users
    // 3. Update game status if minimum players not met

    return NextResponse.json({ message: 'Successfully left the game' });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in DELETE /api/games/[id]/join:', error);
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
