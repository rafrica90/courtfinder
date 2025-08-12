#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the venue images mapping
const venueImages = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'venue-images.json'), 'utf-8')
);

// Read the current venues.json
const venuesPath = path.join(__dirname, '..', 'venues.json');
const venuesData = JSON.parse(fs.readFileSync(venuesPath, 'utf-8'));

// Working image URLs categorized by sport type
const sportImageMap = {
  tennis: venueImages.working_image_sources.tennis_courts,
  soccer: venueImages.working_image_sources.soccer_fields,
  basketball: venueImages.working_image_sources.basketball_courts,
  pickleball: venueImages.working_image_sources.pickleball_courts,
  swimming: venueImages.working_image_sources.swimming_pools,
  gym: venueImages.working_image_sources.gym_fitness,
  golf: venueImages.working_image_sources.golf_courses,
  cricket: venueImages.working_image_sources.cricket_grounds,
  badminton: venueImages.working_image_sources.badminton_courts,
  netball: venueImages.working_image_sources.generic_sports,
  squash: venueImages.working_image_sources.generic_sports,
  default: venueImages.working_image_sources.generic_sports
};

// Function to get appropriate images for a venue
function getVenueImages(venue, index) {
  // Check if we have a specific mapping for this venue
  if (venueImages.venue_specific_mapping[venue.venue_name]) {
    return [venueImages.venue_specific_mapping[venue.venue_name]];
  }

  // Determine the sport type
  let sportType = 'default';
  if (venue.sports && venue.sports.length > 0) {
    const sport = venue.sports[0].toLowerCase();
    if (sportImageMap[sport]) {
      sportType = sport;
    }
  }

  // Get images for this sport type
  const availableImages = sportImageMap[sportType] || sportImageMap.default;
  
  // Return 1-3 images, cycling through available images
  const numImages = Math.min(3, availableImages.length);
  const images = [];
  for (let i = 0; i < numImages; i++) {
    const imageIndex = (index + i) % availableImages.length;
    images.push(availableImages[imageIndex]);
  }
  
  return images;
}

// Update venues with working image URLs
let imageIndex = 0;
venuesData.sydney_sports_venues = venuesData.sydney_sports_venues.map((venue) => {
  const workingImages = getVenueImages(venue, imageIndex);
  imageIndex++;
  
  return {
    ...venue,
    image_urls: workingImages,
    // Keep original URLs as backup_urls for reference
    backup_urls: venue.image_urls
  };
});

// Save the updated venues.json
const updatedJson = JSON.stringify(venuesData, null, 2);
fs.writeFileSync(venuesPath, updatedJson);

console.log('✅ Updated venues.json with working image URLs');
console.log(`📸 Processed ${venuesData.sydney_sports_venues.length} venues`);

// Generate a report
const report = venuesData.sydney_sports_venues.map(v => ({
  name: v.venue_name,
  sport: v.sports?.[0] || 'unknown',
  images: v.image_urls.length
}));

console.log('\n📊 Image Update Report:');
console.table(report.slice(0, 10)); // Show first 10 venues
console.log('...');
