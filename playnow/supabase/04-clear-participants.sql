-- Step 4: Clear any existing participants for game 'g1'
-- This ensures we start with a clean slate for testing

DELETE FROM participants WHERE game_id = 'g1'::uuid;
