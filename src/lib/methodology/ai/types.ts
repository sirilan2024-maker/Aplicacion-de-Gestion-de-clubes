/**
 * Interfaces y contratos para la capa de IA Metodológica Asistida, Copiloto y Planificador v1.0
 * Antigravity Methodology OS - Fases 5.1, 5.2 & 5.3
 */

export interface MethodologyAIContext {
  club: {
    id: string;
    name: string;
  };
  scope: 'club_direction' | 'team' | 'session' | 'planning';
  team?: {
    id: string;
    name: string;
    category: string;
  };
  season: {
    id: string;
    name: string;
  };
  globalKpis?: {
    totalTeams: number;
    solidTeams: number;
    trackingTeams: number;
    attentionTeams: number;
    insufficientDataTeams: number;
    globalAvgAchievement: number;
    globalAvgRpe: number;
    globalModelCoverage: number;
  };
  teamsOverview?: Array<{
    teamId: string;
    teamName: string;
    category: string;
    status: 'solido' | 'en_seguimiento' | 'atencion' | 'datos_insuficientes';
    avgAchievement: number;
    avgRpe: number;
    modelCoveragePercentage: number;
    evaluationPercentage: number;
    evaluatedSessions: number;
    totalSessions: number;
    alertsCount: number;
  }>;
  alerts?: Array<{
    id: string;
    teamId: string;
    teamName: string;
    severity: 'high' | 'medium' | 'low';
    message: string;
    metric: string;
  }>;
  teamReport?: {
    summary: {
      totalSessions: number;
      completedSessions: number;
      evaluatedSessions: number;
      evaluationPercentage: number;
      avgObjectiveAchievement: number;
      avgRpe: number;
      modelCoveragePercentage: number;
    };
    topPrinciples: string[];
    leastPrinciples: string[];
    decliningBehaviours: string[];
    improvingBehaviours: string[];
    sampleSize: number;
  };
  planningContext?: {
    dateRange: {
      weekStartDate: string;
      weekEndDate: string;
    };
    matchContext?: {
      matchDayDate: string;
      matchOpponent?: string;
      isHome?: boolean;
    };
    trainingDays?: number[];
    priorities?: Array<{
      id: string;
      title: string;
      priorityLevel: 'high' | 'medium' | 'low';
      evidence: string;
      principleName?: string;
      suggestedDay?: string;
    }>;
    recentSessions?: Array<{
      date_time: string;
      duration_minutes: number;
      objective: string;
      rpe?: number;
      achievement?: number;
    }>;
  };
}

export type AIActionType = 
  | 'adjust_session'
  | 'regenerate_session_block'
  | 'adjust_microcycle_day'
  | 'regenerate_microcycle_day'
  | 'review_methodology_priority'
  | 'create_methodology_note';

export interface MethodologyAIActionProposal {
  id: string;
  type: AIActionType;
  title: string;
  rationale: string;
  evidence: Array<{
    metric: string;
    value: string | number;
    reference: string;
  }>;
  confidence: number;
  target: {
    teamId?: string;
    sessionId?: string;
    blockId?: string;
    dayOfWeek?: number;
    microcycleDay?: string;
    principleName?: string;
  };
  proposedChanges: {
    durationMinutes?: number;
    intensityLoad?: number;
    objective?: string;
    suggestedPrinciple?: string;
    blockId?: string;
    notes?: string;
    modificationsSummary: string[];
  };
  validationRequirements: string[];
  warnings: string[];
  requiresHumanConfirmation: true;
}

export interface ProposedMicrocycleDay {
  dayOfWeek: number;
  dayName: string;
  dateStr: string;
  microcycleDay: string;
  sessionType: 'Entrenamiento' | 'Partido' | 'Descanso';
  targetLoad: 'Baja' | 'Media' | 'Media-Alta' | 'Alta' | 'Recuperación';
  plannedDurationMin: number;
  objective: string;
  priorityContext?: string;
  priorityTitle?: string;
  suggestedPrinciple?: string;
  rationale: string;
  evidence: string[];
}

export interface ProposedSessionTemplate {
  dayOfWeek: number;
  microcycleDay: string;
  durationMinutes: number;
  intensityLoad: number;
  objective: string;
  suggestedPrinciple?: string;
  organization: string;
  suggestedBlocks: Array<{
    blockId: string;
    name: string;
    durationMin: number;
    focus: string;
  }>;
  rationale: string;
}

export interface MethodologyAIPlanningProposal {
  id: string;
  scope: 'team_microcycle_planning';
  team: {
    id: string;
    name: string;
    category: string;
  };
  dateRange: {
    weekStartDate: string;
    weekEndDate: string;
  };
  matchContext?: {
    matchDayDate: string;
    matchOpponent?: string;
  };
  currentMethodologyState: {
    status: string;
    modelCoveragePercentage: number;
    avgAchievement: number;
    evaluatedSessions: number;
  };
  priorities: Array<{
    id: string;
    title: string;
    priorityLevel: string;
    rationale: string;
    affectedDay?: string;
  }>;
  rationale: string;
  evidence: Array<{
    metric: string;
    value: string | number;
    reference: string;
  }>;
  proposedMicrocycle: {
    days: ProposedMicrocycleDay[];
    weeklyLoadIndex: number;
    totalPlannedMinutes: number;
    trainingDaysCount: number;
  };
  proposedSessions: ProposedSessionTemplate[];
  warnings: string[];
  validationResults: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
  confidence: number;
  requiresHumanConfirmation: true;
}

export interface MethodologyAIResponse {
  answer: string;
  facts: string[];
  interpretations: string[];
  recommendations: string[];
  evidence: Array<{
    metric: string;
    value: string | number;
    reference: string;
  }>;
  dataSufficiency: {
    sufficient: boolean;
    sampleSize: number;
    notice?: string;
  };
  referencedTeams: string[];
  actionProposals?: MethodologyAIActionProposal[];
  planningProposal?: MethodologyAIPlanningProposal;
}

export interface ActionImpactPreview {
  proposalId: string;
  actionType: AIActionType;
  before: {
    durationMinutes?: number;
    intensityLoad?: number;
    objective?: string;
    principlesCount?: number;
    methodologicalLoad?: number;
    exerciseCount?: number;
  };
  after: {
    durationMinutes?: number;
    intensityLoad?: number;
    objective?: string;
    principlesCount?: number;
    methodologicalLoad?: number;
    exerciseCount?: number;
  };
  changes: {
    whatChanges: string[];
    whatStaysSame: string[];
    deterministicRuleApplied: string;
  };
  validation: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
  risks: string[];
}

export interface MethodologyAIProvider {
  askAssistant(
    prompt: string,
    context: MethodologyAIContext
  ): Promise<MethodologyAIResponse>;
}
