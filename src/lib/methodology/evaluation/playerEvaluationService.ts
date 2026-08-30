import crypto from "crypto";
import { 
  PlayerEvaluationRecord, 
  CreateEvaluationInput 
} from "./types";
import { CompetencyMatrixService } from "./competencyMatrixService";

export class PlayerEvaluationService {
  private static instance: PlayerEvaluationService;
  private matrixService = CompetencyMatrixService.getInstance();
  private evaluationStore: Map<string, PlayerEvaluationRecord> = new Map();

  private constructor() {}

  public static getInstance(): PlayerEvaluationService {
    if (!PlayerEvaluationService.instance) {
      PlayerEvaluationService.instance = new PlayerEvaluationService();
    }
    return PlayerEvaluationService.instance;
  }

  /**
   * Resets local evaluation store (useful for clean test environments).
   */
  public resetStore(): void {
    this.evaluationStore.clear();
  }

  /**
   * Validates and creates or updates a player evaluation record.
   * Enforces 1-5 integer score scale and deduplication.
   */
  public createEvaluation(input: CreateEvaluationInput): PlayerEvaluationRecord {
    // 1. Validar Rango de Puntuación (1 a 5)
    if (typeof input.score !== 'number' || isNaN(input.score) || input.score < 1 || input.score > 5) {
      throw new Error(`Puntuación inválida: ${input.score}. La evaluación debe situarse estrictamente en la escala 1 a 5.`);
    }

    // 2. Validar Existencia de Competencia
    const comp = this.matrixService.getCompetency(input.competencyId);
    if (!comp) {
      throw new Error(`Competencia no reconocida: "${input.competencyId}".`);
    }

    const evaluationDate = input.evaluationDate || new Date().toISOString().split('T')[0];

    // 3. Deduplicación por Clave Determinista (playerId + sessionId + competencyId + date)
    const sessionKey = input.sessionId ? `_sess_${input.sessionId}` : '';
    const deduplicationKey = `eval_${input.playerId}_${input.competencyId}_${evaluationDate}${sessionKey}`;

    const existing = this.evaluationStore.get(deduplicationKey);
    const now = new Date().toISOString();

    if (existing) {
      // Actualizar registro existente sin crear duplicado accidental
      const updated: PlayerEvaluationRecord = {
        ...existing,
        score: input.score,
        observation: input.observation !== undefined ? input.observation : existing.observation,
        evidenceContext: input.evidenceContext !== undefined ? input.evidenceContext : existing.evidenceContext,
        evaluatorId: input.evaluatorId || existing.evaluatorId,
        updatedAt: now
      };
      this.evaluationStore.set(deduplicationKey, updated);
      return updated;
    }

    // Crear nuevo registro
    const record: PlayerEvaluationRecord = {
      id: crypto.randomUUID ? crypto.randomUUID() : `eval-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      playerId: input.playerId,
      sessionId: input.sessionId || null,
      teamId: input.teamId || null,
      category: input.category,
      position: input.position,
      competencyId: comp.id,
      score: input.score,
      observation: input.observation || null,
      evidenceContext: input.evidenceContext || null,
      evaluatorId: input.evaluatorId || null,
      evaluationDate,
      createdAt: now,
      updatedAt: now
    };

    this.evaluationStore.set(deduplicationKey, record);
    return record;
  }

  /**
   * Batch creates multiple evaluations in a single transaction-like operation.
   */
  public batchCreateEvaluations(inputs: CreateEvaluationInput[]): PlayerEvaluationRecord[] {
    return inputs.map(input => this.createEvaluation(input));
  }

  /**
   * Retrieves all evaluation records for a specific player sorted chronologically.
   */
  public getEvaluationsByPlayer(playerId: string): PlayerEvaluationRecord[] {
    const list: PlayerEvaluationRecord[] = [];
    for (const record of this.evaluationStore.values()) {
      if (record.playerId === playerId) {
        list.push(record);
      }
    }
    return list.sort((a, b) => new Date(a.evaluationDate).getTime() - new Date(b.evaluationDate).getTime());
  }

  /**
   * Retrieves all evaluation records associated with a specific training session.
   */
  public getEvaluationsBySession(sessionId: string): PlayerEvaluationRecord[] {
    const list: PlayerEvaluationRecord[] = [];
    for (const record of this.evaluationStore.values()) {
      if (record.sessionId === sessionId) {
        list.push(record);
      }
    }
    return list;
  }

  /**
   * Retrieves all evaluation records for a team.
   */
  public getEvaluationsByTeam(teamId: string): PlayerEvaluationRecord[] {
    const list: PlayerEvaluationRecord[] = [];
    for (const record of this.evaluationStore.values()) {
      if (record.teamId === teamId) {
        list.push(record);
      }
    }
    return list;
  }
}
