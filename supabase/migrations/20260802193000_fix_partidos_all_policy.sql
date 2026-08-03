-- FIX EVENT MANAGEMENT FOR COACHES AND COORDINATORS
-- Permite que entrenadores, coordinadores, metodólogos y delegados puedan borrar/modificar 
-- partidos y eventos (team_events) dentro de su club, y añade fallbacks para perfiles antiguos.

-- 1. Arreglar política ALL (INSERT/UPDATE/DELETE) para PARTIDOS
DROP POLICY IF EXISTS "Admins y coach del equipo pueden gestionar partidos" ON public.partidos;

CREATE POLICY "Admins y coach del equipo pueden gestionar partidos"
ON public.partidos FOR ALL TO authenticated
USING (
  -- 1. Roles de staff del club
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
      AND club_id = partidos.club_id
      AND (
        rol IN ('admin', 'superadmin', 'metodologo', 'coordinador', 'entrenador', 'coach', 'delegado') 
        OR 
        role IN ('admin', 'superadmin', 'metodologo', 'coordinador', 'entrenador', 'coach', 'delegado')
      )
  )
  -- 2. Coach principal del equipo
  OR EXISTS (SELECT 1 FROM public.teams WHERE id = partidos.equipo_id AND coach_id = auth.uid())
  -- 3. Coach auxiliar del equipo
  OR EXISTS (SELECT 1 FROM public.team_coaches tc WHERE tc.team_id = partidos.equipo_id AND tc.profile_id = auth.uid())
  -- 4. Legacy profile
  OR (
    partidos.equipo_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid()) 
    AND (
      (SELECT rol FROM public.profiles WHERE id = auth.uid()) IN ('entrenador', 'coach') 
      OR 
      (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('entrenador', 'coach')
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
      AND club_id = partidos.club_id
      AND (
        rol IN ('admin', 'superadmin', 'metodologo', 'coordinador', 'entrenador', 'coach', 'delegado') 
        OR 
        role IN ('admin', 'superadmin', 'metodologo', 'coordinador', 'entrenador', 'coach', 'delegado')
      )
  )
  OR EXISTS (SELECT 1 FROM public.teams WHERE id = partidos.equipo_id AND coach_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.team_coaches tc WHERE tc.team_id = partidos.equipo_id AND tc.profile_id = auth.uid())
  OR (
    partidos.equipo_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid()) 
    AND (
      (SELECT rol FROM public.profiles WHERE id = auth.uid()) IN ('entrenador', 'coach') 
      OR 
      (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('entrenador', 'coach')
    )
  )
);


-- 2. Arreglar política ALL para TEAM_EVENTS
DROP POLICY IF EXISTS "Users can manage team_events for their club" ON public.team_events;

CREATE POLICY "Users can manage team_events for their club"
ON public.team_events FOR ALL TO authenticated
USING (
  -- 1. Roles de staff (vía join con teams para obtener el club_id del equipo)
  EXISTS (
    SELECT 1 FROM public.teams e
    JOIN public.profiles p ON p.club_id = e.club_id
    WHERE e.id = team_events.team_id
    AND p.id = auth.uid()
    AND (
      p.rol IN ('admin', 'superadmin', 'metodologo', 'coordinador', 'entrenador', 'coach', 'delegado')
      OR
      p.role IN ('admin', 'superadmin', 'metodologo', 'coordinador', 'entrenador', 'coach', 'delegado')
    )
  )
  -- 2. Coach principal del equipo
  OR EXISTS (SELECT 1 FROM public.teams WHERE id = team_events.team_id AND coach_id = auth.uid())
  -- 3. Coach auxiliar del equipo
  OR EXISTS (SELECT 1 FROM public.team_coaches tc WHERE tc.team_id = team_events.team_id AND tc.profile_id = auth.uid())
  -- 4. Legacy profile
  OR (
    team_events.team_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid()) 
    AND (
      (SELECT rol FROM public.profiles WHERE id = auth.uid()) IN ('entrenador', 'coach') 
      OR 
      (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('entrenador', 'coach')
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.teams e
    JOIN public.profiles p ON p.club_id = e.club_id
    WHERE e.id = team_events.team_id
    AND p.id = auth.uid()
    AND (
      p.rol IN ('admin', 'superadmin', 'metodologo', 'coordinador', 'entrenador', 'coach', 'delegado')
      OR
      p.role IN ('admin', 'superadmin', 'metodologo', 'coordinador', 'entrenador', 'coach', 'delegado')
    )
  )
  OR EXISTS (SELECT 1 FROM public.teams WHERE id = team_events.team_id AND coach_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.team_coaches tc WHERE tc.team_id = team_events.team_id AND tc.profile_id = auth.uid())
  OR (
    team_events.team_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid()) 
    AND (
      (SELECT rol FROM public.profiles WHERE id = auth.uid()) IN ('entrenador', 'coach') 
      OR 
      (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('entrenador', 'coach')
    )
  )
);
