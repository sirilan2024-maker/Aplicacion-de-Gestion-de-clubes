-- Migration: Add dorsal column to players table
-- This is required because the frontend heavily depends on player.dorsal in multiple views

ALTER TABLE public.players ADD COLUMN IF NOT EXISTS dorsal integer;
