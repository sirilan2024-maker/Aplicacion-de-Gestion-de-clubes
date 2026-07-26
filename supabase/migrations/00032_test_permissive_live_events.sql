DROP POLICY IF EXISTS "Admins y coach del equipo pueden gestionar eventos de partido" ON public.match_events;
CREATE POLICY "Admins y coach del equipo pueden gestionar eventos de partido" 
ON public.match_events FOR ALL TO authenticated 
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins y coach del equipo pueden gestionar partidos" ON public.partidos;
CREATE POLICY "Admins y coach del equipo pueden gestionar partidos"
ON public.partidos FOR ALL TO authenticated
USING (true)
WITH CHECK (true);
