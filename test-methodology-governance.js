/**
 * TESTS DE GOBERNANZA METODOLÓGICA Y SUPERVISIÓN MULTIEQUIPO (FASE 6.1)
 * Antigravity Methodology OS
 */

console.log("================================================================================");
console.log("FASE 6.1 — SUITE DE GOBERNANZA METODOLÓGICA Y ANÁLISIS MULTIEQUIPO");
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
  calculateClubGlobalKpis,
  buildClubTeamsMatrix,
  evaluateTeamMethodologyStatus,
  generateClubTransversalAlerts
} = require("./src/lib/methodology/sportsDirectionService");

function runGovernanceTests() {
  console.log("--- 1. Cálculo de KPIs Globales de Gobernanza ---");
  const mockReports = [
    {
      team: { id: "t1", name: "Cadete A", category: "cadete" },
      summary: { plannedSessions: 10, completedSessions: 10, evaluatedSessions: 8, evaluationPercentage: 80, avgObjectiveAchievement: 3.2, avgRpe: 6.5, avgAttendanceRate: 90, modelCoveragePercentage: 75, decliningBehavioursCount: 0 }
    },
    {
      team: { id: "t2", name: "Infantil B", category: "infantil" },
      summary: { plannedSessions: 10, completedSessions: 8, evaluatedSessions: 2, evaluationPercentage: 20, avgObjectiveAchievement: 2.0, avgRpe: 5.5, avgAttendanceRate: 85, modelCoveragePercentage: 30, decliningBehavioursCount: 0 }
    }
  ];

  const kpis = calculateClubGlobalKpis(mockReports);
  assert(kpis.activeTeamsCount === 2, "Gobernanza: 2 equipos auditados");
  assert(kpis.teamsSolidCount === 1, "Gobernanza: 1 equipo sólido");
  assert(kpis.teamsInsufficientDataCount === 1, "Gobernanza: 1 equipo con datos insuficientes (N=2)");

  console.log("\n--- 2. Matriz Multiequipo y Clasificación de Salud Metodológica ---");
  const matrix = buildClubTeamsMatrix(mockReports);
  assert(matrix.length === 2, "Matriz: 2 filas generadas");
  assert(matrix[0].statusDetail.status === 'solido', "Matriz: Cadete A calificado como sólido");
  assert(matrix[1].statusDetail.status === 'datos_insuficientes', "Matriz: Infantil B calificado como datos insuficientes");

  console.log("\n--- 3. Generación de Alertas Transversales de Dirección ---");
  const alerts = generateClubTransversalAlerts(mockReports);
  assert(alerts.some(a => a.teamId === 't2'), "Alertas: Alerta generada para equipo en atención/datos insuficientes");

  console.log("\n================================================================================");
  console.log("RESULTADO FASE 6.1 TESTS GOBERNANZA: " + passed + " PASADOS, " + failed + " FALLADOS");
  console.log("================================================================================\n");

  if (failed > 0) process.exit(1);
}

runGovernanceTests();
