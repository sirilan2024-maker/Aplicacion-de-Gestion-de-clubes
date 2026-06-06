-- 00016_mvp_votes.sql
-- ====================================
-- Table to store MVP votes per match
-- ====================================

CREATE TABLE IF NOT EXISTS public.mvp_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.partidos(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  voter_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now()
);

-- Index for quick look‑up per match
CREATE INDEX IF NOT EXISTS idx_mvp_votes_match ON public.mvp_votes (match_id);

-- RLS Policies
-- Allow admins and entrenadores to SELECT any votes
CREATE POLICY select_mvp_votes_admin ON public.mvp_votes
  FOR SELECT USING (auth.role() = ANY(ARRAY['admin', 'entrenador']));

-- Players and families can SELECT votes of matches they belong to
CREATE POLICY select_mvp_votes_family ON public.mvp_votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (p.rol = 'familia' OR p.rol = 'jugador')
        AND p.team_id = (
          SELECT t.id FROM public.partidos m
          JOIN public.teams t ON m.team_home_id = t.id OR m.team_away_id = t.id
          WHERE m.id = match_id
        )
    )
  );

-- Insert policy: only admin or entrenadores can insert, and the voted player must belong to the same team as the match
CREATE POLICY insert_mvp_votes ON public.mvp_votes
  FOR INSERT USING (
    auth.role() = ANY(ARRAY['admin', 'entrenador']) AND
    EXISTS (
      SELECT 1 FROM public.partidos m
      JOIN public.players p ON p.id = player_id
      WHERE m.id = match_id AND (
        p.team_id = m.team_home_id OR p.team_id = m.team_away_id
      )
    )
  );

-- Ensure a user can vote only once per match
CREATE UNIQUE INDEX IF NOT EXISTS uniq_mvp_vote_per_user_match ON public.mvp_votes (match_id, voter_profile_id);

ALTER TABLE public.mvp_votes ENABLE ROW LEVEL SECURITY;
