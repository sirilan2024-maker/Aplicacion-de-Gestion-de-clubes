-- ==========================================
-- Migración: Informe Técnico Post-Partido
-- ==========================================

DO $$ 
BEGIN
    -- Añadir columna: Informe del Entrenador
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'partidos' AND column_name = 'coach_report') THEN
        ALTER TABLE public.partidos ADD COLUMN coach_report TEXT;
    END IF;
END $$;
