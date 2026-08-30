import { 
  CompetencyArea, 
  PlayerPosition 
} from "../evaluation/types";
import { 
  FieldLine, 
  DataCoverageQuality, 
  ScoreDistribution, 
  TeamCompetencyAggregation, 
  TeamAreaAggregation, 
  TeamLineAggregation, 
  TeamPositionAggregation 
} from "./types";
import { PlayerEvaluationService } from "../evaluation/playerEvaluationService";
import { CompetencyMatrixService } from "../evaluation/competencyMatrixService";
import { PlayerProgressionService } from "../evaluation/playerProgressionService";

export class TeamPerformanceAggregationService {
  private static instance: TeamPerformanceAggregationService;
  private evaluationService = PlayerEvaluationService.getInstance();
  private matrixService = CompetencyMatrixService.getInstance();
  private progressionService = PlayerProgressionService.getInstance();

  private constructor() {}

  public static getInstance(): TeamPerformanceAggregationService {
    if (!TeamPerformanceAggregationService.instance) {
      TeamPerformanceAggregationService.instance = new TeamPerformanceAggregationService();
    }
    return TeamPerformanceAggregationService.instance;
  }

  /**
   * Helper to map player position to tactical field line.
   */
  public static mapPositionToLine(position?: string | PlayerPosition): FieldLine {
    switch (position) {
      case 'portero':
        return 'porteria';
      case 'defensa_central':
      case 'lateral':
        return 'defensa';
      case 'mediocentro':
      case 'interior':
        return 'mediocampo';
      case 'extremo':
      case 'delantero':
        return 'ataque';
      default:
        return 'mediocampo';
    }
  }

  /**
   * Evaluates data coverage quality of the squad sample.
   */
  public evaluateCoverageQuality(evaluatedCount: number, totalCount: number): DataCoverageQuality {
    if (totalCount === 0 || evaluatedCount < 3) {
      return 'INSUFFICIENT_DATA';
    }
    const coverage = (evaluatedCount / totalCount) * 100;
    if (coverage < 30) return 'INSUFFICIENT_DATA';
    if (coverage < 50) return 'LOW';
    if (coverage < 75) return 'ADEQUATE';
    return 'OPTIMAL';
  }

  /**
   * Aggregates team performance metrics across competencies for a specific team and squad.
   */
  public aggregateCompetencies(teamId: string, squadPlayerIds: string[]): TeamCompetencyAggregation[] {
    const aggregations: TeamCompetencyAggregation[] = [];
    const allCompetencies = this.matrixService.getAllCompetencies();
    const totalSquadPlayers = squadPlayerIds.length;

    for (const comp of allCompetencies) {
      const latestScores: number[] = [];
      const previousScores: number[] = [];
      const allHistoricalScores: number[] = [];
      const distribution: ScoreDistribution = { level1: 0, level2: 0, level3: 0, level4: 0, level5: 0 };
      let lastDate: string | undefined = undefined;

      for (const playerId of squadPlayerIds) {
        // Multi-team isolation: only consider evaluations matching this teamId or player's evaluations in this context
        const pEvals = this.evaluationService.getEvaluationsByPlayer(playerId)
          .filter(e => !e.teamId || e.teamId === teamId)
          .filter(e => e.competencyId === comp.id);

        if (pEvals.length > 0) {
          const latest = pEvals[pEvals.length - 1];
          latestScores.push(latest.score);

          // Update distribution
          const sc = latest.score;
          if (sc === 1) distribution.level1++;
          else if (sc === 2) distribution.level2++;
          else if (sc === 3) distribution.level3++;
          else if (sc === 4) distribution.level4++;
          else if (sc === 5) distribution.level5++;

          if (!lastDate || new Date(latest.evaluationDate) > new Date(lastDate)) {
            lastDate = latest.evaluationDate;
          }

          if (pEvals.length > 1) {
            previousScores.push(pEvals[pEvals.length - 2].score);
          }

          for (const ev of pEvals) {
            allHistoricalScores.push(ev.score);
          }
        }
      }

      if (latestScores.length > 0) {
        const avgCurrent = Math.round((latestScores.reduce((a, b) => a + b, 0) / latestScores.length) * 10) / 10;
        const avgHist = Math.round((allHistoricalScores.reduce((a, b) => a + b, 0) / allHistoricalScores.length) * 10) / 10;

        let avgPrevious: number | undefined = undefined;
        let scoreDelta: number | undefined = undefined;
        let trend: any = 'INSUFFICIENT_DATA';

        if (previousScores.length >= 2) {
          avgPrevious = Math.round((previousScores.reduce((a, b) => a + b, 0) / previousScores.length) * 10) / 10;
          scoreDelta = Math.round((avgCurrent - avgPrevious) * 10) / 10;
          if (scoreDelta >= 0.25) trend = 'IMPROVING';
          else if (scoreDelta <= -0.25) trend = 'DECLINING';
          else trend = 'STABLE';
        }

        const coveragePct = totalSquadPlayers > 0 
          ? Math.round((latestScores.length / totalSquadPlayers) * 100) 
          : 0;

        aggregations.push({
          competencyId: comp.id,
          competencyName: comp.name,
          area: comp.area,
          averageScore: avgCurrent,
          historicalAverage: avgHist,
          previousPeriodAverage: avgPrevious,
          scoreDelta,
          trend,
          evaluatedPlayersCount: latestScores.length,
          totalSquadPlayers,
          coveragePercentage: coveragePct,
          scoreDistribution: distribution,
          lastEvaluationDate: lastDate
        });
      }
    }

    return aggregations;
  }

  /**
   * Aggregates team performance by Areas (Técnica, Táctica, Física, Psicológica).
   */
  public aggregateAreas(teamCompetencies: TeamCompetencyAggregation[]): Record<CompetencyArea, TeamAreaAggregation> {
    const areas: Record<CompetencyArea, TeamAreaAggregation> = {
      tecnica: { area: 'tecnica', areaName: 'Área Técnica', averageScore: 0, coveragePercentage: 0, competencies: [] },
      tactica: { area: 'tactica', areaName: 'Área Táctica', averageScore: 0, coveragePercentage: 0, competencies: [] },
      fisica: { area: 'fisica', areaName: 'Área Física', averageScore: 0, coveragePercentage: 0, competencies: [] },
      psicologica: { area: 'psicologica', areaName: 'Área Psicológica / Socio-Afectiva', averageScore: 0, coveragePercentage: 0, competencies: [] }
    };

    for (const comp of teamCompetencies) {
      areas[comp.area].competencies.push(comp);
    }

    for (const areaKey of Object.keys(areas) as CompetencyArea[]) {
      const list = areas[areaKey].competencies;
      if (list.length > 0) {
        const sum = list.reduce((a, b) => a + b.averageScore, 0);
        const covSum = list.reduce((a, b) => a + b.coveragePercentage, 0);
        areas[areaKey].averageScore = Math.round((sum / list.length) * 10) / 10;
        areas[areaKey].coveragePercentage = Math.round(covSum / list.length);
      }
    }

    return areas;
  }

  /**
   * Aggregates team performance by Tactical Lines (Portería, Defensa, Mediocampo, Ataque).
   */
  public aggregateLines(
    teamId: string, 
    playerPositions: Record<string, PlayerPosition | string>
  ): Record<FieldLine, TeamLineAggregation> {
    const lineConfig: Record<FieldLine, { name: string; positions: PlayerPosition[] }> = {
      porteria: { name: 'Línea de Portería', positions: ['portero'] },
      defensa: { name: 'Línea Defensiva', positions: ['defensa_central', 'lateral'] },
      mediocampo: { name: 'Línea de Mediocampo', positions: ['mediocentro', 'interior'] },
      ataque: { name: 'Línea de Ataque', positions: ['extremo', 'delantero'] }
    };

    const lines: Record<FieldLine, TeamLineAggregation> = {
      porteria: { line: 'porteria', lineName: lineConfig.porteria.name, positions: lineConfig.porteria.positions, averageScore: 0, evaluatedPlayersCount: 0, coveragePercentage: 0, topStrengths: [], topNeeds: [] },
      defensa: { line: 'defensa', lineName: lineConfig.defensa.name, positions: lineConfig.defensa.positions, averageScore: 0, evaluatedPlayersCount: 0, coveragePercentage: 0, topStrengths: [], topNeeds: [] },
      mediocampo: { line: 'mediocampo', lineName: lineConfig.mediocampo.name, positions: lineConfig.mediocampo.positions, averageScore: 0, evaluatedPlayersCount: 0, coveragePercentage: 0, topStrengths: [], topNeeds: [] },
      ataque: { line: 'ataque', lineName: lineConfig.ataque.name, positions: lineConfig.ataque.positions, averageScore: 0, evaluatedPlayersCount: 0, coveragePercentage: 0, topStrengths: [], topNeeds: [] }
    };

    for (const [playerId, pos] of Object.entries(playerPositions)) {
      const line = TeamPerformanceAggregationService.mapPositionToLine(pos);
      const evals = this.evaluationService.getEvaluationsByPlayer(playerId)
        .filter(e => !e.teamId || e.teamId === teamId);

      if (evals.length > 0) {
        lines[line].evaluatedPlayersCount++;
      }
    }

    // Calcular notas medias por línea
    for (const lineKey of Object.keys(lines) as FieldLine[]) {
      const playerIdsInLine = Object.entries(playerPositions)
        .filter(([_, pos]) => TeamPerformanceAggregationService.mapPositionToLine(pos) === lineKey)
        .map(([pid]) => pid);

      if (playerIdsInLine.length > 0) {
        const comps = this.aggregateCompetencies(teamId, playerIdsInLine);
        if (comps.length > 0) {
          const sum = comps.reduce((a, b) => a + b.averageScore, 0);
          lines[lineKey].averageScore = Math.round((sum / comps.length) * 10) / 10;
          lines[lineKey].coveragePercentage = Math.round((lines[lineKey].evaluatedPlayersCount / playerIdsInLine.length) * 100);

          // Top Strengths & Needs por línea
          const sorted = [...comps].sort((a, b) => b.averageScore - a.averageScore);
          lines[lineKey].topStrengths = sorted.filter(c => c.averageScore >= 3.8).slice(0, 2).map(c => c.competencyName);
          lines[lineKey].topNeeds = sorted.filter(c => c.averageScore <= 2.7).slice(-2).map(c => c.competencyName);
        }
      }
    }

    return lines;
  }

  /**
   * Aggregates team performance by specific Position.
   */
  public aggregatePositions(
    teamId: string, 
    playerPositions: Record<string, PlayerPosition | string>
  ): Record<string, TeamPositionAggregation> {
    const result: Record<string, TeamPositionAggregation> = {};
    const positionsList = Array.from(new Set(Object.values(playerPositions)));

    for (const pos of positionsList) {
      const pids = Object.entries(playerPositions)
        .filter(([_, p]) => p === pos)
        .map(([pid]) => pid);

      const comps = this.aggregateCompetencies(teamId, pids);
      const avg = comps.length > 0 
        ? Math.round((comps.reduce((a, b) => a + b.averageScore, 0) / comps.length) * 10) / 10 
        : 0;

      result[pos] = {
        position: pos,
        positionName: String(pos).replace(/_/g, ' ').toUpperCase(),
        averageScore: avg,
        evaluatedPlayersCount: pids.length,
        competencies: comps
      };
    }

    return result;
  }
}
