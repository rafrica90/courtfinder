"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api-client";
import VenueCard from "./VenueCard";
import type { FilterState } from "./VenueFilters";

interface Venue {
  id: string;
  name: string;
  sportId?: string;
  sports?: string[];
  address: string;
  city?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  hours?: unknown;
  amenities: string[];
  photos: string[];
  imageUrls: string[];
  bookingUrl: string;
  terms?: string;
  indoorOutdoor?: string;
  isPublic: boolean;
  notes?: string;
}

interface VenuesClientProps {
  initialVenues: Venue[];
  sport?: string;
  searchedVenueName?: string;
}

export default function VenuesClient({ initialVenues, sport, searchedVenueName }: VenuesClientProps) {
  const [allVenues] = useState<Venue[]>(initialVenues);
  const [filteredVenues, setFilteredVenues] = useState<Venue[]>(initialVenues);
  const [venues, setVenues] = useState<Venue[]>(initialVenues);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const { user } = useAuth();
  const [favoriteVenueIds, setFavoriteVenueIds] = useState<string[] | null>(null);
  const searchParams = useSearchParams();

  // Apply server-provided name query again on the client to guarantee filtering
  useEffect(() => {
    const query = (searchedVenueName ?? "").toString().trim().toLowerCase().replace(/\+/g, " ");
    
    // Get filter states from URL (consistent with VenueFilters.tsx)
    const params = new URLSearchParams(searchParams?.toString());
    const urlVenueTypes = params.get('venueTypes')?.split(',').filter(Boolean) || [];
    const urlSports = params.get('sports')?.split(',').filter(Boolean) || [];
    const legacySport = sport ? [sport] : [];
    const combinedSports = Array.from(new Set([...(urlSports || []), ...legacySport]));
    const country = params.get('country') || undefined;
    const state = params.get('state') || undefined;
    const suburb = params.get('suburb') || undefined;

    let currentFilteredVenues = initialVenues;

    // Apply sport filter (multi-select)
    if (combinedSports.length > 0) {
      const wanted = new Set(combinedSports.map(s => String(s).toLowerCase()));
      currentFilteredVenues = currentFilteredVenues.filter((venue) => {
        const sportsArray = Array.isArray(venue.sports) ? venue.sports : [];
        const normalized = sportsArray.map((s) => String(s).toLowerCase());
        return normalized.some(s => wanted.has(s));
      });
    }

    // Apply search query filter
    if (query.length > 0) {
      const matchesQuery = (text?: string) => (text ?? "").toLowerCase().includes(query);
      currentFilteredVenues = currentFilteredVenues.filter(v =>
        matchesQuery(v.name) ||
        matchesQuery(v.address) ||
        matchesQuery(v.city) ||
        matchesQuery(v.notes)
      );
    }

    // Apply other filters from URL
    const favoritesOnly = params.get('favorites') === '1';
    const activeFilters: FilterState = {
      sports: combinedSports,
      venueTypes: urlVenueTypes,
      favoritesOnly,
      country,
      state,
      suburb,
    } as FilterState;

    const newlyFiltered = applyFilters(currentFilteredVenues, activeFilters);
    
    setFilteredVenues(newlyFiltered);
    setVenues(newlyFiltered);
  }, [searchedVenueName, sport, initialVenues, searchParams]);

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

  const applyFilters = (venues: Venue[], filters: FilterState): Venue[] => {
    return venues.filter(venue => {
      // Country/State/Suburb
      if (filters.country && String(venue.country || "").toLowerCase() !== String(filters.country).toLowerCase()) {
        return false;
      }
      if (filters.state && String(venue.state || "").toLowerCase() !== String(filters.state).toLowerCase()) {
        return false;
      }
      if (filters.suburb && String(venue.city || "").toLowerCase() !== String(filters.suburb).toLowerCase()) {
        return false;
      }

      // Sports
      if (filters.sports && filters.sports.length > 0) {
        const wanted = new Set(filters.sports.map(s => String(s).toLowerCase()));
        const sportsArray = Array.isArray(venue.sports) ? venue.sports : [];
        const normalized = sportsArray.map((s) => String(s).toLowerCase());
        if (!normalized.some(s => wanted.has(s))) return false;
      }

      // Venue type filter removed

      // Favorites-only filter
      if (filters.favoritesOnly) {
        if (!Array.isArray(favoriteVenueIds)) return false;
        if (!favoriteVenueIds.includes(venue.id)) return false;
      }

      return true;
    });
  };

  // Ask for user location on load and store it for distance sorting
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setLocationError('Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationError(null);
      },
      (err) => {
        setLocationError(err.message || 'Location permission denied');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  const requestLocation = () => {
    if (!('geolocation' in navigator)) {
      setLocationError('Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationError(null);
      },
      (err) => setLocationError(err.message || 'Unable to fetch location'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleFiltersChange = (filters: FilterState) => {
    const filtered = applyFilters(allVenues, filters);
    setFilteredVenues(filtered);
    setVenues(filtered);
  };

  const handleSortedVenues = (sortedVenues: Venue[]) => {
    setVenues(sortedVenues);
  };

  // Derive available geo options moved to page header when rendering filter bar

  return (
    <div className="flex flex-col gap-6">
      <div className="flex-1">
        <div className="flex justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {searchedVenueName
                ? `Search results for "${searchedVenueName}"`
                : sport
                  ? `${sport.charAt(0).toUpperCase() + sport.slice(1)} Venues`
                  : "All Venues"}
            </h1>
            <p className="text-[#b8c5d6] mt-1">
              {venues.length} venues found
              {searchedVenueName && ` matching "${searchedVenueName}"`}
              {sport && ` for ${sport}`}
            </p>
            <div className="mt-2 text-xs text-[#7a8b9a] flex items-center gap-2">
              {userLocation ? (
                <span>Using your location for distance</span>
              ) : (
                <>
                  <button onClick={requestLocation} className="underline hover:text-white">
                    Use my location
                  </button>
                  {locationError && <span className="text-red-400">({locationError})</span>}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Sort selector below the bar */}
        <div className="mt-3">
          {/* Reuse existing sort component */}
          {/** We inline import to avoid circular deps at runtime **/}
          {require('./VenueSort').default({
            venues: filteredVenues as any,
            onSortedVenues: handleSortedVenues as any,
            userLocation: userLocation ?? undefined,
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-4">
          {venues.map((venue) => (
            <VenueCard key={venue.id} venue={venue} />
          ))}
        </div>

        {venues.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[#b8c5d6] text-lg">No venues found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
