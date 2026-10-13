-- ==============================================================================
-- ESQUEMA BASE REAL Y DEPENDENCIAS PARA TEST AISLADO
-- Archivo: scripts/sql/test-base-dependencies.sql
-- ==============================================================================
-- Reproduce fielmente el esquema del que dependen las 3 tablas de rendimiento:
-- public.clubs, auth.users, public.profiles, public.teams, public.team_coaches,
-- public.players, public.player_tutors, public.team_events
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Esquema auth simulado de Supabase (necesario para auth.uid() y FKs a auth.users)
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Función auth.uid() que devuelve el UUID establecido en la sesión (o null)
CREATE OR REPLACE FUNCTION auth.uid() 
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. public.clubs
CREATE TABLE IF NOT EXISTS public.clubs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    deporte TEXT NOT NULL DEFAULT 'Fútbol',
    pais TEXT NOT NULL DEFAULT 'España',
    email_contacto TEXT,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. public.profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    club_id UUID REFERENCES public.clubs(id) ON DELETE SET NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    role TEXT NOT NULL CHECK (role IN (
        'admin', 'superadmin', 'coordinador', 'metodologo', 
        'preparador_fisico', 'fisio', 'entrenador', 'coach', 
        'jugador', 'tutor', 'familia', 'delegado'
    )),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. public.teams
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    coach_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    color TEXT DEFAULT '#1E40AF',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. public.team_coaches
CREATE TABLE IF NOT EXISTS public.team_coaches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'Entrenador',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(team_id, profile_id)
);

-- 6. public.players
CREATE TABLE IF NOT EXISTS public.players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    birth_date DATE NOT NULL,
    dorsal INTEGER,
    user_auth_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    tutor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    parent_contact TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. public.player_tutors
CREATE TABLE IF NOT EXISTS public.player_tutors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    tutor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(player_id, tutor_id)
);

-- 8. public.team_events
CREATE TABLE IF NOT EXISTS public.team_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('Entrenamiento', 'Partido', 'Reunión', 'Otro')),
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,
    location TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Habilitar RLS en tablas base con políticas que permitan a authenticated leer perfiles, jugadores y equipos para subconsultas de RLS
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_tutors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_events ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura base para authenticated
CREATE POLICY "profiles_select_auth" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "clubs_select_auth" ON public.clubs FOR SELECT TO authenticated USING (true);
CREATE POLICY "teams_select_auth" ON public.teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "team_coaches_select_auth" ON public.team_coaches FOR SELECT TO authenticated USING (true);
CREATE POLICY "players_select_auth" ON public.players FOR SELECT TO authenticated USING (true);
CREATE POLICY "player_tutors_select_auth" ON public.player_tutors FOR SELECT TO authenticated USING (true);
CREATE POLICY "team_events_select_auth" ON public.team_events FOR SELECT TO authenticated USING (true);

