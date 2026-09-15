-- Add season_id column to player_apparel to isolate kit requests & deliveries per season
ALTER TABLE public.player_apparel ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE;
