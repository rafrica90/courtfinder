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
          notes,
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
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching game:', error);
      }
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    return NextResponse.json({ game });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in GET /api/games/[id]:', error);
    }
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
    // Get authenticated user from middleware
    const authenticatedUserId = req.headers.get('x-user-id');
    
    if (!authenticatedUserId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    const body = await req.json();
    const {
      venueId,
      startTime,
      minPlayers,
      maxPlayers,
      visibility,
      notes,
      costInstructions
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

    if (existingGame.host_user_id !== authenticatedUserId) {
      return NextResponse.json({ error: 'Unauthorized - only the host can update the game' }, { status: 403 });
    }

    // Update the game
    const updatePayload: any = {
      start_time: startTime,
      min_players: minPlayers,
      max_players: maxPlayers,
      visibility,
      notes,
      cost_instructions: costInstructions
    };

    if (venueId) {
      updatePayload.venue_id = venueId;
    }

    const { data: game, error } = await supabase
      .from('games')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error updating game:', error);
      }
      return NextResponse.json({ error: 'Failed to update game' }, { status: 500 });
    }

    return NextResponse.json({ game });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in PUT /api/games/[id]:', error);
    }
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
    // Get authenticated user from middleware
    const authenticatedUserId = req.headers.get('x-user-id');
    
    if (!authenticatedUserId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
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

    if (existingGame.host_user_id !== authenticatedUserId) {
      return NextResponse.json({ error: 'Unauthorized - only the host can delete the game' }, { status: 403 });
    }

    // Delete the game (participants will be deleted via cascade)
    const { error } = await supabase
      .from('games')
      .delete()
      .eq('id', id);

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error deleting game:', error);
      }
      return NextResponse.json({ error: 'Failed to delete game' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Game deleted successfully' });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in DELETE /api/games/[id]:', error);
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
