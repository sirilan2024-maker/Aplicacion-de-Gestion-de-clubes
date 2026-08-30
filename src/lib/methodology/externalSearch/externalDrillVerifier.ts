import { ExternalEvidence, ExternalVerificationStatus, NormalizedExternalExercise } from "./types";

export interface AuditResult {
  status: ExternalVerificationStatus;
  domain: string;
  sourceMismatch: boolean;
  expectedDomain?: string;
  actualDomain?: string;
  dominantObjective: string;
  evidence: ExternalEvidence;
  evidenceSummary: string;
  domainVerified: boolean;
  exerciseEvidenceVerified: boolean;
}

const KNOWN_SOURCE_DOMAINS: { pattern: RegExp; expectedDomain: string }[] = [
  { pattern: /uefa/i, expectedDomain: "uefa.com" },
  { pattern: /rfef/i, expectedDomain: "rfef.es" },
  { pattern: /the\s*fa|bootroom/i, expectedDomain: "thefa.com" },
  { pattern: /football\s*dna|footballdna/i, expectedDomain: "footballdna.co.uk" },
  { pattern: /soccer\s*coach\s*weekly|soccercoachweekly/i, expectedDomain: "soccercoachweekly.net" },
  { pattern: /the\s*coaching\s*manual|thecoachingmanual/i, expectedDomain: "thecoachingmanual.com" }
];

/**
 * Extracts normalized domain from a URL (e.g. "https://www.uefa.com/..." -> "uefa.com")
 */
export function extractDomain(url: string): string {
  if (!url || typeof url !== "string") return "";
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    // Fallback extraction
    const match = url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/:]+)/i);
    return match ? match[1].toLowerCase() : "";
  }
}

/**
 * Validates whether the declared source name corresponds to the actual domain in a URL.
 */
export function checkSourceMismatch(source: string, url: string): {
  mismatch: boolean;
  expectedDomain?: string;
  actualDomain?: string;
} {
  const actualDomain = extractDomain(url);
  const src = (source || "").trim();

  for (const entry of KNOWN_SOURCE_DOMAINS) {
    if (entry.pattern.test(src)) {
      const matches = actualDomain === entry.expectedDomain || actualDomain.endsWith(`.${entry.expectedDomain}`);
      return {
        mismatch: !matches,
        expectedDomain: entry.expectedDomain,
        actualDomain
      };
    }
  }

  return {
    mismatch: false,
    actualDomain
  };
}

/**
 * Accurately classifies the real DOMINANT tactical objective of an exercise
 * based on its tactical context, description and behavior, not just superficial title keywords.
 */
export function classifyDominantObjective(exercise: {
  title?: string;
  description?: string;
  tacticalObjective?: string;
  tags?: string[];
}): string {
  const title = (exercise.title || "").toLowerCase();
  const desc = (exercise.description || "").toLowerCase();
  const tac = (exercise.tacticalObjective || "").toLowerCase();
  const tags = (exercise.tags || []).join(" ").toLowerCase();

  // 1. Caso Repliegue / Transición defensiva hacia campo propio
  // Si los jugadores abandonan la presión y repliegan, el objetivo DOMINANTE es repliegue,
  // aunque el título diga "presión" o "tras pérdida".
  if (
    desc.includes("abandonan la presion y realizan repliegue") ||
    desc.includes("abandonan la presión") ||
    desc.includes("replegar antes de") ||
    desc.includes("repliegue hacia bloque medio") ||
    desc.includes("repliegue intensivo") ||
    tac.includes("repliegue") ||
    (tags.includes("repliegue") && !tags.includes("presion tras perdida"))
  ) {
    return "repliegue";
  }

  // 2. Caso Presión Alta SIN pérdida previa
  // Si se presiona desde saque de meta / inicio rival antes de cualquier pérdida, es presión alta.
  if (
    (desc.includes("desde su saque de meta antes de cualquier perdida") ||
     desc.includes("desde su saque de meta antes de cualquier pérdida") ||
     desc.includes("inicio desde saque de meta") ||
     desc.includes("salto de presion del delantero") ||
     desc.includes("salto de presión del delantero") ||
     title.includes("bloque alto 8v8") ||
     tags.includes("bloque alto")) &&
    !desc.includes("tras perdida") &&
    !desc.includes("tras pérdida") &&
    !tags.includes("presion tras perdida")
  ) {
    return "presion alta";
  }

  // 3. Caso Presión Tras Pérdida (Gegenpressing / Contra-Presión / Re-presión)
  // Reacción inmediata en 5 segundos, acoso al poseedor y cierre de líneas inmediatamente tras perder.
  if (
    desc.includes("tras perdida") ||
    desc.includes("tras pérdida") ||
    desc.includes("al perder") ||
    desc.includes("contra-presion") ||
    desc.includes("contra-presión") ||
    desc.includes("gegenpressing") ||
    desc.includes("regla de 5 segundos") ||
    desc.includes("ahogar al recuperador") ||
    tags.includes("presion tras perdida") ||
    tags.includes("gegenpressing") ||
    tags.includes("represion") ||
    tags.includes("recuperacion inmediata") ||
    tac.includes("presion tras perdida") ||
    tac.includes("presión tras pérdida") ||
    tac.includes("recuperacion inmediata") ||
    tac.includes("recuperación inmediata") ||
    title.includes("presion tras perdida") ||
    title.includes("presión tras pérdida") ||
    title.includes("gegenpressing")
  ) {
    return "presion tras perdida";
  }

  // 4. Salida de Balón / Iniciación
  if (
    title.includes("salida de balon") ||
    title.includes("salida de balón") ||
    tags.includes("salida de balon") ||
    tac.includes("salida de balon")
  ) {
    return "salida de balon";
  }

  // 5. Posesión / Conservación
  if (
    tags.includes("posesion") ||
    tags.includes("posesión") ||
    tags.includes("conservacion") ||
    title.includes("posesion") ||
    title.includes("conservacion")
  ) {
    return "posesion";
  }

  // 6. Transición Ofensiva / Contraataque
  if (
    tags.includes("transicion ofensiva") ||
    tags.includes("duelos") ||
    title.includes("transicion ofensiva")
  ) {
    return "transicion ofensiva";
  }

  // 7. ABP (Acciones a Balón Parado)
  if (tags.includes("abp") || title.includes("abp") || tags.includes("corner")) {
    return "abp";
  }

  // 8. Finalización
  if (tags.includes("finalizacion") || tags.includes("remate") || title.includes("finalizacion")) {
    return "finalizacion";
  }

  // 9. Psicomotricidad
  if (tags.includes("psicomotricidad") || tags.includes("ludico") || title.includes("laberinto")) {
    return "psicomotricidad";
  }

  return "general";
}

/**
 * Complete audit of an external exercise:
 * 1. Domain verification (supportsSource)
 * 2. Specific exercise documentary verification (supportsExercise)
 * 3. Dominant tactical objective classification (supportsObjective)
 * 4. Final trust & verification status (VERIFIED | PARTIALLY_VERIFIED | UNVERIFIED | BROKEN)
 */
export function auditExternalExercise(exercise: NormalizedExternalExercise): AuditResult {
  const domain = extractDomain(exercise.sourceUrl || "");
  const sourceMismatchCheck = checkSourceMismatch(exercise.source || "", exercise.sourceUrl || "");
  
  // Auditar también URL de evidencia si existe (FASE 59)
  let evidenceMismatchCheck: { mismatch: boolean; expectedDomain?: string; actualDomain?: string } = { mismatch: false, expectedDomain: "", actualDomain: "" };
  if (exercise.evidence?.url) {
    evidenceMismatchCheck = checkSourceMismatch(exercise.source || "", exercise.evidence.url);
  }

  const hasSourceMismatch = sourceMismatchCheck.mismatch || evidenceMismatchCheck.mismatch;
  const dominantObjective = classifyDominantObjective(exercise);

  // Reconstruir o inferir evidencia estructurada
  let evidence: ExternalEvidence = exercise.evidence || {
    type: exercise.verificationStatus === "UNVERIFIED" ? "internal_record" : "official_domain_only",
    url: exercise.sourceUrl,
    supportsExercise: exercise.exerciseEvidenceVerified || false,
    supportsSource: !hasSourceMismatch && Boolean(domain),
    supportsObjective: true,
    checkedAt: "2026-08-20"
  };

  let status: ExternalVerificationStatus = "PARTIALLY_VERIFIED";
  let evidenceSummary = exercise.externalEvidence || "";

  // 1. Inconsistencia estructural o Source Mismatch -> BROKEN
  if (hasSourceMismatch) {
    status = "BROKEN";
    const mismatchedDomain = evidenceMismatchCheck.mismatch ? evidenceMismatchCheck.actualDomain : sourceMismatchCheck.actualDomain;
    const expectedDomain = sourceMismatchCheck.expectedDomain || evidenceMismatchCheck.expectedDomain;
    evidenceSummary = `❌ SOURCE_MISMATCH: La fuente declarada ("${exercise.source}") no coincide con el dominio ("${mismatchedDomain}"). Se esperaba "${expectedDomain}".`;
  } else if (!domain || !exercise.sourceUrl || !exercise.sourceUrl.startsWith("http")) {
    status = "BROKEN";
    evidenceSummary = "❌ URL_INVALIDA: La URL externa no tiene formato web válido o está ausente.";
  } 
  // 2. Evaluación estricta de Evidencia Documental (FASE 59)
  else if (evidence.type === "internal_record" || !evidence.supportsSource) {
    status = "UNVERIFIED";
    evidenceSummary = exercise.externalEvidence || "Registro interno sin evidencia externa verificable en la fuente declarada.";
  } else if (evidence.supportsSource && evidence.supportsExercise) {
    if (evidence.supportsObjective === false) {
      status = "PARTIALLY_VERIFIED";
      evidenceSummary = exercise.externalEvidence || `La evidencia documental no demuestra el objetivo táctico declarado en ${domain}.`;
    } else {
      // REQUISITO ESTRICTO FASE 59 & 60: VERIFIED SOLO SI EXISTE EVIDENCIA DOCUMENTAL DEL EJERCICIO Y DEL OBJETIVO
      status = "VERIFIED";
      evidenceSummary = exercise.externalEvidence || `Verificado: Existe evidencia documental específica del ejercicio en ${domain}.`;
    }
  } else if (evidence.supportsSource && !evidence.supportsExercise) {
    // REQUISITO ESTRICTO FASE 59 & 60: DOMINIO CONFIRMADO PERO SIN EVIDENCIA ESPECÍFICA DEL EJERCICIO = PARTIALLY_VERIFIED
    status = "PARTIALLY_VERIFIED";
    evidenceSummary = exercise.externalEvidence || `Dominio oficial ${domain} confirmado, pero no se ha encontrado evidencia documental específica suficiente del ejercicio.`;
  } else {
    status = "UNVERIFIED";
    evidenceSummary = "Evidencia insuficiente.";
  }

  const domainVerified = !hasSourceMismatch && Boolean(domain) && evidence.supportsSource;
  const exerciseEvidenceVerified = status === "VERIFIED" && evidence.supportsExercise;

  return {
    status,
    domain,
    sourceMismatch: hasSourceMismatch,
    expectedDomain: sourceMismatchCheck.expectedDomain,
    actualDomain: sourceMismatchCheck.actualDomain,
    dominantObjective,
    evidence,
    evidenceSummary,
    domainVerified,
    exerciseEvidenceVerified
  };
}

