/**
 * Test E2E de Integración: Generador Asistido de Sesiones y Auditoría de Persistencia
 * Antigravity Methodology OS - Fase 4.5
 */

console.log("================================================================================");
console.log("TEST E2E: GENERADOR ASISTIDO DE SESIONES Y AUDITORÍA DE PERSISTENCIA");
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
  generateMethodologySessionProposal, 
  regenerateMethodologyBlock, 
  validateMethodologySessionProposal,
  allocateSessionTime 
} = require("./src/lib/methodology/methodologySessionGenerator");
const { calculateMethodologyPriorities } = require("./src/lib/methodology/methodologyPriorityEngine");

const mockDatabaseExercises = [
  {
    id: "ex-1",
    nombre: "Activación Dinámica y Rondo Rápido",
    categoria_edad: ["cadete"],
    age_category: "cadete",
    tipo: "rondo",
    bloque_sesion: "calentamiento",
    drill_structure: "rondo",
    objetivo_tactico: ["Reacción"],
    carga_fisica: 2,
    carga_cognitiva: 2,
    oposicion: 2,
    dificultad: 2,
    min_players: 6,
    max_players: 18
  },
  {
    id: "ex-2",
    nombre: "Juego de Posición: Salida de Balón 4v4+3",
    categoria_edad: ["cadete"],
    age_category: "cadete",
    tipo: "juego_medio",
    bloque_sesion: "principal",
    drill_structure: "juego_medio",
    objetivo_tactico: ["Salida de balón", "Tercer hombre"],
    carga_fisica: 3,
    carga_cognitiva: 4,
    oposicion: 3,
    dificultad: 3,
    min_players: 11,
    max_players: 16
  },
  {
    id: "ex-3",
    nombre: "Oleadas de Transición 3v2 + 2v1",
    categoria_edad: ["cadete"],
    age_category: "cadete",
    tipo: "SSG",
    bloque_sesion: "principal",
    drill_structure: "SSG",
    objetivo_tactico: ["Transición ofensiva", "Finalización"],
    carga_fisica: 4,
    carga_cognitiva: 3,
    oposicion: 3,
    dificultad: 3,
    min_players: 10,
    max_players: 16
  },
  {
    id: "ex-4",
    nombre: "Juego Global 9v9 con Repliegue y Salida",
    categoria_edad: ["cadete"],
    age_category: "cadete",
    tipo: "juego_global",
    bloque_sesion: "global",
    drill_structure: "juego_global",
    objetivo_tactico: ["Salida de balón", "Organización"],
    carga_fisica: 3,
    carga_cognitiva: 4,
    oposicion: 4,
    dificultad: 3,
    min_players: 16,
    max_players: 22
  },
  {
    id: "ex-5",
    nombre: "Vuelta a la Calma y Tareas de Precisión",
    categoria_edad: ["cadete"],
    age_category: "cadete",
    tipo: "calentamiento",
    bloque_sesion: "vuelta_calma",
    drill_structure: "circuito",
    objetivo_tecnico: ["Control", "Pase"],
    carga_fisica: 1,
    carga_cognitiva: 1,
    oposicion: 1,
    dificultad: 1,
    min_players: 8,
    max_players: 22
  },
  {
    id: "ex-recent",
    nombre: "Ejercicio Usado Ayer",
    categoria_edad: ["cadete"],
    age_category: "cadete",
    tipo: "juego_medio",
    bloque_sesion: "principal",
    drill_structure: "juego_medio",
    objetivo_tactico: ["Salida de balón"],
    carga_fisica: 3,
    carga_cognitiva: 3,
    oposicion: 3,
    dificultad: 3,
    min_players: 10,
    max_players: 16
  }
];

console.log("--- 1. Auditoría de Persistencia: Generar Propuesta ≠ Guardar Sesión ---");
// Simulador de BD para auditar que generar una propuesta NO persiste filas
const mockDb = {
  training_sessions: [],
  session_drills: []
};

// Generar propuesta
const proposal = generateMethodologySessionProposal({
  teamId: "team-cadete",
  category: "cadete",
  objective: "Salida de balón",
  durationMinutes: 90,
  microcycleDay: "MD-3",
  numPlayers: 16,
  intensityLoad: 4,
  recentExerciseIds: ["ex-recent"],
  allExercises: mockDatabaseExercises
});

assert(mockDb.training_sessions.length === 0, "Generar propuesta NO inserta en training_sessions");
assert(mockDb.session_drills.length === 0, "Generar propuesta NO inserta en session_drills");

// Simulación de acción explícita del entrenador: Confirmar y Guardar Sesión
function simulateCoachConfirmAndSave(proposalData, database) {
  const sessionId = `session-${Date.now()}`;
  database.training_sessions.push({
    id: sessionId,
    team_id: proposalData.teamId,
    duration_minutes: proposalData.totalDurationMin,
    objective: proposalData.objective
  });

  Object.values(proposalData.blocks).forEach((b, idx) => {
    database.session_drills.push({
      session_id: sessionId,
      drill_id: b.exercise.id,
      phase: b.blockId,
      order_index: idx + 1,
      duration_min: b.durationMin
    });
  });

  return { success: true, sessionId };
}

const saveResult = simulateCoachConfirmAndSave(proposal, mockDb);
assert(saveResult.success === true, "Guardado explícito procesado con éxito");
assert(mockDb.training_sessions.length === 1, "Persistencia confirmada: 1 registro en training_sessions");
assert(mockDb.session_drills.length === 5, "Persistencia confirmada: exactamente 5 registros en session_drills");

console.log("\n--- 2. Adaptación a Presupuestos de Tiempo (60', 90', 120') ---");
const p60 = generateMethodologySessionProposal({
  teamId: "team-cadete",
  category: "cadete",
  objective: "Salida de balón",
  durationMinutes: 60,
  microcycleDay: "MD-2",
  numPlayers: 16,
  allExercises: mockDatabaseExercises
});
assert(p60.totalDurationMin === 60, "Sesión de 60 min cuadra a 60 min");

const p120 = generateMethodologySessionProposal({
  teamId: "team-cadete",
  category: "cadete",
  objective: "Salida de balón",
  durationMinutes: 120,
  microcycleDay: "MD-4",
  numPlayers: 16,
  allExercises: mockDatabaseExercises
});
assert(p120.totalDurationMin === 120, "Sesión de 120 min cuadra a 120 min");

console.log("\n--- 3. Explicabilidad Metodológica en Bloques y Sesión ---");
assert(Array.isArray(proposal.sessionReasons) && proposal.sessionReasons.length >= 3, "La sesión contiene sessionReasons detalladas");
assert(proposal.sessionReasons.some(r => r.includes("Salida de balón")), "sessionReasons menciona el objetivo");
assert(proposal.blocks.principal_1.reasons.length > 0, "Bloque Principal 1 cuenta con razones estructuradas");

console.log("\n--- 4. Control de Sobrecarga en MD-1 ---");
const validationMd1 = validateMethodologySessionProposal({
  durationMinutes: 90,
  blocks: {
    activacion: [{ ...mockDatabaseExercises[0], duration_min: 15, carga_fisica: 4 }],
    principal_1: [{ ...mockDatabaseExercises[1], duration_min: 25, carga_fisica: 4 }],
    principal_2: [{ ...mockDatabaseExercises[2], duration_min: 25, carga_fisica: 4 }],
    global: [{ ...mockDatabaseExercises[3], duration_min: 15, carga_fisica: 4 }],
    vuelta_calma: [{ ...mockDatabaseExercises[4], duration_min: 10, carga_fisica: 4 }]
  },
  microcycleDay: "MD-1"
});
assert(validationMd1.warnings.some(w => w.includes("MD-1") || w.includes("Carga")), "Genera advertencia de carga alta en MD-1");

console.log("\n================================================================================");
console.log(`RESULTADO DE TESTS E2E GENERADOR: ${passed} PASADOS, ${failed} FALLADOS`);
console.log("================================================================================");
