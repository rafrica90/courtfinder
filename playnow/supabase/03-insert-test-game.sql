-- Step 3: Insert test game with ID 'g1'
-- This is the game that will be displayed on /games/g1

INSERT INTO games (
  id, 
  venue_id, 
  host_user_id, 
  sport, 
  start_time, 
  min_players, 
  max_players, 
  visibility, 
  notes, 
  cost_instructions
)
VALUES (
  'g1'::uuid,
  'v1'::uuid,
  'user1'::uuid,
  'Tennis',
  NOW() + INTERVAL '2 hours',
  2,
  4,
  'public',
  'Bring your own racket! We''ll be playing doubles. Looking for intermediate to advanced players.',
  '$15 per person. Payment via Venmo or cash at the venue.'
) 
ON CONFLICT (id) DO UPDATE SET
  sport = EXCLUDED.sport,
  start_time = EXCLUDED.start_time,
  notes = EXCLUDED.notes,
  cost_instructions = EXCLUDED.cost_instructions;
