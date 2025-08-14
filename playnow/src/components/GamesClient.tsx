'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import GamesMap from './GamesMap';
import GamesFilterBar, { GamesFilters } from './GamesFilterBar';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api-client';

export type GamesMapItem = {
  id: string;
  sport: string;
  venue: string;
  address: string;
  city?: string;
  latitude?: number | null;
  longitude?: number | null;
  date?: string;
  time?: string;
  playersJoined?: number;
  maxPlayers?: number;
};

interface GamesClientProps {
  games: GamesMapItem[];
}

export default function GamesClient({ games }: GamesClientProps) {
  const [filters, setFilters] = useState<GamesFilters>({ sort: 'distance', sports: [], locations: [], favoritesOnly: false, date: 'any' });
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const { user } = useAuth();
  const [favoriteVenueIds, setFavoriteVenueIds] = useState<string[] | null>(null);

  // Load favorites when user logs in
  useEffect(() => {
    (async () => {
      if (!user) {
        setFavoriteVenueIds(null);
        return;
      }
      const { data } = await api.favorites.list();
      setFavoriteVenueIds(data?.favorites || []);
    })();
  }, [user]);

  const onFiltersChange = useCallback((f: GamesFilters) => setFilters(f), []);

  const filtered = useMemo(() => {
    let list = games;
    if (filters.sports && filters.sports.length > 0) {
      const set = new Set(filters.sports.map((s) => s.toLowerCase()));
      list = list.filter((g) => set.has(g.sport.toLowerCase()));
    }
    if (filters.locations && filters.locations.length > 0) {
      const locSet = new Set(filters.locations.map((l) => l.toLowerCase()));
      list = list.filter((g) => (g.city ? locSet.has(g.city.toLowerCase()) : false));
    }
    // venue type filter removed
    if (filters.favoritesOnly) {
      if (Array.isArray(favoriteVenueIds)) {
        list = list.filter((g) => favoriteVenueIds.includes((g as any).venueId || ''));
      } else {
        list = [];
      }
    }
    // Date filter based on formatted strings provided by server
    if (filters.date && filters.date !== 'any') {
      const fmt = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      const now = new Date();
      const todayStr = fmt(now);
      const tomorrowStr = fmt(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
      list = list.filter((g) => {
        const text = (g.date || '').toString();
        if (filters.date === 'today') return text === todayStr;
        if (filters.date === 'tomorrow') return text === tomorrowStr;
        if (filters.date === 'weekend') return text.startsWith('Saturday') || text.startsWith('Sunday');
        if (filters.date === 'on' && filters.onDate) {
          try {
            const d = new Date(filters.onDate + 'T00:00:00');
            const target = fmt(d);
            return text === target;
          } catch {
            return true;
          }
        }
        return true;
      });
    }
    return list;
  }, [games, filters, favoriteVenueIds]);

  const markers = useMemo(
    () =>
      filtered
        .filter((g) => Number.isFinite(g.latitude) && Number.isFinite(g.longitude))
        .map((g) => ({
          id: g.id,
          sport: g.sport,
          venue: g.venue,
          address: g.address,
          lat: Number(g.latitude),
          lng: Number(g.longitude),
          date: g.date,
          time: g.time,
        })),
    [filtered]
  );

  // Geolocation can be added later with a dedicated control

  return (
    <div className="min-h-screen">
      <GamesFilterBar
        onChange={onFiltersChange}
        availableLocations={Array.from(new Set(games.map((g) => g.city).filter(Boolean))) as string[]}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <aside className="lg:col-span-5">
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              <div className="max-h-[70vh] overflow-auto divide-y divide-white/10">
                {filtered.length === 0 && (
                  <div className="p-6 text-[#b8c5d6]">No games match your filters.</div>
                )}
                {filtered.map((g) => (
                  <Link key={g.id} href={`/games/${g.id}`} className="block p-4 hover:bg-white/5 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-white font-semibold">{g.venue}</div>
                        <div className="text-xs text-[#7a8b9a] mt-0.5">{g.address}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#00d9ff]/20 text-[#00d9ff] text-xs font-bold">{g.sport}</span>
                    </div>
                    <div className="mt-2 text-sm text-[#b8c5d6] flex items-center gap-3">
                      <span>{g.date}</span>
                      <span>•</span>
                      <span>{g.time}</span>
                      {typeof g.playersJoined === 'number' && typeof g.maxPlayers === 'number' && (
                        <>
                          <span>•</span>
                          <span>
                            {g.playersJoined}/{g.maxPlayers} players
                          </span>
                        </>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
          <div className="lg:col-span-7 lg:sticky lg:top-24 self-start">
            <GamesMap games={markers} userLocation={userLocation || undefined} />
            <div className="mt-3 text-[#b8c5d6] text-sm">{markers.length} games on map</div>
          </div>
        </div>
      </div>
    </div>
  );
}


