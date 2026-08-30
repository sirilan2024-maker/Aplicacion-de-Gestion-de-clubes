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

async function runSemanticAffinitySuite() {
  console.log("================================================================================");
  console.log("SUITE DE PRUEBAS: SEMANTIC AFFINITY & POLYSEMY DISAMBIGUATION");
  console.log("================================================================================");

  // 1. Mantenimiento físico (HIIT) vs Mantenimiento de posesión
  const drillHiit = {
    id: "hiit-test",
    nombre: "Circuito de Mantenimiento Físico-Táctico de Alta Intensidad (HIIT)",
    age_category: "senior",
    dificultad: 4,
    tipo: "fisico",
    game_phase: "attacking_build_up",
    objetivo_tactico: ["mantenimiento", "resistencia"],
    descripcion: "Circuito físico de mantenimiento cardiovascular."
  };
  const resHiit = evaluateTacticalAffinity(drillHiit, { name: "Circulación Rápida y Cambio de Orientación", game_phase: "Ataque" }, "senior", "Senior");
  console.log(`- Test 1 (Mantenimiento físico vs Mantenimiento posesión):`);
  console.log(`  Resultado HIIT en Circulación: ${resHiit === null ? "✅ DESCARTADO (score null)" : `❌ ERROR: Score ${resHiit.score}`}`);
  if (resHiit !== null) throw new Error("Mantenimiento físico (HIIT) no fue descartado");

  // 2. Orientación espacial (Psicomotricidad U6) vs Cambio de orientación
  const drillPsico = {
    id: "psico-test",
    nombre: "Circuito Psicomotriz 'El Río y los Puentes'",
    age_category: "querubin",
    dificultad: 1,
    tipo: "circuito",
    game_phase: "motor_coordination",
    objetivo_tactico: ["orientación espacial", "equilibrio"],
    descripcion: "Saltos de aros y conos para trabajar la orientación."
  };
  const resPsico = evaluateTacticalAffinity(drillPsico, { name: "Circulación Rápida y Cambio de Orientación", game_phase: "Ataque" }, "querubin", "U6");
  console.log(`- Test 2 (Orientación espacial psicomotriz vs Cambio de orientación):`);
  console.log(`  Resultado Psicomotriz en Circulación: ${resPsico === null ? "✅ DESCARTADO (score null)" : `❌ ERROR: Score ${resPsico.score}`}`);
  if (resPsico !== null) throw new Error("Orientación espacial psicomotriz no fue descartada");

  // 3. Juego lúdico Caza-Tesoros vs Circulación
  const drillCaza = {
    id: "caza-test",
    nombre: "Los Caza-Tesoros en la Jungla",
    age_category: "querubin",
    dificultad: 1,
    tipo: "ludico",
    game_phase: "motor_coordination",
    objetivo_tactico: ["orientación y búsqueda"],
    descripcion: "Juego lúdico de atrapar petos."
  };
  const resCaza = evaluateTacticalAffinity(drillCaza, { name: "Circulación Rápida y Cambio de Orientación", game_phase: "Ataque" }, "querubin", "U6");
  console.log(`- Test 3 (Juego lúdico infantil vs Circulación Rápida):`);
  console.log(`  Resultado Caza-Tesoros en Circulación: ${resCaza === null ? "✅ DESCARTADO (score null)" : `❌ ERROR: Score ${resCaza.score}`}`);
  if (resCaza !== null) throw new Error("Caza-Tesoros no fue descartado");

  // 4. Frase táctica compuesta auténtica vs Stem genérico aislado
  const drillRealOrientacion = {
    id: "real-orient-test",
    nombre: "Dinámica de cambios de orientación con amplitud",
    age_category: "senior",
    dificultad: 5,
    tipo: "positional_game",
    game_phase: "attacking_build_up",
    objetivo_tactico: ["cambios de orientación", "tercer hombre", "amplitud"],
    descripcion: "Juego de posición enfocado en bascular el balón de banda a banda."
  };
  const resRealOrient = evaluateTacticalAffinity(drillRealOrientacion, { name: "Circulación Rápida y Cambio de Orientación", game_phase: "Ataque" }, "senior", "Senior");
  console.log(`- Test 4 (Frase compuesta táctica auténtica): "${drillRealOrientacion.nombre}"`);
  console.log(`  Resultado: ${resRealOrient?.compatibilityLevel} (Score: ${resRealOrient?.score})`);
  if (!resRealOrient || resRealOrient.compatibilityLevel !== "ALTA") {
    throw new Error("Dinámica de cambios de orientación auténtica debe ser clasificada como ALTA");
  }
  console.log("  ✅ PASS: Reconocimiento semántico exacto otorga nivel ALTA");

  // 5. Presión Alta auténtica vs Pressing en contraataque
  const drillRealPresion = {
    id: "real-press-test",
    nombre: "Salida de Balón vs Presión Alta 11v11",
    age_category: "senior",
    dificultad: 5,
    tipo: "SSG",
    game_phase: "defending_high_press",
    objetivo_tactico: ["presión alta", "acoso al poseedor", "recuperación en campo rival"],
    descripcion: "Acoso intensivo del bloque adelantado sobre el inicio rival."
  };
  const resRealPres = evaluateTacticalAffinity(drillRealPresion, { name: "Presión Alta", game_phase: "Defensa" }, "senior", "Senior");
  console.log(`- Test 5 (Presión Alta auténtica 11v11): "${drillRealPresion.nombre}"`);
  console.log(`  Resultado: ${resRealPres?.compatibilityLevel} (Score: ${resRealPres?.score})`);
  if (!resRealPres || resRealPres.compatibilityLevel !== "ALTA") {
    throw new Error("Salida de Balón vs Presión Alta 11v11 auténtica debe ser clasificada como ALTA");
  }
  console.log("  ✅ PASS: Tarea de Presión Alta auténtica clasificada como ALTA");

  console.log("\n🏆 SUITE SEMANTIC AFFINITY: 100% PASS");
}

runSemanticAffinitySuite().catch(err => {
  console.error(err);
  process.exit(1);
});
