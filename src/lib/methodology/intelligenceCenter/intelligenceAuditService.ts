import { IntelligenceAuditEntry } from "./types";

export class IntelligenceAuditService {
  private static instance: IntelligenceAuditService;
  private auditLogs: Map<string, IntelligenceAuditEntry[]> = new Map();

  private constructor() {}

  public static getInstance(): IntelligenceAuditService {
    if (!IntelligenceAuditService.instance) {
      IntelligenceAuditService.instance = new IntelligenceAuditService();
    }
    return IntelligenceAuditService.instance;
  }

  public resetStore(): void {
    this.auditLogs.clear();
  }

  /**
   * Audits access to intelligence snapshots.
   */
  public recordSnapshotQuery(
    teamId: string, 
    queriedByRole: string, 
    snapshotId: string, 
    actionTaken?: string
  ): IntelligenceAuditEntry {
    const list = this.auditLogs.get(teamId) || [];
    const entry: IntelligenceAuditEntry = {
      id: `audit_${teamId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      teamId,
      queriedByRole,
      snapshotId,
      timestamp: new Date().toISOString(),
      actionTaken
    };

    list.push(entry);
    this.auditLogs.set(teamId, list);
    return entry;
  }

  public getAuditLogsByTeam(teamId: string): IntelligenceAuditEntry[] {
    return this.auditLogs.get(teamId) || [];
  }
}
