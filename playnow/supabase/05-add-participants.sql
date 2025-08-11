-- Step 5: Add test participants to the game
-- 3 players joined, 1 on waitlist (game max is 4)

INSERT INTO participants (game_id, user_id, status)
VALUES
  ('g1'::uuid, 'user1'::uuid, 'joined'),   -- Alex Johnson (Host)
  ('g1'::uuid, 'user3'::uuid, 'joined'),   -- Sarah Chen
  ('g1'::uuid, 'user4'::uuid, 'joined'),   -- Mike Wilson
  ('g1'::uuid, 'user5'::uuid, 'waitlist'); -- Emma Davis (on waitlist)
