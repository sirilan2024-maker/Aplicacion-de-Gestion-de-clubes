-- ==========================================
-- Módulo 4: Arreglo de RLS para Convocatorias
-- ==========================================

-- Eliminar políticas antiguas conflictivas
DROP POLICY IF EXISTS "Convocatorias visibles para autenticados" ON public.convocatorias;
DROP POLICY IF EXISTS "Admins y coach del equipo pueden gestionar convocatorias" ON public.convocatorias;

-- 1. Política de SELECT
CREATE POLICY "Convocatorias visibles para el club" 
ON public.convocatorias FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.partidos p
    WHERE p.id = partido_id 
    AND p.club_id = (SELECT club_id FROM public.profiles WHERE id = auth.uid())
  )
);

-- 2. Política de INSERT
CREATE POLICY "Insertar convocatorias" 
ON public.convocatorias FOR INSERT TO authenticated 
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'metodologo'))
  OR 
  EXISTS (
    SELECT 1 FROM public.partidos p
    JOIN public.teams t ON p.equipo_id = t.id
    WHERE p.id = partido_id AND t.coach_id = auth.uid()
  )
);

-- 3. Política de UPDATE
CREATE POLICY "Actualizar convocatorias" 
ON public.convocatorias FOR UPDATE TO authenticated 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'metodologo'))
  OR 
  EXISTS (
    SELECT 1 FROM public.partidos p
    JOIN public.teams t ON p.equipo_id = t.id
    WHERE p.id = partido_id AND t.coach_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'metodologo'))
  OR 
  EXISTS (
    SELECT 1 FROM public.partidos p
    JOIN public.teams t ON p.equipo_id = t.id
    WHERE p.id = partido_id AND t.coach_id = auth.uid()
  )
);

-- 4. Política de DELETE
CREATE POLICY "Eliminar convocatorias" 
ON public.convocatorias FOR DELETE TO authenticated 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'metodologo'))
  OR 
  EXISTS (
    SELECT 1 FROM public.partidos p
    JOIN public.teams t ON p.equipo_id = t.id
    WHERE p.id = partido_id AND t.coach_id = auth.uid()
  )
);
