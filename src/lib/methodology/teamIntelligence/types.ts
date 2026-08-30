import { CompetencyArea, PlayerPosition, ProgressionTrend } from "../evaluation/types";

export type FieldLine = 'porteria' | 'defensa' | 'mediocampo' | 'ataque';

export type CollectivePriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type TeamInsightType = 
  | 'COLLECTIVE_STRENGTH' 
  | 'COLLECTIVE_WEAKNESS' 
  | 'LINE_NEED' 
  | 'STAGNANT_AREA' 
  | 'EMERGING_IMPROVEMENT';

export type DataCoverageQuality = 'OPTIMAL' | 'ADEQUATE' | 'LOW' | 'INSUFFICIENT_DATA';

export interface ScoreDistribution {
  level1: number;
  level2: number;
  level3: number;
  level4: number;
  level5: number;
}

export interface TeamCompetencyAggregation {
  competencyId: string;
  competencyName: string;
  area: CompetencyArea;
  averageScore: number;
  historicalAverage: number;
  previousPeriodAverage?: number;
  scoreDelta?: number;
  trend: ProgressionTrend;
  evaluatedPlayersCount: number;
  totalSquadPlayers: number;
  coveragePercentage: number;
  scoreDistribution: ScoreDistribution;
  lastEvaluationDate?: string;
}

export interface TeamAreaAggregation {
  area: CompetencyArea;
  areaName: string;
  averageScore: number;
  coveragePercentage: number;
  competencies: TeamCompetencyAggregation[];
}

export interface TeamLineAggregation {
  line: FieldLine;
  lineName: string;
  positions: PlayerPosition[];
  averageScore: number;
  evaluatedPlayersCount: number;
  coveragePercentage: number;
  topStrengths: string[];
  topNeeds: string[];
}

export interface TeamPositionAggregation {
  position: PlayerPosition | string;
  positionName: string;
  averageScore: number;
  evaluatedPlayersCount: number;
  competencies: TeamCompetencyAggregation[];
}

export interface TeamInsight {
  id: string;
  type: TeamInsightType;
  priority: CollectivePriorityLevel;
  title: string;
  description: string;
  competencyId: string;
  competencyName: string;
  area: CompetencyArea;
  tacticalConcept?: string;
  affectedPlayersCount: number;
  averageScore: number;
  trend: ProgressionTrend;
  rationale: string;
}

export interface TacticalPrincipleReadiness {
  principleCode: string;
  principleName: string;
  gamePhase: 'Ataque' | 'Defensa' | 'Transición Ataque-Defensa' | 'Transición Defensa-Ataque' | 'Balón Parado';
  readinessScore: number; // 1 to 5
  readinessLevel: 'ALTO' | 'MEDIO' | 'CRITICO';
  relatedCompetencyIds: string[];
  isPriorityForTraining: boolean;
  rationale: string;
}

export interface TeamWorkedObjectiveRecord {
  id: string;
  teamId: string;
  tacticalConcept: string;
  relatedCompetencyId: string;
  sessionId: string;
  sessionDate: string;
  evaluationBeforeScore: number;
  evaluationAfterScore?: number;
  improvementDelta?: number;
  status: 'PENDING_EVALUATION' | 'IMPROVED' | 'STAGNANT';
}

export interface TeamDiagnosisReport {
  teamId: string;
  category: string;
  totalSquadPlayers: number;
  evaluatedPlayersCount: number;
  squadCoveragePercentage: number;
  dataCoverageQuality: DataCoverageQuality;
  overallTeamAverage: number;
  areas: Record<CompetencyArea, TeamAreaAggregation>;
  lines: Record<FieldLine, TeamLineAggregation>;
  tacticalReadiness: TacticalPrincipleReadiness[];
  collectiveStrengths: TeamInsight[];
  collectivePriorities: TeamInsight[];
  workedObjectivesHistory: TeamWorkedObjectiveRecord[];
  recommendedSessionIntents: {
    primaryObjective: string;
    secondaryObjectives: string[];
    suggestedDurationMinutes: number;
    priority: CollectivePriorityLevel;
    rationale: string;
  }[];
  generatedAt: string;
}
