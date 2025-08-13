-- Optional migration to extend profiles with phone and location
alter table if exists profiles add column if not exists phone text;
alter table if exists profiles add column if not exists location text;
alter table if exists profiles add column if not exists city text;
alter table if exists profiles add column if not exists country_code text;
alter table if exists profiles add column if not exists suburb text;
alter table if exists profiles add column if not exists state text;
-- Store per-sport skill levels as a JSON map: { "tennis": "intermediate", ... }
alter table if exists profiles add column if not exists sport_skill_levels jsonb default '{}'::jsonb;


-- Enforce E.164 format for phone (e.g., +14155552671), max 15 digits after '+'
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_phone_format'
  ) then
    alter table if exists profiles
      add constraint profiles_phone_format
      check (
        phone is null or phone ~ '^\+[1-9]\d{1,14}$'
      );
  end if;
end$$;

-- Cap location length to avoid abuse; adjust as needed
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_location_length'
  ) then
    alter table if exists profiles
      add constraint profiles_location_length
      check (
        location is null or char_length(location) <= 120
      );
  end if;
end$$;

-- Cap city length to avoid abuse
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_city_length'
  ) then
    alter table if exists profiles
      add constraint profiles_city_length
      check (
        city is null or char_length(city) <= 120
      );
  end if;
end$$;

-- Restrict country_code to ISO-3166-1 alpha-2 format (2 letters)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_country_code_format'
  ) then
    alter table if exists profiles
      add constraint profiles_country_code_format
      check (
        country_code is null or country_code ~ '^[A-Za-z]{2}$'
      );
  end if;
end$$;

-- Cap suburb length
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_suburb_length'
  ) then
    alter table if exists profiles
      add constraint profiles_suburb_length
      check (
        suburb is null or char_length(suburb) <= 120
      );
  end if;
end$$;

-- Cap state length
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_state_length'
  ) then
    alter table if exists profiles
      add constraint profiles_state_length
      check (
        state is null or char_length(state) <= 120
      );
  end if;
end$$;

-- Ensure each non-null phone is unique
create unique index if not exists idx_profiles_phone_unique_nonnull
  on profiles (phone)
  where phone is not null;

-- Remove price fields from venues (cleanup)
do $$
begin
  if exists (
    select 1 from information_schema.columns 
    where table_name = 'venues' and column_name = 'price_estimate'
  ) then
    alter table if exists venues drop column price_estimate;
  end if;
  if exists (
    select 1 from information_schema.columns 
    where table_name = 'venues' and column_name = 'price_estimate_text'
  ) then
    alter table if exists venues drop column price_estimate_text;
  end if;
end$$;

-- Drop old function before recreating with new return type
drop function if exists search_venues(text, text[], text, text);

-- Recreate search_venues function without price columns
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

-- Re-grant execute privileges
grant execute on function search_venues(text, text[], text, text) to authenticated;
grant execute on function search_venues(text, text[], text, text) to anon;


-- Canonical sports normalization -------------------------------------------------

-- Seed canonical sports (ids are canonical slugs)
insert into sports (id, name, slug) values
  ('tennis', 'Tennis', 'tennis'),
  ('pickleball', 'Pickleball', 'pickleball'),
  ('soccer', 'Soccer', 'soccer'),
  ('futsal', 'Futsal', 'futsal')
on conflict (id) do update set name = excluded.name, slug = excluded.slug;

-- Synonyms table for fuzzy/variant sport names
create table if not exists sport_synonyms (
  alias text primary key,
  sport_id text references sports(id) on delete cascade
);

-- Populate/refresh common synonyms (lowercased aliases)
insert into sport_synonyms (alias, sport_id) values
  ('tennis', 'tennis'),
  ('pickleball', 'pickleball'),
  ('soccer', 'soccer'),
  ('football', 'soccer'), -- colloquial in some sources
  ('indoor soccer', 'soccer'),
  ('soccer (indoor)', 'soccer'),
  ('soccer (5-a-side)', 'soccer'),
  ('5-a-side soccer', 'soccer'),
  ('5 a side', 'soccer'),
  ('five a side', 'soccer'),
  ('soccer 5 a side', 'soccer'),
  ('futsal', 'futsal')
on conflict (alias) do update set sport_id = excluded.sport_id;

-- Normalize a single sport string to a canonical slug (or null if unknown)
create or replace function normalize_sport(raw text)
returns text
language plpgsql
as $$
declare
  cleaned text;
  from_synonym text;
  from_table text;
begin
  if raw is null then
    return null;
  end if;
  -- Lowercase, trim, remove parenthetical qualifiers, collapse spaces, strip hyphens/underscores
  cleaned := lower(trim(raw));
  cleaned := regexp_replace(cleaned, '\\s*\\([^)]*\\)\\s*', '', 'g');
  cleaned := replace(cleaned, '_', ' ');
  cleaned := replace(cleaned, '-', ' ');
  cleaned := regexp_replace(cleaned, '\\s+', ' ', 'g');

  select s.sport_id into from_synonym
  from sport_synonyms s
  where s.alias = cleaned
  limit 1;
  if from_synonym is not null then
    return from_synonym;
  end if;

  select sp.slug into from_table
  from sports sp
  where lower(sp.slug) = cleaned or lower(sp.name) = cleaned
  limit 1;
  if from_table is not null then
    return from_table;
  end if;

  return null;
end;
$$;

-- Normalize an array of sports to distinct canonical slugs
create or replace function normalize_sports(arr text[])
returns text[]
language sql
stable
as $$
  select coalesce(array_agg(distinct v) filter (where v is not null), '{}'::text[])
  from (
    select normalize_sport(x) as v
    from unnest(coalesce(arr, '{}'::text[])) as x
  ) t;
$$;

-- Trigger to normalize venue sports on write
create or replace function ensure_normalized_venue_sports()
returns trigger
language plpgsql
as $$
begin
  new.sports := normalize_sports(new.sports);
  new.sport_id := normalize_sport(new.sport_id);
  if new.sport_id is null and array_length(new.sports, 1) is not null and array_length(new.sports, 1) > 0 then
    new.sport_id := new.sports[1];
  end if;
  if new.sport_id is not null and (new.sports is null or not (new.sport_id = any(coalesce(new.sports, '{}'::text[])))) then
    new.sports := array_append(coalesce(new.sports, '{}'::text[]), new.sport_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_normalize_venue_sports on venues;
create trigger trg_normalize_venue_sports
before insert or update of sports, sport_id on venues
for each row execute function ensure_normalized_venue_sports();

-- One-time data cleanup: normalize all existing venue sports
update venues
set sports = normalize_sports(sports),
    sport_id = normalize_sport(sport_id);

update venues
set sport_id = case when sport_id is null and array_length(sports, 1) is not null and array_length(sports, 1) > 0 then sports[1] else sport_id end
where sport_id is null;
