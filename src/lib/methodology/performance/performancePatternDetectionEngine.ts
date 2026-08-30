import { PerformanceObservationRecord, PerformancePattern, ConfidenceLevel } from "./types";

export class PerformancePatternDetectionEngine {
  private static instance: PerformancePatternDetectionEngine;

  private constructor() {}

  public static getInstance(): PerformancePatternDetectionEngine {
    if (!PerformancePatternDetectionEngine.instance) {
      PerformancePatternDetectionEngine.instance = new PerformancePatternDetectionEngine();
    }
    return PerformancePatternDetectionEngine.instance;
  }

  /**
   * Scans performance observations to extract recurring behavioral patterns.
   */
  public detectPatterns(teamId: string, observations: PerformanceObservationRecord[]): PerformancePattern[] {
    const patterns: PerformancePattern[] = [];
    if (observations.length < 2) {
      return patterns;
    }

    // 1. Patrón de Dificultad Defensiva Recurrente (Presión / Transición Defensiva)
    const defObs = observations.filter(o => o.competencyId === 'tac_transicion_defensiva' || o.competencyId === 'tac_presion');
    if (defObs.length >= 2) {
      const lowCount = defObs.filter(o => o.value <= 2.5).length;
      if (lowCount >= 2) {
        patterns.push({
          id: `pat_def_${teamId}_${Date.now()}`,
          entityType: 'TEAM',
          entityId: teamId,
          patternName: 'Dificultad Recurrente en Transición Defensiva',
          description: `Se detectaron ${lowCount} partidos con rendimiento bajo (<=2.5/5) en fases de recuperación o repliegue post-pérdida.`,
          occurrencesCount: lowCount,
          trend: 'DECLINING',
          confidence: lowCount >= 3 ? 'HIGH' : 'MEDIUM',
          supportingEventDates: defObs.map(o => o.date)
        });
      }
    }

    // 2. Patrón de Solidez Colectiva / Resiliencia
    const highObs = observations.filter(o => o.value >= 4.0);
    if (highObs.length >= 3) {
      patterns.push({
        id: `pat_sol_${teamId}_${Date.now()}`,
        entityType: 'TEAM',
        entityId: teamId,
        patternName: 'Solidez Competitiva Consistente',
        description: `Rendimiento sobresaliente (>=4.0/5) sostenido a lo largo de ${highObs.length} observaciones competitivas.`,
        occurrencesCount: highObs.length,
        trend: 'IMPROVING',
        confidence: 'HIGH',
        supportingEventDates: highObs.map(o => o.date)
      });
    }

    return patterns;
  }
}
