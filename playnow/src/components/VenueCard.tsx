"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import { Venue } from "@/lib/types";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getStockImageForVenue, GENERIC_PLACEHOLDER } from "@/lib/sport-images";

interface VenueCardProps {
  venue: Venue;
}

export default function VenueCard({ venue }: VenueCardProps) {
  // Always use deterministic stock image per venue to avoid broken sources
  const candidateImages: string[] = useMemo(() => [getStockImageForVenue(venue)], [venue]);

  const stockImage = getStockImageForVenue(venue);
  const initialRaw = stockImage;
  const isHttp = typeof initialRaw === "string" && /^(https?:)\/\//i.test(initialRaw);
  // For well-known image CDNs use direct URL; route others via proxy. We proxy Pixabay to avoid hotlink issues.
  const isTrustedCdn = typeof initialRaw === "string" && /(images\.unsplash\.com|images\.pexels\.com)/i.test(initialRaw);
  // Route unknown remote images via our proxy to avoid CORS and noisy network errors
  const initialSrc = isHttp && !isTrustedCdn ? `/api/image?url=${encodeURIComponent(initialRaw)}` : initialRaw;
  const [imgSrc, setImgSrc] = useState<string | undefined>(initialSrc);
  const router = useRouter();

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
    <Link href={`/venues/${venue.id}`} className="group block h-full">
      <article className="bg-white/5 backdrop-blur-sm rounded-xl overflow-hidden border border-white/10 hover:border-[#00d9ff]/50 hover:shadow-xl hover:shadow-[#00d9ff]/10 transition-all duration-300 hover:-translate-y-1 h-full min-h-[420px] flex flex-col">
        <div className="relative w-full h-40 md:h-44 lg:h-48 bg-[#0f2847]">
          {imgSrc ? (
            <img
              src={imgSrc}
              alt={venue.name}
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
              onError={() => {
                const fallbackRaw = stockImage || GENERIC_PLACEHOLDER;
                setImgSrc(fallbackRaw);
              }}
            />
          ) : null}
          {/* Location overlay inside image to free space */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center gap-1 text-xs font-semibold bg-black/50 text-white px-2 py-1 rounded">
            <MapPin className="h-3 w-3 text-[#00d9ff]" />
            <span className="truncate">{locationText}</span>
          </div>
        </div>
        
        <div className="p-4 flex-1 flex flex-col">
          <h3 className="font-semibold text-lg mb-1 text-white group-hover:text-[#00d9ff] transition-colors">
            {displayName}
          </h3>
          
          {/* Indoor/Outdoor moved below image */}
          <div className="mb-2">
            <span className="inline-block bg-white/10 text-[#b8c5d6] border border-white/10 px-2 py-0.5 rounded text-xs font-medium">
              {venue.indoorOutdoor === "indoor" ? "Indoor" : venue.indoorOutdoor === "outdoor" ? "Outdoor" : "Indoor & Outdoor"}
            </span>
          </div>

          {/* Sports badges (multi-sport support) */}
          {(() => {
            const rawSports = Array.isArray(venue.sports) ? venue.sports : [];
            const fallback = !rawSports.length && venue.sportId ? [String(venue.sportId)] : [];
            const uniqueSports = Array.from(
              new Set(
                [...rawSports, ...fallback]
                  .filter(Boolean)
                  .map((s) => String(s).trim().toLowerCase())
              )
            );
            const toTitle = (s: string) =>
              s
                .replace(/[-_]+/g, " ")
                .replace(/\s+/g, " ")
                .trim()
                .replace(/\b\w/g, (c) => c.toUpperCase());
            return uniqueSports.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-3">
                {uniqueSports.map((sport) => (
                  <span
                    key={sport}
                    className="px-2 py-0.5 rounded text-xs font-medium bg-white/10 text-[#b8c5d6] border border-white/10"
                  >
                    {toTitle(sport)}
                  </span>
                ))}
              </div>
            ) : null;
          })()}
          
          {/* Operating hours removed as requested */}
          
          {/* Amenities badges intentionally removed from cards */}
          <div className="mt-auto pt-2 flex gap-2">
            <button
              onClick={handleBookNow}
              disabled={!venue.bookingUrl}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-colors shadow hover:shadow-[#00d9ff]/20 disabled:opacity-50 disabled:cursor-not-allowed bg-[#00d9ff] text-[#0a1628] hover:bg-[#00c0e6]"
            >
              Book now
            </button>
            <button
              onClick={handleCreateGame}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-colors border border-white/20 text-white hover:bg-white/10"
            >
              Create game
            </button>
          </div>
        </div>
      </article>
    </Link>
  );
}
