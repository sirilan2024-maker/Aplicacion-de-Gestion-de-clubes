import { 
  TeamInsight, 
  TeamCompetencyAggregation, 
  TeamLineAggregation, 
  CollectivePriorityLevel, 
  FieldLine 
} from "./types";

export class TeamDevelopmentInsightService {
  private static instance: TeamDevelopmentInsightService;

  private constructor() {}

  public static getInstance(): TeamDevelopmentInsightService {
    if (!TeamDevelopmentInsightService.instance) {
      TeamDevelopmentInsightService.instance = new TeamDevelopmentInsightService();
    }
    return TeamDevelopmentInsightService.instance;
  }

  /**
   * Discovers collective strengths and prioritized collective development needs for a team.
   */
  public discoverCollectiveInsights(
    teamCompetencies: TeamCompetencyAggregation[],
    lines?: Record<FieldLine, TeamLineAggregation>
  ): { strengths: TeamInsight[]; priorities: TeamInsight[] } {
    const strengths: TeamInsight[] = [];
    const priorities: TeamInsight[] = [];

    for (const comp of teamCompetencies) {
      // 1. Fortalezas Colectivas
      if (comp.averageScore >= 3.8 && comp.trend !== 'DECLINING') {
        const trendText = comp.trend === 'IMPROVING' ? 'con tendencia ascendente' : 'consolidada';
        strengths.push({
          id: `str_${comp.competencyId}_${Date.now()}`,
          type: 'COLLECTIVE_STRENGTH',
          priority: 'LOW',
          title: `Fortaleza Colectiva: ${comp.competencyName}`,
          description: `Rendimiento colectivo destacado (${comp.averageScore}/5) en ${comp.evaluatedPlayersCount} jugadores evaluados.`,
          competencyId: comp.competencyId,
          competencyName: comp.competencyName,
          area: comp.area,
          affectedPlayersCount: comp.evaluatedPlayersCount,
          averageScore: comp.averageScore,
          trend: comp.trend,
          rationale: `La competencia "${comp.competencyName}" presenta una media colectiva de ${comp.averageScore}/5 en ${comp.evaluatedPlayersCount}/${comp.totalSquadPlayers} jugadores (${comp.coveragePercentage}% cobertura) ${trendText}.`
        });
      }

      // 2. Debilidades y Prioridades Colectivas
      if (comp.averageScore <= 2.8 || comp.trend === 'DECLINING') {
        let priorityLevel: CollectivePriorityLevel = 'MEDIUM';

        if (comp.averageScore <= 2.3 && (comp.coveragePercentage >= 50 || comp.trend === 'DECLINING')) {
          priorityLevel = 'CRITICAL';
        } else if (comp.averageScore <= 2.7 || comp.trend === 'DECLINING') {
          priorityLevel = 'HIGH';
        }

        let trendDesc = 'con nivel estable';
        if (comp.trend === 'DECLINING') {
          trendDesc = `con tendencia descendente (${comp.previousPeriodAverage} → ${comp.averageScore})`;
        } else if (comp.trend === 'IMPROVING') {
          trendDesc = `con evolución positiva (+${comp.scoreDelta})`;
        }

        priorities.push({
          id: `prio_${comp.competencyId}_${Date.now()}`,
          type: 'COLLECTIVE_WEAKNESS',
          priority: priorityLevel,
          title: `Necesidad Prioritaria: ${comp.competencyName}`,
          description: `Rendimiento colectivo en nivel de desarrollo (${comp.averageScore}/5) detectado en ${comp.evaluatedPlayersCount} jugadores.`,
          competencyId: comp.competencyId,
          competencyName: comp.competencyName,
          area: comp.area,
          affectedPlayersCount: comp.evaluatedPlayersCount,
          averageScore: comp.averageScore,
          trend: comp.trend,
          rationale: `La competencia "${comp.competencyName}" presenta una media colectiva de ${comp.averageScore}/5 en ${comp.evaluatedPlayersCount} jugadores evaluados ${trendDesc}. Prioridad: ${priorityLevel}.`
        });
      }
    }

    // Ordenar prioridades: CRITICAL primero, luego HIGH, luego MEDIUM
    const priorityWeight: Record<CollectivePriorityLevel, number> = {
      CRITICAL: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1
    };

    priorities.sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority] || a.averageScore - b.averageScore);
    strengths.sort((a, b) => b.averageScore - a.averageScore);

    return { strengths, priorities };
  }
}
