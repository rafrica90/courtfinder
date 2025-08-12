import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import { AuthProvider } from "@/contexts/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CourtFinder - Find & Book Sports Venues",
  description: "Discover and book tennis courts, pickleball courts, soccer fields and more. Host games and connect with players in your area.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col bg-gradient-to-br from-[#0a1628] via-[#0f2847] to-[#1a3a5c]`}
      >
        <AuthProvider>
          <Nav />
          <main className="flex-grow">{children}</main>
          <footer className="border-t border-white/10 bg-[#0a1628]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 text-center text-sm text-[#b8c5d6]">
              Run by <span className="font-semibold text-white">BitNifty</span> · 2025
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
