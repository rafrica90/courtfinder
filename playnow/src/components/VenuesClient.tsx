"use client";

import { useState, useEffect } from "react";
import VenueCard from "./VenueCard";
import VenueSort from "./VenueSort";
import VenueFilters, { FilterState } from "./VenueFilters";

interface Venue {
  id: string;
  name: string;
  sportId?: string;
  sports?: string[];
  address: string;
  city?: string;
  latitude?: number;
  longitude?: number;
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

  // Apply server-provided name query again on the client to guarantee filtering
  useEffect(() => {
    const query = (searchedVenueName ?? "").toString().trim().toLowerCase().replace(/\+/g, " ");
    
    // Get filter states from URL (consistent with VenueFilters.tsx)
    const params = new URLSearchParams(window.location.search);
    const urlVenueTypes = params.get('venueTypes')?.split(',') || [];

    let currentFilteredVenues = initialVenues;

    // Apply sport filter (be resilient to null/undefined/non-array sports)
    if (sport) {
      currentFilteredVenues = currentFilteredVenues.filter((venue) => {
        const sportsArray = Array.isArray(venue.sports) ? venue.sports : [];
        const normalized = sportsArray.map((s) => String(s).toLowerCase());
        return normalized.includes(sport.toLowerCase());
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
    const activeFilters: FilterState = {
      venueTypes: urlVenueTypes
    };

    const newlyFiltered = applyFilters(currentFilteredVenues, activeFilters);
    
    setFilteredVenues(newlyFiltered);
    setVenues(newlyFiltered);
  }, [searchedVenueName, sport, initialVenues]);

  // Removed price parsing utilities

  

  const applyFilters = (venues: Venue[], filters: FilterState): Venue[] => {
    return venues.filter(venue => {
      // Venue type filter
      if (filters.venueTypes.length > 0) {
        const matchesVenueType = filters.venueTypes.some(type => {
          if (!venue.indoorOutdoor) return false;
          return venue.indoorOutdoor.toLowerCase() === type.toLowerCase();
        });
        if (!matchesVenueType) return false;
      }

      

      return true;
    });
  };

  const handleFiltersChange = (filters: FilterState) => {
    const filtered = applyFilters(allVenues, filters);
    setFilteredVenues(filtered);
    setVenues(filtered);
  };

  const handleSortedVenues = (sortedVenues: Venue[]) => {
    setVenues(sortedVenues);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <VenueFilters 
        currentSport={sport} 
        onFiltersChange={handleFiltersChange} 
      />
      
      <div className="flex-1">
        <div className="flex justify-between items-center mb-6">
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
          </div>

          <VenueSort venues={filteredVenues} onSortedVenues={handleSortedVenues} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
