"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const sportsSlides = [
  {
    id: 1,
    sport: "Soccer",
    title: "Find Soccer Fields",
    description: "Discover premium soccer fields and join matches in your area",
    image: "https://images.unsplash.com/photo-1574629867924-e7694b99903e?w=1200&h=800&fit=crop",
    slug: "soccer",
    color: "from-green-600/80 to-emerald-600/80"
  },
  {
    id: 2,
    sport: "Tennis",
    title: "Book Tennis Courts",
    description: "Reserve tennis courts and connect with players at your level",
    image: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=1200&h=800&fit=crop",
    slug: "tennis",
    color: "from-blue-600/80 to-cyan-600/80"
  },
  {
    id: 3,
    sport: "Pickleball",
    title: "Play Pickleball",
    description: "Join the fastest growing sport and find courts near you",
    image: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=1200&h=800&fit=crop",
    slug: "pickleball",
    color: "from-purple-600/80 to-pink-600/80"
  }
];

export default function SportsCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % sportsSlides.length);
    }, 4000); // Change slide every 4 seconds

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
    // Resume auto-play after 10 seconds
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const goToPrevious = () => {
    setCurrentSlide((prev) => (prev - 1 + sportsSlides.length) % sportsSlides.length);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const goToNext = () => {
    setCurrentSlide((prev) => (prev + 1) % sportsSlides.length);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  return (
    <div className="relative w-full h-[500px] rounded-2xl overflow-hidden group">
      {/* Slides */}
      <div className="relative w-full h-full">
        {sportsSlides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-all duration-700 ease-in-out ${
              index === currentSlide 
                ? "opacity-100 translate-x-0" 
                : index < currentSlide 
                ? "opacity-0 -translate-x-full" 
                : "opacity-0 translate-x-full"
            }`}
          >
            {/* Background Image */}
            <div className="absolute inset-0">
              <img
                src={slide.image}
                alt={slide.sport}
                className="w-full h-full object-cover"
              />
              <div className={`absolute inset-0 bg-gradient-to-br ${slide.color}`}></div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
            </div>

            {/* Content */}
            <div className="relative h-full flex flex-col justify-end p-8 sm:p-10">
              <div className="max-w-2xl">
                <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold text-white mb-3">
                  {slide.sport}
                </span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-3">
                  {slide.title}
                </h2>
                <p className="text-lg text-white/90">
                  {slide.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={goToPrevious}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 backdrop-blur-sm rounded-full text-white hover:bg-white/20 transition-all duration-300 opacity-0 group-hover:opacity-100"
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button
        onClick={goToNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 backdrop-blur-sm rounded-full text-white hover:bg-white/20 transition-all duration-300 opacity-0 group-hover:opacity-100"
        aria-label="Next slide"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      {/* Dots Indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
        {sportsSlides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === currentSlide 
                ? "w-8 bg-white" 
                : "w-2 bg-white/50 hover:bg-white/70"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
        <div
          className="h-full bg-white/80 transition-all duration-300"
          style={{
            width: `${((currentSlide + 1) / sportsSlides.length) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}
