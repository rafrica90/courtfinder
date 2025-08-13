"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface Venue {
  id: string;
  name: string;
  priceEstimate?: number;
  priceEstimateText?: string;
  latitude?: number;
  longitude?: number;
}

interface VenueSortProps {
  venues: Venue[];
  onSortedVenues: (sortedVenues: Venue[]) => void;
  userLocation?: { lat: number; lng: number };
}

export default function VenueSort({ venues, onSortedVenues, userLocation }: VenueSortProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const initialSort = searchParams.get("sort") ?? "recommended";
  const [sortBy, setSortBy] = useState<string>(initialSort);

  // Removed price-based sorting utilities

  const sortVenues = (venues: Venue[], sortType: string): Venue[] => {
    const sorted = [...venues];
    
    switch (sortType) {
      case "name-az":
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      
      case "name-za":
        return sorted.sort((a, b) => b.name.localeCompare(a.name));
      
      case "distance":
        if (!userLocation) {
          return sorted.sort((a, b) => a.name.localeCompare(b.name));
        }
        const toRad = (deg: number) => (deg * Math.PI) / 180;
        const haversineKm = (lat1?: number, lon1?: number, lat2?: number, lon2?: number): number => {
          if (
            typeof lat1 !== 'number' || typeof lon1 !== 'number' ||
            typeof lat2 !== 'number' || typeof lon2 !== 'number'
          ) {
            return Number.POSITIVE_INFINITY;
          }
          const R = 6371; // km
          const dLat = toRad(lat2 - lat1);
          const dLon = toRad(lon2 - lon1);
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return R * c;
        };
        return sorted.sort((a, b) => {
          const da = haversineKm(userLocation.lat, userLocation.lng, a.latitude, a.longitude);
          const db = haversineKm(userLocation.lat, userLocation.lng, b.latitude, b.longitude);
          return da - db;
        });
      
      case "recommended":
      default:
        // Keep original order (recommended by database query)
        return venues;
    }
  };

  const handleSortChange = (newSortBy: string) => {
    setSortBy(newSortBy);
    const sortedVenues = sortVenues(venues, newSortBy);
    onSortedVenues(sortedVenues);

    // Persist selection in URL so it survives sport/filter navigation
    const params = new URLSearchParams(searchParams);
    if (newSortBy && newSortBy !== "recommended") {
      params.set("sort", newSortBy);
    } else {
      params.delete("sort");
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Keep component state in sync with URL changes (e.g., back/forward nav)
  useEffect(() => {
    const urlSort = searchParams.get("sort") ?? "recommended";
    if (urlSort !== sortBy) {
      setSortBy(urlSort);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Re-apply current sort whenever input list or location changes
  useEffect(() => {
    const sortedVenues = sortVenues(venues, sortBy);
    onSortedVenues(sortedVenues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venues, sortBy, userLocation]);

  return (
    <select 
      value={sortBy}
      onChange={(e) => handleSortChange(e.target.value)}
      className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff] backdrop-blur-sm"
    >
      <option value="recommended">Sort by: Recommended</option>
      <option value="name-az">Name: A to Z</option>
      <option value="name-za">Name: Z to A</option>
      <option value="distance">Distance: Nearest</option>
    </select>
  );
}
