process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

// Normalizador exacto de fase
function normalizePhase(phase: string): string {
  const norm = (phase || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

  if (norm.includes("ataque") && !norm.includes("transicion")) return "ataque";
  if (norm.includes("defensa") && !norm.includes("transicion")) return "defensa";
  if (norm.includes("transicionataquedefensa") || norm.includes("atktodef") || norm.includes("transiciondefensiva")) return "transicion_ad";
  if (norm.includes("transiciondefensaataque") || norm.includes("deftoatk") || norm.includes("transicionofensiva")) return "transicion_da";
  if (norm.includes("balonparado") || norm.includes("abp") || norm.includes("setpieces")) return "abp";
  return norm;
}

const PHASE_DRILL_MAP: Record<string, string[]> = {
  "ataque": [
    "attacking_build_up", "attacking_progression", "attacking_finishing", "possession",
    "juego_medio", "rondo", "Posicional", "posicional", "posesion", "Ataque", "ataque"
  ],
  "defensa": [
    "defending", "defending_mid_block", "defending_high_press", "defensive_game", "Defensa", "defensa"
  ],
  "transicion_ad": [
    "transition_atk_to_def", "defending_high_press", "Transición Ataque-Defensa"
  ],
  "transicion_da": [
    "transition_def_to_atk", "attacking_finishing", "attacking_progression", "Transición Defensa-Ataque"
  ],
  "abp": [
    "set_pieces", "abp", "Balón Parado", "balon_parado"
  ]
};

// Diccionario de conceptos tácticos clave por principio
const PRINCIPLE_CONCEPT_STEMS: Record<string, string[]> = {
  "circulacion": ["circulacion", "cambio de orientacion", "orientacion", "lado opuesto", "fijar", "tercer hombre", "basculacion", "ritmo de juego", "conservacion", "2 toques", "juego de posicion", "rueda de pases", "mantenimiento", "amplitud"],
  "basculacion": ["basculacion", "compactacion", "bloque", "lineas", "interlineas", "zona", "cobertura", "cerrar", "lado debil", "bascular", "bloque medio", "bloque bajo", "achique", "densidad"],
  "presion alta": ["presion alta", "pressing", "acoso", "primer receptor", "salto", "bloque adelantado", "campo rival", "orientar hacia fuera", "provocar error", "intrapresion", "linea de presion", "robo"],
  "salida de balon": ["salida de balon", "inicio", "construccion", "salida limpia", "primer tercio", "centrales", "laterales", "portero", "salida en corto", "fijacion", "atraer"],
  "progresion": ["progresion", "conduccion", "pase filtrado", "superar lineas", "escalonada", "linea de pase", "hombre libre", "espaldas"],
  "finalizacion": ["finalizacion", "remate", "tiro", "ultimo tercio", "area", "centros", "llegada", "gol", "segundas jugadas", "disparo"],
  "transicion defensiva": ["transicion defensiva", "tras perdida", "reaccion inmediata", "presion tras perdida", "3 segundos", "replegar", "falta tactica", "reorganizacion"],
  "transicion ofensiva": ["transicion ofensiva", "contraataque", "despliegue", "salida vertical", "pase de seguridad", "ataque rapido", "velocidad"],
  "balon parado": ["abp", "corner", "falta", "saque de esquina", "balon parado", "penalti", "saque", "barrera", "bloqueo", "arrastre"]
};

function getPrincipleKey(principleName: string): string {
  const pLower = principleName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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

interface QualityScoreResult {
  exercise: any;
  score: number;
  compatibilityLevel: "ALTA" | "MEDIA" | "ADAPTABLE";
  stageBadge: string;
  reasons: string[];
}

function scoreQualityCompatibility(
  ex: any,
  principle: any,
  stageSlug: string,
  stageCode: string
): QualityScoreResult | null {
  const pPhaseNorm = normalizePhase(principle.game_phase);
  const allowedDrillPhases = PHASE_DRILL_MAP[pPhaseNorm] || [];

  // 1. Coincidencia de Fase (Estricta)
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
    return null; // Fase incorrecta -> descarte inmediato
  }

  // 2. Afinidad Temática y Táctica con el Principio (Filtro Antifalsos Positivos)
  const pKey = getPrincipleKey(principle.name);
  const targetConcepts = PRINCIPLE_CONCEPT_STEMS[pKey] || [];

  // Buscar términos en el nombre y en objetivos tácticos (mayor peso)
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

  // Si no hay ninguna coincidencia de concepto táctico específico, descartar si no es un ejercicio de fase directa muy afín
  const totalAffinityHits = titleMatches * 3 + tacticalMatches * 2 + generalMatches;

  if (totalAffinityHits === 0) {
    // Descartar para evitar falsos positivos
    return null;
  }

  let score = 0;
  const reasons: string[] = [];

  // Puntuación por Fase
  if (isPhaseDirect) {
    score += 4;
    reasons.push(`Fase exacta: ${ex.game_phase}`);
  } else {
    score += 2;
    reasons.push("Fase compatible");
  }

  // Puntuación por Afinidad Táctica
  if (titleMatches > 0 || tacticalMatches >= 2) {
    score += 5;
    reasons.push("Afinidad táctica directa en título/objetivos");
  } else if (tacticalMatches === 1 || generalMatches >= 2) {
    score += 3;
    reasons.push("Concepto táctico coincidente");
  } else {
    score += 1.5;
    reasons.push("Afinidad contextual");
  }

  // Puntuación por Etapa
  const isExactAge = ex.age_category === stageSlug || ex.categoria_edad?.includes(stageSlug);
  const isGeneralAge = !ex.age_category || ex.age_category === "general" || (ex.categoria_edad && ex.categoria_edad.length > 2);

  let stageBadge = `Adaptable a ${stageCode}`;
  if (isExactAge) {
    score += 3;
    stageBadge = `Específica (${stageCode})`;
    reasons.push(`Etapa exacta ${stageCode}`);
  } else if (isGeneralAge) {
    score += 2;
    stageBadge = "Compatible transversal";
    reasons.push("Transversal");
  } else {
    score += 1;
    reasons.push(`Adaptable a ${stageCode}`);
  }

  // Clasificación de Nivel de Compatibilidad
  let compatibilityLevel: "ALTA" | "MEDIA" | "ADAPTABLE" = "ADAPTABLE";
  if (score >= 10 && (isExactAge || isGeneralAge) && (titleMatches > 0 || tacticalMatches > 0)) {
    compatibilityLevel = "ALTA";
  } else if (score >= 7) {
    compatibilityLevel = "MEDIA";
  } else {
    compatibilityLevel = "ADAPTABLE";
  }

  return {
    exercise: ex,
    score,
    compatibilityLevel,
    stageBadge,
    reasons
  };
}

async function testQuality() {
  const { data: exercises } = await supabase.from("banco_ejercicios").select("*");
  const { data: principles } = await supabase.from("methodology_principles").select(`
    id, name, game_phase, description,
    methodology_subprinciples (
      id, name, description
    )
  `);

  const uniquePrinciplesMap = new Map<string, any>();
  principles?.forEach(p => {
    if (!uniquePrinciplesMap.has(p.name)) {
      uniquePrinciplesMap.set(p.name, p);
    }
  });
  const uniquePrinciples = Array.from(uniquePrinciplesMap.values());

  console.log("================================================================================");
  console.log("AUDITORÍA DE CALIDAD METODOLÓGICA (CALIDAD > CANTIDAD)");
  console.log("================================================================================");

  // CASO A: U6 -> Defensa Organizada -> Basculación y Compactación de Bloque
  const pA = uniquePrinciples.find(p => p.name.includes("Basculación"));
  const caseA = (exercises || [])
    .map(ex => scoreQualityCompatibility(ex, pA, "querubin", "U6"))
    .filter(Boolean)
    .sort((a, b) => b!.score - a!.score);

  console.log(`\nCASO A: U6 -> Defensa Organizada -> '${pA?.name}'`);
  console.log(`Total recomendaciones de calidad: ${caseA.length}`);
  console.log("Top 10 ejercicios:");
  caseA.slice(0, 10).forEach((item, i) => {
    console.log(`  ${i + 1}. [${item!.compatibilityLevel} | Score: ${item!.score}] ${item!.exercise.nombre}`);
    console.log(`     Tipo: ${item!.exercise.tipo} | Edad: ${item!.exercise.age_category} | Fase: ${item!.exercise.game_phase}`);
    console.log(`     Obj. Táctico: ${JSON.stringify(item!.exercise.objetivo_tactico)}`);
  });

  // CASO B: U11-U12 -> Ataque Organizado -> Circulación Rápida y Cambio de Orientación
  const pB = uniquePrinciples.find(p => p.name.includes("Circulación Rápida"));
  const caseB = (exercises || [])
    .map(ex => scoreQualityCompatibility(ex, pB, "alevin", "U11-U12"))
    .filter(Boolean)
    .sort((a, b) => b!.score - a!.score);

  console.log(`\nCASO B: U11-U12 -> Ataque Organizado -> '${pB?.name}'`);
  console.log(`Total recomendaciones de calidad: ${caseB.length}`);
  console.log("Top 10 ejercicios:");
  caseB.slice(0, 10).forEach((item, i) => {
    console.log(`  ${i + 1}. [${item!.compatibilityLevel} | Score: ${item!.score}] ${item!.exercise.nombre}`);
    console.log(`     Tipo: ${item!.exercise.tipo} | Edad: ${item!.exercise.age_category} | Fase: ${item!.exercise.game_phase}`);
    console.log(`     Obj. Táctico: ${JSON.stringify(item!.exercise.objetivo_tactico)}`);
  });

  // CASO C: Senior -> Defensa Organizada -> Presión Alta
  const pC = uniquePrinciples.find(p => p.name === "Presión Alta");
  const caseC = (exercises || [])
    .map(ex => scoreQualityCompatibility(ex, pC, "senior", "Senior"))
    .filter(Boolean)
    .sort((a, b) => b!.score - a!.score);

  console.log(`\nCASO C: Senior -> Defensa Organizada -> '${pC?.name}'`);
  console.log(`Total recomendaciones de calidad: ${caseC.length}`);
  console.log("Top 10 ejercicios:");
  caseC.slice(0, 10).forEach((item, i) => {
    console.log(`  ${i + 1}. [${item!.compatibilityLevel} | Score: ${item!.score}] ${item!.exercise.nombre}`);
    console.log(`     Tipo: ${item!.exercise.tipo} | Edad: ${item!.exercise.age_category} | Fase: ${item!.exercise.game_phase}`);
    console.log(`     Obj. Táctico: ${JSON.stringify(item!.exercise.objetivo_tactico)}`);
  });
}

testQuality().catch(console.error);
