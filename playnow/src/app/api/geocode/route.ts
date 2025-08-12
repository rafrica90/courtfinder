import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit, strictRateLimiter } from '@/lib/rate-limit';

type HereGeocodeItem = {
  title?: string;
  address?: {
    label?: string;
    countryCode?: string;
    countryName?: string;
    state?: string;
    county?: string;
    city?: string;
  };
  position?: { lat: number; lng: number };
};

export async function GET(req: NextRequest) {
  const rl = await withRateLimit(req, strictRateLimiter);
  if (!rl.success) return rl.response!;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();
  if (!q) {
    return NextResponse.json({ error: 'Missing q' }, { status: 400 });
  }

  const apiKey = process.env.HERE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Geocoding not configured' }, { status: 501 });
  }

  try {
    const url = new URL('https://geocode.search.hereapi.com/v1/geocode');
    url.searchParams.set('q', q);
    url.searchParams.set('apiKey', apiKey);
    url.searchParams.set('limit', '1');

    const res = await fetch(url.toString());
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Upstream error: ${res.status} ${text}` }, { status: 502 });
    }

    const data = (await res.json()) as { items?: HereGeocodeItem[] };
    const item = data.items?.[0];
    if (!item) {
      return NextResponse.json({ normalized: null });
    }

    const city = item.address?.city || '';
    const countryCode = (item.address?.countryCode || '').toUpperCase();
    const normalized = {
      input: q,
      city,
      countryCode,
      label: item.address?.label || item.title || `${city}${countryCode ? ', ' + countryCode : ''}`,
      latitude: item.position?.lat ?? null,
      longitude: item.position?.lng ?? null,
    };

    return NextResponse.json({ normalized });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Geocode error', error);
    }
    return NextResponse.json({ error: 'Failed to geocode' }, { status: 500 });
  }
}


