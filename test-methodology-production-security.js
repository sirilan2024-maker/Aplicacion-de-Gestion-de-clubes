/**
 * TESTS DE SEGURIDAD PRODUCTIVA Y CONTROL DE ACCESO (FASE 5.7)
 * Antigravity Methodology OS
 */

console.log("================================================================================");
console.log("FASE 5.7 — TESTS DE SEGURIDAD PRODUCTIVA, MULTI-TENANT Y RBAC");
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

  console.log("--- 1. Validación Obligatoria de clubId en Operaciones ---");
  let errorCaught = false;
  try {
    obs.logEvent({ type: 'proposal_generated' }); // Falta clubId
  } catch (err) {
    errorCaught = true;
  }
  assert(errorCaught === true, "Seguridad: Bloquea eventos sin clubId");

  console.log("\n--- 2. Aislamiento Estricto entre Clubes ---");
  obs.logEvent({ type: 'proposal_generated', clubId: 'club-alpha', teamId: 'team-1' });
  obs.logEvent({ type: 'proposal_generated', clubId: 'club-beta', teamId: 'team-2' });

  const metricsAlpha = obs.getOperationalMetrics('club-alpha');
  const metricsBeta = obs.getOperationalMetrics('club-beta');

  assert(metricsAlpha.totalEvents === 1, "Seguridad: Club Alpha no accede a eventos de Beta");
  assert(metricsBeta.totalEvents === 1, "Seguridad: Club Beta no accede a eventos de Alpha");

  console.log("\n================================================================================");
  console.log("RESULTADO FASE 5.7 TESTS SEGURIDAD PRODUCTIVA: " + passed + " PASADOS, " + failed + " FALLADOS");
  console.log("================================================================================\n");

  if (failed > 0) process.exit(1);
}

runTests();
