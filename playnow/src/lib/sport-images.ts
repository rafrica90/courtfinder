// Centralized stock images by sport. These are curated Unsplash/Pixabay links
// chosen to be broadly representative and reliably accessible.

export type SportKey =
  | "tennis"
  | "soccer"
  | "basketball"
  | "pickleball"
  | "swimming"
  | "gym"
  | "golf"
  | "cricket"
  | "badminton"
  | "netball"
  | "squash"
  | "default";

const stockImagesBySport: Record<SportKey, string[]> = {
  tennis: [
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
    "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80",
    "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=800&q=80",
    "https://images.unsplash.com/photo-1622279457486-62dbd3a24f50?w=800&q=80",
    "https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=800&q=80",
    "https://images.unsplash.com/photo-1571019613531-039efbfeb4d8?w=800&q=80",
    "https://images.unsplash.com/photo-1529926706528-db9e5010cd3e?w=800&q=80",
    "https://images.unsplash.com/photo-1620741365066-ac45060a7f89?w=800&q=80",
  ],
  soccer: [
    "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=800&q=80",
    "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=800&q=80",
    "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800&q=80",
    "https://images.unsplash.com/photo-1518604666860-9ed391f76460?w=800&q=80",
    "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800&q=80",
    "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=800&q=80",
  ],
  basketball: [
    "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80",
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
    "https://images.unsplash.com/photo-1577416412292-747c6607f055?w=800&q=80",
    "https://images.unsplash.com/photo-1519861531473-9200262188bf?w=800&q=80",
  ],
  pickleball: [
    "https://images.unsplash.com/photo-1613153739112-2f6b2e6bdd59?w=800&q=80",
    "https://images.unsplash.com/photo-1620741221631-4dc0b8031a41?w=800&q=80",
  ],
  swimming: [
    "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&q=80",
    "https://images.unsplash.com/photo-1561579890-3ace74d69978?w=800&q=80",
    "https://images.unsplash.com/photo-1572331165267-854da2b021fb?w=800&q=80",
  ],
  gym: [
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80",
    "https://images.unsplash.com/photo-1593079831268-3381b0db4a77?w=800&q=80",
    "https://images.unsplash.com/photo-1558611848-73f7eb4001a1?w=800&q=80",
  ],
  golf: [
    "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&q=80",
    "https://images.unsplash.com/photo-1558365849-6ebd8b0454b2?w=800&q=80",
  ],
  cricket: [
    "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&q=80",
    "https://images.unsplash.com/photo-1594470117722-de4b9a02ebed?w=800&q=80",
  ],
  badminton: [
    "https://images.unsplash.com/photo-1613918431703-aa50889e3be2?w=800&q=80",
    "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&q=80",
  ],
  netball: [
    // Using generic sports set for netball
    "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&q=80",
    "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80",
    "https://images.unsplash.com/photo-1571731956672-f2b94d7dd0cb?w=800&q=80",
  ],
  squash: [
    // Using generic sports set for squash
    "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&q=80",
    "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80",
    "https://images.unsplash.com/photo-1571731956672-f2b94d7dd0cb?w=800&q=80",
  ],
  default: [
    "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&q=80",
    "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80",
    "https://images.unsplash.com/photo-1571731956672-f2b94d7dd0cb?w=800&q=80",
  ],
};

export function getImagesForSport(rawSport?: string | null): string[] {
  const key = (rawSport || "default").toString().toLowerCase() as SportKey;
  if (key in stockImagesBySport) return stockImagesBySport[key as SportKey];
  return stockImagesBySport.default;
}

export function getPrimarySport(venue: { sports?: string[]; sportId?: string | null }): string | undefined {
  if (Array.isArray(venue.sports) && venue.sports.length > 0) return String(venue.sports[0]).toLowerCase();
  if (venue.sportId) return String(venue.sportId).toLowerCase();
  return undefined;
}

// Deterministically select an image index based on venue id so the same venue
// always shows the same stock image across sessions.
export function selectDeterministicImage(images: string[], seedText: string): string {
  if (images.length === 0) return "";
  let hash = 0;
  for (let i = 0; i < seedText.length; i++) {
    hash = (hash * 31 + seedText.charCodeAt(i)) >>> 0;
  }
  const idx = hash % images.length;
  return images[idx];
}

export function getStockImageForVenue(venue: { id?: string; sports?: string[]; sportId?: string | null }): string {
  const sport = getPrimarySport(venue);
  const candidates = getImagesForSport(sport);
  const seed = venue.id || sport || "default";
  return selectDeterministicImage(candidates, seed);
}

export const GENERIC_PLACEHOLDER =
  "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=60";


