-- 1. Añadir avatar_url a players y profiles
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 1b. Eliminar restricción de category en teams para permitir categorías reales
ALTER TABLE public.teams DROP CONSTRAINT IF EXISTS teams_category_check;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Crear tabla team_coaches
CREATE TABLE IF NOT EXISTS public.team_coaches (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'Entrenador',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(team_id, profile_id)
);

ALTER TABLE public.team_coaches ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins and club members can view team_coaches') THEN
        CREATE POLICY "Admins and club members can view team_coaches" ON public.team_coaches FOR SELECT TO authenticated USING (
          EXISTS (
            SELECT 1 FROM public.teams t 
            WHERE t.id = team_id AND t.club_id IN (
              SELECT club_id FROM public.profiles WHERE id = auth.uid()
            )
          )
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage team_coaches') THEN
        CREATE POLICY "Admins can manage team_coaches" ON public.team_coaches FOR ALL TO authenticated USING (
          EXISTS (
            SELECT 1 FROM public.teams t
            JOIN public.profiles p ON t.club_id = p.club_id
            WHERE t.id = team_id AND p.id = auth.uid() AND p.role = 'admin'
          )
        );
    END IF;
END $$;

-- 3. Crear Storage bucket "avatars" si no existe
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS (if they don't exist already)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Avatar images are publicly accessible.' AND tablename = 'objects' AND schemaname = 'storage') THEN
        CREATE POLICY "Avatar images are publicly accessible."
          ON storage.objects FOR SELECT
          USING ( bucket_id = 'avatars' );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can upload an avatar.' AND tablename = 'objects' AND schemaname = 'storage') THEN
        CREATE POLICY "Anyone can upload an avatar."
          ON storage.objects FOR INSERT
          WITH CHECK ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can update their avatar.' AND tablename = 'objects' AND schemaname = 'storage') THEN
        CREATE POLICY "Anyone can update their avatar."
          ON storage.objects FOR UPDATE
          USING ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );
    END IF;
END $$;
