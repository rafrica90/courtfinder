import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

// GET /api/games/[id] - Fetch a specific game
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { data: game, error } = await supabase
      .from('games')
      .select(`
        *,
        venues (
          id,
          name,
          address,
          city,
          sports,
          amenities,
          price_estimate,
          booking_url
        ),
        participants (
          id,
          user_id,
          status,
          created_at
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching game:', error);
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    return NextResponse.json({ game });
  } catch (error) {
    console.error('Error in GET /api/games/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/games/[id] - Update a game
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await req.json();
    const {
      startTime,
      minPlayers,
      maxPlayers,
      visibility,
      notes,
      costInstructions,
      hostUserId // For authorization
    } = body;

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // First verify the user is the host
    const { data: existingGame, error: fetchError } = await supabase
      .from('games')
      .select('host_user_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingGame) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (existingGame.host_user_id !== hostUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update the game
    const { data: game, error } = await supabase
      .from('games')
      .update({
        start_time: startTime,
        min_players: minPlayers,
        max_players: maxPlayers,
        visibility,
        notes,
        cost_instructions: costInstructions
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating game:', error);
      return NextResponse.json({ error: 'Failed to update game' }, { status: 500 });
    }

    return NextResponse.json({ game });
  } catch (error) {
    console.error('Error in PUT /api/games/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/games/[id] - Cancel/delete a game
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { searchParams } = new URL(req.url);
    const hostUserId = searchParams.get('hostUserId');

    if (!hostUserId) {
      return NextResponse.json({ error: 'Host user ID required' }, { status: 400 });
    }

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Verify the user is the host
    const { data: existingGame, error: fetchError } = await supabase
      .from('games')
      .select('host_user_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingGame) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (existingGame.host_user_id !== hostUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete the game (participants will be deleted via cascade)
    const { error } = await supabase
      .from('games')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting game:', error);
      return NextResponse.json({ error: 'Failed to delete game' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Game deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/games/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
