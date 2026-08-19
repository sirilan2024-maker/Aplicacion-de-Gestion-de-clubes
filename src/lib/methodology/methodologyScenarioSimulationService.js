/**
 * Servicio Determinista de Simulación de Escenarios Metodológicos v1.0 (JS & TS)
 * Antigravity Methodology OS - Fase 5.6
 */

const { validateMethodologySessionProposal } = require("./methodologySessionGenerator");
const { validateMicrocycleProposal } = require("./methodologyMicrocyclePlanner");

function simulateScenario(params) {
  const {
    scenarioId,
    label,
    basePlan, // Sesión o Microciclo base
    modifications = {}, // { durationMin, targetLoad, objective, suggestedBlocks, microcycleDay }
    team = {},
    curriculumPrinciples = [],
    historySummary = {}
  } = params;

  if (!scenarioId || !basePlan) {
    throw new Error("Parámetros obligatorios incompletos: se requiere scenarioId y basePlan.");
  }

  const isSession = Boolean(basePlan.blocks || basePlan.objective);

  const simulated = {
    ...basePlan,
    ...modifications
  };

  // 1. Validaciones y Restricciones Deterministas
  const constraintChecks = [];
  const risks = [];
  const deviations = {};

  const plannedDuration = basePlan.durationMinutes || basePlan.plannedDurationMin || 90;
  const simulatedDuration = simulated.durationMinutes || simulated.plannedDurationMin || plannedDuration;
  deviations.durationDiffMin = simulatedDuration - plannedDuration;

  const plannedLoad = basePlan.intensityLoad || basePlan.targetLoad || 'Media';
  const simulatedLoad = simulated.intensityLoad || simulated.targetLoad || plannedLoad;
  deviations.loadChanged = simulatedLoad !== plannedLoad;

  // Validación de MD
  const md = simulated.microcycleDay || basePlan.microcycleDay || 'MD-3';
  if (md === 'MD-1' && (simulatedLoad === 'Alta' || simulatedLoad === 4 || simulatedLoad === 5)) {
    risks.push("Riesgo de Fatiga: Se ha simulado carga alta en jornada previa a competición (MD-1).");
    constraintChecks.push({ check: 'md_load_compatibility', passed: false, reason: 'MD-1 exige carga baja/moderada' });
  } else {
    constraintChecks.push({ check: 'md_load_compatibility', passed: true });
  }

  if (simulatedDuration > 120) {
    risks.push("Riesgo Temporal: Duración superior a 120 minutos excede el umbral pedagógico recomendado.");
    constraintChecks.push({ check: 'duration_bounds', passed: false, reason: 'Duración > 120 min' });
  } else if (simulatedDuration < 45) {
    risks.push("Advertencia: Duración inferior a 45 minutos puede comprometer la consecución del objetivo.");
    constraintChecks.push({ check: 'duration_bounds', passed: true });
  } else {
    constraintChecks.push({ check: 'duration_bounds', passed: true });
  }

  // Validación determinista estructural
  let deterministicValidation = { valid: true, errors: [], warnings: [] };
  if (isSession && simulated.blocks) {
    deterministicValidation = validateMethodologySessionProposal(simulated);
  }

  const methodologyImpact = {
    objectiveFocus: simulated.objective || basePlan.objective || 'Desarrollo táctico general',
    estimatedLoad: simulatedLoad,
    durationMin: simulatedDuration,
    principlesCovered: [simulated.objective || basePlan.objective].filter(Boolean),
    suitabilityScore: (constraintChecks.every(c => c.passed) && deterministicValidation.valid) ? 'alto' : 'moderado_con_riesgos'
  };

  const evidence = [
    `Duración simulada: ${simulatedDuration} min (Δ=${deviations.durationDiffMin >= 0 ? '+' : ''}${deviations.durationDiffMin} min)`,
    `Carga simulada: ${simulatedLoad} (Estructura: ${md})`,
    `Restricciones superadas: ${constraintChecks.filter(c => c.passed).length} de ${constraintChecks.length}`
  ];

  return {
    scenarioId,
    label: label || `Escenario ${scenarioId}`,
    input: modifications,
    planned: {
      durationMin: plannedDuration,
      targetLoad: plannedLoad,
      objective: basePlan.objective || 'Plan base'
    },
    simulated: {
      durationMin: simulatedDuration,
      targetLoad: simulatedLoad,
      objective: simulated.objective || basePlan.objective
    },
    deviations,
    methodologyImpact,
    constraintChecks,
    risks,
    evidence,
    deterministicValidation
  };
}

module.exports = {
  simulateScenario
};
