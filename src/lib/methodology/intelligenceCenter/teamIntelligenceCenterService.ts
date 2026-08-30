import { 
  TeamIntelligenceOverview 
} from "./types";
import { TeamPerformanceAggregationService } from "../teamIntelligence/teamPerformanceAggregationService";
import { TeamTacticalIntelligenceService } from "../teamIntelligence/teamTacticalIntelligenceService";
import { PerformanceDecisionEngine } from "../performance/performanceDecisionEngine";
import { PerformanceAggregationService } from "../performance/performanceAggregationService";
import { AdaptiveReplanningService } from "../adaptivePlanning/adaptiveReplanningService";
import { RiskDetectionService } from "./riskDetectionService";
import { FieldLine } from "../teamIntelligence/types";

export class TeamIntelligenceCenterService {
  private static instance: TeamIntelligenceCenterService;
  private teamAggService = TeamPerformanceAggregationService.getInstance();
  private tacticalService = TeamTacticalIntelligenceService.getInstance();
  private decisionEngine = PerformanceDecisionEngine.getInstance();
  private perfAggService = PerformanceAggregationService.getInstance();
  private replanningService = AdaptiveReplanningService.getInstance();
  private riskService = RiskDetectionService.getInstance();

  private constructor() {}

  public static getInstance(): TeamIntelligenceCenterService {
    if (!TeamIntelligenceCenterService.instance) {
      TeamIntelligenceCenterService.instance = new TeamIntelligenceCenterService();
    }
    return TeamIntelligenceCenterService.instance;
  }

  /**
   * Consolidates complete team intelligence overview.
   */
  public buildTeamOverview(
    teamId: string, 
    category: string, 
    squadPlayerIds: string[], 
    playerPositions: Record<string, any> = {}
  ): TeamIntelligenceOverview {
    const totalSquadCount = squadPlayerIds.length;
    const teamCompetencies = this.teamAggService.aggregateCompetencies(teamId, squadPlayerIds);
    const evaluatedPlayers = new Set<string>();
    
    // Contar jugadores con alguna evaluación
    for (const comp of teamCompetencies) {
      // comp.evaluatedPlayersCount da una cota
      if (comp.evaluatedPlayersCount > 0) {
        evaluatedPlayers.add(comp.competencyId);
      }
    }

    const evaluatedCount = teamCompetencies.length > 0 ? Math.min(totalSquadCount, Math.max(1, teamCompetencies[0].evaluatedPlayersCount)) : 0;
    const coveragePercentage = totalSquadCount > 0 ? Math.round((evaluatedCount / totalSquadCount) * 100) : 0;

    const overallTeamRating = teamCompetencies.length > 0
      ? Math.round((teamCompetencies.reduce((a, b) => a + b.averageScore, 0) / teamCompetencies.length) * 10) / 10
      : 0;

    // Madurez táctica por principios de juego (Módulo 4)
    const tacticalReadiness = this.tacticalService.evaluateTacticalReadiness(teamCompetencies);

    // Rendimiento por líneas
    const teamPerfResult = this.perfAggService.aggregateTeamCompetitivePerformance(teamId, squadPlayerIds, playerPositions);
    const linesPerf = teamPerfResult?.linesPerformance || {
      porteria: { averageRating: 0, eventsCount: 0 },
      defensa: { averageRating: 0, eventsCount: 0 },
      mediocampo: { averageRating: 0, eventsCount: 0 },
      ataque: { averageRating: 0, eventsCount: 0 }
    };

    const linesSummary: Record<FieldLine, { averageRating: number; status: string }> = {
      porteria: { averageRating: linesPerf.porteria?.averageRating || 0, status: (linesPerf.porteria?.averageRating || 0) >= 3.5 ? 'Óptimo' : 'En desarrollo' },
      defensa: { averageRating: linesPerf.defensa?.averageRating || 0, status: (linesPerf.defensa?.averageRating || 0) >= 3.5 ? 'Óptimo' : 'En desarrollo' },
      mediocampo: { averageRating: linesPerf.mediocampo?.averageRating || 0, status: (linesPerf.mediocampo?.averageRating || 0) >= 3.5 ? 'Óptimo' : 'En desarrollo' },
      ataque: { averageRating: linesPerf.ataque?.averageRating || 0, status: (linesPerf.ataque?.averageRating || 0) >= 3.5 ? 'Óptimo' : 'En desarrollo' }
    };

    // Recomendaciones adaptativas de planificación (Módulo 6)
    const adaptiveRecs = this.replanningService.generateAdaptiveRecommendations(teamId, category, squadPlayerIds, playerPositions);
    const activePriorities = adaptiveRecs.map(r => ({
      conceptName: r.primaryObjective,
      priority: r.priority,
      action: r.action,
      status: r.status,
      cooldownActive: !!r.cooldownActive
    }));

    // Decisiones metodológicas activas (Módulo 5)
    const activeDecisions = this.decisionEngine.getDecisionsByTeam(teamId);

    // Detección de riesgos pedagógicos y operacionales
    const compPerfList = teamCompetencies.map(c => {
      const matchObs = this.perfAggService.getObservationsByTeam(teamId).filter(o => o.competencyId === c.competencyId);
      const perfScore = matchObs.length > 0 ? matchObs.reduce((a, b) => a + b.value, 0) / matchObs.length : c.averageScore;
      return {
        competencyId: c.competencyId,
        competencyName: c.competencyName,
        evalScore: c.averageScore,
        perfScore: Math.round(perfScore * 10) / 10,
        sampleCount: c.evaluatedPlayersCount + matchObs.length
      };
    });

    const detectedRisks = this.riskService.detectRisks({
      teamId,
      totalSquadCount,
      evaluatedCount,
      activeRecommendations: adaptiveRecs,
      competencyPerformanceList: compPerfList
    });

    return {
      teamId,
      category,
      totalSquadCount,
      evaluatedPlayersCount: evaluatedCount,
      coveragePercentage,
      overallTeamRating,
      tacticalReadiness,
      linesSummary,
      activePriorities,
      activeDecisions,
      detectedRisks
    };
  }
}
