process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import { evaluatePureTacticalAffinity, PRINCIPLE_TAXONOMY, getPrincipleTaxonomyKey, normalizeText } from "../src/lib/methodology/tacticalEngine/tacticalAffinityEngine";
import { scoreExercise, isExerciseSelectableForBlock } from "../src/lib/methodology/recommendationEngine";
import { normalizeDrillType, inferDrillBlock } from "./diagnostic_normalization";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run86Audit() {
  console.log("================================================================================");
  console.log("AUDITORÍA DE INTEGRACIÓN METODOLÓGICA DE LOS 86 EJERCICIOS NUEVOS");
  console.log("================================================================================\n");

  const { data: allExercises, error } = await supabase
    .from("banco_ejercicios")
    .select("*")
    .order("created_at", { ascending: true });

  if (error || !allExercises) {
    console.error("Error al cargar banco_ejercicios:", error);
    process.exit(1);
  }

  const original199 = allExercises.filter(ex => ex.created_at && !ex.created_at.startsWith("2026-08-26"));
  const new86 = allExercises.filter(ex => ex.created_at && ex.created_at.startsWith("2026-08-26"));

  console.log(`Originales: ${original199.length} | Nuevos añadidos: ${new86.length} | Total: ${allExercises.length}\n`);

  // ==========================================
  // FASE 1 & 2: INVENTARIO Y CALIDAD DE DATOS DE LOS 86
  // ==========================================
  console.log("--- FASE 1 & 2: ANÁLISIS DE CALIDAD DE DATOS (86 NUEVOS) ---");

  let nullBloque = 0;
  let nullGamePhase = 0;
  let nullPrincipleId = 0;
  let nullSubprincipleId = 0;
  let emptyTacObj = 0;
  let emptyTecObj = 0;
  let emptyTags = 0;
  let missingPlayers = 0;
  let missingCarga = 0;
  let missingOpo = 0;

  const rawTypes: Record<string, number> = {};
  const rawPhases: Record<string, number> = {};
  const rawAgeCats: Record<string, number> = {};

  const qualityIssues: any[] = [];

  new86.forEach(ex => {
    if (!ex.bloque_sesion) nullBloque++;
    if (!ex.game_phase) nullGamePhase++;
    if (!ex.principle_id) nullPrincipleId++;
    if (!ex.subprinciple_id) nullSubprincipleId++;
    if (!ex.objetivo_tactico || ex.objetivo_tactico.length === 0) emptyTacObj++;
    if (!ex.objetivo_tecnico || ex.objetivo_tecnico.length === 0) emptyTecObj++;
    if (!ex.tags || ex.tags.length === 0) emptyTags++;
    if (ex.min_players === null || ex.min_players === undefined) missingPlayers++;
    if (ex.carga_fisica === null || ex.carga_fisica === undefined) missingCarga++;
    if (ex.oposicion === null || ex.oposicion === undefined) missingOpo++;

    const t = ex.tipo || "NULL";
    rawTypes[t] = (rawTypes[t] || 0) + 1;
    const p = ex.game_phase || "NULL";
    rawPhases[p] = (rawPhases[p] || 0) + 1;
    const c = ex.age_category || "NULL";
    rawAgeCats[c] = (rawAgeCats[c] || 0) + 1;

    // Detectar posibles contradicciones entre título y metadatos
    const nameNorm = normalizeText(ex.nombre || "");
    const tacNorm = (ex.objetivo_tactico || []).map((t: string) => normalizeText(t)).join(" ");
    const phaseNorm = normalizeText(ex.game_phase || "");
    
    const issues: string[] = [];
    if (!ex.bloque_sesion) issues.push("bloque_sesion NULL");
    if (!ex.game_phase) issues.push("game_phase NULL");
    if (!ex.objetivo_tactico || ex.objetivo_tactico.length === 0) issues.push("objetivo_tactico vacío");
    if (nameNorm.includes("pressing") && phaseNorm.includes("build_up")) issues.push("Contradicción: título pressing vs fase build_up");
    if (nameNorm.includes("finalizaci") && !phaseNorm.includes("finishing") && phaseNorm) issues.push("Posible desalineación: título finalización vs fase " + ex.game_phase);
    if (nameNorm.includes("abp") && !phaseNorm.includes("set_pieces") && phaseNorm) issues.push("Posible desalineación: título ABP vs fase " + ex.game_phase);

    if (issues.length > 0) {
      qualityIssues.push({
        id: ex.id,
        nombre: ex.nombre,
        tipo: ex.tipo,
        bloque: ex.bloque_sesion,
        fase: ex.game_phase,
        issues: issues.join(" | ")
      });
    }
  });

  console.log(`- bloque_sesion NULL: ${nullBloque} / 86`);
  console.log(`- game_phase NULL: ${nullGamePhase} / 86`);
  console.log(`- principle_id NULL: ${nullPrincipleId} / 86`);
  console.log(`- subprinciple_id NULL: ${nullSubprincipleId} / 86`);
  console.log(`- objetivo_tactico vacío: ${emptyTacObj} / 86`);
  console.log(`- objetivo_tecnico vacío: ${emptyTecObj} / 86`);
  console.log(`- tags vacío: ${emptyTags} / 86`);
  console.log(`- min_players NULL: ${missingPlayers} / 86`);
  console.log(`- carga_fisica NULL: ${missingCarga} / 86`);
  console.log(`- oposicion NULL: ${missingOpo} / 86\n`);

  console.log("Distribución de tipos en los 86 nuevos:");
  console.table(rawTypes);

  console.log("\nDistribución de fases de juego en los 86 nuevos:");
  console.table(rawPhases);

  console.log("\nDistribución de categorías de edad en los 86 nuevos:");
  console.table(rawAgeCats);

  // ==========================================
  // FASE 3, 4, 5 & 6: NORMALIZACIÓN, COBERTURA, BARRERA Y CLASIFICACIÓN
  // ==========================================
  console.log("\n--- FASE 3, 4, 5 & 6: EVALUACIÓN DE SELECCIONABILIDAD Y CLASIFICACIÓN DE LOS 86 ---");

  const targetIntents = [
    { key: "circulacion", label: "Circulación de balón" },
    { key: "posesion", label: "Posesión" },
    { key: "amplitud", label: "Amplitud" },
    { key: "progresion", label: "Progresión" },
    { key: "salida_de_balon", label: "Salida de balón" },
    { key: "presion_alta", label: "Presión alta" },
    { key: "organizacion_defensiva", label: "Organización defensiva" },
    { key: "defensa", label: "Defensa" },
    { key: "presion_tras_perdida", label: "Presión tras pérdida" },
    { key: "transicion_defensiva", label: "Transición defensiva" },
    { key: "contraataque", label: "Contraataque" },
    { key: "transicion_ofensiva", label: "Transición ofensiva" },
    { key: "finalizacion", label: "Finalización" },
    { key: "balon_parado", label: "Balón parado" },
    { key: "vuelta_calma", label: "Vuelta a la calma" }
  ];

  // Clasificación individual de los 86
  const classificationA: any[] = []; // Integrable directamente
  const classificationB: any[] = []; // Integrable tras corrección de metadatos
  const classificationC: any[] = []; // Ambiguo / requiere revisión
  const classificationD: any[] = []; // No apto para generación metodológica

  new86.forEach(ex => {
    const hasCompleteData = Boolean(
      ex.nombre &&
      ex.tipo &&
      ex.objetivo_tactico && ex.objetivo_tactico.length > 0 &&
      ex.carga_fisica &&
      ex.oposicion &&
      ex.min_players
    );

    // Evaluar si es seleccionable para al menos un bloque con algún objetivo
    let canBeSelectedForAny = false;
    let bestBlock = "";
    let matchedIntent = "";

    for (const intent of targetIntents) {
      if (intent.key === "vuelta_calma") {
        const sCalm = scoreExercise(ex, { category: ex.age_category || "cadete", objective: intent.label, targetBlock: "vuelta_calma", numPlayers: 14, durationMinutes: 10, microcycleDay: "MD-3", intensityLoad: 3 });
        if (isExerciseSelectableForBlock(sCalm)) {
          canBeSelectedForAny = true;
          bestBlock = "vuelta_calma";
          matchedIntent = intent.label;
          break;
        }
      } else {
        const sP1 = scoreExercise(ex, { category: ex.age_category || "cadete", objective: intent.label, targetBlock: "principal_1", numPlayers: 14, durationMinutes: 20, microcycleDay: "MD-3", intensityLoad: 3 });
        const sP2 = scoreExercise(ex, { category: ex.age_category || "cadete", objective: intent.label, targetBlock: "principal_2", numPlayers: 14, durationMinutes: 25, microcycleDay: "MD-3", intensityLoad: 3 });
        const sGl = scoreExercise(ex, { category: ex.age_category || "cadete", objective: intent.label, targetBlock: "global", numPlayers: 14, durationMinutes: 20, microcycleDay: "MD-3", intensityLoad: 3 });
        const sAct = scoreExercise(ex, { category: ex.age_category || "cadete", objective: intent.label, targetBlock: "activacion", numPlayers: 14, durationMinutes: 15, microcycleDay: "MD-3", intensityLoad: 3 });

        if (isExerciseSelectableForBlock(sP1) || isExerciseSelectableForBlock(sP2) || isExerciseSelectableForBlock(sGl) || isExerciseSelectableForBlock(sAct)) {
          canBeSelectedForAny = true;
          bestBlock = isExerciseSelectableForBlock(sP1) ? "P1" : isExerciseSelectableForBlock(sP2) ? "P2" : isExerciseSelectableForBlock(sGl) ? "Global" : "Activacion";
          matchedIntent = intent.label;
          break;
        }
      }
    }

    const hasTacMatch = targetIntents.some(intent => {
      const pure = evaluatePureTacticalAffinity(ex, { name: intent.label, game_phase: intent.label });
      return pure && pure.hasMeaningfulAffinity;
    });

    if (canBeSelectedForAny && hasCompleteData && ex.bloque_sesion) {
      classificationA.push({
        id: ex.id,
        nombre: ex.nombre,
        categoria: ex.age_category,
        tipo: ex.tipo,
        bloque: ex.bloque_sesion,
        objetivo_detectado: matchedIntent,
        bloque_apto: bestBlock
      });
    } else if (hasTacMatch || canBeSelectedForAny) {
      classificationB.push({
        id: ex.id,
        nombre: ex.nombre,
        categoria: ex.age_category,
        tipo: ex.tipo,
        bloque_actual: ex.bloque_sesion || "NULL",
        bloque_recomendado: inferDrillBlock(ex).recommendedBlock,
        objetivo_detectado: matchedIntent,
        bloque_apto: bestBlock,
        motivo_correccion: !ex.bloque_sesion ? "Falta bloque_sesion" : !ex.game_phase ? "Falta game_phase" : "Metadatos incompletos"
      });
    } else if (ex.nombre && ex.descripcion) {
      classificationC.push({
        id: ex.id,
        nombre: ex.nombre,
        tipo: ex.tipo,
        motivo: "Sin afinidad táctica clara con los principios canónicos; requiere revisión pedagógica"
      });
    } else {
      classificationD.push({
        id: ex.id,
        nombre: ex.nombre,
        motivo: "Incompleto o no apto"
      });
    }
  });

  console.log(`- Grupo A (Integrable directamente): ${classificationA.length}`);
  console.log(`- Grupo B (Integrable tras corrección metadatos): ${classificationB.length}`);
  console.log(`- Grupo C (Ambiguo / requiere revisión): ${classificationC.length}`);
  console.log(`- Grupo D (No apto para generación): ${classificationD.length}\n`);

  // ==========================================
  // FASE 7: MATRIZ DE IMPACTO (199 vs 199 + 86 VÁLIDOS)
  // ==========================================
  console.log("--- FASE 7: IMPACTO EN COBERTURA POR OBJETIVO Y BLOQUE ---");

  const impactTable: any[] = [];
  const valid86Set = new Set([...classificationA.map(e => e.id), ...classificationB.map(e => e.id)]);

  for (const intent of targetIntents) {
    // 1. Con los 199 originales
    let origTotal = 0, origAct = 0, origP1 = 0, origP2 = 0, origGl = 0, origCalm = 0;
    original199.forEach(ex => {
      const pure = evaluatePureTacticalAffinity(ex, { name: intent.label, game_phase: intent.label });
      const sAct = scoreExercise(ex, { category: ex.age_category || "cadete", objective: intent.label, targetBlock: "activacion", numPlayers: 14, durationMinutes: 15, microcycleDay: "MD-3", intensityLoad: 3 });
      const sP1 = scoreExercise(ex, { category: ex.age_category || "cadete", objective: intent.label, targetBlock: "principal_1", numPlayers: 14, durationMinutes: 20, microcycleDay: "MD-3", intensityLoad: 3 });
      const sP2 = scoreExercise(ex, { category: ex.age_category || "cadete", objective: intent.label, targetBlock: "principal_2", numPlayers: 14, durationMinutes: 25, microcycleDay: "MD-3", intensityLoad: 3 });
      const sGl = scoreExercise(ex, { category: ex.age_category || "cadete", objective: intent.label, targetBlock: "global", numPlayers: 14, durationMinutes: 20, microcycleDay: "MD-3", intensityLoad: 3 });
      const sCa = scoreExercise(ex, { category: ex.age_category || "cadete", objective: intent.label, targetBlock: "vuelta_calma", numPlayers: 14, durationMinutes: 10, microcycleDay: "MD-3", intensityLoad: 3 });

      if (pure && pure.hasMeaningfulAffinity) origTotal++;
      if (isExerciseSelectableForBlock(sAct)) origAct++;
      if (isExerciseSelectableForBlock(sP1)) origP1++;
      if (isExerciseSelectableForBlock(sP2)) origP2++;
      if (isExerciseSelectableForBlock(sGl)) origGl++;
      if (isExerciseSelectableForBlock(sCa)) origCalm++;
    });

    // 2. Con los 86 nuevos (solo los seleccionables)
    let newTotal = 0, newAct = 0, newP1 = 0, newP2 = 0, newGl = 0, newCalm = 0;
    new86.forEach(ex => {
      const pure = evaluatePureTacticalAffinity(ex, { name: intent.label, game_phase: intent.label });
      const sAct = scoreExercise(ex, { category: ex.age_category || "cadete", objective: intent.label, targetBlock: "activacion", numPlayers: 14, durationMinutes: 15, microcycleDay: "MD-3", intensityLoad: 3 });
      const sP1 = scoreExercise(ex, { category: ex.age_category || "cadete", objective: intent.label, targetBlock: "principal_1", numPlayers: 14, durationMinutes: 20, microcycleDay: "MD-3", intensityLoad: 3 });
      const sP2 = scoreExercise(ex, { category: ex.age_category || "cadete", objective: intent.label, targetBlock: "principal_2", numPlayers: 14, durationMinutes: 25, microcycleDay: "MD-3", intensityLoad: 3 });
      const sGl = scoreExercise(ex, { category: ex.age_category || "cadete", objective: intent.label, targetBlock: "global", numPlayers: 14, durationMinutes: 20, microcycleDay: "MD-3", intensityLoad: 3 });
      const sCa = scoreExercise(ex, { category: ex.age_category || "cadete", objective: intent.label, targetBlock: "vuelta_calma", numPlayers: 14, durationMinutes: 10, microcycleDay: "MD-3", intensityLoad: 3 });

      if (pure && pure.hasMeaningfulAffinity) newTotal++;
      if (isExerciseSelectableForBlock(sAct)) newAct++;
      if (isExerciseSelectableForBlock(sP1)) newP1++;
      if (isExerciseSelectableForBlock(sP2)) newP2++;
      if (isExerciseSelectableForBlock(sGl)) newGl++;
      if (isExerciseSelectableForBlock(sCa)) newCalm++;
    });

    impactTable.push({
      Objetivo: intent.label,
      "199 Orig": origTotal,
      "86 Nuevos": newTotal,
      "Total Comb": origTotal + newTotal,
      "P1 Comb": origP1 + newP1,
      "P2 Comb": origP2 + newP2,
      "Glob Comb": origGl + newGl,
      "Act Comb": origAct + newAct,
      "Calm Comb": origCalm + newCalm
    });
  }

  console.table(impactTable);
}

run86Audit();
