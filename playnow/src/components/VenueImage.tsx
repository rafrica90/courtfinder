"use client";

import { useState } from "react";

interface VenueImageProps {
  src: string;
  alt: string;
  fallbackSrc: string;
  className?: string;
}

export default function VenueImage({ src, alt, fallbackSrc, className }: VenueImageProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      setImgSrc(fallbackSrc);
    }
  };

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      onError={handleError}
    />
  );
}
