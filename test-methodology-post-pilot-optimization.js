/**
 * TESTS DE OPTIMIZACIÓN Y REGRESIÓN POST-PILOTO (FASE 5.9)
 * Antigravity Methodology OS
 */

console.log("================================================================================");
console.log("FASE 5.9 — TESTS DE OPTIMIZACIÓN POST-PILOTO Y PREPARACIÓN ESCALADO");
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

const { calculatePlannedVsExecutedFeedback } = require("./src/lib/methodology/sessionExecutionFeedbackService");
const { generatePostSessionFeedback } = require("./src/lib/methodology/ai/methodologyAIPostSessionService");
const { defaultObservabilityService } = require("./src/lib/methodology/methodologyObservabilityService");

function runPostPilotOptimizationTests() {
  const session = {
    id: "sess-opt-1",
    objective: "Salida de balón y progresión",
    microcycleDay: "MD-3",
    duration_minutes: 80,
    num_players: 16
  };

  const evaluation = {
    actualDurationMin: 80,
    sessionRpe: 7,
    objectiveAchievement: 3.4,
    playersPresentCount: 16
  };

  console.log("--- 1. Cálculo Rápido de Feedback sin Redundancias ---");
  const fb = generatePostSessionFeedback({
    session,
    evaluation,
    history: [{ id: "h1" }, { id: "h2" }, { id: "h3" }]
  });

  assert(fb.facts.length > 0, "Optimización: Facts calculados concisamente");
  assert(fb.interpretations.length > 0, "Optimización: Interpretaciones calculadas");
  assert(fb.dataSufficiency.sufficient === true, "Optimización: Suficiencia con N>=3");

  console.log("\n--- 2. Captura Eficiente de Feedback Humano ---");
  defaultObservabilityService.recordHumanFeedback({
    proposalId: "prop-opt-001",
    clubId: "club-opt",
    rating: "util",
    coachComment: "Diagnóstico conciso y directo"
  });

  const metrics = defaultObservabilityService.getOperationalMetrics("club-opt");
  assert(metrics.feedbackSummary.usefulCount >= 1, "Optimización: Feedback humano agregado a métricas");

  console.log("\n================================================================================");
  console.log("RESULTADO FASE 5.9 TESTS OPTIMIZACIÓN: " + passed + " PASADOS, " + failed + " FALLADOS");
  console.log("================================================================================\n");

  if (failed > 0) process.exit(1);
}

runPostPilotOptimizationTests();
