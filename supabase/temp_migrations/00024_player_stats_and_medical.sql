-- ==========================================
-- Migración: Historial Deportivo y Médico de Jugadores
-- ==========================================

DO $$ 
BEGIN
    -- Añadir columna: Notas médicas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'players' AND column_name = 'medical_notes') THEN
        ALTER TABLE public.players ADD COLUMN medical_notes TEXT;
    END IF;

    -- Añadir columna: Minutos acumulados jugados
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'players' AND column_name = 'accumulated_minutes') THEN
        ALTER TABLE public.players ADD COLUMN accumulated_minutes INTEGER DEFAULT 0;
    END IF;

    -- Añadir columna: Valoración técnica (1 a 10)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'players' AND column_name = 'technical_rating') THEN
        ALTER TABLE public.players ADD COLUMN technical_rating NUMERIC(4, 2) CHECK (technical_rating >= 1.00 AND technical_rating <= 10.00);
    END IF;

    -- Añadir columna: Estado del jugador (Activo, Lesionado, Sancionado)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'players' AND column_name = 'status') THEN
        ALTER TABLE public.players ADD COLUMN status TEXT DEFAULT 'Activo' CHECK (status IN ('Activo', 'Lesionado', 'Sancionado'));
    END IF;
END $$;

-- Verificando políticas RLS de UPDATE en players
-- En la migración 00004 y 00015 se aseguraba el acceso a UPDATE para 'admin' y 'coach'.
-- Volvemos a reafirmar la política por seguridad para asegurar que cubra los nuevos campos.
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins pueden actualizar jugadores' AND tablename = 'players') THEN
        CREATE POLICY "Admins pueden actualizar jugadores"
        ON public.players FOR UPDATE TO authenticated
        USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'metodologo'))
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Coaches pueden actualizar sus jugadores' AND tablename = 'players') THEN
        CREATE POLICY "Coaches pueden actualizar sus jugadores"
        ON public.players FOR UPDATE TO authenticated
        USING (
            EXISTS (SELECT 1 FROM public.equipos WHERE id = public.players.team_id AND coach_id = auth.uid())
        );
    END IF;
END $$;
