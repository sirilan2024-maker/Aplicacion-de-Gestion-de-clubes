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

// CONCEPTOS TÁCTICOS ESTRICTOS (Sin términos genéricos como "orientacion" o "pase" aislados)
const PRINCIPLE_CONCEPT_STEMS: Record<string, string[]> = {
  "circulacion": [
    "circulacion", "circulacion rapida", "cambio de orientacion", "cambios de orientacion", "lado debil", "lado opuesto",
    "tercer hombre", "fijar y atraer", "fijacion", "rueda de pases", "juego de posicion", "conservacion",
    "mantenimiento", "ritmo de juego", "2 toques", "dos toques", "amplitud", "triangulacion", "linea de pase",
    "apoyo y pase", "dar la vuelta"
  ],
  "basculacion": [
    "basculacion", "bascular", "compactacion", "bloque", "bloque medio", "bloque bajo", "achique",
    "lineas juntas", "interlineas", "defensa en zona", "cobertura", "coberturas", "cerrar pasillo",
    "densidad defensiva", "lado debil defensivo", "relevo defensivo", "vigilancia"
  ],
  "presion alta": [
    "presion alta", "pressing", "acoso", "primer receptor", "salto a la presion", "bloque adelantado",
    "campo rival", "orientar hacia fuera", "provocar error", "intrapresion", "linea de presion",
    "robo en campo contrario", "pressing tras perdida"
  ],
  "salida de balon": [
    "salida de balon", "inicio de juego", "construccion", "salida limpia", "primer tercio", "salida en corto",
    "fijar y atraer", "atraer rivales", "tercer hombre en salida", "superar primera linea"
  ],
  "progresion": [
    "progresion", "pase filtrado", "superar lineas", "conduccion fijadora", "escalonamiento",
    "hombre libre", "espaldas de pivotes", "juego vertical"
  ],
  "finalizacion": [
    "finalizacion", "remate", "tiro a porteria", "ultimo tercio", "centro y remate", "llegada de segunda linea",
    "disparo", "definicion", "area rival"
  ],
  "transicion defensiva": [
    "transicion defensiva", "tras perdida", "reaccion inmediata tras perdida", "presion tras perdida",
    "3 segundos tras perdida", "replegar rapido", "falta tactica", "reorganizacion defensiva"
  ],
  "transicion ofensiva": [
    "transicion ofensiva", "contraataque", "despliegue rapido", "salida vertical", "pase de seguridad tras robo",
    "ataque rapido", "transicion veloz"
  ],
  "balon parado": [
    "abp", "corner", "falta lateral", "falta frontal", "saque de esquina", "balon parado", "estrategia a balon parado",
    "bloqueo y desmarque", "segundo palo"
  ]
};

const PHASE_DRILL_MAP: Record<string, string[]> = {
  "ataque": ["attacking_build_up", "attacking_progression", "attacking_finishing", "possession", "juego_medio", "rondo", "Posicional", "posicional", "posesion", "Ataque", "ataque"],
  "defensa": ["defending", "defending_mid_block", "defending_high_press", "defensive_game", "Defensa", "defensa", "defensive_organization", "pressing"],
  "transicion_ad": ["transition_atk_to_def", "defending_high_press", "Transición Ataque-Defensa", "defensive_transition"],
  "transicion_da": ["transition_def_to_atk", "attacking_finishing", "attacking_progression", "Transición Defensa-Ataque", "contraataque"],
  "abp": ["set_pieces", "abp", "Balón Parado", "balon_parado"]
};

function normalizePhase(phase: string): string {
  const norm = (phase || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  if (norm.includes("ataque") && !norm.includes("transicion")) return "ataque";
  if (norm.includes("defensa") && !norm.includes("transicion")) return "defensa";
  if (norm.includes("transicionataquedefensa") || norm.includes("atktodef") || norm.includes("transiciondefensiva")) return "transicion_ad";
  if (norm.includes("transiciondefensaataque") || norm.includes("deftoatk") || norm.includes("transicionofensiva")) return "transicion_da";
  if (norm.includes("balonparado") || norm.includes("abp") || norm.includes("setpieces")) return "abp";
  return norm;
}

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

export function scoreExerciseRigorousAudited(
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

  const exAllText = [
    ex.nombre || "",
    ...(ex.objetivo_tactico || []),
    ex.descripcion || "",
    ...(ex.tags || []),
    ex.tipo || ""
  ].join(" ").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const isPhaseTextMatch =
    (pPhaseNorm === "defensa" && (exAllText.includes("defens") || exAllText.includes("presion") || exAllText.includes("recupera") || exAllText.includes("duelo") || exAllText.includes("basculaci") || exAllText.includes("bloque"))) ||
    (pPhaseNorm === "ataque" && (exAllText.includes("ataque") || exAllText.includes("posesion") || exAllText.includes("progresion") || exAllText.includes("finalizac") || exAllText.includes("salida de balon") || exAllText.includes("rondo") || exAllText.includes("circulacion"))) ||
    (pPhaseNorm === "transicion_ad" && (exAllText.includes("transicion") || exAllText.includes("perdida") || exAllText.includes("tras perdida") || exAllText.includes("presion"))) ||
    (pPhaseNorm === "transicion_da" && (exAllText.includes("transicion") || exAllText.includes("contraataque") || exAllText.includes("despliegue") || exAllText.includes("recuperacion"))) ||
    (pPhaseNorm === "abp" && (exAllText.includes("abp") || exAllText.includes("corner") || exAllText.includes("falta") || exAllText.includes("balon parado") || exAllText.includes("saque")));

  if (!isPhaseDirect && !isPhaseTextMatch) {
    return null;
  }

  // 2. Afinidad Temática y Táctica con el Principio
  const pKey = getPrincipleKey(principle.name);
  const targetConcepts = PRINCIPLE_CONCEPT_STEMS[pKey] || [];

  const exTitleNorm = (ex.nombre || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const exTacticalArray = (ex.objetivo_tactico || []).map((t: string) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
  const exTacticalStr = exTacticalArray.join(" ");

  let titleMatches = 0;
  let tacticalObjectiveMatches = 0;
  let generalMatches = 0;
  const matchedConcepts: string[] = [];

  for (const concept of targetConcepts) {
    if (exTitleNorm.includes(concept)) {
      titleMatches++;
      matchedConcepts.push(`título: "${concept}"`);
    }
    if (exTacticalStr.includes(concept)) {
      tacticalObjectiveMatches++;
      matchedConcepts.push(`objetivo: "${concept}"`);
    }
    if (exAllText.includes(concept) && !exTitleNorm.includes(concept) && !exTacticalStr.includes(concept)) {
      generalMatches++;
      matchedConcepts.push(`desc: "${concept}"`);
    }
  }

  const totalAffinityHits = titleMatches * 3 + tacticalObjectiveMatches * 2 + generalMatches;
  
  // REGLA FUNDAMENTAL: 0 hits tácticos implica descarte inmediato
  if (totalAffinityHits === 0) {
    return null;
  }

  // 3. PUNTUACIÓN TÁCTICA (Base Dominante)
  let tacticalScore = 0;
  if (isPhaseDirect) tacticalScore += 3;
  else tacticalScore += 1;

  if (titleMatches > 0) {
    tacticalScore += 10 + (titleMatches - 1) * 2;
  }
  if (tacticalObjectiveMatches > 0) {
    tacticalScore += 8 + (tacticalObjectiveMatches - 1) * 2;
  }
  if (generalMatches > 0) {
    tacticalScore += Math.min(generalMatches * 1.5, 4);
  }

  // 4. ADECUACIÓN DE ETAPA Y METODOLOGÍA (Modulador de Orden)
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

  // Descarte pedagógico:
  // - Para U6/U8: ejercicios con distancia >= 4 y dificultad >= 4 se descartan
  if (targetStageIdx <= 1 && minStageDistance >= 4 && exDifficulty >= 4) {
    return null;
  }
  // - Para Senior: ejercicios lúdicos puros de psicomotricidad de U6 se descartan
  if (targetStageIdx >= 7 && minStageDistance >= 5 && (ex.tipo === "ludico" || ex.tipo === "Juego Lúdico" || ex.game_phase === "motor_coordination")) {
    return null;
  }

  let categoryScore = 0;
  if (isExactStage) {
    categoryScore += 4;
  } else if (minStageDistance === 1) {
    categoryScore += 2;
  } else if (isGeneralTransversal) {
    categoryScore += 1.5;
  } else if (minStageDistance === 2) {
    categoryScore += 0.5;
  } else {
    categoryScore -= 3;
  }

  let complexityScore = 0;
  if (complexityRules.idealDiff.includes(exDifficulty)) {
    complexityScore += 2;
  } else if (exDifficulty > complexityRules.maxDiff) {
    complexityScore -= 3;
  }

  let methodologyScore = 0;
  if (complexityRules.preferredTypes && ex.tipo && complexityRules.preferredTypes.includes(ex.tipo)) {
    methodologyScore += 1;
  }
  if (curriculumPriorities && curriculumPriorities.length > 0) {
    const hasPriorityMatch = curriculumPriorities.some(p => {
      const pNorm = p.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return exAllText.includes(pNorm);
    });
    if (hasPriorityMatch) {
      methodologyScore += 1;
    }
  }

  const finalScore = tacticalScore + categoryScore + complexityScore + methodologyScore;

  let stageBadge = `Adaptable a ${stageCode}`;
  if (isExactStage) {
    stageBadge = `Específica (${stageCode})`;
  } else if (minStageDistance === 1) {
    stageBadge = `Contigua adaptable`;
  } else if (isGeneralTransversal) {
    stageBadge = "Transversal";
  }

  let compatibilityLevel: "ALTA" | "MEDIA" | "ADAPTABLE" = "ADAPTABLE";
  if (finalScore >= 16 && (isExactStage || minStageDistance <= 1) && (titleMatches > 0 || tacticalObjectiveMatches > 0)) {
    compatibilityLevel = "ALTA";
  } else if (finalScore >= 11 && minStageDistance <= 2) {
    compatibilityLevel = "MEDIA";
  } else {
    compatibilityLevel = "ADAPTABLE";
  }

  return {
    exercise: ex,
    totalAffinityHits,
    matchedConcepts: Array.from(new Set(matchedConcepts)),
    tacticalScore,
    categoryScore,
    complexityScore,
    methodologyScore,
    finalScore,
    compatibilityLevel,
    stageBadge
  };
}

async function runAudit() {
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
  console.log("AUDITORÍA DE PRECEDENCIA TÁCTICA Y METODOLÓGICA");
  console.log("================================================================================");

  // CASO A: U6 -> Circulación Rápida
  const u6Circulacion = exercises!
    .map(e => scoreExerciseRigorousAudited(e, pCirculacion, "querubin", "U6", getCurriculumPriorities("U6")))
    .filter(Boolean)
    .sort((a, b) => b!.finalScore - a!.finalScore);

  console.log(`\n### CASO A: U6 -> Ataque Organizado -> Circulación Rápida (Total: ${u6Circulacion.length})`);
  console.log("| # | Nombre | Cat. Orig | Dif | Hits | Coincidencias Tácticas | Score Tác | Score Cat | Score Comp | Score Met | Score Final | Nivel |");
  console.log("|---|---|---|---|---|---|---|---|---|---|---|---|");
  u6Circulacion.slice(0, 10).forEach((r, i) => {
    console.log(`| ${i+1} | "${r!.exercise.nombre}" | ${r!.exercise.age_category || 'N/A'} | ${r!.exercise.dificultad} | ${r!.totalAffinityHits} | ${r!.matchedConcepts.slice(0, 2).join(", ")} | ${r!.tacticalScore} | ${r!.categoryScore} | ${r!.complexityScore} | ${r!.methodologyScore} | ${r!.finalScore} | ${r!.compatibilityLevel} |`);
  });

  // CASO B: Senior -> Circulación Rápida
  const seniorCirculacion = exercises!
    .map(e => scoreExerciseRigorousAudited(e, pCirculacion, "senior", "Senior", getCurriculumPriorities("Senior")))
    .filter(Boolean)
    .sort((a, b) => b!.finalScore - a!.finalScore);

  console.log(`\n### CASO B: Senior -> Ataque Organizado -> Circulación Rápida (Total: ${seniorCirculacion.length})`);
  console.log("| # | Nombre | Cat. Orig | Dif | Hits | Coincidencias Tácticas | Score Tác | Score Cat | Score Comp | Score Met | Score Final | Nivel |");
  console.log("|---|---|---|---|---|---|---|---|---|---|---|---|");
  seniorCirculacion.slice(0, 10).forEach((r, i) => {
    console.log(`| ${i+1} | "${r!.exercise.nombre}" | ${r!.exercise.age_category || 'N/A'} | ${r!.exercise.dificultad} | ${r!.totalAffinityHits} | ${r!.matchedConcepts.slice(0, 2).join(", ")} | ${r!.tacticalScore} | ${r!.categoryScore} | ${r!.complexityScore} | ${r!.methodologyScore} | ${r!.finalScore} | ${r!.compatibilityLevel} |`);
  });

  // CASO C: U6 -> Basculación
  const u6Basculacion = exercises!
    .map(e => scoreExerciseRigorousAudited(e, pBasculacion, "querubin", "U6", getCurriculumPriorities("U6")))
    .filter(Boolean)
    .sort((a, b) => b!.finalScore - a!.finalScore);

  console.log(`\n### CASO C: U6 -> Defensa Organizada -> Basculación (Total: ${u6Basculacion.length})`);
  console.log("| # | Nombre | Cat. Orig | Dif | Hits | Coincidencias Tácticas | Score Tác | Score Cat | Score Comp | Score Met | Score Final | Nivel |");
  console.log("|---|---|---|---|---|---|---|---|---|---|---|---|");
  u6Basculacion.slice(0, 10).forEach((r, i) => {
    console.log(`| ${i+1} | "${r!.exercise.nombre}" | ${r!.exercise.age_category || 'N/A'} | ${r!.exercise.dificultad} | ${r!.totalAffinityHits} | ${r!.matchedConcepts.slice(0, 2).join(", ")} | ${r!.tacticalScore} | ${r!.categoryScore} | ${r!.complexityScore} | ${r!.methodologyScore} | ${r!.finalScore} | ${r!.compatibilityLevel} |`);
  });

  // CASO D: Senior -> Presión Alta
  const seniorPresion = exercises!
    .map(e => scoreExerciseRigorousAudited(e, pPresion, "senior", "Senior", getCurriculumPriorities("Senior")))
    .filter(Boolean)
    .sort((a, b) => b!.finalScore - a!.finalScore);

  console.log(`\n### CASO D: Senior -> Defensa Organizada -> Presión Alta (Total: ${seniorPresion.length})`);
  console.log("| # | Nombre | Cat. Orig | Dif | Hits | Coincidencias Tácticas | Score Tác | Score Cat | Score Comp | Score Met | Score Final | Nivel |");
  console.log("|---|---|---|---|---|---|---|---|---|---|---|---|");
  seniorPresion.slice(0, 10).forEach((r, i) => {
    console.log(`| ${i+1} | "${r!.exercise.nombre}" | ${r!.exercise.age_category || 'N/A'} | ${r!.exercise.dificultad} | ${r!.totalAffinityHits} | ${r!.matchedConcepts.slice(0, 2).join(", ")} | ${r!.tacticalScore} | ${r!.categoryScore} | ${r!.complexityScore} | ${r!.methodologyScore} | ${r!.finalScore} | ${r!.compatibilityLevel} |`);
  });
}

runAudit().catch(console.error);
