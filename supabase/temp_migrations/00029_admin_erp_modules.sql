-- 00029_admin_erp_modules.sql
-- =======================================================
-- FASE 2: Nuevos Módulos ERP (Temporadas, Tesorería, Secretaría)
-- =======================================================

-- 1. Temporadas (Seasons)
CREATE TABLE IF NOT EXISTS public.seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_active boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Asegurar que solo hay una temporada activa a la vez (opcional pero recomendado)
CREATE UNIQUE INDEX IF NOT EXISTS idx_seasons_active ON public.seasons (is_active) WHERE is_active = true;

-- Agregar season_id a tablas principales
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS season_id uuid REFERENCES public.seasons(id);
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS season_id uuid REFERENCES public.seasons(id);

-- En lugar de match_stats (que no existe), agregamos a partidos
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='partidos') THEN
    ALTER TABLE public.partidos ADD COLUMN IF NOT EXISTS season_id uuid REFERENCES public.seasons(id);
  END IF;
END $$;


-- 2. Tesorería (Treasury)
CREATE TABLE IF NOT EXISTS public.treasury_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES public.players(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
  concept text NOT NULL,
  stripe_id text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_treasury_player ON public.treasury_payments (player_id);

-- 3. Storage Bucket: Secretaría
INSERT INTO storage.buckets (id, name, public) 
VALUES ('secretaria_docs', 'secretaria_docs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies para secretaria_docs
-- Admins pueden leer y escribir todo
CREATE POLICY "Admin CRUD secretaria" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'secretaria_docs' AND 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- Jugadores/familias pueden leer y subir sus propios documentos (basado en el nombre del archivo o carpeta que contenga su ID)
CREATE POLICY "Users own files secretaria" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'secretaria_docs' AND 
    (auth.uid()::text = (storage.foldername(name))[1])
  );

-- Enable RLS en nuevas tablas
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasury_payments ENABLE ROW LEVEL SECURITY;

-- RLS Seasons
CREATE POLICY "Seasons are viewable by everyone" ON public.seasons
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Seasons are manageable by admins" ON public.seasons
  FOR ALL TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- RLS Treasury
CREATE POLICY "Treasury viewable by admins and owners" ON public.treasury_payments
  FOR SELECT TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' OR
    player_id IN (
      -- Jugador propio o familia (simplificado, se puede ajustar con profile.team_id si es necesario)
      SELECT p.id FROM public.players p WHERE p.user_id = auth.uid() OR p.family_id = auth.uid()
    )
  );

CREATE POLICY "Treasury manageable by admins" ON public.treasury_payments
  FOR ALL TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
