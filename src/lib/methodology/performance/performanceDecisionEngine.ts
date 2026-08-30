import crypto from "crypto";
import { 
  PerformanceDecision, 
  DiagnosticContrastCategory, 
  DecisionActionType, 
  ConfidenceLevel 
} from "./types";
import { CollectivePriorityLevel } from "../teamIntelligence/types";

export class PerformanceDecisionEngine {
  private static instance: PerformanceDecisionEngine;
  private decisionsStore: Map<string, PerformanceDecision[]> = new Map();

  private constructor() {}

  public static getInstance(): PerformanceDecisionEngine {
    if (!PerformanceDecisionEngine.instance) {
      PerformanceDecisionEngine.instance = new PerformanceDecisionEngine();
    }
    return PerformanceDecisionEngine.instance;
  }

  public resetStore(): void {
    this.decisionsStore.clear();
  }

  /**
   * Deterministically calculates diagnostic contrast between formative evaluation and competitive performance.
   */
  public evaluateDiagnosticContrast(
    evaluationScore: number, 
    performanceScore: number, 
    sampleCount: number
  ): DiagnosticContrastCategory {
    if (sampleCount < 2) {
      return 'INSUFFICIENT_DATA';
    }

    if (evaluationScore <= 2.7 && performanceScore <= 2.7) {
      return 'CONFIRMED_NEED';
    }
    if (evaluationScore <= 2.7 && performanceScore > 2.7) {
      return 'MONITOR';
    }
    if (evaluationScore >= 3.8 && performanceScore <= 2.7) {
      return 'CONTEXT_REVIEW';
    }
    if (evaluationScore >= 3.8 && performanceScore >= 3.8) {
      return 'STRENGTH_CONFIRMED';
    }

    // Caso intermedio
    return performanceScore < 3.0 ? 'MONITOR' : 'STRENGTH_CONFIRMED';
  }

  /**
   * Quantifies confidence score (0.0 to 1.0) and maps to discrete ConfidenceLevel.
   */
  public calculateConfidence(sampleVolume: number, daysSinceLastObs: number, isConcordant: boolean): {
    score: number;
    level: ConfidenceLevel;
  } {
    let score = 0.1;

    // Volumen de muestra
    if (sampleVolume >= 5) score += 0.45;
    else if (sampleVolume >= 3) score += 0.35;
    else if (sampleVolume >= 2) score += 0.20;
    else score += 0.05;

    // Frescura temporal
    if (daysSinceLastObs <= 7) score += 0.25;
    else if (daysSinceLastObs <= 21) score += 0.15;
    else score += 0.05;

    // Concordancia de fuentes
    if (isConcordant) score += 0.20;

    score = Math.min(1.0, Math.round(score * 100) / 100);

    let level: ConfidenceLevel = 'VERY_LOW';
    if (score >= 0.85) level = 'VERY_HIGH';
    else if (score >= 0.70) level = 'HIGH';
    else if (score >= 0.50) level = 'MEDIUM';
    else if (score >= 0.30) level = 'LOW';

    return { score, level };
  }

  /**
   * Generates an actionable, structured and fully explainable decision.
   */
  public generateDecision(params: {
    teamId: string;
    playerId?: string | null;
    conceptName: string;
    evaluationScore: number;
    performanceScore: number;
    sampleVolume: number;
    daysSinceLastObs?: number;
    contextNotes?: string;
  }): PerformanceDecision {
    const contrast = this.evaluateDiagnosticContrast(
      params.evaluationScore, 
      params.performanceScore, 
      params.sampleVolume
    );

    const isConcordant = (params.evaluationScore <= 2.7 && params.performanceScore <= 2.7) ||
                         (params.evaluationScore >= 3.8 && params.performanceScore >= 3.8);

    const { score: confScore, level: confLevel } = this.calculateConfidence(
      params.sampleVolume, 
      params.daysSinceLastObs || 5, 
      isConcordant
    );

    let action: DecisionActionType = 'NO_ACTION';
    let priority: CollectivePriorityLevel = 'LOW';
    let problem = '';
    let recommendation = '';
    const evidence: string[] = [
      `Evaluación formativa previa: ${params.evaluationScore}/5`,
      `Rendimiento competitivo observado: ${params.performanceScore}/5 (Muestra: ${params.sampleVolume} eventos)`,
      `Nivel de confianza: ${confLevel} (${confScore})`
    ];

    if (contrast === 'CONFIRMED_NEED') {
      action = 'TRAIN';
      priority = params.evaluationScore <= 2.3 ? 'CRITICAL' : 'HIGH';
      problem = `Dificultad crítica confirmada en "${params.conceptName}".`;
      recommendation = `Programar intervención metodológica prioritaria en las sesiones del siguiente microciclo.`;
    } else if (contrast === 'MONITOR') {
      action = 'MONITOR';
      priority = 'MEDIUM';
      problem = `Señal de alerta moderada en "${params.conceptName}".`;
      recommendation = `Mantener observación competitiva continua sin modificar la carga principal de entrenamiento.`;
    } else if (contrast === 'CONTEXT_REVIEW') {
      action = 'REVIEW';
      priority = 'HIGH';
      problem = `Discrepancia entre evaluación formativa (${params.evaluationScore}/5) y rendimiento en partido (${params.performanceScore}/5) en "${params.conceptName}".`;
      recommendation = `Revisar factores contextuales (dificultad del rival, minutos jugados o planteamiento táctico) antes de intervenir.`;
    } else if (contrast === 'STRENGTH_CONFIRMED') {
      action = 'MAINTAIN';
      priority = 'LOW';
      problem = `Rendimiento consolidado en "${params.conceptName}".`;
      recommendation = `Mantener en fase de transferencia/competición sin necesidad de refuerzo analítico.`;
    } else {
      action = 'NO_ACTION';
      priority = 'LOW';
      problem = `Datos insuficientes para "${params.conceptName}".`;
      recommendation = `Recoger más observaciones competitivas y evaluaciones formativas antes de emitir directriz.`;
    }

    if (params.contextNotes) {
      evidence.push(`Contexto: ${params.contextNotes}`);
    }

    const decision: PerformanceDecision = {
      id: `dec_${params.teamId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      teamId: params.teamId,
      playerId: params.playerId,
      title: `Decisión Metodológica: ${params.conceptName}`,
      action,
      contrastCategory: contrast,
      problem,
      evidence,
      recommendation,
      priority,
      confidenceScore: confScore,
      confidenceLevel: confLevel,
      metricsUsed: ['evaluationScore', 'performanceScore', 'sampleVolume'],
      suggestedTrainingObjective: action === 'TRAIN' ? params.conceptName : undefined,
      createdAt: new Date().toISOString()
    };

    // Registrar en histórico
    const list = this.decisionsStore.get(params.teamId) || [];
    list.push(decision);
    this.decisionsStore.set(params.teamId, list);

    return decision;
  }

  public getDecisionsByTeam(teamId: string): PerformanceDecision[] {
    return this.decisionsStore.get(teamId) || [];
  }
}
