-- Fix RLS using tutor_id directly on players table instead of player_tutors

-- PARTIDOS
DROP POLICY IF EXISTS "Partidos SELECT policy" ON public.partidos;
CREATE POLICY "Partidos SELECT policy"
ON public.partidos FOR SELECT TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'entrenador')
  OR
  equipo_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid())
  OR
  equipo_id IN (
    SELECT p.team_id 
    FROM public.players p
    WHERE p.tutor_id = auth.uid()
  )
);

-- TEAM_EVENTS
DROP POLICY IF EXISTS "Team events SELECT policy" ON public.team_events;
CREATE POLICY "Team events SELECT policy"
ON public.team_events FOR SELECT TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'entrenador')
  OR
  team_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid())
  OR
  team_id IN (
    SELECT p.team_id 
    FROM public.players p
    WHERE p.tutor_id = auth.uid()
  )
);

-- CONVOCATORIAS
DROP POLICY IF EXISTS "Convocatorias SELECT policy" ON public.convocatorias;
CREATE POLICY "Convocatorias SELECT policy"
ON public.convocatorias FOR SELECT TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'entrenador')
  OR
  EXISTS (
    SELECT 1 FROM public.players pl
    WHERE pl.id = player_id
      AND pl.team_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid())
  )
  OR
  player_id IN (
    SELECT id FROM public.players WHERE tutor_id = auth.uid()
  )
);

-- ATTENDANCE
DROP POLICY IF EXISTS "Attendance SELECT policy" ON public.attendance;
CREATE POLICY "Attendance SELECT policy"
ON public.attendance FOR SELECT TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'entrenador')
  OR
  EXISTS (
    SELECT 1 FROM public.players pl
    WHERE pl.id = player_id
      AND pl.team_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid())
  )
  OR
  player_id IN (
    SELECT id FROM public.players WHERE tutor_id = auth.uid()
  )
);
