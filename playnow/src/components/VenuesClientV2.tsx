"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api-client";
import VenueCard from "./VenueCard";
import GamesMap from "./GamesMap";
import GamesFilterBar, { GamesFilters } from "./GamesFilterBar";

interface VenueItem {
  id: string;
  name: string;
  sportId?: string;
  sports?: string[];
  address: string;
  city?: string;
  state?: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  hours?: unknown;
  amenities: string[];
  photos: string[];
  imageUrls?: string[];
  bookingUrl?: string;
  terms?: string;
  indoorOutdoor?: string;
  isPublic?: boolean;
  description?: string;
  notes?: string;
}

interface VenuesClientV2Props {
  venues: VenueItem[];
}

export default function VenuesClientV2({ venues }: VenuesClientV2Props) {
  const [filters, setFilters] = useState<GamesFilters>({ sort: "distance", sports: [], locations: [], favoritesOnly: false, date: "any" });
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

  // Request user's current location once on mount
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && "geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
              setUserLocation({ lat: latitude, lng: longitude });
            }
          },
          () => {},
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
        );
      }
    } catch {}
  }, []);

  const onFiltersChange = useCallback((f: GamesFilters) => {
    // Ensure we don't trigger an update if nothing meaningful changed
    setFilters((prev) => {
      const next: GamesFilters = { ...(prev ?? {} as GamesFilters), ...f, date: "any" };
      const isEqual = JSON.stringify(next) === JSON.stringify(prev);
      return isEqual ? prev : next;
    });
  }, []);

  const filtered = useMemo(() => {
    let list = venues;
    if (filters.sports && filters.sports.length > 0) {
      const set = new Set(filters.sports.map((s) => s.toLowerCase()));
      list = list.filter((v) => {
        const sportsArr = Array.isArray(v.sports)
          ? v.sports.map((s) => s.toLowerCase())
          : [String(v.sportId || "").toLowerCase()].filter(Boolean);
        return sportsArr.some((s) => set.has(s));
      });
    }
    if (filters.locations && filters.locations.length > 0) {
      const locSet = new Set(filters.locations.map((l) => l.toLowerCase()));
      list = list.filter((v) => (v.city ? locSet.has(String(v.city).toLowerCase()) : false));
    }
    // Safely apply favorites filter
    if (filters.favoritesOnly) {
      const safeFavorites = Array.isArray(favoriteVenueIds) ? favoriteVenueIds : [];
      list = list.filter((v) => safeFavorites.includes(v.id));
    }
    return list;
  }, [venues, filters, favoriteVenueIds]);

  const markers = useMemo(
    () =>
      filtered
        .filter((v) => Number.isFinite(v.latitude) && Number.isFinite(v.longitude))
        .map((v) => ({
          id: v.id,
          sport: Array.isArray(v.sports) && v.sports[0] ? v.sports[0] : String(v.sportId || "venue"),
          venue: v.name,
          address: v.address,
          lat: Number(v.latitude),
          lng: Number(v.longitude),
        })),
    [filtered]
  );

  const availableLocations = useMemo(
    () => Array.from(new Set(venues.map((v) => v.city).filter(Boolean))) as string[],
    [venues]
  );

  return (
    <div className="min-h-screen">
      <GamesFilterBar onChange={onFiltersChange} availableLocations={availableLocations} hideDate />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <aside className="lg:col-span-5">
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              <div className="max-h-[70vh] overflow-auto divide-y divide-white/10">
                {filtered.length === 0 && (
                  <div className="p-6 text-[#b8c5d6]">No venues match your filters.</div>
                )}
                {filtered.map((v) => (
                  <div key={v.id} className="p-4">
                    <VenueCard venue={v as any} />
                  </div>
                ))}
              </div>
            </div>
          </aside>
          <div className="lg:col-span-7 lg:sticky lg:top-24 self-start">
            <GamesMap games={markers as any} userLocation={userLocation || undefined} />
            <div className="mt-3 text-[#b8c5d6] text-sm">{markers.length} venues on map</div>
          </div>
        </div>
      </div>
    </div>
  );
}


