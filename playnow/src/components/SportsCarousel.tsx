"use client";

import { useState, useEffect } from "react";

const sportsSlides = [
  {
    id: 1,
    sport: "Soccer",
    image: "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=1200&h=800&fit=crop",
  },
  {
    id: 2,
    sport: "Tennis",
    image: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=1200&h=800&fit=crop",
  },
  {
    id: 3,
    sport: "Pickleball",
    image: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=1200&h=800&fit=crop",
  }
];

export default function SportsCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % sportsSlides.length);
    }, 4000); // Change slide every 4 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-[500px] rounded-2xl overflow-hidden">
      {/* Slides */}
      <div className="relative w-full h-full">
        {sportsSlides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentSlide 
                ? "opacity-100" 
                : "opacity-0"
            }`}
          >
            {/* Background Image Only */}
            <img
              src={slide.image}
              alt={slide.sport}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
