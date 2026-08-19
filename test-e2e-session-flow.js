/**
 * Test E2E de Flujo Completo de Planificación, Recomendación, Persistencia y Recuperación
 * Antigravity Methodology OS - Fase 4.1
 */
const { 
  scoreExercise, 
  recommendExercises, 
  calculateSessionMetrics 
} = require('./src/lib/methodology/recommendationEngine.js');

console.log("================================================================================");
console.log("TEST E2E: FLUJO COMPLETO DE SESIÓN METODOLÓGICA (CREACIÓN -> MÉTRICAS -> RECUPERACIÓN)");
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

// 1. Catálogo simulado de ejercicios
const mockExercises = [
  {
    id: "ex-act-1",
    nombre: "Rondo de Activación 4v1",
    tipo: "rondo",
    familia: "TÁCTICA OFENSIVA",
    age_category: "infantil",
    categoria_edad: ["infantil"],
    bloque_sesion: "calentamiento",
    objetivo_tactico: ["apoyo", "pase"],
    objetivo_tecnico: ["pase", "control orientado"],
    carga_fisica: 2,
    carga_cognitiva: 2,
    oposicion: 2,
    representatividad: 2,
    duracion_recomendada: 15,
    min_players: 5,
    max_players: 8,
    criterios_exito: ["Perfilación corporal", "Pase tenso"]
  },
  {
    id: "ex-p1-1",
    nombre: "Juego de Posición 6v4 + 2 Comodines",
    tipo: "juego_medio",
    familia: "TRANSICIONES",
    age_category: "infantil",
    categoria_edad: ["infantil"],
    bloque_sesion: "principal",
    objetivo_tactico: ["presión tras pérdida", "tercer hombre", "superioridad"],
    objetivo_tecnico: ["interceptación", "pase"],
    carga_fisica: 3,
    carga_cognitiva: 3,
    oposicion: 3,
    representatividad: 3,
    duracion_recomendada: 20,
    min_players: 12,
    max_players: 16,
    criterios_exito: ["Acoso en 3 segundos"]
  },
  {
    id: "ex-p2-1",
    nombre: "SSG 4v4 + 3 con Transición Rápida a Miniporterías",
    tipo: "SSG",
    familia: "TRANSICIONES",
    age_category: "infantil",
    categoria_edad: ["infantil"],
    bloque_sesion: "principal",
    objetivo_tactico: ["presión tras pérdida", "contraataque"],
    objetivo_tecnico: ["regate", "finalización"],
    carga_fisica: 4,
    carga_cognitiva: 4,
    oposicion: 4,
    representatividad: 4,
    duracion_recomendada: 25,
    min_players: 11,
    max_players: 16,
    criterios_exito: ["Finalizar en menos de 8 segundos"]
  },
  {
    id: "ex-glob-1",
    nombre: "Juego Global 8v8 con Foco en Presión Alta",
    tipo: "juego_global",
    familia: "TÁCTICA DEFENSIVA",
    age_category: "infantil",
    categoria_edad: ["infantil"],
    bloque_sesion: "global",
    objetivo_tactico: ["presión", "bloque", "defensa del área"],
    objetivo_tecnico: ["pase", "despeje"],
    carga_fisica: 4,
    carga_cognitiva: 3,
    oposicion: 4,
    representatividad: 4,
    duracion_recomendada: 20,
    min_players: 16,
    max_players: 18,
    criterios_exito: ["Líneas compactas"]
  },
  {
    id: "ex-cool-1",
    nombre: "Rueda Regenerativa y Pases Suaves",
    tipo: "analitico",
    familia: "TÉCNICA",
    age_category: "infantil",
    categoria_edad: ["infantil"],
    bloque_sesion: "vuelta_calma",
    objetivo_tactico: ["recuperación"],
    objetivo_tecnico: ["control"],
    carga_fisica: 1,
    carga_cognitiva: 1,
    oposicion: 1,
    representatividad: 1,
    duracion_recomendada: 10,
    min_players: 10,
    max_players: 20,
    criterios_exito: ["Bajar pulsaciones"]
  }
];

// PASO 1: Contexto del Entrenador
const sessionContext = {
  category: "infantil",
  objective: "Presión tras pérdida",
  secondaryObjectives: ["Transición defensiva", "Superioridad"],
  numPlayers: 16,
  durationMinutes: 90,
  microcycleDay: "MD-3",
  intensityLoad: 4,
  availableSpace: "Medio campo",
  recentExerciseIds: []
};

// PASO 2: Recomendaciones por Bloque
console.log("--- 1. Evaluando recomendaciones por bloque ---");
const recActivacion = recommendExercises(mockExercises, { ...sessionContext, targetBlock: "activacion" }, 3);
assert(recActivacion.length > 0 && recActivacion[0].exercise.id === "ex-act-1", "Bloque Activación recomienda ejercicio de calentamiento/rondo idóneo");

const recPrincipal1 = recommendExercises(mockExercises, { ...sessionContext, targetBlock: "principal_1" }, 3);
assert(recPrincipal1.length > 0 && recPrincipal1[0].exercise.id === "ex-p1-1", "Bloque Principal 1 recomienda juego de posición con objetivo 'Presión tras pérdida'");

const recPrincipal2 = recommendExercises(mockExercises, { ...sessionContext, targetBlock: "principal_2" }, 3);
assert(recPrincipal2.length > 0 && recPrincipal2[0].exercise.id === "ex-p2-1", "Bloque Principal 2 recomienda SSG de alta oposición para MD-3");

const recGlobal = recommendExercises(mockExercises, { ...sessionContext, targetBlock: "global" }, 3);
assert(recGlobal.length > 0 && recGlobal[0].exercise.id === "ex-glob-1", "Bloque Global recomienda juego global 8v8 altamente representativo");

// PASO 3: Construcción de la Sesión
console.log("\n--- 2. Construyendo bloques de la sesión ---");
const constructedSessionBlocks = {
  activacion: [{ ...mockExercises[0], duration_min: 15, order_index: 0 }],
  principal_1: [{ ...mockExercises[1], duration_min: 20, order_index: 1 }],
  principal_2: [{ ...mockExercises[2], duration_min: 25, order_index: 2 }],
  global: [{ ...mockExercises[3], duration_min: 20, order_index: 3 }],
  vuelta_calma: [{ ...mockExercises[4], duration_min: 10, order_index: 4 }]
};

// PASO 4: Cálculo de Métricas en Vivo
console.log("\n--- 3. Calculando métricas metodológicas ---");
const liveMetrics = calculateSessionMetrics(constructedSessionBlocks, 90);
assert(liveMetrics.totalDurationMin === 90, "Duración total calculada coincide exactamente con 90 minutos");
assert(liveMetrics.durationAlert === "optimal", "Estado de alerta de duración es 'optimal'");
assert(liveMetrics.avgCargaFisica >= 2.5, "Promedio de carga física calculado correctamente");
assert(liveMetrics.estimatedMethodologicalLoad >= 60, "Índice de carga metodológica estimada coherente para sesión MD-3 de alta intensidad");

// PASO 5: Simulación de Persistencia en BD (training_sessions + session_drills)
console.log("\n--- 4. Simulando persistencia en BD y serialización de drills ---");
const simulatedDbSession = {
  id: "session-uuid-12345",
  team_id: "team-infantil-a",
  date_time: "2026-08-20T18:00:00",
  duration_minutes: liveMetrics.totalDurationMin,
  age_category: sessionContext.category,
  microcycle_day: sessionContext.microcycleDay,
  intensity_load: sessionContext.intensityLoad,
  objective: sessionContext.objective,
  objectives_secondary: sessionContext.secondaryObjectives,
  num_players: sessionContext.numPlayers,
  estimated_load: liveMetrics.estimatedMethodologicalLoad
};

const simulatedDbDrills = [];
let orderCounter = 0;
Object.keys(constructedSessionBlocks).forEach(phase => {
  constructedSessionBlocks[phase].forEach(ex => {
    simulatedDbDrills.push({
      id: `drill-rel-${orderCounter}`,
      session_id: simulatedDbSession.id,
      drill_id: ex.id,
      phase: phase,
      order_index: orderCounter++,
      duration_min: ex.duration_min,
      banco_ejercicios: ex
    });
  });
});

assert(simulatedDbDrills.length === 5, "Se generaron exactamente 5 registros en session_drills");

// PASO 6: Simulación de Recuperación y Reconstrucción de Bloques (getMethodologySessionById)
console.log("\n--- 5. Recuperando y reconstruyendo la sesión desde BD ---");
const reconstructedBlocks = {
  activacion: [],
  principal_1: [],
  principal_2: [],
  global: [],
  vuelta_calma: []
};

const phaseMap = {
  activacion: "activacion",
  principal_1: "principal_1",
  principal_2: "principal_2",
  global: "global",
  vuelta_calma: "vuelta_calma"
};

simulatedDbDrills
  .sort((a, b) => a.order_index - b.order_index)
  .forEach(drill => {
    const targetBlock = phaseMap[drill.phase];
    reconstructedBlocks[targetBlock].push({
      ...drill.banco_ejercicios,
      drill_id: drill.drill_id,
      duration_min: drill.duration_min,
      order_index: drill.order_index
    });
  });

// Comprobaciones de integridad en la sesión recuperada
assert(reconstructedBlocks.activacion.length === 1 && reconstructedBlocks.activacion[0].id === "ex-act-1", "Bloque Activación recuperado idéntico");
assert(reconstructedBlocks.activacion[0].duration_min === 15, "Duración de Activación conservada (15 min)");

assert(reconstructedBlocks.principal_1.length === 1 && reconstructedBlocks.principal_1[0].id === "ex-p1-1", "Bloque Principal 1 recuperado idéntico");
assert(reconstructedBlocks.principal_1[0].duration_min === 20, "Duración de Principal 1 conservada (20 min)");

assert(reconstructedBlocks.principal_2.length === 1 && reconstructedBlocks.principal_2[0].id === "ex-p2-1", "Bloque Principal 2 recuperado idéntico");
assert(reconstructedBlocks.principal_2[0].duration_min === 25, "Duración de Principal 2 conservada (25 min)");

assert(reconstructedBlocks.global.length === 1 && reconstructedBlocks.global[0].id === "ex-glob-1", "Bloque Global recuperado idéntico");
assert(reconstructedBlocks.global[0].duration_min === 20, "Duración de Global conservada (20 min)");

assert(reconstructedBlocks.vuelta_calma.length === 1 && reconstructedBlocks.vuelta_calma[0].id === "ex-cool-1", "Bloque Vuelta a la Calma recuperado idéntico");
assert(reconstructedBlocks.vuelta_calma[0].duration_min === 10, "Duración de Vuelta a la Calma conservada (10 min)");

const recoveredMetrics = calculateSessionMetrics(reconstructedBlocks, simulatedDbSession.duration_minutes);
assert(recoveredMetrics.totalDurationMin === liveMetrics.totalDurationMin, "Métricas de duración de la sesión recuperada coinciden al 100%");
assert(recoveredMetrics.estimatedMethodologicalLoad === liveMetrics.estimatedMethodologicalLoad, "Carga metodológica estimada de la sesión recuperada coincide al 100%");

console.log("\n================================================================================");
console.log(`RESULTADO DE TESTS E2E: ${passed} PASADOS, ${failed} FALLADOS`);
console.log("================================================================================");
