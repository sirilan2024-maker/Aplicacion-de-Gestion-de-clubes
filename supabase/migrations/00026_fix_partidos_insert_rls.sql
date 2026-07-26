-- Drop the old policy
DROP POLICY IF EXISTS "Admins y coach del equipo pueden gestionar partidos" ON public.partidos;

-- Create the new, more robust policy
CREATE POLICY "Admins y coach del equipo pueden gestionar partidos"
ON public.partidos FOR ALL TO authenticated
USING (
  -- User is admin or metodologo
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (rol IN ('admin', 'metodologo') OR role IN ('admin', 'metodologo')))
  OR 
  -- User is coach of the team (legacy coach_id on teams)
  EXISTS (SELECT 1 FROM public.teams WHERE id = equipo_id AND coach_id = auth.uid())
  OR
  -- User is coach of the team (via profiles.team_id)
  (
    equipo_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid())
    AND
    (SELECT rol FROM public.profiles WHERE id = auth.uid()) IN ('entrenador', 'coach')
  )
)
WITH CHECK (
  -- User is admin or metodologo
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (rol IN ('admin', 'metodologo') OR role IN ('admin', 'metodologo')))
  OR 
  -- User is coach of the team (legacy coach_id on teams)
  EXISTS (SELECT 1 FROM public.teams WHERE id = equipo_id AND coach_id = auth.uid())
  OR
  -- User is coach of the team (via profiles.team_id)
  (
    equipo_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid())
    AND
    (SELECT rol FROM public.profiles WHERE id = auth.uid()) IN ('entrenador', 'coach')
  )
);
