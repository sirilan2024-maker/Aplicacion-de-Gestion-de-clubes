/**
 * TESTS DEL MOTOR DE SIMULACIÓN Y ANTICIPACIÓN METODOLÓGICA (FASE 6.6)
 * Antigravity Methodology OS
 */

console.log("================================================================================");
console.log("FASE 6.6 — SUITE DE SIMULACIÓN METODOLÓGICA Y ANTICIPACIÓN INSTITUCIONAL");
console.log("================================================================================\n");

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log("OK [PASS] " + testName);
    passed++;
  } else {
    console.error("XX [FAIL] " + testName);
    failed++;
  }
}

const { runMethodologyScenarioSimulation } = require("./src/lib/methodology/methodologyScenarioSimulationEngine");

function runSimulationEngineTests() {
  console.log("--- 1. Simulación Determinista y Evaluación de Evidencia ---");
  const simRobust = runMethodologyScenarioSimulation({
    scenarioId: "sc-test-1",
    name: "Escenario Incremento Cobertura",
    baseline: { coveragePercentage: 50, avgAchievement: 3.0, avgRpe: 6.5 },
    variables: { coverageDeltaPercentage: 15, tacticalLoadDeltaPercentage: 10 },
    sampleSize: 10,
    clubId: "club-123"
  });

  assert(simRobust.simulated.coveragePercentage === 65, "Simulación: Cobertura calculada (50 -> 65%)");
  assert(simRobust.evidenceLevel === "MODERADA", "Simulación: N=10 clasificado como MODERADA");
  assert(!simRobust.isHypotheticalOnly, "Simulación: N=10 no es puramente hipotético");

  console.log("\n--- 2. Protección de Regla N < 3 en Simulación ---");
  const simInsuf = runMethodologyScenarioSimulation({
    scenarioId: "sc-test-2",
    name: "Escenario Muestra Reducida",
    baseline: { coveragePercentage: 40, avgAchievement: 2.5, avgRpe: 6.0 },
    variables: { coverageDeltaPercentage: 10 },
    sampleSize: 2,
    clubId: "club-123"
  });

  assert(simInsuf.isHypotheticalOnly === true, "Regla N<3: Marcado como puramente hipotético");
  assert(simInsuf.evidenceLevel === "INSUFICIENTE", "Regla N<3: Evidencia clasificada como INSUFICIENTE");

  console.log("\n--- 3. Detección Determinista de Riesgos Metodológicos ---");
  const simRisk = runMethodologyScenarioSimulation({
    scenarioId: "sc-test-3",
    name: "Escenario Sobrecarga",
    baseline: { coveragePercentage: 50, avgAchievement: 3.0, avgRpe: 7.5 },
    variables: { tacticalLoadDeltaPercentage: 20, durationDeltaMin: 15 },
    sampleSize: 8,
    clubId: "club-123"
  });

  assert(simRisk.risks.some(r => r.type === "RIESGO_SOBRECARGA"), "Riesgos: Sobrecarga detectada deterministamente");
  assert(simRisk.riskProfile === "ALTO", "Riesgos: Perfil de riesgo ALTO asignado");

  console.log("\n--- 4. Determinismo Estricto ---");
  const simRobustRun2 = runMethodologyScenarioSimulation({
    scenarioId: "sc-test-1",
    name: "Escenario Incremento Cobertura",
    baseline: { coveragePercentage: 50, avgAchievement: 3.0, avgRpe: 6.5 },
    variables: { coverageDeltaPercentage: 15, tacticalLoadDeltaPercentage: 10 },
    sampleSize: 10,
    clubId: "club-123"
  });

  assert(JSON.stringify(simRobust) === JSON.stringify(simRobustRun2), "Determinismo: Resultado 100% reproducible");

  console.log("\n================================================================================");
  console.log("RESULTADO FASE 6.6 TESTS SIMULACIÓN METODOLÓGICA: " + passed + " PASADOS, " + failed + " FALLADOS");
  console.log("================================================================================\n");

  if (failed > 0) process.exit(1);
}

runSimulationEngineTests();
