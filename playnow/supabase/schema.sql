-- CourtFinder Aggregator - MVP Schema
-- Note: Enable RLS and policies after UX is finalized.

create table if not exists sports (
  id text primary key,
  name text not null,
  slug text unique not null
);

create table if not exists venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sport_id text references sports(id) on delete set null,
  address text,
  city text,
  latitude double precision,
  longitude double precision,
  amenities text[] default '{}',
  photos text[] default '{}',
  booking_url text not null,
  terms text,
  indoor_outdoor text check (indoor_outdoor in ('indoor','outdoor','both')),
  is_public boolean default true,
  -- New fields to support richer venue data and multi-sport
  sports text[] default '{}',
  notes text,
  image_urls text[] default '{}',
  maps_url text
);

create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references venues(id) on delete cascade,
  host_user_id uuid not null,
  start_time timestamptz not null,
  min_players int not null,
  max_players int not null,
  visibility text not null check (visibility in ('public','private')),
  notes text,
  cost_instructions text,
  created_at timestamptz not null default now()
);

create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references games(id) on delete cascade,
  user_id uuid not null,
  status text not null check (status in ('joined','waitlist')),
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  user_id uuid primary key,
  display_name text,
  sports_preferences text[] default '{}',
  skill_level text check (skill_level in ('beginner','intermediate','advanced','pro')),
  created_at timestamptz not null default now()
);

create table if not exists clicks (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references venues(id) on delete cascade,
  user_id uuid,
  clicked_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_venues_sport on venues(sport_id);
create index if not exists idx_venues_city on venues(city);
-- Uniqueness on (name, address) to avoid duplicates
create unique index if not exists idx_venues_name_address_unique on venues(name, address);
-- Index for sports array lookups
create index if not exists idx_venues_sports on venues using gin (sports);
create index if not exists idx_games_venue on games(venue_id);
create index if not exists idx_clicks_venue on clicks(venue_id);

-- Enable pg_trgm for better text search ranking
create extension if not exists pg_trgm;
create index if not exists idx_venues_name_trgm on venues using gin (name gin_trgm_ops);
create index if not exists idx_venues_address_trgm on venues using gin (address gin_trgm_ops);

-- Search function to support query + filters
create or replace function search_venues(
  search_query text default null,
  sport_filter text[] default null,
  indoor_outdoor_filter text default null,
  city_filter text default null
)
returns table (
  id uuid,
  name text,
  sports text[],
  address text,
  city text,
  latitude double precision,
  longitude double precision,
  amenities text[],
  photos text[],
  image_urls text[],
  booking_url text,
  terms text,
  notes text,
  indoor_outdoor text,
  is_public boolean
) as $$
begin
  return query
  select 
    v.id,
    v.name,
    v.sports,
    v.address,
    v.city,
    v.latitude,
    v.longitude,
    v.amenities,
    v.photos,
    v.image_urls,
    v.booking_url,
    v.terms,
    v.notes,
    v.indoor_outdoor,
    v.is_public
  from venues v
  where 
    v.is_public = true
    and (search_query is null or 
         v.name ilike '%' || search_query || '%' or 
         v.address ilike '%' || search_query || '%' or
         v.city ilike '%' || search_query || '%' or
         coalesce(v.notes, '') ilike '%' || search_query || '%')
    and (sport_filter is null or v.sports && sport_filter)
    and (indoor_outdoor_filter is null or v.indoor_outdoor = indoor_outdoor_filter)
    and (city_filter is null or v.city ilike '%' || city_filter || '%')
  order by 
    case 
      when search_query is not null then
        similarity(v.name, search_query) + similarity(coalesce(v.address,''), search_query) * 0.5
      else 0
    end desc,
    v.name;
end;
$$ language plpgsql;
