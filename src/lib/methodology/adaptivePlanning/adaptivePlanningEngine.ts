import { 
  PlanningCycle, 
  AdaptivePlanRecommendation, 
  LearningSignal 
} from "./types";
import { AdaptiveReplanningService } from "./adaptiveReplanningService";
import { PlanningMemoryService } from "./planningMemoryService";
import { SessionEffectivenessService } from "./sessionEffectivenessService";
import { LearningSignalService } from "./learningSignalService";

export class AdaptivePlanningEngine {
  private static instance: AdaptivePlanningEngine;
  private replanningService = AdaptiveReplanningService.getInstance();
  private memoryService = PlanningMemoryService.getInstance();
  private effectivenessService = SessionEffectivenessService.getInstance();
  private signalService = LearningSignalService.getInstance();

  private cycleStore: Map<string, PlanningCycle[]> = new Map();

  private constructor() {}

  public static getInstance(): AdaptivePlanningEngine {
    if (!AdaptivePlanningEngine.instance) {
      AdaptivePlanningEngine.instance = new AdaptivePlanningEngine();
    }
    return AdaptivePlanningEngine.instance;
  }

  public resetStore(): void {
    this.cycleStore.clear();
    this.memoryService.resetStore();
  }

  /**
   * Builds an adaptive planning cycle for a team based on current M3, M4, M5 data and memory.
   */
  public buildAdaptiveCycle(
    teamId: string, 
    category: string, 
    squadPlayerIds: string[], 
    playerPositions: Record<string, any> = {}
  ): PlanningCycle {
    const existingCycles = this.cycleStore.get(teamId) || [];
    const cycleNumber = existingCycles.length + 1;

    const recommendations = this.replanningService.generateAdaptiveRecommendations(
      teamId, 
      category, 
      squadPlayerIds, 
      playerPositions
    );

    const activeNeeds = recommendations.filter(r => r.status === 'ACTIVE_NEED').map(r => r.primaryObjective);
    const consolidated = recommendations.filter(r => r.status === 'CONSOLIDATED').map(r => r.primaryObjective);
    const underReview = recommendations.filter(r => r.status === 'UNDER_REVIEW').map(r => r.primaryObjective);

    const cycle: PlanningCycle = {
      id: `cycle_${teamId}_${cycleNumber}_${Date.now()}`,
      teamId,
      category,
      cycleNumber,
      startDate: new Date().toISOString().split('T')[0],
      activeNeeds,
      consolidatedObjectives: consolidated,
      underReviewObjectives: underReview,
      recommendedPlans: recommendations,
      learningSignals: [],
      generatedAt: new Date().toISOString()
    };

    existingCycles.push(cycle);
    this.cycleStore.set(teamId, existingCycles);

    return cycle;
  }

  /**
   * Returns planning cycles for a team.
   */
  public getCyclesByTeam(teamId: string): PlanningCycle[] {
    return this.cycleStore.get(teamId) || [];
  }
}
