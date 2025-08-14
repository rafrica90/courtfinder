import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { MapPin, Clock, Users, Heart, Share2 } from "lucide-react";
import VenueImage from "@/components/VenueImage";
import { getPlacePhotoInfo } from "@/lib/google-places";
import { getStockImageForVenue, GENERIC_PLACEHOLDER, getPrimarySport } from "@/lib/sport-images";

export default async function VenueDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseServiceClient();
  let venue: any = null;
  if (supabase) {
    const { data } = await supabase
      .from("venues")
      .select("*")
      .eq("id", id)
      .single();
    venue = data;
  }
  if (!venue) {
    const { venues } = await import("@/lib/mockData");
    venue = venues.find((v: any) => v.id === id);
    if (!venue) return notFound();
  }

  // Attempt Google Places photo first if we have a place_id on the venue
  let heroSrc: string | undefined;
  let photoAuthorAttributions: { name: string; url: string }[] = [];
  if (venue.place_id && process.env.GOOGLE_MAPS_API_KEY) {
    const placePhoto = await getPlacePhotoInfo(String(venue.place_id), 1200);
    if (placePhoto) {
      heroSrc = placePhoto.photoUrl;
      photoAuthorAttributions = placePhoto.authorAttributions;
    }
  }

  // If no Places photo, use curated stock image matched to sport
  const mainImage: string | undefined = heroSrc || getStockImageForVenue(venue);
  const fallbackImage = GENERIC_PLACEHOLDER;
  // Treat Google Place Photos as trusted (must not be proxied), along with Unsplash/Pexels
  const isTrustedCdn =
    typeof mainImage === 'string' && /(images\.unsplash\.com|images\.pexels\.com|maps\.googleapis\.com)/i.test(mainImage);
  const imageSrc = mainImage && !isTrustedCdn ? `/api/image?url=${encodeURIComponent(mainImage)}` : mainImage;

  // Determine primary sport for display badge
  const primarySport = getPrimarySport(venue);
  const displaySport = primarySport
    ? primarySport.charAt(0).toUpperCase() + primarySport.slice(1)
    : "Sport";

  return (
    <div className="min-h-screen">
      {/* Hero Image Section */}
      <div className="relative h-96 bg-[#0f2847]">
          <VenueImage
            src={imageSrc || fallbackImage}
            alt={venue.name}
            fallbackSrc={fallbackImage}
            className="w-full h-full object-cover opacity-90"
          />
          {(heroSrc && (photoAuthorAttributions.length > 0 || true)) && (
            <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
              {photoAuthorAttributions.length > 0 && (
                <>
                  Photo by {photoAuthorAttributions.map((a, idx) => (
                    <a key={idx} href={a.url} target="_blank" rel="nofollow noopener noreferrer" className="underline">
                      {a.name}
                    </a>
                  )).reduce((prev, curr) => [prev, ', ', curr] as any)} · 
                </>
              )}
              <span>Google Maps</span>
            </div>
          )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        
        {/* Action buttons */}
        <div className="absolute top-4 right-4 flex gap-2">
          <button className="p-3 bg-white/10 backdrop-blur-sm rounded-full hover:bg-[#00d9ff]/20 transition-colors border border-white/20">
            <Heart className="h-5 w-5 text-white" />
          </button>
          <button className="p-3 bg-white/10 backdrop-blur-sm rounded-full hover:bg-[#00d9ff]/20 transition-colors border border-white/20">
            <Share2 className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Venue name overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-2 text-white/90 mb-2">
              <span className="px-3 py-1 bg-[#00ff88] text-[#0a1628] rounded-full text-sm font-bold">
                {venue.indoorOutdoor === "indoor" ? "Indoor" : venue.indoorOutdoor === "outdoor" ? "Outdoor" : "Indoor & Outdoor"}
              </span>
              <span className="px-3 py-1 bg-[#00d9ff] text-[#0a1628] rounded-full text-sm font-bold">
                {displaySport}
              </span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">{venue.name}</h1>
            <div className="flex items-center gap-4 text-white/90">
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4 text-[#00d9ff]" />
                 <span>{venue.address}{venue.city ? `, ${venue.city}` : ""}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Quick Info */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
              <h2 className="text-xl font-semibold mb-4 text-white">Quick Information</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-[#00d9ff]" />
                  <div>
                    <div className="text-sm text-[#7a8b9a]">Hours</div>
                    <div className="font-medium text-white">6:00 AM - 10:00 PM</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-[#00d9ff]" />
                  <div>
                    <div className="text-sm text-[#7a8b9a]">Capacity</div>
                    <div className="font-medium text-white">4 Courts</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                </div>
              </div>
            </div>

            {/* About */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
              <h2 className="text-xl font-semibold mb-4 text-white">About This Venue</h2>
              <p className="text-[#b8c5d6] leading-relaxed">
                Welcome to {venue.name}, one of the premier sports facilities in {venue.city}. 
                Our venue offers top-quality courts with professional-grade surfaces, perfect for players 
                of all skill levels. Whether you&apos;re looking for a casual game or serious training, 
                we have everything you need for an excellent playing experience.
              </p>
            </div>

            {/* Amenities intentionally removed */}

            {/* Gallery removed as requested */}

            {/* Terms & Conditions */}
            {venue.terms && (
              <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                <h2 className="text-xl font-semibold mb-4 text-white">Terms & Conditions</h2>
                <p className="text-[#b8c5d6]">{venue.terms}</p>
              </div>
            )}
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 sticky top-24">
              {/* Hourly rate removed from sidebar */}

              {/* Book Now button - handle both bookingUrl (camelCase) and booking_url (snake_case) */}
              {(venue.bookingUrl || venue.booking_url) ? (
                <a 
                  href={`/api/clicks?venueId=${venue.id}&redirect=${encodeURIComponent(venue.bookingUrl || venue.booking_url)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full block text-center px-6 py-3 bg-[#00ff88] text-[#0a1628] rounded-lg hover:bg-[#00cc6a] transition-colors font-bold mb-3 shadow-lg hover:shadow-[#00ff88]/30"
                >
                  Book Now
                </a>
              ) : (
                <button 
                  disabled
                  className="w-full block text-center px-6 py-3 bg-gray-500 text-gray-300 rounded-lg cursor-not-allowed font-bold mb-3"
                >
                  Booking Not Available
                </button>
              )}

              <Link
                href={`/games/new?venueId=${venue.id}`}
                className="w-full block text-center px-6 py-3 border border-[#00d9ff] text-[#00d9ff] rounded-lg hover:bg-[#00d9ff]/10 transition-colors font-semibold"
              >
                Host a Game Here
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}