-- 1. Actualizar roles en la tabla profiles para incluir 'utillero'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'coordinador', 'entrenador', 'jugador', 'tutor', 'familia', 'coach', 'utillero'));

-- 2. Crear tabla player_apparel (ropa de jugador)
CREATE TABLE IF NOT EXISTS public.player_apparel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL, -- e.g. 'Camiseta de Juego', 'Medias', etc.
  size TEXT NOT NULL,
  delivered BOOLEAN DEFAULT FALSE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT unique_player_apparel_item UNIQUE(player_id, item_name)
);

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE public.player_apparel ENABLE ROW LEVEL SECURITY;

-- 4. Crear políticas de acceso RLS
DROP POLICY IF EXISTS "Anyone can select player_apparel" ON public.player_apparel;
CREATE POLICY "Anyone can select player_apparel" ON public.player_apparel
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Staff can manage player_apparel" ON public.player_apparel;
CREATE POLICY "Staff can manage player_apparel" ON public.player_apparel
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'coordinador', 'utillero')
    )
  );

DROP POLICY IF EXISTS "Players and tutors can manage their sizes" ON public.player_apparel;
CREATE POLICY "Players and tutors can manage their sizes" ON public.player_apparel
  FOR ALL TO authenticated USING (
    (auth.uid() = (SELECT user_auth_id FROM public.players WHERE id = player_id)) OR
    (auth.uid() = (SELECT tutor_id FROM public.players WHERE id = player_id))
  );
