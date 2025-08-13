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
  // Single canonical image for each of these sports
  tennis: [
    // Tennis image (Unsplash CDN)
    "https://images.unsplash.com/photo-1595435742656-5272d0b3fa82?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTV8fHRlbm5pc3xlbnwwfHwwfHx8Mg%3D%3D",
  ],
  soccer: [
    "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=800&q=80",
  ],
  // Restrict all non-target sports to reuse the allowed image set (tennis/pickleball/soccer)
  basketball: [
    "https://images.unsplash.com/photo-1595435742656-5272d0b3fa82?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTV8fHRlbm5pc3xlbnwwfHwwfHx8Mg%3D%3D",
    "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=800&q=80",
    "https://images.unsplash.com/photo-1693142517898-2f986215e412?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8cGlja2xlYmFsbHxlbnwwfHwwfHx8MA%3D%3D",
  ],
  pickleball: [
    // Pickleball court overhead (Unsplash CDN)
    "https://images.unsplash.com/photo-1693142517898-2f986215e412?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8cGlja2xlYmFsbHxlbnwwfHwwfHx8MA%3D%3D",
  ],
  swimming: [
    "https://images.unsplash.com/photo-1595435742656-5272d0b3fa82?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTV8fHRlbm5pc3xlbnwwfHwwfHx8Mg%3D%3D",
    "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=800&q=80",
    "https://images.unsplash.com/photo-1693142517898-2f986215e412?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8cGlja2xlYmFsbHxlbnwwfHwwfHx8MA%3D%3D",
  ],
  gym: [
    "https://images.unsplash.com/photo-1595435742656-5272d0b3fa82?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTV8fHRlbm5pc3xlbnwwfHwwfHx8Mg%3D%3D",
    "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=800&q=80",
    "https://images.unsplash.com/photo-1693142517898-2f986215e412?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8cGlja2xlYmFsbHxlbnwwfHwwfHx8MA%3D%3D",
  ],
  golf: [
    "https://images.unsplash.com/photo-1595435742656-5272d0b3fa82?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTV8fHRlbm5pc3xlbnwwfHwwfHx8Mg%3D%3D",
    "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=800&q=80",
    "https://images.unsplash.com/photo-1693142517898-2f986215e412?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8cGlja2xlYmFsbHxlbnwwfHwwfHx8MA%3D%3D",
  ],
  cricket: [
    "https://images.unsplash.com/photo-1595435742656-5272d0b3fa82?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTV8fHRlbm5pc3xlbnwwfHwwfHx8Mg%3D%3D",
    "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=800&q=80",
    "https://images.unsplash.com/photo-1693142517898-2f986215e412?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8cGlja2xlYmFsbHxlbnwwfHwwfHx8MA%3D%3D",
  ],
  badminton: [
    "https://images.unsplash.com/photo-1595435742656-5272d0b3fa82?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTV8fHRlbm5pc3xlbnwwfHwwfHx8Mg%3D%3D",
    "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=800&q=80",
    "https://images.unsplash.com/photo-1693142517898-2f986215e412?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8cGlja2xlYmFsbHxlbnwwfHwwfHx8MA%3D%3D",
  ],
  netball: [
    "https://images.unsplash.com/photo-1595435742656-5272d0b3fa82?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTV8fHRlbm5pc3xlbnwwfHwwfHx8Mg%3D%3D",
    "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=800&q=80",
    "https://images.unsplash.com/photo-1693142517898-2f986215e412?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8cGlja2xlYmFsbHxlbnwwfHwwfHx8MA%3D%3D",
  ],
  squash: [
    "https://images.unsplash.com/photo-1595435742656-5272d0b3fa82?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTV8fHRlbm5pc3xlbnwwfHwwfHx8Mg%3D%3D",
    "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=800&q=80",
    "https://images.unsplash.com/photo-1693142517898-2f986215e412?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8cGlja2xlYmFsbHxlbnwwfHwwfHx8MA%3D%3D",
  ],
  default: [
    "https://images.unsplash.com/photo-1595435742656-5272d0b3fa82?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTV8fHRlbm5pc3xlbnwwfHwwfHx8Mg%3D%3D",
    "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=800&q=80",
    "https://images.unsplash.com/photo-1693142517898-2f986215e412?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8cGlja2xlYmFsbHxlbnwwfHwwfHx8MA%3D%3D",
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


