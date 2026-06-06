-- =====================================================
-- Módulo: Asistencia Manual + Eventos en Directo
-- =====================================================

-- 1. Asistencia manual en convocatorias
ALTER TABLE public.convocatorias
  ADD COLUMN IF NOT EXISTS estado_asistencia TEXT 
    NOT NULL DEFAULT 'Pendiente'
    CHECK (estado_asistencia IN ('Pendiente', 'Confirmado', 'Ausente'));

COMMENT ON COLUMN public.convocatorias.estado_asistencia IS
  'Estado de asistencia: Pendiente (no ha respondido), Confirmado (jugador o entrenador), Ausente (no viene)';

-- 2. Tabla de eventos en directo
CREATE TABLE IF NOT EXISTS public.match_events (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  partido_id    UUID REFERENCES public.partidos(id) ON DELETE CASCADE NOT NULL,
  player_id     UUID REFERENCES public.players(id)  ON DELETE SET NULL,  -- NULL si es evento de equipo
  tipo_evento   TEXT NOT NULL CHECK (tipo_evento IN (
                  'Gol',
                  'Asistencia',
                  'Tarjeta Amarilla',
                  'Tarjeta Roja',
                  'Cambio Entra',
                  'Cambio Sale',
                  'Penalty',
                  'Gol en Propia'
                )),
  minuto        INTEGER NOT NULL CHECK (minuto >= 0 AND minuto <= 130),
  notas         TEXT DEFAULT NULL,  -- Ej: "Penalti", "Gran jugada colectiva"
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;

-- RLS: visibilidad (mismo club)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Eventos visibles para el mismo club') THEN
    CREATE POLICY "Eventos visibles para el mismo club"
    ON public.match_events FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.partidos
        WHERE id = partido_id
          AND club_id = (SELECT club_id FROM public.profiles WHERE id = auth.uid())
      )
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins y coach gestionan eventos del partido') THEN
    CREATE POLICY "Admins y coach gestionan eventos del partido"
    ON public.match_events FOR ALL TO authenticated
    USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'metodologo'))
      OR
      EXISTS (
        SELECT 1 FROM public.partidos p
        JOIN public.teams t ON p.equipo_id = t.id
        WHERE p.id = partido_id AND t.coach_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Índices de rendimiento
CREATE INDEX IF NOT EXISTS idx_match_events_partido ON public.match_events(partido_id);
CREATE INDEX IF NOT EXISTS idx_match_events_minuto  ON public.match_events(partido_id, minuto);
