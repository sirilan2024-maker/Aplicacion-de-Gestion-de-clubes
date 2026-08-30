import { SessionEffectivenessRating } from "./types";

export class SessionEffectivenessService {
  private static instance: SessionEffectivenessService;

  private constructor() {}

  public static getInstance(): SessionEffectivenessService {
    if (!SessionEffectivenessService.instance) {
      SessionEffectivenessService.instance = new SessionEffectivenessService();
    }
    return SessionEffectivenessService.instance;
  }

  /**
   * Evaluates effectiveness of a training intervention based on empirical delta.
   */
  public evaluateEffectiveness(
    preScore: number, 
    postScore?: number, 
    sampleCount = 1
  ): {
    rating: SessionEffectivenessRating;
    scoreDelta?: number;
    explanation: string;
  } {
    if (postScore === undefined || sampleCount < 1) {
      return {
        rating: 'INSUFFICIENT_DATA',
        explanation: 'Intervención registrada pendiente de nuevas observaciones y evaluaciones formativas.'
      };
    }

    const delta = Math.round((postScore - preScore) * 10) / 10;

    if (delta >= 0.4) {
      return {
        rating: 'EFFECTIVE',
        scoreDelta: delta,
        explanation: `Mejora significativa consolidada (${preScore} → ${postScore}, +${delta}). El objetivo muestra asimilación real.`
      };
    }

    if (delta >= 0.1) {
      return {
        rating: 'PARTIALLY_EFFECTIVE',
        scoreDelta: delta,
        explanation: `Mejora leve en desarrollo (${preScore} → ${postScore}, +${delta}). Se recomienda afianzar con transferencia competitiva.`
      };
    }

    return {
      rating: 'INEFFECTIVE',
      scoreDelta: delta,
      explanation: `Sin evidencia de mejora (${preScore} → ${postScore}, ${delta}). La dificultad persiste y requiere ajuste pedagógico.`
    };
  }
}
