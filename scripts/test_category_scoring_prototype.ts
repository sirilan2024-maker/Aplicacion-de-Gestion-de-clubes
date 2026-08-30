process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

// Orden secuencial de etapas formativas
const STAGES_ORDER = ["querubin", "prebenjamin", "benjamin", "alevin", "infantil", "cadete", "juvenil", "senior"];

function getStageIndex(stageSlug: string): number {
  const norm = (stageSlug || "").toLowerCase().trim();
  const idx = STAGES_ORDER.indexOf(norm);
  return idx >= 0 ? idx : 3; // Default alevin
}

// Mapeo de dificultades idóneas y límites por etapa
const STAGE_COMPLEXITY_RULES: Record<string, { idealDiff: number[]; maxDiff: number; maxPlayers: number; allowedTypes?: string[]; preferredTypes?: string[] }> = {
  "querubin": {
    idealDiff: [1, 2],
    maxDiff: 3,
    maxPlayers: 12,
    preferredTypes: ["ludico", "circuito", "analitico", "rondo", "individual_technical", "Juego Lúdico", "Circuito", "Analítico"]
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

const PRINCIPLE_CONCEPT_STEMS: Record<string, string[]> = {
  "circulacion": ["circulacion", "cambio de orientacion", "orientacion", "lado opuesto", "fijar", "tercer hombre", "basculacion", "ritmo de juego", "conservacion", "2 toques", "juego de posicion", "rueda de pases", "mantenimiento", "amplitud", "pase"],
  "basculacion": ["basculacion", "compactacion", "bloque", "lineas", "interlineas", "zona", "cobertura", "cerrar", "lado debil", "bascular", "bloque medio", "bloque bajo", "achique", "densidad", "defensa en zona"],
  "presion alta": ["presion alta", "pressing", "acoso", "primer receptor", "salto", "bloque adelantado", "campo rival", "orientar hacia fuera", "provocar error", "intrapresion", "linea de presion", "robo"],
  "salida de balon": ["salida de balon", "inicio", "construccion", "salida limpia", "primer tercio", "centrales", "laterales", "portero", "salida en corto", "fijacion", "atraer"],
  "progresion": ["progresion", "conduccion", "pase filtrado", "superar lineas", "escalonada", "linea de pase", "hombre libre", "espaldas"],
  "finalizacion": ["finalizacion", "remate", "tiro", "ultimo tercio", "area", "centros", "llegada", "gol", "segundas jugadas", "disparo"],
  "transicion defensiva": ["transicion defensiva", "tras perdida", "reaccion inmediata", "presion tras perdida", "3 segundos", "replegar", "falta tactica", "reorganizacion"],
  "transicion ofensiva": ["transicion ofensiva", "contraataque", "despliegue", "salida vertical", "pase de seguridad", "ataque rapido", "velocidad"],
  "balon parado": ["abp", "corner", "falta", "saque de esquina", "balon parado", "penalti", "saque", "barrera", "bloqueo", "arrastre"]
};

const PHASE_DRILL_MAP: Record<string, string[]> = {
  "ataque": ["attacking_build_up", "attacking_finishing", "possession", "positional_game", "rondo", "SSG", "ataque", "juego_medio", "juego_global", "circuito", "analitico", "ludico"],
  "defensa": ["defensive_organization", "defensive_transition", "pressing", "duels", "defensa", "juego_medio", "juego_global", "SSG"],
  "transicion_ad": ["defensive_transition", "transicion", "transicion_ad", "pressing", "SSG", "possession"],
  "transicion_da": ["attacking_finishing", "attacking_build_up", "transicion", "transicion_da", "contraataque", "SSG"],
  "abp": ["set_pieces", "abp", "corner", "falta", "balon parado"]
};

function normalizePhase(phase: string): string {
  const p = (phase || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (p.includes("ataque") && !p.includes("transic")) return "ataque";
  if (p.includes("defensa") && !p.includes("transic")) return "defensa";
  if (p.includes("transic") && (p.includes("ataque-defensa") || p.includes("ad") || p.includes("perdida"))) return "transicion_ad";
  if (p.includes("transic") && (p.includes("defensa-ataque") || p.includes("da") || p.includes("recupera"))) return "transicion_da";
  if (p.includes("parado") || p.includes("abp") || p.includes("estrategia")) return "abp";
  return "ataque";
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

function scoreExerciseRigorous(
  ex: any,
  principle: any,
  stageSlug: string,
  stageCode: string,
  curriculumPriorities: string[] = []
) {
  const pPhaseNorm = normalizePhase(principle.game_phase);
  const allowedDrillPhases = PHASE_DRILL_MAP[pPhaseNorm] || [];

  // 1. Coincidencia de Fase de Juego
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

  // 2. Afinidad Temática y Táctica con el Principio (Filtro Anti-Falsos Positivos)
  const pKey = getPrincipleKey(principle.name);
  const targetConcepts = PRINCIPLE_CONCEPT_STEMS[pKey] || [];

  const exTitleNorm = (ex.nombre || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const exTacticalNorm = (ex.objetivo_tactico || []).join(" ").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  let titleMatches = 0;
  let tacticalMatches = 0;
  let generalMatches = 0;

  for (const concept of targetConcepts) {
    if (exTitleNorm.includes(concept)) titleMatches++;
    if (exTacticalNorm.includes(concept)) tacticalMatches++;
    if (exAllText.includes(concept)) generalMatches++;
  }

  const totalAffinityHits = titleMatches * 3 + tacticalMatches * 2 + generalMatches;
  if (totalAffinityHits === 0) {
    return null; // Filtro estricto anti-falsos positivos
  }

  // 3. Adecuación por Etapa / Categoría y Metodología
  const targetStageIdx = getStageIndex(stageSlug);
  const complexityRules = STAGE_COMPLEXITY_RULES[stageSlug] || STAGE_COMPLEXITY_RULES["alevin"];

  // Detección de etapas del ejercicio
  const exerciseStages: string[] = [];
  if (ex.age_category) exerciseStages.push(ex.age_category.toLowerCase());
  if (ex.categoria_edad && Array.isArray(ex.categoria_edad)) {
    ex.categoria_edad.forEach((c: string) => exerciseStages.push(c.toLowerCase()));
  }

  const isExactStage = exerciseStages.includes(stageSlug);
  const isGeneralTransversal = exerciseStages.length === 0 || exerciseStages.includes("general") || exerciseStages.length >= 4;

  // Distancia mínima de etapa
  let minStageDistance = 999;
  if (isExactStage) {
    minStageDistance = 0;
  } else if (exerciseStages.length > 0) {
    for (const st of exerciseStages) {
      const idx = getStageIndex(st);
      const dist = Math.abs(idx - targetStageIdx);
      if (dist < minStageDistance) minStageDistance = dist;
    }
  } else {
    minStageDistance = 1; // Transversal sin categoría específica
  }

  // Descarte pedagógico estricto:
  // - Si estamos en U6/U8 y el ejercicio es exclusivo Senior/Juvenil con distancia >= 4 y dificultad >= 4 -> Incompatible
  const exDifficulty = typeof ex.dificultad === "number" ? ex.dificultad : 3;
  const exMinPlayers = typeof ex.min_players === "number" ? ex.min_players : 8;

  if (targetStageIdx <= 1 && minStageDistance >= 4 && exDifficulty >= 4) {
    return null; // Demasiado complejo y lejano para U6/U8
  }

  // Si estamos en Senior y el ejercicio es puramente lúdico de U6 (distancia >= 6, tipo ludico/coordinacion) -> Descartar o penalizar fuertemente
  if (targetStageIdx >= 7 && minStageDistance >= 5 && (ex.tipo === "ludico" || ex.tipo === "Juego Lúdico" || ex.game_phase === "motor_coordination")) {
    return null; // Juegos psicomotores de querubines no recomendados para Senior
  }

  let score = 0;
  const matchReasons: string[] = [];

  // Puntuación por Fase
  if (isPhaseDirect) {
    score += 4;
    matchReasons.push(`Fase exacta: ${ex.game_phase}`);
  } else {
    score += 2;
    matchReasons.push("Fase compatible");
  }

  // Puntuación por Afinidad Táctica
  if (titleMatches > 0 || tacticalMatches >= 2) {
    score += 6;
    matchReasons.push("Afinidad táctica directa");
  } else if (tacticalMatches === 1 || generalMatches >= 2) {
    score += 4;
    matchReasons.push("Concepto táctico coincidente");
  } else {
    score += 2;
    matchReasons.push("Afinidad contextual");
  }

  // Puntuación por Adecuación de Etapa
  if (isExactStage) {
    score += 8; // Máxima bonificación para la etapa exacta
    matchReasons.push(`Específica de ${stageCode}`);
  } else if (minStageDistance === 1) {
    score += 4; // Etapa contigua (ej. Benjamín en Alevín)
    matchReasons.push("Etapa contigua compatible");
  } else if (minStageDistance === 2) {
    score += 2;
    matchReasons.push("Adaptación metodológica moderada");
  } else if (isGeneralTransversal) {
    score += 3;
    matchReasons.push("Compatible transversal");
  } else {
    // Distancia >= 3
    score -= 3; // Penalización por lejanía formativa
    matchReasons.push(`Requiere adaptación a ${stageCode}`);
  }

  // Adecuación de Complejidad / Dificultad
  if (complexityRules.idealDiff.includes(exDifficulty)) {
    score += 3;
    matchReasons.push("Dificultad idónea para la etapa");
  } else if (exDifficulty > complexityRules.maxDiff) {
    score -= 4; // Penalización por sobrecomplejidad
  }

  // Adecuación de Tipo de Ejercicio
  if (complexityRules.preferredTypes && complexityRules.preferredTypes.includes(ex.tipo)) {
    score += 2;
  }

  // Adecuación a Prioridades Curriculares del Club
  if (curriculumPriorities && curriculumPriorities.length > 0) {
    const hasPriorityMatch = curriculumPriorities.some(p => {
      const pNorm = p.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return exAllText.includes(pNorm);
    });
    if (hasPriorityMatch) {
      score += 2;
      matchReasons.push("Alineado con prioridades de la etapa");
    }
  }

  // Determinar Badge y Nivel de Compatibilidad
  let stageBadge = `Adaptable a ${stageCode}`;
  if (isExactStage) {
    stageBadge = `Específica (${stageCode})`;
  } else if (minStageDistance === 1) {
    stageBadge = `Contigua adaptable`;
  } else if (isGeneralTransversal) {
    stageBadge = "Transversal";
  }

  let compatibilityLevel: "ALTA" | "MEDIA" | "ADAPTABLE" = "ADAPTABLE";
  if (score >= 15 && (isExactStage || minStageDistance <= 1) && (titleMatches > 0 || tacticalMatches > 0)) {
    compatibilityLevel = "ALTA";
  } else if (score >= 10 && minStageDistance <= 2) {
    compatibilityLevel = "MEDIA";
  } else {
    compatibilityLevel = "ADAPTABLE";
  }

  return {
    exercise: ex,
    score,
    compatibilityLevel,
    stageBadge,
    matchReasons
  };
}

async function runPrototypeTests() {
  const { data: exercises } = await supabase.from("banco_ejercicios").select("*");
  const { data: curricula } = await supabase.from("methodology_curriculum").select("*");

  const getCurriculumPriorities = (code: string) => {
    const c = curricula?.find(curr => curr.category_code === code);
    return c?.priority_families || [];
  };

  const pBasculacion = { name: "Basculación y Compactación de Bloque", game_phase: "Defensa" };
  const pCirculacion = { name: "Circulación Rápida y Cambio de Orientación", game_phase: "Ataque" };
  const pPresion = { name: "Presión Alta", game_phase: "Defensa" };

  console.log("================================================================================");
  console.log("EVALUACIÓN DE LOS 5 CASOS CLAVE CON EL NUEVO MOTOR POR CATEGORÍA REAL");
  console.log("================================================================================");

  // CASO 1: U6 -> Defensa -> Basculacion
  const u6Basculacion = exercises!
    .map(e => scoreExerciseRigorous(e, pBasculacion, "querubin", "U6", getCurriculumPriorities("U6")))
    .filter(Boolean)
    .sort((a, b) => b!.score - a!.score);

  console.log(`\n[CASO 1] U6 -> Defensa -> Basculación (Total: ${u6Basculacion.length} tareas):`);
  u6Basculacion.slice(0, 5).forEach((r, i) => {
    console.log(`  ${i+1}. "${r!.exercise.nombre}" | Score: ${r!.score} | ${r!.compatibilityLevel} | ${r!.stageBadge} | Cat: ${r!.exercise.age_category || 'N/A'} | Diff: ${r!.exercise.dificultad}`);
  });

  // CASO 2: U11-U12 -> Ataque -> Circulacion
  const u12Circulacion = exercises!
    .map(e => scoreExerciseRigorous(e, pCirculacion, "alevin", "U11-U12", getCurriculumPriorities("U11-U12")))
    .filter(Boolean)
    .sort((a, b) => b!.score - a!.score);

  console.log(`\n[CASO 2] U11-U12 -> Ataque -> Circulación (Total: ${u12Circulacion.length} tareas):`);
  u12Circulacion.slice(0, 5).forEach((r, i) => {
    console.log(`  ${i+1}. "${r!.exercise.nombre}" | Score: ${r!.score} | ${r!.compatibilityLevel} | ${r!.stageBadge} | Cat: ${r!.exercise.age_category || 'N/A'} | Diff: ${r!.exercise.dificultad}`);
  });

  // CASO 3: Senior -> Defensa -> Presion Alta
  const seniorPresion = exercises!
    .map(e => scoreExerciseRigorous(e, pPresion, "senior", "Senior", getCurriculumPriorities("Senior")))
    .filter(Boolean)
    .sort((a, b) => b!.score - a!.score);

  console.log(`\n[CASO 3] Senior -> Defensa -> Presión Alta (Total: ${seniorPresion.length} tareas):`);
  seniorPresion.slice(0, 5).forEach((r, i) => {
    console.log(`  ${i+1}. "${r!.exercise.nombre}" | Score: ${r!.score} | ${r!.compatibilityLevel} | ${r!.stageBadge} | Cat: ${r!.exercise.age_category || 'N/A'} | Diff: ${r!.exercise.dificultad}`);
  });

  // CASO 4: U6 -> Ataque -> Circulacion
  const u6Circulacion = exercises!
    .map(e => scoreExerciseRigorous(e, pCirculacion, "querubin", "U6", getCurriculumPriorities("U6")))
    .filter(Boolean)
    .sort((a, b) => b!.score - a!.score);

  console.log(`\n[CASO 4] U6 -> Ataque -> Circulación (Total: ${u6Circulacion.length} tareas):`);
  u6Circulacion.slice(0, 5).forEach((r, i) => {
    console.log(`  ${i+1}. "${r!.exercise.nombre}" | Score: ${r!.score} | ${r!.compatibilityLevel} | ${r!.stageBadge} | Cat: ${r!.exercise.age_category || 'N/A'} | Diff: ${r!.exercise.dificultad}`);
  });

  // CASO 5: Senior -> Ataque -> Circulacion
  const seniorCirculacion = exercises!
    .map(e => scoreExerciseRigorous(e, pCirculacion, "senior", "Senior", getCurriculumPriorities("Senior")))
    .filter(Boolean)
    .sort((a, b) => b!.score - a!.score);

  console.log(`\n[CASO 5] Senior -> Ataque -> Circulación (Total: ${seniorCirculacion.length} tareas):`);
  seniorCirculacion.slice(0, 5).forEach((r, i) => {
    console.log(`  ${i+1}. "${r!.exercise.nombre}" | Score: ${r!.score} | ${r!.compatibilityLevel} | ${r!.stageBadge} | Cat: ${r!.exercise.age_category || 'N/A'} | Diff: ${r!.exercise.dificultad}`);
  });
}

runPrototypeTests().catch(console.error);
