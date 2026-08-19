/**
 * TESTS DE SIMULACIÓN DE ESCENARIOS (FASE 5.6)
 * Antigravity Methodology OS
 */

console.log("================================================================================");
console.log("FASE 5.6 — TESTS DE SIMULACIÓN DETERMINISTA DE ESCENARIOS");
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

const { simulateScenario } = require("./src/lib/methodology/methodologyScenarioSimulationService");

function runTests() {
  const basePlan = {
    objective: "Salida de balón",
    durationMinutes: 90,
    intensityLoad: "Media",
    microcycleDay: "MD-3"
  };

  console.log("--- 1. Simulación sin cambios (Idéntico al base) ---");
  const scBase = simulateScenario({ scenarioId: "sc-0", basePlan });
  assert(scBase.deviations.durationDiffMin === 0, "Base: durationDiffMin === 0");
  assert(scBase.deviations.loadChanged === false, "Base: loadChanged === false");
  assert(scBase.risks.length === 0, "Base: 0 riesgos");

  console.log("\n--- 2. Simulación de Reducción y Aumento de Carga ---");
  const scRedLoad = simulateScenario({ scenarioId: "sc-red", basePlan, modifications: { intensityLoad: "Baja", durationMinutes: 60 } });
  assert(scRedLoad.deviations.durationDiffMin === -30, "Reducción: durationDiffMin === -30");
  assert(scRedLoad.deviations.loadChanged === true, "Reducción: loadChanged === true");

  console.log("\n--- 3. Detección de Conflicto en MD-1 ---");
  const scMd1Conflict = simulateScenario({ scenarioId: "sc-md1", basePlan, modifications: { microcycleDay: "MD-1", intensityLoad: "Alta" } });
  assert(scMd1Conflict.risks.length > 0, "Conflicto MD-1: Detecta riesgo de fatiga");
  assert(scMd1Conflict.constraintChecks.some(c => c.check === 'md_load_compatibility' && !c.passed), "Conflicto MD-1: Restricción de MD fallida");

  console.log("\n--- 4. Determinismo en Simulación ---");
  const run1 = simulateScenario({ scenarioId: "sc-det", basePlan, modifications: { durationMinutes: 75 } });
  const run2 = simulateScenario({ scenarioId: "sc-det", basePlan, modifications: { durationMinutes: 75 } });
  assert(JSON.stringify(run1) === JSON.stringify(run2), "Determinismo: Simulación idéntica produce JSON idéntico");

  console.log("\n================================================================================");
  console.log("RESULTADO FASE 5.6 TESTS SIMULACIÓN: " + passed + " PASADOS, " + failed + " FALLADOS");
  console.log("================================================================================\n");

  if (failed > 0) process.exit(1);
}

runTests();
