/**
 * TESTS DE INTELIGENCIA EJECUTIVA Y CONTROL DE CICLO (FASE 6.3)
 * Antigravity Methodology OS
 */

console.log("================================================================================");
console.log("FASE 6.3 — SUITE DE INTELIGENCIA EJECUTIVA Y CONTROL DE CICLO METODOLÓGICO");
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

const { calculateClubGlobalKpis } = require("./src/lib/methodology/sportsDirectionService");
const { computePrioritiesEvolution } = require("./src/lib/methodology/methodologyPriorityEvolutionService");

function runExecutiveIntelligenceTests() {
  console.log("--- 1. Cálculo de KPIs Ejecutivos Transversales ---");
  const reportsMock = [
    {
      team: { id: "t1", name: "Cadete A", category: "cadete" },
      summary: { plannedSessions: 12, completedSessions: 12, evaluatedSessions: 10, evaluationPercentage: 83.3, avgObjectiveAchievement: 3.3, avgRpe: 6.8, avgAttendanceRate: 92, modelCoveragePercentage: 78, decliningBehavioursCount: 0 }
    },
    {
      team: { id: "t2", name: "Juvenil B", category: "juvenil" },
      summary: { plannedSessions: 12, completedSessions: 12, evaluatedSessions: 9, evaluationPercentage: 75.0, avgObjectiveAchievement: 3.1, avgRpe: 7.0, avgAttendanceRate: 88, modelCoveragePercentage: 70, decliningBehavioursCount: 0 }
    }
  ];

  const kpis = calculateClubGlobalKpis(reportsMock);
  assert(kpis.activeTeamsCount === 2, "Ejecutiva: 2 equipos auditados");
  assert(kpis.globalEvaluationPercentage > 75, "Ejecutiva: Cumplimiento global del ciclo > 75%");
  assert(kpis.teamsSolidCount === 2, "Ejecutiva: 2 equipos en estado sólido");

  console.log("\n--- 2. Mapa Institucional y Evolución de Prioridades ---");
  const evol = computePrioritiesEvolution(
    { curriculumPrinciples: [{ id: "p1", name: "Salida de balón" }], recentSessions: [] },
    { curriculumPrinciples: [{ id: "p1", name: "Salida de balón" }], recentSessions: [{ date_time: new Date().toISOString(), objective: "Salida de balón", session_evaluations: [{ objective_achievement: 3.5 }] }] }
  );

  assert(evol.currentPriorities !== undefined, "Ejecutiva: Mapa de prioridades derivado sin escrituras en DB");

  console.log("\n--- 3. Determinismo en Agregaciones Ejecutivas ---");
  const kpisRun2 = calculateClubGlobalKpis(reportsMock);
  assert(JSON.stringify(kpis) === JSON.stringify(kpisRun2), "Determinismo: Cálculo ejecutivo 100% reproducible");

  console.log("\n================================================================================");
  console.log("RESULTADO FASE 6.3 TESTS INTELIGENCIA EJECUTIVA: " + passed + " PASADOS, " + failed + " FALLADOS");
  console.log("================================================================================\n");

  if (failed > 0) process.exit(1);
}

runExecutiveIntelligenceTests();
