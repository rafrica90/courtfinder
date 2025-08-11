"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { sports } from "@/lib/mockData";

interface VenueFiltersProps {
  currentSport?: string;
  onFiltersChange: (filters: FilterState) => void;
}

export interface FilterState {
  priceRanges: string[];
  venueTypes: string[];
  amenities: string[];
}

export default function VenueFilters({ currentSport, onFiltersChange }: VenueFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [filters, setFilters] = useState<FilterState>({
    priceRanges: [],
    venueTypes: [],
    amenities: []
  });

  // Initialize filters from URL params whenever the URL changes
  useEffect(() => {
    const urlPriceRanges = searchParams.get('priceRanges')?.split(',') || [];
    const urlVenueTypes = searchParams.get('venueTypes')?.split(',') || [];
    const urlAmenities = searchParams.get('amenities')?.split(',') || [];
    
    const initialFilters = {
      priceRanges: urlPriceRanges,
      venueTypes: urlVenueTypes,
      amenities: urlAmenities
    };
    
    setFilters(initialFilters);
    onFiltersChange(initialFilters);
  }, [searchParams]);

  const updateFilters = (newFilters: FilterState) => {
    setFilters(newFilters);
    onFiltersChange(newFilters);
    
    // Update URL params
    const params = new URLSearchParams(searchParams);
    
    if (newFilters.priceRanges.length > 0) {
      params.set('priceRanges', newFilters.priceRanges.join(','));
    } else {
      params.delete('priceRanges');
    }
    
    if (newFilters.venueTypes.length > 0) {
      params.set('venueTypes', newFilters.venueTypes.join(','));
    } else {
      params.delete('venueTypes');
    }
    
    if (newFilters.amenities.length > 0) {
      params.set('amenities', newFilters.amenities.join(','));
    } else {
      params.delete('amenities');
    }
    
    router.push(`/venues?${params.toString()}`, { scroll: false });
  };

  const handlePriceRangeChange = (priceRange: string, checked: boolean) => {
    const newPriceRanges = checked 
      ? [...filters.priceRanges, priceRange]
      : filters.priceRanges.filter(p => p !== priceRange);
    
    updateFilters({
      ...filters,
      priceRanges: newPriceRanges
    });
  };

  const handleVenueTypeChange = (venueType: string, checked: boolean) => {
    const newVenueTypes = checked 
      ? [...filters.venueTypes, venueType]
      : filters.venueTypes.filter(v => v !== venueType);
    
    updateFilters({
      ...filters,
      venueTypes: newVenueTypes
    });
  };

  const handleAmenityChange = (amenity: string, checked: boolean) => {
    const newAmenities = checked 
      ? [...filters.amenities, amenity]
      : filters.amenities.filter(a => a !== amenity);
    
    updateFilters({
      ...filters,
      amenities: newAmenities
    });
  };

  return (
    <aside className="lg:w-64 shrink-0">
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 sticky top-32">
        <div className="flex items-center gap-2 mb-6">
          <SlidersHorizontal className="h-5 w-5 text-[#00d9ff]" />
          <h3 className="font-semibold text-lg text-white">Filters</h3>
        </div>

        {/* Sport Filter */}
        <div className="mb-6">
          <h4 className="font-medium mb-3 text-[#00d9ff]">Sport</h4>
          <div className="space-y-2">
            <Link
              href="/venues"
              className={`block px-3 py-2 rounded-lg transition-colors ${
                !currentSport ? "bg-[#00ff88] text-[#0a1628] font-semibold" : "text-[#b8c5d6] hover:bg-white/10"
              }`}
            >
              All Sports
            </Link>
            {sports.map((s) => (
              <Link
                key={s.id}
                href={`/venues?sport=${s.slug}`}
                className={`block px-3 py-2 rounded-lg transition-colors ${
                  currentSport === s.slug ? "bg-[#00ff88] text-[#0a1628] font-semibold" : "text-[#b8c5d6] hover:bg-white/10"
                }`}
              >
                {s.name}
              </Link>
            ))}
          </div>
        </div>

        {/* Price Range */}
        <div className="mb-6">
          <h4 className="font-medium mb-3 text-[#00d9ff]">Price Range</h4>
          <div className="space-y-2">
            {[
              { value: "under-25", label: "Under $25/hr" },
              { value: "25-50", label: "$25 - $50/hr" },
              { value: "50-100", label: "$50 - $100/hr" },
              { value: "over-100", label: "Over $100/hr" }
            ].map((range) => (
              <label key={range.value} className="flex items-center gap-2 text-[#b8c5d6] hover:text-white cursor-pointer">
                <input 
                  type="checkbox" 
                  className="rounded bg-white/10 border-white/20 text-[#00ff88] focus:ring-[#00d9ff]" 
                  checked={filters.priceRanges.includes(range.value)}
                  onChange={(e) => handlePriceRangeChange(range.value, e.target.checked)}
                />
                <span className="text-sm">{range.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Indoor/Outdoor */}
        <div className="mb-6">
          <h4 className="font-medium mb-3 text-[#00d9ff]">Venue Type</h4>
          <div className="space-y-2">
            {[
              { value: "indoor", label: "Indoor" },
              { value: "outdoor", label: "Outdoor" },
              { value: "both", label: "Both" }
            ].map((type) => (
              <label key={type.value} className="flex items-center gap-2 text-[#b8c5d6] hover:text-white cursor-pointer">
                <input 
                  type="checkbox" 
                  className="rounded bg-white/10 border-white/20 text-[#00ff88] focus:ring-[#00d9ff]" 
                  checked={filters.venueTypes.includes(type.value)}
                  onChange={(e) => handleVenueTypeChange(type.value, e.target.checked)}
                />
                <span className="text-sm">{type.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Amenities */}
        <div>
          <h4 className="font-medium mb-3 text-[#00d9ff]">Amenities</h4>
          <div className="space-y-2">
            {[
              { value: "parking", label: "Parking" },
              { value: "locker-room", label: "Locker Room" },
              { value: "lights", label: "Lights" },
              { value: "pro-shop", label: "Pro Shop" },
              { value: "cafe", label: "Cafe" },
              { value: "changerooms", label: "Changerooms" }
            ].map((amenity) => (
              <label key={amenity.value} className="flex items-center gap-2 text-[#b8c5d6] hover:text-white cursor-pointer">
                <input 
                  type="checkbox" 
                  className="rounded bg-white/10 border-white/20 text-[#00ff88] focus:ring-[#00d9ff]" 
                  checked={filters.amenities.includes(amenity.value)}
                  onChange={(e) => handleAmenityChange(amenity.value, e.target.checked)}
                />
                <span className="text-sm">{amenity.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Clear Filters */}
        {(filters.priceRanges.length > 0 || filters.venueTypes.length > 0 || filters.amenities.length > 0) && (
          <div className="mt-6 pt-6 border-t border-white/10">
            <button
              onClick={() => updateFilters({ priceRanges: [], venueTypes: [], amenities: [] })}
              className="w-full px-4 py-2 text-sm text-[#00d9ff] hover:text-[#00ff88] transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
