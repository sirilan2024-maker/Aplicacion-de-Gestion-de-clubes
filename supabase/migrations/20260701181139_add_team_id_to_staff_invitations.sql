ALTER TABLE public.staff_invitations ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;
