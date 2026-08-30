process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

const PRINCIPLE_CONCEPT_STEMS: Record<string, string[]> = {
  "circulacion": ["circulacion", "cambio de orientacion", "orientacion", "lado opuesto", "fijar", "tercer hombre", "basculacion", "ritmo de juego", "conservacion", "2 toques", "juego de posicion", "rueda de pases", "mantenimiento", "amplitud"],
  "basculacion": ["basculacion", "compactacion", "bloque", "lineas", "interlineas", "zona", "cobertura", "cerrar", "lado debil", "bascular", "bloque medio", "bloque bajo", "achique", "densidad"],
  "presion alta": ["presion alta", "pressing", "acoso", "primer receptor", "salto", "bloque adelantado", "campo rival", "orientar hacia fuera", "provocar error", "intrapresion", "linea de presion", "robo"],
};

const PHASE_DRILL_MAP: Record<string, string[]> = {
  "ataque": ["attacking_build_up", "attacking_finishing", "possession", "positional_game", "rondo", "SSG", "ataque", "juego_medio", "juego_global", "circuito", "analitico", "ludico"],
  "defensa": ["defensive_organization", "defensive_transition", "pressing", "duels", "defensa", "juego_medio", "juego_global", "SSG"],
};

function normalizePhase(phase: string): string {
  const p = (phase || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (p.includes("ataque") && !p.includes("transic")) return "ataque";
  if (p.includes("defensa") && !p.includes("transic")) return "defensa";
  return "ataque";
}

function getPrincipleKey(principleName: string): string {
  const pLower = (principleName || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (pLower.includes("circulac") || pLower.includes("cambio de orientac")) return "circulacion";
  if (pLower.includes("basculac") || pLower.includes("compactac")) return "basculacion";
  if (pLower.includes("presion alta") || pLower.includes("presion en bloque")) return "presion alta";
  return "general";
}

function scoreExerciseCompatibility(
  ex: any,
  principle: any,
  stageSlug: string,
  stageCode: string
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
    (pPhaseNorm === "ataque" && (exAllText.includes("ataque") || exAllText.includes("posesion") || exAllText.includes("progresion") || exAllText.includes("finalizac") || exAllText.includes("salida de balon") || exAllText.includes("rondo") || exAllText.includes("circulacion")));

  if (!isPhaseDirect && !isPhaseTextMatch) {
    return null;
  }

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
    return null;
  }

  let score = 0;
  const matchReasons: string[] = [];

  if (isPhaseDirect) {
    score += 4;
    matchReasons.push(`Fase exacta: ${ex.game_phase}`);
  } else {
    score += 2;
    matchReasons.push("Fase compatible");
  }

  if (titleMatches > 0 || tacticalMatches >= 2) {
    score += 5;
    matchReasons.push("Afinidad táctica directa en título/objetivos");
  } else if (tacticalMatches === 1 || generalMatches >= 2) {
    score += 3;
    matchReasons.push("Concepto táctico coincidente");
  } else {
    score += 1.5;
    matchReasons.push("Afinidad contextual");
  }

  const isExactAge = ex.age_category === stageSlug || ex.categoria_edad?.includes(stageSlug);
  const isGeneralAge = !ex.age_category || ex.age_category === "general" || (ex.categoria_edad && ex.categoria_edad.length > 2);

  let stageBadge = `Adaptable a ${stageCode}`;
  if (isExactAge) {
    score += 3;
    stageBadge = `Específica (${stageCode})`;
    matchReasons.push(`Etapa exacta ${stageCode}`);
  } else if (isGeneralAge) {
    score += 2;
    stageBadge = "Compatible transversal";
    matchReasons.push("Transversal");
  } else {
    score += 1;
    matchReasons.push(`Adaptable a ${stageCode}`);
  }

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
    matchReasons
  };
}

async function testComparison() {
  const { data: exercises } = await supabase.from("banco_ejercicios").select("*");
  const pCirculacion = { name: "Circulación Rápida y Cambio de Orientación", game_phase: "Ataque" };

  const u6Results = exercises!
    .map(e => scoreExerciseCompatibility(e, pCirculacion, "querubin", "U6"))
    .filter(Boolean)
    .sort((a, b) => b!.score - a!.score);

  const seniorResults = exercises!
    .map(e => scoreExerciseCompatibility(e, pCirculacion, "senior", "Senior"))
    .filter(Boolean)
    .sort((a, b) => b!.score - a!.score);

  console.log(`\n=== U6 (Circulación Rápida) === Total: ${u6Results.length}`);
  console.log("Top 5 U6:");
  u6Results.slice(0, 5).forEach((r, idx) => {
    console.log(`  ${idx+1}. "${r!.exercise.nombre}" | Score: ${r!.score} | Level: ${r!.compatibilityLevel} | AgeCat: ${r!.exercise.age_category} | CatEdad: ${JSON.stringify(r!.exercise.categoria_edad)}`);
  });

  console.log(`\n=== Senior (Circulación Rápida) === Total: ${seniorResults.length}`);
  console.log("Top 5 Senior:");
  seniorResults.slice(0, 5).forEach((r, idx) => {
    console.log(`  ${idx+1}. "${r!.exercise.nombre}" | Score: ${r!.score} | Level: ${r!.compatibilityLevel} | AgeCat: ${r!.exercise.age_category} | CatEdad: ${JSON.stringify(r!.exercise.categoria_edad)}`);
  });
}

testComparison().catch(console.error);
