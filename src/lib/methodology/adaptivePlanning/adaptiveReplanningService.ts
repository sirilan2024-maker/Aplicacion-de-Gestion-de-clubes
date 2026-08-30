import { 
  AdaptivePlanRecommendation, 
  ObjectiveStatus 
} from "./types";
import { LearningSignalService } from "./learningSignalService";
import { PlanningMemoryService } from "./planningMemoryService";
import { TeamPerformanceAggregationService } from "../teamIntelligence/teamPerformanceAggregationService";
import { PerformanceAggregationService } from "../performance/performanceAggregationService";
import { PerformanceDecisionEngine } from "../performance/performanceDecisionEngine";

export class AdaptiveReplanningService {
  private static instance: AdaptiveReplanningService;
  private memoryService = PlanningMemoryService.getInstance();
  private signalService = LearningSignalService.getInstance();
  private teamAggService = TeamPerformanceAggregationService.getInstance();
  private perfAggService = PerformanceAggregationService.getInstance();
  private decisionEngine = PerformanceDecisionEngine.getInstance();

  private constructor() {}

  public static getInstance(): AdaptiveReplanningService {
    if (!AdaptiveReplanningService.instance) {
      AdaptiveReplanningService.instance = new AdaptiveReplanningService();
    }
    return AdaptiveReplanningService.instance;
  }

  /**
   * Synthesizes Módulos 3, 4, 5 and memory history to generate adaptive planning recommendations.
   */
  public generateAdaptiveRecommendations(
    teamId: string, 
    category: string, 
    squadPlayerIds: string[], 
    playerPositions: Record<string, any> = {}
  ): AdaptivePlanRecommendation[] {
    const recommendations: AdaptivePlanRecommendation[] = [];

    // 1. Obtener agregación de competencias del Módulo 4
    const teamCompetencies = this.teamAggService.aggregateCompetencies(teamId, squadPlayerIds);

    // 2. Obtener rendimiento competitivo del Módulo 5
    const teamPerf = this.perfAggService.aggregateTeamCompetitivePerformance(teamId, squadPlayerIds, playerPositions);

    if (teamCompetencies.length === 0 && teamPerf.evaluatedPlayersCount === 0) {
      return recommendations;
    }

    for (const comp of teamCompetencies) {
      // Buscar observaciones de rendimiento correspondientes
      const compPerfObs = this.perfAggService.getObservationsByTeam(teamId)
        .filter(o => o.competencyId === comp.competencyId);

      const perfScore = compPerfObs.length > 0
        ? Math.round((compPerfObs.reduce((a, b) => a + b.value, 0) / compPerfObs.length) * 10) / 10
        : comp.averageScore; // fallback a evaluación si no hay partido directo

      const sampleVolume = comp.evaluatedPlayersCount + compPerfObs.length;
      const isConcordant = (comp.averageScore <= 2.7 && perfScore <= 2.7) || (comp.averageScore >= 3.8 && perfScore >= 3.8);
      const { score: confScore, level: confLevel } = this.decisionEngine.calculateConfidence(sampleVolume, 5, isConcordant);

      // Extraer señal de aprendizaje
      const signal = this.signalService.extractLearningSignal({
        teamId,
        conceptName: comp.competencyName,
        competencyId: comp.competencyId,
        evaluationScore: comp.averageScore,
        performanceScore: perfScore,
        sampleVolume,
        confidence: confLevel,
        scoreDelta: comp.scoreDelta
      });

      let status: ObjectiveStatus = 'ACTIVE_NEED';
      let cooldown = false;

      if (signal.type === 'CONSOLIDATED_IMPROVEMENT') {
        status = 'CONSOLIDATED';
      } else if (signal.type === 'RECENTLY_TRAINED_COOLDOWN') {
        status = 'RECENTLY_TRAINED';
        cooldown = true;
      } else if (signal.type === 'CONTRADICTION') {
        status = 'UNDER_REVIEW';
      } else if (signal.type === 'PERSISTENT_STRUGGLE') {
        status = 'ACTIVE_NEED';
      } else {
        status = 'MONITORING';
      }

      const rationale = `[${signal.type}] ${signal.evidence.join(' ')} Acción recomendada: ${signal.recommendedAction} (Prioridad: ${signal.effectivePriority}).`;

      recommendations.push({
        primaryObjective: comp.competencyName,
        secondaryObjectives: ['Conservación y juego de posición', 'Transición rápida'],
        suggestedDurationMinutes: 75,
        priority: signal.effectivePriority,
        action: signal.recommendedAction,
        status,
        rationale,
        evidence: signal.evidence,
        confidenceLevel: confLevel,
        cooldownActive: cooldown
      });
    }

    // Ordenar prioridades: CRITICAL > HIGH > MEDIUM > LOW
    const weightMap: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    return recommendations.sort((a, b) => weightMap[b.priority] - weightMap[a.priority]);
  }
}
