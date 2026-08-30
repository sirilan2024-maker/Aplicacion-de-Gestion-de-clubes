import { 
  TeamDiagnosisReport, 
  TeamWorkedObjectiveRecord, 
  CollectivePriorityLevel, 
  DataCoverageQuality 
} from "./types";
import { TeamPerformanceAggregationService } from "./teamPerformanceAggregationService";
import { TeamTacticalIntelligenceService } from "./teamTacticalIntelligenceService";
import { TeamDevelopmentInsightService } from "./teamDevelopmentInsightService";

export class TeamPlanningIntegrationService {
  private static instance: TeamPlanningIntegrationService;
  private aggregationService = TeamPerformanceAggregationService.getInstance();
  private tacticalService = TeamTacticalIntelligenceService.getInstance();
  private insightService = TeamDevelopmentInsightService.getInstance();

  private workedObjectivesStore: Map<string, TeamWorkedObjectiveRecord[]> = new Map();

  private constructor() {}

  public static getInstance(): TeamPlanningIntegrationService {
    if (!TeamPlanningIntegrationService.instance) {
      TeamPlanningIntegrationService.instance = new TeamPlanningIntegrationService();
    }
    return TeamPlanningIntegrationService.instance;
  }

  /**
   * Resets local worked objectives store (useful for clean testing environments).
   */
  public resetStore(): void {
    this.workedObjectivesStore.clear();
  }

  /**
   * Records that a collective tactical objective was worked in a specific session.
   */
  public recordWorkedObjective(
    teamId: string,
    tacticalConcept: string,
    relatedCompetencyId: string,
    sessionId: string,
    evaluationBeforeScore: number,
    sessionDate?: string
  ): TeamWorkedObjectiveRecord {
    const list = this.workedObjectivesStore.get(teamId) || [];
    const date = sessionDate || new Date().toISOString().split('T')[0];

    const record: TeamWorkedObjectiveRecord = {
      id: `wo_${teamId}_${relatedCompetencyId}_${Date.now()}`,
      teamId,
      tacticalConcept,
      relatedCompetencyId,
      sessionId,
      sessionDate: date,
      evaluationBeforeScore,
      status: 'PENDING_EVALUATION'
    };

    list.push(record);
    this.workedObjectivesStore.set(teamId, list);
    return record;
  }

  /**
   * Updates worked objective status after new evaluations are registered.
   */
  public updateWorkedObjectiveProgress(
    teamId: string,
    relatedCompetencyId: string,
    evaluationAfterScore: number
  ): TeamWorkedObjectiveRecord | null {
    const list = this.workedObjectivesStore.get(teamId) || [];
    const target = list.find(r => r.relatedCompetencyId === relatedCompetencyId && r.status === 'PENDING_EVALUATION');

    if (target) {
      target.evaluationAfterScore = evaluationAfterScore;
      target.improvementDelta = Math.round((evaluationAfterScore - target.evaluationBeforeScore) * 10) / 10;
      target.status = target.improvementDelta >= 0.4 ? 'IMPROVED' : 'STAGNANT';
      return target;
    }

    return null;
  }

  /**
   * Generates a complete collective team diagnosis report integrating Módulos 2, 3 and 4.
   */
  public generateTeamDiagnosisReport(
    teamId: string,
    category: string,
    squadPlayerIds: string[],
    playerPositions: Record<string, any> = {}
  ): TeamDiagnosisReport {
    // 1. Agregación de Competencias
    const teamCompetencies = this.aggregationService.aggregateCompetencies(teamId, squadPlayerIds);
    const areas = this.aggregationService.aggregateAreas(teamCompetencies);
    const lines = this.aggregationService.aggregateLines(teamId, playerPositions);

    // 2. Cobertura y Calidad de Muestra
    const evaluatedCount = Array.from(new Set(
      squadPlayerIds.filter(pid => teamCompetencies.some(c => c.evaluatedPlayersCount > 0))
    )).length;
    const squadCoveragePct = squadPlayerIds.length > 0 
      ? Math.round((evaluatedCount / squadPlayerIds.length) * 100) 
      : 0;
    const coverageQuality = this.aggregationService.evaluateCoverageQuality(evaluatedCount, squadPlayerIds.length);

    // 3. Inteligencia Táctica y Madurez en Modelo de Juego
    const tacticalReadiness = this.tacticalService.evaluateTacticalReadiness(teamCompetencies);

    // 4. Descubrimiento de Insights Colectivos
    const { strengths, priorities } = this.insightService.discoverCollectiveInsights(teamCompetencies, lines);

    // 5. Historial de Objetivos Trabajados
    const workedHistory = this.workedObjectivesStore.get(teamId) || [];

    // 6. Generación de Recomendaciones para SessionPlannerService (Módulo 2)
    const recommendedSessionIntents: any[] = [];
    const resolvedCompetencyIds = new Set(workedHistory.filter(w => w.status === 'IMPROVED').map(w => w.relatedCompetencyId));

    for (const prio of priorities) {
      // Si ya fue trabajado con éxito reciente, reducir prioridad o saltar
      const isResolved = resolvedCompetencyIds.has(prio.competencyId);
      const effectivePriority: CollectivePriorityLevel = isResolved ? 'LOW' : prio.priority;

      if (effectivePriority !== 'LOW' || priorities.length <= 2) {
        recommendedSessionIntents.push({
          primaryObjective: prio.competencyName,
          secondaryObjectives: ['Conservación y juego de posición'],
          suggestedDurationMinutes: 75,
          priority: effectivePriority,
          rationale: prio.rationale
        });
      }
    }

    // Calcular media general del equipo
    const overallAvg = teamCompetencies.length > 0
      ? Math.round((teamCompetencies.reduce((a, b) => a + b.averageScore, 0) / teamCompetencies.length) * 10) / 10
      : 0;

    return {
      teamId,
      category,
      totalSquadPlayers: squadPlayerIds.length,
      evaluatedPlayersCount: evaluatedCount,
      squadCoveragePercentage: squadCoveragePct,
      dataCoverageQuality: coverageQuality,
      overallTeamAverage: overallAvg,
      areas,
      lines,
      tacticalReadiness,
      collectiveStrengths: strengths,
      collectivePriorities: priorities,
      workedObjectivesHistory: workedHistory,
      recommendedSessionIntents,
      generatedAt: new Date().toISOString()
    };
  }
}
