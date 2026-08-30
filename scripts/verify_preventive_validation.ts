process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { validateExercise } from "../src/lib/methodology/exerciseValidationEngine";

console.log("================================================================================");
console.log("TESTS UNITARIOS DE VALIDACIÓN PREVENTIVA DE INSERCIÓN");
console.log("================================================================================\n");

let passed = 0;
let total = 0;

function assert(condition: boolean, msg: string) {
  total++;
  if (condition) {
    passed++;
    console.log(`✅ [PASS] ${msg}`);
  } else {
    console.error(`❌ [FAIL] ${msg}`);
    process.exit(1);
  }
}

// 1. Alta válida -> aceptada
const validDrill = {
  nombre: "Rondo 4v2 de Presión Tras Pérdida y Mantenimiento",
  tipo: "rondo",
  descripcion: "Rondo 4v2 con objetivo de acoso inmediato tras robo.",
  categoria_edad: ["infantil", "cadete"],
  age_category: "cadete",
  bloque_sesion: "principal",
  game_phase: "transition_atk_to_def",
  carga_fisica: 3,
  carga_cognitiva: 3,
  oposicion: 3,
  representatividad: 3,
  duracion_recomendada: 15,
  min_players: 6,
  max_players: 8,
  objetivo_tactico: ["presión tras pérdida", "transición defensiva"],
  objetivo_tecnico: ["pase", "recuperación"]
};
const res1 = validateExercise(validDrill);
assert(res1.valid === true && res1.errors.length === 0, "TEST 1: Alta válida es aceptada sin errores.");

// 2. bloque_sesion ausente -> rechazada
const missingBlockDrill = {
  ...validDrill,
  bloque_sesion: undefined
};
const res2 = validateExercise(missingBlockDrill);
assert(res2.valid === false && res2.errors.some(e => e.includes("bloque_sesion")), "TEST 2: bloque_sesion ausente es rechazado.");

// 3. game_phase incompatible/inválido -> rechazada
const invalidPhaseDrill = {
  ...validDrill,
  game_phase: "fase_inventada_no_canonica"
};
const res3 = validateExercise(invalidPhaseDrill);
assert(res3.valid === false && res3.errors.some(e => e.includes("game_phase")), "TEST 3: game_phase incompatible es rechazado.");

// 4. representatividad inválida -> rechazada
const invalidRepDrill = {
  ...validDrill,
  representatividad: 99
};
const res4 = validateExercise(invalidRepDrill);
assert(res4.valid === false && res4.errors.some(e => e.includes("representatividad")), "TEST 4: representatividad fuera de rango (99) es rechazada.");

const missingRepDrill = {
  ...validDrill,
  representatividad: null
};
const res4b = validateExercise(missingRepDrill);
assert(res4b.valid === false && res4b.errors.some(e => e.includes("representatividad")), "TEST 4b: representatividad ausente/null es rechazada.");

// 5. tipo desconocido -> rechazada
const unknownTypeDrill = {
  ...validDrill,
  tipo: "tipo_inexistente_random"
};
const res5 = validateExercise(unknownTypeDrill);
assert(res5.valid === false && res5.errors.some(e => e.includes("tipo")), "TEST 5: tipo desconocido es rechazado.");

// 6. Principio / objetivo incompatible con fase de juego -> rechazada
const contradictoryDrill = {
  ...validDrill,
  nombre: "Ejercicio de Finalización y Remate a Portería",
  objetivo_tactico: ["finalización", "remate"],
  game_phase: "defending_low_block" // Fase defensiva en ejercicio de remate
};
const res6 = validateExercise(contradictoryDrill);
assert(res6.valid === false && res6.errors.some(e => e.includes("Incompatibilidad metodológica")), "TEST 6: Principio/objetivo de finalización con fase defensiva es rechazado.");

console.log("\n================================================================================");
console.log(`RESULTADO DE VALIDACIÓN PREVENTIVA: ${passed} / ${total} TESTS PASADOS (100% PASS)`);
console.log("================================================================================");
