"use client";

import Link from "next/link";
import { Calendar, MapPin, Users, Clock, DollarSign, Star, ArrowLeft, Edit, UserMinus, UserPlus, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api-client";

// Mock data for a specific game (this would come from API in production)
const mockGameData = {
  id: "g1",
  sport: "Tennis",
  venue: {
    id: "v1",
    name: "Central Park Tennis Center",
    address: "123 Park Ave, New York, NY 10001",
    amenities: ["Lights", "Pro Shop", "Locker Rooms", "Parking"],
    bookingUrl: "https://example.com/book"
  },
  hostUserId: "user1",
  hostName: "Alex Johnson",
  hostRating: 4.8,
  startTime: "2024-01-15T18:00:00Z",
  date: "Today",
  time: "6:00 PM",
  duration: "2 hours",
  minPlayers: 2,
  maxPlayers: 4,
  visibility: "public" as const,
  notes: "Bring your own racket! We'll be playing doubles. Looking for intermediate to advanced players.",
  costInstructions: "$15 per person. Payment via Venmo or cash at the venue.",
  level: "Intermediate",
  participants: [
    {
      id: "p1",
      userId: "user1",
      name: "Alex Johnson", // Host
      status: "joined" as const,
      joinedAt: "2024-01-10T10:00:00Z"
    },
    {
      id: "p2", 
      userId: "user2",
      name: "Sarah Chen",
      status: "joined" as const,
      joinedAt: "2024-01-11T14:30:00Z"
    },
    {
      id: "p3",
      userId: "user3", 
      name: "Mike Wilson",
      status: "joined" as const,
      joinedAt: "2024-01-12T09:15:00Z"
    }
  ],
  waitlist: [
    {
      id: "p4",
      userId: "user4",
      name: "Emma Davis",
      status: "waitlist" as const,
      joinedAt: "2024-01-13T16:45:00Z"
    }
  ]
};

export default function GameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { user } = useAuth();
  const [gameData, setGameData] = useState(mockGameData);
  const currentUserId = user?.id || null;
  const [isJoined, setIsJoined] = useState(
    currentUserId ? (
      gameData.participants.some(p => p.userId === currentUserId) || 
      gameData.waitlist.some(p => p.userId === currentUserId)
    ) : false
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isHost = gameData.hostUserId === currentUserId;
  const currentParticipant = [...gameData.participants, ...gameData.waitlist]
    .find(p => p.userId === currentUserId);
  const spotsLeft = gameData.maxPlayers - gameData.participants.length;

  // Fetch actual game data on mount
  useEffect(() => {
    const fetchGameData = async () => {
      try {
        const gameId = (await params).id;
        const { data, error } = await api.games.get(gameId);
        
        if (error) {
          setError(error);
          return;
        }
        
        if (data?.game) {
          // Transform API data to match our component structure
          // In production, you'd map the actual API response
          // setGameData(transformedData);
          if (process.env.NODE_ENV === 'development') {
            console.log('Fetched game data:', data.game);
          }
        }
      } catch (error) {
        setError('Failed to load game details');
      }
    };

    fetchGameData();
  }, [params]);

  const handleJoinGame = async () => {
    if (!user) {
      router.push('/sign-in');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const gameId = (await params).id;
      const { data, error } = await api.games.join(gameId);

      if (error) {
        setError(error);
        setIsLoading(false);
        return;
      }
      
      if (data) {
        setIsJoined(true);
        
        // Update local game data to reflect the join
        if (data.participant?.status === 'joined') {
          setGameData(prev => ({
            ...prev,
            participants: [...prev.participants, {
              id: data.participant.id,
              userId: currentUserId || '',
              name: "You", // In production, would fetch user name
              status: 'joined' as const,
              joinedAt: new Date().toISOString()
            }]
          }));
        } else {
          setGameData(prev => ({
            ...prev,
            waitlist: [...prev.waitlist, {
              id: data.participant.id,
              userId: currentUserId || '',
              name: "You", // In production, would fetch user name
              status: 'waitlist' as const,
              joinedAt: new Date().toISOString()
            }]
          }));
        }
      }
    } catch (error) {
      setError('Failed to join game. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveGame = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const gameId = (await params).id;
      const { error } = await api.games.leave(gameId);

      if (error) {
        setError(error);
        setIsLoading(false);
        return;
      }
      
      setIsJoined(false);
        
      // Update local game data to remove the user
      setGameData(prev => ({
        ...prev,
        participants: prev.participants.filter(p => p.userId !== currentUserId),
        waitlist: prev.waitlist.filter(p => p.userId !== currentUserId)
      }));
      
      // Optionally refresh the page to get latest data
      router.refresh();
    } catch (error) {
      setError('Failed to leave game. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0f2847] to-[#1a3a5c]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link 
          href="/bookings"
          className="inline-flex items-center gap-2 text-[#00d9ff] hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to My Bookings
        </Link>

        {/* Error display */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        )}

        {/* Game Header */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-3xl font-bold text-white">{gameData.sport}</h1>
                <span className="px-3 py-1 bg-[#00ff88]/20 text-[#00ff88] rounded-full text-sm font-medium">
                  {gameData.level}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  gameData.visibility === 'public' 
                    ? 'bg-[#00d9ff]/20 text-[#00d9ff]'
                    : 'bg-orange-500/20 text-orange-400'
                }`}>
                  {gameData.visibility === 'public' ? 'Public' : 'Private'}
                </span>
              </div>

              <div className="flex items-center gap-2 text-[#b8c5d6] mb-3">
                <MapPin className="h-5 w-5" />
                <div>
                  <p className="font-medium">{gameData.venue.name}</p>
                  <p className="text-sm text-[#7a8b9a]">{gameData.venue.address}</p>
                </div>
              </div>

              {/* Host Info */}
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-[#00d9ff]/20 rounded-full flex items-center justify-center">
                  <Users className="h-4 w-4 text-[#00d9ff]" />
                </div>
                <div>
                  <p className="text-sm text-white">
                    Hosted by {gameData.hostName}
                    {isHost && <span className="text-[#00ff88] ml-1">(You)</span>}
                  </p>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-[#00ff88] text-[#00ff88]" />
                    <span className="text-xs text-[#7a8b9a]">{gameData.hostRating}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 lg:w-48">
              {isHost ? (
                <>
                  <button className="px-4 py-2 bg-[#00d9ff] text-[#0a1628] rounded-lg hover:bg-[#00a8cc] transition-colors font-bold flex items-center justify-center gap-2">
                    <Edit className="h-4 w-4" />
                    Edit Game
                  </button>
                  <button className="px-4 py-2 border border-red-500 text-red-400 rounded-lg hover:bg-red-500/10 transition-colors font-medium flex items-center justify-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Cancel Game
                  </button>
                </>
              ) : (
                <>
                  {isJoined ? (
                    <button 
                      onClick={handleLeaveGame}
                      disabled={isLoading}
                      className="px-4 py-2 border border-red-500 text-red-400 rounded-lg hover:bg-red-500/10 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <UserMinus className="h-4 w-4" />
                      {isLoading ? 'Leaving...' : 'Leave Game'}
                    </button>
                  ) : (
                    <button 
                      onClick={handleJoinGame}
                      disabled={isLoading || spotsLeft === 0}
                      className="px-4 py-2 bg-[#00ff88] text-[#0a1628] rounded-lg hover:bg-[#00cc6a] transition-colors font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <UserPlus className="h-4 w-4" />
                      {isLoading ? 'Joining...' : (spotsLeft > 0 ? 'Join Game' : 'Join Waitlist')}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Game Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Time & Players Info */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Game Details</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-[#00d9ff]" />
                  <div>
                    <p className="text-sm text-[#7a8b9a]">Date</p>
                    <p className="text-white font-medium">{gameData.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-[#00d9ff]" />
                  <div>
                    <p className="text-sm text-[#7a8b9a]">Time</p>
                    <p className="text-white font-medium">{gameData.time}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-[#00d9ff]" />
                  <div>
                    <p className="text-sm text-[#7a8b9a]">Players</p>
                    <p className="text-white font-medium">{gameData.participants.length}/{gameData.maxPlayers}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-[#00d9ff]" />
                  <div>
                    <p className="text-sm text-[#7a8b9a]">Cost</p>
                    <p className="text-white font-medium">$15/player</p>
                  </div>
                </div>
              </div>

              {/* Spots Available */}
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <div>
                  <p className="text-white font-medium">Spots Available</p>
                  <p className="text-sm text-[#7a8b9a]">
                    {spotsLeft > 0 ? `${spotsLeft} spots left` : 'Game is full'}
                    {gameData.waitlist.length > 0 && ` • ${gameData.waitlist.length} on waitlist`}
                  </p>
                </div>
                <div className="text-3xl font-bold text-[#00ff88]">
                  {spotsLeft}
                </div>
              </div>
            </div>

            {/* Notes */}
            {gameData.notes && (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Game Notes</h2>
                <p className="text-[#b8c5d6] leading-relaxed">{gameData.notes}</p>
              </div>
            )}

            {/* Payment Instructions */}
            {gameData.costInstructions && (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Payment Information</h2>
                <p className="text-[#b8c5d6] leading-relaxed">{gameData.costInstructions}</p>
              </div>
            )}

            {/* Venue Info */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Venue Information</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-white mb-2">Amenities</h3>
                  <div className="flex flex-wrap gap-2">
                    {gameData.venue.amenities.map((amenity, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-[#00d9ff]/10 text-[#00d9ff] rounded-full text-sm"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
                <Link
                  href={`/venues/${gameData.venue.id}`}
                  className="inline-flex items-center gap-2 text-[#00d9ff] hover:text-white transition-colors"
                >
                  View Venue Details
                  <ArrowLeft className="h-4 w-4 rotate-180" />
                </Link>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Participants */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">
                Participants ({gameData.participants.length})
              </h2>
              <div className="space-y-3">
                {gameData.participants.map((participant, index) => (
                  <div key={participant.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#00d9ff]/20 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-[#00d9ff]">
                          {participant.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          {participant.name}
                          {participant.userId === gameData.hostUserId && (
                            <span className="text-xs text-[#00ff88] ml-1">(Host)</span>
                          )}
                          {participant.userId === currentUserId && (
                            <span className="text-xs text-[#00d9ff] ml-1">(You)</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Waitlist */}
            {gameData.waitlist.length > 0 && (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">
                  Waitlist ({gameData.waitlist.length})
                </h2>
                <div className="space-y-3">
                  {gameData.waitlist.map((participant, index) => (
                    <div key={participant.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-orange-500/20 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-orange-400">
                            {participant.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-medium">
                            {participant.name}
                            {participant.userId === currentUserId && (
                              <span className="text-xs text-[#00d9ff] ml-1">(You)</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
