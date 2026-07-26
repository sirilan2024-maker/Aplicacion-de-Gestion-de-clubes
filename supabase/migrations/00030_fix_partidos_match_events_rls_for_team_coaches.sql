-- MATCH EVENTS
DROP POLICY IF EXISTS "Admins y coach del equipo pueden gestionar eventos de partido" ON public.match_events;
CREATE POLICY "Admins y coach del equipo pueden gestionar eventos de partido" 
ON public.match_events FOR ALL TO authenticated 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (rol IN ('admin', 'metodologo') OR role IN ('admin', 'metodologo')))
  OR EXISTS (SELECT 1 FROM public.partidos p JOIN public.teams t ON t.id = p.equipo_id WHERE p.id = partido_id AND t.coach_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.partidos p WHERE p.id = partido_id AND p.equipo_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid()))
  OR EXISTS (SELECT 1 FROM public.partidos p JOIN public.team_coaches tc ON tc.team_id = p.equipo_id WHERE p.id = partido_id AND tc.profile_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (rol IN ('admin', 'metodologo') OR role IN ('admin', 'metodologo')))
  OR EXISTS (SELECT 1 FROM public.partidos p JOIN public.teams t ON t.id = p.equipo_id WHERE p.id = partido_id AND t.coach_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.partidos p WHERE p.id = partido_id AND p.equipo_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid()))
  OR EXISTS (SELECT 1 FROM public.partidos p JOIN public.team_coaches tc ON tc.team_id = p.equipo_id WHERE p.id = partido_id AND tc.profile_id = auth.uid())
);

-- CONVOCATORIAS
DROP POLICY IF EXISTS "Admins y coach del equipo pueden gestionar convocatorias" ON public.convocatorias;
CREATE POLICY "Admins y coach del equipo pueden gestionar convocatorias" 
ON public.convocatorias FOR ALL TO authenticated 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (rol IN ('admin', 'metodologo') OR role IN ('admin', 'metodologo')))
  OR EXISTS (SELECT 1 FROM public.partidos p JOIN public.teams t ON t.id = p.equipo_id WHERE p.id = partido_id AND t.coach_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.partidos p WHERE p.id = partido_id AND p.equipo_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid()))
  OR EXISTS (SELECT 1 FROM public.partidos p JOIN public.team_coaches tc ON tc.team_id = p.equipo_id WHERE p.id = partido_id AND tc.profile_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (rol IN ('admin', 'metodologo') OR role IN ('admin', 'metodologo')))
  OR EXISTS (SELECT 1 FROM public.partidos p JOIN public.teams t ON t.id = p.equipo_id WHERE p.id = partido_id AND t.coach_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.partidos p WHERE p.id = partido_id AND p.equipo_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid()))
  OR EXISTS (SELECT 1 FROM public.partidos p JOIN public.team_coaches tc ON tc.team_id = p.equipo_id WHERE p.id = partido_id AND tc.profile_id = auth.uid())
);

-- PARTIDOS (Restaurando de test a robusto)
DROP POLICY IF EXISTS "Partidos ALL policy" ON public.partidos;
DROP POLICY IF EXISTS "Admins y coach del equipo pueden gestionar partidos" ON public.partidos;
CREATE POLICY "Admins y coach del equipo pueden gestionar partidos"
ON public.partidos FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (rol IN ('admin', 'metodologo') OR role IN ('admin', 'metodologo')))
  OR EXISTS (SELECT 1 FROM public.teams WHERE id = equipo_id AND coach_id = auth.uid())
  OR (equipo_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid()) AND (SELECT rol FROM public.profiles WHERE id = auth.uid()) IN ('entrenador', 'coach'))
  OR EXISTS (SELECT 1 FROM public.team_coaches tc WHERE tc.team_id = equipo_id AND tc.profile_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (rol IN ('admin', 'metodologo') OR role IN ('admin', 'metodologo')))
  OR EXISTS (SELECT 1 FROM public.teams WHERE id = equipo_id AND coach_id = auth.uid())
  OR (equipo_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid()) AND (SELECT rol FROM public.profiles WHERE id = auth.uid()) IN ('entrenador', 'coach'))
  OR EXISTS (SELECT 1 FROM public.team_coaches tc WHERE tc.team_id = equipo_id AND tc.profile_id = auth.uid())
);

-- Add SELECT policy back for partidos since we dropped it
CREATE POLICY "Partidos SELECT policy"
ON public.partidos FOR SELECT TO authenticated
USING (
  (SELECT rol FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'entrenador')
  OR equipo_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.team_coaches tc WHERE tc.team_id = equipo_id AND tc.profile_id = auth.uid())
  OR equipo_id IN (SELECT p.team_id FROM public.players p WHERE p.tutor_id = auth.uid())
);
