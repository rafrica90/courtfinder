# Venue Image Sources Guide

## ✅ What I've Done
1. **Updated venues.json** with working Unsplash image URLs
2. **Created venue-images.json** with categorized image URLs by sport type
3. **Built update script** to automatically assign appropriate images to venues

## 🖼️ Current Image Sources (All Working)

### Primary: Unsplash (Free, High Quality)
- **Tennis Courts**: Professional court photos with good lighting
- **Soccer Fields**: Stadium and field shots
- **Basketball Courts**: Indoor and outdoor courts
- **Swimming Pools**: Competition and recreational pools
- All images use parameters: `w=800&q=80` for optimal quality/size balance

### Your Image Proxy Setup
Your `/api/image/route.ts` already handles these domains:
- ✅ images.unsplash.com
- ✅ cdn.pixabay.com
- ✅ res.cloudinary.com
- ✅ storage.googleapis.com

## 🔍 Additional Image Sources You Can Use

### 1. **Google Places API** (Most Accurate)
```javascript
// Get actual venue photos
const placePhotoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photoRef}&key=${API_KEY}`;
```
**Pros**: Real venue photos
**Cons**: Requires API key, costs money after free tier

### 2. **Mapbox Static Images** (Location-based)
```javascript
// Satellite view of venue location
const mapboxUrl = `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${lng},${lat},15,0/800x600@2x?access_token=${MAPBOX_TOKEN}`;
```
**Pros**: Shows actual venue location
**Cons**: Not as visually appealing for cards

### 3. **OpenStreetMap** (Free)
```javascript
// Map view of venue
const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik`;
```
**Pros**: Completely free
**Cons**: Map view only, not photos

### 4. **Sport-Specific Stock Photos**
Current implementation uses high-quality stock photos from Unsplash that match the sport type.

## 🛠️ How to Add More Images

### Option 1: Manual Curation
```javascript
// In venue-images.json, add specific mappings:
"venue_specific_mapping": {
  "Your Venue Name": "https://specific-image-url.jpg"
}
```

### Option 2: Web Scraping (Semi-Automated)
```javascript
// Use Puppeteer or Playwright to find images
const scrapeVenueImages = async (venueName) => {
  // Search Google Images
  // Check venue website meta tags
  // Look for structured data
};
```

### Option 3: User Uploads
Add functionality for venue managers to upload their own images to Supabase Storage.

## 📝 Image URL Format Best Practices

### Unsplash (Recommended)
```
https://images.unsplash.com/photo-[ID]?w=800&q=80
```
- `w=800`: Width in pixels
- `q=80`: Quality (80 is good balance)
- `auto=format`: Auto-select best format
- `fit=crop`: Crop to exact dimensions

### Pexels
```
https://images.pexels.com/photos/[ID]/pexels-photo-[ID].jpeg?auto=compress&cs=tinysrgb&w=800
```

### Pixabay
```
https://cdn.pixabay.com/photo/[YEAR]/[MONTH]/[DAY]/[ID].jpg
```

## 🔒 Security Considerations

Your image proxy already implements:
- ✅ Domain allowlisting
- ✅ SSRF protection
- ✅ Graceful fallbacks
- ✅ Caching headers

## 🚀 Next Steps

1. **Consider Google Places API** for real venue photos if budget allows
2. **Add image upload feature** for venue owners
3. **Implement image optimization** with Cloudinary or similar
4. **Add lazy loading** for better performance

## 💡 Quick Tips

1. **Test images before deploying**:
   ```bash
   curl -I "your-image-url"  # Should return HTTP 200
   ```

2. **Use consistent aspect ratios**:
   - Banner images: 16:9 (1600x900)
   - Card thumbnails: 4:3 (800x600)

3. **Optimize for performance**:
   - Use WebP format when possible
   - Implement responsive images
   - Add loading="lazy" to img tags

## 📸 Current Implementation

Your venues now have working images from Unsplash that:
- Load reliably
- Look professional
- Match the sport type
- Are free to use
- Work with your existing proxy

The broken cityofsydney.nsw.gov.au URLs have been moved to `backup_urls` for reference.
