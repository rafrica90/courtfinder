"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api-client";
import Link from "next/link";
import { ArrowLeft, Calendar, Users, MapPin, DollarSign, FileText, Eye } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function EditGamePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameData, setGameData] = useState<any>(null);
  const [venueId, setVenueId] = useState<string>("");
  const [allVenues, setAllVenues] = useState<any[]>([]);
  const [isLoadingVenues, setIsLoadingVenues] = useState<boolean>(false);
  
  // Form state
  const [startTime, setStartTime] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [minPlayers, setMinPlayers] = useState(2);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [notes, setNotes] = useState("");
  const [costInstructions, setCostInstructions] = useState("");

  // Fetch game data on mount
  useEffect(() => {
    const fetchGameData = async () => {
      if (!user) {
        router.push('/sign-in');
        return;
      }

      setIsDataLoading(true);
      try {
        const gameId = (await params).id;
        const { data, error } = await api.games.get(gameId);
        
        if (error) {
          setError(error);
          setIsDataLoading(false);
          return;
        }
        
        if (data?.game) {
          const game = data.game;
          
          // Check if user is the host
          if (game.host_user_id !== user.id) {
            setError("You can only edit games you're hosting");
            setIsDataLoading(false);
            return;
          }
          
          setGameData(game);
          setVenueId(game.venue_id || game.venues?.id || "");
          
          // Populate form with existing data
          if (game.start_time) {
            const startDate = new Date(game.start_time);
            setDate(startDate.toISOString().split('T')[0]);
            setTime(startDate.toTimeString().slice(0, 5));
            setStartTime(game.start_time);
          } else if (game.date && game.time) {
            setDate(game.date);
            setTime(game.time.slice(0, 5));
          }
          
          setMinPlayers(game.min_players || 2);
          setMaxPlayers(game.max_players || 4);
          setVisibility(game.visibility || "public");
          setNotes(game.notes || "");
          setCostInstructions(game.cost_instructions || "");
        }
      } catch (error) {
        console.error('Error fetching game:', error);
        setError('Failed to load game details');
      } finally {
        setIsDataLoading(false);
      }
    };

    fetchGameData();
  }, [params, user, router]);

  // Load venues list for selection
  useEffect(() => {
    let isMounted = true;
    const loadVenues = async () => {
      setIsLoadingVenues(true);
      try {
        const supabase = getSupabaseBrowserClient();
        if (supabase) {
          try {
            const { data, error } = await supabase
              .from('venues')
              .select('*')
              .limit(1000);
            if (!error && data && isMounted) {
              setAllVenues(data);
              return;
            }
          } catch (supabaseError) {
            if (process.env.NODE_ENV === 'development') {
              console.warn('Supabase venues fetch failed:', supabaseError);
            }
          }
        }
        if (isMounted) {
          const { venues } = await import('@/lib/mockData');
          setAllVenues(venues as any[]);
        }
      } catch (loadError) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error loading venues:', loadError);
        }
        try {
          const { venues } = await import('@/lib/mockData');
          if (isMounted) setAllVenues(venues as any[]);
        } catch {}
      } finally {
        if (isMounted) setIsLoadingVenues(false);
      }
    };
    loadVenues();
    return () => { isMounted = false; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      router.push('/sign-in');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Combine date and time into ISO string
      const combinedDateTime = new Date(`${date}T${time}`);
      const gameId = (await params).id;
      
      const { data, error } = await api.games.update(gameId, {
        venueId: venueId || gameData?.venue_id,
        startTime: combinedDateTime.toISOString(),
        minPlayers,
        maxPlayers,
        visibility,
        notes,
        costInstructions
      });

      if (error) {
        setError(error);
        return;
      }

      // Redirect to game details page
      router.push(`/games/${gameId}`);
    } catch (error) {
      setError('Failed to update game. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state
  if (isDataLoading) {
    return (
      <div className="min-h-screen">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link 
            href="/bookings"
            className="inline-flex items-center gap-2 text-[#00d9ff] hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to My Bookings
          </Link>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#00d9ff] border-t-transparent"></div>
          </div>
        </div>
      </div>
    );
  }

  // Show error if no game data or not authorized
  if (!gameData || error) {
    return (
      <div className="min-h-screen">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link 
            href="/bookings"
            className="inline-flex items-center gap-2 text-[#00d9ff] hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to My Bookings
          </Link>
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
            <p className="text-red-500">{error || 'Game not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link 
          href={`/games/${gameData.id}`}
          className="inline-flex items-center gap-2 text-[#00d9ff] hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Game Details
        </Link>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <h1 className="text-2xl font-bold text-white mb-6">Edit Game</h1>

          {/* Error display */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-500 text-sm">{error}</p>
            </div>
          )}

          {/* Venue Selection */}
          <div className="mb-6 p-4 bg-white/5 rounded-lg">
            <label className="flex items-center gap-2 text-sm font-medium text-[#b8c5d6] mb-2">
              <MapPin className="h-4 w-4" />
              Venue
            </label>
            <select
              value={venueId}
              onChange={(e) => setVenueId(e.target.value)}
              className="w-full px-4 py-2 bg-[#0f1f39] border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
            >
              <option value="">Select a venue</option>
              {allVenues.map((v: any) => (
                <option key={v.id} value={v.id}>{v.name} - {v.city}</option>
              ))}
            </select>
            <p className="text-xs text-[#7a8b9a] mt-2">{isLoadingVenues ? 'Loading venues…' : `${allVenues.length} venue${allVenues.length===1?'':'s'} available`}</p>

            {venueId && (
              <div className="mt-4 p-3 bg-white/5 rounded border border-white/10">
                {(() => {
                  const selected = allVenues.find((v: any) => v.id === venueId) || gameData.venues;
                  return (
                    <div>
                      <p className="font-medium text-white">{selected?.name || 'Selected Venue'}</p>
                      <p className="text-sm text-[#7a8b9a]">{selected?.address}{selected?.city ? `, ${selected.city}` : ''}</p>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-[#b8c5d6] mb-2">
                  <Calendar className="h-4 w-4" />
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-[#0f1f39] border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-[#b8c5d6] mb-2">
                  <Calendar className="h-4 w-4" />
                  Time
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-[#0f1f39] border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
                />
              </div>
            </div>

            {/* Players */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-[#b8c5d6] mb-2">
                  <Users className="h-4 w-4" />
                  Minimum Players
                </label>
                <input
                  type="number"
                  min="2"
                  max="20"
                  value={minPlayers}
                  onChange={(e) => setMinPlayers(parseInt(e.target.value))}
                  required
                  className="w-full px-4 py-2 bg-[#0f1f39] border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-[#b8c5d6] mb-2">
                  <Users className="h-4 w-4" />
                  Maximum Players
                </label>
                <input
                  type="number"
                  min="2"
                  max="20"
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                  required
                  className="w-full px-4 py-2 bg-[#0f1f39] border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
                />
              </div>
            </div>

            {/* Visibility */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-[#b8c5d6] mb-2">
                <Eye className="h-4 w-4" />
                Visibility
              </label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as "public" | "private")}
                className="w-full px-4 py-2 bg-[#0f1f39] border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
              >
                <option value="public">Public - Anyone can join</option>
                <option value="private">Private - Invite only</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-[#b8c5d6] mb-2">
                <FileText className="h-4 w-4" />
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional information for players..."
                rows={3}
                className="w-full px-4 py-2 bg-[#0f1f39] border border-white/10 rounded-lg text-white placeholder-[#6b7b8f] focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
              />
            </div>

            {/* Cost Instructions */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-[#b8c5d6] mb-2">
                <DollarSign className="h-4 w-4" />
                Payment Instructions (optional)
              </label>
              <textarea
                value={costInstructions}
                onChange={(e) => setCostInstructions(e.target.value)}
                placeholder="e.g., $15 per person via Venmo..."
                rows={2}
                className="w-full px-4 py-2 bg-[#0f1f39] border border-white/10 rounded-lg text-white placeholder-[#6b7b8f] focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-6 py-3 bg-[#00d9ff] text-[#0a1628] rounded-lg hover:bg-[#00a8cc] transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Updating...' : 'Update Game'}
              </button>
              <Link
                href={`/games/${gameData.id}`}
                className="flex-1 px-6 py-3 border border-white/20 text-white rounded-lg hover:bg-white/10 transition-colors font-medium text-center"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
