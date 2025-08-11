import VenuesClient from "@/components/VenuesClient";
import SearchBar from "@/components/SearchBar";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export default async function VenuesPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const sp = searchParams ? await searchParams : undefined;
  const sport = typeof sp?.sport === "string" ? sp?.sport : undefined;
  const location = typeof sp?.location === "string" ? sp?.location : undefined;

  const supabase = getSupabaseServiceClient();
  let filtered: any[] = [];
  if (supabase) {
    // Prefer DB data via RPC, with fallback to direct table read
    const { data, error } = await supabase
      .rpc("search_venues", {
        search_query: location ?? null,
        sport_filter: sport ? [sport] : null,
        indoor_outdoor_filter: null,
        // Pass location directly to the city filter as well for precise matching
        city_filter: location ?? null,
      });
    if (error || !data || data.length === 0) {
      const { data: allVenues } = await supabase.from("venues").select("*");
      const normalize = (val: unknown): string => {
        if (typeof val === "string") return val.toLowerCase();
        if (val === null || val === undefined) return "";
        try { return String(val).toLowerCase(); } catch { return ""; }
      };
      // First try exact city match (case-insensitive); if none match, fall back to broad text match
      const bySearch = typeof location === "string" && location.length > 0
        ? (allVenues ?? []).filter((v: any) => {
            const q = location.toLowerCase();
            // Prefer city equality / inclusion first
            if (normalize(v.city) === q) return true;
            return (
              normalize(v.name).includes(q) ||
              normalize(v.address).includes(q) ||
              normalize(v.city).includes(q) ||
              normalize(v.notes).includes(q)
            );
          })
        : (allVenues ?? []);
      filtered = typeof sport === "string" && sport.length > 0
        ? bySearch.filter((v: any) => Array.isArray(v.sports) && v.sports.includes(sport))
        : bySearch;
    } else {
      filtered = data;
    }
  } else {
    // Fallback to mock data in dev without env
    const { venues } = await import("@/lib/mockData");
    filtered = sport ? venues.filter((v: any) => v.sportId === sport) : venues;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0f2847] to-[#1a3a5c]">
      {/* Search Header */}
      <div className="bg-[#0a1628]/95 backdrop-blur-md border-b border-white/10 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <SearchBar variant="compact" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <VenuesClient 
          initialVenues={filtered.map((venue) => ({
            id: venue.id,
            name: venue.name,
            sportId: venue.sport_id,
            sports: venue.sports,
            address: venue.address,
            city: venue.city,
            latitude: venue.latitude,
            longitude: venue.longitude,
            amenities: venue.amenities || [],
            priceEstimate: venue.price_estimate ?? undefined,
            priceEstimateText: venue.price_estimate_text ?? undefined,
            photos: venue.photos || [],
            imageUrls: venue.image_urls || venue.imageUrls || [],
            bookingUrl: venue.booking_url,
            terms: venue.terms ?? undefined,
            indoorOutdoor: venue.indoor_outdoor ?? undefined,
            isPublic: venue.is_public,
            notes: venue.notes ?? undefined,
          }))}
          sport={sport}
        />
      </div>
    </div>
  );
}