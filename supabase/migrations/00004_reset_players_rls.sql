-- ==========================================
-- RESET DE SEGURIDAD (RLS) PARA JUGADORES
-- ==========================================

-- 1. Eliminamos las politicas problematicas antiguas si existen
DROP POLICY IF EXISTS "Players can be modified by admins or assigned coach." ON public.players;
DROP POLICY IF EXISTS "Permitir insercion a personal del club" ON public.players;
DROP POLICY IF EXISTS "Players are viewable by authenticated users." ON public.players;

-- 2. Asegurarnos que RLS esta activo
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- 3. Volvemos a crear politicas limpias y separadas

-- A) Todo el mundo autenticado puede VER a los jugadores
DROP POLICY IF EXISTS "Ver jugadores" ON public.players;
CREATE POLICY "Ver jugadores"
ON public.players
FOR SELECT
TO authenticated
USING (true);

-- B) Los administradores, entrenadores y metodologos pueden CREAR jugadores
DROP POLICY IF EXISTS "Crear jugadores" ON public.players;
CREATE POLICY "Crear jugadores"
ON public.players
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'coach', 'metodologo'))
);

-- C) Solo administradores o el entrenador asignado al equipo pueden ACTUALIZAR jugadores
DROP POLICY IF EXISTS "Actualizar jugadores" ON public.players;
CREATE POLICY "Actualizar jugadores"
ON public.players
FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'metodologo')) OR 
  EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND coach_id = auth.uid())
);

-- D) Solo administradores pueden BORRAR jugadores
DROP POLICY IF EXISTS "Borrar jugadores" ON public.players;
CREATE POLICY "Borrar jugadores"
ON public.players
FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'metodologo'))
);
