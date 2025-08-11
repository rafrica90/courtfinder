"use client";

import Link from "next/link";
import { MapPin, Star, Clock, Users } from "lucide-react";
import { Venue } from "@/lib/types";
import { useMemo, useState } from "react";

interface VenueCardProps {
  venue: Venue;
}

export default function VenueCard({ venue }: VenueCardProps) {
  const candidateImages: string[] = useMemo(() => (
    [
      ...(Array.isArray(venue.imageUrls) ? venue.imageUrls : []),
      ...(Array.isArray((venue as any).image_urls) ? (venue as any).image_urls : []),
      ...(Array.isArray(venue.photos) ? venue.photos : []),
    ].filter((u) => typeof u === "string" && u.trim().length > 0)
  ), [venue]);

  const primarySport = (Array.isArray(venue.sports) && venue.sports[0]) || venue.sportId || "generic";
  const sportKey = String(primarySport).toLowerCase();
  const sportPlaceholders: Record<string, string> = {
    tennis: "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=800&q=60",
    pickleball: "https://images.unsplash.com/photo-1620594909782-4c45f8322c2c?auto=format&fit=crop&w=800&q=60",
    soccer: "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?auto=format&fit=crop&w=800&q=60",
  };
  const genericPlaceholder = "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=800&q=60";

  const initialRaw = candidateImages.length > 0 ? candidateImages[0] : (sportPlaceholders[sportKey] || genericPlaceholder);
  const isHttp = typeof initialRaw === "string" && /^(https?:)\/\//i.test(initialRaw);
  // Route unknown remote images via our proxy to avoid CORS and noisy network errors
  const initialSrc = isHttp ? `/api/image?url=${encodeURIComponent(initialRaw)}` : initialRaw;
  const [imgSrc, setImgSrc] = useState<string | undefined>(initialSrc);
  
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
                const fallbackRaw = sportPlaceholders[sportKey] || genericPlaceholder;
                setImgSrc(fallbackRaw);
              }}
            />
          ) : null}
          {(venue.priceEstimate || venue.priceEstimateText) && (
            <div className="absolute top-3 right-3 bg-[#00ff88] text-[#0a1628] px-3 py-1 rounded-full text-sm font-bold">
              {venue.priceEstimate ? `$${venue.priceEstimate}/hr` : venue.priceEstimateText}
            </div>
          )}
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
          
          <div className="flex items-center gap-3 text-sm mb-3">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-[#00ff88] text-[#00ff88]" />
              <span className="font-medium text-white">4.5</span>
              <span className="text-[#7a8b9a]">(127)</span>
            </div>
            <div className="flex items-center gap-1 text-[#7a8b9a]">
              <Clock className="h-4 w-4" />
              <span>Open now</span>
            </div>
          </div>
          
          {venue.amenities.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {venue.amenities.slice(0, 3).map((amenity, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-1 bg-white/10 rounded-full text-[#b8c5d6] border border-white/10"
                >
                  {amenity}
                </span>
              ))}
              {venue.amenities.length > 3 && (
                <span className="text-xs px-2 py-1 bg-white/10 rounded-full text-[#7a8b9a] border border-white/10">
                  +{venue.amenities.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}
