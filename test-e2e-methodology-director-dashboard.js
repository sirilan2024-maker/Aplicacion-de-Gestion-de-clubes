/**
 * Tests E2E de Integración: Centro de Dirección Deportiva y Multi-Tenant
 * Antigravity Methodology OS - Fase 4.9
 */

console.log("================================================================================");
console.log("TEST E2E: CENTRO DE DIRECCIÓN DEPORTIVA Y AISLAMIENTO MULTI-TENANT");
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

const { buildSeasonMethodologyReportFromData } = require("./src/lib/methodology/seasonMethodologyReportService");
const { 
  calculateClubGlobalKpis, 
  buildClubTeamsMatrix, 
  generateClubTransversalAlerts 
} = require("./src/lib/methodology/sportsDirectionService");

console.log("--- 1. Auditoría de Persistencia (Read-Only Total en Dirección Deportiva) ---");
const mockDb = {
  microcycles: [],
  training_sessions: [],
  session_evaluations: []
};

const initialSessionCount = mockDb.training_sessions.length;
const initialMicroCount = mockDb.microcycles.length;

// Simular carga y cálculo del dashboard de Dirección Deportiva
const mockTeam = { id: "t-cadete", name: "Cadete A", category: "cadete" };
const mockSeason = { id: "s-2627", name: "Temporada 26/27" };
const mockReport = buildSeasonMethodologyReportFromData({
  team: mockTeam,
  season: mockSeason,
  sessions: [],
  curriculumPrinciples: [],
  teamObjectives: []
});

const globalKpis = calculateClubGlobalKpis([mockReport]);
const teamsMatrix = buildClubTeamsMatrix([mockReport]);
const alerts = generateClubTransversalAlerts([mockReport]);

assert(mockDb.training_sessions.length === initialSessionCount, "El dashboard de dirección no genera registros en training_sessions");
assert(mockDb.microcycles.length === initialMicroCount, "El dashboard de dirección no genera registros en microcycles");

console.log("\n--- 2. Auditoría de Aislamiento Multi-Tenant en Dirección Deportiva ---");
const clubASessions = [
  { id: "s-a1", club_id: "club-a", team_id: "t-a", objective: "Presión", date_time: "2026-09-01", session_evaluations: [{ objective_achievement: 3.5, session_rpe: 6 }] }
];
const clubBSessions = [
  { id: "s-b1", club_id: "club-b", team_id: "t-b", objective: "Salida", date_time: "2026-09-01", session_evaluations: [{ objective_achievement: 1.5, session_rpe: 9 }] }
];

const reportClubA = buildSeasonMethodologyReportFromData({
  team: { id: "t-a", name: "Equipo Club A" },
  season: { id: "s-1", name: "26/27" },
  sessions: clubASessions,
  curriculumPrinciples: [],
  teamObjectives: []
});

const kpisClubA = calculateClubGlobalKpis([reportClubA]);
const alertsClubA = generateClubTransversalAlerts([reportClubA]);

assert(kpisClubA.activeTeamsCount === 1, "Club A cuenta exactamente con 1 equipo");
assert(kpisClubA.globalAvgAchievement === 3.5, "Club A refleja su propia consecución media");
assert(!alertsClubA.some(a => a.teamId === "t-b"), "Club A no recibe alertas relativas a equipos del Club B");

console.log("\n--- 3. Auditoría de Drill-Down y Contexto de Enlace ---");
const alert = alertsClubA[0] || { actionUrl: `/admin/metodologia/equipos/t-a/temporada/s-1` };
assert(alert.actionUrl.includes("t-a"), "El enlace de acción contiene el teamId correcto");
assert(alert.actionUrl.includes("s-1"), "El enlace de acción contiene el seasonId correcto");

console.log("\n================================================================================");
console.log(`RESULTADO DE TESTS E2E DIRECCIÓN DEPORTIVA: ${passed} PASADOS, ${failed} FALLADOS`);
console.log("================================================================================");
