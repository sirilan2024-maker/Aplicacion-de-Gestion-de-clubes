-- 20260819_library_schema.sql
-- FASE 3/4: Biblioteca Metodológica Profesional v1.0 Schema Extensions & Constraints

-- 1. Nuevas columnas estructurales y taxonómicas en banco_ejercicios
ALTER TABLE public.banco_ejercicios ADD COLUMN IF NOT EXISTS familia TEXT;
ALTER TABLE public.banco_ejercicios ADD COLUMN IF NOT EXISTS fuente TEXT DEFAULT 'Adaptación metodológica';
ALTER TABLE public.banco_ejercicios ADD COLUMN IF NOT EXISTS organizacion TEXT;
ALTER TABLE public.banco_ejercicios ADD COLUMN IF NOT EXISTS distribucion_inicial TEXT;
ALTER TABLE public.banco_ejercicios ADD COLUMN IF NOT EXISTS desarrollo TEXT;
ALTER TABLE public.banco_ejercicios ADD COLUMN IF NOT EXISTS rotaciones TEXT;
ALTER TABLE public.banco_ejercicios ADD COLUMN IF NOT EXISTS puntuacion TEXT;
ALTER TABLE public.banco_ejercicios ADD COLUMN IF NOT EXISTS intervenciones TEXT;
ALTER TABLE public.banco_ejercicios ADD COLUMN IF NOT EXISTS is_validated BOOLEAN DEFAULT true;

-- 2. Tabla relacional many-to-many: exercise_principles
CREATE TABLE IF NOT EXISTS public.exercise_principles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID NOT NULL REFERENCES public.banco_ejercicios(id) ON DELETE CASCADE,
    principle_id UUID NOT NULL REFERENCES public.methodology_principles(id) ON DELETE CASCADE,
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(exercise_id, principle_id)
);

-- 3. Tabla relacional many-to-many: exercise_subprinciples
CREATE TABLE IF NOT EXISTS public.exercise_subprinciples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID NOT NULL REFERENCES public.banco_ejercicios(id) ON DELETE CASCADE,
    subprinciple_id UUID NOT NULL REFERENCES public.methodology_subprinciples(id) ON DELETE CASCADE,
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(exercise_id, subprinciple_id)
);

-- 4. Tabla relacional many-to-many: exercise_behaviours
CREATE TABLE IF NOT EXISTS public.exercise_behaviours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID NOT NULL REFERENCES public.banco_ejercicios(id) ON DELETE CASCADE,
    behaviour_id UUID NOT NULL REFERENCES public.methodology_behaviours(id) ON DELETE CASCADE,
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(exercise_id, behaviour_id)
);

-- 5. Adaptación de constraint en session_drills para admitir fases metodológicas en español e inglés
DO $$ BEGIN
    ALTER TABLE public.session_drills DROP CONSTRAINT IF EXISTS session_drills_phase_check;
    ALTER TABLE public.session_drills ADD CONSTRAINT session_drills_phase_check 
        CHECK (phase IN ('activacion', 'principal_1', 'principal_2', 'global', 'vuelta_calma', 'warmup', 'main_1', 'main_2', 'cooldown'));
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 6. Índices para optimización de búsqueda y recomendación
CREATE INDEX IF NOT EXISTS idx_banco_ejercicios_category ON public.banco_ejercicios(age_category);
CREATE INDEX IF NOT EXISTS idx_banco_ejercicios_familia ON public.banco_ejercicios(familia);
CREATE INDEX IF NOT EXISTS idx_banco_ejercicios_tipo ON public.banco_ejercicios(tipo);
CREATE INDEX IF NOT EXISTS idx_session_drills_session_id ON public.session_drills(session_id);

-- 7. RLS Policies
ALTER TABLE public.exercise_principles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Club members can view exercise_principles') THEN
        CREATE POLICY "Club members can view exercise_principles"
            ON public.exercise_principles FOR SELECT
            USING (club_id IN (SELECT club_id FROM public.profiles WHERE id = auth.uid()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins and metodologos can manage exercise_principles') THEN
        CREATE POLICY "Admins and metodologos can manage exercise_principles"
            ON public.exercise_principles FOR ALL
            USING (club_id IN (SELECT club_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'metodologo', 'coordinador')));
    END IF;
END $$;

ALTER TABLE public.exercise_subprinciples ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Club members can view exercise_subprinciples') THEN
        CREATE POLICY "Club members can view exercise_subprinciples"
            ON public.exercise_subprinciples FOR SELECT
            USING (club_id IN (SELECT club_id FROM public.profiles WHERE id = auth.uid()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins and metodologos can manage exercise_subprinciples') THEN
        CREATE POLICY "Admins and metodologos can manage exercise_subprinciples"
            ON public.exercise_subprinciples FOR ALL
            USING (club_id IN (SELECT club_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'metodologo', 'coordinador')));
    END IF;
END $$;

ALTER TABLE public.exercise_behaviours ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Club members can view exercise_behaviours') THEN
        CREATE POLICY "Club members can view exercise_behaviours"
            ON public.exercise_behaviours FOR SELECT
            USING (club_id IN (SELECT club_id FROM public.profiles WHERE id = auth.uid()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins and metodologos can manage exercise_behaviours') THEN
        CREATE POLICY "Admins and metodologos can manage exercise_behaviours"
            ON public.exercise_behaviours FOR ALL
            USING (club_id IN (SELECT club_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'metodologo', 'coordinador')));
    END IF;
END $$;
