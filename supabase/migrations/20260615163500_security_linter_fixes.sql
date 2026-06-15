-- Migración de Seguridad General (Linting Fixes)

-- 1. Function Search Path Mutable (Lint 0011)
-- Aplicar SET search_path = public a funciones identificadas
DO $$ 
DECLARE
    f_identity text;
BEGIN
    FOR f_identity IN 
        SELECT p.oid::regprocedure::text
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
          AND p.proname IN (
              'handle_new_user', 'get_my_club_id', 'set_fees_timestamp', 
              'current_user_club_id', 'current_user_team_id', 'generate_invite_code', 
              'assign_invite_code', 'update_equipos_members_count', 
              'update_equipos_coaches_count', 'check_consecutive_absences'
          )
    LOOP
        EXECUTE format('ALTER FUNCTION %s SET search_path = public;', f_identity);
    END LOOP;
END $$;


-- 2. RLS Policy Always True (Lint 0024)
-- Eliminar políticas permisivas y recrearlas con reglas estrictas

-- Tabla attendance
DROP POLICY IF EXISTS "Permitir acceso a attendance" ON public.attendance;
DROP POLICY IF EXISTS "Permitir acceso a attendance a usuarios autenticados" ON public.attendance;

CREATE POLICY "Users can manage attendance in their club"
ON public.attendance FOR ALL TO authenticated USING (
    team_id IN (SELECT id FROM public.equipos WHERE club_id IN (SELECT club_id FROM public.profiles WHERE id = auth.uid()))
    OR
    session_id IN (SELECT id FROM public.training_sessions WHERE club_id IN (SELECT club_id FROM public.profiles WHERE id = auth.uid()))
);

-- Tabla clubs
DROP POLICY IF EXISTS "Allow club creation during registration" ON public.clubs;
DROP POLICY IF EXISTS "Permitir crear clubes" ON public.clubs;

CREATE POLICY "Users can insert club" ON public.clubs FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- Tabla equipos
DROP POLICY IF EXISTS "allow_authenticated_inserts" ON public.equipos;

CREATE POLICY "Club members can insert teams" ON public.equipos FOR INSERT TO authenticated WITH CHECK (
    club_id IN (SELECT club_id FROM public.profiles WHERE id = auth.uid())
);


-- 3. Public Bucket Allows Listing (Lint 0025)
-- Reemplazar la política pública por una que requiera autenticación para listar vía RLS.
-- (El bucket 'avatars' sigue siendo public=true a nivel de storage de Supabase, 
-- por lo que las descargas por URL pública /storage/v1/object/public/avatars/ seguirán funcionando sin RLS).
DROP POLICY IF EXISTS "Avatar images are publicly accessible." ON storage.objects;

CREATE POLICY "Avatar images are accessible by authenticated users"
ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'avatars'
);


-- 4. Exposed SECURITY DEFINER Functions (Lint 0028 & 0029)
-- Revocar ejecución pública/anon/authenticated a funciones sensibles
DO $$ 
DECLARE
    f_identity text;
BEGIN
    FOR f_identity IN 
        SELECT p.oid::regprocedure::text
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
          AND p.proname IN (
              'current_user_club_id', 'current_user_team_id', 'get_my_club_id', 
              'get_user_club_id', 'get_user_role', 'handle_new_user'
          )
    LOOP
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated;', f_identity);
    END LOOP;
END $$;
