export type Sport = {
  id: string;
  name: string;
  slug: string;
};

export type Venue = {
  id: string;
  name: string;
  sportId?: string;
  sports?: string[]; // multi-sport support
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  amenities: string[];
  photos: string[];
  imageUrls?: string[];
  bookingUrl: string;
  terms?: string;
  indoorOutdoor?: "indoor" | "outdoor" | "both";
  isPublic: boolean;
  notes?: string;
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
  status: "joined" | "waitlist";
};

export type Profile = {
  userId: string;
  displayName: string;
  sportsPreferences: string[]; // sport slugs
  skillLevel?: "beginner" | "intermediate" | "advanced" | "pro";
  phone?: string;
  location?: string;
  city?: string;
  countryCode?: string; // ISO-3166-1 alpha-2
};

export type Click = {
  id: string;
  venueId: string;
  userId?: string | null;
  timestamp: string; // ISO string
};
