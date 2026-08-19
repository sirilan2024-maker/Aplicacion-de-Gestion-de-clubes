/**
 * TESTS DE FEEDBACK HUMANO Y SEGUIMIENTO DE PROPUESTAS (FASE 5.7)
 * Antigravity Methodology OS
 */

console.log("================================================================================");
console.log("FASE 5.7 — TESTS DE FEEDBACK HUMANO Y TRAZABILIDAD");
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

const { MethodologyObservabilityService } = require("./src/lib/methodology/methodologyObservabilityService");

function runTests() {
  const obs = new MethodologyObservabilityService();
  const clubId = "club-feedback-test";

  console.log("--- 1. Registro de Feedback Humano Opcional ---");
  const fb1 = obs.recordHumanFeedback({
    proposalId: "prop-123",
    teamId: "team-a",
    clubId,
    rating: "util",
    coachComment: "Ajuste de carga muy adecuado para MD-1"
  });

  assert(fb1.rating === "util", "Feedback: Útil registrado");
  assert(fb1.coachComment !== null, "Feedback: Comentario registrado");

  const fb2 = obs.recordHumanFeedback({
    proposalId: "prop-124",
    teamId: "team-a",
    clubId,
    rating: "no_util",
    reason: "Prefiero priorizar balón parado"
  });

  assert(fb2.rating === "no_util", "Feedback: No útil registrado con motivo");

  console.log("\n--- 2. Resumen de Calificación Humana ---");
  const metrics = obs.getOperationalMetrics(clubId);
  assert(metrics.feedbackSummary.totalFeedback === 2, "Feedback: Total 2 registrados");
  assert(metrics.feedbackSummary.usefulCount === 1, "Feedback: 1 útil");
  assert(metrics.feedbackSummary.notUsefulCount === 1, "Feedback: 1 no útil");

  console.log("\n================================================================================");
  console.log("RESULTADO FASE 5.7 TESTS FEEDBACK HUMANO: " + passed + " PASADOS, " + failed + " FALLADOS");
  console.log("================================================================================\n");

  if (failed > 0) process.exit(1);
}

runTests();
