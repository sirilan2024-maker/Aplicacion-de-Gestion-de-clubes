-- ============================================================
-- Migración 00027 — Sistema de Roles e Invitaciones
-- ============================================================

-- 1. Ampliar el rol en perfiles para incluir jugadores y familia
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('admin', 'coach', 'entrenador', 'delegado', 'jugador', 'familia', 'metodologo'));

-- 2. Tabla de Invitaciones
CREATE TABLE IF NOT EXISTS public.invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    team_id UUID REFERENCES public.equipos(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now() + interval '7 days') NOT NULL
);

-- 3. RLS para Invitaciones
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view all invitations"
ON public.invitations FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND role IN ('admin', 'metodologo')));

CREATE POLICY "Coaches can view their team invitations"
ON public.invitations FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM public.equipos WHERE equipos.id = invitations.team_id AND equipos.coach_id = auth.uid()));

CREATE POLICY "Admin and Coaches can create invitations"
ON public.invitations FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND role = 'admin') OR
    EXISTS (SELECT 1 FROM public.equipos WHERE equipos.id = invitations.team_id AND equipos.coach_id = auth.uid())
);

-- 4. Ampliar tabla players para relacionar con perfiles de familia/jugador
ALTER TABLE public.players
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS gdpr_consent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS medical_notes TEXT;

-- 5. Actualizar políticas de players (Visibilidad)
DROP POLICY IF EXISTS "Players are viewable by everyone in the club" ON public.players;

CREATE POLICY "Admin can view all players"
ON public.players FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND role = 'admin'));

CREATE POLICY "Coaches can view their team players"
ON public.players FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM public.equipos WHERE equipos.id = players.team_id AND equipos.coach_id = auth.uid()));

CREATE POLICY "Players/Family can view their own record"
ON public.players FOR SELECT
TO authenticated
USING (players.user_id = auth.uid());
