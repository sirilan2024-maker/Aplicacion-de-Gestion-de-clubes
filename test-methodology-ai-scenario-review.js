/**
 * TESTS DE EXPLICACIÓN IA DE ESCENARIOS (FASE 5.6)
 * Antigravity Methodology OS
 */

console.log("================================================================================");
console.log("FASE 5.6 — TESTS DE EXPLICACIÓN IA CONSULTIVA DE ESCENARIOS");
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
const { generateAIScenarioReview } = require("./src/lib/methodology/ai/methodologyAIScenarioReviewService");

function runTests() {
  const basePlan = { objective: "Presión alta", durationMinutes: 90, intensityLoad: "Media" };
  const sc1 = simulateScenario({ scenarioId: "sc-1", label: "Base", basePlan });
  const sc2 = simulateScenario({ scenarioId: "sc-2", label: "Modulado", basePlan, modifications: { durationMinutes: 70, intensityLoad: "Baja" } });

  console.log("--- 1. Explicación IA de Escenarios (Facts, Interpretations, Recommendations) ---");
  const rev = generateAIScenarioReview({
    scenarios: [sc1, sc2],
    team: { name: "Infantil A" },
    sampleSize: 4
  });

  assert(Array.isArray(rev.facts) && rev.facts.length > 0, "Explicación IA: facts presentes");
  assert(Array.isArray(rev.interpretations) && rev.interpretations.length > 0, "Explicación IA: interpretations presentes");
  assert(Array.isArray(rev.recommendations) && rev.recommendations.length > 0, "Explicación IA: recommendations presentes");
  assert(rev.dataSufficiency.sufficient === true, "Explicación IA: dataSufficiency.sufficient === true");

  console.log("\n--- 2. Regla N < 3 en Explicación IA ---");
  const revN1 = generateAIScenarioReview({
    scenarios: [sc1, sc2],
    team: { name: "Infantil A" },
    sampleSize: 1
  });
  assert(revN1.dataSufficiency.sufficient === false, "N=1: dataSufficiency.sufficient === false");

  console.log("\n================================================================================");
  console.log("RESULTADO FASE 5.6 TESTS EXPLICACIÓN IA: " + passed + " PASADOS, " + failed + " FALLADOS");
  console.log("================================================================================\n");

  if (failed > 0) process.exit(1);
}

runTests();
