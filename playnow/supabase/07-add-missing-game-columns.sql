-- Add missing columns to games table
-- These columns are needed for the UI to display game information properly

-- Add sport column if it doesn't exist
ALTER TABLE games ADD COLUMN IF NOT EXISTS sport text;

-- Add separate date and time columns for easier querying and display
ALTER TABLE games ADD COLUMN IF NOT EXISTS date date;
ALTER TABLE games ADD COLUMN IF NOT EXISTS time time;

-- Add duration column (in hours)
ALTER TABLE games ADD COLUMN IF NOT EXISTS duration numeric DEFAULT 2;

-- Add skill level column
ALTER TABLE games ADD COLUMN IF NOT EXISTS skill_level text DEFAULT 'All Levels';

-- Add host name column
ALTER TABLE games ADD COLUMN IF NOT EXISTS host_name text;

-- Add status column for game status tracking
ALTER TABLE games ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'completed'));

-- Add cost_per_player column for easier pricing display
ALTER TABLE games ADD COLUMN IF NOT EXISTS cost_per_player numeric DEFAULT 0;

-- Update existing games to populate the new columns from start_time
UPDATE games 
SET 
  date = DATE(start_time),
  time = start_time::time
WHERE date IS NULL OR time IS NULL;

-- Create an index on date for faster queries
CREATE INDEX IF NOT EXISTS idx_games_date ON games(date);

-- Create an index on sport for faster filtering
CREATE INDEX IF NOT EXISTS idx_games_sport ON games(sport);
