/**
 * Motor Determinista de Gobierno Metodológico y Aprendizaje Institucional v1.0
 * Antigravity Methodology OS - Fase 6.5
 *
 * Separa de forma inquebrantable:
 * PROPUESTA -> DECISIÓN (Humana) -> SEGUIMIENTO -> RESULTADO OBSERVADO -> APRENDIZAJE INSTITUCIONAL
 */

function createDecision(params) {
  const { proposalId, decisionType, decidedBy, justification, scope, reviewDate, clubId } = params;

  if (!proposalId || !decisionType || !decidedBy || !clubId) {
    throw new Error("Parámetros obligatorios incompletos para registrar decisión de gobierno.");
  }

  const validDecisions = ["APROBADA", "RECHAZADA", "DEVUELTA"];
  if (!validDecisions.includes(decisionType)) {
    throw new Error(`Tipo de decisión inválido: ${decisionType}. Debe ser uno de ${validDecisions.join(", ")}`);
  }

  return {
    decision_id: `dec-${proposalId}-${Date.now()}`,
    proposal_id: proposalId,
    decision: decisionType,
    decided_by: decidedBy,
    decided_at: new Date().toISOString(),
    justification: justification || "Sin justificación adicional registrada",
    scope: scope || "EQUIPO",
    review_date: reviewDate || null,
    club_id: clubId,
    status: decisionType === "APROBADA" ? "EN_SEGUIMIENTO" : "CERRADA"
  };
}

function evaluateObservedOutcome(params) {
  const { baselineScore, observedScore, sampleSize } = params;

  if (sampleSize === undefined || sampleSize < 3) {
    return {
      classification: "SIN_EVIDENCIA",
      delta: 0,
      sampleSize: sampleSize || 0,
      observation: `Muestra insuficiente (N=${sampleSize || 0}). No es posible emitir evaluación estadística válida.`
    };
  }

  const delta = Number((observedScore - baselineScore).toFixed(2));

  let classification = "ESTABILIDAD";
  if (delta >= 0.3) {
    classification = "MEJORA";
  } else if (delta <= -0.3) {
    classification = "DETERIORO";
  }

  return {
    classification,
    delta,
    sampleSize,
    observation: `Variación observada de ${delta > 0 ? "+" : ""}${delta} puntos respecto a la línea base (${baselineScore} -> ${observedScore}).`
  };
}

function deriveInstitutionalLearning(params) {
  const { decisionId, outcome, principleAffected, clubId } = params;

  if (!decisionId || !outcome || !clubId) {
    throw new Error("Datos insuficientes para derivar aprendizaje institucional.");
  }

  let learningSummary = "";
  if (outcome.classification === "MEJORA") {
    learningSummary = `La intervención metodológica sobre '${principleAffected || "el principio"}' demostró impacto positivo cuantificado (Δ=+${outcome.delta}).`;
  } else if (outcome.classification === "DETERIORO") {
    learningSummary = `La intervención sobre '${principleAffected || "el principio"}' no logró la respuesta esperada (Δ=${outcome.delta}). Se recomienda revisar la carga o diseño de tareas.`;
  } else if (outcome.classification === "ESTABILIDAD") {
    learningSummary = `El principio '${principleAffected || "evaluado"}' se mantiene en rango estable.`;
  } else {
    learningSummary = "Muestra insuficiente para consolidar aprendizaje institucional definitivo.";
  }

  return {
    learning_id: `learn-${decisionId}`,
    decision_id: decisionId,
    club_id: clubId,
    fact: outcome.observation,
    evaluation: outcome.classification,
    learning: learningSummary,
    derived_at: new Date().toISOString()
  };
}

module.exports = {
  createDecision,
  evaluateObservedOutcome,
  deriveInstitutionalLearning
};
