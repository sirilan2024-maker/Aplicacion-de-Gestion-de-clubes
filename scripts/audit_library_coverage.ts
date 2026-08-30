process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import { evaluatePureTacticalAffinity, PRINCIPLE_TAXONOMY } from "../src/lib/methodology/tacticalEngine/tacticalAffinityEngine";
import { scoreExercise, isExerciseSelectableForBlock, RECOMMENDATION_WEIGHTS } from "../src/lib/methodology/recommendationEngine";
import { PedagogicalProgressionEngine } from "../src/lib/methodology/sessionGenerator/pedagogicalProgressionEngine";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://bwhvszbspvmsfgrbepox.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const progressionEngine = PedagogicalProgressionEngine.getInstance();

async function runCoverageAudit() {
  console.log("================================================================================");
  console.log("AUDITORÍA PROFUNDA DE COBERTURA METODOLÓGICA DE LA BIBLIOTECA (199 EJERCICIOS)");
  console.log("================================================================================\n");

  // FASE 1: INVENTARIO DE 199 EJERCICIOS
  const { data: exercises, error } = await supabase
    .from("banco_ejercicios")
    .select("*")
    .order("nombre");

  if (error || !exercises) {
    console.error("Error al cargar ejercicios:", error);
    process.exit(1);
  }

  console.log(`[FASE 1] Inventario cargado: ${exercises.length} ejercicios en public.banco_ejercicios\n`);

  // Resumen de distribución básica
  const byCategory: Record<string, number> = {};
  const byType: Record<string, number> = {};
  const byBlock: Record<string, number> = {};
  const byGamePhase: Record<string, number> = {};

  exercises.forEach(ex => {
    const cats = Array.isArray(ex.categoria_edad) ? ex.categoria_edad : [ex.age_category || "sin_categoria"];
    cats.forEach((c: string) => { byCategory[c] = (byCategory[c] || 0) + 1; });
    const t = ex.tipo || "sin_tipo";
    byType[t] = (byType[t] || 0) + 1;
    const b = ex.bloque_sesion || "sin_bloque";
    byBlock[b] = (byBlock[b] || 0) + 1;
    const gp = ex.game_phase || "sin_fase";
    byGamePhase[gp] = (byGamePhase[gp] || 0) + 1;
  });

  console.log("--- Distribución por Categoría de Edad ---");
  console.table(byCategory);
  console.log("--- Distribución por Tipo de Ejercicio ---");
  console.table(byType);
  console.log("--- Distribución por Bloque de Sesión Declarado ---");
  console.table(byBlock);

  // FASE 2: IDENTIFICAR LAS PETICIONES METODOLÓGICAS REALES
  // Taxonomía real usada en el sistema:
  const targetIntents = [
    // Principios principales del modelo táctico
    { key: "presion_tras_perdida", label: "Presión tras pérdida", principle: "transicion defensiva" },
    { key: "transicion_defensiva", label: "Transición defensiva / Repliegue", principle: "transicion defensiva" },
    { key: "presion_alta", label: "Presión alta / Bloque alto", principle: "presion alta" },
    { key: "organizacion_defensiva", label: "Organización defensiva / Basculación", principle: "basculacion" },
    { key: "salida_de_balon", label: "Salida de balón / Iniciación", principle: "salida de balon" },
    { key: "progresion", label: "Progresión / Superar líneas", principle: "progresion" },
    { key: "posesion_circulacion", label: "Posesión / Circulación de balón", principle: "circulacion" },
    { key: "transicion_ofensiva", label: "Transición ofensiva / Contraataque", principle: "transicion ofensiva" },
    { key: "finalizacion", label: "Finalización / Creación de ocasiones", principle: "finalizacion" },
    { key: "balon_parado", label: "Balón parado / ABP", principle: "balon parado" },
    { key: "amplitud_profundidad", label: "Amplitud y cambios de orientación", principle: "circulacion" },
    { key: "duelos_1v1", label: "Duelos 1v1 / Desborde", principle: "progresion" },
    { key: "coordinacion_psicomotriz", label: "Psicomotricidad / Coordinación (Formativo U6-U8)", principle: "circulacion" }
  ];

  console.log("\n================================================================================");
  console.log("[FASE 3 & 4] EVALUACIÓN DE COBERTURA SEMÁNTICA Y POR BLOQUE");
  console.log("================================================================================\n");

  const results: any[] = [];
  const mislabeledCandidates: any[] = [];

  for (const intent of targetIntents) {
    let strongCount = 0;
    let compatibleCount = 0;
    let doubtfulCount = 0;
    let notCompatibleCount = 0;

    let validActivacion = 0;
    let validP1 = 0;
    let validP2 = 0;
    let validGlobal = 0;
    let validCooldown = 0;

    const strongDrills: string[] = [];
    const compatibleDrills: string[] = [];

    for (const ex of exercises) {
      // 1. Evaluación táctica pura
      const pureEval = evaluatePureTacticalAffinity(ex, {
        name: intent.label,
        game_phase: intent.label
      });

      const isPureDirect = pureEval && pureEval.hasMeaningfulAffinity && pureEval.affinityType === "DIRECT";
      const isPureSecondary = pureEval && pureEval.hasMeaningfulAffinity && pureEval.affinityType === "SECONDARY";

      // 2. Evaluaciones por bloque usando el recommendationEngine & PedagogicalProgressionEngine
      const scoreAct = scoreExercise(ex, {
        category: ex.age_category || "cadete",
        objective: intent.label,
        targetBlock: "activacion",
        numPlayers: 14,
        durationMinutes: 15,
        microcycleDay: "MD-3",
        intensityLoad: 3
      });

      const scoreP1 = scoreExercise(ex, {
        category: ex.age_category || "cadete",
        objective: intent.label,
        targetBlock: "principal_1",
        numPlayers: 14,
        durationMinutes: 20,
        microcycleDay: "MD-3",
        intensityLoad: 3
      });

      const scoreP2 = scoreExercise(ex, {
        category: ex.age_category || "cadete",
        objective: intent.label,
        targetBlock: "principal_2",
        numPlayers: 14,
        durationMinutes: 25,
        microcycleDay: "MD-3",
        intensityLoad: 3
      });

      const scoreGlob = scoreExercise(ex, {
        category: ex.age_category || "cadete",
        objective: intent.label,
        targetBlock: "global",
        numPlayers: 14,
        durationMinutes: 20,
        microcycleDay: "MD-3",
        intensityLoad: 3
      });

      const scoreCalm = scoreExercise(ex, {
        category: ex.age_category || "cadete",
        objective: intent.label,
        targetBlock: "vuelta_calma",
        numPlayers: 14,
        durationMinutes: 10,
        microcycleDay: "MD-3",
        intensityLoad: 3
      });

      const isSelectableAct = isExerciseSelectableForBlock(scoreAct);
      const isSelectableP1 = isExerciseSelectableForBlock(scoreP1);
      const isSelectableP2 = isExerciseSelectableForBlock(scoreP2);
      const isSelectableGlob = isExerciseSelectableForBlock(scoreGlob);
      const isSelectableCalm = isExerciseSelectableForBlock(scoreCalm);

      if (isSelectableAct) validActivacion++;
      if (isSelectableP1) validP1++;
      if (isSelectableP2) validP2++;
      if (isSelectableGlob) validGlobal++;
      if (isSelectableCalm) validCooldown++;

      if (isPureDirect) {
        strongCount++;
        strongDrills.push(ex.nombre);
      } else if (isPureSecondary) {
        compatibleCount++;
        compatibleDrills.push(ex.nombre);
      } else if (isSelectableAct || isSelectableP1 || isSelectableP2 || isSelectableGlob || isSelectableCalm) {
        doubtfulCount++;
      } else {
        notCompatibleCount++;
      }

      // FASE 6: Detección de posibles problemas de metadatos (nombre/descripción sugiere el concepto pero tags/objetivo_tactico no lo tienen)
      const text = `${ex.nombre} ${ex.descripcion || ""} ${(ex.variantes || []).join(" ")}`.toLowerCase();
      const intentKeyword = intent.label.toLowerCase().split("/")[0].trim();
      const hasTextMention = text.includes(intentKeyword) || (intent.key === "presion_tras_perdida" && text.includes("tras pérdida"));
      if (hasTextMention && !isPureDirect && !isPureSecondary) {
        mislabeledCandidates.push({
          exerciseId: ex.id,
          exerciseName: ex.nombre,
          intentWanted: intent.label,
          currentTacticalObj: ex.objetivo_tactico,
          currentTags: ex.tags,
          currentType: ex.tipo,
          currentBlock: ex.bloque_sesion,
          textSample: ex.descripcion?.slice(0, 80)
        });
      }
    }

    results.push({
      Objetivo: intent.label,
      "Fuerte (Direct)": strongCount,
      "Compatible (Sec)": compatibleCount,
      "Dudoso": doubtfulCount,
      "Total Compat": strongCount + compatibleCount,
      "Act": validActivacion,
      "P1": validP1,
      "P2": validP2,
      "Glob": validGlobal,
      "Calm": validCooldown,
      "Cobertura P1+P2+Glob": validP1 + validP2 + validGlobal
    });
  }

  console.table(results);

  // FASE 5: CRUCE CON RESTRICCIONES (Categorías x Objetivos)
  console.log("\n================================================================================");
  console.log("[FASE 5] MATRIZ DE CRUCE: CATEGORÍAS DE EDAD VS OBJETIVOS EN FASES PRINCIPALES");
  console.log("================================================================================\n");

  const categories = ["querubin", "prebenjamin", "benjamin", "alevin", "infantil", "cadete", "juvenil", "senior"];
  const ageMatrix: any[] = [];

  for (const cat of categories) {
    const row: Record<string, any> = { Categoria: cat };
    for (const intent of targetIntents.slice(0, 8)) {
      const available = exercises.filter(ex => {
        const exCats = Array.isArray(ex.categoria_edad) ? ex.categoria_edad : [ex.age_category];
        const catMatch = exCats.includes(cat) || ex.age_category === cat;
        if (!catMatch) return false;

        const scoreP1 = scoreExercise(ex, {
          category: cat,
          objective: intent.label,
          targetBlock: "principal_1",
          numPlayers: 14,
          durationMinutes: 20,
          microcycleDay: "MD-3",
          intensityLoad: 3
        });
        const scoreP2 = scoreExercise(ex, {
          category: cat,
          objective: intent.label,
          targetBlock: "principal_2",
          numPlayers: 14,
          durationMinutes: 25,
          microcycleDay: "MD-3",
          intensityLoad: 3
        });
        const scoreGlob = scoreExercise(ex, {
          category: cat,
          objective: intent.label,
          targetBlock: "global",
          numPlayers: 14,
          durationMinutes: 20,
          microcycleDay: "MD-3",
          intensityLoad: 3
        });

        return isExerciseSelectableForBlock(scoreP1) || isExerciseSelectableForBlock(scoreP2) || isExerciseSelectableForBlock(scoreGlob);
      });

      row[intent.label.split("/")[0].trim()] = available.length;
    }
    ageMatrix.push(row);
  }

  console.table(ageMatrix);

  // FASE 6: REPORTE DE DISCREPANCIAS DE METADATOS
  console.log("\n================================================================================");
  console.log("[FASE 6] EJERCICIOS CON POSIBLE DESALINEACIÓN DE METADATOS");
  console.log("================================================================================\n");
  console.log(`Detectados ${mislabeledCandidates.length} posibles casos donde el texto describe un objetivo pero sus metadatos no lo reflejan.`);
  console.table(mislabeledCandidates.slice(0, 15));
}

runCoverageAudit().catch(err => {
  console.error("Error en auditoría:", err);
  process.exit(1);
});
