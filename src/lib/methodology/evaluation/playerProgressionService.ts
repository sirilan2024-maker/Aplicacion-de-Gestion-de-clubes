import { 
  CompetencyArea, 
  CompetencyProgressSummary, 
  AreaProgressSummary, 
  PlayerDevelopmentProfile, 
  ProgressionTrend, 
  RadarComparisonPoint 
} from "./types";
import { PlayerEvaluationService } from "./playerEvaluationService";
import { CompetencyMatrixService } from "./competencyMatrixService";

export class PlayerProgressionService {
  private static instance: PlayerProgressionService;
  private evaluationService = PlayerEvaluationService.getInstance();
  private matrixService = CompetencyMatrixService.getInstance();

  private constructor() {}

  public static getInstance(): PlayerProgressionService {
    if (!PlayerProgressionService.instance) {
      PlayerProgressionService.instance = new PlayerProgressionService();
    }
    return PlayerProgressionService.instance;
  }

  /**
   * Computes the progression and trend for a single competency of a player.
   */
  public calculateCompetencyProgression(playerId: string, competencyId: string): CompetencyProgressSummary | null {
    const comp = this.matrixService.getCompetency(competencyId);
    if (!comp) return null;

    const allEvals = this.evaluationService.getEvaluationsByPlayer(playerId);
    const compEvals = allEvals.filter(e => e.competencyId === comp.id);

    if (compEvals.length === 0) {
      return null;
    }

    const scores = compEvals.map(e => e.score);
    const sum = scores.reduce((acc, s) => acc + s, 0);
    const historicalAverage = Math.round((sum / scores.length) * 10) / 10;

    const latest = compEvals[compEvals.length - 1];
    const previous = compEvals.length > 1 ? compEvals[compEvals.length - 2] : undefined;

    let trend: ProgressionTrend = 'INSUFFICIENT_DATA';
    let scoreDelta: number | undefined = undefined;

    if (previous !== undefined) {
      scoreDelta = Math.round((latest.score - previous.score) * 10) / 10;
      if (scoreDelta >= 0.3) {
        trend = 'IMPROVING';
      } else if (scoreDelta <= -0.3) {
        trend = 'DECLINING';
      } else {
        trend = 'STABLE';
      }
    }

    return {
      competencyId: comp.id,
      competencyName: comp.name,
      area: comp.area,
      currentScore: latest.score,
      previousScore: previous?.score,
      scoreDelta,
      historicalAverage,
      evaluationsCount: compEvals.length,
      trend,
      lastEvaluationDate: latest.evaluationDate,
      lastObservation: latest.observation
    };
  }

  /**
   * Builds the comprehensive development profile for a player including areas, trends, and radar data.
   */
  public buildPlayerProfile(playerId: string): PlayerDevelopmentProfile {
    const allEvals = this.evaluationService.getEvaluationsByPlayer(playerId);
    const evaluatedCategory = allEvals[0]?.category || 'Infantil';
    const evaluatedPosition = allEvals[0]?.position;

    const areas: Record<CompetencyArea, AreaProgressSummary> = {
      tecnica: { area: 'tecnica', areaName: 'Área Técnica', averageScore: 0, competencies: [] },
      tactica: { area: 'tactica', areaName: 'Área Táctica', averageScore: 0, competencies: [] },
      fisica: { area: 'fisica', areaName: 'Área Física', averageScore: 0, competencies: [] },
      psicologica: { area: 'psicologica', areaName: 'Área Psicológica / Socio-afectiva', averageScore: 0, competencies: [] }
    };

    const radarData: RadarComparisonPoint[] = [];
    const allProgressSummaries: CompetencyProgressSummary[] = [];

    // Obtener competencias evaluadas
    const uniqueCompIds = Array.from(new Set(allEvals.map(e => e.competencyId)));

    for (const compId of uniqueCompIds) {
      const summary = this.calculateCompetencyProgression(playerId, compId);
      if (summary) {
        areas[summary.area].competencies.push(summary);
        allProgressSummaries.push(summary);

        radarData.push({
          competencyName: summary.competencyName,
          area: summary.area,
          currentScore: summary.currentScore,
          previousScore: summary.previousScore,
          fullMark: 5
        });
      }
    }

    // Calcular medias por área y global
    let totalScoreSum = 0;
    let totalScoreCount = 0;

    for (const areaKey of Object.keys(areas) as CompetencyArea[]) {
      const comps = areas[areaKey].competencies;
      if (comps.length > 0) {
        const areaSum = comps.reduce((acc, c) => acc + c.currentScore, 0);
        areas[areaKey].averageScore = Math.round((areaSum / comps.length) * 10) / 10;
        totalScoreSum += areaSum;
        totalScoreCount += comps.length;
      }
    }

    const overallAverage = totalScoreCount > 0 
      ? Math.round((totalScoreSum / totalScoreCount) * 10) / 10 
      : 0;

    return {
      playerId,
      category: evaluatedCategory,
      position: evaluatedPosition,
      totalEvaluations: allEvals.length,
      firstEvaluationDate: allEvals[0]?.evaluationDate,
      lastEvaluationDate: allEvals[allEvals.length - 1]?.evaluationDate,
      overallAverage,
      globalAverage: overallAverage,
      areas,
      areaSummaries: Object.values(areas),
      strengths: [],
      areasForImprovement: [],
      recommendedPlanningFocus: [],
      radarData
    };
  }

  /**
   * Compares player averages against cohort averages without leaking individual scores.
   */
  public compareWithCohort(playerId: string, cohortPlayerIds: string[]): Record<string, { playerScore: number; cohortAverage: number }> {
    const playerEvals = this.evaluationService.getEvaluationsByPlayer(playerId);
    const comparison: Record<string, { playerScore: number; cohortAverage: number }> = {};

    const uniqueCompIds = Array.from(new Set(playerEvals.map(e => e.competencyId)));

    for (const compId of uniqueCompIds) {
      const playerSummary = this.calculateCompetencyProgression(playerId, compId);
      if (!playerSummary) continue;

      let cohortSum = 0;
      let cohortCount = 0;

      for (const peerId of cohortPlayerIds) {
        const peerSummary = this.calculateCompetencyProgression(peerId, compId);
        if (peerSummary) {
          cohortSum += peerSummary.historicalAverage;
          cohortCount++;
        }
      }

      const cohortAvg = cohortCount > 0 ? Math.round((cohortSum / cohortCount) * 10) / 10 : playerSummary.historicalAverage;

      comparison[compId] = {
        playerScore: playerSummary.currentScore,
        cohortAverage: cohortAvg
      };
    }

    return comparison;
  }
}
