/**
 * Servicio Determinista de Calidad y Auditoría Estructural de IA v1.0 (JS & TS)
 * Antigravity Methodology OS - Fase 5.7
 */

function auditAIResponseQuality(response, context = {}) {
  const issues = [];
  const checks = [];

  // 1. Presencia de respuesta ejecutiva (answer)
  const hasAnswer = Boolean(response && typeof response.answer === 'string' && response.answer.trim().length > 0);
  checks.push({ check: 'presence_of_answer', passed: hasAnswer });
  if (!hasAnswer) issues.push("La respuesta no contiene resumen ejecutivo (answer).");

  // 2. Separación de Hechos (Facts)
  const hasFacts = Array.isArray(response?.facts) && response.facts.length > 0;
  checks.push({ check: 'presence_of_facts', passed: hasFacts });
  if (!hasFacts) issues.push("La respuesta carece de separación explícita de hechos comprobables.");

  // 3. Separación de Interpretaciones
  const hasInterpretations = Array.isArray(response?.interpretations);
  checks.push({ check: 'presence_of_interpretations', passed: hasInterpretations });

  // 4. Separación de Recomendaciones
  const hasRecommendations = Array.isArray(response?.recommendations);
  checks.push({ check: 'presence_of_recommendations', passed: hasRecommendations });

  // 5. Estructura de Evidencias
  const hasEvidence = Array.isArray(response?.evidence) && response.evidence.length > 0;
  checks.push({ check: 'presence_of_evidence', passed: hasEvidence });
  if (!hasEvidence) issues.push("La respuesta carece de evidencias empíricas estructuradas.");

  // 6. Validación de Regla N < 3
  const sampleSize = response?.dataSufficiency?.sampleSize || 0;
  const isSufficient = response?.dataSufficiency?.sufficient;
  let nRuleCompliant = true;

  if (sampleSize < 3 && isSufficient === true) {
    nRuleCompliant = false;
    issues.push("Violación de Regla N < 3: Se declaró suficiencia de datos con muestra < 3.");
  }
  checks.push({ check: 'n_rule_compliance', passed: nRuleCompliant });

  // 7. Ausencia de afirmaciones autoritarias
  const answerLower = (response?.answer || '').toLowerCase();
  const hasAuthoritarianLanguage = answerLower.includes("debes ") || answerLower.includes("tienes que ");
  checks.push({ check: 'consultive_tone', passed: !hasAuthoritarianLanguage });
  if (hasAuthoritarianLanguage) issues.push("La IA utilizó tono imperativo en lugar de consultivo.");

  const passedCount = checks.filter(c => c.passed).length;
  const qualityScore = Math.round((passedCount / checks.length) * 100);

  return {
    isCompliant: issues.length === 0,
    qualityScore,
    checks,
    issues
  };
}

module.exports = {
  auditAIResponseQuality
};
