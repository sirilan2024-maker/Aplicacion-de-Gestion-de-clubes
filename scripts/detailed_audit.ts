process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import { evaluatePureTacticalAffinity, PRINCIPLE_TAXONOMY } from "../src/lib/methodology/tacticalEngine/tacticalAffinityEngine";
import { scoreExercise, isExerciseSelectableForBlock } from "../src/lib/methodology/recommendationEngine";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://bwhvszbspvmsfgrbepox.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY!);

async function detailedAudit() {
  const { data: exercises } = await supabase
    .from("banco_ejercicios")
    .select("*")
    .order("nombre");

  if (!exercises) return;

  const targetIntents = [
    { key: "presion_tras_perdida", label: "Presión tras pérdida" },
    { key: "transicion_defensiva", label: "Transición defensiva" },
    { key: "presion_alta", label: "Presión alta" },
    { key: "organizacion_defensiva", label: "Organización defensiva" },
    { key: "salida_de_balon", label: "Salida de balón" },
    { key: "progresion", label: "Progresión" },
    { key: "posesion_circulacion", label: "Posesión" },
    { key: "circulacion", label: "Circulación de balón" },
    { key: "transicion_ofensiva", label: "Transición ofensiva" },
    { key: "contraataque", label: "Contraataque" },
    { key: "finalizacion", label: "Finalización" },
    { key: "balon_parado", label: "Balón parado" },
    { key: "amplitud", label: "Amplitud" },
    { key: "duelos_1v1", label: "Duelos 1v1" },
    { key: "coordinacion", label: "Coordinación" }
  ];

  console.log("=== RESUMEN POR OBJETIVO TÁCTICO ===");
  const rows = [];
  for (const intent of targetIntents) {
    let strong = 0, comp = 0, act = 0, p1 = 0, p2 = 0, glob = 0, calm = 0;
    for (const ex of exercises) {
      const pure = evaluatePureTacticalAffinity(ex, { name: intent.label, game_phase: intent.label });
      if (pure && pure.hasMeaningfulAffinity) {
        if (pure.affinityType === "DIRECT") strong++;
        else if (pure.affinityType === "SECONDARY") comp++;
      }

      const sAct = scoreExercise(ex, { category: ex.age_category || "cadete", objective: intent.label, targetBlock: "activacion", numPlayers: 14, durationMinutes: 15, microcycleDay: "MD-3", intensityLoad: 3 });
      const sP1 = scoreExercise(ex, { category: ex.age_category || "cadete", objective: intent.label, targetBlock: "principal_1", numPlayers: 14, durationMinutes: 20, microcycleDay: "MD-3", intensityLoad: 3 });
      const sP2 = scoreExercise(ex, { category: ex.age_category || "cadete", objective: intent.label, targetBlock: "principal_2", numPlayers: 14, durationMinutes: 25, microcycleDay: "MD-3", intensityLoad: 3 });
      const sGl = scoreExercise(ex, { category: ex.age_category || "cadete", objective: intent.label, targetBlock: "global", numPlayers: 14, durationMinutes: 20, microcycleDay: "MD-3", intensityLoad: 3 });
      const sCa = scoreExercise(ex, { category: ex.age_category || "cadete", objective: intent.label, targetBlock: "vuelta_calma", numPlayers: 14, durationMinutes: 10, microcycleDay: "MD-3", intensityLoad: 3 });

      if (isExerciseSelectableForBlock(sAct)) act++;
      if (isExerciseSelectableForBlock(sP1)) p1++;
      if (isExerciseSelectableForBlock(sP2)) p2++;
      if (isExerciseSelectableForBlock(sGl)) glob++;
      if (isExerciseSelectableForBlock(sCa)) calm++;
    }
    rows.push({
      Objetivo: intent.label,
      Fuerte: strong,
      Secundario: comp,
      TotalTactico: strong + comp,
      Act: act,
      P1: p1,
      P2: p2,
      Glob: glob,
      Calm: calm,
      "P1+P2+Glob": p1 + p2 + glob
    });
  }
  console.table(rows);

  console.log("\n=== DISTRIBUCIÓN POR CATEGORÍA ===");
  const catDist: Record<string, number> = {};
  exercises.forEach(ex => {
    const cats = Array.isArray(ex.categoria_edad) ? ex.categoria_edad : [ex.age_category];
    cats.forEach((c: string) => { catDist[c] = (catDist[c] || 0) + 1; });
  });
  console.table(catDist);

  console.log("\n=== EJERCICIOS CON BLOQUE_SESION NULL O TIPO GENERICO ===");
  const noBlock = exercises.filter(ex => !ex.bloque_sesion);
  console.log(`Ejercicios con bloque_sesion NULL: ${noBlock.length}`);
  const noType = exercises.filter(ex => !ex.tipo || ex.tipo === "drill");
  console.log(`Ejercicios con tipo genérico o NULL: ${noType.length}`);
}

detailedAudit();
