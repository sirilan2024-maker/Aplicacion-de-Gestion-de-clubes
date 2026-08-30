process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

const STAGES_ORDER = ["querubin", "prebenjamin", "benjamin", "alevin", "infantil", "cadete", "juvenil", "senior"];

function getStageIndex(stageSlug: string): number {
  const norm = (stageSlug || "").toLowerCase().trim();
  const idx = STAGES_ORDER.indexOf(norm);
  return idx >= 0 ? idx : 3;
}

const STAGE_COMPLEXITY_RULES: Record<string, { idealDiff: number[]; maxDiff: number; maxPlayers: number; preferredTypes?: string[] }> = {
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

interface PrincipleConceptMatrix {
  primaryStems: string[];
  secondaryStems: string[];
  negativeStems?: string[];
}

const PRINCIPLE_MATRIX: Record<string, PrincipleConceptMatrix> = {
  "circulacion": {
    primaryStems: [
      "circulacion", "circulacion rapida", "cambio de orientacion", "cambios de orientacion",
      "cambiar de orientacion", "rueda de pases", "juego de posicion", "tercer hombre",
      "fijar y atraer", "lado debil", "lado opuesto", "amplitud", "mantenimiento de posesion"
    ],
    secondaryStems: [
      "posesion", "conservacion", "2 toques", "dos toques", "ritmo de juego",
      "triangulacion", "linea de pase", "apoyo y pase", "dar la vuelta", "superioridad numerica"
    ],
    negativeStems: [
      "mantenimiento fisico", "hiit", "psicomotriz", "psicomotricidad", "caza-tesoros", "el zoo"
    ]
  },
  "basculacion": {
    primaryStems: [
      "basculacion", "bascular", "compactacion", "bloque defensivo", "bloque medio", "bloque bajo",
      "achique de espacios", "achique", "lineas juntas", "defensa zonal", "cobertura", "coberturas",
      "equilibrio defensivo", "densidad defensiva", "cerrar pasillo"
    ],
    secondaryStems: [
      "defensa en zona", "interlineas", "lado debil defensivo", "relevo defensivo", "vigilancia defensiva",
      "vigilancia", "marcaje zonal", "reduccion de espacios"
    ],
    negativeStems: [
      "corner", "abp", "tiro", "finalizacion", "salida de balon", "cambio de orientacion"
    ]
  },
  "presion alta": {
    primaryStems: [
      "presion alta", "pressing alto", "pressing en bloque alto", "bloque adelantado", "salto a la presion",
      "salto de presion", "acoso al poseedor", "acoso", "recuperacion en campo rival", "bloqueo de salida",
      "linea de presion", "orientar la salida", "presion tras perdida", "pressing tras perdida", "pressing"
    ],
    secondaryStems: [
      "presion", "recuperar", "intrapresion", "provocar error", "cerrar lineas de pase", "robo"
    ],
    negativeStems: [
      "cambio de orientacion", "cambios de orientacion", "finalizacion", "pase atras", "conduce y marca", "tiro"
    ]
  },
  "salida de balon": {
    primaryStems: [
      "salida de balon", "inicio de juego", "construccion", "salida limpia", "primer tercio", "salida en corto",
      "tercer hombre en salida", "superar primera linea"
    ],
    secondaryStems: [
      "fijar y atraer", "atraer rivales", "centrales", "portero", "salida"
    ],
    negativeStems: ["abp", "corner", "falta"]
  },
  "progresion": {
    primaryStems: [
      "progresion", "pase filtrado", "superar lineas", "conduccion fijadora", "escalonamiento",
      "hombre libre", "espaldas de pivotes", "juego vertical"
    ],
    secondaryStems: ["verticalidad", "linea de pase", "superar"],
    negativeStems: ["bloque bajo", "replegar"]
  },
  "finalizacion": {
    primaryStems: [
      "finalizacion", "remate", "tiro a porteria", "ultimo tercio", "centro y remate", "llegada de segunda linea",
      "disparo", "definicion", "area rival"
    ],
    secondaryStems: ["gol", "remates", "tiro", "centros"],
    negativeStems: ["salida de balon", "inicio de juego"]
  },
  "transicion defensiva": {
    primaryStems: [
      "transicion defensiva", "tras perdida", "reaccion inmediata tras perdida", "presion tras perdida",
      "3 segundos tras perdida", "replegar rapido", "falta tactica", "reorganizacion defensiva"
    ],
    secondaryStems: ["replegar", "perdida"],
    negativeStems: ["corner", "saque de esquina"]
  },
  "transicion ofensiva": {
    primaryStems: [
      "transicion ofensiva", "contraataque", "despliegue rapido", "salida vertical tras robo",
      "pase de seguridad tras robo", "ataque rapido", "transicion veloz"
    ],
    secondaryStems: ["despliegue", "contra", "velocidad tras recuperacion"],
    negativeStems: ["bloque bajo", "mantenimiento"]
  },
  "balon parado": {
    primaryStems: [
      "abp", "corner", "falta lateral", "falta frontal", "saque de esquina", "balon parado",
      "estrategia a balon parado", "bloqueo y desmarque", "segundo palo"
    ],
    secondaryStems: ["penalti", "saque de banda", "barrera"],
    negativeStems: ["juego abierto", "posesion"]
  }
};

function getPrincipleKey(principleName: string): string {
  const pLower = (principleName || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (pLower.includes("circulac") || pLower.includes("cambio de orientac")) return "circulacion";
  if (pLower.includes("basculac") || pLower.includes("compactac")) return "basculacion";
  if (pLower.includes("presion alta") || pLower.includes("presion en bloque")) return "presion alta";
  if (pLower.includes("salida de balon") || pLower.includes("salida limpia")) return "salida de balon";
  if (pLower.includes("progresion") || pLower.includes("atraccion")) return "progresion";
  if (pLower.includes("finalizac") || pLower.includes("ultimo tercio") || pLower.includes("remate")) return "finalizacion";
  if (pLower.includes("transicion defensiva") || pLower.includes("tras perdida")) return "transicion defensiva";
  if (pLower.includes("transicion ofensiva") || pLower.includes("despliegue")) return "transicion ofensiva";
  if (pLower.includes("balon parado") || pLower.includes("abp")) return "balon parado";
  return "general";
}

function normalizePhase(phase: string): string {
  const norm = (phase || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  if (norm.includes("ataque") && !norm.includes("transicion")) return "ataque";
  if (norm.includes("defensa") && !norm.includes("transicion")) return "defensa";
  if (norm.includes("transicionataquedefensa") || norm.includes("atktodef") || norm.includes("transiciondefensiva")) return "transicion_ad";
  if (norm.includes("transiciondefensaataque") || norm.includes("deftoatk") || norm.includes("transicionofensiva")) return "transicion_da";
  if (norm.includes("balonparado") || norm.includes("abp") || norm.includes("setpieces")) return "abp";
  return norm;
}

const PHASE_DRILL_MAP: Record<string, string[]> = {
  "ataque": ["attacking_build_up", "attacking_progression", "attacking_finishing", "possession", "juego_medio", "rondo", "Posicional", "posicional", "posesion", "Ataque", "ataque"],
  "defensa": ["defending", "defending_mid_block", "defending_high_press", "defensive_game", "Defensa", "defensa", "defensive_organization", "pressing"],
  "transicion_ad": ["transition_atk_to_def", "defending_high_press", "Transición Ataque-Defensa", "defensive_transition"],
  "transicion_da": ["transition_def_to_atk", "attacking_finishing", "attacking_progression", "Transición Defensa-Ataque", "contraataque"],
  "abp": ["set_pieces", "abp", "Balón Parado", "balon_parado"]
};

export function scoreExerciseUltimate(
  ex: any,
  principle: any,
  stageSlug: string,
  stageCode: string,
  curriculumPriorities: string[] = []
) {
  const pPhaseNorm = normalizePhase(principle.game_phase);
  const allowedDrillPhases = PHASE_DRILL_MAP[pPhaseNorm] || [];
  const exPhase = (ex.game_phase || "").toLowerCase();
  const isPhaseDirect = allowedDrillPhases.some(p => exPhase === p.toLowerCase() || exPhase.includes(p.toLowerCase()));

  const pKey = getPrincipleKey(principle.name);
  const matrix = PRINCIPLE_MATRIX[pKey];
  if (!matrix) return null;

  const exTitleNorm = (ex.nombre || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const exTacticalArray = (ex.objetivo_tactico || []).map((t: string) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
  const exTacticalStr = exTacticalArray.join(" ");
  const exDescNorm = (ex.descripcion || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const exAllText = [exTitleNorm, exTacticalStr, exDescNorm, ...(ex.tags || [])].join(" ");

  // 1. Detección de Falsos Positivos Negativos (Anti-Contaminación)
  if (matrix.negativeStems) {
    const isNegativeTitle = matrix.negativeStems.some(neg => exTitleNorm.includes(neg));
    if (isNegativeTitle) {
      const hasPrimaryInTitle = matrix.primaryStems.some(p => exTitleNorm.includes(p));
      if (!hasPrimaryInTitle) return null;
    }
  }

  // 2. Clasificación de Evidencia Táctica
  let afinidadDirecta = false;
  let afinidadSecundaria = false;
  let afinidadContextual = false;

  let directEvidenceScore = 0;
  let secondaryEvidenceScore = 0;

  // A. Comprobación en TÍTULO
  const titlePrimaryMatch = matrix.primaryStems.find(st => exTitleNorm.includes(st));
  if (titlePrimaryMatch) {
    afinidadDirecta = true;
    directEvidenceScore += 12;
  }

  // B. Comprobación en OBJETIVOS TÁCTICOS
  const isBloatedTagArray = exTacticalArray.length >= 6;

  for (const obj of exTacticalArray) {
    const isPrimaryObj = matrix.primaryStems.some(st => obj.includes(st));
    if (isPrimaryObj) {
      if (!isBloatedTagArray || titlePrimaryMatch) {
        afinidadDirecta = true;
        directEvidenceScore = Math.min(directEvidenceScore + 6, 16);
      } else {
        afinidadSecundaria = true;
        secondaryEvidenceScore = Math.min(secondaryEvidenceScore + 4, 8);
      }
    } else {
      const isSecObj = matrix.secondaryStems.some(st => obj.includes(st));
      if (isSecObj) {
        afinidadSecundaria = true;
        secondaryEvidenceScore = Math.min(secondaryEvidenceScore + 3, 6);
      }
    }
  }

  // C. Comprobación en DESCRIPCIÓN Y CONTEXTO
  if (!afinidadDirecta && !afinidadSecundaria) {
    const descPrimaryMatch = matrix.primaryStems.some(st => exDescNorm.includes(st));
    if (descPrimaryMatch) {
      afinidadContextual = true;
    }
  }

  // REGLA FUNDAMENTAL: Descarte inmediato si no hay afinidad directa ni secundaria
  if (!afinidadDirecta && !afinidadSecundaria) {
    return null; // Contexto aislado o 0 hits = DESCARTAR
  }

  // Puntuación Táctica
  let tacticalScore = directEvidenceScore + secondaryEvidenceScore + (isPhaseDirect ? 2 : 0);

  // 3. ADECUACIÓN DE ETAPA Y METODOLOGÍA (Ordena dentro de las tácticamente válidas)
  const targetStageIdx = getStageIndex(stageSlug);
  const complexityRules = STAGE_COMPLEXITY_RULES[stageSlug] || STAGE_COMPLEXITY_RULES["alevin"];

  const exerciseStages: string[] = [];
  if (ex.age_category) exerciseStages.push(ex.age_category.toLowerCase());
  if (ex.categoria_edad && Array.isArray(ex.categoria_edad)) {
    ex.categoria_edad.forEach((c: string) => exerciseStages.push(c.toLowerCase()));
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

  const exDifficulty = typeof ex.dificultad === "number" ? ex.dificultad : 3;

  // Descarte pedagógico estricto
  if (targetStageIdx <= 1 && minStageDistance >= 4 && exDifficulty >= 4) return null;
  if (targetStageIdx >= 7 && minStageDistance >= 5 && (ex.tipo === "ludico" || ex.tipo === "Juego Lúdico" || ex.game_phase === "motor_coordination")) return null;

  let categoryScore = 0;
  if (isExactStage) categoryScore += 8;
  else if (minStageDistance === 1) categoryScore += 4;
  else if (minStageDistance === 2) categoryScore += 2;
  else if (isGeneralTransversal) categoryScore += 2;
  else categoryScore -= 4;

  let complexityScore = 0;
  if (complexityRules.idealDiff.includes(exDifficulty)) complexityScore += 3;
  else if (exDifficulty > complexityRules.maxDiff) complexityScore -= 4;

  let methodologyScore = 0;
  if (complexityRules.preferredTypes && ex.tipo && complexityRules.preferredTypes.includes(ex.tipo)) {
    methodologyScore += 2;
  }
  if (curriculumPriorities && curriculumPriorities.length > 0) {
    const hasPriorityMatch = curriculumPriorities.some(p => {
      const pNorm = p.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return exAllText.includes(pNorm);
    });
    if (hasPriorityMatch) methodologyScore += 1;
  }

  const finalScore = tacticalScore + categoryScore + complexityScore + methodologyScore;

  let stageBadge = `Adaptable a ${stageCode}`;
  if (isExactStage) stageBadge = `Específica (${stageCode})`;
  else if (minStageDistance === 1) stageBadge = "Contigua adaptable";
  else if (isGeneralTransversal) stageBadge = "Transversal";

  let compatibilityLevel: "ALTA" | "MEDIA" | "ADAPTABLE" = "ADAPTABLE";
  if (afinidadDirecta && finalScore >= 20 && minStageDistance <= 1) {
    compatibilityLevel = "ALTA";
  } else if ((afinidadDirecta || afinidadSecundaria) && finalScore >= 14 && minStageDistance <= 2) {
    compatibilityLevel = "MEDIA";
  } else {
    compatibilityLevel = "ADAPTABLE";
  }

  return {
    exercise: ex,
    afinidadDirecta,
    afinidadSecundaria,
    afinidadContextual,
    tacticalScore,
    categoryScore,
    complexityScore,
    methodologyScore,
    finalScore,
    compatibilityLevel,
    stageBadge
  };
}

async function runTest() {
  const { data: exercises } = await supabase.from("banco_ejercicios").select("*");
  const { data: curricula } = await supabase.from("methodology_curriculum").select("*");

  const getCurriculumPriorities = (code: string) => {
    const c = curricula?.find(curr => curr.category_code === code);
    return c?.priority_families || [];
  };

  const pCirculacion = { name: "Circulación Rápida y Cambio de Orientación", game_phase: "Ataque" };
  const pBasculacion = { name: "Basculación y Compactación de Bloque", game_phase: "Defensa" };
  const pPresion = { name: "Presión Alta", game_phase: "Defensa" };

  console.log("================================================================================");
  console.log("TEST FINAL DE PRECEDENCIA TÁCTICA Y METODOLÓGICA");
  console.log("================================================================================");

  // A: U6 Circulación
  const resA = exercises!
    .map(e => scoreExerciseUltimate(e, pCirculacion, "querubin", "U6", getCurriculumPriorities("U6")))
    .filter(Boolean)
    .sort((a, b) => b!.finalScore - a!.finalScore);

  console.log(`\n### CASO A: U6 -> Ataque Organizado -> Circulación Rápida (Total: ${resA.length})`);
  console.log("| # | Ejercicio | Cat. | Dif | Dir | Sec | Ctx | Score Tác | Score Cat | Score Comp | Score Met | Score Fin | Nivel |");
  console.log("|---|---|---|---|---|---|---|---|---|---|---|---|---|");
  resA.slice(0, 10).forEach((r, i) => {
    console.log(`| ${i+1} | "${r!.exercise.nombre}" | ${r!.exercise.age_category || 'N/A'} | ${r!.exercise.dificultad} | ${r!.afinidadDirecta ? 'SÍ' : 'NO'} | ${r!.afinidadSecundaria ? 'SÍ' : 'NO'} | ${r!.afinidadContextual ? 'SÍ' : 'NO'} | ${r!.tacticalScore} | ${r!.categoryScore} | ${r!.complexityScore} | ${r!.methodologyScore} | ${r!.finalScore} | ${r!.compatibilityLevel} |`);
  });

  // B: Senior Circulación
  const resB = exercises!
    .map(e => scoreExerciseUltimate(e, pCirculacion, "senior", "Senior", getCurriculumPriorities("Senior")))
    .filter(Boolean)
    .sort((a, b) => b!.finalScore - a!.finalScore);

  console.log(`\n### CASO B: Senior -> Ataque Organizado -> Circulación Rápida (Total: ${resB.length})`);
  console.log("| # | Ejercicio | Cat. | Dif | Dir | Sec | Ctx | Score Tác | Score Cat | Score Comp | Score Met | Score Fin | Nivel |");
  console.log("|---|---|---|---|---|---|---|---|---|---|---|---|---|");
  resB.slice(0, 10).forEach((r, i) => {
    console.log(`| ${i+1} | "${r!.exercise.nombre}" | ${r!.exercise.age_category || 'N/A'} | ${r!.exercise.dificultad} | ${r!.afinidadDirecta ? 'SÍ' : 'NO'} | ${r!.afinidadSecundaria ? 'SÍ' : 'NO'} | ${r!.afinidadContextual ? 'SÍ' : 'NO'} | ${r!.tacticalScore} | ${r!.categoryScore} | ${r!.complexityScore} | ${r!.methodologyScore} | ${r!.finalScore} | ${r!.compatibilityLevel} |`);
  });

  // C: U6 Basculación
  const resC = exercises!
    .map(e => scoreExerciseUltimate(e, pBasculacion, "querubin", "U6", getCurriculumPriorities("U6")))
    .filter(Boolean)
    .sort((a, b) => b!.finalScore - a!.finalScore);

  console.log(`\n### CASO C: U6 -> Defensa Organizada -> Basculación (Total: ${resC.length})`);
  console.log("| # | Ejercicio | Cat. | Dif | Dir | Sec | Ctx | Score Tác | Score Cat | Score Comp | Score Met | Score Fin | Nivel |");
  console.log("|---|---|---|---|---|---|---|---|---|---|---|---|---|");
  resC.slice(0, 10).forEach((r, i) => {
    console.log(`| ${i+1} | "${r!.exercise.nombre}" | ${r!.exercise.age_category || 'N/A'} | ${r!.exercise.dificultad} | ${r!.afinidadDirecta ? 'SÍ' : 'NO'} | ${r!.afinidadSecundaria ? 'SÍ' : 'NO'} | ${r!.afinidadContextual ? 'SÍ' : 'NO'} | ${r!.tacticalScore} | ${r!.categoryScore} | ${r!.complexityScore} | ${r!.methodologyScore} | ${r!.finalScore} | ${r!.compatibilityLevel} |`);
  });

  // D: Senior Presión Alta
  const resD = exercises!
    .map(e => scoreExerciseUltimate(e, pPresion, "senior", "Senior", getCurriculumPriorities("Senior")))
    .filter(Boolean)
    .sort((a, b) => b!.finalScore - a!.finalScore);

  console.log(`\n### CASO D: Senior -> Defensa Organizada -> Presión Alta (Total: ${resD.length})`);
  console.log("| # | Ejercicio | Cat. | Dif | Dir | Sec | Ctx | Score Tác | Score Cat | Score Comp | Score Met | Score Fin | Nivel |");
  console.log("|---|---|---|---|---|---|---|---|---|---|---|---|---|");
  resD.slice(0, 10).forEach((r, i) => {
    console.log(`| ${i+1} | "${r!.exercise.nombre}" | ${r!.exercise.age_category || 'N/A'} | ${r!.exercise.dificultad} | ${r!.afinidadDirecta ? 'SÍ' : 'NO'} | ${r!.afinidadSecundaria ? 'SÍ' : 'NO'} | ${r!.afinidadContextual ? 'SÍ' : 'NO'} | ${r!.tacticalScore} | ${r!.categoryScore} | ${r!.complexityScore} | ${r!.methodologyScore} | ${r!.finalScore} | ${r!.compatibilityLevel} |`);
  });
}

runTest().catch(console.error);
