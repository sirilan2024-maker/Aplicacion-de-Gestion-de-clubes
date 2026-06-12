-- Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. PROFILES (Usuarios y Entrenadores)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'coach')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas (Usando bloque DO para evitar errores si ya existen)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public profiles are viewable by authenticated users.') THEN
        CREATE POLICY "Public profiles are viewable by authenticated users." ON public.profiles FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own profile.') THEN
        CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own profile.') THEN
        CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
    END IF;
END $$;

-- ==========================================
-- 2. TEAMS (Equipos)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Prebenjamín', 'Benjamín', 'Alevín', 'Infantil', 'Cadete', 'Juvenil')),
  coach_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  color TEXT DEFAULT '#1E40AF',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Teams are viewable by authenticated users.') THEN
        CREATE POLICY "Teams are viewable by authenticated users." ON public.teams FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Teams can be created by admins.') THEN
        CREATE POLICY "Teams can be created by admins." ON public.teams FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Teams can be updated by admins or assigned coach.') THEN
        CREATE POLICY "Teams can be updated by admins or assigned coach." ON public.teams FOR UPDATE TO authenticated USING (
          EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') OR coach_id = auth.uid()
        );
    END IF;
END $$;

-- ==========================================
-- 3. PLAYERS (Jugadores)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.players (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  parent_contact TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Players are viewable by authenticated users.') THEN
        CREATE POLICY "Players are viewable by authenticated users." ON public.players FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Players can be modified by admins or assigned coach.') THEN
        CREATE POLICY "Players can be modified by admins or assigned coach." ON public.players FOR ALL TO authenticated USING (
          EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') OR 
          EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND coach_id = auth.uid())
        );
    END IF;
END $$;

-- ==========================================
-- 4. TRAINING SESSIONS (Entrenamientos)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.training_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  date_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 90 NOT NULL,
  location TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Training sessions are viewable by authenticated users.') THEN
        CREATE POLICY "Training sessions are viewable by authenticated users." ON public.training_sessions FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Training sessions can be managed by admins or assigned coach.') THEN
        CREATE POLICY "Training sessions can be managed by admins or assigned coach." ON public.training_sessions FOR ALL TO authenticated USING (
          EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') OR 
          EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND coach_id = auth.uid())
        );
    END IF;
END $$;

-- ==========================================
-- 5. ATTENDANCE (Asistencia)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES public.training_sessions(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'excused')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(session_id, player_id)
);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Attendance is viewable by authenticated users.') THEN
        CREATE POLICY "Attendance is viewable by authenticated users." ON public.attendance FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Attendance can be managed by admins or assigned coach.') THEN
        CREATE POLICY "Attendance can be managed by admins or assigned coach." ON public.attendance FOR ALL TO authenticated USING (
          EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') OR 
          EXISTS (
            SELECT 1 FROM public.training_sessions ts 
            JOIN public.teams t ON ts.team_id = t.id 
            WHERE ts.id = session_id AND t.coach_id = auth.uid()
          )
        );
    END IF;
END $$;

-- ==========================================
-- TRIGGERS Y FUNCIONES ÚTILES
-- ==========================================

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, role)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'first_name', 'Usuario'), 
    COALESCE(new.raw_user_meta_data->>'last_name', 'Nuevo'), 
    COALESCE(new.raw_user_meta_data->>'role', 'coach')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger (Eliminar si existe para evitar error al recrear)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
