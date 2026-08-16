-- ============================================================
-- Módulo Integral de Entrenamientos v2 — Sporting Saladar
-- Extiende tablas existentes sin romper nada previo
-- ============================================================

-- 1. Habilitar extensión vector (idempotente)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Añadir columnas nuevas a banco_ejercicios (IF NOT EXISTS)
ALTER TABLE public.banco_ejercicios
  ADD COLUMN IF NOT EXISTS age_category       TEXT,
  ADD COLUMN IF NOT EXISTS microcycle_day     TEXT,
  ADD COLUMN IF NOT EXISTS game_phase         TEXT,
  ADD COLUMN IF NOT EXISTS drill_structure    TEXT,
  ADD COLUMN IF NOT EXISTS min_players        INTEGER DEFAULT 4,
  ADD COLUMN IF NOT EXISTS max_players        INTEGER DEFAULT 22,
  ADD COLUMN IF NOT EXISTS intensity_level    INTEGER DEFAULT 3 CHECK (intensity_level BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS tactical_board_data JSONB,
  ADD COLUMN IF NOT EXISTS embedding          vector(768);

-- 3. Añadir columnas nuevas a training_sessions (IF NOT EXISTS)
ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS age_category    TEXT,
  ADD COLUMN IF NOT EXISTS microcycle_day  TEXT,
  ADD COLUMN IF NOT EXISTS intensity_load  INTEGER DEFAULT 3 CHECK (intensity_load BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS coach_notes     TEXT;

-- 4. Tabla session_drills (nueva, más estructurada que sesiones_ejercicios)
CREATE TABLE IF NOT EXISTS public.session_drills (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id    UUID REFERENCES public.training_sessions(id) ON DELETE CASCADE NOT NULL,
  drill_id      UUID REFERENCES public.banco_ejercicios(id) ON DELETE CASCADE NOT NULL,
  phase         TEXT NOT NULL DEFAULT 'main_1'
                  CHECK (phase IN ('warmup','main_1','main_2','cooldown')),
  order_index   INTEGER NOT NULL DEFAULT 1,
  duration_min  INTEGER NOT NULL DEFAULT 10,
  sets          INTEGER NOT NULL DEFAULT 1,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.session_drills ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'session_drills' AND policyname = 'session_drills_club_access') THEN
    CREATE POLICY "session_drills_club_access"
      ON public.session_drills FOR ALL TO authenticated
      USING (
        session_id IN (
          SELECT ts.id FROM public.training_sessions ts
          JOIN public.teams t ON t.id = ts.team_id
          JOIN public.profiles p ON p.club_id = t.club_id
          WHERE p.id = auth.uid()
        )
      );
  END IF;
END $$;

-- 5. Índice HNSW sobre embedding (para búsqueda semántica rápida)
CREATE INDEX IF NOT EXISTS idx_banco_ejercicios_embedding
  ON public.banco_ejercicios
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 6. Función RPC match_drills para búsqueda semántica híbrida
CREATE OR REPLACE FUNCTION public.match_drills(
  query_embedding   vector(768),
  match_threshold   float   DEFAULT 0.5,
  match_count       int     DEFAULT 10,
  filter_category   text    DEFAULT NULL,
  filter_day        text    DEFAULT NULL,
  filter_min_players int    DEFAULT NULL
)
RETURNS TABLE (
  id                  UUID,
  nombre              TEXT,
  tipo                TEXT,
  descripcion         TEXT,
  age_category        TEXT,
  microcycle_day      TEXT,
  game_phase          TEXT,
  drill_structure     TEXT,
  min_players         INTEGER,
  max_players         INTEGER,
  intensity_level     INTEGER,
  duracion_recomendada INTEGER,
  tactical_board_data JSONB,
  tags                TEXT[],
  similarity          FLOAT
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    be.id,
    be.nombre,
    be.tipo,
    be.descripcion,
    be.age_category,
    be.microcycle_day,
    be.game_phase,
    be.drill_structure,
    be.min_players,
    be.max_players,
    be.intensity_level,
    be.duracion_recomendada,
    be.tactical_board_data,
    be.tags,
    1 - (be.embedding <=> query_embedding) AS similarity
  FROM public.banco_ejercicios be
  WHERE
    be.embedding IS NOT NULL
    AND 1 - (be.embedding <=> query_embedding) > match_threshold
    AND (filter_category IS NULL OR be.age_category = filter_category)
    AND (filter_day IS NULL OR be.microcycle_day = filter_day)
    AND (filter_min_players IS NULL OR be.min_players <= filter_min_players)
  ORDER BY be.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.match_drills TO authenticated;
