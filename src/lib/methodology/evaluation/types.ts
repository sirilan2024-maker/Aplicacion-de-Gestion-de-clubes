export type CompetencyArea = 'tecnica' | 'tactica' | 'fisica' | 'psicologica';

export type PlayerPosition = 
  | 'portero' 
  | 'defensa_central' 
  | 'lateral' 
  | 'mediocentro' 
  | 'interior' 
  | 'extremo' 
  | 'delantero';

export type ProgressionTrend = 'IMPROVING' | 'STABLE' | 'DECLINING' | 'INSUFFICIENT_DATA';

export type RubricLevel = 1 | 2 | 3 | 4 | 5;

export interface CompetencyRubric {
  level: RubricLevel;
  label: 'Inicial' | 'En desarrollo' | 'Adecuado' | 'Avanzado' | 'Excelente';
  criteria: string;
}

export interface CompetencyDefinition {
  id: string;
  code: string;
  name: string;
  area: CompetencyArea;
  description: string;
  indicators: string[];
  isPositional?: boolean;
  positionTarget?: PlayerPosition[];
  categoryWeights?: Record<string, number>; // e.g. { 'U6-U8': 0.5, 'U13-U14': 1.0, 'Senior': 1.2 }
  rubrics: Record<RubricLevel, CompetencyRubric>;
}

export interface PlayerEvaluationRecord {
  id: string;
  playerId: string;
  sessionId?: string | null;
  teamId?: string | null;
  category: string;
  position?: PlayerPosition | string;
  competencyId: string;
  score: number; // 1 to 5
  observation?: string | null;
  evidenceContext?: string | null;
  evaluatorId?: string | null;
  evaluationDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEvaluationInput {
  playerId: string;
  sessionId?: string | null;
  teamId?: string | null;
  category: string;
  position?: PlayerPosition | string;
  competencyId: string;
  score: number;
  observation?: string | null;
  evidenceContext?: string | null;
  evaluatorId?: string | null;
  evaluationDate?: string;
}

export interface CompetencyProgressSummary {
  competencyId: string;
  competencyName: string;
  area: CompetencyArea;
  currentScore: number;
  previousScore?: number;
  scoreDelta?: number;
  historicalAverage: number;
  evaluationsCount: number;
  trend: ProgressionTrend;
  lastEvaluationDate: string;
  lastObservation?: string | null;
}

export interface AreaProgressSummary {
  area: CompetencyArea;
  areaName: string;
  averageScore: number;
  competencies: CompetencyProgressSummary[];
}

export interface PlayerDevelopmentProfile {
  playerId: string;
  category: string;
  position?: PlayerPosition | string;
  totalEvaluations: number;
  firstEvaluationDate?: string;
  lastEvaluationDate?: string;
  overallAverage: number;
  globalAverage?: number;
  areas: Record<CompetencyArea, AreaProgressSummary>;
  areaSummaries?: AreaProgressSummary[];
  strengths: DevelopmentInsight[];
  areasForImprovement: DevelopmentInsight[];
  recommendedPlanningFocus: PlanningFocusRecommendation[];
  radarData: RadarComparisonPoint[];
}

export interface DevelopmentInsight {
  competencyId: string;
  competencyName: string;
  area: CompetencyArea;
  currentScore: number;
  historicalAverage: number;
  trend: ProgressionTrend;
  evaluationsCount: number;
  reason: string;
}

export interface PlanningFocusRecommendation {
  tacticalConcept: string;
  relatedCompetencyIds: string[];
  priority: 'ALTA' | 'MEDIA' | 'BAJA';
  rationale: string;
  targetedPlayersCount: number;
  playerNamesOrIds: string[];
}

export interface RadarComparisonPoint {
  competencyName: string;
  area: CompetencyArea;
  currentScore: number;
  previousScore?: number;
  cohortAverage?: number;
  fullMark: number;
}
