import { 
  DevelopmentInsight, 
  PlanningFocusRecommendation, 
  PlayerDevelopmentProfile 
} from "./types";
import { PlayerProgressionService } from "./playerProgressionService";
import { CompetencyMatrixService } from "./competencyMatrixService";

export class PlayerDevelopmentInsightService {
  private static instance: PlayerDevelopmentInsightService;
  private progressionService = PlayerProgressionService.getInstance();
  private matrixService = CompetencyMatrixService.getInstance();

  private constructor() {}

  public static getInstance(): PlayerDevelopmentInsightService {
    if (!PlayerDevelopmentInsightService.instance) {
      PlayerDevelopmentInsightService.instance = new PlayerDevelopmentInsightService();
    }
    return PlayerDevelopmentInsightService.instance;
  }

  /**
   * Discovers strengths and areas for improvement for a specific player.
   */
  public discoverInsights(playerId: string): { strengths: DevelopmentInsight[]; areasForImprovement: DevelopmentInsight[] } {
    const profile = this.progressionService.buildPlayerProfile(playerId);
    const strengths: DevelopmentInsight[] = [];
    const areasForImprovement: DevelopmentInsight[] = [];

    const allSummaries = Object.values(profile.areas).flatMap(a => a.competencies);

    for (const s of allSummaries) {
      // 1. Detección de Fortalezas
      if (s.currentScore >= 4 || (s.historicalAverage >= 3.8 && s.evaluationsCount >= 2 && s.trend !== 'DECLINING')) {
        let reason = `Rendimiento sobresaliente (${s.currentScore}/5)`;
        if (s.trend === 'IMPROVING') {
          reason += ` con progresión ascendente (+${s.scoreDelta ?? 0.5}) en ${s.evaluationsCount} evaluaciones`;
        } else if (s.evaluationsCount >= 2) {
          reason += ` consolidado en ${s.evaluationsCount} evaluaciones (media ${s.historicalAverage}/5)`;
        }
        strengths.push({
          competencyId: s.competencyId,
          competencyName: s.competencyName,
          area: s.area,
          currentScore: s.currentScore,
          historicalAverage: s.historicalAverage,
          trend: s.trend,
          evaluationsCount: s.evaluationsCount,
          reason
        });
      }

      // 2. Detección de Áreas de Mejora
      if (s.currentScore <= 2 || (s.historicalAverage <= 2.5 && s.evaluationsCount >= 2) || s.trend === 'DECLINING') {
        let reason = `Puntuación baja (${s.currentScore}/5)`;
        if (s.trend === 'DECLINING') {
          reason = `Tendencia descendente (${s.previousScore} → ${s.currentScore}) en las últimas evaluaciones`;
        } else if (s.evaluationsCount >= 2) {
          reason = `Estancamiento en nivel de desarrollo (media ${s.historicalAverage}/5 en ${s.evaluationsCount} evaluaciones)`;
        }
        areasForImprovement.push({
          competencyId: s.competencyId,
          competencyName: s.competencyName,
          area: s.area,
          currentScore: s.currentScore,
          historicalAverage: s.historicalAverage,
          trend: s.trend,
          evaluationsCount: s.evaluationsCount,
          reason
        });
      }
    }

    return { strengths, areasForImprovement };
  }

  /**
   * Generates prioritized team planning focus recommendations based on aggregated player evaluation needs.
   * Directly compatible with Module 2 Planning Engine.
   */
  public generateTeamPlanningFocus(playerIds: string[]): PlanningFocusRecommendation[] {
    const needCounts: Map<string, { count: number; players: string[] }> = new Map();

    for (const pid of playerIds) {
      const { areasForImprovement } = this.discoverInsights(pid);
      for (const area of areasForImprovement) {
        const current = needCounts.get(area.competencyId) || { count: 0, players: [] };
        current.count++;
        current.players.push(pid);
        needCounts.set(area.competencyId, current);
      }
    }

    const recommendations: PlanningFocusRecommendation[] = [];

    // Mapeo metodológico de competencias evaluadas a conceptos tácticos del Módulo 2
    const conceptMap: Record<string, string> = {
      'tac_transicion_defensiva': 'Presión tras pérdida y transición defensiva',
      'tac_salida_balon': 'Salida de balón e iniciación del juego',
      'tac_presion': 'Presión alta y saltos de acoso',
      'tac_toma_decisiones': 'Conservación y toma de decisiones en espacios reducidos',
      'tec_pase': 'Rondos y precisión de circulación',
      'tec_control': 'Control orientado y juego posicional',
      'tec_finalizacion': 'Finalización rápida y remate en área'
    };

    for (const [compId, data] of needCounts.entries()) {
      const comp = this.matrixService.getCompetency(compId);
      const tacticalConcept = conceptMap[compId] || (comp?.name ? `Desarrollo de ${comp.name}` : compId);
      const priority: 'ALTA' | 'MEDIA' | 'BAJA' = data.count >= 3 ? 'ALTA' : (data.count >= 2 ? 'MEDIA' : 'BAJA');

      recommendations.push({
        tacticalConcept,
        relatedCompetencyIds: [compId],
        priority,
        rationale: `Detectada necesidad de refuerzo en ${data.count} jugador(es) del grupo.`,
        targetedPlayersCount: data.count,
        playerNamesOrIds: data.players
      });
    }

    return recommendations.sort((a, b) => b.targetedPlayersCount - a.targetedPlayersCount);
  }
}
