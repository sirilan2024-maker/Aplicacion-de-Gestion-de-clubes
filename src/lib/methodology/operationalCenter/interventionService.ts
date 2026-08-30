import { 
  InterventionRecord, 
  InterventionStatus, 
  InterventionOutcome 
} from "./types";
import { DecisionWorkflowService } from "./decisionWorkflowService";

export class InterventionService {
  private static instance: InterventionService;
  private interventionsStore: Map<string, InterventionRecord[]> = new Map();
  private workflowService = DecisionWorkflowService.getInstance();

  private constructor() {}

  public static getInstance(): InterventionService {
    if (!InterventionService.instance) {
      InterventionService.instance = new InterventionService();
    }
    return InterventionService.instance;
  }

  public resetStore(): void {
    this.interventionsStore.clear();
  }

  /**
   * Plans a methodological intervention connected to an approved decision.
   */
  public createIntervention(params: {
    decisionWorkflowId: string;
    teamId: string;
    category: string;
    conceptName: string;
    competencyId?: string;
    targetPlayerId?: string | null;
    sessionId?: string;
    scheduledDate: string;
    preInterventionScore: number;
    evidence: string[];
  }): InterventionRecord {
    const list = this.interventionsStore.get(params.teamId) || [];
    const intervention: InterventionRecord = {
      id: `int_${params.teamId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      decisionWorkflowId: params.decisionWorkflowId,
      teamId: params.teamId,
      category: params.category,
      conceptName: params.conceptName,
      competencyId: params.competencyId,
      targetPlayerId: params.targetPlayerId,
      sessionId: params.sessionId,
      scheduledDate: params.scheduledDate,
      status: 'PLANNED',
      preInterventionScore: params.preInterventionScore,
      outcome: 'INSUFFICIENT_DATA',
      evidence: params.evidence,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    list.push(intervention);
    this.interventionsStore.set(params.teamId, list);

    // Actualizar workflow a EXECUTED
    try {
      this.workflowService.markExecuted(params.decisionWorkflowId, intervention.id);
    } catch (e) {
      // Ignored if workflow not present in test isolation
    }

    return intervention;
  }

  public startIntervention(interventionId: string): InterventionRecord {
    const target = this.findIntervention(interventionId);
    if (!target) throw new Error(`Intervención ${interventionId} no encontrada.`);

    target.status = 'IN_PROGRESS';
    target.updatedAt = new Date().toISOString();
    return target;
  }

  /**
   * Completes the intervention and evaluates the post-score delta.
   */
  public completeIntervention(interventionId: string, params: {
    postInterventionScore?: number;
    coachObservations?: string;
    completedDate?: string;
  }): InterventionRecord {
    const target = this.findIntervention(interventionId);
    if (!target) throw new Error(`Intervención ${interventionId} no encontrada.`);

    target.status = 'COMPLETED';
    target.completedDate = params.completedDate || new Date().toISOString().split('T')[0];
    target.coachObservations = params.coachObservations;

    if (params.postInterventionScore !== undefined) {
      target.postInterventionScore = params.postInterventionScore;
      const delta = Math.round((params.postInterventionScore - target.preInterventionScore) * 10) / 10;
      target.scoreDelta = delta;

      if (delta >= 0.4) {
        target.outcome = 'POSITIVE';
      } else if (delta >= 0.1) {
        target.outcome = 'PARTIAL';
      } else if (delta > -0.3) {
        target.outcome = 'NO_IMPROVEMENT';
      } else {
        target.outcome = 'NEGATIVE';
      }
    } else {
      target.outcome = 'INSUFFICIENT_DATA';
    }

    target.updatedAt = new Date().toISOString();

    // Actualizar workflow a EVALUATED
    try {
      this.workflowService.markEvaluated(target.decisionWorkflowId);
    } catch (e) {
      // Ignored if isolated
    }

    return target;
  }

  public getInterventionsByTeam(teamId: string, statusFilter?: InterventionStatus): InterventionRecord[] {
    const list = this.interventionsStore.get(teamId) || [];
    if (statusFilter) {
      return list.filter(i => i.status === statusFilter);
    }
    return list;
  }

  public getIntervention(interventionId: string): InterventionRecord | null {
    return this.findIntervention(interventionId);
  }

  private findIntervention(interventionId: string): InterventionRecord | null {
    for (const list of this.interventionsStore.values()) {
      const match = list.find(i => i.id === interventionId);
      if (match) return match;
    }
    return null;
  }
}
