/**
 * Motor Determinista de Evolución Metodológica e Inteligencia Adaptativa v1.0
 * Antigravity Methodology OS - Fase 6.4
 *
 * Separa de forma estricta:
 * OBSERVACIÓN -> INTERPRETACIÓN -> PROPUESTA -> DECISIÓN (Humana Soberana)
 */

function classifyEvidenceLevel(sampleSize) {
  if (!sampleSize || sampleSize < 3) return "INSUFICIENTE";
  if (sampleSize < 6) return "LIMITADA";
  if (sampleSize < 12) return "MODERADA";
  return "ROBUSTA";
}

function analyzeAdaptiveEvolution(params) {
  const { teamReports = [], thresholdMinSample = 3 } = params;

  const trends = [];
  const deviations = [];
  const recurrentPatterns = [];
  const opportunities = [];
  const proposals = [];

  teamReports.forEach((report) => {
    const team = report.team || { id: "unknown", name: "Equipo Desconocido" };
    const summary = report.summary || {};
    const evaluatedCount = summary.evaluatedSessions || 0;
    const evidenceLevel = classifyEvidenceLevel(evaluatedCount);

    // 1. Detección de Desviaciones (Planificado vs Ejecutado)
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

    // 2. Tendencias (Regla N < 3 protegida)
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
      // Muestra >= 3: Análisis de tendencias
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

    // 3. Patrones Recurrentes
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

    // 4. Oportunidades y Propuestas Adaptativas
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

module.exports = {
  classifyEvidenceLevel,
  analyzeAdaptiveEvolution
};
