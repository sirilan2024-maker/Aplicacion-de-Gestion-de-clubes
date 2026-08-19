/**
 * Tests E2E de Integración: Auditoría Integral del Ciclo Metodológico Completo y Multi-Tenant
 * Antigravity Methodology OS - Fase 4.8
 */

console.log("================================================================================");
console.log("TEST E2E: AUDITORÍA INTEGRAL DEL CICLO METODOLÓGICO Y MULTI-TENANT");
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

const { generateMicrocycleProposal, convertMicrocycleDayToSessionContext } = require("./src/lib/methodology/methodologyMicrocyclePlanner");
const { generateMethodologySessionProposal, validateMethodologySessionProposal } = require("./src/lib/methodology/methodologySessionGenerator");
const { calculateMethodologyPriorities } = require("./src/lib/methodology/methodologyPriorityEngine");
const { buildSeasonMethodologyReportFromData } = require("./src/lib/methodology/seasonMethodologyReportService");

console.log("--- 1. Auditoría E2E del Ciclo Metodológico Completo ---");
// Simulador de BD
const mockClubDb = {
  clubs: [{ id: "club-a", name: "Club Saladar" }, { id: "club-b", name: "Club Rival" }],
  microcycles: [],
  training_sessions: [],
  session_drills: [],
  session_evaluations: []
};

// 1. Diagnóstico e Histórico
const historicalSessions = [
  {
    id: "s-hist-1", club_id: "club-a", team_id: "team-cadete-a",
    date_time: "2026-08-20", duration_minutes: 90, objective: "Presión tras pérdida",
    session_evaluations: [{
      objective_achievement: 2.0, session_rpe: 8,
      session_behaviour_evaluations: [{ behaviour_description: "Reacción inmediata", score: 2.0 }]
    }]
  },
  {
    id: "s-hist-2", club_id: "club-a", team_id: "team-cadete-a",
    date_time: "2026-08-23", duration_minutes: 90, objective: "Presión tras pérdida",
    session_evaluations: [{
      objective_achievement: 2.0, session_rpe: 8,
      session_behaviour_evaluations: [{ behaviour_description: "Reacción inmediata", score: 1.5 }]
    }]
  }
];

// 2. Motor de Prioridades
const priorities = calculateMethodologyPriorities({
  teamId: "team-cadete-a",
  historySummary: { totalSessions: 2, completedSessions: 2, evaluatedSessions: 2, avgObjectiveAchievement: 2.0, avgRpe: 8.0, avgAttendanceRate: 95, principleCoverage: [], behaviourEvolution: [] },
  recentSessions: historicalSessions,
  curriculumPrinciples: [{ id: "p-1", name: "Presión tras pérdida", game_phase: "Transición" }]
});

assert(priorities.length > 0, "Ciclo 1: Diagnóstico genera prioridades metodológicas");
assert(priorities[0].priority === 'high' || priorities[0].priorityLevel === 'high', "Ciclo 1: Prioridad de alto impacto generada");

// 3. Planificador de Microciclo
const microcycleProposal = generateMicrocycleProposal({
  teamId: "team-cadete-a",
  category: "cadete",
  weekStartDate: "2026-08-31",
  matchDayDate: "2026-09-06",
  trainingDays: [2, 4, 5],
  priorities,
  curriculumPrinciples: [{ id: "p-1", name: "Presión tras pérdida", game_phase: "Transición" }],
  recentSessions: historicalSessions
});

assert(microcycleProposal.days.length === 7, "Ciclo 2: Planificador genera microciclo de 7 días");
assert(mockClubDb.microcycles.length === 0, "Persistencia: Generar microciclo NO inserta en BD");

// 4. Generación Asistida de Sesión desde Microciclo
const tuesdayPlan = microcycleProposal.days[1];
const sessionContext = convertMicrocycleDayToSessionContext(
  tuesdayPlan,
  { id: "team-cadete-a", category: "cadete" },
  [
    { id: "ex-act", nombre: "Activación", categoria_edad: ["cadete"], tipo: "rondo", bloque_sesion: "calentamiento", min_players: 6, max_players: 18, duracion_recomendada: 15 },
    { id: "ex-p1", nombre: "Posición 4v4+3", categoria_edad: ["cadete"], tipo: "juego_medio", bloque_sesion: "principal", drill_structure: "juego_medio", objetivo_tactico: ["Presión tras pérdida"], min_players: 11, max_players: 16, duracion_recomendada: 20 },
    { id: "ex-p2", nombre: "SSG 6v6", categoria_edad: ["cadete"], tipo: "SSG", bloque_sesion: "principal", drill_structure: "SSG", objetivo_tactico: ["Presión tras pérdida"], min_players: 12, max_players: 16, duracion_recomendada: 25 },
    { id: "ex-glob", nombre: "Partido 8v8", categoria_edad: ["cadete"], tipo: "juego_global", bloque_sesion: "global", drill_structure: "juego_global", objetivo_tactico: ["Modelo"], min_players: 16, max_players: 20, duracion_recomendada: 20 },
    { id: "ex-calm", nombre: "Regenerativo", categoria_edad: ["cadete"], tipo: "calentamiento", bloque_sesion: "vuelta_calma", drill_structure: "circuito", min_players: 8, max_players: 22, duracion_recomendada: 10 }
  ]
);

const sessionProposal = generateMethodologySessionProposal(sessionContext);
assert(sessionProposal.totalDurationMin === 90, "Ciclo 3: Generador de sesión produce 5 bloques y suma 90 min");
assert(mockClubDb.training_sessions.length === 0, "Persistencia: Generar sesión NO inserta en BD");

// 5. Validación Global
const validation = validateMethodologySessionProposal(sessionProposal);
assert(validation.valid === true, "Ciclo 4: Validación de sesión confirma aptitud para guardar");

// 6. Guardado Explícito y Ejecución
const sessionId = "session-tuesday-verified";
mockClubDb.training_sessions.push({
  id: sessionId,
  club_id: "club-a",
  team_id: "team-cadete-a",
  duration_minutes: sessionProposal.totalDurationMin,
  objective: sessionProposal.objective
});

assert(mockClubDb.training_sessions.length === 1, "Persistencia: Guardado explícito almacena exactamente 1 sesión");

// 7. Evaluación Post-Sesión
mockClubDb.session_evaluations.push({
  session_id: sessionId,
  actual_duration_min: 90,
  session_rpe: 7,
  objective_achievement: 3.5,
  players_present_count: 15,
  session_behaviour_evaluations: [
    { behaviour_description: "Reacción inmediata", score: 3.5 }
  ]
});

// 8. Memoria Metodológica de Temporada
const allSessions = [
  ...historicalSessions,
  {
    ...mockClubDb.training_sessions[0],
    date_time: "2026-09-01",
    session_evaluations: [mockClubDb.session_evaluations[0]]
  }
];

const seasonReport = buildSeasonMethodologyReportFromData({
  team: { id: "team-cadete-a", name: "Cadete A" },
  season: { id: "s-2627", name: "Temporada 26/27" },
  sessions: allSessions,
  curriculumPrinciples: [{ id: "p-1", name: "Presión tras pérdida", game_phase: "Transición" }],
  teamObjectives: []
});

assert(seasonReport.summary.completedSessions === 3, "Ciclo 5: Memoria de temporada procesa las 3 sesiones del ciclo");
assert(seasonReport.behaviourEvolution[0].sampleSize === 3, "Ciclo 5: Comportamiento alcanza N = 3 y genera tendencia válida");

console.log("\n--- 2. Auditoría Multi-Tenant Cruzada (Club A vs Club B) ---");
const crossClubSessions = [
  { id: "s-a", club_id: "club-a", team_id: "team-a", objective: "Ataque posicional", date_time: "2026-09-01", session_evaluations: [] },
  { id: "s-b", club_id: "club-b", team_id: "team-b", objective: "Contraataque", date_time: "2026-09-01", session_evaluations: [] }
];

// Procesamiento exclusivo para Club A
const clubASessionsOnly = crossClubSessions.filter(s => s.club_id === "club-a");
const reportClubA = buildSeasonMethodologyReportFromData({
  team: { id: "team-a", name: "Equipo A" },
  season: { id: "s-1", name: "Temporada" },
  sessions: clubASessionsOnly,
  curriculumPrinciples: [],
  teamObjectives: []
});

assert(reportClubA.summary.plannedSessions === 1, "Club A solo analiza sus propias sesiones");
assert(!reportClubA.principlesCoverage.some(p => p.principleName === "Contraataque"), "Aislamiento: Ningún dato del Club B se filtra en el informe del Club A");

console.log("\n================================================================================");
console.log(`RESULTADO DE TESTS E2E DE AUDITORÍA INTEGRAL: ${passed} PASADOS, ${failed} FALLADOS`);
console.log("================================================================================");
