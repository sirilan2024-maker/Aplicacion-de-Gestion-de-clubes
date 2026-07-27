-- Migration to add is_senior flag to players table
ALTER TABLE players ADD COLUMN IF NOT EXISTS is_senior BOOLEAN DEFAULT false;
