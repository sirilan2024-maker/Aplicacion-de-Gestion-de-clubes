/**
 * TESTS DE COMPARACIÓN DE ESCENARIOS (FASE 5.6)
 * Antigravity Methodology OS
 */

console.log("================================================================================");
console.log("FASE 5.6 — TESTS DE COMPARACIÓN DE ESCENARIOS");
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
const { compareScenarios } = require("./src/lib/methodology/methodologyScenarioComparisonService");

function runTests() {
  const basePlan = { objective: "Juego posición", durationMinutes: 90, intensityLoad: "Media" };

  const sc1 = simulateScenario({ scenarioId: "sc-1", label: "Opción A", basePlan });
  const sc2 = simulateScenario({ scenarioId: "sc-2", label: "Opción B", basePlan, modifications: { durationMinutes: 60, intensityLoad: "Baja" } });
  const sc3 = simulateScenario({ scenarioId: "sc-3", label: "Opción C", basePlan, modifications: { durationMinutes: 105, intensityLoad: "Alta" } });
  const sc4 = simulateScenario({ scenarioId: "sc-4", label: "Opción D", basePlan, modifications: { durationMinutes: 75 } });

  console.log("--- 1. Comparación de 2 Escenarios ---");
  const comp2 = compareScenarios([sc1, sc2]);
  assert(comp2.scenariosCount === 2, "Comparar 2: scenariosCount === 2");
  assert(comp2.matrix.length === 2, "Comparar 2: matrix length === 2");
  assert(comp2.keyDifferences.length > 0, "Comparar 2: diferencias clave identificadas");

  console.log("\n--- 2. Comparación de 4 Escenarios ---");
  const comp4 = compareScenarios([sc1, sc2, sc3, sc4]);
  assert(comp4.scenariosCount === 4, "Comparar 4: scenariosCount === 4");
  assert(comp4.matrix.length === 4, "Comparar 4: matrix length === 4");

  console.log("\n================================================================================");
  console.log("RESULTADO FASE 5.6 TESTS COMPARACIÓN: " + passed + " PASADOS, " + failed + " FALLADOS");
  console.log("================================================================================\n");

  if (failed > 0) process.exit(1);
}

runTests();
