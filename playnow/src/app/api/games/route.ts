import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

// GET /api/games - Fetch all games or user-specific games
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  // Get authenticated user from middleware
  const authenticatedUserId = req.headers.get('x-user-id');
  
  // Use authenticated user ID if available, otherwise this is a public request
  const userId = authenticatedUserId || searchParams.get('userId');
  const type = searchParams.get('type'); // 'hosted' | 'joined'

  try {
    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    let query = supabase
      .from('games')
      .select(`
        *,
        venues (
          id,
          name,
          address,
          city,
          sports
        ),
        participants (
          id,
          user_id,
          status
        )
      `);

    // Filter by user if specified
    if (userId && type) {
      if (type === 'hosted') {
        query = query.eq('host_user_id', userId);
      } else if (type === 'joined') {
        // For joined games, we need to filter by participant user_id
        query = supabase
          .from('games')
          .select(`
            *,
            venues (
              id,
              name,
              address,
              city,
              sports
            ),
            participants!inner (
              id,
              user_id,
              status
            )
          `)
          .eq('participants.user_id', userId);
      }
    }

    const { data: games, error } = await query
      .order('start_time', { ascending: true });

    if (error) {
      // Log to monitoring service in production instead of console
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching games:', error);
      }
      return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 });
    }

    return NextResponse.json({ games });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in GET /api/games:', error);
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/games - Create a new game
export async function POST(req: NextRequest) {
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
    
    // Use authenticated user as host
    const hostUserId = authenticatedUserId;

    // Basic validation
    if (!venueId || !startTime || !minPlayers || !maxPlayers || !visibility) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Additional validation
    if (minPlayers < 2 || maxPlayers > 100 || minPlayers > maxPlayers) {
      return NextResponse.json({ error: 'Invalid player count' }, { status: 400 });
    }

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { data: game, error } = await supabase
      .from('games')
      .insert({
        venue_id: venueId,
        host_user_id: hostUserId,
        start_time: startTime,
        min_players: minPlayers,
        max_players: maxPlayers,
        visibility,
        notes,
        cost_instructions: costInstructions
      })
      .select()
      .single();

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error creating game:', error);
      }
      return NextResponse.json({ error: 'Failed to create game' }, { status: 500 });
    }

    return NextResponse.json({ game }, { status: 201 });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in POST /api/games:', error);
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
