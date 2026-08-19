/**
 * Tests Unitarios: Centro de Dirección Deportiva y Análisis Transversal v1.0
 * Antigravity Methodology OS - Fase 4.9
 */

console.log("================================================================================");
console.log("TESTS UNITARIOS: CENTRO DE DIRECCIÓN DEPORTIVA v1.0");
console.log("================================================================================\n");

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${testName}`);
    failed++;
  }
}

const { 
  evaluateTeamMethodologyStatus,
  calculateClubGlobalKpis,
  buildClubTeamsMatrix,
  generateClubTransversalAlerts,
  calculateClubMonthlyEvolution
} = require("./src/lib/methodology/sportsDirectionService");

console.log("--- 1. Test de Clasificación Matemática del Estado Metodológico ---");

// Caso A: Datos Insuficientes (< 3 sesiones evaluadas)
const statusInsuf = evaluateTeamMethodologyStatus({
  evaluatedSessions: 2,
  evaluationPercentage: 100,
  modelCoveragePercentage: 80,
  avgObjectiveAchievement: 3.5,
  decliningBehavioursCount: 0,
  avgRpe: 6.0
});
assert(statusInsuf.status === 'datos_insuficientes', "Menos de 3 evaluaciones clasificado como 'datos_insuficientes'");

// Caso B: Sólido (Cumple todos los umbrales)
const statusSolid = evaluateTeamMethodologyStatus({
  evaluatedSessions: 5,
  evaluationPercentage: 90,
  modelCoveragePercentage: 75,
  avgObjectiveAchievement: 3.2,
  decliningBehavioursCount: 0,
  avgRpe: 6.5
});
assert(statusSolid.status === 'solido', "Cumplimiento óptimo clasificado como 'solido'");
assert(statusSolid.statusColor === 'emerald', "Color de estado sólido es 'emerald'");

// Caso C: Atención (Baja consecución táctica <= 2.2)
const statusAttn = evaluateTeamMethodologyStatus({
  evaluatedSessions: 5,
  evaluationPercentage: 90,
  modelCoveragePercentage: 75,
  avgObjectiveAchievement: 2.0,
  decliningBehavioursCount: 0,
  avgRpe: 6.5
});
assert(statusAttn.status === 'atencion', "Consecución <= 2.2 clasificado como 'atencion'");

// Caso D: En Seguimiento (Consecución moderada 2.5)
const statusMon = evaluateTeamMethodologyStatus({
  evaluatedSessions: 5,
  evaluationPercentage: 80,
  modelCoveragePercentage: 65,
  avgObjectiveAchievement: 2.5,
  decliningBehavioursCount: 0,
  avgRpe: 6.5
});
assert(statusMon.status === 'en_seguimiento', "Consecución entre 2.3 y 2.79 clasificado como 'en_seguimiento'");

console.log("\n--- 2. Test de KPIs Globales del Club ---");
const mockReports = [
  {
    team: { id: "t-1", name: "Cadete A", category: "cadete" },
    season: { id: "s-1", name: "26/27" },
    summary: {
      plannedSessions: 10, completedSessions: 10, evaluatedSessions: 10,
      evaluationPercentage: 100, modelCoveragePercentage: 80,
      avgObjectiveAchievement: 3.2, avgRpe: 6.5, avgAttendanceRate: 92,
      decliningBehavioursCount: 0, trainedPrinciplesCount: 8, neverTrainedPrinciplesCount: 2
    },
    behaviourEvolution: [], principlesCoverage: [], conclusions: []
  },
  {
    team: { id: "t-2", name: "Cadete B", category: "cadete" },
    season: { id: "s-1", name: "26/27" },
    summary: {
      plannedSessions: 10, completedSessions: 8, evaluatedSessions: 4,
      evaluationPercentage: 40, modelCoveragePercentage: 35,
      avgObjectiveAchievement: 2.1, avgRpe: 8.2, avgAttendanceRate: 85,
      decliningBehavioursCount: 2, trainedPrinciplesCount: 3, neverTrainedPrinciplesCount: 7
    },
    behaviourEvolution: [
      { behaviourDescription: "Perfilación", sampleSize: 4, trend: "declining", firstScore: 3.0, lastScore: 1.5, avgScore: 2.0, percentageVariation: -50 }
    ],
    principlesCoverage: [
      { principleName: "Presión alta", sampleSize: 3, avgAchievement: 2.0, sessionsCount: 3, gamePhase: "Defensa" }
    ],
    conclusions: []
  }
];

const clubKpis = calculateClubGlobalKpis(mockReports);
assert(clubKpis.activeTeamsCount === 2, "KPIs calculan 2 equipos activos");
assert(clubKpis.totalPlannedSessions === 20, "KPIs calculan 20 sesiones planificadas en total");
assert(clubKpis.totalEvaluatedSessions === 14, "KPIs calculan 14 sesiones evaluadas");
assert(clubKpis.globalEvaluationPercentage === 70.0, "Ratio global de evaluación es 70%");
assert(clubKpis.teamsSolidCount === 1, "1 equipo en estado sólido");
assert(clubKpis.teamsAttentionCount === 1, "1 equipo en estado de atención");

console.log("\n--- 3. Test de Generación de Alertas Transversales ---");
const alerts = generateClubTransversalAlerts(mockReports);
assert(alerts.length > 0, "Se detectan alertas transversales para Dirección Deportiva");
assert(alerts.some(a => a.type === 'declining_behaviour'), "Detecta alerta de comportamiento en declive (N >= 3)");
assert(alerts.some(a => a.type === 'low_evaluation_rate'), "Detecta alerta de bajo ratio de evaluación");
assert(alerts.some(a => a.type === 'principle_gap'), "Detecta alerta de baja cobertura de currículo");

console.log("\n--- 4. Test de Evolución Cronológica Mes a Mes ---");
const mockSessionsChronological = [
  { id: "s-sep-1", team_id: "t-1", date_time: "2026-09-10", session_evaluations: [{ session_rpe: 6, objective_achievement: 3.0 }] },
  { id: "s-sep-2", team_id: "t-2", date_time: "2026-09-15", session_evaluations: [{ session_rpe: 7, objective_achievement: 3.5 }] },
  { id: "s-oct-1", team_id: "t-1", date_time: "2026-10-05", session_evaluations: [{ session_rpe: 6, objective_achievement: 3.2 }] }
];

const monthlyEvol = calculateClubMonthlyEvolution(mockSessionsChronological);
assert(monthlyEvol.length === 2, "Genera 2 puntos cronológicos (Septiembre y Octubre)");
assert(monthlyEvol[0].monthKey === "2026-09" && monthlyEvol[0].sessionsCount === 2, "Septiembre contiene 2 sesiones");
assert(monthlyEvol[1].monthKey === "2026-10" && monthlyEvol[1].sessionsCount === 1, "Octubre contiene 1 sesión");

console.log("\n--- 5. Test de Determinismo en Matriz de Equipos ---");
const matrix1 = JSON.stringify(buildClubTeamsMatrix(mockReports));
const matrix2 = JSON.stringify(buildClubTeamsMatrix(mockReports));
assert(matrix1 === matrix2, "La matriz de equipos es 100% determinista");

console.log("\n================================================================================");
console.log(`RESULTADO DE TESTS UNITARIOS DIRECCIÓN DEPORTIVA: ${passed} PASADOS, ${failed} FALLADOS`);
console.log("================================================================================");
