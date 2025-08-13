import { Sport, Venue, Game } from "./types";

export const sports: Sport[] = [
  { id: "tennis", name: "Tennis", slug: "tennis" },
  { id: "pickleball", name: "Pickleball", slug: "pickleball" },
  { id: "soccer", name: "Soccer", slug: "soccer" },
  { id: "futsal", name: "Futsal", slug: "futsal" },
];

export const venues: Venue[] = [
  {
    id: "v1",
    name: "Central Park Tennis Center",
    sportId: "tennis",
    address: "123 Park Ave",
    city: "New York",
    latitude: 40.7812,
    longitude: -73.9665,
    amenities: ["Lights", "Locker Room"],
    photos: [],
    bookingUrl: "https://example.com/central-park-tennis",
    terms: "48h cancellation policy.",
    indoorOutdoor: "outdoor",
    isPublic: true,
  },
  {
    id: "v2",
    name: "Brooklyn Pickleball Club",
    sportId: "pickleball",
    address: "456 Court St",
    city: "New York",
    latitude: 40.6782,
    longitude: -73.9442,
    amenities: ["Indoor", "Pro Shop"],
    photos: [],
    bookingUrl: "https://example.com/brooklyn-pickleball",
    terms: "No outside food.",
    indoorOutdoor: "indoor",
    isPublic: true,
  },
  {
    id: "v3",
    name: "Mission Soccer Fields",
    sportId: "soccer",
    address: "789 Valencia St",
    city: "San Francisco",
    latitude: 37.7599,
    longitude: -122.4148,
    amenities: ["Turf", "Lights"],
    photos: [],
    bookingUrl: "https://example.com/mission-soccer",
    terms: "Rain or shine.",
    indoorOutdoor: "outdoor",
    isPublic: true,
  },
];

export const sampleGames: Game[] = [
  {
    id: "g1",
    venueId: "v1",
    hostUserId: "u1",
    startTime: new Date(Date.now() + 86400000).toISOString(),
    minPlayers: 2,
    maxPlayers: 4,
    visibility: "public",
    notes: "Bring your own racket",
    createdAt: new Date().toISOString(),
  },
];
