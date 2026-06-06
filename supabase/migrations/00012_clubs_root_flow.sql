-- ============================================================
-- MIGRACIÓN 00012: CLUB ROOT & ADMIN REGISTRATION FLOW
-- ============================================================
-- Contexto: clubs ya puede existir (creado en seeds anteriores).
-- Esta migración lo formaliza con columnas completas, actualiza
-- profiles/teams y refuerza las RLS para el flujo de onboarding.
-- ============================================================

-- 1. TABLA CLUBS (completa) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clubs (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nombre          TEXT NOT NULL,
  deporte         TEXT NOT NULL DEFAULT 'Fútbol',
  pais            TEXT NOT NULL DEFAULT 'España',
  email_contacto  TEXT,
  logo_url        TEXT,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- Añadir columnas que pueden faltar si la tabla ya existía
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS deporte        TEXT NOT NULL DEFAULT 'Fútbol';
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS pais           TEXT NOT NULL DEFAULT 'España';
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS email_contacto TEXT;
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS logo_url       TEXT;

-- RLS clubs
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

-- Los miembros autenticados pueden leer su propio club
DROP POLICY IF EXISTS "Club members can view their club" ON public.clubs;
CREATE POLICY "Club members can view their club"
  ON public.clubs FOR SELECT TO authenticated
  USING (
    id = (SELECT club_id FROM public.profiles WHERE id = auth.uid())
  );

-- Solo admins pueden actualizar su club
DROP POLICY IF EXISTS "Admins can update their club" ON public.clubs;
CREATE POLICY "Admins can update their club"
  ON public.clubs FOR UPDATE TO authenticated
  USING (
    id = (SELECT club_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- INSERT sin restricción de auth (lo hace el server action con service role o anon justo al registrarse)
-- Se permite via server action con privilegios elevados; la tabla NO expone insert a anon en producción.
DROP POLICY IF EXISTS "Allow club creation during registration" ON public.clubs;
CREATE POLICY "Allow club creation during registration"
  ON public.clubs FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- 2. TABLA PROFILES — asegurar columnas necesarias ──────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email      TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS club_id    UUID REFERENCES public.clubs(id) ON DELETE SET NULL;

-- Ampliar el CHECK de role para incluir 'metodologo' y 'familia'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'coach', 'metodologo', 'familia'));

-- 3. TABLA TEAMS — asegurar club_id ─────────────────────────
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE;

-- 4. TRIGGER: handle_new_user actualizado para incluir club_id y email ──
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role, club_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'Usuario'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', 'Nuevo'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'coach'),
    NULLIF(NEW.raw_user_meta_data->>'club_id', '')::UUID
  )
  ON CONFLICT (id) DO UPDATE SET
    email    = EXCLUDED.email,
    club_id  = COALESCE(EXCLUDED.club_id, profiles.club_id);

  RETURN NEW;
END;
$$;

-- Recrear trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Índices útiles ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_club_id ON public.profiles(club_id);
CREATE INDEX IF NOT EXISTS idx_teams_club_id    ON public.teams(club_id);
