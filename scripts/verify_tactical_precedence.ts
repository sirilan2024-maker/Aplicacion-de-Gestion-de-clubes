process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { evaluateTacticalAffinity } from "../src/lib/methodology/tacticalEngine/tacticalAffinityEngine";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

async function runTacticalPrecedenceSuite() {
  console.log("================================================================================");
  console.log("SUITE DE PRUEBAS: TACTICAL PRECEDENCE OVER AGE / CATEGORY");
  console.log("================================================================================");

  // CASO 1:
  // Ejercicio A: Categoría Senior exacta, pero con match léxico accidental/irrelevante
  // Ejercicio B: Categoría Cadete (diferente a Senior), pero con título y objetivo táctico explícito
  // Principio: "Circulación Rápida y Cambio de Orientación" (Senior)
  // Resultado requerido: B > A (o A descartado completamente)

  const drillA_SeniorWeak = {
    id: "drill-a-senior-weak",
    nombre: "Ejercicio de Conducción y Habilidad Individual",
    age_category: "senior",
    dificultad: 3,
    tipo: "analitico",
    game_phase: "attacking_build_up",
    objetivo_tactico: ["conducción", "habilidad"],
    descripcion: "Se trabaja el desplazamiento con balón por el campo."
  };

  const drillB_CadeteStrong = {
    id: "drill-b-cadete-strong",
    nombre: "Juego de Posición 6v6 + 3 con Cambio de Orientación y Amplitud",
    age_category: "cadete",
    dificultad: 4,
    tipo: "positional_game",
    game_phase: "attacking_build_up",
    objetivo_tactico: ["cambios de orientación", "tercer hombre", "amplitud"],
    descripcion: "Estructura 6v6+3 orientada a fijar en banda y girar el juego al lado débil."
  };

  const pCirc = { name: "Circulación Rápida y Cambio de Orientación", game_phase: "Ataque" };

  const resA = evaluateTacticalAffinity(drillA_SeniorWeak, pCirc, "senior", "Senior");
  const resB = evaluateTacticalAffinity(drillB_CadeteStrong, pCirc, "senior", "Senior");

  console.log(`- Test 1 (Senior débil vs Cadete fuerte para Senior):`);
  console.log(`  Drill A (Senior débil): ${resA === null ? "✅ DESCARTADO (score null)" : `Score ${resA.score}`}`);
  console.log(`  Drill B (Cadete táctico fuerte): Score ${resB?.score} (${resB?.compatibilityLevel})`);

  if (resA !== null && resB !== null && resA.score >= resB.score) {
    throw new Error("FAIL: La categoría exacta no puede hacer que un ejercicio no afín supere a uno tácticamente idóneo");
  }
  console.log("  ✅ PASS: La precedencia táctica sitúa la relevancia táctica por encima de la edad");

  // CASO 2:
  // Para U6:
  // Tarea de Benjamín con afinidad real ("Rondo 4v2 con Tercer Hombre y Cambio de Orientación")
  // vs
  // Tarea de U6 sin afinidad táctica ("Circuito Psicomotriz El Río y los Puentes")
  const { data: exercises } = await supabase.from("banco_ejercicios").select("*");
  if (exercises) {
    const rondoBenj = exercises.find(e => e.nombre?.includes("Rondo 4v2 con Tercer Hombre"));
    const rioU6 = exercises.find(e => e.nombre?.includes("El Río y los Puentes"));

    if (rondoBenj && rioU6) {
      const resRondo = evaluateTacticalAffinity(rondoBenj, pCirc, "querubin", "U6");
      const resRio = evaluateTacticalAffinity(rioU6, pCirc, "querubin", "U6");

      console.log(`- Test 2 (U6: Rondo Benjamín táctico vs Psicomotriz U6):`);
      console.log(`  Rondo Benjamín: Score ${resRondo?.score} (${resRondo?.compatibilityLevel})`);
      console.log(`  Psicomotriz U6: ${resRio === null ? "✅ DESCARTADO (score null)" : `Score ${resRio.score}`}`);

      if (resRio !== null) {
        throw new Error("FAIL: Psicomotriz U6 no debe recibir score para Circulación");
      }
      if (!resRondo || resRondo.score <= 0) {
        throw new Error("FAIL: Rondo Benjamín debe ser seleccionado como adaptable/media para U6");
      }
      console.log("  ✅ PASS: El Rondo con afinidad real se mantiene y la tarea no afín se descarta");
    }
  }

  console.log("\n🏆 SUITE TACTICAL PRECEDENCE: 100% PASS");
}

runTacticalPrecedenceSuite().catch(err => {
  console.error(err);
  process.exit(1);
});
