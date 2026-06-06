-- ==========================================
-- Módulo 2: Reestructuración Jugadores, Familias y Datos Médicos
-- ==========================================

-- 1. Modificar tabla players
ALTER TABLE public.players
  DROP COLUMN IF EXISTS parent_contact,
  ADD COLUMN IF NOT EXISTS dni TEXT,
  ADD COLUMN IF NOT EXISTS num_licencia_fed TEXT,
  ADD COLUMN IF NOT EXISTS posicion_principal TEXT;

-- ==========================================
-- 2. Tabla relacion_familias
-- ==========================================
CREATE TABLE IF NOT EXISTS public.relacion_familias (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
  usuario_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Opcional, para vincular cuenta
  tutor1_nombre TEXT NOT NULL,
  tutor1_telefono TEXT NOT NULL,
  tutor1_email TEXT,
  tutor2_nombre TEXT,
  tutor2_telefono TEXT,
  descuento_hermanos BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.relacion_familias ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins and coaches can manage familias') THEN
        CREATE POLICY "Admins and coaches can manage familias" ON public.relacion_familias FOR ALL TO authenticated USING (
          EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'coach'))
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Families can view their own relations') THEN
        CREATE POLICY "Families can view their own relations" ON public.relacion_familias FOR SELECT TO authenticated USING (
          usuario_id = auth.uid()
        );
    END IF;
END $$;

-- ==========================================
-- 3. Tabla fichas_medicas
-- ==========================================
CREATE TABLE IF NOT EXISTS public.fichas_medicas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL UNIQUE,
  alergias TEXT,
  enfermedades TEXT,
  medicacion TEXT,
  grupo_sanguineo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.fichas_medicas ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins and coaches can view/manage medical data') THEN
        CREATE POLICY "Admins and coaches can view/manage medical data" ON public.fichas_medicas FOR ALL TO authenticated USING (
          EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'coach'))
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Families can view/manage their kids medical data') THEN
        CREATE POLICY "Families can view/manage their kids medical data" ON public.fichas_medicas FOR ALL TO authenticated USING (
          EXISTS (SELECT 1 FROM public.relacion_familias WHERE player_id = fichas_medicas.player_id AND usuario_id = auth.uid())
        );
    END IF;
END $$;

-- ==========================================
-- 4. Tabla autorizaciones
-- ==========================================
CREATE TABLE IF NOT EXISTS public.autorizaciones (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
  tipo_autorizacion TEXT NOT NULL,
  firmado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.autorizaciones ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins and coaches can manage autorizaciones') THEN
        CREATE POLICY "Admins and coaches can manage autorizaciones" ON public.autorizaciones FOR ALL TO authenticated USING (
          EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'coach'))
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Families can view/update their kids autorizaciones') THEN
        CREATE POLICY "Families can view/update their kids autorizaciones" ON public.autorizaciones FOR ALL TO authenticated USING (
          EXISTS (SELECT 1 FROM public.relacion_familias WHERE player_id = autorizaciones.player_id AND usuario_id = auth.uid())
        );
    END IF;
END $$;
