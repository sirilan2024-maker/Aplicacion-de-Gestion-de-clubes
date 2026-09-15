-- Add is_unlocked, unlocked_at, unlocked_by to seasons table for robust Master Key protection
ALTER TABLE public.seasons ADD COLUMN IF NOT EXISTS is_unlocked BOOLEAN DEFAULT false;
ALTER TABLE public.seasons ADD COLUMN IF NOT EXISTS unlocked_at TIMESTAMPTZ;
ALTER TABLE public.seasons ADD COLUMN IF NOT EXISTS unlocked_by UUID REFERENCES public.profiles(id);
