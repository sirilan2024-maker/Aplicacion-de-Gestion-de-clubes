import { 
  MethodologicalIntelligenceSnapshot, 
  DecisionExplanation 
} from "./types";
import { TeamIntelligenceCenterService } from "./teamIntelligenceCenterService";
import { PlayerIntelligenceService } from "./playerIntelligenceService";
import { PlanningMemoryService } from "../adaptivePlanning/planningMemoryService";
import { AdaptiveReplanningService } from "../adaptivePlanning/adaptiveReplanningService";
import { PerformanceDecisionEngine } from "../performance/performanceDecisionEngine";

export class IntelligenceSnapshotService {
  private static instance: IntelligenceSnapshotService;
  private teamService = TeamIntelligenceCenterService.getInstance();
  private playerService = PlayerIntelligenceService.getInstance();
  private memoryService = PlanningMemoryService.getInstance();
  private replanningService = AdaptiveReplanningService.getInstance();
  private decisionEngine = PerformanceDecisionEngine.getInstance();

  private constructor() {}

  public static getInstance(): IntelligenceSnapshotService {
    if (!IntelligenceSnapshotService.instance) {
      IntelligenceSnapshotService.instance = new IntelligenceSnapshotService();
    }
    return IntelligenceSnapshotService.instance;
  }

  /**
   * Builds the master intelligence snapshot consolidating squad, players, planning and governance.
   */
  public generateSnapshot(
    teamId: string, 
    category: string, 
    squadPlayerIds: string[], 
    playerPositions: Record<string, any> = {}
  ): MethodologicalIntelligenceSnapshot {
    const teamOverview = this.teamService.buildTeamOverview(teamId, category, squadPlayerIds, playerPositions);
    const playerProfiles = squadPlayerIds.map(pId => this.playerService.buildPlayerProfile(pId, teamId, category, playerPositions[pId]));
    const memoryHistory = this.memoryService.getMemoryHistoryByTeam(teamId);
    const adaptiveRecs = this.replanningService.generateAdaptiveRecommendations(teamId, category, squadPlayerIds, playerPositions);

    const pastSessionsCount = memoryHistory.length;
    const effectiveSessionsCount = memoryHistory.filter(m => m.effectiveness === 'EFFECTIVE').length;
    const presentActiveNeeds = teamOverview.activePriorities.filter(p => p.status === 'ACTIVE_NEED').map(p => p.conceptName);

    const criticalRisksCount = teamOverview.detectedRisks.filter(r => r.severity === 'CRITICAL').length;

    return {
      snapshotId: `snap_${teamId}_${Date.now()}`,
      teamId,
      category,
      generatedAt: new Date().toISOString(),
      teamOverview,
      playerProfiles,
      planningTimeline: {
        pastSessionsCount,
        effectiveSessionsCount,
        presentActiveNeeds,
        futureRecommendedIntents: adaptiveRecs
      },
      governanceAndRisks: {
        totalRisksCount: teamOverview.detectedRisks.length,
        criticalRisksCount,
        risks: teamOverview.detectedRisks
      }
    };
  }

  /**
   * Produces an explainable, structured breakdown of why a decision was reached.
   */
  public explainDecision(teamId: string, decisionId: string): DecisionExplanation | null {
    const decisions = this.decisionEngine.getDecisionsByTeam(teamId);
    const target = decisions.find(d => d.id === decisionId);

    if (!target) {
      return null;
    }

    return {
      decisionId: target.id,
      conclusion: target.problem,
      primaryAction: target.action,
      priority: target.priority,
      confidenceScore: target.confidenceScore,
      confidenceLevel: target.confidenceLevel,
      supportingEvidence: target.evidence,
      mitigatingFactors: ['Rendimiento ponderado por contexto competitivo', 'Historial reciente de intervenciones'],
      dataLimitations: target.confidenceLevel === 'LOW' || target.confidenceLevel === 'VERY_LOW' 
        ? ['Volumen de muestra bajo (< 3 observaciones)'] 
        : [],
      suggestedAction: target.recommendation
    };
  }
}
