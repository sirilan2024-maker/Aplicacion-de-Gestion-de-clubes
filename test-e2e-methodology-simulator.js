/**
 * TESTS E2E DE SIMULADOR METODOLÓGICO (FASE 5.6)
 * Antigravity Methodology OS
 */

console.log("================================================================================");
console.log("FASE 5.6 — TESTS E2E DE SIMULADOR DE ESCENARIOS Y SELECCIÓN HUMANA");
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
const { generateAIScenarioReview } = require("./src/lib/methodology/ai/methodologyAIScenarioReviewService");

async function runE2ESimulatorTests() {
  console.log("--- Flujo E2E: Base -> Simular Alternativas -> Comparar -> Revisión IA -> Selección Humana -> Cero Escrituras ---");

  const basePlan = {
    objective: "Salida de balón y superación",
    durationMinutes: 90,
    intensityLoad: "Media-Alta",
    microcycleDay: "MD-3"
  };

  // 1. Simulación de 2 escenarios alternativos
  const scBase = simulateScenario({ scenarioId: "sc-A", label: "Escenario A (Plan Inicial)", basePlan });
  const scMod = simulateScenario({ scenarioId: "sc-B", label: "Escenario B (Carga Baja)", basePlan, modifications: { durationMinutes: 70, intensityLoad: "Baja" } });

  assert(scBase.scenarioId === "sc-A" && scMod.scenarioId === "sc-B", "E2E Simulador Paso 1: Escenarios simulados");

  // 2. Comparación determinista
  const comparison = compareScenarios([scBase, scMod]);
  assert(comparison.scenariosCount === 2, "E2E Simulador Paso 2: Comparación ejecutada");

  // 3. Explicación IA consultiva
  const review = generateAIScenarioReview({
    scenarios: [scBase, scMod],
    team: { name: "Cadete A" },
    sampleSize: 5
  });
  assert(review.dataSufficiency.sufficient === true, "E2E Simulador Paso 3: Explicación IA con datos suficientes");

  // 4. Selección Humana (Entrenador escoge Escenario B)
  const selectedScenario = scMod;
  assert(selectedScenario.simulated.durationMin === 70, "E2E Simulador Paso 4: Entrenador selecciona Escenario B");

  // 5. Invariante 0 escrituras durante simulación, comparativa y selección
  let writes = 0;
  const origFetch = global.fetch;
  global.fetch = function(...args) {
    const method = (args[1]?.method || "GET").toUpperCase();
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) writes++;
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  };

  simulateScenario({ scenarioId: "sc-test", basePlan });
  compareScenarios([scBase, scMod]);
  generateAIScenarioReview({ scenarios: [scBase, scMod], team: { name: "Cadete A" }, sampleSize: 5 });

  assert(writes === 0, "E2E Simulador Paso 5: 0 escrituras en base de datos durante simulación y comparativa");

  if (origFetch) global.fetch = origFetch;

  console.log("\n================================================================================");
  console.log("RESULTADO FASE 5.6 TESTS E2E SIMULADOR: " + passed + " PASADOS, " + failed + " FALLADOS");
  console.log("================================================================================\n");

  if (failed > 0) process.exit(1);
}

runE2ESimulatorTests();
