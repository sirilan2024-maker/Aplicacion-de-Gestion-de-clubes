/**
 * Servicio Determinista de Comparación de Escenarios Metodológicos v1.0 (JS & TS)
 * Antigravity Methodology OS - Fase 5.6
 */

function compareScenarios(scenarios = []) {
  if (!Array.isArray(scenarios) || scenarios.length === 0) {
    throw new Error("Se requiere al menos un escenario para comparar.");
  }

  const cappedScenarios = scenarios.slice(0, 4);

  // Ordenar determinísticamente por scenarioId
  const sorted = [...cappedScenarios].sort((a, b) => a.scenarioId.localeCompare(b.scenarioId));

  const comparisonMatrix = sorted.map(sc => ({
    scenarioId: sc.scenarioId,
    label: sc.label,
    durationMin: sc.simulated.durationMin,
    targetLoad: sc.simulated.targetLoad,
    objective: sc.simulated.objective,
    durationDiffMin: sc.deviations.durationDiffMin,
    risksCount: sc.risks.length,
    constraintsPassed: sc.constraintChecks.filter(c => c.passed).length === sc.constraintChecks.length,
    suitability: sc.methodologyImpact.suitabilityScore
  }));

  const keyDifferences = [];
  const durations = sorted.map(s => s.simulated.durationMin);
  const minDur = Math.min(...durations);
  const maxDur = Math.max(...durations);

  if (minDur !== maxDur) {
    keyDifferences.push(`Variación temporal entre escenarios: ${minDur} min a ${maxDur} min.`);
  }

  const loads = new Set(sorted.map(s => String(s.simulated.targetLoad)));
  if (loads.size > 1) {
    keyDifferences.push(`Divergencia de cargas programadas: ${Array.from(loads).join(' vs ')}.`);
  }

  return {
    scenariosCount: sorted.length,
    scenarios: sorted,
    matrix: comparisonMatrix,
    keyDifferences,
    hasRisks: sorted.some(s => s.risks.length > 0)
  };
}

module.exports = {
  compareScenarios
};
