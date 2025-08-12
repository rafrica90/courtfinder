import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit, strictRateLimiter } from '@/lib/rate-limit';

type HereSuggestItem = {
  title?: string;
  id?: string;
  resultType?: string;
  address?: {
    label?: string;
    city?: string;
    countryCode?: string;
    state?: string;
    county?: string;
    stateCode?: string;
    postalCode?: string;
  };
};

// Define fallback cities at the top
const fallbackCities = [
  { label: 'Sydney, NSW, Australia', city: 'Sydney', countryCode: 'AU', state: 'NSW', suburb: '' },
  { label: 'Melbourne, VIC, Australia', city: 'Melbourne', countryCode: 'AU', state: 'VIC', suburb: '' },
  { label: 'Brisbane, QLD, Australia', city: 'Brisbane', countryCode: 'AU', state: 'QLD', suburb: '' },
  { label: 'Perth, WA, Australia', city: 'Perth', countryCode: 'AU', state: 'WA', suburb: '' },
  { label: 'Adelaide, SA, Australia', city: 'Adelaide', countryCode: 'AU', state: 'SA', suburb: '' },
  { label: 'Canberra, ACT, Australia', city: 'Canberra', countryCode: 'AU', state: 'ACT', suburb: '' },
  { label: 'Hobart, TAS, Australia', city: 'Hobart', countryCode: 'AU', state: 'TAS', suburb: '' },
  { label: 'Darwin, NT, Australia', city: 'Darwin', countryCode: 'AU', state: 'NT', suburb: '' },
  { label: 'Gold Coast, QLD, Australia', city: 'Gold Coast', countryCode: 'AU', state: 'QLD', suburb: '' },
  { label: 'Newcastle, NSW, Australia', city: 'Newcastle', countryCode: 'AU', state: 'NSW', suburb: '' },
  { label: 'Wollongong, NSW, Australia', city: 'Wollongong', countryCode: 'AU', state: 'NSW', suburb: '' },
  { label: 'Geelong, VIC, Australia', city: 'Geelong', countryCode: 'AU', state: 'VIC', suburb: '' },
  // Sydney suburbs
  { label: 'Greystanes, Sydney, NSW, Australia', city: 'Sydney', countryCode: 'AU', state: 'NSW', suburb: 'Greystanes' },
  { label: 'Parramatta, Sydney, NSW, Australia', city: 'Sydney', countryCode: 'AU', state: 'NSW', suburb: 'Parramatta' },
  { label: 'Blacktown, Sydney, NSW, Australia', city: 'Sydney', countryCode: 'AU', state: 'NSW', suburb: 'Blacktown' },
  { label: 'Liverpool, Sydney, NSW, Australia', city: 'Sydney', countryCode: 'AU', state: 'NSW', suburb: 'Liverpool' },
  { label: 'Penrith, Sydney, NSW, Australia', city: 'Sydney', countryCode: 'AU', state: 'NSW', suburb: 'Penrith' },
  { label: 'Chatswood, Sydney, NSW, Australia', city: 'Sydney', countryCode: 'AU', state: 'NSW', suburb: 'Chatswood' },
  { label: 'Bondi, Sydney, NSW, Australia', city: 'Sydney', countryCode: 'AU', state: 'NSW', suburb: 'Bondi' },
  { label: 'Manly, Sydney, NSW, Australia', city: 'Sydney', countryCode: 'AU', state: 'NSW', suburb: 'Manly' },
];

// Fallback postal codes (limited AU sample)
const fallbackPostalCodes = [
  { label: 'Sydney NSW 2000, Australia', city: 'Sydney', state: 'NSW', countryCode: 'AU', postalCode: '2000' },
  { label: 'Parramatta NSW 2150, Australia', city: 'Sydney', state: 'NSW', countryCode: 'AU', postalCode: '2150' },
  { label: 'Melbourne VIC 3000, Australia', city: 'Melbourne', state: 'VIC', countryCode: 'AU', postalCode: '3000' },
  { label: 'Brisbane QLD 4000, Australia', city: 'Brisbane', state: 'QLD', countryCode: 'AU', postalCode: '4000' },
  { label: 'Perth WA 6000, Australia', city: 'Perth', state: 'WA', countryCode: 'AU', postalCode: '6000' },
];

// Minimal fallback mapping of postal code → suburbs (for local dev without HERE API)
const fallbackPostalToSuburbs: Record<string, { suburb: string; city: string; state: string; countryCode: string; postalCode: string; }[]> = {
  // Western Sydney examples
  '2145': [
    { suburb: 'Greystanes', city: 'Sydney', state: 'NSW', countryCode: 'AU', postalCode: '2145' },
    { suburb: 'Wentworthville', city: 'Sydney', state: 'NSW', countryCode: 'AU', postalCode: '2145' },
    { suburb: 'Westmead', city: 'Sydney', state: 'NSW', countryCode: 'AU', postalCode: '2145' },
  ],
  '2150': [
    { suburb: 'Parramatta', city: 'Sydney', state: 'NSW', countryCode: 'AU', postalCode: '2150' },
    { suburb: 'North Parramatta', city: 'Sydney', state: 'NSW', countryCode: 'AU', postalCode: '2150' },
    { suburb: "O'Connell", city: 'Sydney', state: 'NSW', countryCode: 'AU', postalCode: '2150' },
  ],
  '2160': [
    { suburb: 'Merrylands', city: 'Sydney', state: 'NSW', countryCode: 'AU', postalCode: '2160' },
    { suburb: 'Guildford', city: 'Sydney', state: 'NSW', countryCode: 'AU', postalCode: '2160' },
    { suburb: 'Merrylands West', city: 'Sydney', state: 'NSW', countryCode: 'AU', postalCode: '2160' },
  ],
};

export async function GET(req: NextRequest) {
  const rl = await withRateLimit(req, strictRateLimiter);
  if (!rl.success) return rl.response!;

  const { searchParams } = new URL(req.url);
  // Use HERE Maps API key if available, otherwise use fallback data
  const apiKey = process.env.HERE_API_KEY && 
                 process.env.HERE_API_KEY !== 'your-here-api-key-here' 
                 ? process.env.HERE_API_KEY 
                 : null;

  const id = searchParams.get('id');
  const type = searchParams.get('type') || '';
  const filterCountry = (searchParams.get('country') || '').toUpperCase();
  if (id) {
    // If an ID is provided and it's a fallback ID, return the data directly
    if (id.startsWith('fallback-')) {
      const idx = parseInt(id.replace('fallback-', ''));
      if (idx >= 0 && idx < fallbackCities.length) {
        const city = fallbackCities[idx];
        return NextResponse.json({
          location: {
            id: id,
            label: city.label,
            city: city.city,
            suburb: city.suburb,
            state: city.state,
            countryCode: city.countryCode,
          },
        });
      }
    }
    if (id.startsWith('fallback-pc-')) {
      const idx = parseInt(id.replace('fallback-pc-', ''));
      if (idx >= 0 && idx < fallbackPostalCodes.length) {
        const pc = fallbackPostalCodes[idx];
        return NextResponse.json({
          location: {
            id: id,
            label: pc.label,
            city: pc.city,
            suburb: '',
            state: pc.state,
            countryCode: pc.countryCode,
            postalCode: pc.postalCode,
          },
        });
      }
    }
    
    // If HERE API key is available, do the lookup
    if (apiKey) {
      try {
        const lookupUrl = new URL('https://lookup.search.hereapi.com/v1/lookup');
        lookupUrl.searchParams.set('id', id);
        lookupUrl.searchParams.set('apiKey', apiKey);
        lookupUrl.searchParams.set('lang', 'en');

        const res = await fetch(lookupUrl.toString());
        if (res.ok) {
          const data = await res.json();
          const address = data.address || {};
          return NextResponse.json({
            location: {
              id: data.id,
              label: address.label || data.title,
              city: address.city,
              suburb: address.district || address.subdistrict, // district is often the suburb
              state: address.stateCode || address.state,
              countryCode: address.countryCode,
              postalCode: address.postalCode,
            },
          });
        }
      } catch (err) {
        // Fallback to autosuggest if lookup fails
      }
    }
  }

  const q = searchParams.get('q')?.trim();
  if (!q) return NextResponse.json({ error: 'Missing q' }, { status: 400 });

  // If no API key, provide fallback suggestions
  if (!apiKey) {
    if (type === 'postalCode') {
      const digitsOnly = q.replace(/\D/g, '');
      const pcSuburbs = fallbackPostalToSuburbs[digitsOnly];
      if (pcSuburbs && pcSuburbs.length > 0) {
        const suggestions = pcSuburbs.map((s, idx) => ({
          id: `fallback-pcsub-${digitsOnly}-${idx}`,
          label: `${s.suburb}, ${s.city}, ${s.state} ${s.postalCode}, Australia`,
          city: s.city,
          countryCode: s.countryCode,
          suburb: s.suburb,
          state: s.state,
          postalCode: s.postalCode,
        }));
        return NextResponse.json({ suggestions });
      }
      const qLower = q.toLowerCase();
      const filtered = fallbackPostalCodes
        .filter(pc => (!filterCountry || pc.countryCode === filterCountry) && (pc.postalCode.includes(digitsOnly) || pc.label.toLowerCase().includes(qLower)))
        .slice(0, 5)
        .map((pc, idx) => ({ id: `fallback-pc-${idx}`, label: pc.label, city: pc.city, countryCode: pc.countryCode, suburb: '', state: pc.state, postalCode: pc.postalCode }));
      return NextResponse.json({ suggestions: filtered });
    } else {
      const qLower = q.toLowerCase();
      const filtered = fallbackCities
        .filter(city => 
          city.label.toLowerCase().includes(qLower) || 
          city.city.toLowerCase().includes(qLower) ||
          city.suburb.toLowerCase().includes(qLower)
        )
        .slice(0, 5)
        .map((city, idx) => ({ ...city, id: `fallback-${idx}` }));
      
      return NextResponse.json({ suggestions: filtered });
    }
  }

  try {
    const url = new URL('https://autosuggest.search.hereapi.com/v1/autosuggest');
    // For postal code flow, we do NOT restrict types so we can receive suburb/locality
    // items that include the postalCode. We'll filter them after.
    url.searchParams.set('q', q);
    url.searchParams.set('apiKey', apiKey);
    url.searchParams.set('limit', '5');
    // Add a broad search area (worldwide) or use user's location if available
    url.searchParams.set('at', '0,0'); // Center point for worldwide search
    url.searchParams.set('lang', 'en');
    // no type restriction when type === 'postalCode'

    const res = await fetch(url.toString());
    if (!res.ok) {
      return NextResponse.json({ suggestions: [] }, { status: 200 });
    }

    const data = (await res.json()) as { items?: HereSuggestItem[] };
    let suggestions = (data.items || [])
      .filter((it) => !!(it.title || it.address?.label))
      .slice(0, 5)
      .map((it) => {
        const label = it.address?.label || it.title || '';
        const parts = label.split(',').map((p) => p.trim());

        // Prefer structured fields when available
        let suburb = (it as any)?.address?.district || (it as any)?.address?.subdistrict || '';
        let city = it.address?.city || '';
        let state = it.address?.stateCode || it.address?.state || '';

        // If result is a locality (city/town) and city is missing, use first token as city
        if (!city && it.resultType === 'locality' && parts.length > 0) {
          city = parts[0];
        }

        // AU-style with suburb present: "Suburb, City, STATE 2000, Australia"
        // Prefer the second token as city in this pattern
        if (parts.length >= 4) {
          const possibleState = parts[2]?.split(/[\s-]/)[0];
          if (possibleState && possibleState.length >= 2 && possibleState.length <= 3) {
            if (!suburb) suburb = parts[0];
            city = parts[1] || city; // override to City token (e.g., Sydney)
            if (!state) state = possibleState;
          }
        }

        // Derive country code from the last token
        let countryCode = '';
        if (parts.length > 0) {
          const country = parts[parts.length - 1];
          const countryMap: Record<string, string> = {
            Australia: 'AU',
            'United States': 'US',
            'United Kingdom': 'GB',
            Canada: 'CA',
            'New Zealand': 'NZ',
            Germany: 'DE',
            France: 'FR',
            Spain: 'ES',
            Italy: 'IT',
            Japan: 'JP',
            China: 'CN',
            India: 'IN',
            Brazil: 'BR',
            Mexico: 'MX',
            England: 'GB',
          };
          countryCode = countryMap[country] || '';
        }

        // If state not provided, try to infer by scanning middle tokens for AU-style codes
        if (!state && parts.length >= 2) {
          const lastIndex = parts.length - 1; // country index
          for (let i = 1; i < lastIndex; i++) {
            const token = parts[i].split(/[\s-]/)[0];
            if (token && token.length >= 2 && token.length <= 3 && token.toUpperCase() === token) {
              state = token; // e.g., NSW, VIC, QLD
              break;
            }
          }
        }

        const postalCode = it.address?.postalCode || '';
        return { id: it.id, label, city, countryCode, suburb, state, postalCode };
      });

    // Apply filtering based on requested type
    if (type === 'postalCode') {
      const digitsOnly = q.replace(/\D/g, '');
      suggestions = suggestions.filter((s) => {
        const hasPc = (s as any).postalCode && (s as any).postalCode.toString().includes(digitsOnly);
        const labelHasPc = s.label && new RegExp(`\\b${digitsOnly}\\b`).test(s.label);
        const okCountry = !filterCountry || s.countryCode === filterCountry;
        return okCountry && (hasPc || labelHasPc);
      });
    } else {
      // For general search, allow any locality/address types and just enforce country filter
      suggestions = suggestions.filter((s) => !filterCountry || s.countryCode === filterCountry);
    }

    return NextResponse.json({ suggestions });
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Autosuggest error', err);
    }
    return NextResponse.json({ suggestions: [] });
  }
}


