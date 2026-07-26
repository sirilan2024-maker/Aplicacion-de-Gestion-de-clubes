-- Fix RLS for partidos, team_events, convocatorias and attendance for "familia" users

-- PARTIDOS
DROP POLICY IF EXISTS "Partidos SELECT policy" ON public.partidos;
DROP POLICY IF EXISTS "Partidos visibles para el mismo club" ON public.partidos;
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
    JOIN public.player_tutors pt ON pt.player_id = p.id
    WHERE pt.tutor_id = auth.uid()
  )
);

-- TEAM_EVENTS
DROP POLICY IF EXISTS "Eventos visibles para el mismo club" ON public.team_events;
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
    JOIN public.player_tutors pt ON pt.player_id = p.id
    WHERE pt.tutor_id = auth.uid()
  )
);

-- CONVOCATORIAS
DROP POLICY IF EXISTS "Convocatorias SELECT policy" ON public.convocatorias;
DROP POLICY IF EXISTS "Convocatorias visibles para el club" ON public.convocatorias;
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
    SELECT player_id FROM public.player_tutors WHERE tutor_id = auth.uid()
  )
);

-- ATTENDANCE
DROP POLICY IF EXISTS "Attendance is viewable by authenticated users." ON public.attendance;
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
    SELECT player_id FROM public.player_tutors WHERE tutor_id = auth.uid()
  )
);
