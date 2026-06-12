-- ==========================================
-- Módulo: Mensajería y Calendario
-- ==========================================

-- 1. Tabla de Eventos (Calendario)
CREATE TABLE IF NOT EXISTS public.events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL,
  equipo_id UUID REFERENCES public.equipos(id) ON DELETE CASCADE, -- NULL means club-wide event
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('Entrenamiento', 'Partido', 'Social', 'Reunión', 'Otro')),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Eventos visibles para el club') THEN
        CREATE POLICY "Eventos visibles para el club" 
        ON public.events FOR SELECT TO authenticated 
        USING (club_id = (SELECT club_id FROM public.profiles WHERE id = auth.uid()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins y coaches pueden gestionar eventos') THEN
        CREATE POLICY "Admins y coaches pueden gestionar eventos" 
        ON public.events FOR ALL TO authenticated 
        USING (
          EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'coach', 'metodologo'))
        );
    END IF;
END $$;

-- 2. Tabla de Mensajes (Tablón)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL,
  equipo_id UUID REFERENCES public.equipos(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Mensajes visibles para el equipo') THEN
        CREATE POLICY "Mensajes visibles para el equipo" 
        ON public.messages FOR SELECT TO authenticated 
        USING (club_id = (SELECT club_id FROM public.profiles WHERE id = auth.uid()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Autores pueden gestionar sus mensajes') THEN
        CREATE POLICY "Autores pueden gestionar sus mensajes" 
        ON public.messages FOR ALL TO authenticated 
        USING (sender_id = auth.uid());
    END IF;
END $$;
