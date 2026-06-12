-- ==========================================
-- Migración: Informe Post-Partido
-- ==========================================

DO $$ 
BEGIN
    -- Añadir nuevas columnas a 'partidos'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'partidos' AND column_name = 'coach_rating') THEN
        ALTER TABLE public.partidos ADD COLUMN coach_rating INTEGER CHECK (coach_rating >= 1 AND coach_rating <= 10);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'partidos' AND column_name = 'coach_summary') THEN
        ALTER TABLE public.partidos ADD COLUMN coach_summary TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'partidos' AND column_name = 'positive_aspects') THEN
        ALTER TABLE public.partidos ADD COLUMN positive_aspects TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'partidos' AND column_name = 'improvement_aspects') THEN
        ALTER TABLE public.partidos ADD COLUMN improvement_aspects TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'partidos' AND column_name = 'attitude_notes') THEN
        ALTER TABLE public.partidos ADD COLUMN attitude_notes TEXT;
    END IF;
END $$;
