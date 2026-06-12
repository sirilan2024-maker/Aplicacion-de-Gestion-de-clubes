-- ==========================================
-- Migración: Añadir campos extendidos del Excel a la tabla de jugadores
-- ==========================================

DO $$ 
BEGIN
    -- Apodo
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'players' AND column_name = 'nickname') THEN
        ALTER TABLE public.players ADD COLUMN nickname TEXT;
    END IF;

    -- Año de llegada
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'players' AND column_name = 'join_year') THEN
        ALTER TABLE public.players ADD COLUMN join_year INTEGER;
    END IF;

    -- Número de licencia
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'players' AND column_name = 'license_number') THEN
        ALTER TABLE public.players ADD COLUMN license_number TEXT;
    END IF;

    -- Padre 1
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'players' AND column_name = 'parent1_name') THEN
        ALTER TABLE public.players ADD COLUMN parent1_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'players' AND column_name = 'parent1_last_name') THEN
        ALTER TABLE public.players ADD COLUMN parent1_last_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'players' AND column_name = 'parent1_email') THEN
        ALTER TABLE public.players ADD COLUMN parent1_email TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'players' AND column_name = 'parent1_phone') THEN
        ALTER TABLE public.players ADD COLUMN parent1_phone TEXT;
    END IF;

    -- Padre 2
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'players' AND column_name = 'parent2_name') THEN
        ALTER TABLE public.players ADD COLUMN parent2_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'players' AND column_name = 'parent2_last_name') THEN
        ALTER TABLE public.players ADD COLUMN parent2_last_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'players' AND column_name = 'parent2_email') THEN
        ALTER TABLE public.players ADD COLUMN parent2_email TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'players' AND column_name = 'parent2_phone') THEN
        ALTER TABLE public.players ADD COLUMN parent2_phone TEXT;
    END IF;
END $$;
