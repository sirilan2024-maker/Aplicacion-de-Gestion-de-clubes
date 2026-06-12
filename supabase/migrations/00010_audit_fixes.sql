-- ==========================================
-- AUDITORÍA ARQUITECTÓNICA - REPARACIÓN DE RLS Y MULTI-TENANT
-- ==========================================

-- 1. CORRECCIÓN MULTI-TENANT EN JUGADORES (PLAYERS)
-- Problema: La política SELECT usaba "USING (true)", exponiendo todos los jugadores a todos los clubes.
DROP POLICY IF EXISTS "Ver jugadores" ON public.players;
CREATE POLICY "Ver jugadores del club" 
ON public.players FOR SELECT TO authenticated 
USING (
  club_id = (SELECT club_id FROM public.profiles WHERE id = auth.uid())
);

-- Actualizar politicas de UPDATE/DELETE para asegurar que solo afectan al mismo club
DROP POLICY IF EXISTS "Actualizar jugadores" ON public.players;
CREATE POLICY "Actualizar jugadores del club" 
ON public.players FOR UPDATE TO authenticated 
USING (
  club_id = (SELECT club_id FROM public.profiles WHERE id = auth.uid()) AND
  (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'metodologo')) OR 
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND coach_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Borrar jugadores" ON public.players;
CREATE POLICY "Borrar jugadores del club" 
ON public.players FOR DELETE TO authenticated 
USING (
  club_id = (SELECT club_id FROM public.profiles WHERE id = auth.uid()) AND
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'metodologo'))
);

-- 2. CORRECCIÓN MULTI-TENANT EN EQUIPOS (TEAMS)
DROP POLICY IF EXISTS "Teams are viewable by authenticated users." ON public.teams;
CREATE POLICY "Teams are viewable by club members" 
ON public.teams FOR SELECT TO authenticated 
USING (
  club_id = (SELECT club_id FROM public.profiles WHERE id = auth.uid())
);

-- 3. CORRECCIÓN EN RELACIÓN FAMILIAS, FICHAS MÉDICAS Y AUTORIZACIONES
-- Problema: "USING (true)" o acceso cruzado. Las familias solo deben ver a sus propios hijos.
DROP POLICY IF EXISTS "Admins and coaches can manage familias" ON public.relacion_familias;
CREATE POLICY "Admins and coaches can manage familias en su club" 
ON public.relacion_familias FOR ALL TO authenticated 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'coach', 'metodologo'))
  AND EXISTS (
    SELECT 1 FROM public.players p 
    WHERE p.id = player_id AND p.club_id = (SELECT club_id FROM public.profiles WHERE id = auth.uid())
  )
);

-- La política de "Families can view their own relations" ya estaba correcta: usuario_id = auth.uid()

DROP POLICY IF EXISTS "Admins and coaches can view/manage medical data" ON public.fichas_medicas;
CREATE POLICY "Admins and coaches can view/manage medical data en su club" 
ON public.fichas_medicas FOR ALL TO authenticated 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'coach', 'metodologo'))
  AND EXISTS (
    SELECT 1 FROM public.players p 
    WHERE p.id = player_id AND p.club_id = (SELECT club_id FROM public.profiles WHERE id = auth.uid())
  )
);

-- 4. CORRECCIÓN EN SESIONES DE ENTRENAMIENTO (TRAINING SESSIONS)
-- Faltaba aislar las sesiones por club_id (a través de la tabla teams)
DROP POLICY IF EXISTS "Training sessions are viewable by authenticated users." ON public.training_sessions;
CREATE POLICY "Training sessions viewable by club" 
ON public.training_sessions FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.teams t 
    WHERE t.id = team_id AND t.club_id = (SELECT club_id FROM public.profiles WHERE id = auth.uid())
  )
);

-- 5. EVITAR RECURSIÓN INFINITA (RECOMENDACIÓN DE SEGURIDAD DEFINER)
-- Si hay consultas masivas a profiles, es mejor crear una función segura para leer el rol
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_user_club_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT club_id FROM profiles WHERE id = auth.uid();
$$;
