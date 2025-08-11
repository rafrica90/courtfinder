# Supabase SQL Setup Files

## Overview
These SQL files set up test data for the game join/leave functionality. Run them in order in your Supabase SQL Editor.

## Files to Run (in order):

### 1. `01-add-sport-column.sql`
Adds a 'sport' column to the games table if it doesn't exist.

### 2. `02-insert-test-venue.sql`
Creates a test venue (Central Park Tennis Center) with ID 'v1'.

### 3. `03-insert-test-game.sql`
Creates a test game with ID 'g1' that will be accessible at `/games/g1`.

### 4. `04-clear-participants.sql`
Clears any existing participants for game 'g1' to ensure clean test data.

### 5. `05-add-participants.sql`
Adds test participants:
- user1 (Host) - joined
- user3 (Sarah Chen) - joined  
- user4 (Mike Wilson) - joined
- user5 (Emma Davis) - waitlist

### 6. `06-verify-setup.sql`
Verifies the setup was successful. Should show:
- Game 'g1' with 3 joined players and 1 on waitlist
- List of all participants with their status

## How to Use

1. Open your Supabase Dashboard
2. Navigate to the SQL Editor
3. Copy and paste each file's contents one by one
4. Run each script in order (wait for each to complete)
5. The last script (06-verify-setup.sql) will show you the results

## Testing the Application

After running all scripts:

1. Start your dev server: `npm run dev`
2. Navigate to: `http://localhost:3000/games/g1`
3. The page uses `currentUserId = "user2"` by default (not in the game)
4. Click "Join Game" to join as user2
5. Click "Leave Game" to test leaving functionality
6. The change will persist in the database

## Troubleshooting

If you get errors:
- Make sure you're running the scripts in order
- Check that your database has the required tables (games, venues, participants)
- Verify your Supabase connection in `.env.local`

## Testing Different Scenarios

To test as different users, edit line 67 in `/src/app/games/[id]/page.tsx`:
```javascript
const [currentUserId] = useState("user3"); // Change user ID here
```

- `"user1"` - Will show as host (can't leave, can edit/cancel)
- `"user2"` - Not in game (can join)
- `"user3"` - Already joined (can leave)
- `"user5"` - On waitlist (can leave waitlist)
