import { 
  OperationalAlert, 
  OperationalAlertType, 
  AlertSeverity, 
  AlertStatus, 
  DecisionActor 
} from "./types";
import { MethodologicalRisk } from "../intelligenceCenter/types";

export class OperationalAlertService {
  private static instance: OperationalAlertService;
  private alertsStore: Map<string, OperationalAlert[]> = new Map();

  private constructor() {}

  public static getInstance(): OperationalAlertService {
    if (!OperationalAlertService.instance) {
      OperationalAlertService.instance = new OperationalAlertService();
    }
    return OperationalAlertService.instance;
  }

  public resetStore(): void {
    this.alertsStore.clear();
  }

  /**
   * Creates an operational alert with mandatory evidence.
   */
  public createAlert(params: {
    teamId: string;
    type: OperationalAlertType;
    severity: AlertSeverity;
    title: string;
    description: string;
    sourceModule: string;
    sourceEntityId?: string;
    competencyId?: string;
    evidence: string[];
    assignedRole: 'director_metodologico' | 'coordinador' | 'entrenador';
    expiresAt?: string;
  }): OperationalAlert {
    if (!params.evidence || params.evidence.length === 0) {
      throw new Error("No se puede emitir una alerta operativa sin evidencia factual.");
    }

    const list = this.alertsStore.get(params.teamId) || [];
    const alert: OperationalAlert = {
      id: `alt_${params.teamId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      teamId: params.teamId,
      type: params.type,
      severity: params.severity,
      status: 'OPEN',
      title: params.title,
      description: params.description,
      sourceModule: params.sourceModule,
      sourceEntityId: params.sourceEntityId,
      competencyId: params.competencyId,
      evidence: params.evidence,
      assignedRole: params.assignedRole,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt: params.expiresAt
    };

    list.push(alert);
    this.alertsStore.set(params.teamId, list);
    return alert;
  }

  public acknowledgeAlert(alertId: string, actor: DecisionActor): OperationalAlert | null {
    for (const [teamId, list] of this.alertsStore.entries()) {
      const target = list.find(a => a.id === alertId);
      if (target) {
        target.status = 'ACKNOWLEDGED';
        target.updatedAt = new Date().toISOString();
        return target;
      }
    }
    return null;
  }

  public resolveAlert(alertId: string, actor: DecisionActor, notes: string): OperationalAlert | null {
    for (const [teamId, list] of this.alertsStore.entries()) {
      const target = list.find(a => a.id === alertId);
      if (target) {
        target.status = 'RESOLVED';
        target.resolutionNotes = notes;
        target.resolvedAt = new Date().toISOString();
        target.updatedAt = new Date().toISOString();
        return target;
      }
    }
    return null;
  }

  public dismissAlert(alertId: string, actor: DecisionActor, notes: string): OperationalAlert | null {
    for (const [teamId, list] of this.alertsStore.entries()) {
      const target = list.find(a => a.id === alertId);
      if (target) {
        target.status = 'DISMISSED';
        target.resolutionNotes = notes;
        target.updatedAt = new Date().toISOString();
        return target;
      }
    }
    return null;
  }

  public getAlertsByTeam(teamId: string, statusFilter?: AlertStatus): OperationalAlert[] {
    const list = this.alertsStore.get(teamId) || [];
    if (statusFilter) {
      return list.filter(a => a.status === statusFilter);
    }
    return list;
  }

  /**
   * Synchronizes operational alerts from Module 7 methodological risks.
   */
  public syncFromRisks(teamId: string, risks: MethodologicalRisk[]): OperationalAlert[] {
    const createdAlerts: OperationalAlert[] = [];
    const existing = this.getAlertsByTeam(teamId);

    for (const r of risks) {
      const alreadyExists = existing.some(a => a.sourceEntityId === r.id || a.title === r.title);
      if (!alreadyExists && r.evidence && r.evidence.length > 0) {
        let type: OperationalAlertType = 'UNADDRESSED_CRITICAL_NEED';
        if (r.type === 'EXCESSIVE_REPETITION_RISK') type = 'EXCESSIVE_REPETITION';
        else if (r.type === 'INTERVENTION_WITHOUT_IMPROVEMENT') type = 'INTERVENTION_WITHOUT_IMPROVEMENT';
        else if (r.type === 'CONTRADICTION_RISK') type = 'CONTRADICTION_DETECTED';
        else if (r.type === 'INSUFFICIENT_SAMPLE_RISK') type = 'INSUFFICIENT_SAMPLE';

        const alert = this.createAlert({
          teamId,
          type,
          severity: r.severity as AlertSeverity,
          title: r.title,
          description: r.description,
          sourceModule: 'Module 7 - Intelligence Center',
          sourceEntityId: r.id,
          competencyId: r.competencyId,
          evidence: r.evidence,
          assignedRole: r.severity === 'CRITICAL' ? 'director_metodologico' : 'coordinador'
        });
        createdAlerts.push(alert);
      }
    }

    return createdAlerts;
  }
}
