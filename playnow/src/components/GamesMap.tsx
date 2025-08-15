'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

// Import Leaflet CSS in client only
import 'leaflet/dist/leaflet.css';

type GameMarker = {
  id: string;
  venue: string;
  sport: string;
  address: string;
  lat: number;
  lng: number;
  date?: string;
  time?: string;
};

interface GamesMapProps {
  games: GameMarker[];
  userLocation?: { lat: number; lng: number } | null;
}

export default function GamesMap({ games, userLocation }: GamesMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);

  const center = useMemo(() => {
    if (userLocation) return [userLocation.lat, userLocation.lng] as [number, number];
    const first = games.find((g) => Number.isFinite(g.lat) && Number.isFinite(g.lng));
    return first ? ([first.lat, first.lng] as [number, number]) : ([-33.8688, 151.2093] as [number, number]);
  }, [games, userLocation]);

  useEffect(() => {
    let map: any;
    let markers: any[] = [];
    let isCancelled = false;
    let userCircle: any | null = null;

    async function init() {
      const L = await import('leaflet');

      // Fix default icon URLs in Next environment
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (!containerRef.current || isCancelled) return;
      map = L.map(containerRef.current, {
        center,
        zoom: 12,
        zoomControl: false,
        scrollWheelZoom: false, // Avoid hijacking page scroll
        touchZoom: true,
        dragging: true,
      });
      mapRef.current = map;

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      if (userLocation) {
        const ul = L.circleMarker([userLocation.lat, userLocation.lng], {
          radius: 6,
          color: '#00d9ff',
          weight: 2,
          fillColor: '#00d9ff',
          fillOpacity: 0.6,
        }).addTo(map);
        ul.bindTooltip('You are here');
        userCircle = L.circle([userLocation.lat, userLocation.lng], {
          radius: 20000, // 20 km
          color: '#00d9ff',
          weight: 1,
          fillColor: '#00d9ff',
          fillOpacity: 0.08,
        }).addTo(map);
      }

      markers = games
        .filter((g) => Number.isFinite(g.lat) && Number.isFinite(g.lng))
        .map((g) => {
          const m = L.marker([g.lat, g.lng]).addTo(map);
          const info = `
            <div style="font-family: ui-sans-serif, system-ui;">
              <div style="font-weight: 700; margin-bottom: 4px;">${g.venue}</div>
              <div style="font-size: 12px; opacity: 0.8;">${g.sport} • ${g.date || ''} ${g.time || ''}</div>
              <div style="font-size: 12px; opacity: 0.8;">${g.address}</div>
            </div>
          `;
          m.bindPopup(info);
          return m;
        });

      setIsReady(true);
    }

    init();

    return () => {
      isCancelled = true;
      try {
        markers.forEach((m) => m.remove());
      } catch {}
      try {
        // @ts-ignore
        if (map) map.remove();
      } catch {}
      try {
        userCircle?.remove?.();
      } catch {}
    };
  }, [games, center, userLocation]);

  // Keep Leaflet map sized correctly when container changes
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      try {
        mapRef.current?.invalidateSize?.();
      } catch {}
    });
    ro.observe(el);
    const onScroll = () => {
      try {
        mapRef.current?.invalidateSize?.();
      } catch {}
    };
    window.addEventListener('resize', onScroll);
    window.addEventListener('orientationchange', onScroll);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('orientationchange', onScroll);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-[70vh] w-full rounded-xl border border-white/10 overflow-hidden bg-[#0e1a2b] will-change-auto"
      aria-label={isReady ? 'Games map' : 'Loading map'}
    />
  );
}


