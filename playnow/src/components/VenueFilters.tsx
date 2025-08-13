"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { sports } from "@/lib/mockData";

interface VenueFiltersProps {
  currentSport?: string;
  onFiltersChange: (filters: FilterState) => void;
}

export interface FilterState {
  venueTypes: string[];
}

export default function VenueFilters({ currentSport, onFiltersChange }: VenueFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  const [filters, setFilters] = useState<FilterState>({
    venueTypes: []
  });

  // Initialize filters from URL params whenever the URL changes
  useEffect(() => {
    const urlVenueTypes = searchParams.get('venueTypes')?.split(',') || [];
    
    const initialFilters = {
      venueTypes: urlVenueTypes
    };
    
    setFilters(initialFilters);
    onFiltersChange(initialFilters);
  }, [searchParams]);

  const updateFilters = (newFilters: FilterState) => {
    setFilters(newFilters);
    onFiltersChange(newFilters);
    
    // Update URL params
    const params = new URLSearchParams(searchParams);
    
    if (newFilters.venueTypes.length > 0) {
      params.set('venueTypes', newFilters.venueTypes.join(','));
    } else {
      params.delete('venueTypes');
    }
    
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const buildQueryObject = (modify: (p: URLSearchParams) => void) => {
    const p = new URLSearchParams(searchParams);
    modify(p);
    return Object.fromEntries(p.entries());
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
              href={{ pathname: "/venues", query: buildQueryObject((p) => {
                p.delete("sport");
              }) }}
              className={`block px-3 py-2 rounded-lg transition-colors ${
                !currentSport ? "bg-[#00ff88] text-[#0a1628] font-semibold" : "text-[#b8c5d6] hover:bg-white/10"
              }`}
            >
              All Sports
            </Link>
            {sports.map((s) => (
              <Link
                key={s.id}
                href={{ pathname: "/venues", query: buildQueryObject((p) => {
                  p.set("sport", s.slug);
                }) }}
                className={`block px-3 py-2 rounded-lg transition-colors ${
                  currentSport === s.slug ? "bg-[#00ff88] text-[#0a1628] font-semibold" : "text-[#b8c5d6] hover:bg-white/10"
                }`}
              >
                {s.name}
              </Link>
            ))}
          </div>
        </div>

        {/* Price Range removed */}

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

        {/* Clear Filters */}
        {(filters.venueTypes.length > 0) && (
          <div className="mt-6 pt-6 border-t border-white/10">
            <button
              onClick={() => updateFilters({ venueTypes: [] })}
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
