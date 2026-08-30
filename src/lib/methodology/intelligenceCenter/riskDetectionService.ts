import { 
  MethodologicalRisk, 
  RiskSeverity, 
  MethodologicalRiskType 
} from "./types";
import { PlanningMemoryService } from "../adaptivePlanning/planningMemoryService";
import { AdaptivePlanRecommendation } from "../adaptivePlanning/types";

export class RiskDetectionService {
  private static instance: RiskDetectionService;
  private memoryService = PlanningMemoryService.getInstance();

  private constructor() {}

  public static getInstance(): RiskDetectionService {
    if (!RiskDetectionService.instance) {
      RiskDetectionService.instance = new RiskDetectionService();
    }
    return RiskDetectionService.instance;
  }

  /**
   * Scans team and planning state to detect operational and pedagogical risks.
   */
  public detectRisks(params: {
    teamId: string;
    totalSquadCount: number;
    evaluatedCount: number;
    activeRecommendations: AdaptivePlanRecommendation[];
    competencyPerformanceList: Array<{
      competencyId: string;
      competencyName: string;
      evalScore: number;
      perfScore: number;
      sampleCount: number;
    }>;
  }): MethodologicalRisk[] {
    const risks: MethodologicalRisk[] = [];
    const memoryHistory = this.memoryService.getMemoryHistoryByTeam(params.teamId);

    // 1. Riesgo de Cobertura / Muestra Escasa
    if (params.totalSquadCount > 0) {
      const coveragePct = (params.evaluatedCount / params.totalSquadCount) * 100;
      if (coveragePct < 40) {
        risks.push({
          id: `risk_cov_${params.teamId}_${Date.now()}`,
          type: 'INSUFFICIENT_SAMPLE_RISK',
          severity: 'MEDIUM',
          title: 'Cobertura de Evaluación Insuficiente',
          description: `Solo el ${Math.round(coveragePct)}% de la plantilla (${params.evaluatedCount}/${params.totalSquadCount}) dispone de evaluación formativa.`,
          entityType: 'TEAM',
          entityId: params.teamId,
          evidence: [`Plantilla total: ${params.totalSquadCount}`, `Evaluados: ${params.evaluatedCount}`],
          suggestedMitigation: 'Completar la rúbrica formativa de los jugadores pendientes antes de cerrar el siguiente microciclo.',
          detectedAt: new Date().toISOString()
        });
      }
    }

    // 2. Riesgo por Necesidad Crítica No Atendida
    const criticalRecs = params.activeRecommendations.filter(r => r.priority === 'CRITICAL');
    for (const crit of criticalRecs) {
      const hasSession = memoryHistory.some(m => m.conceptName.toLowerCase().includes(crit.primaryObjective.toLowerCase()));
      if (!hasSession) {
        risks.push({
          id: `risk_unadd_${params.teamId}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
          type: 'UNADDRESSED_CRITICAL_NEED',
          severity: 'CRITICAL',
          title: `Necesidad Crítica Desatendida: ${crit.primaryObjective}`,
          description: `El objetivo "${crit.primaryObjective}" está clasificado como CRÍTICO pero no cuenta con sesiones registradas.`,
          entityType: 'PLANNING',
          entityId: params.teamId,
          evidence: crit.evidence,
          suggestedMitigation: `Priorizar una sesión inmediata con SessionPlannerService para "${crit.primaryObjective}".`,
          detectedAt: new Date().toISOString()
        });
      }
    }

    // 3. Riesgo por Repetición Excesiva (Sobreentrenamiento / Falta de Variabilidad)
    for (const rec of params.activeRecommendations) {
      const recentSessions = this.memoryService.getRecentWorkCount(params.teamId, rec.primaryObjective, 21);
      if (recentSessions >= 3) {
        risks.push({
          id: `risk_rep_${params.teamId}_${Date.now()}`,
          type: 'EXCESSIVE_REPETITION_RISK',
          severity: 'HIGH',
          title: `Riesgo de Sobreentrenamiento: ${rec.primaryObjective}`,
          description: `Se han registrado ${recentSessions} sesiones sobre "${rec.primaryObjective}" en los últimos 21 días.`,
          entityType: 'PLANNING',
          entityId: params.teamId,
          evidence: [`Sesiones recientes en 21 días: ${recentSessions}`],
          suggestedMitigation: 'Pausar el trabajo analítico de este concepto y activar fase de transferencia competitiva o cambio de bloque.',
          detectedAt: new Date().toISOString()
        });
      }
    }

    // 4. Riesgo por Intervención Sin Mejora (Ineffective)
    const ineffectiveMemories = memoryHistory.filter(m => m.effectiveness === 'INEFFECTIVE');
    if (ineffectiveMemories.length >= 2) {
      risks.push({
        id: `risk_ineff_${params.teamId}_${Date.now()}`,
        type: 'INTERVENTION_WITHOUT_IMPROVEMENT',
        severity: 'HIGH',
        title: 'Intervenciones Metodológicas Sin Impacto Comprobado',
        description: `Se han detectado ${ineffectiveMemories.length} sesiones cuyo resultado posterior no mostró mejora en la rúbrica formativa.`,
        entityType: 'PLANNING',
        entityId: params.teamId,
        evidence: ineffectiveMemories.map(m => `Sesión ${m.sessionId} (${m.conceptName}): Delta = ${m.scoreDelta ?? 0}`),
        suggestedMitigation: 'Revisar la complejidad de las tareas, la representatividad y las consignas del cuerpo técnico.',
        detectedAt: new Date().toISOString()
      });
    }

    // 5. Riesgo por Contradicción Formativa vs Competición
    for (const comp of params.competencyPerformanceList) {
      if (comp.evalScore >= 3.8 && comp.perfScore <= 2.7 && comp.sampleCount >= 2) {
        risks.push({
          id: `risk_contra_${params.teamId}_${comp.competencyId}`,
          type: 'CONTRADICTION_RISK',
          severity: 'MEDIUM',
          title: `Contradicción en ${comp.competencyName}`,
          description: `Evaluación formativa alta (${comp.evalScore}/5) pero bajo rendimiento en partido oficial (${comp.perfScore}/5).`,
          entityType: 'TEAM',
          entityId: params.teamId,
          competencyId: comp.competencyId,
          evidence: [`Evaluación formativa: ${comp.evalScore}/5`, `Rendimiento competitivo: ${comp.perfScore}/5`],
          suggestedMitigation: 'Evaluar factores contextuales (oposición, estrés competitivo, posición asignada) antes de reprogramar analíticamente.',
          detectedAt: new Date().toISOString()
        });
      }
    }

    return risks;
  }
}
