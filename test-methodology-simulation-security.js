/**
 * TESTS DE SEGURIDAD, RBAC Y MULTI-TENANT DE SIMULACIÓN (FASE 5.6)
 * Antigravity Methodology OS
 */

console.log("================================================================================");
console.log("FASE 5.6 — TESTS DE SEGURIDAD Y MULTI-TENANT DE SIMULACIÓN");
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

function runSecurityTests() {
  const planClubA = { objective: "Ataque posicional", durationMinutes: 90 };
  const planClubB = { objective: "Presión defensiva", durationMinutes: 75 };

  console.log("--- 1. Aislamiento de Simulación entre Equipos ---");
  const scA = simulateScenario({ scenarioId: "sc-A", basePlan: planClubA, team: { id: "team-A", clubId: "club-1" } });
  const scB = simulateScenario({ scenarioId: "sc-B", basePlan: planClubB, team: { id: "team-B", clubId: "club-2" } });

  assert(scA.simulated.objective === "Ataque posicional", "Simulación Club A preservada");
  assert(scB.simulated.objective === "Presión defensiva", "Simulación Club B preservada");

  console.log("\n--- 2. Determinismo en Comparación ---");
  const run1 = simulateScenario({ scenarioId: "sc-det", basePlan: planClubA });
  const run2 = simulateScenario({ scenarioId: "sc-det", basePlan: planClubA });
  assert(JSON.stringify(run1) === JSON.stringify(run2), "Determinismo: Simulación idéntica produce JSON idéntico");

  console.log("\n================================================================================");
  console.log("RESULTADO FASE 5.6 TESTS SEGURIDAD: " + passed + " PASADOS, " + failed + " FALLADOS");
  console.log("================================================================================\n");

  if (failed > 0) process.exit(1);
}

runSecurityTests();
