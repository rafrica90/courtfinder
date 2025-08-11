"use client";

import Link from "next/link";
import { Calendar, MapPin, Users, Clock, DollarSign, Star, Plus, Edit, X } from "lucide-react";
import { useState } from "react";

// Mock data for user's games (this would come from API/database in production)
const initialMockUserGames = {
  hosted: [
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
      level: "Intermediate",
      status: "active" as const,
      notes: "Bring your own racket!",
    },
    {
      id: "g5",
      sport: "Pickleball",
      venue: "Brooklyn Pickleball Club",
      address: "456 Court St, New York",
      date: "Saturday",
      time: "2:00 PM",
      duration: "1.5 hours",
      playersJoined: 1,
      maxPlayers: 4,
      costPerPlayer: 12,
      level: "All Levels",
      status: "active" as const,
    },
  ],
  joined: [
    {
      id: "g2",
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
      status: "confirmed" as const,
    },
    {
      id: "g3",
      sport: "Tennis",
      venue: "Riverside Courts",
      address: "321 River Rd, New York",
      date: "Tomorrow",
      time: "8:00 AM",
      duration: "1 hour",
      playersJoined: 2,
      maxPlayers: 2,
      costPerPlayer: 25,
      hostName: "Emma Wilson",
      hostRating: 5.0,
      level: "Beginner",
      status: "confirmed" as const,
    },
  ],
};

export default function BookingsPage() {
  const [activeTab, setActiveTab] = useState<'hosted' | 'joined'>('hosted');
  const [userGames, setUserGames] = useState(initialMockUserGames);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    gameId: string;
    action: 'cancel' | 'leave';
    gameName: string;
  } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
  const confirmAction = () => {
    if (!confirmDialog) return;

    if (confirmDialog.action === 'cancel') {
      // Remove the game from hosted games
      setUserGames(prev => ({
        ...prev,
        hosted: prev.hosted.filter(game => game.id !== confirmDialog.gameId)
      }));
      setSuccessMessage(`Successfully canceled ${confirmDialog.gameName} game`);
    } else {
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
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0f2847] to-[#1a3a5c]">
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
          {currentGames.length === 0 ? (
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
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-[#00ff88] text-[#00ff88]" />
                            <span className="text-xs text-[#7a8b9a]">{game.hostRating}</span>
                          </div>
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
