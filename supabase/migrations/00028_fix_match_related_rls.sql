-- CONVOCATORIAS
DROP POLICY IF EXISTS "Admins y coach del equipo pueden gestionar convocatorias" ON public.convocatorias;
CREATE POLICY "Admins y coach del equipo pueden gestionar convocatorias" 
ON public.convocatorias FOR ALL TO authenticated 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (rol IN ('admin', 'metodologo') OR role IN ('admin', 'metodologo')))
  OR 
  EXISTS (
    SELECT 1 FROM public.partidos p
    JOIN public.teams t ON t.id = p.equipo_id
    WHERE p.id = partido_id AND t.coach_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.partidos p
    WHERE p.id = partido_id AND p.equipo_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (rol IN ('admin', 'metodologo') OR role IN ('admin', 'metodologo')))
  OR 
  EXISTS (
    SELECT 1 FROM public.partidos p
    JOIN public.teams t ON t.id = p.equipo_id
    WHERE p.id = partido_id AND t.coach_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.partidos p
    WHERE p.id = partido_id AND p.equipo_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid())
  )
);

-- MATCH EVENTS
DROP POLICY IF EXISTS "Admins y coach del equipo pueden gestionar eventos de partido" ON public.match_events;
CREATE POLICY "Admins y coach del equipo pueden gestionar eventos de partido" 
ON public.match_events FOR ALL TO authenticated 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (rol IN ('admin', 'metodologo') OR role IN ('admin', 'metodologo')))
  OR 
  EXISTS (
    SELECT 1 FROM public.partidos p
    JOIN public.teams t ON t.id = p.equipo_id
    WHERE p.id = partido_id AND t.coach_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.partidos p
    WHERE p.id = partido_id AND p.equipo_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (rol IN ('admin', 'metodologo') OR role IN ('admin', 'metodologo')))
  OR 
  EXISTS (
    SELECT 1 FROM public.partidos p
    JOIN public.teams t ON t.id = p.equipo_id
    WHERE p.id = partido_id AND t.coach_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.partidos p
    WHERE p.id = partido_id AND p.equipo_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid())
  )
);
