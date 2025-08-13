import VenuesClient from "@/components/VenuesClient";
import SearchBar from "@/components/SearchBar";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export default async function VenuesPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const sp = searchParams ? await searchParams : undefined;
  const sport = typeof sp?.sport === "string" ? sp?.sport : undefined;
  const location = typeof sp?.location === "string" ? sp?.location : undefined;
  const venueName = typeof sp?.venueName === "string" ? sp?.venueName : undefined;

  let filtered: any[] = [];
  try {
    const supabase = getSupabaseServiceClient();
    if (supabase) {
      // Try RPC first, but fallback to direct query if it doesn't exist
      let data = null as any[] | null;
      let error: any = null;
      try {
        const rpcResult = await supabase
          .rpc("search_venues", {
            search_query: location ?? null,
            sport_filter: sport ? [sport] : null,
            indoor_outdoor_filter: null,
            city_filter: location ?? null,
          });
        data = rpcResult.data as any[] | null;
        error = rpcResult.error;
      } catch (e) {
        error = e;
      }
      
      if (error || !Array.isArray(data)) {
        const { data: allVenues } = await supabase.from("venues").select("*");
        const normalize = (val: unknown): string => {
          if (typeof val === "string") return val.toLowerCase();
          if (val === null || val === undefined) return "";
          try { return String(val).toLowerCase(); } catch { return ""; }
        };
        let bySearch = allVenues ?? [];
        if (typeof venueName === "string" && venueName.length > 0) {
          const nameQuery = venueName.toLowerCase();
          bySearch = bySearch.filter((v: any) => normalize(v.name).includes(nameQuery));
        }
        if (typeof location === "string" && location.length > 0) {
          const q = location.toLowerCase();
          bySearch = bySearch.filter((v: any) => {
            if (normalize(v.city) === q) return true;
            return (
              normalize(v.address).includes(q) ||
              normalize(v.city).includes(q) ||
              normalize(v.notes).includes(q)
            );
          });
        }
        filtered = typeof sport === "string" && sport.length > 0
          ? bySearch.filter((v: any) => Array.isArray(v.sports) && v.sports.includes(sport))
          : bySearch;
      } else {
        let rpcFiltered = data;
        if (venueName) {
          const nameQuery = venueName.toLowerCase();
          rpcFiltered = rpcFiltered.filter((v: any) => (typeof v?.name === "string" ? v.name.toLowerCase() : "").includes(nameQuery));
        }
        filtered = rpcFiltered;
      }
    } else {
      const { venues } = await import("@/lib/mockData");
      let mockFiltered = venues ?? [];
      if (venueName) {
        const nameQuery = venueName.toLowerCase();
        mockFiltered = mockFiltered.filter((v: any) => (typeof v?.name === "string" ? v.name.toLowerCase() : "").includes(nameQuery));
      }
      if (sport) {
        mockFiltered = mockFiltered.filter((v: any) => v.sportId === sport);
      }
      filtered = mockFiltered;
    }
  } catch {
    // Absolute fallback to prevent 500s
    try {
      const { venues } = await import("@/lib/mockData");
      filtered = venues ?? [];
    } catch {
      filtered = [];
    }
  }

  return (
    <div className="min-h-screen">
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
            photos: venue.photos || [],
            imageUrls: venue.image_urls || venue.imageUrls || [],
            bookingUrl: venue.booking_url,
            terms: venue.terms ?? undefined,
            indoorOutdoor: venue.indoor_outdoor ?? undefined,
            isPublic: venue.is_public,
            notes: venue.notes ?? undefined,
          }))}
          sport={sport}
          searchedVenueName={venueName}
        />
      </div>
    </div>
  );
}