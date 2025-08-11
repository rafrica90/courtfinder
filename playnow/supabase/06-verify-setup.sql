-- Step 6: Verify the setup was successful
-- This should show: game 'g1' with 3 joined players and 1 on waitlist

SELECT 
  g.id as game_id,
  g.sport,
  g.min_players,
  g.max_players,
  COUNT(CASE WHEN p.status = 'joined' THEN 1 END) as joined_count,
  COUNT(CASE WHEN p.status = 'waitlist' THEN 1 END) as waitlist_count
FROM games g
LEFT JOIN participants p ON g.id = p.game_id
WHERE g.id = 'g1'::uuid
GROUP BY g.id, g.sport, g.min_players, g.max_players;

-- Also show the actual participants
SELECT 
  p.user_id,
  p.status,
  p.created_at
FROM participants p
WHERE p.game_id = 'g1'::uuid
ORDER BY p.created_at;
