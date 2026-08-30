process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import { evaluatePureTacticalAffinity, PRINCIPLE_TAXONOMY, normalizeText } from "../src/lib/methodology/tacticalEngine/tacticalAffinityEngine";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://bwhvszbspvmsfgrbepox.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY!);

// ==========================================
// 1. CANONICAL ALIAS RESOLVER
// ==========================================
export function resolveCanonicalPrincipleKey(principleName: string): string {
  const norm = normalizeText(principleName);
  
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

  if (
    norm.includes("progresion") || 
    norm.includes("atraccion") || 
    norm.includes("escalonada") || 
    norm.includes("pasillos interiores") ||
    norm.includes("superar lineas") ||
    norm.includes("hombre libre") ||
    norm.includes("pase filtrado") ||
    norm.includes("duelos 1v1") ||
    norm.includes("1v1") ||
    norm.includes("desborde") ||
    norm.includes("regate") ||
    norm.includes("juego entre lineas") ||
    norm.includes("entre lineas")
  ) {
    return "progresion";
  }

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

// ==========================================
// 2. CANONICAL DRILL TYPE NORMALIZER
// ==========================================
export type CanonicalDrillType = 
  | "JUEGO_POSICIONAL"
  | "JUEGO_GLOBAL"
  | "RONDO"
  | "CIRCUITO"
  | "ANALITICO"
  | "CALENTAMIENTO"
  | "LUDICO"
  | "TACTICO"
  | "FISICO"
  | "POSESION"
  | "GLOBALIZACION";

export function normalizeDrillType(rawType: string | null | undefined): CanonicalDrillType {
  const norm = normalizeText(rawType || "");
  if (!norm) return "JUEGO_POSICIONAL";

  if (norm.includes("positional") || norm.includes("posicional") || norm.includes("juego medio") || norm.includes("juego de posicion")) {
    return "JUEGO_POSICIONAL";
  }
  if (norm.includes("ssg") || norm.includes("global") || norm.includes("partido") || norm.includes("conditioned") || norm.includes("defensive game")) {
    return "JUEGO_GLOBAL";
  }
  if (norm.includes("rondo")) {
    return "RONDO";
  }
  if (norm.includes("circuito") || norm.includes("circuit")) {
    return "CIRCUITO";
  }
  if (norm.includes("analitico") || norm.includes("individual technical") || norm.includes("tecnico") || norm.includes("individual")) {
    return "ANALITICO";
  }
  if (norm.includes("calentamiento") || norm.includes("warmup") || norm.includes("activacion")) {
    return "CALENTAMIENTO";
  }
  if (norm.includes("ludico") || norm.includes("juego ludico")) {
    return "LUDICO";
  }
  if (norm.includes("tactico") || norm.includes("ia generado") || norm.includes("tactical")) {
    return "TACTICO";
  }
  if (norm.includes("fisico") || norm.includes("physical")) {
    return "FISICO";
  }
  if (norm.includes("possession") || norm.includes("posesion")) {
    return "POSESION";
  }
  if (norm.includes("globalizacion")) {
    return "GLOBALIZACION";
  }

  return "JUEGO_POSICIONAL";
}

// ==========================================
// 3. INFERENCIA METODOLÓGICA DE BLOQUE DE SESIÓN
// ==========================================
export interface BlockInferenceResult {
  currentBlock: string | null;
  recommendedBlock: "calentamiento" | "principal" | "global" | "vuelta_calma" | null;
  confidence: "ALTA" | "MEDIA" | "BAJA";
  reasons: string[];
  alternativeBlocks: ("calentamiento" | "principal" | "global" | "vuelta_calma")[];
  multiSuitability: {
    activacion: { suitable: boolean; optimal: boolean };
    principal_1: { suitable: boolean; optimal: boolean };
    principal_2: { suitable: boolean; optimal: boolean };
    global: { suitable: boolean; optimal: boolean };
    vuelta_calma: { suitable: boolean; optimal: boolean };
  };
}

export function inferDrillBlock(exercise: any): BlockInferenceResult {
  const normType = normalizeDrillType(exercise.tipo);
  const rawBlock = exercise.bloque_sesion;
  const nameNorm = normalizeText(exercise.nombre || "");
  const tacNorm = (exercise.objetivo_tactico || []).map((t: string) => normalizeText(t)).join(" ");
  const tagsNorm = (exercise.tags || []).map((t: string) => normalizeText(t)).join(" ");
  const carga = exercise.carga_fisica ?? 2;
  const opo = exercise.oposicion ?? 2;
  const rep = exercise.representatividad ?? 2;
  const phase = normalizeText(exercise.game_phase || "");

  const reasons: string[] = [];
  const alternatives: ("calentamiento" | "principal" | "global" | "vuelta_calma")[] = [];

  let recommendedBlock: "calentamiento" | "principal" | "global" | "vuelta_calma" | null = null;
  let confidence: "ALTA" | "MEDIA" | "BAJA" = "MEDIA";

  // Si ya tiene bloque declarado explícito, se valida
  if (rawBlock === "calentamiento" || rawBlock === "principal" || rawBlock === "global" || rawBlock === "vuelta_calma") {
    recommendedBlock = rawBlock;
    confidence = "ALTA";
    reasons.push(`Declarado explícitamente en catálogo como "${rawBlock}"`);
  } else {
    // Inferencia diagnóstica
    if (
      nameNorm.includes("calentamiento") || 
      nameNorm.includes("activacion") || 
      normType === "CALENTAMIENTO" || 
      normType === "CIRCUITO" || 
      normType === "LUDICO" ||
      phase.includes("motor_coordination") ||
      (nameNorm.includes("rondo") && opo <= 2 && carga <= 2 && (exercise.max_players || 0) <= 8)
    ) {
      recommendedBlock = "calentamiento";
      confidence = (normType === "CALENTAMIENTO" || nameNorm.includes("calentamiento") || nameNorm.includes("activacion")) ? "ALTA" : "MEDIA";
      reasons.push(`Estructura [${normType}] con oposición baja (${opo}) y carga moderada (${carga}) idónea para activación`);
      if (normType === "RONDO") alternatives.push("principal");
    } else if (
      nameNorm.includes("vuelta a la calma") || 
      nameNorm.includes("regenerat") || 
      nameNorm.includes("estiramiento") ||
      (carga === 1 && opo <= 1 && (normType === "ANALITICO" || nameNorm.includes("pase suave")))
    ) {
      recommendedBlock = "vuelta_calma";
      confidence = (carga === 1 && opo <= 1) ? "ALTA" : "MEDIA";
      reasons.push(`Carga regenerativa (${carga}) y baja oposición (${opo}) apta para vuelta a la calma`);
    } else if (
      normType === "JUEGO_GLOBAL" || 
      nameNorm.includes("partido") || 
      nameNorm.includes("11v11") || 
      nameNorm.includes("8v8") || 
      nameNorm.includes("7v7") || 
      rep >= 4 ||
      (opo >= 3 && rep >= 3 && (exercise.min_players || 0) >= 12)
    ) {
      recommendedBlock = "global";
      confidence = (rep >= 3 && opo >= 3) ? "ALTA" : "MEDIA";
      reasons.push(`Alta representatividad (${rep}) y oposición (${opo}) en estructura [${normType}]`);
      if (normType === "JUEGO_GLOBAL" || normType === "JUEGO_POSICIONAL") alternatives.push("principal");
    } else if (
      normType === "JUEGO_POSICIONAL" || 
      normType === "RONDO" || 
      normType === "ANALITICO" || 
      normType === "TACTICO" || 
      normType === "POSESION" || 
      normType === "GLOBALIZACION" ||
      phase.includes("build_up") || 
      phase.includes("progression") || 
      phase.includes("defending")
    ) {
      recommendedBlock = "principal";
      confidence = (normType === "JUEGO_POSICIONAL" || normType === "RONDO") ? "ALTA" : "MEDIA";
      reasons.push(`Fijación y progresión táctica en estructura [${normType}]`);
      if (normType === "RONDO") alternatives.push("calentamiento");
      if (normType === "JUEGO_POSICIONAL" && rep >= 3) alternatives.push("global");
    }
  }

  // Multi-suitability
  const isActOptimal = recommendedBlock === "calentamiento" || normType === "CALENTAMIENTO" || normType === "CIRCUITO";
  const isActSuitable = isActOptimal || normType === "RONDO" || (carga <= 2 && opo <= 2);

  const isP1Optimal = (recommendedBlock === "principal" && (normType === "JUEGO_POSICIONAL" || normType === "RONDO" || normType === "ANALITICO"));
  const isP1Suitable = isP1Optimal || recommendedBlock === "principal" || (normType === "JUEGO_GLOBAL" && (exercise.min_players || 0) <= 12);

  const isP2Optimal = (recommendedBlock === "principal" && (normType === "JUEGO_POSICIONAL" || normType === "JUEGO_GLOBAL" || normType === "GLOBALIZACION"));
  const isP2Suitable = isP2Optimal || recommendedBlock === "global" || (normType === "JUEGO_POSICIONAL");

  const isGlobOptimal = recommendedBlock === "global" || (normType === "JUEGO_GLOBAL" && rep >= 3);
  const isGlobSuitable = isGlobOptimal || (normType === "JUEGO_GLOBAL") || (normType === "JUEGO_POSICIONAL" && (exercise.max_players || 0) >= 12);

  const isCalmOptimal = recommendedBlock === "vuelta_calma" || (carga <= 1 && opo <= 1);
  const isCalmSuitable = isCalmOptimal || (carga <= 2 && opo <= 1);

  return {
    currentBlock: rawBlock,
    recommendedBlock,
    confidence,
    reasons,
    alternativeBlocks: alternatives,
    multiSuitability: {
      activacion: { suitable: isActSuitable, optimal: isActOptimal },
      principal_1: { suitable: isP1Suitable, optimal: isP1Optimal },
      principal_2: { suitable: isP2Suitable, optimal: isP2Optimal },
      global: { suitable: isGlobSuitable, optimal: isGlobOptimal },
      vuelta_calma: { suitable: isCalmSuitable, optimal: isCalmOptimal }
    }
  };
}

async function runDiagnostic() {
  const { data: exercises } = await supabase
    .from("banco_ejercicios")
    .select("*")
    .order("nombre");

  if (!exercises) return;

  console.log("================================================================================");
  console.log("FASE DE NORMALIZACIÓN DIAGNÓSTICA (199 EJERCICIOS)");
  console.log("================================================================================\n");

  // 1. Caso específico: 2ba02f88-4c6b-467f-a0d8-9029471aef23
  console.log("--- 5. ANÁLISIS ESPECÍFICO DE EJERCICIO 2ba02f88... ---");
  const targetDrill = exercises.find(ex => ex.id.startsWith("2ba02f88") || ex.nombre.includes("Pressing Tras Pérdida en Cuadrantes"));
  if (targetDrill) {
    console.log(`ID: ${targetDrill.id}`);
    console.log(`Nombre: "${targetDrill.nombre}"`);
    console.log(`Objetivo Táctico actual:`, targetDrill.objetivo_tactico);
    console.log(`Tags actuales:`, targetDrill.tags);
    console.log(`Tipo actual: ${targetDrill.tipo} -> Normalizado: ${normalizeDrillType(targetDrill.tipo)}`);
    console.log(`Bloque actual: ${targetDrill.bloque_sesion}`);
    console.log(`Fase actual: ${targetDrill.game_phase}`);
    const inf = inferDrillBlock(targetDrill);
    console.log(`Bloque inferido: ${inf.recommendedBlock} (Confianza: ${inf.confidence})`);
    console.log(`Razones: ${inf.reasons.join(" | ")}`);
  }

  // 2. Propuesta de clasificación de bloque_sesion para los 174 NULLs
  const nullBlocks = exercises.filter(ex => !ex.bloque_sesion);
  const inferredDistribution: Record<string, number> = {};
  const confidenceDistribution: Record<string, number> = {};

  const proposedInferences = nullBlocks.map(ex => {
    const inf = inferDrillBlock(ex);
    const rec = inf.recommendedBlock || "NULL_AMBIGUO";
    inferredDistribution[rec] = (inferredDistribution[rec] || 0) + 1;
    confidenceDistribution[inf.confidence] = (confidenceDistribution[inf.confidence] || 0) + 1;
    return {
      id: ex.id,
      nombre: ex.nombre,
      tipo_original: ex.tipo,
      tipo_normalizado: normalizeDrillType(ex.tipo),
      bloque_recomendado: inf.recommendedBlock,
      confianza: inf.confidence,
      razones: inf.reasons.join(" · "),
      alternativas: inf.alternativeBlocks.join(", ")
    };
  });

  console.log("\n--- 3. PROPUESTA DE BLOQUE_SESION PARA LOS 174 EJERCICIOS CON NULL ---");
  console.log("Distribución propuesta de bloques:");
  console.table(inferredDistribution);
  console.log("Distribución de niveles de confianza:");
  console.table(confidenceDistribution);

  // 3. Matriz de cobertura ANTES vs DESPUÉS de normalización
  const targetIntents = [
    { key: "circulacion", label: "Circulación de balón" },
    { key: "presion_alta", label: "Presión alta" },
    { key: "salida_de_balon", label: "Salida de balón" },
    { key: "balon_parado", label: "Balón parado" },
    { key: "transicion_defensiva", label: "Transición defensiva" },
    { key: "transicion_ofensiva", label: "Transición ofensiva" },
    { key: "progresion", label: "Progresión" },
    { key: "finalizacion", label: "Finalización" },
    { key: "organizacion_defensiva", label: "Organización defensiva" },
    { key: "posesion", label: "Posesión" },
    { key: "contraataque", label: "Contraataque" },
    { key: "amplitud", label: "Amplitud" }
  ];

  const comparisonRows = [];

  for (const intent of targetIntents) {
    // A. ANTES: Motor sin alias canónicos ni tipos normalizados
    let beforeTotal = 0, beforeStrong = 0, beforeP1 = 0, beforeP2 = 0, beforeGlob = 0;
    for (const ex of exercises) {
      const pure = evaluatePureTacticalAffinity(ex, { name: intent.label, game_phase: intent.label });
      if (pure && pure.hasMeaningfulAffinity) {
        beforeTotal++;
        if (pure.affinityType === "DIRECT") beforeStrong++;
        
        // Simulación antes
        const rawType = (ex.tipo || "").toLowerCase();
        const rawBlock = (ex.bloque_sesion || "").toLowerCase();
        if (rawType === "juego_medio" || rawType === "rondo" || rawType === "analitico" || (rawBlock === "principal" && rawType !== "ssg")) beforeP1++;
        if (rawType === "ssg" || rawType === "juego_medio") beforeP2++;
        if (rawType === "juego_global" || rawType === "ssg" || rawBlock === "global") beforeGlob++;
      }
    }

    // B. DESPUÉS: Motor con alias canónicos, tipos normalizados e inferencia de bloque
    let afterTotal = 0, afterStrong = 0, afterP1 = 0, afterP2 = 0, afterGlob = 0;
    const resolvedKey = resolveCanonicalPrincipleKey(intent.label);
    const taxDef = PRINCIPLE_TAXONOMY[resolvedKey];

    for (const ex of exercises) {
      // Evaluación con alias canónicos
      let isMatch = false;
      let isDirect = false;

      if (taxDef) {
        // Coincidencias exactas en título o táctico
        const titleNorm = normalizeText(ex.nombre || "");
        const tacNorm = (ex.objetivo_tactico || []).map((t: string) => normalizeText(t)).join(" ");
        const descNorm = normalizeText(ex.descripcion || "");
        const tagsNorm = (ex.tags || []).map((t: string) => normalizeText(t)).join(" ");

        const hasExact = taxDef.primaryExactPhrases.some(p => titleNorm.includes(normalizeText(p)) || tacNorm.includes(normalizeText(p)));
        const hasPrimary = taxDef.primaryTacticalConcepts.some(p => titleNorm.includes(normalizeText(p)) || tacNorm.includes(normalizeText(p)));
        const hasSec = taxDef.secondaryTacticalConcepts.some(p => titleNorm.includes(normalizeText(p)) || tacNorm.includes(normalizeText(p)) || tagsNorm.includes(normalizeText(p)));

        if (hasExact || hasPrimary) {
          isMatch = true;
          isDirect = true;
        } else if (hasSec) {
          isMatch = true;
          isDirect = false;
        }
      }

      if (isMatch) {
        afterTotal++;
        if (isDirect) afterStrong++;

        const inf = inferDrillBlock(ex);
        if (inf.multiSuitability.principal_1.suitable) afterP1++;
        if (inf.multiSuitability.principal_2.suitable) afterP2++;
        if (inf.multiSuitability.global.suitable) afterGlob++;
      }
    }

    comparisonRows.push({
      Objetivo: intent.label,
      "Total ANTES": beforeTotal,
      "Total DESPUÉS": afterTotal,
      "Fuerte ANTES": beforeStrong,
      "Fuerte DESPUÉS": afterStrong,
      "P1 ANTES": beforeP1,
      "P1 DESPUÉS": afterP1,
      "P2 ANTES": beforeP2,
      "P2 DESPUÉS": afterP2,
      "Glob ANTES": beforeGlob,
      "Glob DESPUÉS": afterGlob
    });
  }

  console.log("\n--- 6. COMPARATIVA DE COBERTURA: ANTES VS DESPUÉS DE NORMALIZACIÓN EN MEMORIA ---");
  console.table(comparisonRows);
}

runDiagnostic();
