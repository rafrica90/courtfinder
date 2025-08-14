"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Heart, Share2, AlertCircle } from "lucide-react";
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
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);
  const [reportMessage, setReportMessage] = useState<string>("");
  const [reportCategory, setReportCategory] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitResult, setSubmitResult] = useState<string>("");

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

  const openReport = useCallback(() => {
    if (!user) return; // disabled by button state when no user
    setIsReportOpen(true);
    setSubmitResult("");
  }, [user]);

  const submitReport = useCallback(async () => {
    if (!user || submitting) return;
    const message = reportMessage.trim();
    if (message.length < 5) {
      setSubmitResult("Please describe the issue (min 5 chars).");
      return;
    }
    setSubmitting(true);
    const pageUrl = typeof window !== 'undefined' ? window.location.href : null;
    const { error } = await api.reports.submit({
      venueId,
      message,
      category: reportCategory || null,
      pageUrl,
    });
    if (error) {
      setSubmitResult(error);
    } else {
      setSubmitResult("Thanks! Your report was submitted.");
      setReportMessage("");
      setReportCategory("");
      setTimeout(() => setIsReportOpen(false), 900);
    }
    setSubmitting(false);
  }, [user, submitting, reportMessage, reportCategory, venueId]);

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
      <button
        onClick={openReport}
        title={user ? "Report an Issue" : "Sign in to report"}
        className="p-3 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 hover:bg-orange-400/10 transition-colors"
        disabled={!user}
      >
        <AlertCircle className="h-5 w-5 text-white" />
      </button>

      {isReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setIsReportOpen(false)} />
          <div className="relative w-full max-w-lg bg-[#0f1c33] text-white border border-white/10 rounded-xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Report an issue</h3>
              <button className="text-[#7a8b9a] hover:text-white" onClick={() => setIsReportOpen(false)}>✕</button>
            </div>
            <div className="grid gap-3">
              <div>
                <label className="block mb-1 text-sm text-[#b8c5d6]">Category (optional)</label>
                <select
                  className="w-full bg-white/5 border border-white/10 rounded-md p-2 text-sm"
                  value={reportCategory}
                  onChange={(e) => setReportCategory(e.target.value)}
                >
                  <option value="">Choose…</option>
                  <option value="Booking link">Booking link</option>
                  <option value="Venue info">Venue info</option>
                  <option value="Images">Images</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block mb-1 text-sm text-[#b8c5d6]">Describe the issue</label>
                <textarea
                  className="w-full min-h-[120px] bg-white/5 border border-white/10 rounded-md p-3 text-sm"
                  placeholder={`What’s wrong with ${venueName}?`}
                  value={reportMessage}
                  onChange={(e) => setReportMessage(e.target.value)}
                  maxLength={4000}
                />
              </div>
              {submitResult && <p className="text-sm {submitResult.startsWith('Thanks') ? 'text-[#00ff88]' : 'text-orange-300'}">{submitResult}</p>}
              <div className="flex justify-end gap-2">
                <button
                  className="px-4 py-2 bg-white/10 border border-white/10 rounded-md text-sm"
                  onClick={() => setIsReportOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-[#00ff88] text-[#0a1628] rounded-md text-sm font-semibold disabled:opacity-60"
                  onClick={submitReport}
                  disabled={submitting}
                >
                  {submitting ? 'Submitting…' : 'Submit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


