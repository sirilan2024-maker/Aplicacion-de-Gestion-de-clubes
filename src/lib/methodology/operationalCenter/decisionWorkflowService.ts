import { 
  DecisionWorkflow, 
  DecisionStatus, 
  DecisionActor 
} from "./types";
import { DecisionActionType, ConfidenceLevel } from "../performance/types";
import { CollectivePriorityLevel } from "../teamIntelligence/types";

export class DecisionWorkflowService {
  private static instance: DecisionWorkflowService;
  private workflowStore: Map<string, DecisionWorkflow[]> = new Map();

  private constructor() {}

  public static getInstance(): DecisionWorkflowService {
    if (!DecisionWorkflowService.instance) {
      DecisionWorkflowService.instance = new DecisionWorkflowService();
    }
    return DecisionWorkflowService.instance;
  }

  public resetStore(): void {
    this.workflowStore.clear();
  }

  /**
   * Initializes a pending decision workflow from an automated recommendation.
   */
  public createFromRecommendation(params: {
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
  }): DecisionWorkflow {
    const list = this.workflowStore.get(params.teamId) || [];
    const workflow: DecisionWorkflow = {
      id: `wf_${params.teamId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      teamId: params.teamId,
      category: params.category,
      conceptName: params.conceptName,
      competencyId: params.competencyId,
      playerId: params.playerId,
      recommendedAction: params.recommendedAction,
      recommendedPriority: params.recommendedPriority,
      confidenceScore: params.confidenceScore,
      confidenceLevel: params.confidenceLevel,
      evidence: params.evidence,
      suggestedDurationMinutes: params.suggestedDurationMinutes,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    list.push(workflow);
    this.workflowStore.set(params.teamId, list);
    return workflow;
  }

  public createWorkflowProposal(params: any): DecisionWorkflow {
    return this.createFromRecommendation(params);
  }

  /**
   * Human-in-the-loop: Approves the recommendation without changes.
   */
  public approveDecision(decisionId: string, actor: DecisionActor): DecisionWorkflow {
    const target = this.findDecision(decisionId);
    if (!target) throw new Error(`Decisión con ID ${decisionId} no encontrada.`);

    target.status = 'APPROVED';
    target.humanDecision = {
      decidedBy: actor,
      decidedAt: new Date().toISOString(),
      finalAction: target.recommendedAction,
      finalPriority: target.recommendedPriority
    };
    target.updatedAt = new Date().toISOString();
    return target;
  }

  /**
   * Human-in-the-loop: Modifies the recommendation parameters.
   */
  public modifyDecision(
    decisionId: string, 
    actor: DecisionActor, 
    modifications: {
      action?: DecisionActionType;
      priority?: CollectivePriorityLevel;
      notes: string;
    }
  ): DecisionWorkflow {
    const target = this.findDecision(decisionId);
    if (!target) throw new Error(`Decisión con ID ${decisionId} no encontrada.`);
    if (!modifications.notes || modifications.notes.trim() === '') {
      throw new Error("Es obligatorio registrar el motivo de la modificación metodológica.");
    }

    target.status = 'MODIFIED';
    target.humanDecision = {
      decidedBy: actor,
      decidedAt: new Date().toISOString(),
      finalAction: modifications.action || target.recommendedAction,
      finalPriority: modifications.priority || target.recommendedPriority,
      modifications: modifications.notes
    };
    target.updatedAt = new Date().toISOString();
    return target;
  }

  /**
   * Human-in-the-loop: Rejects the recommendation with mandatory reason.
   */
  public rejectDecision(decisionId: string, actor: DecisionActor, rejectionReason: string): DecisionWorkflow {
    const target = this.findDecision(decisionId);
    if (!target) throw new Error(`Decisión con ID ${decisionId} no encontrada.`);
    if (!rejectionReason || rejectionReason.trim() === '') {
      throw new Error("Es obligatorio aportar un motivo justificado para rechazar una decisión metodológica.");
    }

    target.status = 'REJECTED';
    target.humanDecision = {
      decidedBy: actor,
      decidedAt: new Date().toISOString(),
      finalAction: 'NO_ACTION',
      finalPriority: 'LOW',
      rejectionReason
    };
    target.updatedAt = new Date().toISOString();
    return target;
  }

  public markExecuted(decisionId: string, interventionId: string): DecisionWorkflow {
    const target = this.findDecision(decisionId);
    if (!target) throw new Error(`Decisión con ID ${decisionId} no encontrada.`);

    target.status = 'EXECUTED';
    target.associatedInterventionId = interventionId;
    target.updatedAt = new Date().toISOString();
    return target;
  }

  public markEvaluated(decisionId: string): DecisionWorkflow {
    const target = this.findDecision(decisionId);
    if (!target) throw new Error(`Decisión con ID ${decisionId} no encontrada.`);

    target.status = 'EVALUATED';
    target.updatedAt = new Date().toISOString();
    return target;
  }

  public getDecisionsByTeam(teamId: string, statusFilter?: DecisionStatus): DecisionWorkflow[] {
    const list = this.workflowStore.get(teamId) || [];
    if (statusFilter) {
      return list.filter(d => d.status === statusFilter);
    }
    return list;
  }

  private findDecision(decisionId: string): DecisionWorkflow | null {
    for (const list of this.workflowStore.values()) {
      const match = list.find(d => d.id === decisionId);
      if (match) return match;
    }
    return null;
  }
}
