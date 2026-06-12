-- =====================================================
-- Módulo: Roles de Usuario, team_id y RLS Strict
-- =====================================================

-- 1. Modificar tabla profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Añadir nuevas columnas si no existen
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS rol TEXT CHECK (rol IN ('admin', 'entrenador', 'jugador', 'familia')),
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linked_player_id UUID REFERENCES public.players(id) ON DELETE SET NULL;

-- Actualizar registros existentes para tener coherencia
UPDATE public.profiles
SET rol = CASE 
  WHEN role = 'admin' THEN 'admin'
  ELSE 'entrenador'
END
WHERE rol IS NULL;

-- 2. Actualizar función y disparador de creación de perfiles
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role, rol, club_id, team_id, linked_player_id)
  VALUES (
    new.id, 
    new.email,
    COALESCE(new.raw_user_meta_data->>'first_name', 'Usuario'), 
    COALESCE(new.raw_user_meta_data->>'last_name', 'Nuevo'), 
    COALESCE(new.raw_user_meta_data->>'role', 'coach'),
    COALESCE(
      new.raw_user_meta_data->>'rol',
      CASE WHEN new.raw_user_meta_data->>'role' = 'admin' THEN 'admin' ELSE 'entrenador' END
    ),
    NULLIF(new.raw_user_meta_data->>'club_id', '')::uuid,
    NULLIF(new.raw_user_meta_data->>'team_id', '')::uuid,
    NULLIF(new.raw_user_meta_data->>'linked_player_id', '')::uuid
  )
  ON CONFLICT (id) DO UPDATE SET
    email            = EXCLUDED.email,
    club_id          = COALESCE(EXCLUDED.club_id, profiles.club_id),
    rol              = COALESCE(EXCLUDED.rol, profiles.rol),
    role             = COALESCE(EXCLUDED.role, profiles.role),
    team_id          = COALESCE(EXCLUDED.team_id, profiles.team_id),
    linked_player_id = COALESCE(EXCLUDED.linked_player_id, profiles.linked_player_id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recrear trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Reconfigurar RLS estricto para 'familia' y 'jugador'

-- DROP de políticas antiguas para evitar duplicados
DROP POLICY IF EXISTS "Teams are viewable by authenticated users." ON public.teams;
DROP POLICY IF EXISTS "Players are viewable by authenticated users." ON public.players;
DROP POLICY IF EXISTS "Partidos visibles para el mismo club" ON public.partidos;
DROP POLICY IF EXISTS "Convocatorias visibles para autenticados" ON public.convocatorias;
DROP POLICY IF EXISTS "Admins y coach del equipo pueden gestionar convocatorias" ON public.convocatorias;
DROP POLICY IF EXISTS "Convocatorias update policy" ON public.convocatorias;

-- A) TEAMS
CREATE POLICY "Teams SELECT policy"
ON public.teams FOR SELECT TO authenticated
USING (
  (SELECT rol FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'entrenador')
  OR
  id = (SELECT team_id FROM public.profiles WHERE id = auth.uid())
);

-- B) PLAYERS
CREATE POLICY "Players SELECT policy"
ON public.players FOR SELECT TO authenticated
USING (
  (SELECT rol FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'entrenador')
  OR
  team_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid())
);

-- C) PARTIDOS (MATCHES)
CREATE POLICY "Partidos SELECT policy"
ON public.partidos FOR SELECT TO authenticated
USING (
  (SELECT rol FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'entrenador')
  OR
  equipo_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid())
);

-- D) CONVOCATORIAS / ALINEACIONES
CREATE POLICY "Convocatorias SELECT policy"
ON public.convocatorias FOR SELECT TO authenticated
USING (
  (SELECT rol FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'entrenador')
  OR
  EXISTS (
    SELECT 1 FROM public.players pl
    WHERE pl.id = player_id
      AND pl.team_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Convocatorias WRITE policy"
ON public.convocatorias FOR ALL TO authenticated
USING (
  (SELECT rol FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'entrenador')
  OR
  player_id = (SELECT linked_player_id FROM public.profiles WHERE id = auth.uid())
)
WITH CHECK (
  (SELECT rol FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'entrenador')
  OR
  player_id = (SELECT linked_player_id FROM public.profiles WHERE id = auth.uid())
);
