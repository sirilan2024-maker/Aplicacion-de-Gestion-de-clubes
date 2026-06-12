-- ========================================================
-- EJECUTA ESTO EN EL SQL EDITOR DE TU DASHBOARD SUPABASE
-- ========================================================

-- 1. Tabla de Métricas del Club (Club Metrics)
CREATE TABLE IF NOT EXISTS public.club_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    unit TEXT,
    type TEXT NOT NULL CHECK (type IN ('number', 'text', 'boolean')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(club_id, name)
);

ALTER TABLE public.club_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their club's metrics"
    ON public.club_metrics FOR SELECT
    USING (club_id IN (
        SELECT club_id FROM public.profiles WHERE profiles.id = auth.uid()
    ));

CREATE POLICY "Admins can manage their club's metrics"
    ON public.club_metrics FOR ALL
    USING (
        club_id IN (
            SELECT club_id FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'superadmin')
        )
    );

-- 2. Tabla de Resultados de Entrenamientos por Jugador (Player Training Metrics)
CREATE TABLE IF NOT EXISTS public.player_training_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.team_events(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    metric_id UUID NOT NULL REFERENCES public.club_metrics(id) ON DELETE CASCADE,
    value_number NUMERIC,
    value_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(event_id, player_id, metric_id)
);

ALTER TABLE public.player_training_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their club's player training metrics"
    ON public.player_training_metrics FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.players p
            JOIN public.equipos e ON p.team_id = e.id
            JOIN public.profiles pr ON pr.club_id = e.club_id
            WHERE p.id = player_training_metrics.player_id
            AND pr.id = auth.uid()
        )
    );

CREATE POLICY "Coaches and Admins can manage training metrics"
    ON public.player_training_metrics FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.players p
            JOIN public.equipos e ON p.team_id = e.id
            JOIN public.profiles pr ON pr.club_id = e.club_id
            WHERE p.id = player_training_metrics.player_id
            AND pr.id = auth.uid()
            AND pr.role IN ('admin', 'superadmin', 'coach', 'entrenador', 'metodologo')
        )
    );

-- 3. Crear las métricas por defecto para el club activo
DO $$
DECLARE
  v_club_id UUID;
BEGIN
  -- Pillamos el primer club (o puedes hardcodear el ID si quieres)
  SELECT id INTO v_club_id FROM public.clubs LIMIT 1;
  
  IF v_club_id IS NOT NULL THEN
    INSERT INTO public.club_metrics (club_id, name, unit, type, is_active)
    VALUES 
      (v_club_id, 'RPE', '1-10', 'number', true),
      (v_club_id, 'Minutos de Sesión', 'min', 'number', true),
      (v_club_id, 'Fatiga Percibida', 'texto', 'text', true)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
