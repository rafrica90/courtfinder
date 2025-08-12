"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Calendar, Users, Search } from "lucide-react";
import { sports as availableSports } from "@/lib/mockData";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

interface SearchBarProps {
  variant?: "hero" | "compact";
}

export default function SearchBar({ variant = "hero" }: SearchBarProps) {
  const router = useRouter();
  const [venueName, setVenueName] = useState("");
  const [sport, setSport] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [players, setPlayers] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Load venues and derive available cities just like the Host Game page
  const [allVenues, setAllVenues] = useState<any[]>([]);
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        if (supabase) {
          try {
            const { data, error } = await supabase
              .from("venues")
              .select("*")
              .limit(1000);
            if (!error && data && data.length > 0 && isMounted) {
              setAllVenues(data);
              return;
            }
          } catch {}
        }

        if (isMounted) {
          const { venues } = await import("@/lib/mockData");
          setAllVenues(venues as any[]);
        }
      } catch {
        if (isMounted) {
          try {
            const { venues } = await import("@/lib/mockData");
            setAllVenues(venues as any[]);
          } catch {
            setAllVenues([]);
          }
        }
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const availableCities = useMemo(() => {
    const cities = new Set<string>();
    allVenues.forEach((v: any) => {
      if (v.city) cities.add(String(v.city));
    });
    return Array.from(cities).sort();
  }, [allVenues]);

  // Generate venue name suggestions based on input
  useEffect(() => {
    if (venueName.length > 0) {
      const query = venueName.toLowerCase();
      const matches = allVenues
        .filter((v: any) => v.name?.toLowerCase().includes(query))
        .map((v: any) => v.name)
        .slice(0, 5); // Show top 5 suggestions
      setSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [venueName, allVenues]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (venueName) params.set("venueName", venueName);
    if (sport) params.set("sport", sport);
    if (location) params.set("location", location);
    if (date) params.set("date", date);
    if (players) params.set("players", players);
    router.push(`/venues?${params.toString()}`);
  };

  if (variant === "compact") {
    return (
      <form onSubmit={handleSearch} className="flex gap-2 p-4 bg-white/5 backdrop-blur-sm rounded-lg shadow-sm border border-white/10">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-[#00d9ff]" />
          </div>
          <input
            type="text"
            placeholder="Search venue name..."
            value={venueName}
            onChange={(e) => setVenueName(e.target.value)}
            onFocus={() => venueName && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            className="w-full pl-10 pr-3 py-2 bg-white/10 border border-white/20 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00d9ff] focus:border-transparent text-white placeholder-gray-400"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-50 top-full mt-1 w-full bg-[#1a2c4a] border border-white/20 rounded-md shadow-lg max-h-60 overflow-auto">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    setVenueName(suggestion);
                    setShowSuggestions(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-white/10 text-white transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
        <select
          value={sport}
          onChange={(e) => setSport(e.target.value)}
          className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00d9ff] focus:border-transparent text-white"
        >
          <option value="">All sports</option>
          {availableSports.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00d9ff] focus:border-transparent text-white"
        >
          <option value="">All locations</option>
          {availableCities.map((city) => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>
        <button
          type="submit"
          className="px-6 py-2 bg-[#00d9ff] text-[#0a1628] rounded-md hover:bg-[#00a8cc] transition-colors font-semibold"
        >
          Search
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSearch} className="w-full max-w-md mx-auto">
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl shadow-2xl p-6 border border-white/20">
        <div className="space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-[#00d9ff]" />
            </div>
            <select
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              className="w-full pl-10 pr-3 py-4 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#00d9ff] focus:bg-white/10 transition-colors text-white"
            >
              <option value="">All sports</option>
              {availableSports.map((s) => (
                <option key={s.slug} value={s.slug}>{s.name}</option>
              ))}
            </select>
          </div>
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MapPin className="h-5 w-5 text-[#00d9ff]" />
            </div>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full pl-10 pr-3 py-4 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#00d9ff] focus:bg-white/10 transition-colors text-white"
            >
              <option value="">All locations</option>
              {availableCities.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-5 w-5 text-[#00d9ff]" />
            </div>
            <input
              type="date"
              placeholder="Date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full pl-10 pr-3 py-4 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#00d9ff] focus:bg-white/10 transition-colors text-white placeholder-[#7a8b9a]"
            />
          </div>
          
          <button
            type="submit"
            className="w-full px-6 py-4 bg-[#00ff88] text-[#0a1628] rounded-xl hover:bg-[#00cc6a] transition-all transform hover:scale-[1.02] font-bold shadow-lg hover:shadow-[#00ff88]/30 mt-2"
          >
            Find Venues
          </button>
        </div>
      </div>
    </form>
  );
}
