-- 20260820_session_evaluation.sql
-- FASE 4.2: Evaluación y Cierre de Ciclo Metodológico Post-Sesión

-- 1. Tabla de Evaluación de Sesión
CREATE TABLE IF NOT EXISTS public.session_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    evaluator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    actual_duration_min INT NOT NULL DEFAULT 90,
    session_rpe INT NOT NULL DEFAULT 6 CHECK (session_rpe BETWEEN 1 AND 10),
    objective_achievement INT NOT NULL DEFAULT 3 CHECK (objective_achievement BETWEEN 1 AND 4),
    players_present_count INT NOT NULL DEFAULT 0,
    coach_observations TEXT,
    incidents_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id)
);

-- 2. Tabla de Valoración de Comportamientos Observables en la Sesión
CREATE TABLE IF NOT EXISTS public.session_behaviour_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_evaluation_id UUID NOT NULL REFERENCES public.session_evaluations(id) ON DELETE CASCADE,
    behaviour_id UUID REFERENCES public.methodology_behaviours(id) ON DELETE SET NULL,
    behaviour_description TEXT NOT NULL,
    game_phase_or_family TEXT,
    score INT NOT NULL DEFAULT 3 CHECK (score BETWEEN 1 AND 4),
    coach_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_evaluation_id, behaviour_description)
);

-- 3. Índices de Rendimiento
CREATE INDEX IF NOT EXISTS idx_session_eval_session ON public.session_evaluations(session_id);
CREATE INDEX IF NOT EXISTS idx_session_eval_club ON public.session_evaluations(club_id);
CREATE INDEX IF NOT EXISTS idx_session_behav_eval_parent ON public.session_behaviour_evaluations(session_evaluation_id);

-- 4. RLS Multi-Tenant
ALTER TABLE public.session_evaluations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Club members can view session_evaluations') THEN
        CREATE POLICY "Club members can view session_evaluations"
            ON public.session_evaluations FOR SELECT
            USING (club_id IN (SELECT club_id FROM public.profiles WHERE id = auth.uid()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff can manage session_evaluations') THEN
        CREATE POLICY "Staff can manage session_evaluations"
            ON public.session_evaluations FOR ALL
            USING (club_id IN (SELECT club_id FROM public.profiles WHERE id = auth.uid()));
    END IF;
END $$;

ALTER TABLE public.session_behaviour_evaluations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Club members can view session_behaviour_evaluations') THEN
        CREATE POLICY "Club members can view session_behaviour_evaluations"
            ON public.session_behaviour_evaluations FOR SELECT
            USING (session_evaluation_id IN (
                SELECT id FROM public.session_evaluations 
                WHERE club_id IN (SELECT club_id FROM public.profiles WHERE id = auth.uid())
            ));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff can manage session_behaviour_evaluations') THEN
        CREATE POLICY "Staff can manage session_behaviour_evaluations"
            ON public.session_behaviour_evaluations FOR ALL
            USING (session_evaluation_id IN (
                SELECT id FROM public.session_evaluations 
                WHERE club_id IN (SELECT club_id FROM public.profiles WHERE id = auth.uid())
            ));
    END IF;
END $$;
