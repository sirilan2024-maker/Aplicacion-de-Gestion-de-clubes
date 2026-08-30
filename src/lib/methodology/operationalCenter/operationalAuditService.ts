import { 
  OperationalAuditEntry, 
  DecisionActor 
} from "./types";

export class OperationalAuditService {
  private static instance: OperationalAuditService;
  private logsStore: Map<string, OperationalAuditEntry[]> = new Map();

  private constructor() {}

  public static getInstance(): OperationalAuditService {
    if (!OperationalAuditService.instance) {
      OperationalAuditService.instance = new OperationalAuditService();
    }
    return OperationalAuditService.instance;
  }

  public resetStore(): void {
    this.logsStore.clear();
  }

  /**
   * Records an immutable audit log entry for human-in-the-loop operational actions.
   */
  public logAction(params: {
    actor: DecisionActor;
    teamId: string;
    entityType: 'ALERT' | 'DECISION' | 'INTERVENTION' | 'FOLLOW_UP';
    entityId: string;
    action: string;
    previousValue?: any;
    newValue?: any;
    reason?: string;
  }): OperationalAuditEntry {
    const list = this.logsStore.get(params.teamId) || [];
    const entry: OperationalAuditEntry = {
      id: `op_audit_${params.teamId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      actor: params.actor,
      teamId: params.teamId,
      timestamp: new Date().toISOString(),
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      previousValue: params.previousValue,
      newValue: params.newValue,
      reason: params.reason
    };

    list.push(entry);
    this.logsStore.set(params.teamId, list);
    return entry;
  }

  public getAuditLogsByTeam(teamId: string): OperationalAuditEntry[] {
    return this.logsStore.get(teamId) || [];
  }

  public getAuditLog(teamId: string): OperationalAuditEntry[] {
    return this.getAuditLogsByTeam(teamId);
  }
}
