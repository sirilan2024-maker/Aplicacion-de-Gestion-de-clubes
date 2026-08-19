/**
 * TESTS DE GOBIERNO METODOLÓGICO Y APRENDIZAJE INSTITUCIONAL (FASE 6.5)
 * Antigravity Methodology OS
 */

console.log("================================================================================");
console.log("FASE 6.5 — SUITE DE GOBIERNO METODOLÓGICO Y APRENDIZAJE INSTITUCIONAL");
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

const {
  createDecision,
  evaluateObservedOutcome,
  deriveInstitutionalLearning
} = require("./src/lib/methodology/methodologyInstitutionalGovernanceEngine");

function runInstitutionalGovernanceTests() {
  console.log("--- 1. Registro Determinista de Decisión Humana Soberana ---");
  const dec = createDecision({
    proposalId: "prop-cadete-1",
    decisionType: "APROBADA",
    decidedBy: "Director Metodológico",
    justification: "Aprobada modulación de carga en microciclo",
    scope: "EQUIPO",
    clubId: "club-123"
  });

  assert(dec.decision === "APROBADA", "Decisión: Aprobada registrada");
  assert(dec.status === "EN_SEGUIMIENTO", "Decisión: Estado pasa a EN_SEGUIMIENTO");
  assert(dec.decided_by === "Director Metodológico", "Decisión: Decisor humano registrado");

  console.log("\n--- 2. Evaluación de Resultado Observado (Regla N < 3) ---");
  const resInsuf = evaluateObservedOutcome({ baselineScore: 2.0, observedScore: 3.5, sampleSize: 2 });
  assert(resInsuf.classification === "SIN_EVIDENCIA", "Resultado N=2: Clasificado como SIN_EVIDENCIA");

  const resMejora = evaluateObservedOutcome({ baselineScore: 2.0, observedScore: 3.4, sampleSize: 6 });
  assert(resMejora.classification === "MEJORA" && resMejora.delta === 1.4, "Resultado N=6: Clasificado como MEJORA (Δ=+1.4)");

  const resDeterioro = evaluateObservedOutcome({ baselineScore: 3.2, observedScore: 2.4, sampleSize: 5 });
  assert(resDeterioro.classification === "DETERIORO" && resDeterioro.delta === -0.8, "Resultado N=5: Clasificado como DETERIORO (Δ=-0.8)");

  console.log("\n--- 3. Derivación de Aprendizaje Institucional ---");
  const learning = deriveInstitutionalLearning({
    decisionId: dec.decision_id,
    outcome: resMejora,
    principleAffected: "Salida de balón",
    clubId: "club-123"
  });

  assert(learning.evaluation === "MEJORA", "Aprendizaje: Evaluación vinculada");
  assert(learning.learning.includes("impacto positivo"), "Aprendizaje: Síntesis institucional generada");

  console.log("\n================================================================================");
  console.log("RESULTADO FASE 6.5 TESTS GOBIERNO INSTITUCIONAL: " + passed + " PASADOS, " + failed + " FALLADOS");
  console.log("================================================================================\n");

  if (failed > 0) process.exit(1);
}

runInstitutionalGovernanceTests();
