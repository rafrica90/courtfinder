-- Step 1: Add sport column to games table (if it doesn't already exist)
-- This column is needed to store what sport the game is for

ALTER TABLE games ADD COLUMN IF NOT EXISTS sport text;
