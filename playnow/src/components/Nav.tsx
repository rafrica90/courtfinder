"use client";

import Link from "next/link";
import { Menu, User, Calendar, MapPin, LogOut } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function Nav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    setMobileMenuOpen(false);
  };

  return (
    <nav className="w-full bg-[#0a1628]/95 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-[#00d9ff] rounded-lg flex items-center justify-center group-hover:bg-[#00ff88] transition-colors">
              <MapPin className="h-5 w-5 text-[#0a1628]" />
            </div>
            <span className="font-bold text-xl text-white">CourtFinder</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link 
              href="/venues" 
              className="text-[#b8c5d6] hover:text-[#00d9ff] transition-colors font-medium"
            >
              Browse Venues
            </Link>
            <Link 
              href="/games" 
              className="text-[#b8c5d6] hover:text-[#00d9ff] transition-colors font-medium"
            >
              Find Games
            </Link>
            <Link 
              href="/games/new" 
              className="text-[#b8c5d6] hover:text-[#00d9ff] transition-colors font-medium"
            >
              Host a Game
            </Link>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-4">
            <Link 
              href="/bookings"
              className="hidden md:flex items-center gap-2 px-4 py-2 border border-[#00d9ff]/30 rounded-lg hover:bg-[#00d9ff]/10 transition-colors text-[#00d9ff]"
            >
              <Calendar className="h-4 w-4" />
              <span className="text-sm font-medium">My Bookings</span>
            </Link>
            
            {user ? (
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 bg-transparent border border-[#00ff88]/30 text-[#00ff88] rounded-lg hover:bg-[#00ff88]/10 transition-colors font-semibold"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm font-medium hidden sm:inline">Sign Out</span>
              </button>
            ) : (
              <Link
                href="/sign-in"
                className="flex items-center gap-2 px-4 py-2 bg-[#00ff88] text-[#0a1628] rounded-lg hover:bg-[#00cc6a] transition-colors font-semibold"
              >
                <User className="h-4 w-4" />
                <span className="text-sm font-medium hidden sm:inline">Sign In</span>
              </Link>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-white/10"
            >
              <Menu className="h-6 w-6 text-[#00d9ff]" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 animate-slide-down bg-[#0a1628]/95 backdrop-blur-md">
          <div className="px-4 py-3 space-y-2">
            <Link 
              href="/venues" 
              className="block py-2 text-[#b8c5d6] hover:text-[#00d9ff] transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Browse Venues
            </Link>
            <Link 
              href="/games" 
              className="block py-2 text-[#b8c5d6] hover:text-[#00d9ff] transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Find Games
            </Link>
            <Link 
              href="/games/new" 
              className="block py-2 text-[#b8c5d6] hover:text-[#00d9ff] transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Host a Game
            </Link>
            <Link 
              href="/bookings" 
              className="block py-2 text-[#b8c5d6] hover:text-[#00d9ff] transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              My Bookings
            </Link>
            {user ? (
              <button
                onClick={() => {
                  handleSignOut();
                  setMobileMenuOpen(false);
                }}
                className="block py-2 text-[#00ff88] font-semibold w-full text-left"
              >
                Sign Out
              </button>
            ) : (
              <Link
                href="/sign-in"
                className="block py-2 text-[#00ff88] font-semibold"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}