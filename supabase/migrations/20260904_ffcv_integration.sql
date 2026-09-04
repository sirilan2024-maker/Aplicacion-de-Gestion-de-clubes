-- ====================================================================
-- MIGRACIÓN FFCV INTEGRATION: Tablas y extensiones para datos oficiales FFCV
-- ====================================================================

-- 1. Añadir columnas de vinculación a la tabla teams si no existen
ALTER TABLE public.teams 
  ADD COLUMN IF NOT EXISTS ffcv_season_id TEXT,
  ADD COLUMN IF NOT EXISTS ffcv_competition_id TEXT,
  ADD COLUMN IF NOT EXISTS ffcv_group_id TEXT,
  ADD COLUMN IF NOT EXISTS ffcv_team_id TEXT,
  ADD COLUMN IF NOT EXISTS ffcv_url TEXT,
  ADD COLUMN IF NOT EXISTS ffcv_last_synced_at TIMESTAMPTZ;

-- 2. Tabla para Grupos / Competiciones FFCV
CREATE TABLE IF NOT EXISTS public.ffcv_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ffcv_season_id TEXT NOT NULL,
  ffcv_competition_id TEXT NOT NULL,
  ffcv_group_id TEXT NOT NULL,
  season_name TEXT,
  competition_name TEXT,
  group_name TEXT,
  total_matchdays INTEGER DEFAULT 0,
  total_teams INTEGER DEFAULT 0,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT ffcv_groups_unique UNIQUE (ffcv_season_id, ffcv_competition_id, ffcv_group_id)
);

-- 3. Tabla para Clasificación FFCV (por grupo y jornada)
CREATE TABLE IF NOT EXISTS public.ffcv_standings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ffcv_group_id TEXT NOT NULL,
  ffcv_season_id TEXT NOT NULL,
  ffcv_competition_id TEXT NOT NULL,
  matchday INTEGER NOT NULL DEFAULT 1,
  position INTEGER NOT NULL,
  team_ffcv_id TEXT NOT NULL,
  team_name TEXT NOT NULL,
  shield_url TEXT,
  points INTEGER NOT NULL DEFAULT 0,
  played INTEGER NOT NULL DEFAULT 0,
  won INTEGER NOT NULL DEFAULT 0,
  drawn INTEGER NOT NULL DEFAULT 0,
  lost INTEGER NOT NULL DEFAULT 0,
  goals_for INTEGER NOT NULL DEFAULT 0,
  goals_against INTEGER NOT NULL DEFAULT 0,
  goal_difference INTEGER NOT NULL DEFAULT 0,
  penalty_points INTEGER DEFAULT 0,
  home_played INTEGER DEFAULT 0,
  home_won INTEGER DEFAULT 0,
  home_drawn INTEGER DEFAULT 0,
  home_lost INTEGER DEFAULT 0,
  away_played INTEGER DEFAULT 0,
  away_won INTEGER DEFAULT 0,
  away_drawn INTEGER DEFAULT 0,
  away_lost INTEGER DEFAULT 0,
  home_points INTEGER DEFAULT 0,
  away_points INTEGER DEFAULT 0,
  zone_color TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT ffcv_standings_unique UNIQUE (ffcv_group_id, matchday, team_ffcv_id)
);

-- 4. Tabla para Partidos y Resultados FFCV
CREATE TABLE IF NOT EXISTS public.ffcv_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ffcv_match_id TEXT NOT NULL, -- codacta / ID oficial del partido en FFCV
  ffcv_group_id TEXT NOT NULL,
  ffcv_season_id TEXT NOT NULL,
  ffcv_competition_id TEXT NOT NULL,
  matchday INTEGER NOT NULL,
  match_date DATE,
  match_time TIME,
  datetime TIMESTAMPTZ,
  home_team_ffcv_id TEXT NOT NULL,
  away_team_ffcv_id TEXT NOT NULL,
  home_team_name TEXT NOT NULL,
  away_team_name TEXT NOT NULL,
  home_shield_url TEXT,
  away_shield_url TEXT,
  home_score INTEGER,
  away_score INTEGER,
  status TEXT DEFAULT 'scheduled', -- 'scheduled', 'played', 'postponed', 'suspended'
  status_reason TEXT,
  pitch_name TEXT,
  pitch_id TEXT,
  codacta TEXT,
  is_closed BOOLEAN DEFAULT false,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT ffcv_matches_unique UNIQUE (ffcv_match_id)
);

-- 5. Índices para acelerar búsquedas
CREATE INDEX IF NOT EXISTS idx_ffcv_groups_group_id ON public.ffcv_groups(ffcv_group_id);
CREATE INDEX IF NOT EXISTS idx_ffcv_standings_lookup ON public.ffcv_standings(ffcv_group_id, matchday);
CREATE INDEX IF NOT EXISTS idx_ffcv_standings_team ON public.ffcv_standings(team_ffcv_id);
CREATE INDEX IF NOT EXISTS idx_ffcv_matches_group_matchday ON public.ffcv_matches(ffcv_group_id, matchday);
CREATE INDEX IF NOT EXISTS idx_ffcv_matches_home_team ON public.ffcv_matches(home_team_ffcv_id);
CREATE INDEX IF NOT EXISTS idx_ffcv_matches_away_team ON public.ffcv_matches(away_team_ffcv_id);
CREATE INDEX IF NOT EXISTS idx_ffcv_matches_date ON public.ffcv_matches(match_date);

-- 6. Habilitar RLS
ALTER TABLE public.ffcv_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ffcv_standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ffcv_matches ENABLE ROW LEVEL SECURITY;

-- 7. Políticas de Lectura (usuarios de clubes con equipos vinculados o miembros autenticados)
DROP POLICY IF EXISTS "Club members can view their ffcv_groups" ON public.ffcv_groups;
CREATE POLICY "Club members can view their ffcv_groups" ON public.ffcv_groups
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      JOIN public.profiles p ON p.club_id = t.club_id
      WHERE p.id = auth.uid() AND t.ffcv_group_id = ffcv_groups.ffcv_group_id
    )
    OR (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.rol IN ('admin', 'superadmin') OR p.role IN ('admin', 'superadmin')))
    )
  );

DROP POLICY IF EXISTS "Club members can view their ffcv_standings" ON public.ffcv_standings;
CREATE POLICY "Club members can view their ffcv_standings" ON public.ffcv_standings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      JOIN public.profiles p ON p.club_id = t.club_id
      WHERE p.id = auth.uid() AND t.ffcv_group_id = ffcv_standings.ffcv_group_id
    )
    OR (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.rol IN ('admin', 'superadmin') OR p.role IN ('admin', 'superadmin')))
    )
  );

DROP POLICY IF EXISTS "Club members can view their ffcv_matches" ON public.ffcv_matches;
CREATE POLICY "Club members can view their ffcv_matches" ON public.ffcv_matches
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      JOIN public.profiles p ON p.club_id = t.club_id
      WHERE p.id = auth.uid() AND t.ffcv_group_id = ffcv_matches.ffcv_group_id
    )
    OR (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.rol IN ('admin', 'superadmin') OR p.role IN ('admin', 'superadmin')))
    )
  );
