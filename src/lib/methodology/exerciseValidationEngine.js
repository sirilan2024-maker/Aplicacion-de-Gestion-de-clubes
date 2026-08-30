/**
 * Motor de Validación y Normalización de Ejercicios Metodológicos v1.0 (JS/CJS)
 * Antigravity Methodology OS
 */

const VALID_AGE_CATEGORIES = [
  "querubin", "prebenjamin", "benjamin", "alevin",
  "infantil", "cadete", "juvenil", "senior",
  "u6", "u7-u8", "u9-u10", "u11-u12", "u13-u14", "u15-u16", "u17-u19"
];

const VALID_BLOCKS = ["calentamiento", "principal", "global", "vuelta_calma"];

const VALID_DRILL_TYPES = [
  "rondo", "positional_game", "ssg", "juego_global", "juego_medio",
  "conditioned_game", "individual_technical", "analítico", "analitico",
  "circuito", "calentamiento", "juego lúdico", "ludico", "táctico",
  "tactico", "posesion", "possession", "passing_pattern", "wave_attack"
];

const VALID_GAME_PHASES = [
  "attacking_build_up",
  "attacking_progression",
  "attacking_finishing",
  "defending_high_press",
  "defending_mid_block",
  "defending_low_block",
  "transition_atk_to_def",
  "transition_def_to_atk",
  "set_pieces",
  "motor_coordination"
];

function validateExercise(input) {
  const errors = [];
  const warnings = [];

  if (!input || typeof input !== "object") {
    return {
      valid: false,
      errors: ["El registro del ejercicio no es un objeto válido."],
      warnings: [],
      sanitizedExercise: null
    };
  }

  // 1. Campo Obligatorio: Nombre
  const nombre = typeof input.nombre === "string" ? input.nombre.trim() : "";
  if (!nombre || nombre.length < 3) {
    errors.push("El campo \"nombre\" es obligatorio y debe tener al menos 3 caracteres.");
  }

  // 2. Campo Obligatorio: Bloque de Sesión
  let bloque_sesion = typeof input.bloque_sesion === "string" ? input.bloque_sesion.trim().toLowerCase() : "";
  if (bloque_sesion === "activacion" || bloque_sesion === "calentamiento") bloque_sesion = "calentamiento";
  if (bloque_sesion === "principal_1" || bloque_sesion === "principal_2") bloque_sesion = "principal";
  if (bloque_sesion === "partido") bloque_sesion = "global";
  if (bloque_sesion === "regenerativo" || bloque_sesion === "vuelta a la calma") bloque_sesion = "vuelta_calma";

  if (!bloque_sesion || !VALID_BLOCKS.includes(bloque_sesion)) {
    errors.push(`El campo "bloque_sesion" es obligatorio e inválido (${input.bloque_sesion}). Debe ser uno de: ${VALID_BLOCKS.join(", ")}.`);
  }

  // 3. Campo Obligatorio: Tipo de Ejercicio
  const rawTipo = typeof input.tipo === "string" ? input.tipo.trim().toLowerCase() : "";
  if (!rawTipo || !VALID_DRILL_TYPES.includes(rawTipo)) {
    errors.push(`El campo "tipo" es desconocido o inválido ("${input.tipo}"). Debe ser un tipo reconocido del catálogo.`);
  }

  // 4. Campo Obligatorio: Fase de Juego (game_phase)
  const rawPhase = typeof input.game_phase === "string" ? input.game_phase.trim().toLowerCase() : "";
  if (!rawPhase || !VALID_GAME_PHASES.includes(rawPhase)) {
    errors.push(`El campo "game_phase" es incompatible o inválido ("${input.game_phase}"). Debe ser una fase canónica.`);
  }

  // 5. Representatividad (1-4)
  if (input.representatividad === undefined || input.representatividad === null || input.representatividad === "") {
    errors.push("El campo \"representatividad\" es obligatorio (1 a 4).");
  }
  const representatividad = Number(input.representatividad);
  if (isNaN(representatividad) || representatividad < 1 || representatividad > 4 || !Number.isInteger(representatividad)) {
    errors.push(`"representatividad" debe ser un número entero entre 1 y 4 (recibido: ${input.representatividad}).`);
  }

  // Regla de coherencia para Bloque Global: representatividad >= 3
  if (bloque_sesion === "global" && representatividad < 3) {
    errors.push(`Incompatibilidad metodológica: un ejercicio de bloque "global" debe tener representatividad >= 3 (recibida: ${representatividad}).`);
  }

  // 6. Rangos Numéricos de Cargas y Oposición (1-4)
  const carga_fisica = Number(input.carga_fisica ?? 2);
  if (isNaN(carga_fisica) || carga_fisica < 1 || carga_fisica > 4) {
    errors.push(`"carga_fisica" debe ser un número entero entre 1 y 4 (recibido: ${input.carga_fisica}).`);
  }

  const carga_cognitiva = Number(input.carga_cognitiva ?? 2);
  if (isNaN(carga_cognitiva) || carga_cognitiva < 1 || carga_cognitiva > 4) {
    errors.push(`"carga_cognitiva" debe ser un número entero entre 1 y 4 (recibido: ${input.carga_cognitiva}).`);
  }

  const oposicion = Number(input.oposicion ?? 2);
  if (isNaN(oposicion) || oposicion < 1 || oposicion > 4) {
    errors.push(`"oposicion" debe ser un número entero entre 1 y 4 (recibido: ${input.oposicion}).`);
  }

  const dificultad = Number(input.dificultad ?? 2);
  if (isNaN(dificultad) || dificultad < 1 || dificultad > 5) {
    errors.push(`"dificultad" debe ser un número entre 1 y 5 (recibido: ${input.dificultad}).`);
  }

  const intensity_level = Number(input.intensity_level ?? dificultad ?? 3);
  if (isNaN(intensity_level) || intensity_level < 1 || intensity_level > 5) {
    errors.push(`"intensity_level" debe ser un número entre 1 y 5 (recibido: ${input.intensity_level}).`);
  }

  // 7. Duración (minutos)
  const duracion_recomendada = Number(input.duracion_recomendada ?? 15);
  if (isNaN(duracion_recomendada) || duracion_recomendada < 3 || duracion_recomendada > 90) {
    errors.push(`"duracion_recomendada" debe estar entre 3 y 90 minutos (recibido: ${input.duracion_recomendada}).`);
  }

  // 8. Jugadores Mínimos y Máximos
  const min_players = Number(input.min_players ?? 2);
  const max_players = Number(input.max_players ?? Math.max(min_players, 18));
  if (isNaN(min_players) || min_players < 1) {
    errors.push('"min_players" debe ser al menos 1.');
  }
  if (isNaN(max_players) || max_players < min_players) {
    errors.push('"max_players" debe ser mayor o igual que "min_players".');
  }

  // 9. Categoría de Edad
  let age_category = typeof input.age_category === "string" ? input.age_category.trim().toLowerCase() : "";
  let categoria_edad = Array.isArray(input.categoria_edad) 
    ? input.categoria_edad.map(c => String(c).trim().toLowerCase()) 
    : (age_category ? [age_category] : []);

  if (!age_category && categoria_edad.length > 0) {
    age_category = categoria_edad[0];
  }

  if (!age_category || !VALID_AGE_CATEGORIES.includes(age_category)) {
    errors.push(`La categoría de edad ("${input.age_category || input.categoria_edad}") es obligatoria y debe ser válida.`);
  }

  // 10. Coherencia entre Principio/Objetivo y Fase de Juego
  const allText = [
    nombre,
    input.descripcion || "",
    ...(Array.isArray(input.objetivo_tactico) ? input.objetivo_tactico : [input.objetivo_tactico || ""]),
    input.principle_name || ""
  ].join(" ").toLowerCase();

  const isFinishingFocus = allText.includes("finalizac") || allText.includes("remate") || allText.includes("tiro a puerta");
  const isDefensivePhase = rawPhase.startsWith("defending_");
  if (isFinishingFocus && isDefensivePhase) {
    errors.push(`Incompatibilidad metodológica: el objetivo/principio es de finalización pero la fase declarada es defensiva ("${rawPhase}").`);
  }

  const isHighPressFocus = allText.includes("presion alta") || allText.includes("pressing alto") || allText.includes("acoso alto");
  const isAttackingPhase = rawPhase.startsWith("attacking_");
  if (isHighPressFocus && isAttackingPhase) {
    errors.push(`Incompatibilidad metodológica: el objetivo/principio es de presión alta pero la fase declarada es ofensiva ("${rawPhase}").`);
  }

  // 11. Regla de Coherencia de Vuelta a la Calma
  if (bloque_sesion === "vuelta_calma") {
    if (carga_fisica > 2) {
      errors.push(`Incompatibilidad metodológica: un ejercicio de "vuelta_calma" no puede tener carga física > 2 (recibida: ${carga_fisica}).`);
    }
    if (oposicion > 1) {
      errors.push(`Incompatibilidad metodológica: un ejercicio de "vuelta_calma" debe tener oposición <= 1 (oposicion recibida: ${oposicion}).`);
    }
  }

  const toCleanArray = (val) => {
    if (Array.isArray(val)) return val.map(v => String(v).trim()).filter(Boolean);
    if (typeof val === "string") return val.split(",").map(v => v.trim()).filter(Boolean);
    return [];
  };

  const objetivo_tecnico = toCleanArray(input.objetivo_tecnico);
  const objetivo_tactico = toCleanArray(input.objetivo_tactico);
  const material = toCleanArray(input.material);
  const tags = toCleanArray(input.tags);
  const criterios_exito = toCleanArray(input.criterios_exito);
  const variantes = toCleanArray(input.variantes);

  const sanitized = {
    id: input.id,
    nombre,
    tipo: typeof input.tipo === "string" ? input.tipo.trim() : "SSG",
    descripcion: typeof input.descripcion === "string" ? input.descripcion.trim() : "",
    correcciones: typeof input.correcciones === "string" ? input.correcciones.trim() : "",
    objetivo_tecnico,
    objetivo_tactico,
    categoria_edad: categoria_edad.length > 0 ? categoria_edad : [age_category],
    age_category,
    dificultad: Math.round(dificultad),
    duracion_recomendada: Math.round(duracion_recomendada),
    min_players: Math.round(min_players),
    max_players: Math.round(max_players),
    material: material.length > 0 ? material : ["balones", "conos", "petos"],
    variantes,
    tags,
    bloque_sesion,
    carga_fisica: Math.round(carga_fisica),
    carga_cognitiva: Math.round(carga_cognitiva),
    oposicion: Math.round(oposicion),
    representatividad: Math.round(representatividad),
    intensity_level: Math.round(intensity_level),
    game_phase: typeof input.game_phase === "string" ? input.game_phase.trim() : "general",
    drill_structure: typeof input.drill_structure === "string" ? input.drill_structure.trim() : (input.tipo || "ssg"),
    espacio: typeof input.espacio === "string" ? input.espacio.trim() : "Medio campo",
    criterios_exito,
    progresion_descripcion: typeof input.progresion_descripcion === "string" ? input.progresion_descripcion.trim() : "",
    regresion_descripcion: typeof input.regresion_descripcion === "string" ? input.regresion_descripcion.trim() : "",
    principle_id: input.principle_id || null,
    subprinciple_id: input.subprinciple_id || null,
    source: typeof input.source === "string" ? input.source.trim() : "manual_import",
    source_url: typeof input.source_url === "string" ? input.source_url.trim() : null,
    author: typeof input.author === "string" ? input.author.trim() : "Sporting Saladar",
    license: typeof input.license === "string" ? input.license.trim() : "Internal / Proprietary",
    is_verified: typeof input.is_verified === "boolean" ? input.is_verified : false
  };

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    sanitizedExercise: errors.length === 0 ? sanitized : null
  };
}

function validateExerciseBatch(items, existingExercises = []) {
  const validExercises = [];
  const errorsList = [];
  const duplicateWarnings = [];

  const existingNames = new Set(existingExercises.map(e => (e.nombre || "").toLowerCase().trim()));
  const batchNames = new Set();

  (items || []).forEach((item, index) => {
    const res = validateExercise(item);
    const itemName = (item?.nombre || `Ítem #${index + 1}`).trim();

    if (!res.valid || !res.sanitizedExercise) {
      errorsList.push({
        index: index + 1,
        name: itemName,
        errors: res.errors
      });
      return;
    }

    const lowerName = itemName.toLowerCase();
    if (existingNames.has(lowerName)) {
      duplicateWarnings.push({
        index: index + 1,
        name: itemName,
        message: `El ejercicio "${itemName}" ya existe en la biblioteca.`
      });
    } else if (batchNames.has(lowerName)) {
      duplicateWarnings.push({
        index: index + 1,
        name: itemName,
        message: `El ejercicio "${itemName}" está duplicado en el lote.`
      });
    }
    batchNames.add(lowerName);

    validExercises.push(res.sanitizedExercise);
  });

  return {
    validCount: validExercises.length,
    invalidCount: errorsList.length,
    validExercises,
    errors: errorsList,
    duplicateWarnings
  };
}

module.exports = {
  validateExercise,
  validateExerciseBatch
};
