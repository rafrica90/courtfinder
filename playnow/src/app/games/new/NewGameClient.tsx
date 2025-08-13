'use client';

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { sports as availableSports } from "@/lib/mockData";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { MapPin, Calendar, Users, Globe, FileText, DollarSign } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api-client";

export default function NewGameClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const { user } = useAuth();
  const preselectedVenueId = sp.get('venueId') || '';
  const preselectedSport = sp.get('sport') || '';
  const preselectedLocation = sp.get('location') || '';

  const [venueId, setVenueId] = useState(preselectedVenueId);
  const [startTime, setStartTime] = useState('');
  const [minPlayers, setMinPlayers] = useState(2);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [visibility, setVisibility] = useState<'public'|'private'>('public');
  const [notes, setNotes] = useState('');
  const [costPerPlayer, setCostPerPlayer] = useState('');
  const [skillLevel, setSkillLevel] = useState('');
  const [sportFilter, setSportFilter] = useState(preselectedSport);
  const [locationFilter, setLocationFilter] = useState(preselectedLocation);
  const [allVenues, setAllVenues] = useState<any[]>([]);
  const [isLoadingVenues, setIsLoadingVenues] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoadingVenues(true);
      try {
        const supabase = getSupabaseBrowserClient();
        if (supabase) {
          try {
            const { data, error } = await supabase
              .from('venues')
              .select('*')
              .limit(1000);
            if (!error && data && data.length > 0 && isMounted) {
              setAllVenues(data);
              return;
            }
                      } catch (supabaseError) {
              if (process.env.NODE_ENV === 'development') {
                console.warn('Supabase venues fetch failed:', supabaseError);
              }
          }
        }
        
        // Fallback to mock data
        if (isMounted) {
          const { venues } = await import('@/lib/mockData');
          setAllVenues(venues as any[]);
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error loading venues:', error);
        }
        // Final fallback to mock data
        if (isMounted) {
          try {
            const { venues } = await import('@/lib/mockData');
            setAllVenues(venues as any[]);
          } catch (mockError) {
            if (process.env.NODE_ENV === 'development') {
              console.error('Failed to load mock data:', mockError);
            }
            setAllVenues([]);
          }
        }
      } finally {
        if (isMounted) setIsLoadingVenues(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      router.push('/sign-in');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      const { data, error } = await api.games.create({
        venueId,
        startTime,
        minPlayers,
        maxPlayers,
        visibility,
        skillLevel,
        notes,
        costInstructions: costPerPlayer ? `$${costPerPlayer} per player` : undefined
      });
      
      if (error) {
        console.error('Game creation error:', error);
        setError(error);
        setSubmitting(false);
        return;
      }
      
      if (data?.game?.id) {
        router.push(`/games/${data.game.id}?created=1`);
      } else {
        router.push(`/games?created=1`);
      }
    } catch (err) {
      console.error('Unexpected error creating game:', err);
      setError(err instanceof Error ? err.message : 'Failed to create game. Please try again.');
      setSubmitting(false);
    }
  };

  const normalizedSport = sportFilter.trim().toLowerCase();
  const normalizedLocation = locationFilter.trim().toLowerCase();

  const availableCities = useMemo(() => {
    const cities = new Set<string>();
    allVenues.forEach((v: any) => {
      if (v.city) cities.add(v.city);
    });
    return Array.from(cities).sort();
  }, [allVenues]);

  const filteredVenues = useMemo(() => {
    return allVenues.filter((v: any) => {
      const matchesSport =
        normalizedSport.length === 0 ||
        (Array.isArray(v.sports)
          ? v.sports.some((s: any) => String(s).toLowerCase() === normalizedSport)
          : String(v.sportId ?? v.sport_id ?? '').toLowerCase() === normalizedSport);

      const matchesLocation =
        normalizedLocation.length === 0 || 
        String(v.city || '').toLowerCase() === normalizedLocation;

      return matchesSport && matchesLocation;
    });
  }, [normalizedSport, normalizedLocation, allVenues]);

  const selectedVenue = allVenues.find((v: any) => v.id === venueId);

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Host a Game</h1>
          <p className="text-[#b8c5d6]">Create a game and invite players to join you</p>
        </div>

        <form onSubmit={submit} className="space-y-6">
          {/* Venue Selection */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-white">
              <MapPin className="h-5 w-5 text-[#00d9ff]" />
              Venue Details
            </h2>
            
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-[#00d9ff]">Sport</label>
                    <select
                      value={sportFilter}
                      onChange={(e)=>setSportFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff] focus:bg-white/20"
                    >
                      <option value="">All sports</option>
                      {availableSports.map(s => (
                        <option key={s.slug} value={s.slug}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-[#00d9ff]">Location</label>
                    <select
                      value={locationFilter}
                      onChange={(e)=>setLocationFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff] focus:bg-white/20"
                    >
                      <option value="">All locations</option>
                      {availableCities.map(city => (
                        <option key={city} value={city.toLowerCase()}>{city}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-[#00d9ff]">Select Venue *</label>
                  <select 
                    value={venueId} 
                    onChange={e=>setVenueId(e.target.value)} 
                    required 
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff] focus:bg-white/20"
                  >
                    <option value="">Choose a venue</option>
                    {filteredVenues.map((v: any) => (
                      <option key={v.id} value={v.id}>{v.name} - {v.city}</option>
                    ))}
                  </select>
                  <p className="text-xs text-[#7a8b9a] mt-1">{isLoadingVenues ? 'Loading venues…' : `${filteredVenues.length} venue${filteredVenues.length===1?'':'s'} match your filters`}</p>
                </div>
              </div>

              {selectedVenue && (
                <div className="p-4 bg-[#00ff88]/10 rounded-lg border border-[#00ff88]/30">
                  <div className="text-sm">
                    <p className="font-medium text-white">{selectedVenue.name}</p>
                    <p className="text-[#b8c5d6]">{selectedVenue.address}, {selectedVenue.city}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Date & Time */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-white">
              <Calendar className="h-5 w-5 text-[#00d9ff]" />
              Date & Time
            </h2>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-[#00d9ff]">Game Start Time *</label>
              <input 
                type="datetime-local" 
                value={startTime} 
                onChange={e=>setStartTime(e.target.value)} 
                required 
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff] focus:bg-white/20"
              />
            </div>
          </div>

          {/* Players */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-white">
              <Users className="h-5 w-5 text-[#00d9ff]" />
              Player Settings
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-[#00d9ff]">Minimum Players *</label>
                <input 
                  type="number" 
                  min={1} 
                  value={minPlayers} 
                  onChange={e=>setMinPlayers(parseInt(e.target.value||'0'))} 
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff] focus:bg-white/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-[#00d9ff]">Maximum Players *</label>
                <input 
                  type="number" 
                  min={1} 
                  value={maxPlayers} 
                  onChange={e=>setMaxPlayers(parseInt(e.target.value||'0'))} 
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff] focus:bg-white/20"
                />
              </div>
            </div>
          </div>

          {/* Game Settings */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-white">
              <Globe className="h-5 w-5 text-[#00d9ff]" />
              Game Settings
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-[#00d9ff]">Visibility *</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`flex items-center justify-center px-4 py-3 border rounded-lg cursor-pointer transition-all ${
                    visibility === 'public' 
                      ? 'border-[#00ff88] bg-[#00ff88]/20 text-[#00ff88]' 
                      : 'border-white/20 hover:bg-white/10 text-[#b8c5d6]'
                  }`}>
                    <input 
                      type="radio" 
                      value="public" 
                      checked={visibility === 'public'}
                      onChange={e => setVisibility(e.target.value as 'public'|'private')}
                      className="sr-only"
                    />
                    <span className="font-medium">Public Game</span>
                  </label>
                  <label className={`flex items-center justify-center px-4 py-3 border rounded-lg cursor-pointer transition-all ${
                    visibility === 'private' 
                      ? 'border-[#00ff88] bg-[#00ff88]/20 text-[#00ff88]' 
                      : 'border-white/20 hover:bg-white/10 text-[#b8c5d6]'
                  }`}>
                    <input 
                      type="radio" 
                      value="private" 
                      checked={visibility === 'private'}
                      onChange={e => setVisibility(e.target.value as 'public'|'private')}
                      className="sr-only"
                    />
                    <span className="font-medium">Private Game</span>
                  </label>
                </div>
                <p className="text-sm text-[#7a8b9a] mt-2">
                  {visibility === 'public' 
                    ? 'Anyone can find and join this game' 
                    : 'Only people with the invite link can join'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-[#00d9ff]">Skill Level *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {['Beginner','Intermediate','Advanced','All Levels'].map((level) => (
                    <label
                      key={level}
                      className={`flex items-center gap-3 px-4 py-3 border rounded-lg cursor-pointer transition-all ${
                        skillLevel === level
                          ? 'border-[#00ff88] bg-[#00ff88]/20 text-[#00ff88]'
                          : 'border-white/20 hover:bg-white/10 text-[#b8c5d6]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="skillLevel"
                        value={level}
                        checked={skillLevel === level}
                        onChange={() => setSkillLevel(level)}
                        required
                        className="sr-only"
                      />
                      <span className="font-medium">{level}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2 text-[#00d9ff]">
                  <DollarSign className="h-4 w-4 text-[#00ff88]" />
                  Cost per Player (Optional)
                </label>
                <input 
                  type="text" 
                  value={costPerPlayer}
                  onChange={e => setCostPerPlayer(e.target.value)}
                  placeholder="e.g., $15"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff] focus:bg-white/20 placeholder-[#7a8b9a]"
                />
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-white">
              <FileText className="h-5 w-5 text-[#00d9ff]" />
              Additional Information
            </h2>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-[#00d9ff]">
                Notes & Payment Instructions (Optional)
              </label>
              <textarea 
                value={notes} 
                onChange={e=>setNotes(e.target.value)} 
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff] focus:bg-white/20 placeholder-[#7a8b9a]"
                rows={4} 
                placeholder="e.g., Please bring your own equipment. Payment via Venmo @username"
              />
            </div>
          </div>

          {/* Error display */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-500 text-sm font-medium mb-2">Failed to create game</p>
              <p className="text-red-400 text-sm">{error}</p>
              {error.includes('Authentication') && (
                <p className="text-red-400 text-sm mt-2">
                  Please <Link href="/sign-in" className="underline hover:text-red-300">sign in</Link> and try again.
                </p>
              )}
            </div>
          )}

          {/* Authentication notice */}
          {!user && (
            <div className="p-4 bg-[#00d9ff]/10 border border-[#00d9ff]/30 rounded-lg">
              <p className="text-[#00d9ff] text-sm">
                You need to sign in to create a game.{' '}
                <a href="/sign-in" className="underline hover:text-[#00ff88]">
                  Sign in now
                </a>
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4">
            <button 
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-6 py-3 border border-white/20 text-[#b8c5d6] rounded-lg hover:bg-white/10 transition-colors font-semibold"
              disabled={submitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="flex-1 px-6 py-3 bg-[#00ff88] text-[#0a1628] rounded-lg hover:bg-[#00cc6a] transition-colors font-bold shadow-lg hover:shadow-[#00ff88]/30 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={submitting || !user}
            >
              {submitting ? 'Creating...' : 'Create Game'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}