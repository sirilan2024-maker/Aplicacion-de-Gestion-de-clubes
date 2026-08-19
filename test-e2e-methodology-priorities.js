/**
 * Test E2E de Integración: Prioridades Metodológicas -> Recomendación Determinista
 * Antigravity Methodology OS - Fase 4.4
 */

console.log("================================================================================");
console.log("TEST E2E: INTEGRACIÓN DE PRIORIDADES EN EL MOTOR DE RECOMENDACIÓN");
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

const { calculateMethodologyPriorities } = require("./src/lib/methodology/methodologyPriorityEngine");
const { scoreExercise, recommendExercises } = require("./src/lib/methodology/recommendationEngine");

// Banco de Ejercicios Demo
const mockBankExercises = [
  {
    id: "ex-1",
    nombre: "Juego de Posición 4v4 + 3 Comodines",
    categoria_edad: ["cadete", "juvenil"],
    age_category: "cadete",
    tipo: "juego_medio",
    objetivo_tactico: ["Tercer hombre", "Salida de balón"],
    bloque_sesion: "principal",
    drill_structure: "juego_medio",
    carga_fisica: 3,
    carga_cognitiva: 4,
    oposicion: 3,
    dificultad: 3,
    min_players: 11,
    max_players: 16
  },
  {
    id: "ex-2",
    nombre: "Rondo de Transición Rápida y Acoso",
    categoria_edad: ["cadete"],
    age_category: "cadete",
    tipo: "rondo",
    objetivo_tactico: ["Reacción tras pérdida", "Acoso inmediato"],
    criterios_exito: ["Presión en 3 segundos"],
    bloque_sesion: "principal",
    drill_structure: "rondo",
    carga_fisica: 3,
    carga_cognitiva: 3,
    oposicion: 3,
    dificultad: 2,
    min_players: 8,
    max_players: 12
  },
  {
    id: "ex-3",
    nombre: "Circuito de Coordinación y Pase",
    categoria_edad: ["cadete"],
    age_category: "cadete",
    objetivo_tecnico: ["Control orientado", "Pase"],
    bloque_sesion: "calentamiento",
    drill_structure: "circuito",
    carga_fisica: 2,
    carga_cognitiva: 2,
    dificultad: 1,
    min_players: 10,
    max_players: 20
  }
];

// Contexto Base del Constructor
const baseContext = {
  category: "cadete",
  objective: "Salida de balón",
  secondaryObjectives: [],
  numPlayers: 16,
  durationMinutes: 90,
  microcycleDay: "MD-3",
  intensityLoad: 4,
  targetBlock: "principal_1"
};

console.log("--- 1. Recomendación Base Sin Prioridad Aplicada ---");
const baseScores = mockBankExercises.map(ex => scoreExercise(ex, baseContext));
const topBase = [...baseScores].sort((a, b) => b.score - a.score)[0];

assert(topBase.exercise.id === "ex-1", "Sin prioridad, el ejercicio alineado con 'Salida de balón' (ex-1) obtiene la mejor puntuación");
assert(!topBase.reasons.some(r => r.includes("prioridad metodológica")), "Sin prioridad, ninguna recomendación menciona prioridad");

console.log("\n--- 2. Detección y Selección de Prioridad Metodológica ---");
// Simulamos que el equipo tiene una prioridad crítica: 'Reacción tras pérdida'
const priorities = calculateMethodologyPriorities({
  teamId: "team-cadete-a",
  date: "2026-08-20T18:00:00",
  microcycleDay: "MD-3",
  summary: {
    behaviourEvolution: [
      {
        behaviourDescription: "Reacción tras pérdida",
        sampleSize: 5,
        avgScore: 2.0,
        trend: 'declining'
      }
    ]
  }
});

const selectedPriority = priorities.find(p => p.type === 'behaviour_gap');
assert(Boolean(selectedPriority), "Se detectó la prioridad de comportamiento 'Reacción tras pérdida'");

console.log("\n--- 3. Aplicación de Prioridad en el Contexto de Recomendación ---");
// El entrenador pulsa [Aplicar Prioridad]
const contextWithPriority = {
  ...baseContext,
  priorityContext: selectedPriority.suggestedObjective || selectedPriority.title
};

const scoresWithPriority = mockBankExercises.map(ex => scoreExercise(ex, contextWithPriority));
const topWithPriority = [...scoresWithPriority].sort((a, b) => b.score - a.score)[0];

// ex-2 coincide con 'Reacción tras pérdida' y recibe el bonus de prioridad (+15)
const ex2ScoreResult = scoresWithPriority.find(r => r.exercise.id === "ex-2");
assert(ex2ScoreResult.breakdown.priorityMatch === 15, "El ejercicio ex-2 recibe exactamente +15 puntos por alineación con la prioridad");

const hasPriorityExplanation = ex2ScoreResult.reasons.some(r => 
  r.includes("Recomendado porque coincide con la prioridad metodológica seleccionada")
);
assert(hasPriorityExplanation, "La recomendación incluye una explicación clara y legible del motivo de la prioridad");

console.log("\n--- 4. Eliminación de la Prioridad por el Entrenador ---");
// El entrenador decide quitar la prioridad: el scoring vuelve a ser idéntico al base
const contextPriorityRemoved = {
  ...contextWithPriority,
  priorityContext: undefined
};

const scoresReverted = mockBankExercises.map(ex => scoreExercise(ex, contextPriorityRemoved));
assert(scoresReverted[0].score === baseScores[0].score, "Al quitar la prioridad, las puntuaciones revierten de forma determinista");

console.log("\n--- 5. Aislamiento Multi-Tenant de Prioridades ---");
const teamAPriorities = calculateMethodologyPriorities({
  teamId: "team-cadete-a",
  summary: {
    behaviourEvolution: [{ behaviourDescription: "Presión alta", sampleSize: 4, avgScore: 1.9, trend: 'declining' }]
  }
});

const teamBPriorities = calculateMethodologyPriorities({
  teamId: "team-cadete-b",
  summary: {
    behaviourEvolution: [{ behaviourDescription: "Basculación", sampleSize: 4, avgScore: 3.5, trend: 'improving' }]
  }
});

assert(teamAPriorities[0].title.includes("Presión alta"), "Equipo A recibe sus prioridades específicas");
assert(!teamBPriorities.some(p => p.title.includes("Presión alta")), "Equipo B NO recibe las prioridades del Equipo A (Aislamiento preservado)");

console.log("\n================================================================================");
console.log(`RESULTADO DE TESTS E2E PRIORIDADES: ${passed} PASADOS, ${failed} FALLADOS`);
console.log("================================================================================");
