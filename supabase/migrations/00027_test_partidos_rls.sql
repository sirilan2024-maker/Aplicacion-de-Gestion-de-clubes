DROP POLICY IF EXISTS "Admins y coach del equipo pueden gestionar partidos" ON public.partidos;
DROP POLICY IF EXISTS "Partidos SELECT policy" ON public.partidos;

CREATE POLICY "Partidos ALL policy"
ON public.partidos FOR ALL TO authenticated
USING (true)
WITH CHECK (true);
