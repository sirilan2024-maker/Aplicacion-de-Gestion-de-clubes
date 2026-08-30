import { CompetencyArea, PlayerPosition, ProgressionTrend } from "../evaluation/types";
import { FieldLine, CollectivePriorityLevel, TacticalPrincipleReadiness } from "../teamIntelligence/types";
import { ConfidenceLevel, DiagnosticContrastCategory, DecisionActionType, PerformanceDecision } from "../performance/types";
import { ObjectiveStatus, SessionEffectivenessRating, AdaptivePlanRecommendation } from "../adaptivePlanning/types";

export type RiskSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type MethodologicalRiskType = 
  | 'EXCESSIVE_REPETITION_RISK'        // Demasiadas sesiones consecutivas sobre el mismo objetivo
  | 'UNADDRESSED_CRITICAL_NEED'        // Prioridad crítica sin sesión programada
  | 'INTERVENTION_WITHOUT_IMPROVEMENT' // Sesión realizada sin mejora (INEFFECTIVE recurrente)
  | 'CONTRADICTION_RISK'               // Evaluación formativa alta vs Competición baja
  | 'INSUFFICIENT_SAMPLE_RISK'         // Muestra escasa o baja cobertura
  | 'STALE_DATA_RISK';                 // Evaluaciones antiguas (> 30 días)

export interface MethodologicalRisk {
  id: string;
  type: MethodologicalRiskType;
  severity: RiskSeverity;
  title: string;
  description: string;
  entityType: 'PLAYER' | 'TEAM' | 'PLANNING';
  entityId: string;
  competencyId?: string;
  evidence: string[];
  suggestedMitigation: string;
  detectedAt: string;
}

export interface DecisionExplanation {
  decisionId: string;
  conclusion: string;
  primaryAction: DecisionActionType;
  priority: CollectivePriorityLevel;
  confidenceScore: number;
  confidenceLevel: ConfidenceLevel;
  supportingEvidence: string[];
  mitigatingFactors: string[];
  dataLimitations: string[];
  suggestedAction: string;
}

export interface TimelineEvent {
  id: string;
  date: string;
  phase: 'PASADO' | 'RESULTADO' | 'PRESENTE' | 'FUTURO';
  eventType: 'EVALUATION' | 'MATCH' | 'SESSION' | 'DECISION' | 'ADAPTIVE_REPLAN';
  title: string;
  description: string;
  competencyId?: string;
  score?: number;
  effectiveness?: SessionEffectivenessRating;
  decisionAction?: DecisionActionType;
}

export interface PlayerIntelligenceProfile {
  playerId: string;
  teamId: string;
  category: string;
  position?: PlayerPosition | string;
  overallFormativeAverage: number;
  overallCompetitiveRating: number;
  trend: ProgressionTrend;
  topStrengths: string[];
  topNeeds: string[];
  activeDecisions: PerformanceDecision[];
  recentEffectiveness?: SessionEffectivenessRating;
  timeline: TimelineEvent[];
  identifiedRisks: MethodologicalRisk[];
}

export interface TeamIntelligenceOverview {
  teamId: string;
  category: string;
  totalSquadCount: number;
  evaluatedPlayersCount: number;
  coveragePercentage: number;
  overallTeamRating: number;
  tacticalReadiness: TacticalPrincipleReadiness[];
  linesSummary: Record<FieldLine, { averageRating: number; status: string }>;
  activePriorities: {
    conceptName: string;
    priority: CollectivePriorityLevel;
    action: DecisionActionType;
    status: ObjectiveStatus;
    cooldownActive: boolean;
  }[];
  activeDecisions: PerformanceDecision[];
  detectedRisks: MethodologicalRisk[];
}

export interface MethodologicalIntelligenceSnapshot {
  snapshotId: string;
  teamId: string;
  category: string;
  generatedAt: string;
  teamOverview: TeamIntelligenceOverview;
  playerProfiles: PlayerIntelligenceProfile[];
  planningTimeline: {
    pastSessionsCount: number;
    effectiveSessionsCount: number;
    presentActiveNeeds: string[];
    futureRecommendedIntents: AdaptivePlanRecommendation[];
  };
  governanceAndRisks: {
    totalRisksCount: number;
    criticalRisksCount: number;
    risks: MethodologicalRisk[];
  };
}

export interface IntelligenceAuditEntry {
  id: string;
  teamId: string;
  queriedByRole: string;
  snapshotId: string;
  timestamp: string;
  actionTaken?: string;
}
