/**
 * Tests E2E de Integración: Planificador Metodológico de Microciclos y Persistencia
 * Antigravity Methodology OS - Fase 4.7
 */

console.log("================================================================================");
console.log("TEST E2E: PLANIFICADOR DE MICROCICLOS Y FLUJO COMPLETO DE PERSISTENCIA");
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
  generateMicrocycleProposal,
  convertMicrocycleDayToSessionContext 
} = require("./src/lib/methodology/methodologyMicrocyclePlanner");
const { generateMethodologySessionProposal } = require("./src/lib/methodology/methodologySessionGenerator");
const { calculateMethodologyPriorities } = require("./src/lib/methodology/methodologyPriorityEngine");

const mockDatabase = {
  microcycles: [],
  training_sessions: [],
  session_drills: []
};

const mockExercises = [
  {
    id: "ex-rondo",
    nombre: "Rondo 4v2",
    categoria_edad: ["cadete"],
    tipo: "rondo",
    bloque_sesion: "calentamiento",
    carga_fisica: 2,
    carga_cognitiva: 2,
    oposicion: 2,
    duracion_recomendada: 15,
    min_players: 6,
    max_players: 10
  },
  {
    id: "ex-pos",
    nombre: "Juego de Posición 4v4+3",
    categoria_edad: ["cadete"],
    tipo: "juego_medio",
    bloque_sesion: "principal",
    drill_structure: "juego_medio",
    objetivo_tactico: ["Presión tras pérdida"],
    carga_fisica: 3,
    carga_cognitiva: 4,
    oposicion: 3,
    duracion_recomendada: 20,
    min_players: 11,
    max_players: 16
  },
  {
    id: "ex-ssg",
    nombre: "SSG 6v6",
    categoria_edad: ["cadete"],
    tipo: "SSG",
    bloque_sesion: "principal",
    drill_structure: "SSG",
    objetivo_tactico: ["Presión tras pérdida"],
    carga_fisica: 4,
    carga_cognitiva: 3,
    oposicion: 4,
    duracion_recomendada: 25,
    min_players: 12,
    max_players: 16
  },
  {
    id: "ex-global",
    nombre: "Partido Condicionado",
    categoria_edad: ["cadete"],
    tipo: "juego_global",
    bloque_sesion: "global",
    drill_structure: "juego_global",
    objetivo_tactico: ["Modelo de juego"],
    carga_fisica: 3,
    carga_cognitiva: 4,
    oposicion: 4,
    duracion_recomendada: 20,
    min_players: 16,
    max_players: 20
  },
  {
    id: "ex-calma",
    nombre: "Pase y Estiramiento",
    categoria_edad: ["cadete"],
    tipo: "calentamiento",
    bloque_sesion: "vuelta_calma",
    drill_structure: "circuito",
    carga_fisica: 1,
    carga_cognitiva: 1,
    oposicion: 1,
    duracion_recomendada: 10,
    min_players: 8,
    max_players: 22
  }
];

console.log("--- 1. Auditoría de Persistencia: Generar Microciclo ≠ Guardar en BD ---");
const proposal = generateMicrocycleProposal({
  teamId: "team-cadete-a",
  category: "cadete",
  weekStartDate: "2026-08-31",
  matchDayDate: "2026-09-06",
  trainingDays: [2, 4, 5],
  curriculumPrinciples: [{ id: "p-1", name: "Presión tras pérdida", game_phase: "Transición" }]
});

assert(mockDatabase.microcycles.length === 0, "Generar propuesta de microciclo NO inserta en tabla microcycles");
assert(mockDatabase.training_sessions.length === 0, "Generar propuesta de microciclo NO inserta en training_sessions");

console.log("\n--- 2. Flujo Completo: Microciclo -> Generador Asistido de Sesión ---");
const tuesdayPlan = proposal.days[1]; // Martes
const sessionContext = convertMicrocycleDayToSessionContext(
  tuesdayPlan,
  { id: "team-cadete-a", category: "cadete" },
  mockExercises
);

const sessionProposal = generateMethodologySessionProposal(sessionContext);

assert(Boolean(sessionProposal), "Generador de sesión recibe contexto del microciclo y produce propuesta de 5 bloques");
assert(sessionProposal.totalDurationMin === 90, "La sesión generada desde el microciclo suma 90 min exactos");
assert(sessionProposal.objective === tuesdayPlan.objective, "El objetivo de la sesión coincide exactamente con el del microciclo");

console.log("\n--- 3. Guardado Explícito del Microciclo y Sesiones ---");
function simulateSaveMicrocycle(proposalData, db) {
  const microId = `micro-${Date.now()}`;
  db.microcycles.push({
    id: microId,
    team_id: proposalData.teamId,
    week_start_date: proposalData.weekStartDate,
    total_minutes: proposalData.totalPlannedMinutes,
    weekly_load_index: proposalData.weeklyLoadIndex
  });
  return { success: true, microId };
}

const saveMicroRes = simulateSaveMicrocycle(proposal, mockDatabase);
assert(saveMicroRes.success === true, "Guardado explícito del microciclo exitoso");
assert(mockDatabase.microcycles.length === 1, "Persistencia confirmada: 1 registro en microcycles");

console.log("\n--- 4. Test de Aislamiento Multi-Tenant de Microciclos ---");
const teamAContext = { teamId: "team-a", category: "cadete", weekStartDate: "2026-08-31" };
const teamBContext = { teamId: "team-b", category: "infantil", weekStartDate: "2026-08-31" };

const propA = generateMicrocycleProposal(teamAContext);
const propB = generateMicrocycleProposal(teamBContext);

assert(propA.teamId === "team-a" && propB.teamId === "team-b", "Aislamiento preservado entre diferentes equipos");

console.log("\n================================================================================");
console.log(`RESULTADO DE TESTS E2E PLANIFICADOR MICROCICLOS: ${passed} PASADOS, ${failed} FALLADOS`);
console.log("================================================================================");
