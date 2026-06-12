-- ==========================================
-- Módulo 4: Competición y Convocatorias
-- ==========================================

-- 1. Crear la tabla partidos
CREATE TABLE IF NOT EXISTS public.partidos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL,
  equipo_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  rival_nombre TEXT NOT NULL,
  fecha_hora TIMESTAMP WITH TIME ZONE NOT NULL,
  lugar TEXT NOT NULL CHECK (lugar IN ('Local', 'Visitante')),
  resultado_propio INTEGER DEFAULT NULL,
  resultado_rival INTEGER DEFAULT NULL,
  estado TEXT NOT NULL CHECK (estado IN ('Programado', 'Finalizado')) DEFAULT 'Programado',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.partidos ENABLE ROW LEVEL SECURITY;

-- RLS para partidos
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Partidos visibles para el mismo club') THEN
        CREATE POLICY "Partidos visibles para el mismo club" 
        ON public.partidos FOR SELECT TO authenticated 
        USING (club_id = (SELECT club_id FROM public.profiles WHERE id = auth.uid()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins y coach del equipo pueden gestionar partidos') THEN
        CREATE POLICY "Admins y coach del equipo pueden gestionar partidos" 
        ON public.partidos FOR ALL TO authenticated 
        USING (
          EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'metodologo'))
          OR 
          EXISTS (SELECT 1 FROM public.teams WHERE id = equipo_id AND coach_id = auth.uid())
        );
    END IF;
END $$;

-- 2. Crear la tabla convocatorias
CREATE TABLE IF NOT EXISTS public.convocatorias (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  partido_id UUID REFERENCES public.partidos(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
  titular BOOLEAN DEFAULT false NOT NULL,
  minutos_jugados INTEGER DEFAULT 0 NOT NULL,
  goles INTEGER DEFAULT 0 NOT NULL,
  asistencias INTEGER DEFAULT 0 NOT NULL,
  tarjetas_amarillas INTEGER DEFAULT 0 NOT NULL,
  tarjetas_rojas INTEGER DEFAULT 0 NOT NULL,
  asistencia_confirmada_familia BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(partido_id, player_id) -- Un jugador no puede estar dos veces en la misma convocatoria
);

ALTER TABLE public.convocatorias ENABLE ROW LEVEL SECURITY;

-- RLS para convocatorias
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Convocatorias visibles para autenticados') THEN
        CREATE POLICY "Convocatorias visibles para autenticados" 
        ON public.convocatorias FOR SELECT TO authenticated 
        USING (
          EXISTS (
            SELECT 1 FROM public.partidos 
            WHERE id = partido_id AND club_id = (SELECT club_id FROM public.profiles WHERE id = auth.uid())
          )
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins y coach del equipo pueden gestionar convocatorias') THEN
        CREATE POLICY "Admins y coach del equipo pueden gestionar convocatorias" 
        ON public.convocatorias FOR ALL TO authenticated 
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

-- 3. Datos Semilla

DO $$
DECLARE
  default_club_id UUID;
  nuevo_partido_id UUID;
  jugador_1_id UUID;
  jugador_2_id UUID;
  -- /* REEMPLAZAR CON UN ID DE EQUIPO REAL */
  equipo_seleccionado_id UUID := NULL; 
BEGIN
  -- Obtener el club por defecto
  SELECT club_id INTO default_club_id FROM public.profiles LIMIT 1;

  IF default_club_id IS NOT NULL AND equipo_seleccionado_id IS NOT NULL THEN
    -- Insertar un partido de prueba programado
    INSERT INTO public.partidos (club_id, equipo_id, rival_nombre, fecha_hora, lugar, estado)
    VALUES (
      default_club_id, 
      equipo_seleccionado_id, 
      'Rayo Vallecano Juv', 
      now() + interval '3 days', 
      'Local', 
      'Programado'
    ) RETURNING id INTO nuevo_partido_id;

    -- Obtener un par de jugadores del equipo para las convocatorias ficticias
    SELECT id INTO jugador_1_id FROM public.players WHERE team_id = equipo_seleccionado_id LIMIT 1 OFFSET 0;
    SELECT id INTO jugador_2_id FROM public.players WHERE team_id = equipo_seleccionado_id LIMIT 1 OFFSET 1;

    IF jugador_1_id IS NOT NULL THEN
      INSERT INTO public.convocatorias (partido_id, player_id, titular)
      VALUES (nuevo_partido_id, jugador_1_id, true);
    END IF;

    IF jugador_2_id IS NOT NULL THEN
      INSERT INTO public.convocatorias (partido_id, player_id, titular)
      VALUES (nuevo_partido_id, jugador_2_id, false);
    END IF;

  END IF;
END $$;
