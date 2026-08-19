/**
 * Motor de Validación y Normalización de Ejercicios Metodológicos v1.0
 * Antigravity Methodology OS
 * Valida schema, coherencia pedagógica, rangos numéricos y procedencia de ejercicios
 */

export interface ExerciseImportInput {
  id?: string;
  nombre: string;
  tipo?: string;
  descripcion?: string;
  correcciones?: string;
  objetivo_tecnico?: string[];
  objetivo_tactico?: string[];
  categoria_edad?: string[];
  age_category?: string;
  dificultad?: number;
  duracion_recomendada?: number;
  min_players?: number;
  max_players?: number;
  material?: string[];
  variantes?: string[];
  tags?: string[];
  bloque_sesion?: 'calentamiento' | 'principal' | 'global' | 'vuelta_calma' | string;
  carga_fisica?: number;
  carga_cognitiva?: number;
  oposicion?: number;
  representatividad?: number;
  intensity_level?: number;
  game_phase?: string;
  drill_structure?: string;
  espacio?: string;
  criterios_exito?: string[];
  progresion_descripcion?: string;
  regresion_descripcion?: string;
  principle_id?: string;
  subprinciple_id?: string;
  source?: string;
  source_url?: string;
  author?: string;
  license?: string;
  is_verified?: boolean;
}

export interface ExerciseValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedExercise: ExerciseImportInput | null;
}

const VALID_AGE_CATEGORIES = [
  'querubin', 'prebenjamin', 'benjamin', 'alevin',
  'infantil', 'cadete', 'juvenil', 'senior',
  'u6', 'u7-u8', 'u9-u10', 'u11-u12', 'u13-u14', 'u15-u16', 'u17-u19'
];

const VALID_BLOCKS = ['calentamiento', 'principal', 'global', 'vuelta_calma'];

/**
 * Valida estrictamente un ejercicio individual antes de su persistencia
 */
export function validateExercise(input: any): ExerciseValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!input || typeof input !== 'object') {
    return {
      valid: false,
      errors: ['El registro del ejercicio no es un objeto válido.'],
      warnings: [],
      sanitizedExercise: null
    };
  }

  // 1. Campo Obligatorio: Nombre
  const nombre = typeof input.nombre === 'string' ? input.nombre.trim() : '';
  if (!nombre || nombre.length < 3) {
    errors.push('El campo "nombre" es obligatorio y debe tener al menos 3 caracteres.');
  }

  // 2. Campo Obligatorio: Bloque de Sesión
  let bloque_sesion = typeof input.bloque_sesion === 'string' ? input.bloque_sesion.trim().toLowerCase() : '';
  if (bloque_sesion === 'activacion' || bloque_sesion === 'calentamiento') bloque_sesion = 'calentamiento';
  if (bloque_sesion === 'principal_1' || bloque_sesion === 'principal_2') bloque_sesion = 'principal';
  if (bloque_sesion === 'partido') bloque_sesion = 'global';
  if (bloque_sesion === 'regenerativo' || bloque_sesion === 'vuelta a la calma') bloque_sesion = 'vuelta_calma';

  if (!bloque_sesion || !VALID_BLOCKS.includes(bloque_sesion)) {
    errors.push(`El campo "bloque_sesion" es inválido (${input.bloque_sesion}). Debe ser uno de: ${VALID_BLOCKS.join(', ')}.`);
  }

  // 3. Rangos Numéricos de Cargas y Oposición (1-4)
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

  const representatividad = Number(input.representatividad ?? 2);
  if (isNaN(representatividad) || representatividad < 1 || representatividad > 4) {
    errors.push(`"representatividad" debe ser un número entero entre 1 y 4 (recibido: ${input.representatividad}).`);
  }

  const dificultad = Number(input.dificultad ?? 2);
  if (isNaN(dificultad) || dificultad < 1 || dificultad > 5) {
    errors.push(`"dificultad" debe ser un número entre 1 y 5 (recibido: ${input.dificultad}).`);
  }

  const intensity_level = Number(input.intensity_level ?? dificultad ?? 3);
  if (isNaN(intensity_level) || intensity_level < 1 || intensity_level > 5) {
    errors.push(`"intensity_level" debe ser un número entre 1 y 5 (recibido: ${input.intensity_level}).`);
  }

  // 4. Duración (minutos)
  const duracion_recomendada = Number(input.duracion_recomendada ?? 15);
  if (isNaN(duracion_recomendada) || duracion_recomendada < 3 || duracion_recomendada > 90) {
    errors.push(`"duracion_recomendada" debe estar entre 3 y 90 minutos (recibido: ${input.duracion_recomendada}).`);
  }

  // 5. Jugadores Mínimos y Máximos
  const min_players = Number(input.min_players ?? 2);
  const max_players = Number(input.max_players ?? Math.max(min_players, 18));
  if (isNaN(min_players) || min_players < 1) {
    errors.push('"min_players" debe ser al menos 1.');
  }
  if (isNaN(max_players) || max_players < min_players) {
    errors.push('"max_players" debe ser mayor o igual que "min_players".');
  }

  // 6. Validación de Categoría de Edad
  let age_category = typeof input.age_category === 'string' ? input.age_category.trim().toLowerCase() : '';
  let categoria_edad = Array.isArray(input.categoria_edad) 
    ? input.categoria_edad.map((c: any) => String(c).trim().toLowerCase()) 
    : (age_category ? [age_category] : []);

  if (!age_category && categoria_edad.length > 0) {
    age_category = categoria_edad[0];
  }

  if (!age_category || !VALID_AGE_CATEGORIES.includes(age_category)) {
    warnings.push(`Categoría "${age_category}" no estandarizada. Se registrará como general.`);
    age_category = age_category || 'infantil';
  }

  // 7. Regla de Coherencia de Vuelta a la Calma (Invariante Metodológico)
  if (bloque_sesion === 'vuelta_calma') {
    if (carga_fisica > 2) {
      errors.push(`Incompatibilidad metodológica: un ejercicio de "vuelta_calma" no puede tener carga física > 2 (recibida: ${carga_fisica}).`);
    }
    if (oposicion > 2) {
      errors.push(`Incompatibilidad metodológica: un ejercicio de "vuelta_calma" no puede tener oposición activa alta (oposicion recibida: ${oposicion}).`);
    }
  }

  // 8. Normalización de Arrays
  const toCleanArray = (val: any): string[] => {
    if (Array.isArray(val)) return val.map(v => String(v).trim()).filter(Boolean);
    if (typeof val === 'string') return val.split(',').map(v => v.trim()).filter(Boolean);
    return [];
  };

  const objetivo_tecnico = toCleanArray(input.objetivo_tecnico);
  const objetivo_tactico = toCleanArray(input.objetivo_tactico);
  const material = toCleanArray(input.material);
  const tags = toCleanArray(input.tags);
  const criterios_exito = toCleanArray(input.criterios_exito);
  const variantes = toCleanArray(input.variantes);

  const sanitized: ExerciseImportInput = {
    id: input.id,
    nombre,
    tipo: typeof input.tipo === 'string' ? input.tipo.trim() : 'SSG',
    descripcion: typeof input.descripcion === 'string' ? input.descripcion.trim() : '',
    correcciones: typeof input.correcciones === 'string' ? input.correcciones.trim() : '',
    objetivo_tecnico,
    objetivo_tactico,
    categoria_edad: categoria_edad.length > 0 ? categoria_edad : [age_category],
    age_category,
    dificultad: Math.round(dificultad),
    duracion_recomendada: Math.round(duracion_recomendada),
    min_players: Math.round(min_players),
    max_players: Math.round(max_players),
    material: material.length > 0 ? material : ['balones', 'conos', 'petos'],
    variantes,
    tags,
    bloque_sesion,
    carga_fisica: Math.round(carga_fisica),
    carga_cognitiva: Math.round(carga_cognitiva),
    oposicion: Math.round(oposicion),
    representatividad: Math.round(representatividad),
    intensity_level: Math.round(intensity_level),
    game_phase: typeof input.game_phase === 'string' ? input.game_phase.trim() : 'general',
    drill_structure: typeof input.drill_structure === 'string' ? input.drill_structure.trim() : (input.tipo || 'ssg'),
    espacio: typeof input.espacio === 'string' ? input.espacio.trim() : 'Medio campo',
    criterios_exito,
    progresion_descripcion: typeof input.progresion_descripcion === 'string' ? input.progresion_descripcion.trim() : '',
    regresion_descripcion: typeof input.regresion_descripcion === 'string' ? input.regresion_descripcion.trim() : '',
    principle_id: input.principle_id || null,
    subprinciple_id: input.subprinciple_id || null,
    source: typeof input.source === 'string' ? input.source.trim() : 'manual_import',
    source_url: typeof input.source_url === 'string' ? input.source_url.trim() : null,
    author: typeof input.author === 'string' ? input.author.trim() : 'Sporting Saladar',
    license: typeof input.license === 'string' ? input.license.trim() : 'Internal / Proprietary',
    is_verified: typeof input.is_verified === 'boolean' ? input.is_verified : false
  };

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    sanitizedExercise: errors.length === 0 ? sanitized : null
  };
}

/**
 * Valida un lote completo de ejercicios importados desde JSON o CSV parseado
 */
export function validateExerciseBatch(
  items: any[], 
  existingExercises: { nombre: string; id?: string }[] = []
): {
  validCount: number;
  invalidCount: number;
  validExercises: ExerciseImportInput[];
  errors: { index: number; name: string; errors: string[] }[];
  duplicateWarnings: { index: number; name: string; message: string }[];
} {
  const validExercises: ExerciseImportInput[] = [];
  const errorsList: { index: number; name: string; errors: string[] }[] = [];
  const duplicateWarnings: { index: number; name: string; message: string }[] = [];

  const existingNames = new Set(existingExercises.map(e => (e.nombre || '').toLowerCase().trim()));
  const batchNames = new Set<string>();

  items.forEach((item, index) => {
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
        message: `El ejercicio "${itemName}" ya existe en la biblioteca. Se importará como candidato pendiente de revisión.`
      });
    } else if (batchNames.has(lowerName)) {
      duplicateWarnings.push({
        index: index + 1,
        name: itemName,
        message: `El ejercicio "${itemName}" está duplicado dentro del mismo lote.`
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
