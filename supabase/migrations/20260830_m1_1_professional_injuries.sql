-- ==============================================================================
-- MIGRACIÓN M1.1: MÓDULO PROFESIONAL DE LESIONES + SEGUIMIENTO DE EVOLUCIÓN
-- ==============================================================================

-- 1. Ampliación incremental de la tabla player_injuries
ALTER TABLE public.player_injuries
  ADD COLUMN IF NOT EXISTS body_structure VARCHAR(100),
  ADD COLUMN IF NOT EXISTS laterality VARCHAR(30) DEFAULT 'no_aplica',
  ADD COLUMN IF NOT EXISTS severity VARCHAR(30) DEFAULT 'Por determinar',
  ADD COLUMN IF NOT EXISTS estimated_min_days INT,
  ADD COLUMN IF NOT EXISTS estimated_max_days INT,
  ADD COLUMN IF NOT EXISTS estimated_return_from DATE,
  ADD COLUMN IF NOT EXISTS estimated_return_to DATE,
  ADD COLUMN IF NOT EXISTS actual_return_date DATE;

-- Índices de búsqueda
CREATE INDEX IF NOT EXISTS idx_player_injuries_structure ON public.player_injuries (body_structure);
CREATE INDEX IF NOT EXISTS idx_player_injuries_severity ON public.player_injuries (severity);

-- 2. Tabla de seguimiento de evolución: player_injury_updates
CREATE TABLE IF NOT EXISTS public.player_injury_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  injury_id UUID NOT NULL REFERENCES public.player_injuries(id) ON DELETE CASCADE,
  update_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  new_expected_return_date DATE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Índices para player_injury_updates
CREATE INDEX IF NOT EXISTS idx_player_injury_updates_injury_date ON public.player_injury_updates (injury_id, update_date DESC);
CREATE INDEX IF NOT EXISTS idx_player_injury_updates_club ON public.player_injury_updates (club_id);

-- RLS en player_injury_updates
ALTER TABLE public.player_injury_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_injury_updates_select_policy" ON public.player_injury_updates;
CREATE POLICY "player_injury_updates_select_policy" ON public.player_injury_updates
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "player_injury_updates_insert_policy" ON public.player_injury_updates;
CREATE POLICY "player_injury_updates_insert_policy" ON public.player_injury_updates
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "player_injury_updates_update_policy" ON public.player_injury_updates;
CREATE POLICY "player_injury_updates_update_policy" ON public.player_injury_updates
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "player_injury_updates_delete_policy" ON public.player_injury_updates;
CREATE POLICY "player_injury_updates_delete_policy" ON public.player_injury_updates
  FOR DELETE USING (auth.role() = 'authenticated');
