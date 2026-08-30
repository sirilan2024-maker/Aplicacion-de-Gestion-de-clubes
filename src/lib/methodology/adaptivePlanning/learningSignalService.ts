import { 
  LearningSignal, 
  LearningSignalType 
} from "./types";
import { ConfidenceLevel, DecisionActionType } from "../performance/types";
import { CollectivePriorityLevel } from "../teamIntelligence/types";
import { PlanningMemoryService } from "./planningMemoryService";

export class LearningSignalService {
  private static instance: LearningSignalService;
  private memoryService = PlanningMemoryService.getInstance();

  private constructor() {}

  public static getInstance(): LearningSignalService {
    if (!LearningSignalService.instance) {
      LearningSignalService.instance = new LearningSignalService();
    }
    return LearningSignalService.instance;
  }

  /**
   * Evaluates and emits a learning signal for a specific tactical concept/competency.
   */
  public extractLearningSignal(params: {
    teamId: string;
    conceptName: string;
    competencyId: string;
    evaluationScore: number;
    performanceScore: number;
    sampleVolume: number;
    confidence: ConfidenceLevel;
    scoreDelta?: number;
  }): LearningSignal {
    const recentWorkCount = this.memoryService.getRecentWorkCount(params.teamId, params.competencyId, 28);

    let type: LearningSignalType = 'INSUFFICIENT_EVIDENCE';
    let action: DecisionActionType = 'NO_ACTION';
    let priority: CollectivePriorityLevel = 'LOW';
    let intensity: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    const evidence: string[] = [];

    // 1. Muestra insuficiente
    if (params.sampleVolume < 2) {
      type = 'INSUFFICIENT_EVIDENCE';
      action = 'NO_ACTION';
      priority = 'LOW';
      intensity = 'LOW';
      evidence.push('Muestra insuficiente de evaluaciones y observaciones competitivas (< 2).');
    }
    // 2. Cooldown anti-repetición excesiva si se trabajó muy recientemente (>= 2 veces en 14 días)
    else if (recentWorkCount >= 2 && params.evaluationScore >= 3.0) {
      type = 'RECENTLY_TRAINED_COOLDOWN';
      action = 'MONITOR';
      priority = 'LOW';
      intensity = 'MEDIUM';
      evidence.push(`Objetivo entrenado ${recentWorkCount} veces en los últimos 14 días. Se recomienda pausa de consolidación.`);
    }
    // 3. Contradicción formativa vs competitiva
    else if (params.evaluationScore >= 3.8 && params.performanceScore <= 2.7) {
      type = 'CONTRADICTION';
      action = 'REVIEW';
      priority = 'HIGH';
      intensity = 'HIGH';
      evidence.push(`Evaluación formativa alta (${params.evaluationScore}/5) pero bajo rendimiento en competición (${params.performanceScore}/5).`);
    }
    // 4. Mejora consolidada
    else if (params.evaluationScore >= 3.8 && params.performanceScore >= 3.8) {
      type = 'CONSOLIDATED_IMPROVEMENT';
      action = 'MAINTAIN';
      priority = 'LOW';
      intensity = 'HIGH';
      evidence.push(`Rendimiento consolidado y contrastado: Evaluación ${params.evaluationScore}/5 y Competición ${params.performanceScore}/5.`);
    }
    // 5. Problema persistente
    else if (params.evaluationScore <= 2.7 && params.performanceScore <= 2.7) {
      type = 'PERSISTENT_STRUGGLE';
      action = 'TRAIN';
      priority = params.evaluationScore <= 2.3 ? 'CRITICAL' : 'HIGH';
      intensity = 'HIGH';
      evidence.push(`Dificultad recurrente confirmada: Evaluación ${params.evaluationScore}/5 y Competición ${params.performanceScore}/5.`);
    }
    // 6. Caso intermedio o en monitorización
    else {
      type = 'STAGNANT_NEED';
      action = 'MONITOR';
      priority = 'MEDIUM';
      intensity = 'MEDIUM';
      evidence.push(`Nivel en desarrollo (${params.evaluationScore}/5 en evaluación, ${params.performanceScore}/5 en partido).`);
    }

    return {
      id: `sig_${params.teamId}_${params.competencyId}_${Date.now()}`,
      teamId: params.teamId,
      type,
      conceptName: params.conceptName,
      competencyId: params.competencyId,
      intensity,
      evidence,
      confidence: params.confidence,
      recommendedAction: action,
      effectivePriority: priority,
      date: new Date().toISOString().split('T')[0]
    };
  }
}
