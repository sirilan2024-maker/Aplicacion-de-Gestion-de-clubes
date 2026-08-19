/**
 * TEST SUITE: MOTOR DE VALIDACIÓN Y PROCEDENCIA DE EJERCICIOS (PLANIFICADOR v1.0)
 * Antigravity Methodology OS
 */

const { validateExercise, validateExerciseBatch } = require("./src/lib/methodology/exerciseValidationEngine");

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) {
    console.log("[PASS] " + name);
    passed++;
  } else {
    console.error("[FAIL] " + name);
    failed++;
  }
}

console.log("================================================================================");
console.log("SUITE DE VALIDACIÓN Y TRAZABILIDAD DE BANCO DE EJERCICIOS");
console.log("================================================================================\n");

// Test 1: Ejercicio Válido Completo con Procedencia
const validEx = {
  nombre: "Rondo 4v2 con Transición Rápida",
  tipo: "Rondo",
  bloque_sesion: "calentamiento",
  carga_fisica: 2,
  carga_cognitiva: 3,
  oposicion: 2,
  representatividad: 3,
  dificultad: 3,
  duracion_recomendada: 15,
  min_players: 6,
  max_players: 12,
  age_category: "cadete",
  source: "RFEF - Curso Entrenadores",
  source_url: "https://rfef.es/formacion",
  author: "Área Técnica RFEF",
  license: "CC-BY-NC",
  is_verified: false
};

const res1 = validateExercise(validEx);
assert(res1.valid === true, "Ejercicio válido pasa validación");
assert(res1.sanitizedExercise.bloque_sesion === "calentamiento", "Bloque normalizado correctamente");
assert(res1.sanitizedExercise.source === "RFEF - Curso Entrenadores", "Metadato de fuente preservado");
assert(res1.sanitizedExercise.is_verified === false, "Candidato importado ingresa como is_verified=false");

// Test 2: Invariante Metodológico de Vuelta a la Calma
const invalidCooldownEx = {
  nombre: "Juego de Posición 8v8 Intenso",
  tipo: "Posicional",
  bloque_sesion: "vuelta_calma",
  carga_fisica: 4, // Inválido para vuelta a la calma
  oposicion: 4
};

const res2 = validateExercise(invalidCooldownEx);
assert(res2.valid === false, "Ejercicio de alta carga en vuelta_calma es rechazado");
assert(res2.errors.some(e => e.includes("vuelta_calma")), "Error específico de vuelta a la calma reportado");

// Test 3: Validación de Lotes y Detección de Duplicados
const batch = [
  validEx,
  { nombre: "Tarea Inválida sin Bloque", carga_fisica: 2 },
  validEx // Duplicado dentro del lote
];

const batchRes = validateExerciseBatch(batch, [{ nombre: "Otro Ejercicio Existente" }]);
assert(batchRes.validCount === 2, "2 ejercicios con formato válido en el lote");
assert(batchRes.invalidCount === 1, "1 ejercicio inválido detectado en el lote");
assert(batchRes.duplicateWarnings.length === 1, "Aviso de duplicado en lote detectado");

console.log(`\nResumen: ${passed} PASS, ${failed} FAIL`);
if (failed > 0) process.exit(1);
