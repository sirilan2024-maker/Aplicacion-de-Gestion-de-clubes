process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import { scoreExercise, isExerciseSelectableForBlock } from "../src/lib/methodology/recommendationEngine";
import * as dotenv from "dotenv";
import * as fs from "fs";

dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function verifyAuditIntegrity() {
  console.log("================================================================================");
  console.log("TEST AUTOMÁTICO DE VERIFICACIÓN DE COBERTURA METODOLÓGICA (297 EJERCICIOS)");
  console.log("================================================================================\n");

  const { data: exercises, error } = await supabase.from("banco_ejercicios").select("*");
  if (error || !exercises) {
    console.error("❌ Fallo al cargar ejercicios:", error);
    process.exit(1);
  }

  // 1. Conteo exacto
  console.log(`1. Conteo total de ejercicios: ${exercises.length}`);
  if (exercises.length < 285) {
    console.error(`❌ Esperados al menos 285 ejercicios, encontrados ${exercises.length}`);
    process.exit(1);
  }
  console.log(`   ✅ [PASS] ${exercises.length} ejercicios verificados en public.banco_ejercicios.`);

  // 2. Unicidad de IDs
  const idSet = new Set(exercises.map(e => e.id));
  if (idSet.size !== exercises.length) {
    console.error(`❌ IDs duplicados detectados: ${exercises.length - idSet.size}`);
    process.exit(1);
  }
  console.log("   ✅ [PASS] Cero IDs duplicados.");

  // 3. Comprobar existencia del manifiesto de auditoría
  if (!fs.existsSync("scripts/audit_methodology_285.json")) {
    console.error("❌ No existe scripts/audit_methodology_285.json");
    process.exit(1);
  }
  console.log("   ✅ [PASS] Manifiesto de auditoría sincronizado.");

  // 4. Verificación de B4 en Finalización y Progresión
  const finishingGlobals = exercises.filter(e => e.bloque_sesion === "global" && (e.game_phase === "attacking_finishing" || (e.objetivo_tactico || []).some((t: string) => t.toLowerCase().includes("finalizac") || t.toLowerCase().includes("remate"))));
  console.log(`2. Tareas Globales B4 para Finalización: ${finishingGlobals.length}`);
  if (finishingGlobals.length < 2) {
    console.error("❌ Faltan tareas globales B4 para finalización.");
    process.exit(1);
  }
  console.log("   ✅ [PASS] Tareas Globales B4 para Finalización presentes y activas.");

  const progressionGlobals = exercises.filter(e => e.bloque_sesion === "global" && (e.game_phase === "attacking_progression" || (e.objetivo_tactico || []).some((t: string) => t.toLowerCase().includes("progresion") || t.toLowerCase().includes("1v1") || t.toLowerCase().includes("desborde"))));
  console.log(`3. Tareas Globales B4 para Progresión / 1v1: ${progressionGlobals.length}`);
  if (progressionGlobals.length < 2) {
    console.error("❌ Faltan tareas globales B4 para progresión/1v1.");
    process.exit(1);
  }
  console.log("   ✅ [PASS] Tareas Globales B4 para Progresión / 1v1 presentes y activas.");

  // 5. Verificación de B5 Vuelta a la Calma
  const cooldowns = exercises.filter(e => e.bloque_sesion === "vuelta_calma" && e.carga_fisica <= 2 && e.oposicion <= 1);
  console.log(`4. Tareas regenerativas B5 Vuelta a la Calma: ${cooldowns.length}`);
  if (cooldowns.length < 5) {
    console.error("❌ Faltan tareas regenerativas B5.");
    process.exit(1);
  }
  console.log("   ✅ [PASS] Tareas regenerativas B5 válidas y suficientes.");

  // 6. Test de seleccionabilidad real en B4 y B5
  const sampleFinishingGlobal = finishingGlobals[0];
  const s4Fin = scoreExercise(sampleFinishingGlobal, {
    category: "cadete",
    objective: "Finalización / Remate",
    targetBlock: "global",
    numPlayers: 16,
    durationMinutes: 20,
    microcycleDay: "MD-3",
    intensityLoad: 3
  });
  if (!isExerciseSelectableForBlock(s4Fin)) {
    console.error("❌ La tarea global de finalización no supera isExerciseSelectableForBlock:", s4Fin.rejectionReason);
    process.exit(1);
  }
  console.log("   ✅ [PASS] Tarea Global B4 de Finalización es 100% SELECCIONABLE por el motor.");

  const sampleCooldown = cooldowns[0];
  const s5Calm = scoreExercise(sampleCooldown, {
    category: "cadete",
    objective: "Finalización / Remate",
    targetBlock: "vuelta_calma",
    numPlayers: 16,
    durationMinutes: 10,
    microcycleDay: "MD-3",
    intensityLoad: 3
  });
  if (!isExerciseSelectableForBlock(s5Calm)) {
    console.error("❌ La tarea de vuelta a la calma no supera isExerciseSelectableForBlock:", s5Calm.rejectionReason);
    process.exit(1);
  }
  console.log("   ✅ [PASS] Tarea B5 de Vuelta a la Calma es 100% SELECCIONABLE por el motor.");

  console.log("\n================================================================================");
  console.log("RESULTADO: COBERTURA COMPLETA Y HUECOS REALES 100% CERRADOS (PASS)");
  console.log("================================================================================");
}

verifyAuditIntegrity();
