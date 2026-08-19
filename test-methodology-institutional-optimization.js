/**
 * TESTS DE OPTIMIZACIÓN INSTITUCIONAL Y BENCHMARKING INTERNO (FASE 6.10)
 * Antigravity Methodology OS
 */

console.log("================================================================================");
console.log("FASE 6.10 — SUITE DE OPTIMIZACIÓN INSTITUCIONAL Y BENCHMARKING INTERNO");
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

const { runInstitutionalOptimizationAnalysis } = require("./src/lib/methodology/methodologyInstitutionalOptimizationEngine");

function runOptimizationTests() {
  console.log("--- 1. Benchmarking Interno y Regla N < 3 ---");
  const res = runInstitutionalOptimizationAnalysis({
    clubId: "club-123",
    teamMetrics: [
      { teamId: "t1", teamName: "Cadete A", clubId: "club-123", sampleSize: 10, avgAchievement: 3.6, coveragePercentage: 80, avgRpe: 7.2 },
      { teamId: "t2", teamName: "Infantil A", clubId: "club-123", sampleSize: 2, avgAchievement: 3.0, coveragePercentage: 50, avgRpe: 6.0 }, // N=2
      { teamId: "t3", teamName: "Juvenil B", clubId: "club-123", sampleSize: 8, avgAchievement: 2.2, coveragePercentage: 40, avgRpe: 6.5 }
    ],
    historicalBaseline: { avgAchievement: 3.0, coveragePercentage: 60 }
  });

  const cadete = res.benchmarking.find(b => b.teamId === "t1");
  const infantil = res.benchmarking.find(b => b.teamId === "t2");

  assert(cadete.comparability === "COMPARABLE_ROBUSTA", "Benchmarking: N=10 es COMPARABLE_ROBUSTA");
  assert(infantil.comparability === "EVIDENCIA_INSUFICIENTE", "Regla N<3: N=2 marcado como EVIDENCIA_INSUFICIENTE");

  console.log("\n--- 2. Detección de Oportunidades y Buenas Prácticas ---");
  assert(res.patterns.some(p => p.type === "BUENA_PRACTICA_INTERNA"), "Patrones: Buena práctica detectada en Cadete A");
  assert(res.opportunities.some(o => o.tipo === "OPORTUNIDAD_DE_REPLICACION"), "Oportunidades: Replicación identificada");
  assert(res.opportunities.some(o => o.tipo === "OPORTUNIDAD_DE_REVISION"), "Oportunidades: Revisión identificada en Juvenil B");

  console.log("\n--- 3. Determinismo Estricto ---");
  const resRun2 = runInstitutionalOptimizationAnalysis({
    clubId: "club-123",
    teamMetrics: [
      { teamId: "t1", teamName: "Cadete A", clubId: "club-123", sampleSize: 10, avgAchievement: 3.6, coveragePercentage: 80, avgRpe: 7.2 },
      { teamId: "t2", teamName: "Infantil A", clubId: "club-123", sampleSize: 2, avgAchievement: 3.0, coveragePercentage: 50, avgRpe: 6.0 },
      { teamId: "t3", teamName: "Juvenil B", clubId: "club-123", sampleSize: 8, avgAchievement: 2.2, coveragePercentage: 40, avgRpe: 6.5 }
    ],
    historicalBaseline: { avgAchievement: 3.0, coveragePercentage: 60 }
  });

  assert(JSON.stringify(res) === JSON.stringify(resRun2), "Determinismo: Resultado 100% reproducible");

  console.log("\n================================================================================");
  console.log("RESULTADO FASE 6.10 TESTS OPTIMIZACIÓN INSTITUCIONAL: " + passed + " PASADOS, " + failed + " FALLADOS");
  console.log("================================================================================\n");

  if (failed > 0) process.exit(1);
}

runOptimizationTests();
