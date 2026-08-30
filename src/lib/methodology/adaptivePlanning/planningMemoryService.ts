import { 
  MethodologicalMemoryRecord, 
  SessionEffectivenessRating 
} from "./types";

export class PlanningMemoryService {
  private static instance: PlanningMemoryService;
  private memoryStore: Map<string, MethodologicalMemoryRecord[]> = new Map();

  private constructor() {}

  public static getInstance(): PlanningMemoryService {
    if (!PlanningMemoryService.instance) {
      PlanningMemoryService.instance = new PlanningMemoryService();
    }
    return PlanningMemoryService.instance;
  }

  public resetStore(): void {
    this.memoryStore.clear();
  }

  /**
   * Records that an objective was trained in a session, preserving cycle continuity.
   */
  public recordTrainedObjective(params: {
    teamId: string;
    category: string;
    conceptName: string;
    competencyId: string;
    sessionId: string;
    sessionDate?: string;
    preTrainingScore: number;
    microcycle?: string;
    notes?: string;
  }): MethodologicalMemoryRecord {
    const list = this.memoryStore.get(params.teamId) || [];
    const date = params.sessionDate || new Date().toISOString().split('T')[0];

    // Evitar duplicado exacto
    const existing = list.find(r => r.competencyId === params.competencyId && r.sessionId === params.sessionId && r.sessionDate === date);
    if (existing) {
      return existing;
    }

    // Calcular ciclos consecutivos previos
    const previousEntries = list.filter(r => r.competencyId === params.competencyId);
    const consecutiveCycles = previousEntries.length + 1;

    const record: MethodologicalMemoryRecord = {
      id: `mem_${params.teamId}_${params.competencyId}_${Date.now()}`,
      teamId: params.teamId,
      category: params.category,
      conceptName: params.conceptName,
      competencyId: params.competencyId,
      sessionId: params.sessionId,
      sessionDate: date,
      microcycle: params.microcycle,
      preTrainingScore: params.preTrainingScore,
      effectiveness: 'INSUFFICIENT_DATA',
      consecutiveCyclesCount: consecutiveCycles,
      lastWorkedDate: date,
      notes: params.notes
    };

    list.push(record);
    this.memoryStore.set(params.teamId, list);
    return record;
  }

  /**
   * Updates effectiveness outcome once subsequent evaluations are recorded.
   */
  public updateSessionOutcome(
    teamId: string, 
    competencyId: string, 
    postTrainingScore: number
  ): MethodologicalMemoryRecord | null {
    const list = this.memoryStore.get(teamId) || [];
    const target = [...list].reverse().find(r => r.competencyId === competencyId);

    if (target) {
      target.postTrainingScore = postTrainingScore;
      target.scoreDelta = Math.round((postTrainingScore - target.preTrainingScore) * 10) / 10;

      if (target.scoreDelta >= 0.4) {
        target.effectiveness = 'EFFECTIVE';
      } else if (target.scoreDelta >= 0.1) {
        target.effectiveness = 'PARTIALLY_EFFECTIVE';
      } else {
        target.effectiveness = 'INEFFECTIVE';
      }

      return target;
    }

    return null;
  }

  public getMemoryHistoryByTeam(teamId: string): MethodologicalMemoryRecord[] {
    return this.memoryStore.get(teamId) || [];
  }

  /**
   * Checks how many times a competency was trained within a recent window of days.
   */
  public getRecentWorkCount(teamId: string, competencyOrConcept: string, withinDays = 21): number {
    const list = this.getMemoryHistoryByTeam(teamId);
    const now = new Date().getTime();
    const windowMs = withinDays * 24 * 60 * 60 * 1000;
    const searchTarget = competencyOrConcept.toLowerCase();

    return list.filter(r => {
      const match = r.competencyId.toLowerCase() === searchTarget || 
                    r.conceptName.toLowerCase() === searchTarget ||
                    r.conceptName.toLowerCase().includes(searchTarget) ||
                    searchTarget.includes(r.conceptName.toLowerCase());
      if (!match) return false;
      const recDate = new Date(r.sessionDate).getTime();
      return (now - recDate) <= windowMs;
    }).length;
  }
}
