import { 
  PlayerIntelligenceProfile, 
  TimelineEvent, 
  MethodologicalRisk 
} from "./types";
import { PlayerEvaluationService } from "../evaluation/playerEvaluationService";
import { PlayerProgressionService } from "../evaluation/playerProgressionService";
import { PerformanceAggregationService } from "../performance/performanceAggregationService";
import { PerformanceDecisionEngine } from "../performance/performanceDecisionEngine";
import { PlanningMemoryService } from "../adaptivePlanning/planningMemoryService";

export class PlayerIntelligenceService {
  private static instance: PlayerIntelligenceService;
  private evalService = PlayerEvaluationService.getInstance();
  private progressionService = PlayerProgressionService.getInstance();
  private perfService = PerformanceAggregationService.getInstance();
  private decisionEngine = PerformanceDecisionEngine.getInstance();
  private memoryService = PlanningMemoryService.getInstance();

  private constructor() {}

  public static getInstance(): PlayerIntelligenceService {
    if (!PlayerIntelligenceService.instance) {
      PlayerIntelligenceService.instance = new PlayerIntelligenceService();
    }
    return PlayerIntelligenceService.instance;
  }

  /**
   * Consolidates complete intelligence profile and factual timeline for a player.
   */
  public buildPlayerProfile(
    playerId: string, 
    teamId: string, 
    category: string, 
    position = "Desconocida"
  ): PlayerIntelligenceProfile {
    const evals = this.evalService.getEvaluationsByPlayer(playerId);
    const devProfile = this.progressionService.buildPlayerProfile(playerId);
    const perfSummary = this.perfService.aggregatePlayerPerformance(playerId, teamId);
    const decisions = this.decisionEngine.getDecisionsByTeam(teamId).filter(d => !d.playerId || d.playerId === playerId);
    const memoryHistory = this.memoryService.getMemoryHistoryByTeam(teamId);

    // Calcular media formativa
    const formativeAvg = devProfile.overallAverage > 0
      ? devProfile.overallAverage
      : (evals.length > 0 ? Math.round((evals.reduce((a, b) => a + b.score, 0) / evals.length) * 10) / 10 : 0);

    // Fortalezas y necesidades
    const strengths = evals.filter(e => e.score >= 4).map(e => e.competencyId);
    const needs = evals.filter(e => e.score <= 2).map(e => e.competencyId);

    // Construir línea temporal explicable
    const timeline: TimelineEvent[] = [];

    // Pasado: Evaluaciones registradas
    for (const ev of evals) {
      timeline.push({
        id: `tl_eval_${ev.id}`,
        date: ev.evaluationDate,
        phase: 'PASADO',
        eventType: 'EVALUATION',
        title: `Evaluación Formativa (${ev.competencyId})`,
        description: `Puntuación obtenida: ${ev.score}/5. ${ev.observation || ''}`,
        competencyId: ev.competencyId,
        score: ev.score
      });
    }

    // Resultado: Sesiones entrenadas
    for (const mem of memoryHistory) {
      timeline.push({
        id: `tl_mem_${mem.id}`,
        date: mem.sessionDate,
        phase: 'RESULTADO',
        eventType: 'SESSION',
        title: `Sesión de Entrenamiento: ${mem.conceptName}`,
        description: `Efectividad evaluada: ${mem.effectiveness} (Delta: ${mem.scoreDelta ?? 'N/A'})`,
        competencyId: mem.competencyId,
        effectiveness: mem.effectiveness
      });
    }

    // Presente: Decisiones activas
    for (const dec of decisions) {
      timeline.push({
        id: `tl_dec_${dec.id}`,
        date: dec.createdAt.split('T')[0],
        phase: 'PRESENTE',
        eventType: 'DECISION',
        title: dec.title,
        description: dec.recommendation,
        decisionAction: dec.action
      });
    }

    // Ordenar timeline por fecha ascendente
    timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Identificar riesgos individuales
    const risks: MethodologicalRisk[] = [];
    if (formativeAvg > 0 && perfSummary.averageTacticalRating > 0 && formativeAvg >= 3.8 && perfSummary.averageTacticalRating <= 2.7) {
      risks.push({
        id: `risk_player_contra_${playerId}`,
        type: 'CONTRADICTION_RISK',
        severity: 'MEDIUM',
        title: 'Discrepancia Rendimiento vs Evaluación',
        description: `El jugador promedia ${formativeAvg}/5 en rúbrica formativa pero ${perfSummary.averageTacticalRating}/5 en partidos competitivos.`,
        entityType: 'PLAYER',
        entityId: playerId,
        evidence: [`Formativa: ${formativeAvg}/5`, `Competitiva: ${perfSummary.averageTacticalRating}/5`],
        suggestedMitigation: 'Revisar rol táctico, exigencia de rivales y minutos disputados.',
        detectedAt: new Date().toISOString()
      });
    }

    return {
      playerId,
      teamId,
      category,
      position,
      overallFormativeAverage: formativeAvg,
      overallCompetitiveRating: perfSummary.averageTacticalRating,
      trend: perfSummary.trend || 'INSUFFICIENT_DATA',
      topStrengths: Array.from(new Set(strengths)),
      topNeeds: Array.from(new Set(needs)),
      activeDecisions: decisions,
      recentEffectiveness: memoryHistory.length > 0 ? memoryHistory[memoryHistory.length - 1].effectiveness : 'INSUFFICIENT_DATA',
      timeline,
      identifiedRisks: risks
    };
  }
}
