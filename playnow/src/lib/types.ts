export type Sport = {
  id: string;
  name: string;
  slug: string;
};

export type SkillLevel = "beginner" | "intermediate" | "advanced" | "pro";

export type Venue = {
  id: string;
  name: string;
  sportId?: string;
  sports?: string[]; // multi-sport support
  address: string;
  city: string;
  state?: string;
  country?: string;
  latitude: number;
  longitude: number;
  place_id?: string;
  // Canonical Google Maps entry URL or link to the venue on Google Maps
  maps_url?: string;
  // Optional structured operating hours coming from the database (JSONB)
  // We keep it as unknown to support multiple shapes (string, object keyed by weekday, etc.)
  hours?: unknown;
  amenities: string[];
  photos: string[];
  imageUrls?: string[];
  bookingUrl: string;
  terms?: string;
  indoorOutdoor?: "indoor" | "outdoor" | "both";
  isPublic: boolean;
  // Optional long-form description for display on cards/details
  description?: string;
  notes?: string;
  preferred_photo_ref?: string;
};

export type Game = {
  id: string;
  venueId: string;
  hostUserId: string;
  startTime: string; // ISO string
  minPlayers: number;
  maxPlayers: number;
  visibility: "public" | "private";
  notes?: string;
  costInstructions?: string;
  createdAt: string; // ISO string
};

export type Participant = {
  id: string;
  gameId: string;
  userId: string;
  status: "pending" | "joined" | "waitlist" | "denied";
};

export type Profile = {
  userId: string;
  displayName: string;
  // Preferred sports by slug. Kept for backwards compatibility.
  sportsPreferences?: string[];
  // Per-sport skill levels, keyed by sport slug
  sportSkillLevels?: Record<string, SkillLevel>;
  // Deprecated: global skill level (prefer sportSkillLevels)
  skillLevel?: SkillLevel;
  phone?: string;
  location?: string;
  city?: string;
  countryCode?: string; // ISO-3166-1 alpha-2
  favoriteVenues?: string[];
};

export type Click = {
  id: string;
  venueId: string;
  userId?: string | null;
  timestamp: string; // ISO string
};
