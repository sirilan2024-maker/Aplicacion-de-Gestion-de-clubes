import { CollectivePriorityLevel, FieldLine } from "../teamIntelligence/types";
import { ConfidenceLevel, DecisionActionType, PerformanceDecision } from "../performance/types";
import { ObjectiveStatus, SessionEffectivenessRating, AdaptivePlanRecommendation } from "../adaptivePlanning/types";
import { MethodologicalRisk, MethodologicalRiskType, RiskSeverity } from "../intelligenceCenter/types";

export type AlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED';

export type OperationalAlertType = 
  | 'UNADDRESSED_CRITICAL_NEED'
  | 'EXCESSIVE_REPETITION'
  | 'INTERVENTION_WITHOUT_IMPROVEMENT'
  | 'CONTRADICTION_DETECTED'
  | 'INSUFFICIENT_SAMPLE'
  | 'STAGNANT_PRIORITY'
  | 'RECENTLY_TRAINED_COOLDOWN'
  | 'PENDING_DECISION_OVERDUE';

export interface OperationalAlert {
  id: string;
  teamId: string;
  type: OperationalAlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  description: string;
  sourceModule: string;
  sourceEntityId?: string;
  competencyId?: string;
  evidence: string[];
  assignedRole: 'director_metodologico' | 'coordinador' | 'entrenador';
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  expiresAt?: string;
}

export type DecisionStatus = 
  | 'PENDING'
  | 'APPROVED'
  | 'MODIFIED'
  | 'REJECTED'
  | 'EXECUTED'
  | 'EVALUATED';

export interface DecisionActor {
  userId: string;
  userName: string;
  role: 'admin' | 'metodologo' | 'coordinador' | 'entrenador';
}

export interface DecisionWorkflow {
  id: string;
  teamId: string;
  category: string;
  conceptName: string;
  competencyId?: string;
  playerId?: string | null;
  recommendedAction: DecisionActionType;
  recommendedPriority: CollectivePriorityLevel;
  confidenceScore: number;
  confidenceLevel: ConfidenceLevel;
  evidence: string[];
  suggestedDurationMinutes?: number;
  status: DecisionStatus;
  humanDecision?: {
    decidedBy: DecisionActor;
    decidedAt: string;
    finalAction: DecisionActionType;
    finalPriority: CollectivePriorityLevel;
    modifications?: string;
    rejectionReason?: string;
  };
  associatedInterventionId?: string;
  createdAt: string;
  updatedAt: string;
}

export type InterventionStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type InterventionOutcome = 
  | 'POSITIVE'            // Delta >= +0.4
  | 'PARTIAL'             // Delta +0.1 a +0.3
  | 'NO_IMPROVEMENT'      // Delta <= 0
  | 'NEGATIVE'            // Delta < -0.3
  | 'INSUFFICIENT_DATA';  // Muestra < 2

export interface InterventionRecord {
  id: string;
  decisionWorkflowId: string;
  teamId: string;
  category: string;
  conceptName: string;
  competencyId?: string;
  targetPlayerId?: string | null;
  sessionId?: string;
  scheduledDate: string;
  status: InterventionStatus;
  completedDate?: string;
  preInterventionScore: number;
  postInterventionScore?: number;
  scoreDelta?: number;
  outcome: InterventionOutcome;
  coachObservations?: string;
  evidence: string[];
  createdAt: string;
  updatedAt: string;
}

export interface FollowUpRecord {
  id: string;
  interventionId: string;
  teamId: string;
  conceptName: string;
  timeframe: 'IMMEDIATE' | 'SHORT_TERM' | 'MEDIUM_TERM';
  preScore: number;
  postScore: number;
  scoreDelta: number;
  outcome: InterventionOutcome;
  evaluatedAt: string;
  evaluatorNotes?: string;
}

export interface OperationalSnapshot {
  teamId: string;
  category: string;
  generatedAt: string;
  summary: {
    criticalAlertsCount: number;
    openAlertsCount: number;
    pendingDecisionsCount: number;
    activeInterventionsCount: number;
    evaluatedInterventionsCount: number;
  };
  alerts: OperationalAlert[];
  pendingDecisions: DecisionWorkflow[];
  activeInterventions: InterventionRecord[];
  methodologicalHealth: {
    formativeCoveragePercentage: number;
    interventionEffectivenessPercentage: number | 'INSUFFICIENT_DATA';
    pendingDecisionsHealth: 'OPTIMAL' | 'ATTENTION_NEEDED' | 'OVERLOAD';
  };
}

export interface OperationalAuditEntry {
  id: string;
  actor: DecisionActor;
  teamId: string;
  timestamp: string;
  entityType: 'ALERT' | 'DECISION' | 'INTERVENTION' | 'FOLLOW_UP';
  entityId: string;
  action: string;
  previousValue?: any;
  newValue?: any;
  reason?: string;
}
