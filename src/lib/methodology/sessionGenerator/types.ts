export interface SessionRequestIntent {
  rawPrompt?: string;
  ageCategory?: string;
  players?: number;
  goalkeepers?: number;
  durationMinutes: number;
  primaryObjective: string;
  secondaryObjectives?: string[];
  space?: string;
  difficulty?: number;
  sessionType?: string;
  intensity?: 'baja' | 'media' | 'alta';
  microcycleDay?: 'MD-4' | 'MD-3' | 'MD-2' | 'MD-1' | 'MD+1' | 'MD' | string;
  recentExerciseIds?: string[];
  recentPrinciples?: string[];
  requestedExternalSources?: string[];
  requestedExternalCount?: number;
  excludedObjectives?: string[];
  isExclusivePriority?: boolean;
  requireVerifiedOnly?: boolean;
}

export type SessionPhaseKey = "activacion" | "principal_1" | "principal_2" | "global" | "vuelta_calma";

export interface GeneratedSessionDrill {
  id: string;
  phase: SessionPhaseKey;
  phaseLabel: string;
  orderIndex: number;
  allocatedDurationMin: number;
  exercise: any;
  source: "oficial" | "externo";
  selectionRationale: string;
  matchScore: number;
  oppositionLevel?: number;
  representativeness?: number;
  cognitiveLoad?: number;
  physicalLoad?: number;
  affinityWithPrevious?: number;
  goalkeeperRole?: "none" | "active" | "neutral" | "dual";
  adaptationNotes?: string;
}

export interface ProgressionReport {
  oppositionCurve: number[];
  representativenessCurve: number[];
  cognitiveCurve: number[];
  affinityScoreP1P2: number;
  affinityScoreP2Global: number;
  microcycleFit: string;
  goalkeeperFit: string;
  spaceFit: string;
  chainValid: boolean;
}

export interface GeneratedSessionPlan {
  id: string;
  title: string;
  intent: SessionRequestIntent;
  totalDurationMinutes: number;
  calculatedDurationMinutes: number;
  isDurationExact: boolean;
  drills: GeneratedSessionDrill[];
  methodologicalSummary: string;
  variantNumber?: number;
  variantLabel?: string;
  pertinenceScore?: number;
  coherenceScore?: number;
  coherenceAudited?: boolean;
  pedagogicalChainValid?: boolean;
  coherenceWarnings?: string[];
  progressionReport?: ProgressionReport;
  createdAt: string;
}

export interface GenerateSessionResponse {
  success: boolean;
  session: GeneratedSessionPlan;
  error?: string;
  warnings?: string[];
  responseTimeMs: number;
}
