"use client";

import Link from "next/link";
import { Calendar, MapPin, Users, Clock, DollarSign, Plus, Edit, X } from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

type GameData = {
  id: string;
  sport: string;
  venue: string;
  venueId: string;
  address: string;
  date: string;
  time: string;
  duration: string;
  playersJoined: number;
  maxPlayers: number;
  costPerPlayer: number;
  level: string;
  status: string;
  notes?: string;
  hostName?: string;
  hostRating?: number;
};

export default function BookingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'hosted' | 'joined'>('hosted');
  const [userGames, setUserGames] = useState<{hosted: GameData[], joined: GameData[]}>({
    hosted: [],
    joined: []
  });
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    gameId: string;
    action: 'cancel' | 'leave';
    gameName: string;
  } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch user's games from the API
  useEffect(() => {
    if (!user) {
      router.push('/sign-in');
      return;
    }
    
    fetchUserGames();
  }, [user, router]);

  const fetchUserGames = async () => {
    setLoading(true);
    setErrorMessage(null);
    
    try {
      // Fetch both hosted and joined games in parallel
      const [hostedResponse, joinedResponse] = await Promise.all([
        api.games.listUserGames('hosted'),
        api.games.listUserGames('joined')
      ]);

      if (hostedResponse.error) {
        console.error('Error fetching hosted games:', hostedResponse.error);
      }
      
      if (joinedResponse.error) {
        console.error('Error fetching joined games:', joinedResponse.error);
      }

      // Transform the data to match our UI format
      const transformGame = (game: any): GameData => ({
        id: game.id,
        sport: game.sport || 'Tennis',
        venue: game.venues?.name || 'Unknown Venue',
        venueId: game.venue_id,
        address: game.venues ? `${game.venues.address || ''}, ${game.venues.city || ''}` : 'Unknown Location',
        date: game.date ? new Date(game.date).toLocaleDateString('en-US', { 
          weekday: 'long',
          month: 'short',
          day: 'numeric'
        }) : 'TBD',
        time: game.time || 'TBD',
        duration: `${game.duration || 2} hours`,
        playersJoined: (game.participants || []).filter((p: any) => p.status === 'joined').length || 0,
        maxPlayers: game.max_players || 4,
        costPerPlayer: game.cost_per_player || 0,
        level: game.skill_level || 'All Levels',
        status: game.status || 'active',
        notes: game.notes,
        hostName: game.host_name || 'Anonymous',
        hostRating: 4.5 // Would need to fetch from profiles
      });

      setUserGames({
        hosted: hostedResponse.data?.games?.map(transformGame) || [],
        joined: joinedResponse.data?.games?.map(transformGame) || []
      });
    } catch (error) {
      console.error('Error fetching games:', error);
      setErrorMessage('Failed to load your games. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  };

  const currentGames = activeTab === 'hosted' ? userGames.hosted : userGames.joined;

  // Handle canceling a hosted game
  const handleCancelGame = (gameId: string, gameName: string) => {
    setConfirmDialog({
      isOpen: true,
      gameId,
      action: 'cancel',
      gameName
    });
  };

  // Handle leaving a joined game
  const handleLeaveGame = (gameId: string, gameName: string) => {
    setConfirmDialog({
      isOpen: true,
      gameId,
      action: 'leave',
      gameName
    });
  };

  // Confirm the action (cancel or leave)
  const confirmAction = async () => {
    if (!confirmDialog) return;

    setErrorMessage(null);
    
    try {
      if (confirmDialog.action === 'cancel') {
        // Call API to delete the game
        const response = await api.games.delete(confirmDialog.gameId);
        
        if (response.error) {
          setErrorMessage(response.error);
          setConfirmDialog(null);
          return;
        }
        
        // Remove the game from hosted games
        setUserGames(prev => ({
          ...prev,
          hosted: prev.hosted.filter(game => game.id !== confirmDialog.gameId)
        }));
        setSuccessMessage(`Successfully canceled ${confirmDialog.gameName} game`);
      } else {
        // Call API to leave the game
        const response = await api.games.leave(confirmDialog.gameId);
        
        if (response.error) {
          setErrorMessage(response.error);
          setConfirmDialog(null);
          return;
        }
        
        // Remove the game from joined games
        setUserGames(prev => ({
          ...prev,
          joined: prev.joined.filter(game => game.id !== confirmDialog.gameId)
        }));
        setSuccessMessage(`Successfully left ${confirmDialog.gameName} game`);
      }

      setConfirmDialog(null);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Error performing action:', error);
      setErrorMessage('Failed to perform action. Please try again.');
      setConfirmDialog(null);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">My Bookings</h1>
          <p className="text-[#b8c5d6]">Manage your hosted games and view games you&apos;ve joined</p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-[#00ff88]/20 border border-[#00ff88] text-[#00ff88] px-4 py-3 rounded-lg flex items-center justify-between">
            <span className="font-medium">{successMessage}</span>
            <button 
              onClick={() => setSuccessMessage(null)}
              className="hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-6 bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg flex items-center justify-between">
            <span className="font-medium">{errorMessage}</span>
            <button 
              onClick={() => setErrorMessage(null)}
              className="hover:text-red-300 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8 bg-white/5 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('hosted')}
            className={`px-6 py-3 rounded-md font-medium transition-all ${
              activeTab === 'hosted'
                ? 'bg-[#00d9ff] text-[#0a1628] shadow-lg'
                : 'text-[#b8c5d6] hover:text-white hover:bg-white/10'
            }`}
          >
            Games I&apos;m Hosting ({userGames.hosted.length})
          </button>
          <button
            onClick={() => setActiveTab('joined')}
            className={`px-6 py-3 rounded-md font-medium transition-all ${
              activeTab === 'joined'
                ? 'bg-[#00d9ff] text-[#0a1628] shadow-lg'
                : 'text-[#b8c5d6] hover:text-white hover:bg-white/10'
            }`}
          >
            Games I&apos;ve Joined ({userGames.joined.length})
          </button>
        </div>

        {/* Games List */}
        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#00d9ff] border-t-transparent"></div>
              <p className="text-[#b8c5d6] mt-4">Loading your games...</p>
            </div>
          ) : currentGames.length === 0 ? (
            <div className="text-center py-16">
              <Calendar className="h-16 w-16 text-[#7a8b9a] mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                {activeTab === 'hosted' ? 'No games hosted yet' : 'No games joined yet'}
              </h3>
              <p className="text-[#7a8b9a] mb-6">
                {activeTab === 'hosted' 
                  ? 'Ready to organize your first game? Create one now!'
                  : 'Browse available games and join one that interests you!'
                }
              </p>
              <Link
                href={activeTab === 'hosted' ? '/games/new' : '/games'}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#00ff88] text-[#0a1628] rounded-lg hover:bg-[#00cc6a] transition-colors font-bold"
              >
                <Plus className="h-5 w-5" />
                {activeTab === 'hosted' ? 'Host a Game' : 'Find Games'}
              </Link>
            </div>
          ) : (
            currentGames.map((game) => (
              <div
                key={game.id}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  <div className="flex-1">
                    {/* Game Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-white">{game.sport}</h3>
                          <span className="px-3 py-1 bg-[#00ff88]/20 text-[#00ff88] rounded-full text-sm font-medium">
                            {game.level}
                          </span>
                          {activeTab === 'hosted' && (
                            <span className="px-3 py-1 bg-[#00d9ff]/20 text-[#00d9ff] rounded-full text-sm font-medium">
                              Host
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[#b8c5d6] mb-2">
                          <MapPin className="h-4 w-4" />
                          <span className="font-medium">{game.venue}</span>
                        </div>
                        <p className="text-sm text-[#7a8b9a]">{game.address}</p>
                      </div>

                      {activeTab === 'hosted' && (
                        <button className="p-2 text-[#7a8b9a] hover:text-[#00d9ff] hover:bg-white/10 rounded-lg transition-colors">
                          <Edit className="h-5 w-5" />
                        </button>
                      )}
                    </div>

                    {/* Game Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-[#00d9ff]" />
                        <div>
                          <p className="text-sm text-[#7a8b9a]">Date</p>
                          <p className="text-white font-medium">{game.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-[#00d9ff]" />
                        <div>
                          <p className="text-sm text-[#7a8b9a]">Time</p>
                          <p className="text-white font-medium">{game.time}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-[#00d9ff]" />
                        <div>
                          <p className="text-sm text-[#7a8b9a]">Players</p>
                          <p className="text-white font-medium">{game.playersJoined}/{game.maxPlayers}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-[#00d9ff]" />
                        <div>
                          <p className="text-sm text-[#7a8b9a]">Cost</p>
                          <p className="text-white font-medium">${game.costPerPlayer}</p>
                        </div>
                      </div>
                    </div>

                    {/* Host Info for joined games */}
                    {activeTab === 'joined' && 'hostName' in game && (
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 bg-[#00d9ff]/20 rounded-full flex items-center justify-center">
                          <Users className="h-4 w-4 text-[#00d9ff]" />
                        </div>
                        <div>
                          <p className="text-sm text-white">Hosted by {game.hostName}</p>
                        </div>
                      </div>
                    )}

                    {/* Notes for hosted games */}
                    {activeTab === 'hosted' && 'notes' in game && game.notes && (
                      <div className="mb-4">
                        <p className="text-sm text-[#7a8b9a] mb-1">Notes:</p>
                        <p className="text-white">{game.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-3 lg:w-48">
                    {activeTab === 'hosted' ? (
                      <>
                        <Link
                          href={`/games/${game.id}`}
                          className="px-4 py-2 bg-[#00d9ff] text-[#0a1628] rounded-lg hover:bg-[#00a8cc] transition-colors font-bold text-center"
                        >
                          Manage Game
                        </Link>
                        <button 
                          onClick={() => handleCancelGame(game.id, game.sport)}
                          className="px-4 py-2 border border-red-500 text-red-400 rounded-lg hover:bg-red-500/10 hover:border-red-400 transition-colors font-medium"
                        >
                          Cancel Game
                        </button>
                      </>
                    ) : (
                      <>
                        <Link
                          href={`/games/${game.id}`}
                          className="px-4 py-2 bg-[#00d9ff] text-[#0a1628] rounded-lg hover:bg-[#00a8cc] transition-colors font-bold text-center"
                        >
                          View Details
                        </Link>
                        <button 
                          onClick={() => handleLeaveGame(game.id, game.sport)}
                          className="px-4 py-2 border border-red-500 text-red-400 rounded-lg hover:bg-red-500/10 hover:border-red-400 transition-colors font-medium"
                        >
                          Leave Game
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/games/new"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#00ff88] text-[#0a1628] rounded-lg hover:bg-[#00cc6a] transition-colors font-bold"
          >
            <Plus className="h-5 w-5" />
            Host New Game
          </Link>
          <Link
            href="/games"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-[#00d9ff] text-[#00d9ff] rounded-lg hover:bg-[#00d9ff]/10 transition-colors font-bold"
          >
            <Calendar className="h-5 w-5" />
            Find More Games
          </Link>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-[#0f2847] border border-white/10 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">
              {confirmDialog.action === 'cancel' ? 'Cancel Game?' : 'Leave Game?'}
            </h3>
            <p className="text-[#b8c5d6] mb-6">
              Are you sure you want to {confirmDialog.action === 'cancel' ? 'cancel' : 'leave'} the{' '}
              <span className="font-semibold text-white">{confirmDialog.gameName}</span> game?
              {confirmDialog.action === 'cancel' && 
                ' All players will be notified and any payments will be refunded.'
              }
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 px-4 py-2 border border-[#7a8b9a] text-[#b8c5d6] rounded-lg hover:border-white hover:text-white transition-colors font-medium"
              >
                Keep Game
              </button>
              <button
                onClick={confirmAction}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
              >
                {confirmDialog.action === 'cancel' ? 'Yes, Cancel Game' : 'Yes, Leave Game'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
