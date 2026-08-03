-- FIX EVENT VISIBILITY FOR COACHES
-- El problema era que las políticas de SELECT (lectura) para entrenadores no comprobaban 
-- 'coach_id' de la tabla 'teams', ni incluían correctamente el rol 'coach' en ambos campos (rol y role).

-- 1. Arreglar política SELECT para PARTIDOS
DROP POLICY IF EXISTS "Partidos SELECT policy" ON public.partidos;
CREATE POLICY "Partidos SELECT policy"
ON public.partidos FOR SELECT TO authenticated
USING (
  -- Si es admin, metodologo, coach o entrenador
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND (rol IN ('admin', 'entrenador', 'coach', 'metodologo') OR role IN ('admin', 'entrenador', 'coach', 'metodologo'))
  )
  -- Si está asignado directamente en su perfil (legacy)
  OR equipo_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid())
  -- Si es el entrenador principal del equipo
  OR EXISTS (SELECT 1 FROM public.teams WHERE id = equipo_id AND coach_id = auth.uid())
  -- Si es un entrenador auxiliar del equipo
  OR EXISTS (SELECT 1 FROM public.team_coaches tc WHERE tc.team_id = equipo_id AND tc.profile_id = auth.uid())
  -- Si es el tutor de un jugador del equipo
  OR equipo_id IN (SELECT p.team_id FROM public.players p WHERE p.tutor_id = auth.uid())
);


-- 2. Arreglar política SELECT para TEAM_EVENTS (Entrenamientos/Reuniones)
DROP POLICY IF EXISTS "Team events SELECT policy" ON public.team_events;
CREATE POLICY "Team events SELECT policy"
ON public.team_events FOR SELECT TO authenticated
USING (
  -- Si es admin, metodologo, coach o entrenador
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND (rol IN ('admin', 'entrenador', 'coach', 'metodologo') OR role IN ('admin', 'entrenador', 'coach', 'metodologo'))
  )
  -- Si está asignado directamente en su perfil (legacy)
  OR team_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid())
  -- Si es el entrenador principal del equipo
  OR EXISTS (SELECT 1 FROM public.teams WHERE id = team_events.team_id AND coach_id = auth.uid())
  -- Si es un entrenador auxiliar del equipo
  OR EXISTS (SELECT 1 FROM public.team_coaches tc WHERE tc.team_id = team_events.team_id AND tc.profile_id = auth.uid())
  -- Si es el tutor de un jugador del equipo
  OR team_id IN (SELECT p.team_id FROM public.players p WHERE p.tutor_id = auth.uid())
);
