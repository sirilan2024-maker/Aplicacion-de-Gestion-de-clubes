ALTER TABLE public.team_coaches ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE;

-- Update existing records if any
UPDATE public.team_coaches tc
SET club_id = t.club_id
FROM public.teams t
WHERE tc.team_id = t.id AND tc.club_id IS NULL;
