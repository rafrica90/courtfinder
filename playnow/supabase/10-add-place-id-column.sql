-- Add Google Places place_id to venues and index it

alter table if exists venues
  add column if not exists place_id text;

create index if not exists idx_venues_place_id on venues(place_id);


