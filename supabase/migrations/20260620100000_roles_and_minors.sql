-- ============================================================
-- MÓDULO: SISTEMA DE ROLES Y MENORES (LOPDGDD)
-- ============================================================

-- 1. Actualizar roles en la tabla profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'coordinador', 'entrenador', 'jugador', 'tutor', 'familia', 'coach'));

-- 2. Migrar antiguos coaches a entrenadores (Opcional, pero recomendado)
UPDATE public.profiles SET role = 'entrenador' WHERE role = 'coach';

-- 3. Modificar tabla players para soportar tutores y logins propios
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS tutor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS user_auth_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4. Modificar políticas RLS para los jugadores
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Tutors can view their linked players') THEN
        CREATE POLICY "Tutors can view their linked players" ON public.players FOR SELECT TO authenticated USING (auth.uid() = tutor_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Players can view themselves') THEN
        CREATE POLICY "Players can view themselves" ON public.players FOR SELECT TO authenticated USING (auth.uid() = user_auth_id);
    END IF;
    
    -- Añadir política para que los admin puedan modificar profiles (y por ende roles)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update profiles') THEN
        CREATE POLICY "Admins can update profiles" ON public.profiles FOR UPDATE TO authenticated USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        );
    END IF;
END $$;
