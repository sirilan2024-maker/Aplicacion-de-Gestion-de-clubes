/**
 * Servicio de Feedback Metodológico Post-Sesión con IA v1.0 (JS & TS)
 * Antigravity Methodology OS - Fase 5.4
 */

const { calculatePlannedVsExecutedFeedback } = require("../sessionExecutionFeedbackService");
const { buildSessionActionProposal, buildMicrocycleActionProposal } = require("./methodologyAIActionService");

function generatePostSessionFeedback(params) {
  const { session, evaluation, attendance = [], history = [] } = params;

  const comparison = calculatePlannedVsExecutedFeedback({ session, evaluation, attendance });
  const sampleSize = history.length + (evaluation ? 1 : 0);
  const isInsufficient = sampleSize < 3;

  const facts = [
    `Sesión: ${session.objective || 'Sin objetivo principal'} (${session.microcycleDay || 'MD'}).`,
    `Duración: ${comparison.executed.actualDurationMin} min ejecutados vs ${comparison.planned.durationMinutes} min planificados (Desviación: ${comparison.deviations.durationDiffMin >= 0 ? '+' : ''}${comparison.deviations.durationDiffMin} min).`
  ];

  if (comparison.executed.sessionRpe !== null) {
    facts.push(`Carga percibida (RPE): ${comparison.executed.sessionRpe}/10. Consecución pedagógica: ${comparison.executed.objectiveAchievement !== null ? comparison.executed.objectiveAchievement.toFixed(1) + '/4.0' : 'No registrada'}.`);
  }

  const interpretations = [];
  const recommendations = [];
  const actionProposals = [];

  if (!comparison.dataQuality.isEvaluated) {
    interpretations.push("La sesión aún no cuenta con evaluación cuantitativa registrada por el cuerpo técnico.");
    recommendations.push("Completar la evaluación pedagógica y registro de RPE para habilitar el diagnóstico formativo.");
  } else {
    if (comparison.deviations.isDurationDeviationSevere) {
      interpretations.push(`Desviación temporal severa (${Math.abs(comparison.deviations.durationDiffMin)} min). Puede comprometer la planificación del microciclo.`);
      recommendations.push("Revisar los tiempos asignados a las tareas en el constructor de sesiones para optimizar la gestión del tiempo.");
    }

    if (comparison.deviations.isRpeExcessive) {
      interpretations.push(`RPE elevado (${comparison.executed.sessionRpe}/10) registrado para la jornada ${comparison.planned.microcycleDay}.`);
      recommendations.push("Modular la carga a la baja en la siguiente jornada de entrenamiento para prevenir sobrecarga física.");
      actionProposals.push(buildMicrocycleActionProposal({
        type: 'adjust_microcycle_day',
        title: 'Ajustar carga de siguiente jornada',
        rationale: `RPE elevado (${comparison.executed.sessionRpe}/10) en la sesión anterior.`,
        evidence: [{ metric: 'RPE', value: comparison.executed.sessionRpe, reference: session.objective }],
        target: { microcycleDay: 'MD-2' },
        proposedChanges: { modificationsSummary: ['Reducir intensidad a Media/Baja', 'Limitar duración a 60 min'] }
      }));
    }

    if (comparison.executed.objectiveAchievement !== null && comparison.executed.objectiveAchievement < 2.2) {
      interpretations.push(`Consecución baja del objetivo formativo (${comparison.executed.objectiveAchievement.toFixed(1)}/4.0).`);
      recommendations.push("Reincidir en el principio trabajado adaptando la complejidad y nivel de oposición.");
      actionProposals.push(buildSessionActionProposal({
        type: 'regenerate_session_block',
        title: 'Refuerzo de principio táctico',
        rationale: 'Nivel de consecución inferior al umbral recomendado (2.2).',
        target: { blockId: 'principal_1' },
        proposedChanges: { modificationsSummary: ['Introducir variante con superioridad numérica'] }
      }));
    }

    if (interpretations.length === 0) {
      interpretations.push("Sesión ejecutada en parámetros óptimos de tiempo, carga y asimilación conceptual.");
      recommendations.push("Mantener la planificación programada para el resto del microciclo.");
    }
  }

  const evidence = [
    { metric: 'Duración Real', value: `${comparison.executed.actualDurationMin} min`, reference: session.id },
    { metric: 'RPE', value: comparison.executed.sessionRpe !== null ? `${comparison.executed.sessionRpe}/10` : 'Pendiente', reference: session.id },
    { metric: 'Consecución', value: comparison.executed.objectiveAchievement !== null ? `${comparison.executed.objectiveAchievement.toFixed(1)}/4.0` : 'Pendiente', reference: session.id }
  ];

  return {
    answer: comparison.dataQuality.isEvaluated 
      ? `Análisis post-sesión completado: Consecución ${comparison.executed.objectiveAchievement !== null ? comparison.executed.objectiveAchievement.toFixed(1) + '/4.0' : 'N/A'}, RPE ${comparison.executed.sessionRpe || 'N/A'}/10.`
      : 'Sesión pendiente de evaluación pedagógica.',
    facts,
    interpretations,
    recommendations,
    evidence,
    dataSufficiency: {
      sufficient: !isInsufficient,
      sampleSize,
      notice: isInsufficient ? "N < 3: Muestra reducida para inferencias longitudinales." : undefined
    },
    comparison,
    actionProposals
  };
}

module.exports = {
  generatePostSessionFeedback
};
