/**
 * MOTOR DE AFINIDAD TÁCTICA Y COMPATIBILIDAD CURRICULAR DEFINITIVO (V3)
 * 
 * Principio rector: "¿Este ejercicio trabaja realmente el principio táctico consultado?"
 * Precedencia táctica absoluta sobre edad, dificultad, categoría y tags genéricos.
 * Invariante dura: if (!hasMeaningfulTacticalAffinity(ex, principle)) return null;
 */

export type TacticalAffinityLevel = "DIRECT" | "SECONDARY" | "NONE";
export type CompatibilityLevel = "ALTA" | "MEDIA" | "ADAPTABLE";

export interface TacticalEvidenceItem {
  field: "title" | "tactical_objective" | "tag" | "description" | "game_phase";
  matchedConcept: string;
  weight: number;
  isDirect: boolean;
  explanation: string;
}

export interface RejectedEvidenceItem {
  field: string;
  term: string;
  reason: string;
}

export interface TacticalAffinityEvaluation {
  hasMeaningfulAffinity: boolean;
  affinity: TacticalAffinityLevel;
  affinityType: TacticalAffinityLevel;
  directEvidenceCount: number;
  secondaryEvidenceCount: number;
  tacticalScore: number; // Puntuación puramente táctica (0 - 30)
  evidence: TacticalEvidenceItem[];
  rejectedEvidence: RejectedEvidenceItem[];
  negativeContradictions: string[];
  exclusionReason: string | null;
  reasons?: string[];
}

export interface TacticalExplicability extends TacticalAffinityEvaluation {
  categoryScore: number;
  difficultyScore: number;
  methodologyScore: number;
  finalScore: number | null;
  level: CompatibilityLevel | null;
  stageBadge: string;
  matchReasons: string[];
}

export interface ScoredExerciseResult {
  exercise: any;
  score: number;
  compatibilityLevel: CompatibilityLevel;
  stageBadge: string;
  matchReasons: string[];
  explicability: TacticalExplicability;
}

export interface PrincipleConceptDefinition {
  // Frases compuestas exactas que demuestran inequívocamente el principio táctico en título u objetivo
  primaryExactPhrases: string[];
  // Conceptos tácticos primarios equivalentes con especificidad táctica
  primaryTacticalConcepts: string[];
  // Conceptos secundarios que aportan contexto táctico complementario
  secondaryTacticalConcepts: string[];
  // Términos técnicos o genéricos (pase, posesión, 1v1, tiro, etc.) que NO demuestran el principio táctico por sí solos
  genericTechnicalTerms: string[];
  // Términos aislados prohibidos (polisemia o ambigüedad)
  forbiddenIsolatedStems: string[];
  // Términos contradictorios o negativos cuyo contexto anula la pertinencia
  conflictingContexts: string[];
  // Fases del juego compatibles
  compatiblePhases: string[];
}

export const PRINCIPLE_TAXONOMY: Record<string, PrincipleConceptDefinition> = {
  "circulacion": {
    primaryExactPhrases: [
      "cambio de orientacion", "cambios de orientacion", "cambiar de orientacion",
      "circulacion rapida", "circulacion de balon", "circulacion y cambio",
      "tercer hombre", "circulacion y tercer hombre",
      "girar el juego", "bascular el balon", "circulacion con amplitud",
      "juego de posicion con cambio", "mantenimiento de posesion",
      "atraer por dentro para jugar por fuera", "cambio de orientacion diagonal",
      "posesion y cambio de orientacion", "robo y cambio de orientacion",
      "dinamica de cambios de orientacion", "posesion y circulacion", "circulacion y posesion"
    ],
    primaryTacticalConcepts: [
      "circulacion rapida", "cambio de orientacion", "cambios de orientacion", "cambiar de orientacion",
      "circulacion de balon", "circulacion", "girar el juego", "bascular el balon",
      "circulacion con amplitud", "posesion", "mantenimiento de posesion", "conservacion"
    ],
    secondaryTacticalConcepts: [
      "tercer hombre", "fijar y atraer", "lado debil", "lado opuesto", "amplitud ofensiva",
      "amplitud", "dos toques", "2 toques", "ritmo de juego",
      "triangulacion", "linea de pase", "apoyo y pase", "dar la vuelta",
      "superioridad numerica", "interiores", "orientar el juego", "apoyos", "juego de posicion"
    ],
    genericTechnicalTerms: [
      "rueda de pases", "rueda de pase", "pase", "pases", "conduccion",
      "1v1", "2v2", "juego reducido", "juego global", "calentamiento", "circuito"
    ],
    forbiddenIsolatedStems: [
      "orientacion", "orientar", "fase", "juego", "espacio",
      "pase", "conduccion", "circuito", "rueda"
    ],
    conflictingContexts: [
      "mantenimiento fisico", "hiit", "psicomotriz", "psicomotricidad", "caza-tesoros",
      "el zoo", "fuerza", "resistencia", "coordinacion general", "pilla-pilla", "relevos",
      "finalizacion en carrera", "1v1 con portero", "tiro a puerta analitico",
      "orientacion espacial", "orientacion motriz"
    ],
    compatiblePhases: [
      "attacking_build_up", "attacking_progression", "attacking_finishing", "possession",
      "juego_medio", "rondo", "Posicional", "posicional", "posesion", "Ataque", "ataque"
    ]
  },

  "basculacion": {
    primaryExactPhrases: [
      "basculacion defensiva", "compactacion de bloque", "bloque defensivo", "bloque medio",
      "bloque bajo", "achique de espacios", "lineas juntas", "defensa zonal", "cobertura defensiva",
      "coberturas defensivas", "equilibrio defensivo", "densidad defensiva", "cerrar pasillo interior",
      "basculacion y bloque medio", "basculacion y bloque", "basculacion", "bascular", "defender en zona",
      "relevo defensivo", "coberturas en pasillo", "batalla de coberturas defensivas",
      "defensa de la ultima linea", "fuera de juego y cobertura", "cobertura a la espalda"
    ],
    primaryTacticalConcepts: [
      "basculacion", "bascular", "compactacion", "bloque defensivo", "bloque medio", "bloque bajo",
      "bloque compacto", "achique de espacios", "lineas juntas", "defensa zonal",
      "cobertura defensiva", "coberturas", "equilibrio defensivo", "densidad defensiva",
      "cerrar pasillo", "defensa en zona", "relevos defensivos", "cobertura a la espalda",
      "organizacion defensiva", "defensa organizada"
    ],
    secondaryTacticalConcepts: [
      "interlineas", "lado debil defensivo", "vigilancia defensiva", "marcaje zonal",
      "reduccion de espacios", "temporizacion defensiva", "ayudas defensivas", "ayudas permanentes",
      "permutas", "vigilancias", "temporizar"
    ],
    genericTechnicalTerms: [
      "duelo 1v1", "entrada", "interceptacion", "despeje", "partido", "juego reducido", "rondo"
    ],
    forbiddenIsolatedStems: [
      "bloque", "zona", "espacio", "linea", "medio", "bajo", "vigilancia", "cobertura", "duelo"
    ],
    conflictingContexts: [
      "corner", "abp", "tiro", "finalizacion", "salida de balon", "cambio de orientacion",
      "circulacion rapida", "contraataque directo", "bloqueo en abp",
      "superar el bloque", "superar bloque", "romper el bloque", "ataque contra bloque",
      "ataque posicional vs bloque", "superar el bloque defensivo"
    ],
    compatiblePhases: [
      "defending", "defending_mid_block", "defending_high_press", "defensive_game",
      "Defensa", "defensa", "defensive_organization"
    ]
  },

  "presion alta": {
    primaryExactPhrases: [
      "presion alta", "pressing alto", "pressing en bloque alto", "salto a la presion",
      "bloque adelantado", "recuperacion en campo rival", "bloqueo de salida", "linea de presion",
      "orientar la salida rival", "presion en inicio rival", "acoso en primer tercio",
      "salida de balon vs presion alta", "salida de balon ante presion alta", "pressing alto y bloqueo",
      "pressing tras perdida", "presion tras perdida", "presion en rondo"
    ],
    primaryTacticalConcepts: [
      "presion alta", "pressing alto", "pressing en bloque alto", "bloque adelantado", "salto a la presion",
      "salto de presion", "acoso al poseedor", "recuperacion en campo rival", "bloqueo de salida",
      "linea de presion", "orientar la salida", "presion en bloque alto", "pressing tras perdida", "presion tras perdida"
    ],
    secondaryTacticalConcepts: [
      "intrapresion", "provocar error", "cerrar lineas de pase", "robo en campo contrario",
      "ahogo", "acoso intensivo", "recuperar", "acoso"
    ],
    genericTechnicalTerms: [
      "robo", "pressing", "presion", "salto", "partido", "oleadas"
    ],
    forbiddenIsolatedStems: [
      "presion", "pressing", "robo", "salto", "linea", "campo", "bloque"
    ],
    conflictingContexts: [
      "cambio de orientacion", "cambios de orientacion", "finalizacion", "pase atras", "conduce y marca",
      "tiro", "salida limpia", "construccion", "posesion y cambio", "transicion ofensiva directa",
      "bloque bajo", "repliegue intensivo", "superar la presion", "romper la presion", "escapar de la presion"
    ],
    compatiblePhases: [
      "defending", "defending_high_press", "transition_atk_to_def", "defensive_game",
      "Defensa", "defensa", "pressing"
    ]
  },

  "salida de balon": {
    primaryExactPhrases: [
      "salida de balon", "inicio de juego", "salida limpia", "primer tercio", "salida en corto",
      "tercer hombre en salida", "superar primera linea de presion", "salida desde meta",
      "salida de balon vs presion alta", "salida 4v3"
    ],
    primaryTacticalConcepts: [
      "salida de balon", "inicio de juego", "construccion", "salida limpia", "primer tercio",
      "salida en corto", "tercer hombre en salida", "superar primera linea", "salida de puerta"
    ],
    secondaryTacticalConcepts: [
      "fijar y atraer", "atraer rivales", "centrales", "portero", "salida", "amplitud en inicio",
      "juego con portero"
    ],
    genericTechnicalTerms: ["pase", "pase corto", "control", "recepcion"],
    forbiddenIsolatedStems: ["salida", "inicio", "juego", "balon"],
    conflictingContexts: ["abp", "corner", "falta", "bloque bajo", "repliegue intensivo", "finalizacion"],
    compatiblePhases: ["attacking_build_up", "possession", "juego_medio", "Ataque", "ataque"]
  },

  "progresion": {
    primaryExactPhrases: [
      "progresion con balon", "pase filtrado", "superar lineas", "conduccion fijadora",
      "escalonamiento", "hombre libre", "juego vertical", "espaldas de pivotes",
      "progresion escalonada", "fijacion de marcas", "duelos 1v1", "duelo 1v1", "1v1",
      "1 contra 1", "1 c 1", "1c1", "1v1 ofensivo", "desborde 1v1", "desborde",
      "superacion de lineas", "regate", "acciones de 1c1", "fijar y desbordar",
      "zonas de desborde 1v1", "duelos interiores", "conduccion y regate", "1v1 y superacion",
      "duelo individual", "desborde individual", "1 contra 1 frontal"
    ],
    primaryTacticalConcepts: [
      "progresion", "progresion con balon", "pase filtrado", "superar lineas", "conduccion fijadora",
      "escalonamiento", "hombre libre", "espaldas de pivotes", "juego vertical", "lineas de pase verticales",
      "duelos 1v1", "duelo 1v1", "1v1", "1 contra 1", "1 c 1", "1c1", "1v1 ofensivo", "desborde 1v1",
      "desborde", "superacion de lineas", "fijar y desbordar", "regate", "zonas de desborde 1v1",
      "duelos interiores", "duelos", "superar linea"
    ],
    secondaryTacticalConcepts: [
      "verticalidad", "linea de pase", "superar", "conduccion", "desmarque de ruptura", "pasillos interiores",
      "cambio de ritmo", "conduccion hacia adelante"
    ],
    genericTechnicalTerms: ["carrera"],
    forbiddenIsolatedStems: ["pase", "linea"],
    conflictingContexts: ["bloque bajo", "replegar", "abp", "corner", "saque de banda"],
    compatiblePhases: ["attacking_build_up", "attacking_progression", "possession", "Ataque", "ataque"]
  },

  "finalizacion": {
    primaryExactPhrases: [
      "finalizacion en area", "tiro a porteria", "ultimo tercio", "centro y remate",
      "llegada de segunda linea", "disparo a puerta", "definicion 1v1 con portero",
      "eficacia en ultimo tercio", "remate a porteria", "finalizacion tras centro lateral",
      "finalizacion tras centro", "centro lateral y remate", "oleadas de finalizacion"
    ],
    primaryTacticalConcepts: [
      "finalizacion", "remate", "tiro a porteria", "ultimo tercio", "centro y remate",
      "llegada de segunda linea", "disparo", "definicion", "area rival", "finalizacion tras centro"
    ],
    secondaryTacticalConcepts: [
      "gol", "remates", "tiro", "centros", "rechace", "segunda jugada ofensiva"
    ],
    genericTechnicalTerms: ["tiro", "chut", "gol", "remate"],
    forbiddenIsolatedStems: ["tiro", "gol", "final", "centro"],
    conflictingContexts: ["salida de balon", "inicio de juego", "bloque bajo", "replegar"],
    compatiblePhases: ["attacking_finishing", "attacking_progression", "Ataque", "ataque"]
  },

  "transicion defensiva": {
    primaryExactPhrases: [
      "transicion defensiva", "reaccion tras perdida", "presion tras perdida",
      "3 segundos tras perdida", "replegar rapido", "reorganizacion defensiva", "falta tactica",
      "presion inmediata tras perdida"
    ],
    primaryTacticalConcepts: [
      "transicion defensiva", "tras perdida", "reaccion inmediata tras perdida", "presion tras perdida",
      "3 segundos tras perdida", "replegar rapido", "falta tactica", "reorganizacion defensiva",
      "cambio de chip defensivo"
    ],
    secondaryTacticalConcepts: [
      "replegar", "perdida", "freno", "temporizar tras perdida", "balance defensivo"
    ],
    genericTechnicalTerms: ["perdida", "recuperacion"],
    forbiddenIsolatedStems: ["perdida", "transicion", "defensa"],
    conflictingContexts: ["corner", "saque de esquina", "salida de balon", "ataque posicional"],
    compatiblePhases: ["transition_atk_to_def", "defending_high_press", "Transición Ataque-Defensa"]
  },

  "transicion ofensiva": {
    primaryExactPhrases: [
      "transicion ofensiva", "contraataque directo", "despliegue rapido",
      "salida vertical tras robo", "pase de seguridad tras robo", "ataque rapido",
      "transicion ofensiva directa", "despliegue tras recuperacion"
    ],
    primaryTacticalConcepts: [
      "transicion ofensiva", "contraataque", "despliegue rapido", "salida vertical tras robo",
      "pase de seguridad tras robo", "ataque rapido", "transicion veloz", "despliegue ofensivo"
    ],
    secondaryTacticalConcepts: [
      "despliegue", "contra", "velocidad tras recuperacion", "verticalidad tras robo"
    ],
    genericTechnicalTerms: ["contra", "carrera", "despliegue"],
    forbiddenIsolatedStems: ["transicion", "ataque", "contra"],
    conflictingContexts: ["bloque bajo", "mantenimiento", "posesion lenta", "abp"],
    compatiblePhases: ["transition_def_to_atk", "attacking_finishing", "attacking_progression", "Transición Defensa-Ataque"]
  },

  "balon parado": {
    primaryExactPhrases: [
      "balon parado", "estrategia a balon parado", "saque de esquina", "corner ofensivo",
      "corner defensivo", "falta lateral", "falta frontal", "bloqueo y desmarque",
      "organizacion en balon parado", "abp"
    ],
    primaryTacticalConcepts: [
      "abp", "corner", "falta lateral", "falta frontal", "saque de esquina", "balon parado",
      "estrategia a balon parado", "bloqueo y desmarque", "segundo palo"
    ],
    secondaryTacticalConcepts: [
      "penalti", "saque de banda", "barrera", "segunda jugada abp"
    ],
    genericTechnicalTerms: ["falta", "saque", "remate de cabeza"],
    forbiddenIsolatedStems: ["falta", "saque", "parado"],
    conflictingContexts: ["juego abierto", "posesion", "rondo", "juego de posicion"],
    compatiblePhases: ["set_pieces", "abp", "Balón Parado", "balon_parado"]
  }
};

export const STAGES_ORDER = ["querubin", "prebenjamin", "benjamin", "alevin", "infantil", "cadete", "juvenil", "senior"];

export function getStageIndex(stageSlug: string): number {
  const norm = (stageSlug || "").toLowerCase().trim();
  const idx = STAGES_ORDER.indexOf(norm);
  return idx >= 0 ? idx : 3;
}

export const STAGE_COMPLEXITY_RULES: Record<string, { idealDiff: number[]; maxDiff: number; maxPlayers: number; preferredTypes?: string[] }> = {
  "querubin": {
    idealDiff: [1, 2],
    maxDiff: 3,
    maxPlayers: 12,
    preferredTypes: ["ludico", "circuito", "analitico", "rondo", "individual_technical", "Juego Lúdico", "Circuito", "Analítico", "SSG"]
  },
  "prebenjamin": {
    idealDiff: [1, 2],
    maxDiff: 3,
    maxPlayers: 14,
    preferredTypes: ["ludico", "circuito", "analitico", "rondo", "individual_technical", "SSG", "Juego Lúdico", "Circuito"]
  },
  "benjamin": {
    idealDiff: [2, 3],
    maxDiff: 4,
    maxPlayers: 16,
    preferredTypes: ["rondo", "possession", "posesion", "SSG", "circuito", "analitico", "juego_medio", "Rondo", "Posicional"]
  },
  "alevin": {
    idealDiff: [2, 3, 4],
    maxDiff: 4,
    maxPlayers: 18,
    preferredTypes: ["rondo", "positional_game", "possession", "SSG", "juego_medio", "juego_global", "tactico", "conditioned_game"]
  },
  "infantil": {
    idealDiff: [3, 4],
    maxDiff: 5,
    maxPlayers: 22,
    preferredTypes: ["positional_game", "SSG", "tactico", "possession", "juego_global", "rondo", "conditioned_game"]
  },
  "cadete": {
    idealDiff: [3, 4, 5],
    maxDiff: 5,
    maxPlayers: 22,
    preferredTypes: ["positional_game", "SSG", "tactico", "conditioned_game", "juego_global", "possession"]
  },
  "juvenil": {
    idealDiff: [3, 4, 5],
    maxDiff: 5,
    maxPlayers: 22,
    preferredTypes: ["positional_game", "tactico", "SSG", "conditioned_game", "juego_global", "possession"]
  },
  "senior": {
    idealDiff: [3, 4, 5],
    maxDiff: 5,
    maxPlayers: 22,
    preferredTypes: ["positional_game", "tactico", "SSG", "conditioned_game", "juego_global", "possession", "fisico"]
  }
};

export function normalizeText(text: any): string {
  if (!text) return "";
  if (typeof text !== "string") {
    if (typeof text.name === "string") return normalizeText(text.name);
    return String(text);
  }
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getPrincipleTaxonomyKey(principleName: string): string {
  const norm = normalizeText(principleName);

  // 1. Transición Defensiva / Presión Tras Pérdida / Repliegue / Reacción Tras Pérdida
  // Evaluado con precedencia sobre la palabra genérica "presion"
  if (
    norm.includes("transicion defensiva") || 
    norm.includes("tras perdida") || 
    norm.includes("presion inmediata tras perdida") ||
    norm.includes("presion tras perdida") ||
    norm.includes("pressing tras perdida") ||
    norm.includes("repliegue") ||
    norm.includes("balance defensivo") ||
    norm.includes("reorganizacion defensiva") ||
    norm.includes("contra-presion") ||
    norm.includes("re-presion")
  ) {
    return "transicion defensiva";
  }

  // 2. Circulación / Posesión / Amplitud / Cambios de Orientación / Conservación
  if (
    norm.includes("circulac") || 
    norm.includes("cambio de orientac") || 
    norm.includes("cambios de orientac") ||
    norm.includes("posesion") || 
    norm.includes("conservacion") || 
    norm.includes("mantenimiento") ||
    norm.includes("amplitud") ||
    norm.includes("juego exterior") ||
    norm.includes("juego asociativo") ||
    norm.includes("girar el juego")
  ) {
    return "circulacion";
  }

  // 3. Basculación / Organización Defensiva / Bloque Medio-Bajo / Defensa Zonal / Coberturas
  if (
    norm.includes("basculac") || 
    norm.includes("compactac") || 
    norm.includes("bloque bajo") || 
    norm.includes("bloque medio") ||
    norm.includes("organizacion defensiva") || 
    norm.includes("defensa organizada") ||
    norm.includes("defensa zonal") || 
    norm.includes("defensa en zona") ||
    norm.includes("coberturas defensivas") ||
    norm.includes("equilibrio defensivo") ||
    norm.includes("lineas juntas") ||
    norm.includes("defensa")
  ) {
    return "basculacion";
  }

  // 4. Presión Alta / Bloque Alto / Acoso Alto / Pressing
  if (
    norm.includes("presion alta") || 
    norm.includes("pressing alto") || 
    norm.includes("presion en bloque") || 
    norm.includes("bloque adelantado") ||
    norm.includes("bloque alto") ||
    norm.includes("acoso alto") ||
    norm.includes("salto a la presion") ||
    norm.includes("pressing") ||
    norm.includes("presion")
  ) {
    return "presion alta";
  }

  // 5. Salida de Balón / Iniciación / Construcción / Salida Limpia
  if (
    norm.includes("salida de balon") || 
    norm.includes("salida limpia") ||
    norm.includes("iniciacion") || 
    norm.includes("construccion") ||
    norm.includes("primer tercio") ||
    norm.includes("salida en corto") ||
    norm.includes("salida desde meta")
  ) {
    return "salida de balon";
  }

  // 6. Progresión / Superar Líneas / Hombre Libre / Duelos 1v1 / Conducción Fijadora
  if (
    norm.includes("progresion") || 
    norm.includes("atraccion") || 
    norm.includes("escalonada") || 
    norm.includes("pasillos interiores") ||
    norm.includes("superar lineas") ||
    norm.includes("hombre libre") ||
    norm.includes("pase filtrado") ||
    norm.includes("1 contra 1") ||
    norm.includes("1 c 1") ||
    norm.includes("1c1") ||
    norm.includes("duelos 1v1") ||
    norm.includes("1v1") ||
    norm.includes("desborde") ||
    norm.includes("regate") ||
    norm.includes("juego entre lineas") ||
    norm.includes("entre lineas")
  ) {
    return "progresion";
  }

  // 7. Finalización / Remate / Último Tercio / Tiro / Definición / Creación de Ocasiones
  if (
    norm.includes("finalizac") || 
    norm.includes("ultimo tercio") || 
    norm.includes("remate") ||
    norm.includes("tiro") ||
    norm.includes("definicion") ||
    norm.includes("creacion de ocasiones") ||
    norm.includes("centro y remate") ||
    norm.includes("disparo") ||
    norm.includes("ataque a porteria")
  ) {
    return "finalizacion";
  }

  // 8. Transición Ofensiva / Contraataque / Despliegue Rápido / Ataque Rápido / Verticalidad
  if (
    norm.includes("transicion ofensiva") || 
    norm.includes("despliegue") ||
    norm.includes("contraataque") ||
    norm.includes("ataque rapido") ||
    norm.includes("transicion rapida") ||
    norm.includes("salida vertical tras robo") ||
    norm.includes("verticalidad")
  ) {
    return "transicion ofensiva";
  }

  // 9. Balón Parado / ABP / Córner / Falta Lateral / Estrategia
  if (
    norm.includes("balon parado") || 
    norm.includes("abp") ||
    norm.includes("corner") ||
    norm.includes("saque de esquina") ||
    norm.includes("falta lateral") ||
    norm.includes("falta frontal") ||
    norm.includes("estrategia")
  ) {
    return "balon parado";
  }

  return "general";
}

/**
 * FASE 1: EVALUACIÓN PURA DE AFINIDAD TÁCTICA
 * Determina con rigor si el ejercicio trabaja el principio táctico consultado.
 * Retorna null inmediatamente si no existe evidencia táctica real.
 */
export function evaluatePureTacticalAffinity(
  exercise: any,
  principle: { name: string; game_phase?: string }
): TacticalAffinityEvaluation | null {
  const exTitleNorm = normalizeText(exercise.nombre || "");
  const exTacticalArray = (exercise.objetivo_tactico || []).map((t: string) => normalizeText(t));
  const exDescNorm = normalizeText(exercise.descripcion || "");
  const exTagsNorm = (exercise.tags || []).map((t: string) => normalizeText(t));
  const exPhase = normalizeText(exercise.game_phase || "");

  const pKey = getPrincipleTaxonomyKey(principle.name);
  const taxonomy = PRINCIPLE_TAXONOMY[pKey];
  if (!taxonomy) return null;

  const isPhaseDirect = taxonomy.compatiblePhases.some(p => {
    const pNorm = normalizeText(p);
    return exPhase === pNorm || exPhase.includes(pNorm);
  });

  const evidence: TacticalEvidenceItem[] = [];
  const rejectedEvidence: RejectedEvidenceItem[] = [];
  const negativeContradictions: string[] = [];

  // 1. Detección de Contradicciones y Conflictos de Contexto (Negative Context Filter)
  if (taxonomy.conflictingContexts && taxonomy.conflictingContexts.length > 0) {
    for (const conflict of taxonomy.conflictingContexts) {
      const conflictNorm = normalizeText(conflict);
      if (exTitleNorm.includes(conflictNorm)) {
        negativeContradictions.push(conflict);
        rejectedEvidence.push({
          field: "title",
          term: conflict,
          reason: `Contexto contradictorio con "${principle.name}"`
        });
      }
    }
  }

  if (negativeContradictions.length > 0) {
    return null; // Exclusión inmediata por contradicción de dominio
  }

  let directEvidenceCount = 0;
  let secondaryEvidenceCount = 0;
  let directScore = 0;
  let secondaryScore = 0;
  let isTitleGeneric = false;

function matchesPhrase(text: string, phrase: string): boolean {
  if (!text || !phrase) return false;
  const tNorm = normalizeText(text);
  const pNorm = normalizeText(phrase);
  if (!tNorm || !pNorm) return false;

  // Si la frase es corta (ej. "1v1", "1c1", "abp") o contiene números (ej. "1 contra 1", "7v7"), exigir límites de palabra
  if (pNorm.length <= 4 || /\d/.test(pNorm)) {
    const escaped = pNorm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(^|\\s)${escaped}(\\s|$)`, "i");
    return regex.test(tNorm);
  }

  return tNorm.includes(pNorm);
}

  // 2. Comprobación en TÍTULO
  // A. Frases exactas en título (Evidencia Directa Fuerte)
  let titleMatchedExact = false;
  for (const exactPhrase of taxonomy.primaryExactPhrases) {
    if (matchesPhrase(exTitleNorm, exactPhrase)) {
      titleMatchedExact = true;
      directEvidenceCount++;
      directScore += 14;
      evidence.push({
        field: "title",
        matchedConcept: exactPhrase,
        weight: 14,
        isDirect: true,
        explanation: `Frase táctica exacta en título: "${exactPhrase}"`
      });
      break;
    }
  }

  // B. Si el título no tuvo frase exacta, comprobar si es un título genérico técnico
  if (!titleMatchedExact) {
    const matchingGeneric = taxonomy.genericTechnicalTerms.find(gt => matchesPhrase(exTitleNorm, gt));
    if (matchingGeneric) {
      isTitleGeneric = true;
      rejectedEvidence.push({
        field: "title",
        term: matchingGeneric,
        reason: `Título genérico técnico ("${matchingGeneric}") no confiere afinidad directa al principio táctico`
      });
    }
  }

  // 3. Comprobación en OBJETIVOS TÁCTICOS (Jerarquía y reducción por array masivo)
  const isBloatedArray = exTacticalArray.length >= 5;

  for (const obj of exTacticalArray) {
    // A. Descartar términos aislados prohibidos
    const isForbidden = taxonomy.forbiddenIsolatedStems.some(fis => obj === normalizeText(fis));
    if (isForbidden) {
      rejectedEvidence.push({
        field: "tactical_objective",
        term: obj,
        reason: "Término aislado genérico / polisémico prohibido"
      });
      continue;
    }

    // B. Descartar términos puramente técnicos
    const isGenericTech = taxonomy.genericTechnicalTerms.some(gt => obj === normalizeText(gt));
    if (isGenericTech) {
      rejectedEvidence.push({
        field: "tactical_objective",
        term: obj,
        reason: "Concepto técnico de ejecución, no principio táctico estructural"
      });
      continue;
    }

    // C. Comprobar Frase Exacta o Concepto Primario
    const matchingExact = taxonomy.primaryExactPhrases.find(ep => matchesPhrase(obj, ep));
    const matchingPrimary = taxonomy.primaryTacticalConcepts.find(pc => matchesPhrase(obj, pc));

    if (matchingExact || matchingPrimary) {
      const concept = matchingExact || matchingPrimary!;
      if (!isBloatedArray || titleMatchedExact) {
        directEvidenceCount++;
        const pts = Math.min(8, 16 - directScore);
        if (pts > 0) {
          directScore += pts;
          evidence.push({
            field: "tactical_objective",
            matchedConcept: concept,
            weight: pts,
            isDirect: true,
            explanation: `Objetivo táctico focalizado directo: "${concept}"`
          });
        }
      } else {
        // En arrays de 5+ tags sin título exacto, amortiguar a evidencia secundaria
        secondaryEvidenceCount++;
        const pts = Math.min(4, 6 - secondaryScore);
        if (pts > 0) {
          secondaryScore += pts;
          evidence.push({
            field: "tactical_objective",
            matchedConcept: concept,
            weight: pts,
            isDirect: false,
            explanation: `Objetivo táctico secundario amortiguado (array de ${exTacticalArray.length} tags): "${concept}"`
          });
        }
      }
    } else {
      // D. Comprobar Conceptos Secundarios
      const matchingSec = taxonomy.secondaryTacticalConcepts.find(sc => matchesPhrase(obj, sc));
      if (matchingSec) {
        secondaryEvidenceCount++;
        const pts = Math.min(3, 6 - secondaryScore);
        if (pts > 0) {
          secondaryScore += pts;
          evidence.push({
            field: "tactical_objective",
            matchedConcept: matchingSec,
            weight: pts,
            isDirect: false,
            explanation: `Concepto complementario secundario: "${matchingSec}"`
          });
        }
      }
    }
  }

  // 4. Comprobación en DESCRIPCIÓN (Solo informativo complementario, NUNCA otorga afinidad por sí sola)
  for (const primary of taxonomy.primaryTacticalConcepts) {
    const pNorm = normalizeText(primary);
    if (exDescNorm.includes(pNorm) && !exTitleNorm.includes(pNorm) && !exTacticalArray.some((t: string) => t.includes(pNorm))) {
      if (directEvidenceCount > 0 || secondaryEvidenceCount >= 2) {
        evidence.push({
          field: "description",
          matchedConcept: primary,
          weight: 1,
          isDirect: false,
          explanation: `Mención complementaria en descripción: "${primary}"`
        });
      } else {
        rejectedEvidence.push({
          field: "description",
          term: primary,
          reason: "Mención narrativa aislada en descripción sin objetivo táctico ni título afín"
        });
      }
    }
  }

  // ─── INVARIANTE FUNDAMENTAL: ¿TIENE AFINIDAD TÁCTICA SIGNIFICATIVA? ─────────
  const hasDirectAffinity = directEvidenceCount > 0;
  const hasStrongSecondaryAffinity = secondaryEvidenceCount >= 2 && isPhaseDirect;

  const hasMeaningfulAffinity = (hasDirectAffinity || hasStrongSecondaryAffinity);

  if (!hasMeaningfulAffinity) {
    return null; // INVARIANTE DURA: Sin afinidad táctica real = EXCLUSIÓN TOTAL
  }

  const tacticalScore = directScore + secondaryScore + (isPhaseDirect ? 2 : 0);

  if (tacticalScore < 6) {
    return null;
  }

  const affinityType: TacticalAffinityLevel = hasDirectAffinity ? "DIRECT" : "SECONDARY";

  return {
    hasMeaningfulAffinity: true,
    affinity: affinityType,
    affinityType,
    directEvidenceCount,
    secondaryEvidenceCount,
    tacticalScore,
    evidence,
    rejectedEvidence,
    negativeContradictions,
    exclusionReason: null
  };
}

/**
 * FASE 2: EVALUACIÓN INTEGRAL Y RANKING METODOLÓGICO
 * Aplica los moduladores pedagógicos (edad, categoría, dificultad, metodología)
 * EXCLUSIVAMENTE a los candidatos que ya pasaron la Fase 1.
 */
export function evaluateTacticalAffinity(
  exercise: any,
  principle: { name: string; game_phase?: string },
  stageSlug: string,
  stageCode: string,
  curriculumPriorities: string[] = []
): ScoredExerciseResult | null {
  // ─── FASE 1: FILTRO TÁCTICO PURO ───────────────────────────────────────────
  const tacticalEval = evaluatePureTacticalAffinity(exercise, principle);
  if (!tacticalEval || !tacticalEval.hasMeaningfulAffinity) {
    return null;
  }

  // ─── FASE 2: MODULADORES DE EDAD, COMPLEJIDAD Y METODOLOGÍA ─────────────────
  const targetStageIdx = getStageIndex(stageSlug);
  const complexityRules = STAGE_COMPLEXITY_RULES[stageSlug] || STAGE_COMPLEXITY_RULES["alevin"];

  const exerciseStages: string[] = [];
  if (exercise.age_category) exerciseStages.push(exercise.age_category.toLowerCase());
  if (exercise.categoria_edad && Array.isArray(exercise.categoria_edad)) {
    exercise.categoria_edad.forEach((c: string) => exerciseStages.push(c.toLowerCase()));
  }

  const isExactStage = exerciseStages.includes(stageSlug);
  const isGeneralTransversal = exerciseStages.length === 0 || exerciseStages.includes("general") || exerciseStages.length >= 4;

  let minStageDistance = 999;
  if (isExactStage) {
    minStageDistance = 0;
  } else if (exerciseStages.length > 0) {
    for (const st of exerciseStages) {
      const idx = getStageIndex(st);
      if (idx >= 0) {
        const dist = Math.abs(idx - targetStageIdx);
        if (dist < minStageDistance) minStageDistance = dist;
      }
    }
  } else {
    minStageDistance = 1;
  }

  const exDifficulty = typeof exercise.dificultad === "number" ? exercise.dificultad : 3;

  // Descarte pedagógico estricto por imposibilidad de ejecución
  if (targetStageIdx <= 1 && minStageDistance >= 4 && exDifficulty >= 4) return null;
  if (targetStageIdx >= 7 && minStageDistance >= 5 && (exercise.tipo === "ludico" || exercise.tipo === "Juego Lúdico" || exercise.game_phase === "motor_coordination")) return null;

  let categoryScore = 0;
  if (isExactStage) categoryScore += 8;
  else if (minStageDistance === 1) categoryScore += 4;
  else if (minStageDistance === 2) categoryScore += 2;
  else if (isGeneralTransversal) categoryScore += 2;
  else categoryScore -= 4;

  let difficultyScore = 0;
  if (complexityRules.idealDiff.includes(exDifficulty)) difficultyScore += 3;
  else if (exDifficulty > complexityRules.maxDiff) difficultyScore -= 4;

  let methodologyScore = 0;
  if (complexityRules.preferredTypes && exercise.tipo && complexityRules.preferredTypes.includes(exercise.tipo)) {
    methodologyScore += 2;
  }
  if (curriculumPriorities && curriculumPriorities.length > 0) {
    const exAllText = [
      exercise.nombre,
      ...(exercise.objetivo_tactico || []),
      exercise.descripcion,
      ...(exercise.tags || [])
    ].map(t => normalizeText(t || "")).join(" ");

    const hasPriorityMatch = curriculumPriorities.some(p => {
      const pNorm = normalizeText(p);
      return exAllText.includes(pNorm);
    });
    if (hasPriorityMatch) methodologyScore += 1;
  }

  const finalScore = tacticalEval.tacticalScore + categoryScore + difficultyScore + methodologyScore;

  let stageBadge = `Adaptable a ${stageCode}`;
  if (isExactStage) stageBadge = `Específica (${stageCode})`;
  else if (minStageDistance === 1) stageBadge = "Contigua adaptable";
  else if (isGeneralTransversal) stageBadge = "Transversal";

  // ─── FASE 3: CLASIFICACIÓN FINAL RIGUROSA (ALTA / MEDIA / ADAPTABLE) ────────
  // REGLA OBLIGATORIA PARA ALTA:
  // 1. Afinidad Directa obligatoria (tacticalEval.affinityType === "DIRECT")
  // 2. Score táctico puro >= 12
  // 3. Final score >= 20
  // 4. Distancia de categoría <= 1
  let level: CompatibilityLevel = "ADAPTABLE";
  if (tacticalEval.affinityType === "DIRECT" && tacticalEval.tacticalScore >= 12 && finalScore >= 20 && minStageDistance <= 1) {
    level = "ALTA";
  } else if ((tacticalEval.affinityType === "DIRECT" || tacticalEval.affinityType === "SECONDARY") && finalScore >= 14 && minStageDistance <= 2) {
    level = "MEDIA";
  } else {
    level = "ADAPTABLE";
  }

  const matchReasons = tacticalEval.evidence.map(e => e.explanation);

  const explicability: TacticalExplicability = {
    ...tacticalEval,
    categoryScore,
    difficultyScore,
    methodologyScore,
    finalScore,
    level,
    stageBadge,
    matchReasons: Array.from(new Set(matchReasons))
  };

  return {
    exercise,
    score: finalScore,
    compatibilityLevel: level,
    stageBadge,
    matchReasons: Array.from(new Set(matchReasons)),
    explicability
  };
}
