## Updating Venue Data: End-to-End Guide

This guide explains how to push updated venue data to the database safely and repeatably using the existing scripts in `playnow/scripts/`.

### 1) Prerequisites

- Create a `.env.local` in `playnow/` using `ENV_EXAMPLE.md`.
- Required variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY` for read-only/export)
  - `HERE_API_KEY` (for geocoding)
- macOS example:
```bash
cd /Users/ram/FINDDDDDD/playnow
# Create .env.local and populate with values shown in ENV_EXAMPLE.md
touch .env.local
# Open .env.local and paste the keys from ENV_EXAMPLE.md with real values
open -e .env.local
```

### 2) Quick reference: scripts

- Export all venues to CSV:
```bash
npm run export:venues -- /Users/ram/FINDDDDDD/playnow/CSVs/all-venues-from-db.csv
```
- Import venues from a CSV (adds new, updates missing coords on matches):
```bash
npm run import:csv -- "/absolute/path/to/your-file.csv"
```
- Update booking links from a CSV with corrected URLs:
```bash
npm run update:booking -- "/absolute/path/to/Booking Link Status Updated.csv"
```
- Update supported sports from a CSV (backs up before changes):
```bash
node -r dotenv/config scripts/update-venue-sports-from-csv.mjs "/absolute/path/to/Venue Sports Verified Data.csv"
```
- Geocode missing coordinates for existing venues:
```bash
npm run geocode:venues
```
- Normalize/cleanup cities and locations (optional targeted fixes):
```bash
npm run update:cities
npm run normalize:locations
```

Notes:
- All `npm run` targets execute from `/Users/ram/FINDDDDDD/playnow`. Use quotes for paths with spaces.
- Sports update backups are written under `playnow/CSVs/backup-before-sports-update-<timestamp>.*`.

### 3) CSV field expectations

Importing venues (`scripts/import-csv-venues.mjs`) accepts flexible headers. Preferred headers in parentheses are examples:
- name: `Name` or `Venue Name` or `venue_name` (required)
- address: `Address` or `address` (required)
- suburb/city: `Suburb/City` or `City` (optional but improves matching)
- state: `State` (optional)
- postcode: `Postcode` or `Postal Code` (optional)
- booking URL: `Booking URL` or `Booking Link` or `booking_url` (required)
- sports: `Sport(s)` or `Sport` or `sports` (optional; comma/semicolon/“and” split)
- indoor/outdoor: `Indoor/Outdoor` or `indoor_outdoor` (values: indoor|outdoor|both)
- description/notes: `Description` or `notes` (optional)
- image URLs array: `image_urls` (JSON-like or comma list)
- amenities array: `Amenities` or `amenities`
- backup image URLs array: `backup_urls`

Booking link updates (`scripts/update-booking-links.mjs`) expect per-row:
- existing name + suburb/city + address (for matching) and/or existing `Booking URL`
- a corrected URL in one of: `Correct Booking URL`, `Updated Booking URL`, `New Booking URL`, `Fixed Booking URL`, `Correct Link`, `Correct URL`

Sports updates (`scripts/update-venue-sports-from-csv.mjs`) expect:
- `id` (required)
- `supported_sports` or `sports` (comma/semicolon/“and” split; normalized to lower-case; first entry becomes `sport_id`)

### 4) Recommended workflow

1. Export a snapshot for reference/QA:
```bash
npm run export:venues -- /Users/ram/FINDDDDDD/playnow/CSVs/all-venues-from-db.csv
```
2. Prepare/update your input CSV(s) following the field expectations above.
3. Import new venues (dedupes by normalized booking URL and name+city):
```bash
npm run import:csv -- "/absolute/path/to/your-new-venues.csv"
```
4. Apply booking link corrections if you have them:
```bash
npm run update:booking -- "/absolute/path/to/Booking Link Status Updated.csv"
```
5. Update supported sports from curator CSV (auto-backup first):
```bash
node -r dotenv/config scripts/update-venue-sports-from-csv.mjs "/absolute/path/to/Venue Sports Verified Data.csv"
```
6. Geocode any venues missing coordinates:
```bash
npm run geocode:venues
```
7. Optional normalizations/fixes:
```bash
npm run update:cities
npm run normalize:locations
```
8. Re-export to confirm changes and for auditing:
```bash
npm run export:venues -- /Users/ram/FINDDDDDD/playnow/CSVs/all-venues-from-db.csv
```

### 5) How the scripts behave (safety + matching)

- Import from CSV:
  - Fetches existing venues; matches by normalized `booking_url` and by `name`+`city`.
  - If a match exists and coordinates are missing, it updates only coordinates (if HERE returns a result).
  - If no match, prepares an insert. Inserts are upserted on `(name,address)` to avoid dupes.
  - Optional description is derived from booking page if not provided.
- Booking link updates:
  - Tries name+city match first, then current booking URL match; skips unchanged duplicates; logs summary.
- Sports updates:
  - Reads `id` + sports; backs up current `id,name,sport_id,sports` to `playnow/CSVs/` with timestamp; then updates per row.
- Geocoding:
  - Only updates rows with missing `latitude`/`longitude`. Uses `HERE_API_KEY` and adds country hint.

### 6) Troubleshooting

- "Missing required env var": verify `.env.local` contains required variables and you’re in `playnow/` when running commands.
- CSV parsing issues: ensure the first non-empty row is the header; quote fields with commas; keep UTF-8 encoding.
- Paths with spaces: wrap the path argument in double quotes.
- HERE API limits: re-run later or split work; the scripts pace requests but large batches can still hit limits.

### 7) Audit files and backups

- Sports updates write backups to `playnow/CSVs/backup-before-sports-update-<timestamp>.{csv,json}`.
- Consider committing relevant CSV inputs and backups to git for traceability.

### 8) Examples

```bash
cd /Users/ram/FINDDDDDD/playnow
npm run import:csv -- "/Users/ram/Downloads/Melbourne Bookable Sports Venues.csv"
npm run update:booking -- "/Users/ram/Downloads/Booking Link Status Updated.csv"
node -r dotenv/config scripts/update-venue-sports-from-csv.mjs "/Users/ram/Downloads/Venue Sports Verified Data.csv"
npm run geocode:venues
npm run export:venues -- /Users/ram/FINDDDDDD/playnow/CSVs/all-venues-from-db.csv
```

That’s it. Use this doc as the canonical process for updating venue data.


