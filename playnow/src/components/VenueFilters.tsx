"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Star, Volleyball, MapPin, ChevronDown, Building2 } from "lucide-react";
import { sports as allSports } from "@/lib/mockData";

interface VenueFiltersProps {
  currentSport?: string;
  onFiltersChange?: (filters: FilterState) => void;
  availableCountries: string[];
  availableStates: string[];
  availableSuburbs: string[];
}

export interface FilterState {
  sports: string[];
  favoritesOnly?: boolean;
  country?: string;
  state?: string;
  suburb?: string;
}

export default function VenueFilters({ currentSport, onFiltersChange, availableCountries, availableStates, availableSuburbs }: VenueFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [filters, setFilters] = useState<FilterState>({
    sports: [],
    favoritesOnly: false,
    country: undefined,
    state: undefined,
    suburb: undefined,
  });

  const sports = useMemo(() => allSports, []);

  // Initialize filters from URL params whenever the URL changes
  useEffect(() => {
    const favoritesOnly = searchParams.get('favorites') === '1';
    const sportsFromParam = searchParams.get('sports')?.split(',').filter(Boolean) || [];
    const legacySport = searchParams.get('sport') || currentSport || undefined;
    const mergedSports = Array.from(new Set([...(sportsFromParam || []), ...(legacySport ? [legacySport] : [])]));

    const country = searchParams.get('country') || undefined;
    const state = searchParams.get('state') || undefined;
    const suburb = searchParams.get('suburb') || undefined;

    const initialFilters: FilterState = {
      sports: mergedSports,
      favoritesOnly,
      country,
      state,
      suburb,
    };

    setFilters(initialFilters);
    if (onFiltersChange) onFiltersChange(initialFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, currentSport]);

  const updateFilters = (newFilters: FilterState) => {
    setFilters(newFilters);
    if (onFiltersChange) onFiltersChange(newFilters);

    // Update URL params
    const params = new URLSearchParams(searchParams);

    if (newFilters.favoritesOnly) {
      params.set('favorites', '1');
    } else {
      params.delete('favorites');
    }
    if (newFilters.sports.length > 0) {
      params.set('sports', newFilters.sports.join(','));
    } else {
      params.delete('sports');
    }
    params.delete('sport'); // remove legacy single-sport param

    if (newFilters.country) params.set('country', newFilters.country); else params.delete('country');
    if (newFilters.state) params.set('state', newFilters.state); else params.delete('state');
    if (newFilters.suburb) params.set('suburb', newFilters.suburb); else params.delete('suburb');

    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const toggleSport = (slug: string) => {
    const isSelected = filters.sports.includes(slug);
    const updated = isSelected ? filters.sports.filter(s => s !== slug) : [...filters.sports, slug];
    updateFilters({ ...filters, sports: updated });
  };

  // Venue type removed

  const handleFavoritesOnlyChange = (checked: boolean) => {
    updateFilters({ ...filters, favoritesOnly: checked });
  };

  const [open, setOpen] = useState<null | 'sports' | 'locations'>(null);

  const renderTagText = (items: string[], empty: string) => {
    if (items.length === 0) return empty;
    if (items.length === 1) return items[0];
    if (items.length === 2) return items.join(', ');
    return `${items[0]}, ${items[1]} +${items.length - 2}`;
  };

  const selectedSportLabels = filters.sports.map((s) => allSports.find((o) => o.slug === s)?.name || s);
  const selectedLocations = [filters.suburb, filters.state, filters.country].filter(Boolean) as string[];

  const [locationQuery, setLocationQuery] = useState<string>(selectedLocations[0] || '');
  const [showLocationSuggest, setShowLocationSuggest] = useState<boolean>(false);
  const inputWrapperRef = useRef<HTMLDivElement | null>(null);
  const [dropdownRect, setDropdownRect] = useState<{ left: number; top: number; width: number } | null>(null);
  const locationOptions = useMemo(() => {
    const opts: Array<{ label: string; kind: 'country' | 'state' | 'suburb' }> = [];
    for (const c of availableCountries) opts.push({ label: c, kind: 'country' });
    for (const s of availableStates) opts.push({ label: s, kind: 'state' });
    for (const s of availableSuburbs) opts.push({ label: s, kind: 'suburb' });
    return opts;
  }, [availableCountries, availableStates, availableSuburbs]);

  const matchedLocationOptions = useMemo(() => {
    const q = locationQuery.trim().toLowerCase();
    if (!q) return locationOptions.slice(0, 50);
    return locationOptions.filter((o) => o.label.toLowerCase().includes(q)).slice(0, 50);
  }, [locationQuery, locationOptions]);

  useEffect(() => {
    // keep input in sync with active filter
    const active = [filters.suburb, filters.state, filters.country].find(Boolean) || '';
    setLocationQuery(active);
  }, [filters.country, filters.state, filters.suburb]);

  // Keep dropdown aligned to input even when header is sticky or page scrolls
  useEffect(() => {
    const updatePosition = () => {
      const el = inputWrapperRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setDropdownRect({
        left: rect.left,
        top: rect.bottom + 8,
        width: rect.width,
      });
    };
    if (showLocationSuggest) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [showLocationSuggest]);

  return (
    <div className="bg-[#0a1628]/95 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 overflow-visible">
        <div className="min-w-max flex items-start gap-3">
          {/* Sports dropdown */}
          <div className="min-w-0" onKeyDown={(e)=>{ if(e.key==='Escape') setOpen(null); }}>
            <button
              type="button"
              onClick={() => setOpen((o) => (o === 'sports' ? null : 'sports'))}
              className="w-full h-10 px-3 rounded-md bg-white/5 border border-white/10 text-white flex items-center justify-between"
              aria-expanded={open === 'sports'}
            >
              <span className="flex items-center gap-2">
                <Volleyball className="h-4 w-4 text-[#00d9ff]" />
                <span className="truncate">{renderTagText(selectedSportLabels, 'All sports')}</span>
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${open === 'sports' ? 'rotate-180' : ''}`} />
            </button>
            {open === 'sports' && (
              <div className="absolute top-full left-0 z-50 mt-2 w-[calc(100%-1rem)] sm:w-auto bg-[#0e1a2b] border border-white/10 rounded-md shadow-lg max-h-64 overflow-auto p-2">
                {sports.map((opt) => {
                  const checked = filters.sports.includes(opt.slug);
                  return (
                    <label key={opt.slug} className="flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 rounded cursor-pointer text-white">
                      <input
                        type="checkbox"
                        className="accent-[#00d9ff]"
                        checked={checked}
                        onChange={(e) => toggleSport(opt.slug)}
                      />
                      <span>{opt.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Locations searchable field */}
          <div className="min-w-0 relative" ref={inputWrapperRef}>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MapPin className="h-4 w-4 text-[#00d9ff]" />
            </div>
            <input
              type="text"
              value={locationQuery}
              placeholder="All locations"
              onChange={(e) => { setLocationQuery(e.target.value); setShowLocationSuggest(true); }}
              onFocus={() => setShowLocationSuggest(true)}
              onBlur={() => setTimeout(()=> setShowLocationSuggest(false), 150)}
              className="w-full h-10 pl-9 pr-8 rounded-md bg-white/5 border border-white/10 text-white placeholder-[#7a8b9a]"
            />
            {(filters.country || filters.state || filters.suburb) && (
              <button
                aria-label="Clear location"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#7a8b9a] hover:text-white"
                onClick={() => { updateFilters({ ...filters, country: undefined, state: undefined, suburb: undefined }); setLocationQuery(''); }}
              >
                ×
              </button>
            )}
            {showLocationSuggest && matchedLocationOptions.length > 0 && dropdownRect && (
              <div
                className="absolute z-[1000] bg-[#0e1a2b] border border-white/10 rounded-md shadow-lg max-h-72 overflow-auto"
                style={{ left: 0, top: 'calc(100% + 8px)', width: dropdownRect.width }}
              >
                {matchedLocationOptions.map((opt) => (
                  <button
                    key={`${opt.kind}:${opt.label}`}
                    type="button"
                    onClick={() => {
                      const nf = { ...filters, country: undefined, state: undefined, suburb: undefined } as FilterState;
                      nf[opt.kind] = opt.label as any;
                      updateFilters(nf);
                      setLocationQuery(opt.label);
                      setShowLocationSuggest(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-white/5 text-white"
                  >
                    {opt.label}
                    <span className="ml-2 text-xs text-[#7a8b9a]">{opt.kind}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

        {/* Venue type removed */}

          {/* Favorites toggle */}
          <div className="min-w-0">
            <button
              onClick={() => handleFavoritesOnlyChange(!filters.favoritesOnly)}
              className={`w-full h-10 px-3 rounded-md border flex items-center justify-center gap-2 transition-colors ${filters.favoritesOnly ? 'bg-[#00ff88] text-[#0a1628] border-transparent' : 'bg-white/5 text-white border-white/10 hover:bg-white/10'}`}
            >
              <Star className="h-4 w-4" />
              <span className="text-sm">Favorites</span>
            </button>
          </div>

          {/* Clear link */}
          {(filters.sports.length > 0 || filters.favoritesOnly || filters.country || filters.state || filters.suburb) && (
            <div className="sm:col-span-5">
              <button
                onClick={() => updateFilters({ sports: [], favoritesOnly: false, country: undefined, state: undefined, suburb: undefined })}
                className="text-sm text-[#00d9ff] hover:text-[#00ff88]"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
