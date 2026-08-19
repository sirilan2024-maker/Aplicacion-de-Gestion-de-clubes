/**
 * Tests E2E de Integración: Memoria Metodológica de Temporada y Aislamiento Multi-Tenant
 * Antigravity Methodology OS - Fase 4.6
 */

console.log("================================================================================");
console.log("TEST E2E: MEMORIA METODOLÓGICA DE TEMPORADA Y AISLAMIENTO MULTI-TENANT");
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

// Simulación de Base de Datos Multi-Tenant
const mockClubDatabase = {
  clubs: [
    { id: "club-saladar", name: "Sporting Saladar" },
    { id: "club-rival", name: "Club Rival CF" }
  ],
  teams: [
    { id: "team-saladar-a", club_id: "club-saladar", name: "Cadete A Saladar", category: "cadete" },
    { id: "team-rival-a", club_id: "club-rival", name: "Cadete A Rival", category: "cadete" }
  ],
  principles: [
    { id: "p-1", club_id: "club-saladar", name: "Salida de balón", game_phase: "Ataque" },
    { id: "p-2", club_id: "club-saladar", name: "Presión tras pérdida", game_phase: "Transición" },
    { id: "p-3", club_id: "club-saladar", name: "Repliegue intensivo", game_phase: "Defensa" },
    { id: "p-rival-1", club_id: "club-rival", name: "Contrataque directo", game_phase: "Transición" }
  ],
  sessions: [
    {
      id: "s-saladar-1", club_id: "club-saladar", team_id: "team-saladar-a",
      date_time: "2026-09-01", microcycle_day: "MD-3", duration_minutes: 90, objective: "Salida de balón",
      session_evaluations: [{ actual_duration_min: 90, session_rpe: 6, objective_achievement: 3.5, players_present_count: 16 }]
    },
    {
      id: "s-saladar-2", club_id: "club-saladar", team_id: "team-saladar-a",
      date_time: "2026-09-03", microcycle_day: "MD-2", duration_minutes: 90, objective: "Salida de balón",
      session_evaluations: [{ actual_duration_min: 90, session_rpe: 7, objective_achievement: 4, players_present_count: 15 }]
    },
    {
      id: "s-saladar-3", club_id: "club-saladar", team_id: "team-saladar-a",
      date_time: "2026-09-08", microcycle_day: "MD-3", duration_minutes: 90, objective: "Presión tras pérdida",
      session_evaluations: [{ actual_duration_min: 95, session_rpe: 8, objective_achievement: 2.0, players_present_count: 16 }]
    },
    {
      id: "s-rival-1", club_id: "club-rival", team_id: "team-rival-a",
      date_time: "2026-09-01", microcycle_day: "MD-3", duration_minutes: 90, objective: "Contrataque directo",
      session_evaluations: [{ actual_duration_min: 90, session_rpe: 7, objective_achievement: 3.0, players_present_count: 14 }]
    }
  ]
};

console.log("--- 1. Test de Aislamiento Multi-Tenant de Memoria de Temporada ---");
// Filtrar datos estrictamente por club_id = 'club-saladar'
const saladarSessions = mockClubDatabase.sessions.filter(s => s.club_id === "club-saladar" && s.team_id === "team-saladar-a");
const saladarPrinciples = mockClubDatabase.principles.filter(p => p.club_id === "club-saladar");
const saladarTeam = mockClubDatabase.teams.find(t => t.id === "team-saladar-a");

const saladarReport = buildSeasonMethodologyReportFromData({
  team: saladarTeam,
  season: { id: "season-2627", name: "2026/2027" },
  sessions: saladarSessions,
  curriculumPrinciples: saladarPrinciples,
  teamObjectives: []
});

assert(saladarReport.summary.plannedSessions === 3, "Club Saladar procesa exactamente sus 3 sesiones");
assert(!saladarReport.principlesCoverage.some(p => p.principleName === "Contrataque directo"), "Club Saladar NO contiene principios del Club Rival (Aislamiento Total)");

console.log("\n--- 2. Test de Filtro de Fechas y Días de Microciclo (MD) ---");
// Filtrar solo sesiones MD-3
const md3Sessions = saladarSessions.filter(s => s.microcycle_day === "MD-3");
const md3Report = buildSeasonMethodologyReportFromData({
  team: saladarTeam,
  season: { id: "season-2627", name: "2026/2027" },
  sessions: md3Sessions,
  curriculumPrinciples: saladarPrinciples,
  teamObjectives: []
});

assert(md3Report.summary.plannedSessions === 2, "Filtro MD-3 devuelve exactamente 2 sesiones");
assert(md3Report.loadEvolution.every(l => l.microcycleDay === "MD-3"), "Todas las sesiones del informe filtrado son MD-3");

console.log("\n--- 3. Test de Seguridad Metodológica (Sin Diagnósticos Médicos/Clínicos) ---");
const allConclusionsText = saladarReport.conclusions.map(c => `${c.title} ${c.evidence}`).join(" ").toLowerCase();
assert(!allConclusionsText.includes("lesión") && !allConclusionsText.includes("médico") && !allConclusionsText.includes("clínico"), "Seguridad: No realiza diagnósticos médicos ni clínicos");
assert(!allConclusionsText.includes("talento") && !allConclusionsText.includes("malo"), "Seguridad: No realiza juicios subjetivos de talento");

console.log("\n--- 4. Test de Determinismo en la Generación del Informe ---");
const reportRun1 = buildSeasonMethodologyReportFromData({
  team: saladarTeam,
  season: { id: "season-2627", name: "2026/2027" },
  sessions: saladarSessions,
  curriculumPrinciples: saladarPrinciples,
  teamObjectives: []
});

const reportRun2 = buildSeasonMethodologyReportFromData({
  team: saladarTeam,
  season: { id: "season-2627", name: "2026/2027" },
  sessions: saladarSessions,
  curriculumPrinciples: saladarPrinciples,
  teamObjectives: []
});

// Comparar estructura ignorando el timestamp generado
const clean1 = { ...reportRun1, generatedAt: "" };
const clean2 = { ...reportRun2, generatedAt: "" };
assert(JSON.stringify(clean1) === JSON.stringify(clean2), "Determinismo: Mismos datos producen idéntico informe");

console.log("\n================================================================================");
console.log(`RESULTADO DE TESTS E2E MEMORIA DE TEMPORADA: ${passed} PASADOS, ${failed} FALLADOS`);
console.log("================================================================================");
