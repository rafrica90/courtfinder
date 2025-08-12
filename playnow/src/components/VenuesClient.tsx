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
  priceEstimate?: number;
  priceEstimateText?: string;
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

  const extractPriceFromText = (text?: string): number => {
    if (!text) return 0;
    // Extract first number from price text like "$30/hr" or "$25-35/hr"
    const match = text.match(/\$?(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
  };

  const matchesAmenity = (venueAmenities: string[], filterAmenity: string): boolean => {
    const amenityMap: { [key: string]: string[] } = {
      'parking': ['parking', 'car park', 'free parking'],
      'locker-room': ['locker room', 'lockers', 'changerooms', 'changing rooms'],
      'lights': ['lights', 'lighting', 'floodlights', 'led', 'lit'],
      'pro-shop': ['pro shop', 'shop', 'retail', 'equipment'],
      'cafe': ['cafe', 'restaurant', 'food', 'bar', 'dining'],
      'changerooms': ['changerooms', 'changing rooms', 'locker room', 'facilities']
    };

    const searchTerms = amenityMap[filterAmenity] || [filterAmenity];
    const amenitiesText = venueAmenities.join(' ').toLowerCase();
    
    return searchTerms.some(term => amenitiesText.includes(term.toLowerCase()));
  };

  const applyFilters = (venues: Venue[], filters: FilterState): Venue[] => {
    return venues.filter(venue => {
      // Price range filter
      if (filters.priceRanges.length > 0) {
        const price = venue.priceEstimate || extractPriceFromText(venue.priceEstimateText);
        const matchesPriceRange = filters.priceRanges.some(range => {
          switch (range) {
            case 'under-25': return price < 25;
            case '25-50': return price >= 25 && price <= 50;
            case '50-100': return price >= 50 && price <= 100;
            case 'over-100': return price > 100;
            default: return true;
          }
        });
        if (!matchesPriceRange) return false;
      }

      // Venue type filter
      if (filters.venueTypes.length > 0) {
        const matchesVenueType = filters.venueTypes.some(type => {
          if (!venue.indoorOutdoor) return false;
          return venue.indoorOutdoor.toLowerCase() === type.toLowerCase();
        });
        if (!matchesVenueType) return false;
      }

      // Amenities filter
      if (filters.amenities.length > 0) {
        const matchesAmenities = filters.amenities.every(amenity => 
          matchesAmenity(venue.amenities, amenity)
        );
        if (!matchesAmenities) return false;
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
