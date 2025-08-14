type PhotoAttribution = {
  name: string;
  url: string;
};

export type PlacePhotoInfo = {
  photoUrl: string;
  authorAttributions: PhotoAttribution[];
};

function parseHtmlAttributions(htmlAttributions: string[] | undefined): PhotoAttribution[] {
  if (!htmlAttributions || htmlAttributions.length === 0) return [];
  const results: PhotoAttribution[] = [];
  for (const html of htmlAttributions) {
    const match = html.match(/<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/i);
    if (match) {
      results.push({ name: match[2], url: match[1] });
    }
  }
  return results;
}

/**
 * Fetches the first available Place Photo for a given placeId and returns a
 * direct Place Photos URL plus author attributions. This uses only official
 * Google Places endpoints and does not rehost the image.
 */
export async function getPlacePhotoInfo(placeId: string, maxWidth: number = 1200): Promise<PlacePhotoInfo | null> {
  const serverKey = process.env.GOOGLE_MAPS_API_KEY;
  const browserKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY;
  if (!serverKey && !browserKey) return null;

  try {
    // Use server key for Place Details (referrer-restricted browser keys will be denied server-side)
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=photos&key=${serverKey || browserKey}`;
    const resp = await fetch(detailsUrl, { cache: 'no-store' });
    if (!resp.ok) return null;
    const json = await resp.json();
    const photos = json?.result?.photos as Array<{ photoreference?: string; photo_reference?: string; html_attributions?: string[] }> | undefined;
    if (!photos || photos.length === 0) return null;
    const first = photos[0];
    const photoRef = (first as any).photoreference || (first as any).photo_reference;
    if (!photoRef) return null;
    const authorAttributions = parseHtmlAttributions(first.html_attributions);
    // Use browser key for the final photo URL when available; else fall back to server key
    const effectivePhotoKey = browserKey || serverKey;
    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photoreference=${encodeURIComponent(photoRef)}&key=${effectivePhotoKey}`;
    return { photoUrl, authorAttributions };
  } catch {
    return null;
  }
}


