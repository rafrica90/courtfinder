import Link from "next/link";
import { Calendar, MapPin, Users, Clock, DollarSign, Star, Filter } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

// Mock data for games
const mockGames = [
  {
    id: "g1",
    sport: "Tennis",
    venue: "Central Park Tennis Center",
    address: "123 Park Ave, New York",
    date: "Today",
    time: "6:00 PM",
    duration: "2 hours",
    playersJoined: 3,
    maxPlayers: 4,
    costPerPlayer: 15,
    hostName: "Alex Johnson",
    hostRating: 4.8,
    level: "Intermediate",
    visibility: "public" as const,
  },
  {
    id: "g2",
    sport: "Pickleball",
    venue: "Brooklyn Pickleball Club",
    address: "456 Court St, New York",
    date: "Tomorrow",
    time: "10:00 AM",
    duration: "1.5 hours",
    playersJoined: 2,
    maxPlayers: 6,
    costPerPlayer: 10,
    hostName: "Sarah Chen",
    hostRating: 4.9,
    level: "All Levels",
    visibility: "public" as const,
  },
  {
    id: "g3",
    sport: "Soccer",
    venue: "Mission Soccer Fields",
    address: "789 Valencia St, San Francisco",
    date: "Sunday",
    time: "3:00 PM",
    duration: "2 hours",
    playersJoined: 8,
    maxPlayers: 14,
    costPerPlayer: 20,
    hostName: "Mike Rodriguez",
    hostRating: 4.7,
    level: "Advanced",
    visibility: "public" as const,
  },
  {
    id: "g4",
    sport: "Tennis",
    venue: "Riverside Courts",
    address: "321 River Rd, New York",
    date: "Saturday",
    time: "8:00 AM",
    duration: "1 hour",
    playersJoined: 1,
    maxPlayers: 2,
    costPerPlayer: 25,
    hostName: "Emma Wilson",
    hostRating: 5.0,
    level: "Beginner",
    visibility: "public" as const,
  },
];

export default async function GamesPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const sp = searchParams ? await searchParams : undefined;
  const created = sp?.created === '1';
  
  // Try to fetch games from Supabase
  const supabase = getSupabaseServiceClient();
  let games = mockGames; // Default to mock data
  
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
            city
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
        games = data.map((game: any) => ({
          id: game.id,
          sport: game.sport || 'Tennis',
          venue: game.venues?.name || 'Unknown Venue',
          address: game.venues ? `${game.venues.address}, ${game.venues.city}` : 'Unknown Location',
          date: new Date(game.date).toLocaleDateString('en-US', { 
            weekday: 'long',
            month: 'short',
            day: 'numeric'
          }),
          time: game.time,
          duration: `${game.duration || 2} hours`,
          playersJoined: game.participants?.filter((p: any) => p.status === 'joined').length || 0,
          maxPlayers: game.max_players,
          costPerPlayer: game.cost_per_player,
          hostName: game.host_name || 'Anonymous',
          hostRating: 4.5, // Would need to fetch from profiles
          level: game.skill_level || 'All Levels',
          visibility: game.visibility || 'public',
        }));
      }
    } catch (error) {
      // If there's an error, just use mock data
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching games:', error);
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0f2847] to-[#1a3a5c]">
      {/* Search Header */}
      <div className="bg-[#0a1628]/95 backdrop-blur-md border-b border-white/10 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <SearchBar variant="compact" />
        </div>
      </div>

      {created && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-[#00ff88]/20 border border-[#00ff88]/50 rounded-lg p-4">
            <p className="text-[#00ff88] font-medium">✓ Game created successfully! Players can now join your game.</p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:w-64 shrink-0">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 sticky top-32">
              <div className="flex items-center gap-2 mb-6">
                <Filter className="h-5 w-5 text-[#00d9ff]" />
                <h3 className="font-semibold text-lg text-white">Filters</h3>
              </div>

              {/* Sport Filter */}
              <div className="mb-6">
                <h4 className="font-medium mb-3 text-[#00d9ff]">Sport</h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[#b8c5d6] hover:text-white cursor-pointer">
                    <input type="checkbox" className="rounded bg-white/10 border-white/20 text-[#00ff88] focus:ring-[#00d9ff]" />
                    <span className="text-sm">Tennis</span>
                  </label>
                  <label className="flex items-center gap-2 text-[#b8c5d6] hover:text-white cursor-pointer">
                    <input type="checkbox" className="rounded bg-white/10 border-white/20 text-[#00ff88] focus:ring-[#00d9ff]" />
                    <span className="text-sm">Pickleball</span>
                  </label>
                  <label className="flex items-center gap-2 text-[#b8c5d6] hover:text-white cursor-pointer">
                    <input type="checkbox" className="rounded bg-white/10 border-white/20 text-[#00ff88] focus:ring-[#00d9ff]" />
                    <span className="text-sm">Soccer</span>
                  </label>
                  <label className="flex items-center gap-2 text-[#b8c5d6] hover:text-white cursor-pointer">
                    <input type="checkbox" className="rounded bg-white/10 border-white/20 text-[#00ff88] focus:ring-[#00d9ff]" />
                    <span className="text-sm">Basketball</span>
                  </label>
                </div>
              </div>

              {/* Date Filter */}
              <div className="mb-6">
                <h4 className="font-medium mb-3 text-[#00d9ff]">Date</h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[#b8c5d6] hover:text-white cursor-pointer">
                    <input type="checkbox" className="rounded bg-white/10 border-white/20 text-[#00ff88] focus:ring-[#00d9ff]" />
                    <span className="text-sm">Today</span>
                  </label>
                  <label className="flex items-center gap-2 text-[#b8c5d6] hover:text-white cursor-pointer">
                    <input type="checkbox" className="rounded bg-white/10 border-white/20 text-[#00ff88] focus:ring-[#00d9ff]" />
                    <span className="text-sm">Tomorrow</span>
                  </label>
                  <label className="flex items-center gap-2 text-[#b8c5d6] hover:text-white cursor-pointer">
                    <input type="checkbox" className="rounded bg-white/10 border-white/20 text-[#00ff88] focus:ring-[#00d9ff]" />
                    <span className="text-sm">This Week</span>
                  </label>
                  <label className="flex items-center gap-2 text-[#b8c5d6] hover:text-white cursor-pointer">
                    <input type="checkbox" className="rounded bg-white/10 border-white/20 text-[#00ff88] focus:ring-[#00d9ff]" />
                    <span className="text-sm">This Weekend</span>
                  </label>
                </div>
              </div>

              {/* Skill Level */}
              <div className="mb-6">
                <h4 className="font-medium mb-3 text-[#00d9ff]">Skill Level</h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[#b8c5d6] hover:text-white cursor-pointer">
                    <input type="checkbox" className="rounded bg-white/10 border-white/20 text-[#00ff88] focus:ring-[#00d9ff]" />
                    <span className="text-sm">Beginner</span>
                  </label>
                  <label className="flex items-center gap-2 text-[#b8c5d6] hover:text-white cursor-pointer">
                    <input type="checkbox" className="rounded bg-white/10 border-white/20 text-[#00ff88] focus:ring-[#00d9ff]" />
                    <span className="text-sm">Intermediate</span>
                  </label>
                  <label className="flex items-center gap-2 text-[#b8c5d6] hover:text-white cursor-pointer">
                    <input type="checkbox" className="rounded bg-white/10 border-white/20 text-[#00ff88] focus:ring-[#00d9ff]" />
                    <span className="text-sm">Advanced</span>
                  </label>
                  <label className="flex items-center gap-2 text-[#b8c5d6] hover:text-white cursor-pointer">
                    <input type="checkbox" className="rounded bg-white/10 border-white/20 text-[#00ff88] focus:ring-[#00d9ff]" />
                    <span className="text-sm">All Levels</span>
                  </label>
                </div>
              </div>
            </div>
          </aside>

          {/* Games List */}
          <div className="flex-1">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-white">Available Games</h1>
                <p className="text-[#b8c5d6] mt-1">{games.length} games found near you</p>
              </div>
              <Link
                href="/games/new"
                className="px-6 py-3 bg-[#00ff88] text-[#0a1628] rounded-lg hover:bg-[#00cc6a] transition-colors font-bold shadow-lg hover:shadow-[#00ff88]/30"
              >
                Host a Game
              </Link>
            </div>

            <div className="space-y-4">
              {games.map((game) => (
                <div
                  key={game.id}
                  className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:border-[#00d9ff]/50 hover:shadow-xl hover:shadow-[#00d9ff]/10 transition-all duration-300 p-6"
                >
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Game Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span className="px-3 py-1 bg-[#00d9ff]/20 text-[#00d9ff] rounded-full text-sm font-bold">
                              {game.sport}
                            </span>
                            <span className="px-3 py-1 bg-white/10 text-[#b8c5d6] rounded-full text-sm">
                              {game.level}
                            </span>
                          </div>
                          <h3 className="text-xl font-semibold text-white mb-2">{game.venue}</h3>
                          <div className="flex items-center gap-1 text-[#b8c5d6] text-sm mb-2">
                            <MapPin className="h-4 w-4 text-[#00d9ff]" />
                            {game.address}
                          </div>
                        </div>
                        {game.costPerPlayer > 0 && (
                          <div className="text-right">
                            <div className="text-2xl font-bold text-[#00ff88]">${game.costPerPlayer}</div>
                            <div className="text-xs text-[#7a8b9a]">per player</div>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-[#00d9ff]" />
                          <span className="text-sm text-[#b8c5d6]">{game.date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-[#00d9ff]" />
                          <span className="text-sm text-[#b8c5d6]">{game.time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-[#00d9ff]" />
                          <span className="text-sm text-[#b8c5d6]">
                            {game.playersJoined}/{game.maxPlayers} players
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-[#00d9ff]" />
                          <span className="text-sm text-[#b8c5d6]">{game.duration}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-[#00d9ff]/20 rounded-full flex items-center justify-center">
                            <Users className="h-4 w-4 text-[#00d9ff]" />
                          </div>
                          <div>
                            <p className="text-sm text-white">Hosted by {game.hostName}</p>
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-[#00ff88] text-[#00ff88]" />
                              <span className="text-xs text-[#7a8b9a]">{game.hostRating}</span>
                            </div>
                          </div>
                        </div>

                        <button className="px-6 py-2 bg-[#00ff88] text-[#0a1628] rounded-lg hover:bg-[#00cc6a] transition-colors font-bold">
                          Join Game
                        </button>
                      </div>
                    </div>

                    {/* Spots indicator */}
                    <div className="lg:w-32 flex lg:flex-col items-center justify-center">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-[#00ff88]">
                          {game.maxPlayers - game.playersJoined}
                        </div>
                        <div className="text-sm text-[#7a8b9a]">spots left</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {games.length === 0 && (
              <div className="text-center py-12">
                <p className="text-[#b8c5d6] text-lg mb-4">No games found matching your criteria.</p>
                <Link
                  href="/games/new"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#00ff88] text-[#0a1628] rounded-lg hover:bg-[#00cc6a] transition-colors font-bold"
                >
                  Host Your Own Game
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
