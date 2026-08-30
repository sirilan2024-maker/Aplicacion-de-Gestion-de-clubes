import { CompetencyArea, PlayerPosition, ProgressionTrend } from "../evaluation/types";
import { FieldLine, CollectivePriorityLevel } from "../teamIntelligence/types";

export type { ProgressionTrend, FieldLine };

export type PerformanceEventType = 
  | 'PARTIDO_COMPETITIVO' 
  | 'PARTIDO_AMISTOSO' 
  | 'SESION_ENTRENAMIENTO' 
  | 'TEST_CONDICION';

export type PerformanceMetricType = 
  | 'VALORACION_TACTICA'      // 1 a 5
  | 'MINUTOS_JUGADOS'         // Minutos
  | 'DUELOS_GANADOS_PCT'      // 0 a 100%
  | 'PASES_ACERTADOS_PCT'     // 0 a 100%
  | 'RECUPERACIONES'          // Conteo
  | 'PERDIDAS_PELIGROSAS'     // Conteo
  | 'RATING_GLOBAL'           // 1 a 5
  | 'RPE_FATIGA';             // 1 a 10

export interface ContextualFactors {
  opponentStrength?: 'ALTO' | 'MEDIO' | 'BAJO';
  gameState?: 'GANANDO' | 'PERDIENDO' | 'EMPATANDO';
  numericalParity?: 'SUPERIORIDAD' | 'INFERIORIDAD' | 'IGUALDAD';
  location?: 'CASA' | 'FUERA';
  minutesPlayed?: number;
  competitionType?: string;
  tacticalContextNotes?: string;
}

export interface PerformanceObservationRecord {
  id: string;
  playerId: string;
  teamId: string;
  eventId?: string | null;
  eventType: PerformanceEventType;
  date: string;
  position?: PlayerPosition | string;
  competencyId?: string; // Relación con competencia si aplica (ej. 'tac_transicion_defensiva')
  metric: PerformanceMetricType;
  value: number;
  context: ContextualFactors;
  observerId?: string | null;
  dataSource: 'OBSERVACION_TECNICA' | 'ACTA_PARTIDO' | 'METRICA_SENSOR';
  createdAt: string;
}

export interface CreatePerformanceObservationInput {
  playerId: string;
  teamId: string;
  eventId?: string | null;
  eventType?: PerformanceEventType;
  date?: string;
  position?: PlayerPosition | string;
  competencyId?: string;
  metric: PerformanceMetricType;
  value: number;
  context?: ContextualFactors;
  observerId?: string | null;
  dataSource?: 'OBSERVACION_TECNICA' | 'ACTA_PARTIDO' | 'METRICA_SENSOR';
}

export type ConfidenceLevel = 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';

export type DiagnosticContrastCategory = 
  | 'CONFIRMED_NEED'      // Eval baja + Rendimiento bajo => Necesidad confirmada
  | 'MONITOR'             // Eval baja + Rendimiento normal => Monitorizar
  | 'CONTEXT_REVIEW'      // Eval alta + Rendimiento bajo => Revisar contexto
  | 'STRENGTH_CONFIRMED'  // Eval alta + Rendimiento alto => Fortaleza consolidada
  | 'INSUFFICIENT_DATA';  // Muestra escasa

export type DecisionActionType = 
  | 'TRAIN' 
  | 'MONITOR' 
  | 'MAINTAIN' 
  | 'REVIEW' 
  | 'NO_ACTION';

export interface PerformanceDecision {
  id: string;
  teamId: string;
  playerId?: string | null;
  title: string;
  action: DecisionActionType;
  contrastCategory: DiagnosticContrastCategory;
  problem: string;
  evidence: string[];
  recommendation: string;
  priority: CollectivePriorityLevel;
  confidenceScore: number; // 0.0 a 1.0
  confidenceLevel: ConfidenceLevel;
  limitations?: string[];
  metricsUsed: string[];
  suggestedTrainingObjective?: string;
  createdAt: string;
}

export interface PerformancePattern {
  id: string;
  entityType: 'PLAYER' | 'TEAM' | 'LINE';
  entityId: string;
  patternName: string;
  description: string;
  occurrencesCount: number;
  trend: ProgressionTrend;
  confidence: ConfidenceLevel;
  supportingEventDates: string[];
}

export interface PlayerPerformanceSummary {
  playerId: string;
  teamId: string;
  totalEventsObserved: number;
  totalMinutesPlayed: number;
  averageTacticalRating: number;
  averageGlobalRating: number;
  trend: ProgressionTrend;
  contextualAdjustedRating: number;
  lastObservationDate?: string;
}

export interface TeamPerformanceSummary {
  teamId: string;
  totalCompetitiveEvents: number;
  evaluatedPlayersCount: number;
  squadCoveragePercentage: number;
  averageTeamCompetitiveRating: number;
  trend: ProgressionTrend;
  linesPerformance: Record<FieldLine, { averageRating: number; eventsCount: number }>;
  patternsDetected: PerformancePattern[];
  activeDecisions: PerformanceDecision[];
}
