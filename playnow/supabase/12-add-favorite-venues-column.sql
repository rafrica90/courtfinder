-- Add favorite_venues column to profiles for saving user favorite venues
alter table if exists profiles
  add column if not exists favorite_venues text[] default '{}';


