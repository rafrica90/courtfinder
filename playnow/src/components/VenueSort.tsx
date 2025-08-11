"use client";

import { useState } from "react";

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
}

export default function VenueSort({ venues, onSortedVenues }: VenueSortProps) {
  const [sortBy, setSortBy] = useState<string>("recommended");

  const extractPriceFromText = (text?: string): number => {
    if (!text) return 0;
    // Extract first number from price text like "$30/hr" or "$25-35/hr"
    const match = text.match(/\$?(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
  };

  const sortVenues = (venues: Venue[], sortType: string): Venue[] => {
    const sorted = [...venues];
    
    switch (sortType) {
      case "price-low-high":
        return sorted.sort((a, b) => {
          const priceA = a.priceEstimate || extractPriceFromText(a.priceEstimateText);
          const priceB = b.priceEstimate || extractPriceFromText(b.priceEstimateText);
          return priceA - priceB;
        });
      
      case "price-high-low":
        return sorted.sort((a, b) => {
          const priceA = a.priceEstimate || extractPriceFromText(a.priceEstimateText);
          const priceB = b.priceEstimate || extractPriceFromText(b.priceEstimateText);
          return priceB - priceA;
        });
      
      case "name-az":
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      
      case "name-za":
        return sorted.sort((a, b) => b.name.localeCompare(a.name));
      
      case "distance":
        // For now, just sort by name since we don't have user location
        // TODO: Implement geolocation-based sorting
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      
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
  };

  return (
    <select 
      value={sortBy}
      onChange={(e) => handleSortChange(e.target.value)}
      className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff] backdrop-blur-sm"
    >
      <option value="recommended">Sort by: Recommended</option>
      <option value="price-low-high">Price: Low to High</option>
      <option value="price-high-low">Price: High to Low</option>
      <option value="name-az">Name: A to Z</option>
      <option value="name-za">Name: Z to A</option>
      <option value="distance">Distance: Nearest</option>
    </select>
  );
}
