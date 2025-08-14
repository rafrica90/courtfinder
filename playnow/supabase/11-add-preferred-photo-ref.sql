-- Allow manual pinning of a specific Google Place photo per venue

alter table if exists venues
  add column if not exists preferred_photo_ref text;

create index if not exists idx_venues_preferred_photo_ref on venues(preferred_photo_ref);


