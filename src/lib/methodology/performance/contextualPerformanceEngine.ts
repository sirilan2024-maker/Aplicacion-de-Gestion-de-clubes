import { ContextualFactors, PerformanceObservationRecord } from "./types";

export class ContextualPerformanceEngine {
  private static instance: ContextualPerformanceEngine;

  private constructor() {}

  public static getInstance(): ContextualPerformanceEngine {
    if (!ContextualPerformanceEngine.instance) {
      ContextualPerformanceEngine.instance = new ContextualPerformanceEngine();
    }
    return ContextualPerformanceEngine.instance;
  }

  /**
   * Adjusts a raw performance rating (1 to 5) based on real match contextual difficulty.
   */
  public calculateContextualRating(rawRating: number, context: ContextualFactors): number {
    let modifier = 0;

    // 1. Dificultad del Rival
    if (context.opponentStrength === 'ALTO') {
      modifier += 0.3; // Bonificación por exigencia máxima
    } else if (context.opponentStrength === 'BAJO') {
      modifier -= 0.2; // Penalización relativa ante rival inferior
    }

    // 2. Paridad Numérica
    if (context.numericalParity === 'INFERIORIDAD') {
      modifier += 0.3;
    } else if (context.numericalParity === 'SUPERIORIDAD') {
      modifier -= 0.1;
    }

    // 3. Local / Visitante
    if (context.location === 'FUERA') {
      modifier += 0.1;
    }

    const adjusted = Math.max(1, Math.min(5, Math.round((rawRating + modifier) * 10) / 10));
    return adjusted;
  }

  /**
   * Analyzes an array of observations and computes contextual difficulty and average.
   */
  public analyzeContextualImpact(observations: PerformanceObservationRecord[]): {
    rawAverage: number;
    contextualAverage: number;
    difficultyWeight: number;
    contextualInsights: string[];
  } {
    if (observations.length === 0) {
      return { rawAverage: 0, contextualAverage: 0, difficultyWeight: 1.0, contextualInsights: [] };
    }

    const rawScores = observations.map(o => o.value);
    const rawAvg = Math.round((rawScores.reduce((a, b) => a + b, 0) / rawScores.length) * 10) / 10;

    const adjustedScores = observations.map(o => this.calculateContextualRating(o.value, o.context));
    const contextualAvg = Math.round((adjustedScores.reduce((a, b) => a + b, 0) / adjustedScores.length) * 10) / 10;

    const insights: string[] = [];
    const highOpponentCount = observations.filter(o => o.context.opponentStrength === 'ALTO').length;
    if (highOpponentCount >= observations.length / 2) {
      insights.push(`Muestra con alta exigencia competitiva (${highOpponentCount}/${observations.length} partidos contra rivales fuertes).`);
    }

    const awayCount = observations.filter(o => o.context.location === 'FUERA').length;
    if (awayCount >= observations.length / 2) {
      insights.push(`Predominio de partidos fuera de casa (${awayCount}/${observations.length}).`);
    }

    return {
      rawAverage: rawAvg,
      contextualAverage: contextualAvg,
      difficultyWeight: Math.round((contextualAvg / (rawAvg || 1)) * 100) / 100,
      contextualInsights: insights
    };
  }
}
