export type FormativeTimeGrouping = 'sesion' | 'semana' | 'trimestre' | 'anual';

export interface EvaluationModule {
  id: string;
  code: string;
  name: string;
  display_order: number;
  is_active: boolean;
  concepts?: EvaluationConcept[];
}

export interface EvaluationConcept {
  id: string;
  module_id: string;
  code: string;
  name: string;
  category_target: string;
  display_order: number;
  rubrics?: ConceptRubric[];
}

export interface ConceptRubric {
  id: string;
  concept_id: string;
  score_level: number; // 1 to 5
  short_label: string;
  criteria_description: string;
}

export interface PlayerEvaluationItem {
  id?: string;
  evaluation_id?: string;
  concept_id: string;
  score: number; // 1 to 5
  coach_notes?: string | null;
  concept?: EvaluationConcept;
}

export interface PlayerEvaluation {
  id: string;
  player_id: string;
  evaluator_id?: string | null;
  event_id?: string | null;
  evaluation_date: string;
  evaluation_period: string; // Ej: 'Sesión 14/05', 'Semana 12', '1er Trimestre', '2do Trimestre', 'Anual'
  general_feedback?: string | null;
  strengths?: string | null;
  areas_for_improvement?: string | null;
  created_at?: string;
  items: PlayerEvaluationItem[];
}

export interface UpsertEvaluationDTO {
  id?: string;
  player_id: string;
  evaluator_id?: string | null;
  event_id?: string | null;
  evaluation_date: string;
  evaluation_period: string;
  general_feedback?: string | null;
  strengths?: string | null;
  areas_for_improvement?: string | null;
  items: {
    concept_id: string;
    score: number;
    coach_notes?: string | null;
  }[];
}

export interface ModuleProgressSummary {
  module_id: string;
  module_code: string;
  module_name: string;
  average_score: number;
  total_concepts: number;
  evaluated_concepts: number;
}

export interface HistoricalEvolutionPoint {
  period_label: string;
  date: string;
  module_scores: Record<string, number>;
  overall_average: number;
  evaluations_count: number;
}

export interface PlayerProgressReport {
  player_id: string;
  grouping: FormativeTimeGrouping;
  total_evaluations: number;
  latest_evaluation?: PlayerEvaluation | null;
  module_summaries: ModuleProgressSummary[];
  historical_evolution: HistoricalEvolutionPoint[];
  radar_data: {
    concept_name: string;
    module_name: string;
    score: number;
    full_mark: number;
  }[];
}

