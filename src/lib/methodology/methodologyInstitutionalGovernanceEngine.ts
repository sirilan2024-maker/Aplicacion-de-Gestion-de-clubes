/**
 * Motor Determinista de Gobierno Metodológico y Aprendizaje Institucional v1.0 (TS)
 * Antigravity Methodology OS - Fase 6.5
 */

export type DecisionType = "APROBADA" | "RECHAZADA" | "DEVUELTA";
export type DecisionScope = "EQUIPO" | "CATEGORIA" | "ETAPA" | "CLUB";
export type OutcomeClassification = "MEJORA" | "ESTABILIDAD" | "DETERIORO" | "SIN_EVIDENCIA" | "NO_EVALUABLE";

export interface MethodologicalDecision {
  decision_id: string;
  proposal_id: string;
  decision: DecisionType;
  decided_by: string;
  decided_at: string;
  justification: string;
  scope: DecisionScope;
  review_date?: string | null;
  club_id: string;
  status: "EN_SEGUIMIENTO" | "CERRADA";
}

export interface ObservedOutcome {
  classification: OutcomeClassification;
  delta: number;
  sampleSize: number;
  observation: string;
}

export interface InstitutionalLearning {
  learning_id: string;
  decision_id: string;
  club_id: string;
  fact: string;
  evaluation: OutcomeClassification;
  learning: string;
  derived_at: string;
}

export function createDecision(params: {
  proposalId: string;
  decisionType: DecisionType;
  decidedBy: string;
  justification?: string;
  scope?: DecisionScope;
  reviewDate?: string | null;
  clubId: string;
}): MethodologicalDecision {
  const { proposalId, decisionType, decidedBy, justification, scope, reviewDate, clubId } = params;

  if (!proposalId || !decisionType || !decidedBy || !clubId) {
    throw new Error("Parámetros obligatorios incompletos para registrar decisión de gobierno.");
  }

  const validDecisions: DecisionType[] = ["APROBADA", "RECHAZADA", "DEVUELTA"];
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

export function evaluateObservedOutcome(params: {
  baselineScore: number;
  observedScore: number;
  sampleSize: number;
}): ObservedOutcome {
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

  let classification: OutcomeClassification = "ESTABILIDAD";
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

export function deriveInstitutionalLearning(params: {
  decisionId: string;
  outcome: ObservedOutcome;
  principleAffected?: string;
  clubId: string;
}): InstitutionalLearning {
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
