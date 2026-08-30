import { 
  OperationalSnapshot 
} from "./types";
import { OperationalAlertService } from "./operationalAlertService";
import { DecisionWorkflowService } from "./decisionWorkflowService";
import { InterventionService } from "./interventionService";

export class OperationalSnapshotService {
  private static instance: OperationalSnapshotService;
  private alertService = OperationalAlertService.getInstance();
  private workflowService = DecisionWorkflowService.getInstance();
  private interventionService = InterventionService.getInstance();

  private constructor() {}

  public static getInstance(): OperationalSnapshotService {
    if (!OperationalSnapshotService.instance) {
      OperationalSnapshotService.instance = new OperationalSnapshotService();
    }
    return OperationalSnapshotService.instance;
  }

  /**
   * Consolidates complete operational state, active alerts, pending decisions, and interventions.
   */
  public buildOperationalSnapshot(
    teamId: string, 
    category: string, 
    totalSquadCount = 0, 
    evaluatedCount = 0
  ): OperationalSnapshot {
    const alerts = this.alertService.getAlertsByTeam(teamId);
    const openAlerts = alerts.filter(a => a.status === 'OPEN' || a.status === 'ACKNOWLEDGED');
    const criticalAlertsCount = openAlerts.filter(a => a.severity === 'CRITICAL').length;

    const decisions = this.workflowService.getDecisionsByTeam(teamId);
    const pendingDecisions = decisions.filter(d => d.status === 'PENDING');

    const interventions = this.interventionService.getInterventionsByTeam(teamId);
    const activeInterventions = interventions.filter(i => i.status === 'PLANNED' || i.status === 'IN_PROGRESS');
    const completedInterventions = interventions.filter(i => i.status === 'COMPLETED');
    const evaluatedInterventions = completedInterventions.filter(i => i.outcome !== 'INSUFFICIENT_DATA');

    // Indicadores de salud metodológica
    const formativeCoveragePercentage = totalSquadCount > 0 
      ? Math.round((evaluatedCount / totalSquadCount) * 100) 
      : 0;

    let interventionEffectivenessPercentage: number | 'INSUFFICIENT_DATA' = 'INSUFFICIENT_DATA';
    if (evaluatedInterventions.length >= 2) {
      const positiveCount = evaluatedInterventions.filter(i => i.outcome === 'POSITIVE' || i.outcome === 'PARTIAL').length;
      interventionEffectivenessPercentage = Math.round((positiveCount / evaluatedInterventions.length) * 100);
    }

    let pendingDecisionsHealth: 'OPTIMAL' | 'ATTENTION_NEEDED' | 'OVERLOAD' = 'OPTIMAL';
    if (pendingDecisions.length > 5) pendingDecisionsHealth = 'OVERLOAD';
    else if (pendingDecisions.length >= 3) pendingDecisionsHealth = 'ATTENTION_NEEDED';

    return {
      teamId,
      category,
      generatedAt: new Date().toISOString(),
      summary: {
        criticalAlertsCount,
        openAlertsCount: openAlerts.length,
        pendingDecisionsCount: pendingDecisions.length,
        activeInterventionsCount: activeInterventions.length,
        evaluatedInterventionsCount: evaluatedInterventions.length
      },
      alerts,
      pendingDecisions,
      activeInterventions,
      methodologicalHealth: {
        formativeCoveragePercentage,
        interventionEffectivenessPercentage,
        pendingDecisionsHealth
      }
    };
  }
}
