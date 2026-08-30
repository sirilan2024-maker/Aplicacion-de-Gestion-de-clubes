-- ============================================================
-- MIGRACIÓN P06: HARDENING DE RLS, STORAGE Y POSTGRESQL
-- ============================================================

-- 1. PUNTO P06.1: Endurecimiento de execute_sql_query
REVOKE ALL ON FUNCTION public.execute_sql_query(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.execute_sql_query(text) TO service_role, postgres;
ALTER FUNCTION public.execute_sql_query(text) SET search_path = public;

-- 2. PUNTO P06.2: RLS en tablas sensibles
-- 2.1 Players
DROP POLICY IF EXISTS "Allow public read access to players" ON public.players;
DROP POLICY IF EXISTS "Players select policy" ON public.players;
CREATE POLICY "Players select policy" ON public.players
FOR SELECT USING (
  (auth.uid() IS NOT NULL AND (
    club_id = (SELECT p.club_id FROM public.profiles p WHERE p.id = auth.uid())
    OR tutor_id = auth.uid()
    OR user_auth_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.player_tutors pt WHERE pt.player_id = players.id AND pt.tutor_id = auth.uid())
  ))
);

-- 2.2 Player evaluations
DROP POLICY IF EXISTS "Allow authenticated all player_evaluations" ON public.player_evaluations;
DROP POLICY IF EXISTS "Evaluations select policy" ON public.player_evaluations;
DROP POLICY IF EXISTS "Evaluations manage policy" ON public.player_evaluations;

CREATE POLICY "Evaluations select policy" ON public.player_evaluations
FOR SELECT USING (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.players pl
      JOIN public.profiles pr ON pr.club_id = pl.club_id
      WHERE pl.id = player_evaluations.player_id AND pr.id = auth.uid()
      AND pr.role IN ('admin', 'coordinador', 'metodologo', 'entrenador', 'coach', 'directivo')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.players pl
      WHERE pl.id = player_evaluations.player_id AND pl.tutor_id = auth.uid()
    )
  )
);

CREATE POLICY "Evaluations manage policy" ON public.player_evaluations
FOR ALL USING (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.players pl
    JOIN public.profiles pr ON pr.club_id = pl.club_id
    WHERE pl.id = player_evaluations.player_id AND pr.id = auth.uid()
    AND pr.role IN ('admin', 'coordinador', 'metodologo', 'entrenador', 'coach')
  )
) WITH CHECK (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.players pl
    JOIN public.profiles pr ON pr.club_id = pl.club_id
    WHERE pl.id = player_evaluations.player_id AND pr.id = auth.uid()
    AND pr.role IN ('admin', 'coordinador', 'metodologo', 'entrenador', 'coach')
  )
);

-- 2.3 Evaluation items
DROP POLICY IF EXISTS "Allow authenticated all evaluation_items" ON public.evaluation_items;
DROP POLICY IF EXISTS "Evaluation items select policy" ON public.evaluation_items;
DROP POLICY IF EXISTS "Evaluation items manage policy" ON public.evaluation_items;

CREATE POLICY "Evaluation items select policy" ON public.evaluation_items
FOR SELECT USING (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.player_evaluations pe
    WHERE pe.id = evaluation_items.evaluation_id
  )
);

CREATE POLICY "Evaluation items manage policy" ON public.evaluation_items
FOR ALL USING (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.player_evaluations pe
    JOIN public.players pl ON pl.id = pe.player_id
    JOIN public.profiles pr ON pr.club_id = pl.club_id
    WHERE pe.id = evaluation_items.evaluation_id AND pr.id = auth.uid()
    AND pr.role IN ('admin', 'coordinador', 'metodologo', 'entrenador', 'coach')
  )
) WITH CHECK (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.player_evaluations pe
    JOIN public.players pl ON pl.id = pe.player_id
    JOIN public.profiles pr ON pr.club_id = pl.club_id
    WHERE pe.id = evaluation_items.evaluation_id AND pr.id = auth.uid()
    AND pr.role IN ('admin', 'coordinador', 'metodologo', 'entrenador', 'coach')
  )
);

-- 2.4 Fees (Cuotas)
DROP POLICY IF EXISTS "select_fees_admin_fixed" ON public.fees;
CREATE POLICY "select_fees_admin_fixed" ON public.fees
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'presidente', 'secretaria', 'tesorero', 'directivo')
    AND profiles.club_id = fees.club_id
  )
);

-- 2.5 Payments
DROP POLICY IF EXISTS "Lectura global de cuotas" ON public.payments;
DROP POLICY IF EXISTS "Payments tenant select policy" ON public.payments;
CREATE POLICY "Payments tenant select policy" ON public.payments
FOR SELECT USING (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.players pl
      JOIN public.profiles pr ON pr.club_id = pl.club_id
      WHERE pl.id = payments.player_id AND pr.id = auth.uid()
      AND pr.role IN ('admin', 'tesorero', 'directivo', 'presidente', 'secretaria')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.players pl
      WHERE pl.id = payments.player_id AND pl.tutor_id = auth.uid()
    )
  )
);


-- 2.6 Player apparel
DROP POLICY IF EXISTS "Anyone can select player_apparel" ON public.player_apparel;
DROP POLICY IF EXISTS "Player apparel select policy" ON public.player_apparel;
CREATE POLICY "Player apparel select policy" ON public.player_apparel
FOR SELECT USING (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.players pl
      JOIN public.profiles pr ON pr.club_id = pl.club_id
      WHERE pl.id = player_apparel.player_id AND pr.id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.players pl
      WHERE pl.id = player_apparel.player_id AND pl.tutor_id = auth.uid()
    )
  )
);

-- 3. PUNTO P06.3: Storage Policies
-- 3.1 recibos_pagos
DROP POLICY IF EXISTS "Users can view own receipts" ON storage.objects;
CREATE POLICY "Users can view own receipts" ON storage.objects
FOR SELECT USING (
  bucket_id = 'recibos_pagos' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid()
      AND pr.role IN ('admin', 'tesorero', 'directivo', 'presidente', 'secretaria')
    )
  )
);

-- 3.2 expedientes-doc
DROP POLICY IF EXISTS "Users can upload expedientes" ON storage.objects;
CREATE POLICY "Users can upload expedientes" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'expedientes-doc' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid()
      AND pr.role IN ('admin', 'secretaria', 'coordinador', 'directivo')
    )
  )
);

-- 4. PUNTO P06.4: Protección de profiles contra escalada y cambio de tenant
CREATE OR REPLACE FUNCTION public.protect_profiles_elevation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_is_admin boolean;
BEGIN
  -- Si es service_role o postgres o auth.uid() es nulo (triggers internos), permitir
  IF current_user IN ('postgres', 'service_role', 'supabase_admin') OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Comprobar si se intenta cambiar rol, roles o club_id
  IF (NEW.role IS DISTINCT FROM OLD.role) OR 
     (NEW.roles IS DISTINCT FROM OLD.roles) OR 
     (NEW.club_id IS DISTINCT FROM OLD.club_id) THEN
     
    SELECT (role IN ('admin', 'superadmin', 'directivo')) INTO caller_is_admin
    FROM public.profiles
    WHERE id = auth.uid();

    IF caller_is_admin IS NOT TRUE THEN
      RAISE EXCEPTION 'No tienes permiso para modificar tu rol o tu club directamente.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profiles_elevation ON public.profiles;
CREATE TRIGGER trg_protect_profiles_elevation
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profiles_elevation();
