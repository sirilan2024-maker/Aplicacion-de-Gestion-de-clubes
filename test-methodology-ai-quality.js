/**
 * TESTS DE CALIDAD DE IA Y CONTRATO ESTRUCTURAL (FASE 5.7)
 * Antigravity Methodology OS
 */

console.log("================================================================================");
console.log("FASE 5.7 — TESTS DE CALIDAD Y AUDITORÍA DE RESPUESTA IA");
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

const { auditAIResponseQuality } = require("./src/lib/methodology/ai/methodologyAIQualityService");

function runTests() {
  console.log("--- 1. Respuesta IA Completa y Conforme ---");
  const validRes = {
    answer: "El equipo Infantil A mantiene una progresión adecuada según las reglas institucionales.",
    facts: ["4 sesiones evaluadas", "Consecución 3.2/4"],
    interpretations: ["Asimilación positiva"],
    recommendations: ["Continuar"],
    evidence: [{ metric: "Consecución", value: 3.2, reference: "Infantil A" }],
    dataSufficiency: { sufficient: true, sampleSize: 4 }
  };

  const auditValid = auditAIResponseQuality(validRes);
  assert(auditValid.isCompliant === true, "Calidad: Respuesta conforme");
  assert(auditValid.qualityScore === 100, "Calidad: Score 100");

  console.log("\n--- 2. Detección de Violación de Regla N < 3 ---");
  const invalidNRes = {
    answer: "Tendencia confirmada",
    facts: ["1 sesión evaluada"],
    interpretations: ["Mejora"],
    recommendations: [],
    evidence: [{ metric: "RPE", value: 6, reference: "T1" }],
    dataSufficiency: { sufficient: true, sampleSize: 1 } // Inválido: N=1 y sufficient=true
  };

  const auditN = auditAIResponseQuality(invalidNRes);
  assert(auditN.isCompliant === false, "Calidad: Detecta violación de N < 3");
  assert(auditN.issues.some(i => i.includes("Regla N < 3")), "Calidad: Mensaje de error explícito para N < 3");

  console.log("\n--- 3. Detección de Lenguaje Imperativo / Autoritario ---");
  const authoritarianRes = {
    answer: "Debes cambiar inmediatamente el microciclo y tienes que aplicar carga alta.",
    facts: ["Hecho 1"],
    interpretations: [],
    recommendations: [],
    evidence: [{ metric: "E", value: 1, reference: "T" }],
    dataSufficiency: { sufficient: true, sampleSize: 4 }
  };

  const auditAuth = auditAIResponseQuality(authoritarianRes);
  assert(auditAuth.isCompliant === false, "Calidad: Detecta lenguaje autoritario no consultivo");

  console.log("\n================================================================================");
  console.log("RESULTADO FASE 5.7 TESTS CALIDAD IA: " + passed + " PASADOS, " + failed + " FALLADOS");
  console.log("================================================================================\n");

  if (failed > 0) process.exit(1);
}

runTests();
