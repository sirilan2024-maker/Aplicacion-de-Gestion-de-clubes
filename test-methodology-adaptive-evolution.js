/**
 * TESTS DE EVOLUCIÓN METODOLÓGICA E INTELIGENCIA ADAPTATIVA (FASE 6.4)
 * Antigravity Methodology OS
 */

console.log("================================================================================");
console.log("FASE 6.4 — SUITE DE EVOLUCIÓN METODOLÓGICA E INTELIGENCIA ADAPTATIVA");
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

const { classifyEvidenceLevel, analyzeAdaptiveEvolution } = require("./src/lib/methodology/methodologyAdaptiveEvolutionEngine");

function runAdaptiveEvolutionTests() {
  console.log("--- 1. Clasificación Determinista de Evidencia (Regla N < 3) ---");
  assert(classifyEvidenceLevel(0) === "INSUFICIENTE", "Evidencia N=0: INSUFICIENTE");
  assert(classifyEvidenceLevel(2) === "INSUFICIENTE", "Evidencia N=2: INSUFICIENTE");
  assert(classifyEvidenceLevel(3) === "LIMITADA", "Evidencia N=3: LIMITADA");
  assert(classifyEvidenceLevel(8) === "MODERADA", "Evidencia N=8: MODERADA");
  assert(classifyEvidenceLevel(15) === "ROBUSTA", "Evidencia N=15: ROBUSTA");

  console.log("\n--- 2. Análisis de Evolución y Bloqueo de Tendencias N < 3 ---");
  const mockReports = [
    {
      team: { id: "t-insuf", name: "Alevín C" },
      summary: { plannedSessions: 5, completedSessions: 5, evaluatedSessions: 2, avgObjectiveAchievement: 3.5, modelCoveragePercentage: 60 }
    },
    {
      team: { id: "t-valid", name: "Cadete A" },
      summary: { plannedSessions: 10, completedSessions: 7, evaluatedSessions: 6, avgObjectiveAchievement: 3.4, modelCoveragePercentage: 40, decliningBehavioursCount: 2 }
    }
  ];

  const analysis = analyzeAdaptiveEvolution({ teamReports: mockReports });
  
  // Verificación de bloqueo de tendencias para N=2
  const insufTrend = analysis.trends.find(t => t.teamId === "t-insuf");
  assert(insufTrend && insufTrend.type === "INSUFICIENTE", "N<3: Inferencia de tendencias bloqueada");

  // Verificación de detección de desviaciones (7/10 = 70% < 80%)
  const dev = analysis.deviations.find(d => d.teamId === "t-valid");
  assert(dev !== undefined, "Desviaciones: Detectado desajuste planificado vs ejecutado");

  // Verificación de propuestas adaptativas estructuradas
  const prop = analysis.proposals.find(p => p.equipoId === "t-valid");
  assert(prop !== undefined, "Propuestas: Propuesta adaptativa formulada con evidencia");
  assert(prop.alcance === "EQUIPO" && prop.prioridad === 1, "Propuestas: Priorización determinista verificada");

  console.log("\n--- 3. Determinismo Estricto ---");
  const analysisRun2 = analyzeAdaptiveEvolution({ teamReports: mockReports });
  assert(JSON.stringify(analysis) === JSON.stringify(analysisRun2), "Determinismo: Resultado 100% reproducible");

  console.log("\n================================================================================");
  console.log("RESULTADO FASE 6.4 TESTS EVOLUCIÓN ADAPTATIVA: " + passed + " PASADOS, " + failed + " FALLADOS");
  console.log("================================================================================\n");

  if (failed > 0) process.exit(1);
}

runAdaptiveEvolutionTests();
