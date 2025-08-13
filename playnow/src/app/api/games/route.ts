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
      if (process.env.NODE_ENV === 'development') {
        console.error('No authenticated user ID in request headers');
      }
      return NextResponse.json({ error: 'Authentication required. Please sign in to create a game.' }, { status: 401 });
    }
    
    const body = await req.json();
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Creating game with user ID:', authenticatedUserId);
      console.log('Request body:', body);
    }
    const {
      venueId,
      startTime,
      minPlayers,
      maxPlayers,
      visibility,
      skillLevel,
      sport: submittedSport,
      notes,
      costInstructions
    } = body;
    
    // Use authenticated user as host
    const hostUserId = authenticatedUserId;

    // Basic validation
    if (!venueId || !startTime || !minPlayers || !maxPlayers || !visibility || !skillLevel || !submittedSport) {
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

    // Parse the start time to get date and time separately
    let dateStr, timeStr;
    try {
      const startDateTime = new Date(startTime);
      if (isNaN(startDateTime.getTime())) {
        throw new Error('Invalid date/time format');
      }
      dateStr = startDateTime.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Format time properly for PostgreSQL time column
      const hours = startDateTime.getHours().toString().padStart(2, '0');
      const minutes = startDateTime.getMinutes().toString().padStart(2, '0');
      const seconds = startDateTime.getSeconds().toString().padStart(2, '0');
      timeStr = `${hours}:${minutes}:${seconds}`; // HH:MM:SS
    } catch (dateError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error parsing date/time:', dateError, 'Input was:', startTime);
      }
      return NextResponse.json({ error: 'Invalid date/time format. Please select a valid date and time.' }, { status: 400 });
    }
    
    // Parse cost from cost instructions if provided
    let costPerPlayer = 0;
    if (costInstructions) {
      const match = costInstructions.match(/\$(\d+)/);
      if (match) {
        costPerPlayer = parseInt(match[1]);
      }
    }

    // Get venue details to extract sport (with error handling)
    let sport = submittedSport || 'Tennis';
    let venueName = '';
    
    try {
      const { data: venue } = await supabase
        .from('venues')
        .select('sports, name')
        .eq('id', venueId)
        .single();
      
      if (venue) {
        // Validate submitted sport against venue's sports if provided
        const allowed = Array.isArray(venue.sports) ? venue.sports : [];
        if (allowed.length && !allowed.includes(sport)) {
          return NextResponse.json({ error: 'Selected sport is not available at this venue.' }, { status: 400 });
        }
        venueName = venue.name || '';
      }
    } catch (venueError) {
      // If venue lookup fails, continue with defaults
      if (process.env.NODE_ENV === 'development') {
        console.warn('Could not fetch venue details:', venueError);
      }
    }
    
    // Get user's email for host name (could also use a profile display name if available)
    const userEmail = req.headers.get('x-user-email');
    const hostName = userEmail ? userEmail.split('@')[0] : 'Anonymous Host';

    // Normalize and validate skill level
    const allowedLevels = ['Beginner','Intermediate','Advanced','All Levels'];
    const normalizedSkill = allowedLevels.includes(String(skillLevel)) ? String(skillLevel) : 'All Levels';

    const { data: game, error } = await supabase
      .from('games')
      .insert({
        venue_id: venueId,
        host_user_id: hostUserId,
        start_time: startTime,
        date: dateStr,
        time: timeStr,
        min_players: minPlayers,
        max_players: maxPlayers,
        visibility,
        notes,
        cost_instructions: costInstructions,
        cost_per_player: costPerPlayer,
        duration: 2, // Default 2 hours
        skill_level: normalizedSkill,
        status: 'active',
        sport: sport,
        host_name: hostName
      })
      .select()
      .single();

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error creating game:', error);
        console.error('Game data attempted:', {
          venue_id: venueId,
          host_user_id: hostUserId,
          start_time: startTime,
          date: dateStr,
          time: timeStr,
          sport,
          host_name: hostName
        });
      }
      
      // Return more specific error message
      let errorMessage = 'Failed to create game';
      if (error.message) {
        errorMessage = error.message;
      }
      
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    // Automatically add the host as a participant
    if (game && game.id) {
      const { error: participantError } = await supabase
        .from('participants')
        .insert({
          game_id: game.id,
          user_id: hostUserId,
          status: 'joined'
        });
      
      if (participantError && process.env.NODE_ENV === 'development') {
        console.warn('Could not add host as participant:', participantError);
        // Don't fail the whole request, the game was still created
      }
    }

    return NextResponse.json({ game }, { status: 201 });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in POST /api/games:', error);
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
