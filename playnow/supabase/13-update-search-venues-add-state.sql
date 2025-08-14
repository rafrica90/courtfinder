-- Ensure the search_venues RPC returns state and country so the UI can filter by them

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
  state text,
  country text,
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
)
as $$
begin
  return query
  select
    v.id,
    v.name,
    v.sports,
    v.address,
    v.city,
    v.state,
    v.country,
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

grant execute on function search_venues(text, text[], text, text) to authenticated;
grant execute on function search_venues(text, text[], text, text) to anon;


