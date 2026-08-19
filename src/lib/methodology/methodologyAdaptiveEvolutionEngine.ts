/**
 * Motor Determinista de Evolución Metodológica e Inteligencia Adaptativa v1.0 (TS)
 * Antigravity Methodology OS - Fase 6.4
 */

import { SeasonMethodologyReport } from "./seasonMethodologyReportService";

export type EvidenceLevel = "INSUFICIENTE" | "LIMITADA" | "MODERADA" | "ROBUSTA";

export interface MethodologicalTrend {
  id: string;
  teamId: string;
  teamName: string;
  type: "POSITIVA" | "ESTABLE" | "DESACELERACION" | "INSUFICIENTE";
  sampleSize: number;
  evidenceLevel: EvidenceLevel;
  observation: string;
  interpretation?: string;
}

export interface MethodologicalDeviation {
  id: string;
  teamId: string;
  teamName: string;
  metric: string;
  planned: number;
  executed: number;
  rate: number;
  evidenceLevel: EvidenceLevel;
  observation: string;
  interpretation: string;
}

export interface MethodologicalProposal {
  proposal_id: string;
  tipo: string;
  titulo: string;
  equipoId: string;
  equipoNombre: string;
  observacion: string;
  evidencia: string;
  interpretacion: string;
  impacto_potencial: "BAJO" | "MEDIO" | "ALTO";
  prioridad: number;
  confianza: number;
  alcance: "EQUIPO" | "ETAPA" | "CLUB";
  reversibilidad: "ALTA" | "MEDIA" | "BAJA";
  riesgos: string;
  justificacion: string;
}

export interface AdaptiveEvolutionAnalysisResult {
  trends: MethodologicalTrend[];
  deviations: MethodologicalDeviation[];
  recurrentPatterns: any[];
  opportunities: any[];
  proposals: MethodologicalProposal[];
  summaryStats: {
    totalTeamsAnalyzed: number;
    totalTrendsDetected: number;
    totalDeviations: number;
    totalProposals: number;
  };
}

export function classifyEvidenceLevel(sampleSize: number): EvidenceLevel {
  if (!sampleSize || sampleSize < 3) return "INSUFICIENTE";
  if (sampleSize < 6) return "LIMITADA";
  if (sampleSize < 12) return "MODERADA";
  return "ROBUSTA";
}

export function analyzeAdaptiveEvolution(params: {
  teamReports: SeasonMethodologyReport[];
  thresholdMinSample?: number;
}): AdaptiveEvolutionAnalysisResult {
  const { teamReports = [], thresholdMinSample = 3 } = params;

  const trends: MethodologicalTrend[] = [];
  const deviations: MethodologicalDeviation[] = [];
  const recurrentPatterns: any[] = [];
  const opportunities: any[] = [];
  const proposals: MethodologicalProposal[] = [];

  teamReports.forEach((report) => {
    const team = report.team || { id: "unknown", name: "Equipo Desconocido" };
    const summary = report.summary || ({} as any);
    const evaluatedCount = summary.evaluatedSessions || 0;
    const evidenceLevel = classifyEvidenceLevel(evaluatedCount);

    if (summary.plannedSessions > 0) {
      const completionRate = (summary.completedSessions / summary.plannedSessions) * 100;
      if (completionRate < 80) {
        deviations.push({
          id: `dev-${team.id}-completion`,
          teamId: team.id,
          teamName: team.name,
          metric: "Tasa de Finalización de Sesiones",
          planned: summary.plannedSessions,
          executed: summary.completedSessions,
          rate: Number(completionRate.toFixed(1)),
          evidenceLevel,
          observation: `${team.name} ha ejecutado ${summary.completedSessions} de ${summary.plannedSessions} sesiones planificadas (${completionRate.toFixed(1)}%).`,
          interpretation: "Posible sobrecarga de calendario o desajuste logístico en la ejecución operativa."
        });
      }
    }

    if (evaluatedCount < thresholdMinSample) {
      trends.push({
        id: `trend-${team.id}-insufficient`,
        teamId: team.id,
        teamName: team.name,
        type: "INSUFICIENTE",
        sampleSize: evaluatedCount,
        evidenceLevel: "INSUFICIENTE",
        observation: `Muestra insuficiente (${evaluatedCount} sesiones). Bloqueada la inferencia de tendencias estadísticas.`
      });
    } else {
      if (summary.avgObjectiveAchievement >= 3.2) {
        trends.push({
          id: `trend-${team.id}-positive`,
          teamId: team.id,
          teamName: team.name,
          type: "POSITIVA",
          sampleSize: evaluatedCount,
          evidenceLevel,
          observation: `Consecución táctica media elevada (${summary.avgObjectiveAchievement.toFixed(2)}/4) sostenida durante ${evaluatedCount} sesiones.`,
          interpretation: "Asimilación pedagógica sólida de los principios trabajados."
        });
      } else if (summary.avgObjectiveAchievement < 2.3) {
        trends.push({
          id: `trend-${team.id}-declining`,
          teamId: team.id,
          teamName: team.name,
          type: "DESACELERACION",
          sampleSize: evaluatedCount,
          evidenceLevel,
          observation: `Consecución táctica baja (${summary.avgObjectiveAchievement.toFixed(2)}/4) en ${evaluatedCount} sesiones evaluadas.`,
          interpretation: "Dificultad de transferencia o exceso de complejidad en las tareas propuestas."
        });
      }
    }

    if (summary.decliningBehavioursCount && summary.decliningBehavioursCount >= 2 && evaluatedCount >= 3) {
      recurrentPatterns.push({
        id: `pat-${team.id}-declining-behaviours`,
        teamId: team.id,
        teamName: team.name,
        patternType: "DETERIORO_CONDUCTUAL_RECURRENTE",
        sampleSize: evaluatedCount,
        evidenceLevel,
        observation: `${summary.decliningBehavioursCount} conductas observables muestran descenso sostenido.`,
        interpretation: "Fatiga táctica o necesidad de modular la carga cognitiva en microciclo."
      });
    }

    if (summary.modelCoveragePercentage && summary.modelCoveragePercentage < 50 && evaluatedCount >= 3) {
      opportunities.push({
        id: `opp-${team.id}-coverage`,
        teamId: team.id,
        teamName: team.name,
        focus: "Expansión del Currículo",
        evidenceLevel,
        observation: `Cobertura del modelo de juego al ${summary.modelCoveragePercentage.toFixed(0)}%.`,
        interpretation: "Existe margen para introducir nuevos principios en las fases de transición y ABP."
      });

      proposals.push({
        proposal_id: `prop-${team.id}-curriculum-expansion`,
        tipo: "AJUSTE_CONTENIDO_MICROCICLO",
        titulo: `Planificar principios de transición para ${team.name}`,
        equipoId: team.id,
        equipoNombre: team.name,
        observacion: `Baja cobertura curricular (${summary.modelCoveragePercentage.toFixed(0)}%) con muestra de ${evaluatedCount} sesiones.`,
        evidencia: `N=${evaluatedCount} sesiones evaluadas, Cobertura=${summary.modelCoveragePercentage.toFixed(0)}%`,
        interpretacion: "El equipo concentra las sesiones en salida de balón dejando desatendidas las transiciones defensivas.",
        impacto_potencial: "ALTO",
        prioridad: 1,
        confianza: evidenceLevel === "ROBUSTA" ? 0.9 : 0.75,
        alcance: "EQUIPO",
        reversibilidad: "ALTA",
        riesgos: "Bajo riesgo formativo. Requiere coordinación con cuerpo técnico.",
        justificacion: "Garantizar el cumplimiento del modelo metodológico institucional."
      });
    }
  });

  return {
    trends,
    deviations,
    recurrentPatterns,
    opportunities,
    proposals,
    summaryStats: {
      totalTeamsAnalyzed: teamReports.length,
      totalTrendsDetected: trends.length,
      totalDeviations: deviations.length,
      totalProposals: proposals.length
    }
  };
}
