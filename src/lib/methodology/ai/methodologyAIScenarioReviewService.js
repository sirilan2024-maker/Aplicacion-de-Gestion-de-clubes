/**
 * Servicio de Explicación y Revisión Consultiva de Escenarios IA v1.0 (JS & TS)
 * Antigravity Methodology OS - Fase 5.6
 */

const { compareScenarios } = require("../methodologyScenarioComparisonService");

function generateAIScenarioReview(params) {
  const { scenarios = [], team = {}, sampleSize = 0 } = params;

  const comparison = compareScenarios(scenarios);
  const isInsufficient = sampleSize < 3;

  const facts = [
    `Comparativa de ${comparison.scenariosCount} escenario(s) simulados para ${team.name || 'el equipo'}.`,
    ...comparison.keyDifferences
  ];

  const interpretations = [];
  const recommendations = [];

  if (isInsufficient) {
    interpretations.push("Muestra histórica reducida (N < 3). La comparativa se fundamenta exclusivamente en reglas estructurales y restricciones temporales.");
  }

  comparison.scenarios.forEach(sc => {
    if (sc.risks.length > 0) {
      interpretations.push(`[${sc.label}] Presenta alertas: ${sc.risks.join(' ')}`);
      recommendations.push(`Si se opta por ${sc.label}, se recomienda mitigar la carga o duración según las alertas descritas.`);
    } else {
      interpretations.push(`[${sc.label}] Cumple todas las restricciones normativas y pedagógicas.`);
      recommendations.push(`El ${sc.label} se perfila como una alternativa metodológicamente equilibrada.`);
    }
  });

  const evidence = [
    { metric: 'Escenarios analizados', value: comparison.scenariosCount, reference: team.name || 'Equipo' },
    { metric: 'Restricciones superadas', value: comparison.matrix.filter(m => m.constraintsPassed).length, reference: team.name || 'Equipo' }
  ];

  return {
    answer: `Análisis comparativo de ${comparison.scenariosCount} escenarios generado. La decisión final corresponde al cuerpo técnico.`,
    facts,
    interpretations,
    scenarioComparison: comparison,
    recommendations,
    evidence,
    dataSufficiency: {
      sufficient: !isInsufficient,
      sampleSize,
      notice: isInsufficient ? "N < 3: Sin datos históricos longitudinales suficientes para proyecciones de rendimiento." : undefined
    }
  };
}

module.exports = {
  generateAIScenarioReview
};
