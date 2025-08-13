"use client";

import Link from "next/link";
import { MapPin, Clock } from "lucide-react";
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
    <Link href={`/venues/${venue.id}`} className="group block">
      <article className="bg-white/5 backdrop-blur-sm rounded-xl overflow-hidden border border-white/10 hover:border-[#00d9ff]/50 hover:shadow-xl hover:shadow-[#00d9ff]/10 transition-all duration-300 hover:-translate-y-1">
        <div className="relative h-48 bg-[#0f2847]">
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
          {/* Hourly rate badge removed */}
          <div className="absolute bottom-3 left-3 bg-[#00d9ff]/90 text-[#0a1628] px-2 py-1 rounded text-xs font-bold">
            {venue.indoorOutdoor === "indoor" ? "Indoor" : venue.indoorOutdoor === "outdoor" ? "Outdoor" : "Indoor & Outdoor"}
          </div>
        </div>
        
        <div className="p-4">
          <h3 className="font-semibold text-lg mb-1 text-white group-hover:text-[#00d9ff] transition-colors">
            {venue.name}
          </h3>
          
          <div className="flex items-center gap-1 text-sm text-[#b8c5d6] mb-2">
            <MapPin className="h-4 w-4 text-[#00d9ff]" />
            <span>{venue.city}</span>
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
          
          <div className="flex items-center gap-3 text-sm mb-3">
            <div className="flex items-center gap-1 text-[#7a8b9a]">
              <Clock className="h-4 w-4" />
              <span>Open now</span>
            </div>
          </div>
          
          {/* Amenities badges intentionally removed from cards */}
          <div className="mt-4 flex gap-2">
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
