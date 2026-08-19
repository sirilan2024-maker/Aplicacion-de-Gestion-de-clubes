/**
 * TESTS E2E DE VALIDACIÓN PRODUCTIVA Y OBSERVABILIDAD (FASE 5.7)
 * Antigravity Methodology OS
 */

console.log("================================================================================");
console.log("FASE 5.7 — TESTS E2E DE OBSERVABILIDAD, CALIDAD Y OPERACIÓN PRODUCTIVA");
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
const { auditAIResponseQuality } = require("./src/lib/methodology/ai/methodologyAIQualityService");
const { MethodologyAIProvider } = require("./src/lib/methodology/ai/methodologyAIProvider");

async function runE2EProductionTests() {
  console.log("--- Flujo E2E Productivo: Petición IA -> Auditoría Calidad -> Registro Evento -> Feedback Humano -> Métricas ---");

  const obs = new MethodologyObservabilityService();
  const provider = new MethodologyAIProvider(null);
  const clubId = "club-prod-e2e";
  const team = { id: "team-prod-1", name: "Juvenil A" };

  // 1. Generación de Respuesta IA (Fallback determinista)
  const aiRes = await provider.askAssistant("Diagnóstico del equipo", {
    club: { id: clubId, name: "Sporting Saladar" },
    team,
    scope: 'team',
    teamReport: { sampleSize: 4, summary: { avgObjectiveAchievement: 3.3, modelCoveragePercentage: 80 } }
  });

  assert(aiRes !== null && aiRes.answer !== undefined, "E2E Paso 1: Respuesta IA generada");

  // 2. Auditoría automática de calidad estructural
  const qualityAudit = auditAIResponseQuality(aiRes);
  assert(qualityAudit.isCompliant === true, "E2E Paso 2: Auditoría de calidad de IA aprobada (100%)");

  // 3. Registro de evento de observabilidad
  obs.logEvent({
    type: 'proposal_generated',
    clubId,
    teamId: team.id,
    metadata: { qualityScore: qualityAudit.qualityScore }
  });

  // 4. Feedback humano
  obs.recordHumanFeedback({
    proposalId: "prop-e2e-001",
    teamId: team.id,
    clubId,
    rating: "util",
    coachComment: "Recomendación coherente con la sesión del martes"
  });

  // 5. Verificación de métricas operativas
  const metrics = obs.getOperationalMetrics(clubId);
  assert(metrics.proposals.generated === 1, "E2E Paso 5: Métrica de propuesta registrada");
  assert(metrics.feedbackSummary.usefulCount === 1, "E2E Paso 5: Feedback humano contabilizado");

  console.log("\n================================================================================");
  console.log("RESULTADO FASE 5.7 TESTS E2E PRODUCTIVO: " + passed + " PASADOS, " + failed + " FALLADOS");
  console.log("================================================================================\n");

  if (failed > 0) process.exit(1);
}

runE2EProductionTests();
