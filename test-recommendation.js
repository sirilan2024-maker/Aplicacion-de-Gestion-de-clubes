const { 
  scoreExercise, 
  recommendExercises, 
  calculateSessionMetrics,
  RECOMMENDATION_WEIGHTS 
} = require('./src/lib/methodology/recommendationEngine.js');

console.log("==================================================");
console.log("INICIANDO TESTS DE MOTOR DE RECOMENDACIÓN v1.0");
console.log("==================================================\n");

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

// Mock database exercises
const mockExercises = [
  {
    id: "ex-1",
    nombre: "Presión Tras Pérdida en Rondo 5v2",
    tipo: "rondo",
    familia: "TRANSICIONES",
    age_category: "cadete",
    categoria_edad: ["cadete"],
    bloque_sesion: "principal",
    objetivo_tactico: ["presión tras pérdida", "vigilancia"],
    objetivo_tecnico: ["interceptación", "pase"],
    carga_fisica: 3,
    carga_cognitiva: 3,
    oposicion: 3,
    representatividad: 3,
    duracion_recomendada: 15,
    min_players: 7,
    max_players: 10
  },
  {
    id: "ex-2",
    nombre: "Los Caza-Tesoros en la Jungla",
    tipo: "circuito",
    familia: "TÉCNICA",
    age_category: "querubin",
    categoria_edad: ["querubin"],
    bloque_sesion: "calentamiento",
    objetivo_tactico: ["orientación"],
    objetivo_tecnico: ["conducción"],
    carga_fisica: 2,
    carga_cognitiva: 1,
    oposicion: 1,
    representatividad: 1,
    duracion_recomendada: 10,
    min_players: 6,
    max_players: 12
  },
  {
    id: "ex-3",
    nombre: "Juego Global 11v11 Condicionado: Bloque Alto",
    tipo: "juego_global",
    familia: "TÁCTICA DEFENSIVA",
    age_category: "cadete",
    categoria_edad: ["cadete", "juvenil"],
    bloque_sesion: "global",
    objetivo_tactico: ["bloque", "presión", "basculación"],
    objetivo_tecnico: ["pase", "despeje"],
    carga_fisica: 4,
    carga_cognitiva: 4,
    oposicion: 4,
    representatividad: 4,
    duracion_recomendada: 25,
    min_players: 18,
    max_players: 22
  },
  {
    id: "ex-4",
    nombre: "Rondo de Activación Reactiva Pre-Partido",
    tipo: "rondo",
    familia: "TÁCTICA OFENSIVA",
    age_category: "cadete",
    categoria_edad: ["cadete"],
    bloque_sesion: "calentamiento",
    objetivo_tactico: ["velocidad", "apoyo"],
    objetivo_tecnico: ["pase"],
    carga_fisica: 2,
    carga_cognitiva: 2,
    oposicion: 2,
    representatividad: 2,
    duracion_recomendada: 10,
    min_players: 6,
    max_players: 10
  }
];

// TEST 1: Compatibilidad de Categoría
const resCatCadete = scoreExercise(mockExercises[0], {
  category: "cadete",
  objective: "Presión tras pérdida",
  numPlayers: 8,
  durationMinutes: 90,
  microcycleDay: "MD-3",
  intensityLoad: 3
});
assert(resCatCadete.breakdown.categoryMatch === 30, "Puntúa +30 si coincide con la categoría objetivo");

const resCatIncompatible = scoreExercise(mockExercises[1], {
  category: "cadete",
  objective: "Presión",
  numPlayers: 8,
  durationMinutes: 90,
  microcycleDay: "MD-3",
  intensityLoad: 3
});
assert(resCatIncompatible.breakdown.categoryMatch === -30, "Penaliza -30 si la categoría es incompatible (U6 para Cadete)");

// TEST 2: Coincidencia de Objetivo Principal
assert(resCatCadete.breakdown.objectiveMatch >= 25, "Otorga bonus alto si coincide con el objetivo principal");

// TEST 3: Reglas de Microciclo MD-3 vs MD-1
const resMD3 = scoreExercise(mockExercises[2], {
  category: "cadete",
  objective: "Bloque",
  numPlayers: 20,
  durationMinutes: 90,
  microcycleDay: "MD-3",
  intensityLoad: 4
});
assert(resMD3.breakdown.microcycleSuitability > 0, "MD-3 premia tareas de alta oposición e intensidad");

const resMD1 = scoreExercise(mockExercises[2], {
  category: "cadete",
  objective: "Bloque",
  numPlayers: 20,
  durationMinutes: 60,
  microcycleDay: "MD-1",
  intensityLoad: 2
});
assert(resMD1.breakdown.microcycleSuitability < 0, "MD-1 penaliza tareas de alta carga física/fatiga");

// TEST 4: Detección y Penalización de Repetición Reciente
const resRecency = scoreExercise(mockExercises[0], {
  category: "cadete",
  objective: "Presión tras pérdida",
  numPlayers: 8,
  durationMinutes: 90,
  microcycleDay: "MD-3",
  intensityLoad: 3,
  recentExerciseIds: ["ex-1"]
});
assert(resRecency.breakdown.recencyPenalty === -20, "Aplica penalización de -20 puntos por repetición reciente");

// TEST 5: Cálculo de Métricas de Sesión
const mockSessionBlocks = {
  activacion: [{ duration_min: 15, carga_fisica: 2, carga_cognitiva: 2, oposicion: 2, representatividad: 2 }],
  principal_1: [{ duration_min: 20, carga_fisica: 3, carga_cognitiva: 3, oposicion: 3, representatividad: 3 }],
  principal_2: [{ duration_min: 25, carga_fisica: 3, carga_cognitiva: 4, oposicion: 3, representatividad: 3 }],
  global: [{ duration_min: 20, carga_fisica: 4, carga_cognitiva: 4, oposicion: 4, representatividad: 4 }],
  vuelta_calma: [{ duration_min: 10, carga_fisica: 1, carga_cognitiva: 1, oposicion: 1, representatividad: 1 }]
};

const metrics = calculateSessionMetrics(mockSessionBlocks, 90);
assert(metrics.totalDurationMin === 90, "Calcula correctamente la duración total de la sesión (90 min)");
assert(metrics.durationAlert === "optimal", "Detecta duración óptima sin desviaciones");
assert(metrics.estimatedMethodologicalLoad >= 50, "Calcula un índice de carga metodológica coherente");

console.log("\n==================================================");
console.log(`RESULTADO DE TESTS: ${passed} PASADOS, ${failed} FALLADOS`);
console.log("==================================================");
