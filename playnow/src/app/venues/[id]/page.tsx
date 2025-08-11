import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { MapPin, Clock, Star, Shield, Users, Calendar, ChevronRight, Heart, Share2, Phone, Mail, Globe } from "lucide-react";

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

  // Derive images with graceful fallback to an Unsplash placeholder
  const imageUrls: string[] = venue.image_urls || venue.imageUrls || [];
  const mainImage: string | undefined = imageUrls[0];
  const fallbackImage = "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=60";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0f2847] to-[#1a3a5c]">
      {/* Hero Image Section */}
      <div className="relative h-96 bg-[#0f2847]">
        <img
          src={mainImage ? `/api/image?url=${encodeURIComponent(mainImage)}` : fallbackImage}
          alt={venue.name}
          className="w-full h-full object-cover opacity-90"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = fallbackImage;
          }}
        />
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
                Tennis
              </span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">{venue.name}</h1>
            <div className="flex items-center gap-4 text-white/90">
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4 text-[#00d9ff]" />
                 <span>{venue.address}{venue.city ? `, ${venue.city}` : ""}</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-[#00ff88] text-[#00ff88]" />
                <span>4.5 (127 reviews)</span>
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
                  <Shield className="h-5 w-5 text-[#00d9ff]" />
                  <div>
                    <div className="text-sm text-[#7a8b9a]">Verified</div>
                    <div className="font-medium text-white">Yes</div>
                  </div>
                </div>
              </div>
            </div>

            {/* About */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
              <h2 className="text-xl font-semibold mb-4 text-white">About This Venue</h2>
              <p className="text-[#b8c5d6] leading-relaxed">
                Welcome to {venue.name}, one of the premier sports facilities in {venue.city}. 
                Our venue offers top-quality courts with professional-grade surfaces, perfect for players 
                of all skill levels. Whether you're looking for a casual game or serious training, 
                we have everything you need for an excellent playing experience.
              </p>
            </div>

            {/* Amenities */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
              <h2 className="text-xl font-semibold mb-4 text-white">Amenities</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {venue.amenities.map((amenity, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#00ff88] rounded-full" />
                    <span className="text-[#b8c5d6]">{amenity}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#00ff88] rounded-full" />
                  <span className="text-[#b8c5d6]">Parking Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#00ff88] rounded-full" />
                  <span className="text-[#b8c5d6]">Equipment Rental</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#00ff88] rounded-full" />
                  <span className="text-[#b8c5d6]">Water Fountain</span>
                </div>
              </div>
            </div>

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
              <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-2">
                  {venue.priceEstimate || venue.priceEstimateText ? (
                    <>
                      <span className="text-3xl font-bold text-[#00ff88]">
                        {venue.priceEstimate ? `$${venue.priceEstimate}` : venue.priceEstimateText}
                      </span>
                      {venue.priceEstimate && <span className="text-[#b8c5d6]"> per hour</span>}
                    </>
                  ) : null}
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <Star className="h-4 w-4 fill-[#00ff88] text-[#00ff88]" />
                  <span className="font-medium text-white">4.5</span>
                  <span className="text-[#7a8b9a]">(127 reviews)</span>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-[#00d9ff]">Date</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff] focus:bg-white/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-[#00d9ff]">Time</label>
                  <select className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff] focus:bg-white/20">
                    <option>Select time</option>
                    <option>6:00 AM - 7:00 AM</option>
                    <option>7:00 AM - 8:00 AM</option>
                    <option>8:00 AM - 9:00 AM</option>
                    <option>9:00 AM - 10:00 AM</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-[#00d9ff]">Duration</label>
                  <select className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff] focus:bg-white/20">
                    <option>1 hour</option>
                    <option>2 hours</option>
                    <option>3 hours</option>
                    <option>4 hours</option>
                  </select>
                </div>
              </div>

              <a 
                href={`/api/clicks?venueId=${venue.id}&redirect=${encodeURIComponent(venue.bookingUrl)}`}
                className="w-full block text-center px-6 py-3 bg-[#00ff88] text-[#0a1628] rounded-lg hover:bg-[#00cc6a] transition-colors font-bold mb-3 shadow-lg hover:shadow-[#00ff88]/30"
              >
                Book Now
              </a>

              <Link
                href={`/games/new?venueId=${venue.id}`}
                className="w-full block text-center px-6 py-3 border border-[#00d9ff] text-[#00d9ff] rounded-lg hover:bg-[#00d9ff]/10 transition-colors font-semibold"
              >
                Host a Game Here
              </Link>

              <div className="mt-6 pt-6 border-t border-white/10">
                <h3 className="font-semibold mb-3 text-white">Contact Venue</h3>
                <div className="space-y-2 text-sm">
                  <a href="tel:+1234567890" className="flex items-center gap-2 text-[#b8c5d6] hover:text-[#00d9ff] transition-colors">
                    <Phone className="h-4 w-4" />
                    <span>(123) 456-7890</span>
                  </a>
                  <a href="mailto:info@venue.com" className="flex items-center gap-2 text-[#b8c5d6] hover:text-[#00d9ff] transition-colors">
                    <Mail className="h-4 w-4" />
                    <span>info@venue.com</span>
                  </a>
                  <a href="#" className="flex items-center gap-2 text-[#b8c5d6] hover:text-[#00d9ff] transition-colors">
                    <Globe className="h-4 w-4" />
                    <span>Visit website</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}