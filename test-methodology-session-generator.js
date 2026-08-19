/**
 * Tests Unitarios: Generador Asistido de Sesiones Metodológicas v1.0
 * Antigravity Methodology OS - Fase 4.5
 */

console.log("================================================================================");
console.log("TESTS UNITARIOS: GENERADOR ASISTIDO DE SESIONES METODOLÓGICAS v1.0");
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
  allocateSessionTime,
  calculateBlockTimeBudget, 
  generateMethodologySessionProposal, 
  regenerateMethodologyBlock,
  regenerateSessionBlock, 
  validateMethodologySessionProposal 
} = require("./src/lib/methodology/methodologySessionGenerator");

// 1. Banco de Ejercicios Demo Coherente
const mockExercises = [
  {
    id: "ex-act-1",
    nombre: "Rondo 4v1 de Activación",
    categoria_edad: ["cadete", "juvenil"],
    age_category: "cadete",
    tipo: "rondo",
    bloque_sesion: "calentamiento",
    drill_structure: "rondo",
    objetivo_tactico: ["Conservación", "Circulación"],
    objetivo_tecnico: ["Control", "Pase"],
    criterios_exito: ["Perfilación antes de recibir"],
    espacio: "12x12m",
    material: ["balones", "conos", "petos"],
    carga_fisica: 2,
    carga_cognitiva: 2,
    oposicion: 2,
    dificultad: 2,
    min_players: 5,
    max_players: 10
  },
  {
    id: "ex-p1-1",
    nombre: "Juego de Posición 4v4 + 3 Comodines",
    categoria_edad: ["cadete"],
    age_category: "cadete",
    tipo: "juego_medio",
    bloque_sesion: "principal",
    drill_structure: "juego_medio",
    objetivo_tactico: ["Presión tras pérdida", "Tercer hombre"],
    objetivo_tecnico: ["Pase filtrado"],
    criterios_exito: ["Acoso en menos de 3 segundos"],
    espacio: "25x25m",
    material: ["balones", "conos", "petos"],
    carga_fisica: 3,
    carga_cognitiva: 4,
    oposicion: 3,
    dificultad: 3,
    min_players: 11,
    max_players: 16
  },
  {
    id: "ex-p1-alt",
    nombre: "Juego de Posición 5v5 + 2 Interiores",
    categoria_edad: ["cadete"],
    age_category: "cadete",
    tipo: "juego_medio",
    bloque_sesion: "principal",
    drill_structure: "juego_medio",
    objetivo_tactico: ["Presión tras pérdida", "Fijación interior"],
    objetivo_tecnico: ["Pase corto"],
    criterios_exito: ["Búsqueda del tercer hombre"],
    espacio: "30x30m",
    material: ["balones", "conos", "petos"],
    carga_fisica: 3,
    carga_cognitiva: 4,
    oposicion: 3,
    dificultad: 3,
    min_players: 12,
    max_players: 18
  },
  {
    id: "ex-p2-1",
    nombre: "SSG 6v6 + 2 Porteros en Espacio Reducido",
    categoria_edad: ["cadete"],
    age_category: "cadete",
    tipo: "SSG",
    bloque_sesion: "principal",
    drill_structure: "SSG",
    objetivo_tactico: ["Transición defensiva", "Duelos"],
    objetivo_tecnico: ["Interceptación"],
    criterios_exito: ["Cierre de líneas de pase"],
    espacio: "40x30m",
    material: ["porterías", "balones", "petos"],
    carga_fisica: 4,
    carga_cognitiva: 3,
    oposicion: 4,
    dificultad: 3,
    min_players: 12,
    max_players: 16
  },
  {
    id: "ex-glob-1",
    nombre: "Partido Condicionado 8v8 con Zonas de Presión",
    categoria_edad: ["cadete"],
    age_category: "cadete",
    tipo: "juego_global",
    bloque_sesion: "global",
    drill_structure: "juego_global",
    objetivo_tactico: ["Modelo de juego", "Presión alta"],
    objetivo_tecnico: ["Tiro a puerta"],
    criterios_exito: ["Bloque compacto"],
    espacio: "Campo completo adaptado 60x45m",
    material: ["porterías", "balones", "conos"],
    carga_fisica: 3,
    carga_cognitiva: 4,
    oposicion: 4,
    dificultad: 3,
    min_players: 16,
    max_players: 20
  },
  {
    id: "ex-vc-1",
    nombre: "Rueda de Pases Suave y Estiramientos Dinámicos",
    categoria_edad: ["cadete"],
    age_category: "cadete",
    tipo: "calentamiento",
    bloque_sesion: "vuelta_calma",
    drill_structure: "circuito",
    objetivo_tecnico: ["Pase corto", "Regeneración"],
    criterios_exito: ["Ritmo cardíaco descendente"],
    espacio: "20x20m",
    material: ["balones", "conos"],
    carga_fisica: 1,
    carga_cognitiva: 1,
    oposicion: 1,
    dificultad: 1,
    min_players: 10,
    max_players: 22
  }
];

console.log("--- 1. Test de Presupuesto Exacto de Tiempo (allocateSessionTime) ---");
const alloc60 = allocateSessionTime(60);
assert(alloc60.success === true, "allocateSessionTime para 60 min es exitoso");
assert(Object.values(alloc60.durations).reduce((a, b) => a + b, 0) === 60, "Suma de 60 min exacta");
assert(alloc60.durations.activacion === 10 && alloc60.durations.vuelta_calma === 5, "Reparto 60 min: 10' / 15' / 15' / 15' / 5'");

const alloc90 = allocateSessionTime(90);
assert(alloc90.success === true, "allocateSessionTime para 90 min es exitoso");
assert(Object.values(alloc90.durations).reduce((a, b) => a + b, 0) === 90, "Suma de 90 min exacta");
assert(alloc90.durations.activacion === 15 && alloc90.durations.principal_1 === 20 && alloc90.durations.principal_2 === 25, "Reparto 90 min: 15' / 20' / 25' / 20' / 10'");

const alloc120 = allocateSessionTime(120);
assert(alloc120.success === true, "allocateSessionTime para 120 min es exitoso");
assert(Object.values(alloc120.durations).reduce((a, b) => a + b, 0) === 120, "Suma de 120 min exacta");

const alloc75 = allocateSessionTime(75);
assert(alloc75.success === true, "allocateSessionTime para duración arbitraria (75 min) es exitoso");
assert(Object.values(alloc75.durations).reduce((a, b) => a + b, 0) === 75, "Suma de 75 min exacta");

const allocInvalidLow = allocateSessionTime(20);
assert(allocInvalidLow.success === false, "Rechaza explícitamente duración < 30 min");
assert(Boolean(allocInvalidLow.error), "Devuelve mensaje de error explícito para duración insuficiente");

const allocInvalidHigh = allocateSessionTime(240);
assert(allocInvalidHigh.success === false, "Rechaza explícitamente duración > 180 min");

console.log("\n--- 2. Test de Generación de Propuesta Completa (5 Bloques y 12 Campos) ---");
const proposal90 = generateMethodologySessionProposal({
  teamId: "team-cadete-a",
  category: "cadete",
  objective: "Presión tras pérdida",
  secondaryObjectives: ["Transición defensiva"],
  durationMinutes: 90,
  microcycleDay: "MD-3",
  numPlayers: 16,
  intensityLoad: 4,
  allExercises: mockExercises
});

assert(Boolean(proposal90), "Genera propuesta de sesión no nula");
assert(Object.keys(proposal90.blocks).length === 5, "La propuesta contiene exactamente 5 bloques");
assert(proposal90.totalDurationMin === 90, "La duración total generada suma exactamente 90 minutos");

const p1Block = proposal90.blocks.principal_1;
assert(Boolean(p1Block.exercise), "Bloque contiene campo 'exercise'");
assert(typeof p1Block.duration === 'number' && p1Block.duration === 20, "Bloque contiene campo 'duration' (20 min)");
assert(Boolean(p1Block.objective), "Bloque contiene campo 'objective'");
assert(Boolean(p1Block.principle), "Bloque contiene campo 'principle'");
assert(Boolean(p1Block.subprinciple), "Bloque contiene campo 'subprinciple'");
assert(Boolean(p1Block.behaviour), "Bloque contiene campo 'behaviour'");
assert(Boolean(p1Block.organization), "Bloque contiene campo 'organization'");
assert(Boolean(p1Block.space), "Bloque contiene campo 'space'");
assert(Array.isArray(p1Block.material), "Bloque contiene campo 'material'");
assert(typeof p1Block.estimatedLoad === 'number', "Bloque contiene campo 'estimatedLoad'");
assert(typeof p1Block.score === 'number', "Bloque contiene campo 'score'");
assert(Array.isArray(p1Block.reasons) && p1Block.reasons.length > 0, "Bloque contiene campo 'reasons'");

console.log("\n--- 3. Test de Diversidad y No Repetición en la Propuesta ---");
const blockExerciseIds = Object.values(proposal90.blocks).map(b => b.exercise?.id).filter(Boolean);
const uniqueIds = new Set(blockExerciseIds);
assert(uniqueIds.size === blockExerciseIds.length, "No hay ningún ejercicio duplicado entre los 5 bloques generados");

console.log("\n--- 4. Test de Regeneración Parcial de un Bloque (regenerateMethodologyBlock) ---");
const regeneratedProposal = regenerateMethodologyBlock(proposal90, 'principal_1', {
  teamId: "team-cadete-a",
  category: "cadete",
  objective: "Presión tras pérdida",
  durationMinutes: 90,
  microcycleDay: "MD-3",
  numPlayers: 16,
  intensityLoad: 4,
  allExercises: mockExercises
});

assert(regeneratedProposal.blocks.activacion.exercise.id === proposal90.blocks.activacion.exercise.id, "Bloque Activación permanece inalterado");
assert(regeneratedProposal.blocks.principal_2.exercise.id === proposal90.blocks.principal_2.exercise.id, "Bloque Principal 2 permanece inalterado");
assert(regeneratedProposal.blocks.global.exercise.id === proposal90.blocks.global.exercise.id, "Bloque Global permanece inalterado");
assert(regeneratedProposal.blocks.vuelta_calma.exercise.id === proposal90.blocks.vuelta_calma.exercise.id, "Bloque Vuelta a la Calma permanece inalterado");
assert(regeneratedProposal.totalDurationMin === 90, "La duración total se mantiene intacta tras regenerar");

console.log("\n--- 5. Test de Validación Global (Diferenciación de Errors y Warnings) ---");
const validationValid = validateMethodologySessionProposal(proposal90);
assert(validationValid.valid === true, "Propuesta válida tiene valid=true");
assert(validationValid.errors.length === 0, "No presenta errores");

// Error bloqueante: Desfase grave de tiempo
const invalidTime = validateMethodologySessionProposal({
  durationMinutes: 90,
  blocks: {
    activacion: [{ duration_min: 10, id: 'ex-1' }],
    principal_1: [{ duration_min: 15, id: 'ex-2' }]
  }
});
assert(invalidTime.valid === false, "Desfase temporal > 15 min genera valid=false (Error Bloqueante)");
assert(invalidTime.errors.some(e => e.includes("Error de duración")), "Mensaje de error explícito de duración");

// Test explícito de las 3 reglas de delta de duración:
// Caso 1: Δ = 0 -> Válido sin errores ni advertencias de duración
const delta0 = validateMethodologySessionProposal({
  durationMinutes: 90,
  blocks: {
    activacion: [{ duration_min: 15, id: 'ex-1' }],
    principal_1: [{ duration_min: 20, id: 'ex-2' }],
    principal_2: [{ duration_min: 25, id: 'ex-3' }],
    global: [{ duration_min: 20, id: 'ex-4' }],
    vuelta_calma: [{ duration_min: 10, id: 'ex-5' }] // Suma 90 (Δ = 0)
  }
});
assert(delta0.valid === true, "Δ = 0: Sesión válida");
assert(!delta0.warnings.some(w => w.includes("duración")), "Δ = 0: Sin advertencias de duración");
assert(!delta0.errors.some(e => e.includes("duración")), "Δ = 0: Sin errores de duración");

// Caso 2: 0 < |Δ| <= 15 -> Warning (Permite guardar con aviso)
const deltaLeve = validateMethodologySessionProposal({
  durationMinutes: 90,
  blocks: {
    activacion: [{ duration_min: 15, id: 'ex-1' }],
    principal_1: [{ duration_min: 20, id: 'ex-2' }],
    principal_2: [{ duration_min: 25, id: 'ex-3' }],
    global: [{ duration_min: 20, id: 'ex-4' }],
    vuelta_calma: [{ duration_min: 5, id: 'ex-5' }] // Suma 85 (|Δ| = 5 <= 15)
  }
});
assert(deltaLeve.valid === true, "0 < |Δ| <= 15: Válido para guardar");
assert(deltaLeve.warnings.some(w => w.includes("Aviso de duración")), "0 < |Δ| <= 15: Genera advertencia informativa");
assert(deltaLeve.errors.length === 0, "0 < |Δ| <= 15: Cero errores bloqueantes");

// Caso 3: |Δ| > 15 -> Error Bloqueante (Impide guardar)
const deltaGrave = validateMethodologySessionProposal({
  durationMinutes: 90,
  blocks: {
    activacion: [{ duration_min: 10, id: 'ex-1' }],
    principal_1: [{ duration_min: 15, id: 'ex-2' }],
    principal_2: [{ duration_min: 15, id: 'ex-3' }],
    global: [{ duration_min: 15, id: 'ex-4' }],
    vuelta_calma: [{ duration_min: 10, id: 'ex-5' }] // Suma 65 (|Δ| = 25 > 15)
  }
});
assert(deltaGrave.valid === false, "|Δ| > 15: Inválido para guardar (Error Bloqueante)");
assert(deltaGrave.errors.some(e => e.includes("Error de duración")), "|Δ| > 15: Genera error explícito de duración");

console.log("\n--- 6. Test de Determinismo Estricto e Invarianza de Input Único ---");
const contextRun1 = {
  teamId: "team-cadete-a",
  category: "cadete",
  objective: "Presión tras pérdida",
  secondaryObjectives: ["Transición defensiva"],
  durationMinutes: 90,
  microcycleDay: "MD-3",
  numPlayers: 16,
  intensityLoad: 4,
  allExercises: mockExercises
};

const proposalRun1 = generateMethodologySessionProposal(contextRun1);
const proposalRun2 = generateMethodologySessionProposal(contextRun1);

assert(
  JSON.stringify(proposalRun1) === JSON.stringify(proposalRun2),
  "same context produces identical proposal (Ejecución 1 vs Ejecución 2 son idénticas)"
);

// Cambio de input único: modificar solo duración a 60 min
const context60 = { ...contextRun1, durationMinutes: 60 };
const proposal60SingleChange = generateMethodologySessionProposal(context60);
assert(proposal60SingleChange.totalDurationMin === 60, "Cambio de input único (duración 90 -> 60): modifica el presupuesto temporal a exactamente 60 min");
assert(proposal60SingleChange.objective === contextRun1.objective, "Mantiene intacto el objetivo formativo");

console.log("\n================================================================================");
console.log(`RESULTADO DE TESTS UNITARIOS GENERADOR: ${passed} PASADOS, ${failed} FALLADOS`);
console.log("================================================================================");
