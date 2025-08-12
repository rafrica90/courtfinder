"use client";

import Link from "next/link";
import { MapPin, Clock } from "lucide-react";
import { Venue } from "@/lib/types";
import { useMemo, useState } from "react";
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
  // For well-known image CDNs (Unsplash, Pixabay, Pexels) use direct URL to avoid proxy failures.
  const isTrustedCdn = typeof initialRaw === "string" && /(images\.unsplash\.com|cdn\.pixabay\.com|images\.pexels\.com)/i.test(initialRaw);
  // Route unknown remote images via our proxy to avoid CORS and noisy network errors
  const initialSrc = isHttp && !isTrustedCdn ? `/api/image?url=${encodeURIComponent(initialRaw)}` : initialRaw;
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
                const fallbackRaw = stockImage || GENERIC_PLACEHOLDER;
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
