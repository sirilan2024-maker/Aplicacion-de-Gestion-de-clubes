-- ==============================================================================
-- MIGRACIÓN Y SCHEMA: MÓDULO FORMATIVO Y EVALUACIÓN DE APRENDIZAJE (INFANTIL 12-14 AÑOS)
-- ==============================================================================

-- 1. Tabla de Módulos de Evaluación
CREATE TABLE IF NOT EXISTS evaluation_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  display_order INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Conceptos Evaluables por Módulo
CREATE TABLE IF NOT EXISTS evaluation_concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES evaluation_modules(id) ON DELETE CASCADE,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  category_target VARCHAR(50) NOT NULL DEFAULT 'Infantil', -- 'Infantil (12-14)', 'Cadete', etc.
  display_order INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de Rúbricas Descriptivas Cualitativas (Nivel 1 a 5)
CREATE TABLE IF NOT EXISTS concept_rubrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concept_id UUID NOT NULL REFERENCES evaluation_concepts(id) ON DELETE CASCADE,
  score_level INT NOT NULL CHECK (score_level BETWEEN 1 AND 5),
  short_label VARCHAR(100) NOT NULL,
  criteria_description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_concept_score_level UNIQUE (concept_id, score_level)
);

-- 4. Tabla de Evaluaciones de Jugadores (Cabecera)
CREATE TABLE IF NOT EXISTS player_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  evaluator_id UUID,
  event_id UUID,
  evaluation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  evaluation_period VARCHAR(100) NOT NULL DEFAULT 'Trimestre 1',
  general_feedback TEXT,
  strengths TEXT,
  areas_for_improvement TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabla de Items / Notas Detalladas por Concepto
CREATE TABLE IF NOT EXISTS evaluation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES player_evaluations(id) ON DELETE CASCADE,
  concept_id UUID NOT NULL REFERENCES evaluation_concepts(id) ON DELETE CASCADE,
  score INT NOT NULL CHECK (score BETWEEN 1 AND 5),
  coach_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_evaluation_concept UNIQUE (evaluation_id, concept_id)
);

-- Índices de Rendimiento
CREATE INDEX IF NOT EXISTS idx_eval_concepts_module ON evaluation_concepts(module_id);
CREATE INDEX IF NOT EXISTS idx_concept_rubrics_concept ON concept_rubrics(concept_id);
CREATE INDEX IF NOT EXISTS idx_player_evals_player ON player_evaluations(player_id);
CREATE INDEX IF NOT EXISTS idx_eval_items_evaluation ON evaluation_items(evaluation_id);

-- RLS (Row Level Security)
ALTER TABLE evaluation_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read evaluation_modules" ON evaluation_modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read evaluation_concepts" ON evaluation_concepts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read concept_rubrics" ON concept_rubrics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated all player_evaluations" ON player_evaluations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated all evaluation_items" ON evaluation_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
