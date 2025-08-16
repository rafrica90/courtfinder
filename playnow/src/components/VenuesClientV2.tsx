"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api-client";
import VenueCard from "./VenueCard";
import GamesMap from "./GamesMap";
import GamesFilterBar, { GamesFilters } from "./GamesFilterBar";
import { MapPin, AlertCircle, RotateCcw } from "lucide-react";

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
  const [locationStatus, setLocationStatus] = useState<'requesting' | 'granted' | 'denied' | 'unavailable' | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showManualLocation, setShowManualLocation] = useState<boolean>(false);
  const [manualLocationQuery, setManualLocationQuery] = useState<string>('');
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

  // Simple geocoding function for manual location entry
  const geocodeLocation = useCallback(async (locationName: string) => {
    try {
      // Using a simple geocoding approach with Nominatim (free OpenStreetMap service)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}&limit=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        return {
          lat: parseFloat(lat),
          lng: parseFloat(lon)
        };
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
    return null;
  }, []);

  const handleManualLocation = useCallback(async () => {
    if (!manualLocationQuery.trim()) return;
    
    setLocationStatus('requesting');
    const location = await geocodeLocation(manualLocationQuery.trim());
    
    if (location) {
      setUserLocation(location);
      setLocationStatus('granted');
      setLocationError(null);
      setShowManualLocation(false);
    } else {
      setLocationError('Could not find the specified location. Please try a different search term.');
      setLocationStatus('denied');
    }
  }, [manualLocationQuery, geocodeLocation]);

  // Request user's current location once on mount with better error handling
  const requestLocation = useCallback(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setLocationStatus('unavailable');
      setLocationError('Geolocation is not supported by this browser');
      return;
    }

    setLocationStatus('requesting');
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
          setUserLocation({ lat: latitude, lng: longitude });
          setLocationStatus('granted');
          setLocationError(null);
        }
      },
      (error) => {
        setLocationStatus('denied');
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Location access denied. You can manually enter your location below to see distances to venues.');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError('Location information is unavailable. You can manually enter your location below.');
            break;
          case error.TIMEOUT:
            setLocationError('Location request timed out. Please try again or enter your location manually.');
            break;
          default:
            setLocationError('An unknown error occurred while retrieving location. You can enter your location manually below.');
            break;
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

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
      
      {/* Location Status Banner */}
      {locationStatus && locationStatus !== 'granted' && (
        <div className="bg-amber-500/10 border-l-4 border-amber-500 p-4 mx-4 sm:mx-6 lg:mx-8 rounded-r-md">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {locationStatus === 'requesting' ? (
                <RotateCcw className="h-5 w-5 text-amber-500 animate-spin" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-500" />
              )}
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm text-amber-200">
                {locationStatus === 'requesting' && 'Requesting your location...'}
                {locationStatus === 'denied' && locationError}
                {locationStatus === 'unavailable' && locationError}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {locationStatus === 'denied' && (
                  <button
                    onClick={requestLocation}
                    className="inline-flex items-center gap-1 text-sm text-amber-300 hover:text-amber-100 underline"
                  >
                    <MapPin className="h-4 w-4" />
                    Try again
                  </button>
                )}
                {(locationStatus === 'denied' || locationStatus === 'unavailable') && (
                  <>
                    <span className="text-amber-300 text-sm">or</span>
                    {!showManualLocation ? (
                      <button
                        onClick={() => setShowManualLocation(true)}
                        className="inline-flex items-center gap-1 text-sm text-amber-300 hover:text-amber-100 underline"
                      >
                        Enter location manually
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Enter city, suburb, or address"
                          value={manualLocationQuery}
                          onChange={(e) => setManualLocationQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleManualLocation()}
                          className="px-3 py-1 rounded-md bg-amber-500/20 border border-amber-500/30 text-amber-100 placeholder-amber-300/70 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        />
                        <button
                          onClick={handleManualLocation}
                          disabled={!manualLocationQuery.trim()}
                          className="px-3 py-1 bg-amber-500 text-amber-900 rounded-md text-sm font-medium hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Set Location
                        </button>
                        <button
                          onClick={() => {
                            setShowManualLocation(false);
                            setManualLocationQuery('');
                          }}
                          className="text-amber-300/70 hover:text-amber-200 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Location Success Banner */}
      {locationStatus === 'granted' && userLocation && (
        <div className="bg-green-500/10 border-l-4 border-green-500 p-3 mx-4 sm:mx-6 lg:mx-8 rounded-r-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <MapPin className="h-4 w-4 text-green-500 mr-2" />
              <p className="text-sm text-green-200">
                Location set - distances are calculated from your current location
              </p>
            </div>
            <button
              onClick={() => {
                setUserLocation(null);
                setLocationStatus(null);
                setLocationError(null);
                setShowManualLocation(false);
                setManualLocationQuery('');
              }}
              className="text-green-300/70 hover:text-green-200 text-sm underline"
            >
              Change location
            </button>
          </div>
        </div>
      )}

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
          <div className="lg:col-span-7 lg:sticky lg:top-32 self-start">
            <GamesMap games={markers as any} userLocation={userLocation || undefined} />
            <div className="mt-3 text-[#b8c5d6] text-sm">{markers.length} venues on map</div>
          </div>
        </div>
      </div>
    </div>
  );
}


