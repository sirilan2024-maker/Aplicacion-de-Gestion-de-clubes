import { CompetencyArea, PlayerPosition, ProgressionTrend } from "../evaluation/types";
import { FieldLine, CollectivePriorityLevel } from "../teamIntelligence/types";
import { ConfidenceLevel, DiagnosticContrastCategory, DecisionActionType } from "../performance/types";

export type ObjectiveStatus = 
  | 'ACTIVE_NEED'          // Necesidad activa no resuelta
  | 'CONSOLIDATED'         // Objetivo consolidado tras mejora
  | 'MONITORING'           // En observación
  | 'UNDER_REVIEW'         // Discrepancia detectada
  | 'RECENTLY_TRAINED';    // Entrenado recientemente (en periodo de consolidación)

export type SessionEffectivenessRating = 
  | 'EFFECTIVE'            // Mejora comprobada post-sesión (delta >= +0.4)
  | 'PARTIALLY_EFFECTIVE'  // Ligera mejora (delta +0.1 a +0.3)
  | 'INEFFECTIVE'          // Sin mejora o deterioro
  | 'INSUFFICIENT_DATA';   // Muestra insuficiente

export type LearningSignalType = 
  | 'CONSOLIDATED_IMPROVEMENT'
  | 'PERSISTENT_STRUGGLE'
  | 'CONTRADICTION'
  | 'RECENTLY_TRAINED_COOLDOWN'
  | 'STAGNANT_NEED'
  | 'INSUFFICIENT_EVIDENCE';

export interface MethodologicalMemoryRecord {
  id: string;
  teamId: string;
  category: string;
  conceptName: string;
  competencyId: string;
  sessionId: string;
  sessionDate: string;
  microcycle?: string;
  preTrainingScore: number;
  postTrainingScore?: number;
  scoreDelta?: number;
  effectiveness: SessionEffectivenessRating;
  consecutiveCyclesCount: number;
  lastWorkedDate: string;
  notes?: string;
}

export interface LearningSignal {
  id: string;
  teamId: string;
  type: LearningSignalType;
  conceptName: string;
  competencyId: string;
  intensity: 'HIGH' | 'MEDIUM' | 'LOW';
  evidence: string[];
  confidence: ConfidenceLevel;
  recommendedAction: DecisionActionType;
  effectivePriority: CollectivePriorityLevel;
  date: string;
}

export interface AdaptivePlanRecommendation {
  primaryObjective: string;
  secondaryObjectives: string[];
  suggestedDurationMinutes: number;
  priority: CollectivePriorityLevel;
  action: DecisionActionType;
  status: ObjectiveStatus;
  rationale: string;
  evidence: string[];
  confidenceLevel: ConfidenceLevel;
  cooldownActive?: boolean;
}

export interface PlanningCycle {
  id: string;
  teamId: string;
  category: string;
  cycleNumber: number;
  startDate: string;
  endDate?: string;
  activeNeeds: string[];
  consolidatedObjectives: string[];
  underReviewObjectives: string[];
  recommendedPlans: AdaptivePlanRecommendation[];
  learningSignals: LearningSignal[];
  generatedAt: string;
}
