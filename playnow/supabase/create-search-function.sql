-- Create search_venues function if it doesn't exist
-- This function allows searching venues with various filters

CREATE OR REPLACE FUNCTION search_venues(
  search_query TEXT DEFAULT NULL,
  sport_filter TEXT[] DEFAULT NULL,
  indoor_outdoor_filter TEXT DEFAULT NULL,
  city_filter TEXT DEFAULT NULL
)
  RETURNS TABLE (
  id UUID,
  name TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  phone TEXT,
  website TEXT,
  email TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  hours JSONB,
  amenities TEXT[],
  sports TEXT[],
  booking_required BOOLEAN,
  booking_link TEXT,
  description TEXT,
  notes TEXT,
  indoor_outdoor TEXT,
    image_urls TEXT[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.name,
    v.address,
    v.city,
    v.state,
    v.zip,
    v.phone,
    v.website,
    v.email,
    v.latitude,
    v.longitude,
    v.hours,
    v.amenities,
    v.sports,
    v.booking_required,
    v.booking_link,
    v.description,
    v.notes,
    v.indoor_outdoor,
    v.image_urls,
    v.created_at,
    v.updated_at
  FROM venues v
  WHERE 
    -- Search query filter (searches multiple fields)
    (search_query IS NULL OR 
     v.name ILIKE '%' || search_query || '%' OR 
     v.address ILIKE '%' || search_query || '%' OR 
     v.city ILIKE '%' || search_query || '%' OR
     v.notes ILIKE '%' || search_query || '%')
    AND
    -- Sport filter
    (sport_filter IS NULL OR 
     v.sports && sport_filter)
    AND
    -- Indoor/Outdoor filter
    (indoor_outdoor_filter IS NULL OR 
     v.indoor_outdoor = indoor_outdoor_filter)
    AND
    -- City filter
    (city_filter IS NULL OR 
     v.city ILIKE '%' || city_filter || '%');
END;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION search_venues TO authenticated;
GRANT EXECUTE ON FUNCTION search_venues TO anon;
