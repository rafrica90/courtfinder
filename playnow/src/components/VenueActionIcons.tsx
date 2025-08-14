"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Heart, Share2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";

interface VenueActionIconsProps {
  venueId: string;
  venueName: string;
}

export default function VenueActionIcons({ venueId, venueName }: VenueActionIconsProps) {
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Load current favorites if logged in
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user) return;
      const { data } = await api.favorites.list();
      if (mounted && data?.favorites) {
        setIsFavorite(data.favorites.includes(venueId));
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user, venueId]);

  const toggleFavorite = useCallback(async () => {
    if (!user || loading) return;
    setLoading(true);
    const { data } = await api.favorites.toggle(venueId);
    if (data?.favorites) setIsFavorite(data.favorites.includes(venueId));
    setLoading(false);
  }, [user, venueId, loading]);

  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/venues/${encodeURIComponent(venueId)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: venueName, text: `Check out ${venueName}`, url });
        return;
      }
    } catch {}
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }, [venueId, venueName]);

  return (
    <div className="flex items-center gap-2 mb-3">
      <button
        onClick={toggleFavorite}
        title={isFavorite ? "Remove from Favorites" : "Save to Favorites"}
        className={`p-3 bg-white/10 backdrop-blur-sm rounded-full border transition-colors ${
          isFavorite ? "border-[#00ff88] hover:bg-[#00ff88]/20" : "border-white/20 hover:bg-[#00d9ff]/10"
        }`}
        aria-pressed={isFavorite}
        disabled={!user || loading}
      >
        <Heart className={`h-5 w-5 ${isFavorite ? "text-[#00ff88]" : "text-white"}`} />
      </button>
      <button
        onClick={handleShare}
        title="Share"
        className="p-3 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 hover:bg-[#00d9ff]/10 transition-colors"
      >
        <Share2 className="h-5 w-5 text-white" />
      </button>
    </div>
  );
}


