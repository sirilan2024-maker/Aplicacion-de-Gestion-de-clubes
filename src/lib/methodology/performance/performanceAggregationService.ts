import crypto from "crypto";
import { 
  PerformanceObservationRecord, 
  CreatePerformanceObservationInput, 
  PlayerPerformanceSummary, 
  ProgressionTrend, 
  FieldLine 
} from "./types";
import { TeamPerformanceAggregationService } from "../teamIntelligence/teamPerformanceAggregationService";

export class PerformanceAggregationService {
  private static instance: PerformanceAggregationService;
  private observationStore: Map<string, PerformanceObservationRecord> = new Map();

  private constructor() {}

  public static getInstance(): PerformanceAggregationService {
    if (!PerformanceAggregationService.instance) {
      PerformanceAggregationService.instance = new PerformanceAggregationService();
    }
    return PerformanceAggregationService.instance;
  }

  public resetStore(): void {
    this.observationStore.clear();
  }

  /**
   * Registers a performance observation event.
   */
  public createObservation(input: CreatePerformanceObservationInput): PerformanceObservationRecord {
    const date = input.date || new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    const record: PerformanceObservationRecord = {
      id: crypto.randomUUID ? crypto.randomUUID() : `perf-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      playerId: input.playerId,
      teamId: input.teamId,
      eventId: input.eventId || null,
      eventType: input.eventType || 'PARTIDO_COMPETITIVO',
      date,
      position: input.position,
      competencyId: input.competencyId,
      metric: input.metric,
      value: input.value,
      context: input.context || {},
      observerId: input.observerId || null,
      dataSource: input.dataSource || 'OBSERVACION_TECNICA',
      createdAt: now
    };

    this.observationStore.set(record.id, record);
    return record;
  }

  public batchCreateObservations(inputs: CreatePerformanceObservationInput[]): PerformanceObservationRecord[] {
    return inputs.map(i => this.createObservation(i));
  }

  public getObservationsByPlayer(playerId: string): PerformanceObservationRecord[] {
    const list: PerformanceObservationRecord[] = [];
    for (const r of this.observationStore.values()) {
      if (r.playerId === playerId) {
        list.push(r);
      }
    }
    return list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  public getObservationsByTeam(teamId: string): PerformanceObservationRecord[] {
    const list: PerformanceObservationRecord[] = [];
    for (const r of this.observationStore.values()) {
      if (r.teamId === teamId) {
        list.push(r);
      }
    }
    return list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  /**
   * Aggregates competitive & training performance for an individual player.
   */
  public aggregatePlayerPerformance(playerId: string, teamId: string): PlayerPerformanceSummary {
    const observations = this.getObservationsByPlayer(playerId)
      .filter(o => o.teamId === teamId);

    const tacticalRatings = observations.filter(o => o.metric === 'VALORACION_TACTICA' || o.metric === 'RATING_GLOBAL');
    const minutesObs = observations.filter(o => o.metric === 'MINUTOS_JUGADOS');

    const totalMinutes = minutesObs.reduce((sum, o) => sum + o.value, 0);
    const scores = tacticalRatings.map(o => o.value);

    let avgRating = 0;
    let trend: ProgressionTrend = 'INSUFFICIENT_DATA';

    if (scores.length > 0) {
      avgRating = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
      
      if (scores.length >= 2) {
        const latest = scores[scores.length - 1];
        const previous = scores[scores.length - 2];
        const delta = Math.round((latest - previous) * 10) / 10;

        if (delta >= 0.3) trend = 'IMPROVING';
        else if (delta <= -0.3) trend = 'DECLINING';
        else trend = 'STABLE';
      }
    }

    const uniqueEvents = new Set(observations.map(o => o.eventId || o.date)).size;

    return {
      playerId,
      teamId,
      totalEventsObserved: uniqueEvents,
      totalMinutesPlayed: totalMinutes,
      averageTacticalRating: avgRating,
      averageGlobalRating: avgRating,
      trend,
      contextualAdjustedRating: avgRating,
      lastObservationDate: observations[observations.length - 1]?.date
    };
  }

  /**
   * Aggregates team-level competitive performance across players, lines, and events.
   */
  public aggregateTeamCompetitivePerformance(
    teamId: string, 
    squadPlayerIds: string[], 
    playerPositions: Record<string, any> = {}
  ) {
    const teamObservations = this.getObservationsByTeam(teamId);
    const uniqueEvents = new Set(teamObservations.map(o => o.eventId || o.date)).size;

    const playerSummaries: PlayerPerformanceSummary[] = squadPlayerIds.map(pid => 
      this.aggregatePlayerPerformance(pid, teamId)
    ).filter(s => s.totalEventsObserved > 0);

    const scores = playerSummaries.map(s => s.averageTacticalRating).filter(s => s > 0);
    const avgTeam = scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : 0;

    let teamTrend: ProgressionTrend = 'INSUFFICIENT_DATA';
    if (playerSummaries.length >= 3) {
      const improvingCount = playerSummaries.filter(s => s.trend === 'IMPROVING').length;
      const decliningCount = playerSummaries.filter(s => s.trend === 'DECLINING').length;

      if (improvingCount > decliningCount && improvingCount >= 2) teamTrend = 'IMPROVING';
      else if (decliningCount > improvingCount && decliningCount >= 2) teamTrend = 'DECLINING';
      else teamTrend = 'STABLE';
    }

    // Rendimiento por Línea Táctica
    const linesPerformance: Record<FieldLine, { averageRating: number; eventsCount: number }> = {
      porteria: { averageRating: 0, eventsCount: 0 },
      defensa: { averageRating: 0, eventsCount: 0 },
      mediocampo: { averageRating: 0, eventsCount: 0 },
      ataque: { averageRating: 0, eventsCount: 0 }
    };

    for (const lineKey of Object.keys(linesPerformance) as FieldLine[]) {
      const pidsInLine = Object.entries(playerPositions)
        .filter(([_, pos]) => TeamPerformanceAggregationService.mapPositionToLine(pos) === lineKey)
        .map(([pid]) => pid);

      const lineSummaries = playerSummaries.filter(s => pidsInLine.includes(s.playerId));
      if (lineSummaries.length > 0) {
        const lineScores = lineSummaries.map(s => s.averageTacticalRating).filter(r => r > 0);
        if (lineScores.length > 0) {
          linesPerformance[lineKey].averageRating = Math.round((lineScores.reduce((a, b) => a + b, 0) / lineScores.length) * 10) / 10;
          linesPerformance[lineKey].eventsCount = lineSummaries.reduce((sum, s) => sum + s.totalEventsObserved, 0);
        }
      }
    }

    const coveragePct = squadPlayerIds.length > 0 
      ? Math.round((playerSummaries.length / squadPlayerIds.length) * 100) 
      : 0;

    return {
      teamId,
      totalCompetitiveEvents: uniqueEvents,
      evaluatedPlayersCount: playerSummaries.length,
      squadCoveragePercentage: coveragePct,
      averageTeamCompetitiveRating: avgTeam,
      trend: teamTrend,
      linesPerformance,
      playerSummaries
    };
  }
}
