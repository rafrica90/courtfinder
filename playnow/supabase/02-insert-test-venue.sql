-- Step 2: Insert a test venue for our test game
-- This creates the Central Park Tennis Center venue with ID 'v1'

INSERT INTO venues (id, name, address, city, sports, amenities, booking_url)
VALUES (
  'v1'::uuid,
  'Central Park Tennis Center',
  '123 Park Ave, New York, NY 10001',
  'New York',
  ARRAY['Tennis'],
  ARRAY['Lights', 'Pro Shop', 'Locker Rooms', 'Parking'],
  'https://example.com/book'
) ON CONFLICT (name, address) DO NOTHING;
