"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Venue } from "@/lib/types";
import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStockImageForVenue, GENERIC_PLACEHOLDER } from "@/lib/sport-images";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api-client";

interface VenueCardProps {
  venue: Venue;
}

export default function VenueCard({ venue }: VenueCardProps) {
  // Card now renders without a large image to align with join-screen list style
  // Keep index-friendly data (name/address) and an optional sport badge
  const showSportBadge = venue.sports && Array.isArray(venue.sports) && venue.sports.length > 0;
  const router = useRouter();
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [favLoading, setFavLoading] = useState<boolean>(false);

  // Compute display name without trailing bracketed suburb, e.g. "Ultimate Soccer (Fairfield)" → "Ultimate Soccer"
  const displayName = useMemo(() => {
    const raw = String(venue.name || "");
    return raw.replace(/\s*\([^)]*\)\s*$/g, "").trim();
  }, [venue.name]);

  // Derive a compact location string: "suburb, STATE, Country"
  const locationText = useMemo(() => {
    const rawCity = String(venue.city || "").trim();
    const rawState = String(venue.state || "").trim();
    const rawAddress = String(venue.address || "");

    const looksLikeStreet = /\d|\b(road|rd|street|st|ave|avenue|hwy|highway|drive|dr|lane|ln|boulevard|blvd|ct|court|pl|place|way|rd\.|st\.|dr\.)\b/i.test(rawCity);
    let suburb = !looksLikeStreet && rawCity ? rawCity : "";
    if (!suburb) {
      const parts = rawAddress.split(",").map((s) => s.trim()).filter(Boolean);
      if (parts.length >= 2) suburb = parts[parts.length - 2];
      else suburb = parts[0] || "";
    }

    let state = rawState;
    if (!state) {
      const stateMatch = (rawAddress.match(/\b(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\b/i) || [""])[0];
      state = stateMatch ? stateMatch.toUpperCase() : "";
    }

    const country = String(venue.country || "").trim();
    const parts = [suburb, state, country].filter(Boolean);
    return parts.join(", ");
  }, [venue.city, venue.state, venue.address, venue.country]);

  // Resolve a Google Maps link similar to the venue details page
  const mapsUrl = useMemo(() => {
    const v: any = venue as any;
    if (v?.place_id) {
      return `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(v.place_id)}`;
    }
    if (typeof v?.latitude === "number" && typeof v?.longitude === "number") {
      // Open a direct Maps entry for the coordinates, not a generic search
      return `https://www.google.com/maps/place/${v.latitude},${v.longitude}`;
    }
    const queryParts = [v?.name, v?.address, v?.city, v?.state, v?.country].filter(Boolean).join(" ");
    if (queryParts) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queryParts)}`;
    }
    return undefined;
  }, [venue]);

  // Load current favorite state (client-only side effect)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) return;
      try {
        const { data } = await api.favorites.list();
        const favs = Array.isArray(data?.favorites) ? data.favorites : [];
        if (!cancelled) setIsFavorite(favs.includes(venue.id));
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [user, venue.id]);

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || favLoading) return;
    setFavLoading(true);
    try {
      const { data } = await api.favorites.toggle(venue.id);
      if (data?.favorites) setIsFavorite(data.favorites.includes(venue.id));
    } finally {
      setFavLoading(false);
    }
  };

  // Hours/Capacity removed from cards

  const handleBookNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!venue.bookingUrl) return;
    const redirectUrl = `/api/clicks?venueId=${encodeURIComponent(venue.id)}&redirect=${encodeURIComponent(venue.bookingUrl)}`;
    window.open(redirectUrl, "_blank", "noopener,noreferrer");
  };

  const handleCreateGame = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const sport = Array.isArray(venue.sports) && venue.sports.length > 0
      ? String(venue.sports[0])
      : String(venue.sportId ?? "");
    const location = String(venue.city ?? "").toLowerCase();
    const url = `/games/new?venueId=${encodeURIComponent(venue.id)}${sport ? `&sport=${encodeURIComponent(sport)}` : ""}${location ? `&location=${encodeURIComponent(location)}` : ""}`;
    router.push(url);
  };
  
  

  return (
    <div className="group block h-full" onClick={() => router.push(`/venues/${venue.id}`)} style={{ cursor: 'pointer' }}>
      <article className="bg-white/5 backdrop-blur-sm rounded-xl overflow-hidden border border-white/10 hover:border-[#00d9ff]/50 hover:shadow-xl hover:shadow-[#00d9ff]/10 transition-all duration-300 h-full">
        <div className="p-4 md:p-6 flex-1 flex items-center justify-between">
          <div>
            <div className="text-white font-semibold text-lg">{displayName}</div>
            <div className="text-xs text-[#7a8b9a] mt-0.5">{venue.address}</div>
          </div>
          {showSportBadge && (
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-white text-black border border-white/10">
              {String(venue.sports![0]).replace(/[-_]+/g, " ")}
            </span>
          )}
        </div>
        <div className="px-4 pb-4 flex items-center gap-3">
          <button
            type="button"
            disabled={!venue.bookingUrl}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!venue.bookingUrl) return;
              const redirect = `/api/clicks?venueId=${encodeURIComponent(venue.id)}&redirect=${encodeURIComponent(venue.bookingUrl)}`;
              window.open(redirect, "_blank", "noopener,noreferrer");
            }}
            className={`px-3 py-1 rounded-md ${venue.bookingUrl ? 'bg-[#00d9ff] text-[#0a1628] font-semibold text-sm' : 'bg-white/10 text-white/60 border border-white/20 text-sm'}`}
            aria-label="Book venue"
          >
            Book now
          </button>
          { (mapsUrl) && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open(mapsUrl, "_blank", "noopener,noreferrer");
              }}
              aria-label="Open in Google Maps"
              className="p-1 rounded hover:bg-white/10"
            >
              <ExternalLink className="h-4 w-4 text-[#00d9ff]" />
            </button>
          )}
        </div>
      </article>
    </div>
  );
}
