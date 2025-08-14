 'use client';

 import { useEffect, useMemo, useRef, useState } from 'react';
 import { Calendar, MapPin, Volleyball, ChevronDown, Building2, Star } from 'lucide-react';
 import { sports as allSports } from '@/lib/mockData';

 export type GamesFilters = {
   sort?: 'distance' | 'name-az' | 'name-za';
   sports: string[];
   locations: string[];
   venueTypes?: string[]; // 'indoor' | 'outdoor'
   favoritesOnly?: boolean;
   date?: 'today' | 'tomorrow' | 'weekend' | 'any' | 'on';
   onDate?: string; // YYYY-MM-DD
 };

 interface GamesFilterBarProps {
   availableLocations?: string[];
   initialFilters?: GamesFilters;
   onChange: (filters: GamesFilters) => void;
 }

 export default function GamesFilterBar({ availableLocations = [], initialFilters, onChange }: GamesFilterBarProps) {
   const [sort, setSort] = useState<GamesFilters['sort']>(initialFilters?.sort || 'distance');
   const [sports, setSports] = useState<string[]>(initialFilters?.sports || []);
   const [locations, setLocations] = useState<string[]>(initialFilters?.locations || []);
   const [venueTypes, setVenueTypes] = useState<string[]>(initialFilters?.venueTypes || []);
   const [favoritesOnly, setFavoritesOnly] = useState<boolean>(!!initialFilters?.favoritesOnly);
   const [date, setDate] = useState<GamesFilters['date']>(initialFilters?.date || 'any');
   const [onDate, setOnDate] = useState<string>(initialFilters?.onDate || '');
   const [open, setOpen] = useState<'sports' | 'locations' | 'date' | 'types' | null>(null);

   const sportsRef = useRef<HTMLDivElement | null>(null);
   const locationsRef = useRef<HTMLDivElement | null>(null);

   useEffect(() => {
     onChange({ sort, sports, locations, venueTypes, favoritesOnly, date, onDate: date === 'on' ? onDate : undefined });
   }, [sort, sports, locations, venueTypes, favoritesOnly, date, onDate, onChange]);

   useEffect(() => {
     const onKey = (e: KeyboardEvent) => {
       if (e.key === 'Escape') setOpen(null);
     };
     const onClick = (e: MouseEvent) => {
       const t = e.target as Node;
       if (!sportsRef.current?.contains(t) && !locationsRef.current?.contains(t)) {
         setOpen(null);
       }
     };
     document.addEventListener('keydown', onKey);
     document.addEventListener('click', onClick);
     return () => {
       document.removeEventListener('keydown', onKey);
       document.removeEventListener('click', onClick);
     };
   }, []);

   const sportOptions = useMemo(() => allSports.map((s) => ({ value: s.slug, label: s.name })), []);

   const renderTagText = (items: string[], empty: string) => {
     if (items.length === 0) return empty;
     if (items.length === 1) return items[0];
     if (items.length === 2) return items.join(', ');
     return `${items[0]}, ${items[1]} +${items.length - 2}`;
   };

   const dateLabel = useMemo(() => {
     if (date === 'on' && onDate) {
       try {
         const d = new Date(onDate + 'T00:00:00');
         return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
       } catch {}
     }
     switch (date) {
       case 'today':
         return 'Today';
       case 'tomorrow':
         return 'Tomorrow';
       case 'weekend':
         return 'This Weekend';
       default:
         return 'Any date';
     }
   }, [date, onDate]);

   return (
      <div className="bg-[#0a1628]/95 backdrop-blur-md border-b border-white/10 sticky top-16 z-40">
       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
            {/* Sort */}
            <div className="min-w-0">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as GamesFilters['sort'])}
                className="w-full h-10 px-3 rounded-md bg-white/5 border border-white/10 text-white"
              >
                <option value="distance">Distance: Nearest</option>
                <option value="name-az">Name: A to Z</option>
                <option value="name-za">Name: Z to A</option>
              </select>
            </div>
           {/* Sports dropdown */}
           <div className="min-w-0" ref={sportsRef}>
             <button
               type="button"
               onClick={() => setOpen((o) => (o === 'sports' ? null : 'sports'))}
               className="w-full h-10 px-3 rounded-md bg-white/5 border border-white/10 text-white flex items-center justify-between"
               aria-expanded={open === 'sports'}
             >
               <span className="flex items-center gap-2">
                 <Volleyball className="h-4 w-4 text-[#00d9ff]" />
                 <span className="truncate">{renderTagText(sports.map((s) => sportOptions.find((o) => o.value === s)?.label || s), 'All sports')}</span>
               </span>
               <ChevronDown className={`h-4 w-4 transition-transform ${open === 'sports' ? 'rotate-180' : ''}`} />
             </button>
             {open === 'sports' && (
               <div className="absolute z-50 mt-2 w-full bg-[#0e1a2b] border border-white/10 rounded-md shadow-lg max-h-64 overflow-auto p-2">
                 {sportOptions.map((opt) => {
                   const checked = sports.includes(opt.value);
                   return (
                     <label key={opt.value} className="flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 rounded cursor-pointer text-white">
                       <input
                         type="checkbox"
                         className="accent-[#00d9ff]"
                         checked={checked}
                         onChange={(e) => {
                           setSports((prev) => (e.target.checked ? [...prev, opt.value] : prev.filter((v) => v !== opt.value)));
                         }}
                       />
                       <span>{opt.label}</span>
                     </label>
                   );
                 })}
               </div>
             )}
           </div>

            {/* Locations searchable input */}
            <div className="min-w-0 relative" ref={locationsRef}>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MapPin className="h-4 w-4 text-[#00d9ff]" />
              </div>
              <input
                type="text"
                value={locations[0] || ''}
                placeholder="All locations"
                onChange={(e) => {
                  const val = e.target.value;
                  setLocations(val ? [val] : []);
                }}
                onFocus={() => setOpen('locations')}
                onBlur={() => setTimeout(() => setOpen(null), 150)}
                className="w-full h-10 pl-9 pr-8 rounded-md bg-white/5 border border-white/10 text-white placeholder-[#7a8b9a]"
              />
              {(locations[0]) && (
                <button
                  aria-label="Clear location"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#7a8b9a] hover:text-white"
                  onClick={() => setLocations([])}
                >
                  ×
                </button>
              )}
              {open === 'locations' && (
                <div className="absolute z-50 mt-2 w-full bg-[#0e1a2b] border border-white/10 rounded-md shadow-lg max-h-64 overflow-auto">
                  {availableLocations
                    .filter((city) => city.toLowerCase().includes((locations[0] || '').toLowerCase()))
                    .slice(0, 50)
                    .map((city) => (
                      <button
                        key={city}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-white/5 text-white"
                        onClick={() => {
                          setLocations([city]);
                          setOpen(null);
                        }}
                      >
                        {city}
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* Venue Type dropdown */}
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => setOpen((o) => (o === 'types' ? null : 'types'))}
                className="w-full h-10 px-3 rounded-md bg-white/5 border border-white/10 text-white flex items-center justify-between"
                aria-expanded={open === 'types'}
              >
                <span className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[#00d9ff]" />
                  <span className="truncate">{renderTagText(venueTypes.map((t)=> t[0].toUpperCase()+t.slice(1)), 'Venue type')}</span>
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${open === 'types' ? 'rotate-180' : ''}`} />
              </button>
              {open === 'types' && (
                <div className="absolute z-50 mt-2 w-full bg-[#0e1a2b] border border-white/10 rounded-md shadow-lg max-h-64 overflow-auto p-2">
                  {[
                    { value: 'indoor', label: 'Indoor' },
                    { value: 'outdoor', label: 'Outdoor' },
                  ].map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 rounded cursor-pointer text-white">
                      <input
                        type="checkbox"
                        className="accent-[#00d9ff]"
                        checked={venueTypes.includes(opt.value)}
                        onChange={(e) => setVenueTypes((prev) => (e.target.checked ? [...prev, opt.value] : prev.filter((v) => v !== opt.value)))}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Favorites toggle */}
            <div className="min-w-0">
              <button
                onClick={() => setFavoritesOnly((v)=> !v)}
                className={`w-full h-10 px-3 rounded-md border flex items-center justify-center gap-2 transition-colors ${favoritesOnly ? 'bg-[#00ff88] text-[#0a1628] border-transparent' : 'bg-white/5 text-white border-white/10 hover:bg-white/10'}`}
              >
                <Star className="h-4 w-4" />
                <span className="text-sm">Favorites</span>
              </button>
            </div>

            {/* Date dropdown */}
           <div className="min-w-0" onKeyDown={(e) => e.key === 'Enter' && setOpen(open === 'date' ? null : 'date')}>
             <button
               type="button"
               onClick={() => setOpen((o) => (o === 'date' ? null : 'date'))}
               className="w-full h-10 px-3 rounded-md bg-white/5 border border-white/10 text-white flex items-center justify-between"
               aria-expanded={open === 'date'}
             >
               <span className="flex items-center gap-2">
                 <Calendar className="h-4 w-4 text-[#00d9ff]" />
                 <span className="truncate">{dateLabel}</span>
               </span>
               <ChevronDown className={`h-4 w-4 transition-transform ${open === 'date' ? 'rotate-180' : ''}`} />
             </button>
             {open === 'date' && (
               <div className="absolute z-50 mt-2 w-full bg-[#0e1a2b] border border-white/10 rounded-md shadow-lg p-2">
                 <div className="grid gap-1 text-white">
                   <button className={`text-left px-2 py-1.5 rounded hover:bg-white/5 ${date==='any' ? 'bg-white/5' : ''}`} onClick={() => { setDate('any'); setOnDate(''); }}>
                     Any date
                   </button>
                   <button className={`text-left px-2 py-1.5 rounded hover:bg-white/5 ${date==='today' ? 'bg-white/5' : ''}`} onClick={() => { setDate('today'); setOnDate(''); }}>
                     Today
                   </button>
                   <button className={`text-left px-2 py-1.5 rounded hover:bg-white/5 ${date==='tomorrow' ? 'bg-white/5' : ''}`} onClick={() => { setDate('tomorrow'); setOnDate(''); }}>
                     Tomorrow
                   </button>
                   <button className={`text-left px-2 py-1.5 rounded hover:bg-white/5 ${date==='weekend' ? 'bg-white/5' : ''}`} onClick={() => { setDate('weekend'); setOnDate(''); }}>
                     This Weekend
                   </button>
                   <div className="px-2 pt-1">
                     <label className="text-xs text-[#7a8b9a]">Choose date</label>
                     <input
                       type="date"
                       value={onDate}
                       onChange={(e) => { setOnDate(e.target.value); setDate('on'); }}
                       className="mt-1 w-full h-9 px-2 rounded-md bg-white/5 border border-white/10 text-white"
                     />
                   </div>
                 </div>
               </div>
             )}
           </div>
         </div>
       </div>
     </div>
   );
 }


