import { 
  FollowUpRecord, 
  InterventionOutcome 
} from "./types";

export class FollowUpService {
  private static instance: FollowUpService;
  private followUpsStore: Map<string, FollowUpRecord[]> = new Map();

  private constructor() {}

  public static getInstance(): FollowUpService {
    if (!FollowUpService.instance) {
      FollowUpService.instance = new FollowUpService();
    }
    return FollowUpService.instance;
  }

  public resetStore(): void {
    this.followUpsStore.clear();
  }

  /**
   * Records a structured longitudinal comparison: PRE -> INTERVENCIÓN -> POST.
   */
  public recordFollowUp(params: {
    interventionId: string;
    teamId: string;
    conceptName: string;
    timeframe: 'IMMEDIATE' | 'SHORT_TERM' | 'MEDIUM_TERM';
    preScore: number;
    postScore: number;
    evaluatorNotes?: string;
  }): FollowUpRecord {
    const list = this.followUpsStore.get(params.teamId) || [];
    const delta = Math.round((params.postScore - params.preScore) * 10) / 10;

    let outcome: InterventionOutcome = 'NO_IMPROVEMENT';
    if (delta >= 0.4) outcome = 'POSITIVE';
    else if (delta >= 0.1) outcome = 'PARTIAL';
    else if (delta > -0.3) outcome = 'NO_IMPROVEMENT';
    else outcome = 'NEGATIVE';

    const record: FollowUpRecord = {
      id: `flw_${params.teamId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      interventionId: params.interventionId,
      teamId: params.teamId,
      conceptName: params.conceptName,
      timeframe: params.timeframe,
      preScore: params.preScore,
      postScore: params.postScore,
      scoreDelta: delta,
      outcome,
      evaluatedAt: new Date().toISOString(),
      evaluatorNotes: params.evaluatorNotes
    };

    list.push(record);
    this.followUpsStore.set(params.teamId, list);
    return record;
  }

  public getFollowUpsByTeam(teamId: string): FollowUpRecord[] {
    return this.followUpsStore.get(teamId) || [];
  }

  public getFollowUpsByIntervention(interventionId: string): FollowUpRecord[] {
    const all: FollowUpRecord[] = [];
    for (const list of this.followUpsStore.values()) {
      all.push(...list.filter(f => f.interventionId === interventionId));
    }
    return all;
  }
}
