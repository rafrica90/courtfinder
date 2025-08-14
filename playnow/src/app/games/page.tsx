import SearchBar from "@/components/SearchBar";
import GamesClient from "@/components/GamesClient";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export default async function GamesPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const sp = searchParams ? await searchParams : undefined;
  const created = sp?.created === '1';
  
  // Try to fetch games from Supabase
  const supabase = getSupabaseServiceClient();
  type GameListItem = {
    id: string;
    sport: string;
    venue: string;
    venueId?: string;
    address: string;
    city?: string;
    indoorOutdoor?: string;
    date: string;
    time: string;
    duration: string;
    playersJoined: number;
    maxPlayers: number;
    costPerPlayer: number;
    hostName: string;
    hostRating: number;
    level: string;
    visibility: string;
    latitude?: number | null;
    longitude?: number | null;
  };

  // Result items coming back from Supabase query
  type RawGame = {
    id: string;
    sport?: string | null;
    venues?: { id: string; name?: string | null; address?: string | null; city?: string | null; latitude?: number | null; longitude?: number | null; indoor_outdoor?: string | null } | null;
    date: string;
    time: string;
    duration?: number | null;
    participants?: { id: string; user_id: string; status?: string | null }[] | null;
    max_players: number;
    cost_per_player: number;
    host_name?: string | null;
    skill_level?: string | null;
    visibility?: string | null;
  };

  let games: GameListItem[] = [];
  
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('games')
        .select(`
          *,
          venues (
            id,
            name,
            address,
            city,
            latitude,
            longitude
          ),
          participants (
            id,
            user_id,
            status
          )
        `)
        .gte('date', new Date().toISOString().split('T')[0]) // Only future games
        .order('date', { ascending: true })
        .order('time', { ascending: true });
      
      if (data && !error && data.length > 0) {
        // Transform Supabase data to match our UI format
        const rows: RawGame[] = (data ?? []) as unknown as RawGame[];
        games = rows.map((game) => ({
          id: game.id,
          sport: game.sport ?? 'Tennis',
          venue: game.venues?.name ?? 'Unknown Venue',
          venueId: game.venues?.id ?? undefined,
          address: game.venues ? `${game.venues.address ?? ''}, ${game.venues.city ?? ''}` : 'Unknown Location',
          city: game.venues?.city ?? undefined,
          indoorOutdoor: game.venues?.indoor_outdoor ?? undefined,
          date: new Date(game.date).toLocaleDateString('en-US', { 
            weekday: 'long',
            month: 'short',
            day: 'numeric'
          }),
          time: game.time,
          duration: `${game.duration ?? 2} hours`,
          playersJoined: (game.participants ?? []).filter((p) => p.status === 'joined').length || 0,
          maxPlayers: game.max_players,
          costPerPlayer: game.cost_per_player,
          hostName: game.host_name ?? 'Anonymous',
          hostRating: 4.5, // Would need to fetch from profiles
          level: game.skill_level ?? 'All Levels',
          visibility: game.visibility ?? 'public',
          latitude: game.venues?.latitude ?? null,
          longitude: game.venues?.longitude ?? null,
        }));
      }
    } catch (error) {
      // Keep empty list on error in production; optionally log in dev
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching games:', error);
      }
    }
  }

  return (
    <div className="min-h-screen">
      {created && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-[#00ff88]/20 border border-[#00ff88]/50 rounded-lg p-4">
            <p className="text-[#00ff88] font-medium">✓ Game created successfully! Players can now join your game.</p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <GamesClient
          games={games.map((g) => ({
            id: g.id,
            sport: g.sport,
            venue: g.venue,
            venueId: g.venueId,
            address: g.address,
            city: g.city,
            indoorOutdoor: g.indoorOutdoor,
            latitude: g.latitude ?? null,
            longitude: g.longitude ?? null,
            date: g.date,
            time: g.time,
            playersJoined: g.playersJoined,
            maxPlayers: g.maxPlayers,
          }))}
        />
      </div>
    </div>
  );
}
