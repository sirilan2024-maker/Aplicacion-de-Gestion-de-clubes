/**
 * Tests Unitarios: Comparativa Metodológica de Equipos v1.0
 * Antigravity Methodology OS - Fase 4.9
 */

console.log("================================================================================");
console.log("TESTS UNITARIOS: COMPARATIVA METODOLÓGICA ENTRE EQUIPOS v1.0");
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

const { compareSpecificTeams } = require("./src/lib/methodology/sportsDirectionService");

const mockReports = [
  {
    team: { id: "t-cad-a", name: "Cadete A", category: "cadete" },
    season: { id: "s-1", name: "26/27" },
    summary: {
      plannedSessions: 12, completedSessions: 12, evaluatedSessions: 12,
      evaluationPercentage: 100, modelCoveragePercentage: 85,
      avgObjectiveAchievement: 3.4, avgRpe: 6.8, avgAttendanceRate: 94,
      decliningBehavioursCount: 0
    },
    principlesCoverage: [
      { principleName: "Salida de balón", classification: "muy_trabajado", sessionsCount: 6, avgAchievement: 3.5 },
      { principleName: "Presión alta", classification: "trabajado", sessionsCount: 4, avgAchievement: 3.2 },
      { principleName: "Repliegue intensivo", classification: "nunca_trabajado", sessionsCount: 0, avgAchievement: 0 }
    ],
    behaviourEvolution: [
      { behaviourDescription: "Perfilación corporal", trend: "improving", sampleSize: 5, avgScore: 3.6 }
    ],
    conclusions: [{ type: "strength", title: "Dominio de inicio de juego" }]
  },
  {
    team: { id: "t-cad-b", name: "Cadete B", category: "cadete" },
    season: { id: "s-1", name: "26/27" },
    summary: {
      plannedSessions: 12, completedSessions: 10, evaluatedSessions: 8,
      evaluationPercentage: 66.7, modelCoveragePercentage: 50,
      avgObjectiveAchievement: 2.4, avgRpe: 7.2, avgAttendanceRate: 88,
      decliningBehavioursCount: 1
    },
    principlesCoverage: [
      { principleName: "Salida de balón", classification: "poco_trabajado", sessionsCount: 2, avgAchievement: 2.2 },
      { principleName: "Presión alta", classification: "nunca_trabajado", sessionsCount: 0, avgAchievement: 0 },
      { principleName: "Repliegue intensivo", classification: "nunca_trabajado", sessionsCount: 0, avgAchievement: 0 }
    ],
    behaviourEvolution: [
      { behaviourDescription: "Perfilación corporal", trend: "declining", sampleSize: 4, avgScore: 2.0 }
    ],
    conclusions: [{ type: "risk", title: "Baja consecución en salida de balón" }]
  }
];

console.log("--- 1. Test de Comparación Específica entre Equipos Seleccionados ---");
const comparison = compareSpecificTeams(mockReports, ["t-cad-a", "t-cad-b"]);

assert(comparison.length === 2, "La comparación devuelve exactamente los 2 equipos seleccionados");
assert(comparison[0].teamName === "Cadete A", "Identifica al Cadete A");
assert(comparison[1].teamName === "Cadete B", "Identifica al Cadete B");

console.log("\n--- 2. Test de Contraste Metodológico de Principios y Conductas ---");
const cadA = comparison[0];
const cadB = comparison[1];

assert(cadA.principlesTrained.length === 2, "Cadete A tiene 2 principios trabajados");
assert(cadB.principlesTrained.length === 1, "Cadete B tiene 1 principio trabajado");
assert(cadA.improvingBehaviours.length === 1, "Cadete A tiene 1 conducta en mejora");
assert(cadB.decliningBehaviours.length === 1, "Cadete B tiene 1 conducta en declive");

console.log("\n--- 3. Test de Aislamiento de Selección ---");
const singleComp = compareSpecificTeams(mockReports, ["t-cad-a"]);
assert(singleComp.length === 1 && singleComp[0].teamId === "t-cad-a", "Filtra estrictamente por los IDs seleccionados");

console.log("\n================================================================================");
console.log(`RESULTADO DE TESTS UNITARIOS COMPARATIVA DE EQUIPOS: ${passed} PASADOS, ${failed} FALLADOS`);
console.log("================================================================================");
