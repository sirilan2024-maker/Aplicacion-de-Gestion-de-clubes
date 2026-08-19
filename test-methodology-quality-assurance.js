/**
 * TESTS DE VALIDACIÓN METODOLÓGICA Y CONTROL DE CALIDAD (FASE 6.7)
 * Antigravity Methodology OS
 */

console.log("================================================================================");
console.log("FASE 6.7 — SUITE DE VALIDACIÓN METODOLÓGICA Y GARANTÍA DE CALIDAD");
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

const { assessDataQuality } = require("./src/lib/methodology/methodologyDataQualityEngine");

function runQualityAssuranceTests() {
  console.log("--- 1. Auditoría de Completitud y Consistencia de Datos ---");
  const perfectData = assessDataQuality({
    sessions: [{ id: "s1" }, { id: "s2" }, { id: "s3" }, { id: "s4" }],
    evaluations: [{ objective_achievement: 3 }, { objective_achievement: 3 }, { objective_achievement: 4 }, { objective_achievement: 3 }],
    teamCount: 1,
    clubId: "club-123"
  });

  assert(perfectData.metrics.completenessRate === 100, "Calidad: Completitud 100% calculada");
  assert(perfectData.qualityProfile === "ALTA", "Calidad: Perfil ALTA asignado");
  assert(perfectData.alerts.length === 0, "Calidad: 0 alertas en datos óptimos");

  console.log("\n--- 2. Detección de Inconsistencias y Regla N < 3 ---");
  const flawedData = assessDataQuality({
    sessions: [{ id: "s1" }, { id: "s2" }, { id: "s3" }, { id: "s4" }, { id: "s5" }],
    evaluations: [{ objective_achievement: 5 }, { objective_achievement: 3 }], // N=2 y nota 5 fuera de rango
    teamCount: 1,
    clubId: "club-123"
  });

  assert(flawedData.metrics.invalidScoresCount === 1, "Calidad: Nota fuera de rango [1-4] detectada");
  assert(flawedData.alerts.some(a => a.tipo === "EVIDENCIA_INSUFICIENTE"), "Regla N<3: Alerta de evidencia insuficiente generada (N=2)");
  assert(flawedData.alerts.some(a => a.severidad === "CRITICA"), "Calidad: Severidad CRITICA por inconsistencia");
  assert(flawedData.qualityProfile === "MUY_BAJA", "Calidad: Perfil MUY_BAJA asignado por error crítico");

  console.log("\n--- 3. Determinismo Estricto ---");
  const perfectDataRun2 = assessDataQuality({
    sessions: [{ id: "s1" }, { id: "s2" }, { id: "s3" }, { id: "s4" }],
    evaluations: [{ objective_achievement: 3 }, { objective_achievement: 3 }, { objective_achievement: 4 }, { objective_achievement: 3 }],
    teamCount: 1,
    clubId: "club-123"
  });

  assert(JSON.stringify(perfectData) === JSON.stringify(perfectDataRun2), "Determinismo: Resultado 100% reproducible");

  console.log("\n================================================================================");
  console.log("RESULTADO FASE 6.7 TESTS GARANTÍA DE CALIDAD: " + passed + " PASADOS, " + failed + " FALLADOS");
  console.log("================================================================================\n");

  if (failed > 0) process.exit(1);
}

runQualityAssuranceTests();
