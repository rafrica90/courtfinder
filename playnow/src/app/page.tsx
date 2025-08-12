"use client";

import Link from "next/link";
import { sports, venues } from "@/lib/mockData";
import VenueCard from "@/components/VenueCard";
import SportsCarousel from "@/components/SportsCarousel";
import { MapPin, Calendar, Users, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="bg-gradient-to-br from-[#0a1628] via-[#0f2847] to-[#1a3a5c] min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-br from-[#00d9ff]/20 via-transparent to-[#00ff88]/20"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-left">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6">
                <span className="text-white">Discover.</span>
                <br />
                <span className="text-[#00d9ff]">Connect.</span>
                <br />
                <span className="text-[#00ff88]">Game On.</span>
              </h1>
              <p className="text-xl text-[#b8c5d6] mb-10 leading-relaxed">
                From pickup games to tournaments – find your perfect match in minutes.
              </p>
              
              {/* Main CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link
                  href="/venues"
                  className="group relative px-8 py-4 bg-[#00d9ff] text-[#0a1628] rounded-xl font-bold text-lg hover:bg-[#00a8cc] transition-all duration-300 shadow-lg hover:shadow-[#00d9ff]/30 hover:shadow-2xl flex items-center justify-center gap-2"
                >
                  <MapPin className="h-5 w-5" />
                  Book a Court
                  <span className="absolute inset-0 rounded-xl bg-white opacity-0 group-hover:opacity-10 transition-opacity"></span>
                </Link>
                <Link
                  href="/games/new"
                  className="group relative px-8 py-4 bg-[#00ff88] text-[#0a1628] rounded-xl font-bold text-lg hover:bg-[#00cc6a] transition-all duration-300 shadow-lg hover:shadow-[#00ff88]/30 hover:shadow-2xl flex items-center justify-center gap-2"
                >
                  <Calendar className="h-5 w-5" />
                  Create Game
                  <span className="absolute inset-0 rounded-xl bg-white opacity-0 group-hover:opacity-10 transition-opacity"></span>
                </Link>
              </div>

              {/* Secondary Button */}
              <Link
                href="/venues"
                className="inline-flex items-center gap-2 text-[#00d9ff] hover:text-[#00ff88] font-medium transition-colors"
              >
                <Users className="h-4 w-4" />
                Find Other Players
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Sports Carousel Section */}
            <div className="lg:pl-12">
              <SportsCarousel />
            </div>
          </div>
        </div>
      </section>

      {/* Popular Venues Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h2 className="text-3xl font-bold text-white">Popular Venues</h2>
              <p className="text-[#b8c5d6] mt-2">Top-rated venues in your area</p>
            </div>
            <Link 
              href="/venues" 
              className="hidden sm:flex items-center gap-2 text-[#00d9ff] hover:text-[#00ff88] font-medium transition-colors"
            >
              View all venues
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {venues.slice(0, 6).map((venue) => (
              <div key={venue.id} className="transform hover:scale-105 transition-transform duration-300">
                <VenueCard venue={venue} />
              </div>
            ))}
          </div>

          <div className="text-center mt-10 sm:hidden">
            <Link 
              href="/venues" 
              className="inline-flex items-center gap-2 text-[#00d9ff] hover:text-[#00ff88] font-medium transition-colors"
            >
              View all venues
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-[#00d9ff]/10 to-[#00ff88]/10 backdrop-blur-sm border-t border-white/10">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            Ready to Play?
          </h2>
          <p className="text-xl text-[#b8c5d6] mb-10">
            Join thousands of players finding venues and games every day
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/venues"
              className="group relative px-10 py-5 bg-[#00d9ff] text-[#0a1628] rounded-xl font-bold text-lg hover:bg-[#00a8cc] transition-all duration-300 shadow-lg hover:shadow-[#00d9ff]/30 hover:shadow-2xl"
            >
              Browse Venues
              <span className="absolute inset-0 rounded-xl bg-white opacity-0 group-hover:opacity-10 transition-opacity"></span>
            </Link>
            <Link
              href="/games/new"
              className="group relative px-10 py-5 bg-transparent text-[#00ff88] rounded-xl font-bold text-lg border-2 border-[#00ff88] hover:bg-[#00ff88] hover:text-[#0a1628] transition-all duration-300"
            >
              Host a Game
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}