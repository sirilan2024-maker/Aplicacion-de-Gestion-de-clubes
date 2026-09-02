-- ==============================================================================
-- FASE 2: ARQUITECTURA DE DATOS MÉDICA DEPORTIVA Y EVOLUCIÓN SEGURA
-- ==============================================================================

-- 1. Catálogo Anatómico: anatomical_zones
CREATE TABLE IF NOT EXISTS public.anatomical_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(80) UNIQUE NOT NULL,
    name VARCHAR(120) NOT NULL,
    clinical_name VARCHAR(150),
    general_region VARCHAR(60) NOT NULL,
    parent_zone_id UUID REFERENCES public.anatomical_zones(id) ON DELETE SET NULL,
    laterality VARCHAR(30) DEFAULT 'no_aplica',
    structure_type VARCHAR(40) NOT NULL,
    svg_element_id VARCHAR(80),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_anatomical_zones_code ON public.anatomical_zones(code);
CREATE INDEX IF NOT EXISTS idx_anatomical_zones_region ON public.anatomical_zones(general_region);
CREATE INDEX IF NOT EXISTS idx_anatomical_zones_type ON public.anatomical_zones(structure_type);

-- 2. Catálogo de Tipos de Lesión: injury_types
CREATE TABLE IF NOT EXISTS public.injury_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(60) NOT NULL,
    tissue VARCHAR(50),
    classification_system VARCHAR(80),
    description TEXT,
    typical_min_days INT,
    typical_max_days INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_injury_types_code ON public.injury_types(code);
CREATE INDEX IF NOT EXISTS idx_injury_types_category ON public.injury_types(category);

-- 3. Evolución incremental no destructiva de player_injuries
ALTER TABLE public.player_injuries
    ADD COLUMN IF NOT EXISTS anatomical_zone_id UUID REFERENCES public.anatomical_zones(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS injury_type_id UUID REFERENCES public.injury_types(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS parent_injury_id UUID REFERENCES public.player_injuries(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS is_recurrence BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS rts_phase VARCHAR(50) DEFAULT 'fase_1_aguda',
    ADD COLUMN IF NOT EXISTS mechanism_details TEXT,
    ADD COLUMN IF NOT EXISTS diagnosis_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_player_injuries_zone ON public.player_injuries(anatomical_zone_id);
CREATE INDEX IF NOT EXISTS idx_player_injuries_type_id ON public.player_injuries(injury_type_id);
CREATE INDEX IF NOT EXISTS idx_player_injuries_parent ON public.player_injuries(parent_injury_id);

-- 4. Exámenes Clínicos y Seguimiento: injury_examinations
CREATE TABLE IF NOT EXISTS public.injury_examinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    injury_id UUID NOT NULL REFERENCES public.player_injuries(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    examination_date DATE NOT NULL DEFAULT CURRENT_DATE,
    examiner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    examiner_name VARCHAR(120),
    pain_at_rest INT CHECK (pain_at_rest >= 0 AND pain_at_rest <= 10),
    pain_on_palpation INT CHECK (pain_on_palpation >= 0 AND pain_on_palpation <= 10),
    pain_on_contraction INT CHECK (pain_on_contraction >= 0 AND pain_on_contraction <= 10),
    pain_on_stretch INT CHECK (pain_on_stretch >= 0 AND pain_on_stretch <= 10),
    functional_status VARCHAR(60),
    clinical_findings TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_injury_examinations_injury ON public.injury_examinations(injury_id, examination_date DESC);
CREATE INDEX IF NOT EXISTS idx_injury_examinations_club ON public.injury_examinations(club_id);

-- 5. Registro Granular de Dolor: injury_pain_records
CREATE TABLE IF NOT EXISTS public.injury_pain_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    injury_id UUID NOT NULL REFERENCES public.player_injuries(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    record_date DATE NOT NULL DEFAULT CURRENT_DATE,
    pain_score NUMERIC(3,1) NOT NULL CHECK (pain_score >= 0 AND pain_score <= 10),
    context VARCHAR(50) DEFAULT 'reposo',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_injury_pain_injury_date ON public.injury_pain_records(injury_id, record_date DESC);
CREATE INDEX IF NOT EXISTS idx_injury_pain_club ON public.injury_pain_records(club_id);

-- 6. Evaluaciones Funcionales (ROM y Fuerza): injury_functional_assessments
CREATE TABLE IF NOT EXISTS public.injury_functional_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    injury_id UUID NOT NULL REFERENCES public.player_injuries(id) ON DELETE CASCADE,
    assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    assessment_type VARCHAR(40) NOT NULL,
    structure_or_joint VARCHAR(80) NOT NULL,
    laterality VARCHAR(30) DEFAULT 'afectado',
    test_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC(6,2),
    metric_unit VARCHAR(30),
    symmetry_percentage NUMERIC(5,2),
    result_interpretation VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_injury_assessments_injury ON public.injury_functional_assessments(injury_id, assessment_date DESC);
CREATE INDEX IF NOT EXISTS idx_injury_assessments_club ON public.injury_functional_assessments(club_id);

-- 7. Pruebas Médicas e Imagen: injury_medical_tests
CREATE TABLE IF NOT EXISTS public.injury_medical_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    injury_id UUID NOT NULL REFERENCES public.player_injuries(id) ON DELETE CASCADE,
    test_type VARCHAR(50) NOT NULL,
    test_date DATE NOT NULL,
    facility_or_doctor VARCHAR(150),
    report_summary TEXT NOT NULL,
    key_findings TEXT,
    image_or_file_url TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_injury_medical_tests_injury ON public.injury_medical_tests(injury_id, test_date DESC);
CREATE INDEX IF NOT EXISTS idx_injury_medical_tests_club ON public.injury_medical_tests(club_id);

-- 8. Tratamientos Clínicos: injury_treatments
CREATE TABLE IF NOT EXISTS public.injury_treatments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    injury_id UUID NOT NULL REFERENCES public.player_injuries(id) ON DELETE CASCADE,
    treatment_name VARCHAR(120) NOT NULL,
    treatment_category VARCHAR(60) DEFAULT 'fisioterapia',
    start_date DATE NOT NULL,
    end_date DATE,
    professional_name VARCHAR(120),
    response_to_treatment VARCHAR(50) DEFAULT 'favorable',
    notes TEXT,
    status VARCHAR(30) DEFAULT 'activo',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_injury_treatments_injury ON public.injury_treatments(injury_id, start_date DESC);
CREATE INDEX IF NOT EXISTS idx_injury_treatments_club ON public.injury_treatments(club_id);

-- 9. Sesiones de Readaptación / Rehabilitación: injury_rehabilitation_sessions
CREATE TABLE IF NOT EXISTS public.injury_rehabilitation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    injury_id UUID NOT NULL REFERENCES public.player_injuries(id) ON DELETE CASCADE,
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    rts_phase VARCHAR(50) NOT NULL DEFAULT 'fase_1_aguda',
    specialist_name VARCHAR(120),
    session_type VARCHAR(60) DEFAULT 'campo_readaptacion',
    total_duration_minutes INT,
    rpe_load INT CHECK (rpe_load >= 1 AND rpe_load <= 10),
    pain_experienced INT CHECK (pain_experienced >= 0 AND pain_experienced <= 10),
    exercises_summary TEXT,
    tolerance VARCHAR(50) DEFAULT 'optima',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_injury_rehab_injury ON public.injury_rehabilitation_sessions(injury_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_injury_rehab_club ON public.injury_rehabilitation_sessions(club_id);

-- 10. Hitos y Criterios Return to Sport: injury_rts_milestones
CREATE TABLE IF NOT EXISTS public.injury_rts_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    injury_id UUID NOT NULL REFERENCES public.player_injuries(id) ON DELETE CASCADE,
    stage VARCHAR(50) NOT NULL,
    target_date DATE,
    achieved_date DATE,
    status VARCHAR(30) DEFAULT 'pendiente',
    criteria_checklist JSONB DEFAULT '[]'::jsonb,
    cleared_by VARCHAR(120),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_injury_rts_injury ON public.injury_rts_milestones(injury_id, stage);
CREATE INDEX IF NOT EXISTS idx_injury_rts_club ON public.injury_rts_milestones(club_id);

-- 11. Historial de Transiciones de Estado: injury_status_history
CREATE TABLE IF NOT EXISTS public.injury_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    injury_id UUID NOT NULL REFERENCES public.player_injuries(id) ON DELETE CASCADE,
    from_status VARCHAR(50),
    to_status VARCHAR(50) NOT NULL,
    transition_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_injury_status_hist_injury ON public.injury_status_history(injury_id, transition_date DESC);
CREATE INDEX IF NOT EXISTS idx_injury_status_hist_club ON public.injury_status_history(club_id);

-- 12. RLS y Políticas de Aislamiento
ALTER TABLE public.anatomical_zones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anatomical_zones_select_policy" ON public.anatomical_zones;
CREATE POLICY "anatomical_zones_select_policy" ON public.anatomical_zones FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "anatomical_zones_insert_policy" ON public.anatomical_zones;
CREATE POLICY "anatomical_zones_insert_policy" ON public.anatomical_zones FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "anatomical_zones_update_policy" ON public.anatomical_zones;
CREATE POLICY "anatomical_zones_update_policy" ON public.anatomical_zones FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "anatomical_zones_delete_policy" ON public.anatomical_zones;
CREATE POLICY "anatomical_zones_delete_policy" ON public.anatomical_zones FOR DELETE USING (auth.role() = 'authenticated');

ALTER TABLE public.injury_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "injury_types_select_policy" ON public.injury_types;
CREATE POLICY "injury_types_select_policy" ON public.injury_types FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "injury_types_insert_policy" ON public.injury_types;
CREATE POLICY "injury_types_insert_policy" ON public.injury_types FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "injury_types_update_policy" ON public.injury_types;
CREATE POLICY "injury_types_update_policy" ON public.injury_types FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "injury_types_delete_policy" ON public.injury_types;
CREATE POLICY "injury_types_delete_policy" ON public.injury_types FOR DELETE USING (auth.role() = 'authenticated');

ALTER TABLE public.injury_examinations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "injury_examinations_select_policy" ON public.injury_examinations;
CREATE POLICY "injury_examinations_select_policy" ON public.injury_examinations FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "injury_examinations_insert_policy" ON public.injury_examinations;
CREATE POLICY "injury_examinations_insert_policy" ON public.injury_examinations FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "injury_examinations_update_policy" ON public.injury_examinations;
CREATE POLICY "injury_examinations_update_policy" ON public.injury_examinations FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "injury_examinations_delete_policy" ON public.injury_examinations;
CREATE POLICY "injury_examinations_delete_policy" ON public.injury_examinations FOR DELETE USING (auth.role() = 'authenticated');

ALTER TABLE public.injury_pain_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "injury_pain_records_select_policy" ON public.injury_pain_records;
CREATE POLICY "injury_pain_records_select_policy" ON public.injury_pain_records FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "injury_pain_records_insert_policy" ON public.injury_pain_records;
CREATE POLICY "injury_pain_records_insert_policy" ON public.injury_pain_records FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "injury_pain_records_update_policy" ON public.injury_pain_records;
CREATE POLICY "injury_pain_records_update_policy" ON public.injury_pain_records FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "injury_pain_records_delete_policy" ON public.injury_pain_records;
CREATE POLICY "injury_pain_records_delete_policy" ON public.injury_pain_records FOR DELETE USING (auth.role() = 'authenticated');

ALTER TABLE public.injury_functional_assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "injury_functional_assessments_select_policy" ON public.injury_functional_assessments;
CREATE POLICY "injury_functional_assessments_select_policy" ON public.injury_functional_assessments FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "injury_functional_assessments_insert_policy" ON public.injury_functional_assessments;
CREATE POLICY "injury_functional_assessments_insert_policy" ON public.injury_functional_assessments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "injury_functional_assessments_update_policy" ON public.injury_functional_assessments;
CREATE POLICY "injury_functional_assessments_update_policy" ON public.injury_functional_assessments FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "injury_functional_assessments_delete_policy" ON public.injury_functional_assessments;
CREATE POLICY "injury_functional_assessments_delete_policy" ON public.injury_functional_assessments FOR DELETE USING (auth.role() = 'authenticated');

ALTER TABLE public.injury_medical_tests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "injury_medical_tests_select_policy" ON public.injury_medical_tests;
CREATE POLICY "injury_medical_tests_select_policy" ON public.injury_medical_tests FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "injury_medical_tests_insert_policy" ON public.injury_medical_tests;
CREATE POLICY "injury_medical_tests_insert_policy" ON public.injury_medical_tests FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "injury_medical_tests_update_policy" ON public.injury_medical_tests;
CREATE POLICY "injury_medical_tests_update_policy" ON public.injury_medical_tests FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "injury_medical_tests_delete_policy" ON public.injury_medical_tests;
CREATE POLICY "injury_medical_tests_delete_policy" ON public.injury_medical_tests FOR DELETE USING (auth.role() = 'authenticated');

ALTER TABLE public.injury_treatments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "injury_treatments_select_policy" ON public.injury_treatments;
CREATE POLICY "injury_treatments_select_policy" ON public.injury_treatments FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "injury_treatments_insert_policy" ON public.injury_treatments;
CREATE POLICY "injury_treatments_insert_policy" ON public.injury_treatments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "injury_treatments_update_policy" ON public.injury_treatments;
CREATE POLICY "injury_treatments_update_policy" ON public.injury_treatments FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "injury_treatments_delete_policy" ON public.injury_treatments;
CREATE POLICY "injury_treatments_delete_policy" ON public.injury_treatments FOR DELETE USING (auth.role() = 'authenticated');

ALTER TABLE public.injury_rehabilitation_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "injury_rehabilitation_sessions_select_policy" ON public.injury_rehabilitation_sessions;
CREATE POLICY "injury_rehabilitation_sessions_select_policy" ON public.injury_rehabilitation_sessions FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "injury_rehabilitation_sessions_insert_policy" ON public.injury_rehabilitation_sessions;
CREATE POLICY "injury_rehabilitation_sessions_insert_policy" ON public.injury_rehabilitation_sessions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "injury_rehabilitation_sessions_update_policy" ON public.injury_rehabilitation_sessions;
CREATE POLICY "injury_rehabilitation_sessions_update_policy" ON public.injury_rehabilitation_sessions FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "injury_rehabilitation_sessions_delete_policy" ON public.injury_rehabilitation_sessions;
CREATE POLICY "injury_rehabilitation_sessions_delete_policy" ON public.injury_rehabilitation_sessions FOR DELETE USING (auth.role() = 'authenticated');

ALTER TABLE public.injury_rts_milestones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "injury_rts_milestones_select_policy" ON public.injury_rts_milestones;
CREATE POLICY "injury_rts_milestones_select_policy" ON public.injury_rts_milestones FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "injury_rts_milestones_insert_policy" ON public.injury_rts_milestones;
CREATE POLICY "injury_rts_milestones_insert_policy" ON public.injury_rts_milestones FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "injury_rts_milestones_update_policy" ON public.injury_rts_milestones;
CREATE POLICY "injury_rts_milestones_update_policy" ON public.injury_rts_milestones FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "injury_rts_milestones_delete_policy" ON public.injury_rts_milestones;
CREATE POLICY "injury_rts_milestones_delete_policy" ON public.injury_rts_milestones FOR DELETE USING (auth.role() = 'authenticated');

ALTER TABLE public.injury_status_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "injury_status_history_select_policy" ON public.injury_status_history;
CREATE POLICY "injury_status_history_select_policy" ON public.injury_status_history FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "injury_status_history_insert_policy" ON public.injury_status_history;
CREATE POLICY "injury_status_history_insert_policy" ON public.injury_status_history FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "injury_status_history_update_policy" ON public.injury_status_history;
CREATE POLICY "injury_status_history_update_policy" ON public.injury_status_history FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "injury_status_history_delete_policy" ON public.injury_status_history;
CREATE POLICY "injury_status_history_delete_policy" ON public.injury_status_history FOR DELETE USING (auth.role() = 'authenticated');

NOTIFY pgrst, 'reload schema';
