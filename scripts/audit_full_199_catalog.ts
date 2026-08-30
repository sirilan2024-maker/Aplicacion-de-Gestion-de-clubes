process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { evaluateTacticalAffinity, PRINCIPLE_TAXONOMY } from "../src/lib/methodology/tacticalEngine/tacticalAffinityEngine";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

async function audit199Catalog() {
  console.log("================================================================================");
  console.log("AUDITORÍA INTEGRAL DEL CATÁLOGO OFICIAL DE 199 EJERCICIOS");
  console.log("================================================================================");

  const { data: exercises, count } = await supabase.from("banco_ejercicios").select("*", { count: "exact" });
  const { data: curricula } = await supabase.from("methodology_curriculum").select("*");

  console.log(`- Conteo en base de datos: ${exercises?.length} (esperado: 199)`);
  if (exercises?.length !== 199) {
    throw new Error(`Inconsistencia en el conteo de banco_ejercicios: ${exercises?.length} != 199`);
  }

  const getCurriculumPriorities = (code: string) => {
    const c = curricula?.find(curr => curr.category_code === code);
    return c?.priority_families || [];
  };

  const principlesToAudit = [
    { name: "Circulación Rápida y Cambio de Orientación", phase: "Ataque", code: "circulacion" },
    { name: "Basculación y Compactación de Bloque", phase: "Defensa", code: "basculacion" },
    { name: "Presión Alta", phase: "Defensa", code: "presion alta" },
    { name: "Salida de Balón", phase: "Ataque", code: "salida de balon" }
  ];

  // 1. Auditoría de los 4 Rankings Principales Requeridos
  console.log("\n================================================================================");
  console.log("1. RANKING A: U6 -> Ataque Organizado -> Circulación Rápida y Cambio de Orientación");
  console.log("================================================================================");
  const pCirc = { name: "Circulación Rápida y Cambio de Orientación", game_phase: "Ataque" };
  const resA = exercises!
    .map(e => evaluateTacticalAffinity(e, pCirc, "querubin", "U6", getCurriculumPriorities("U6")))
    .filter(Boolean)
    .sort((a, b) => b!.score - a!.score);

  console.log(`Total compatibles: ${resA.length}`);
  console.log("| # | Ejercicio | Cat. Orig. | Dif | Af. Dir | Af. Sec | Score Tác | Score Cat | Score Dif | Score Met | Score Fin | Nivel |");
  console.log("|---|---|---|---|---|---|---|---|---|---|---|---|");
  resA.slice(0, 10).forEach((r, i) => {
    const exp = r!.explicability;
    console.log(`| ${i+1} | "${r!.exercise.nombre}" | ${r!.exercise.age_category || 'N/A'} | ${r!.exercise.dificultad} | ${exp.affinity === 'DIRECT' ? 'SÍ' : 'NO'} | ${exp.affinity === 'SECONDARY' ? 'SÍ' : 'NO'} | ${exp.tacticalScore} | ${exp.categoryScore} | ${exp.difficultyScore} | ${exp.methodologyScore} | ${r!.score} | ${r!.compatibilityLevel} |`);
  });

  console.log("\n================================================================================");
  console.log("2. RANKING B: Senior -> Ataque Organizado -> Circulación Rápida y Cambio de Orientación");
  console.log("================================================================================");
  const resB = exercises!
    .map(e => evaluateTacticalAffinity(e, pCirc, "senior", "Senior", getCurriculumPriorities("Senior")))
    .filter(Boolean)
    .sort((a, b) => b!.score - a!.score);

  console.log(`Total compatibles: ${resB.length}`);
  console.log("| # | Ejercicio | Cat. Orig. | Dif | Af. Dir | Af. Sec | Score Tác | Score Cat | Score Dif | Score Met | Score Fin | Nivel |");
  console.log("|---|---|---|---|---|---|---|---|---|---|---|---|");
  resB.slice(0, 10).forEach((r, i) => {
    const exp = r!.explicability;
    console.log(`| ${i+1} | "${r!.exercise.nombre}" | ${r!.exercise.age_category || 'N/A'} | ${r!.exercise.dificultad} | ${exp.affinity === 'DIRECT' ? 'SÍ' : 'NO'} | ${exp.affinity === 'SECONDARY' ? 'SÍ' : 'NO'} | ${exp.tacticalScore} | ${exp.categoryScore} | ${exp.difficultyScore} | ${exp.methodologyScore} | ${r!.score} | ${r!.compatibilityLevel} |`);
  });

  console.log("\n================================================================================");
  console.log("3. RANKING C: U6 -> Defensa Organizada -> Basculación y Compactación de Bloque");
  console.log("================================================================================");
  const pBasc = { name: "Basculación y Compactación de Bloque", game_phase: "Defensa" };
  const resC = exercises!
    .map(e => evaluateTacticalAffinity(e, pBasc, "querubin", "U6", getCurriculumPriorities("U6")))
    .filter(Boolean)
    .sort((a, b) => b!.score - a!.score);

  console.log(`Total compatibles: ${resC.length}`);
  console.log("| # | Ejercicio | Cat. Orig. | Dif | Af. Dir | Af. Sec | Score Tác | Score Cat | Score Dif | Score Met | Score Fin | Nivel |");
  console.log("|---|---|---|---|---|---|---|---|---|---|---|---|");
  resC.slice(0, 10).forEach((r, i) => {
    const exp = r!.explicability;
    console.log(`| ${i+1} | "${r!.exercise.nombre}" | ${r!.exercise.age_category || 'N/A'} | ${r!.exercise.dificultad} | ${exp.affinity === 'DIRECT' ? 'SÍ' : 'NO'} | ${exp.affinity === 'SECONDARY' ? 'SÍ' : 'NO'} | ${exp.tacticalScore} | ${exp.categoryScore} | ${exp.difficultyScore} | ${exp.methodologyScore} | ${r!.score} | ${r!.compatibilityLevel} |`);
  });

  console.log("\n================================================================================");
  console.log("4. RANKING D: Senior -> Defensa Organizada -> Presión Alta");
  console.log("================================================================================");
  const pPres = { name: "Presión Alta", game_phase: "Defensa" };
  const resD = exercises!
    .map(e => evaluateTacticalAffinity(e, pPres, "senior", "Senior", getCurriculumPriorities("Senior")))
    .filter(Boolean)
    .sort((a, b) => b!.score - a!.score);

  console.log(`Total compatibles: ${resD.length}`);
  console.log("| # | Ejercicio | Cat. Orig. | Dif | Af. Dir | Af. Sec | Score Tác | Score Cat | Score Dif | Score Met | Score Fin | Nivel |");
  console.log("|---|---|---|---|---|---|---|---|---|---|---|---|");
  resD.slice(0, 10).forEach((r, i) => {
    const exp = r!.explicability;
    console.log(`| ${i+1} | "${r!.exercise.nombre}" | ${r!.exercise.age_category || 'N/A'} | ${r!.exercise.dificultad} | ${exp.affinity === 'DIRECT' ? 'SÍ' : 'NO'} | ${exp.affinity === 'SECONDARY' ? 'SÍ' : 'NO'} | ${exp.tacticalScore} | ${exp.categoryScore} | ${exp.difficultyScore} | ${exp.methodologyScore} | ${r!.score} | ${r!.compatibilityLevel} |`);
  });

  // 2. Comprobación de Falsos Positivos Negativos Explícitos
  console.log("\n================================================================================");
  console.log("5. AUDITORÍA DE FALSOS POSITIVOS NEGATIVOS ESPECÍFICOS:");
  console.log("================================================================================");

  // A: Circuito HIIT
  const hiitDrill = exercises!.find(e => e.nombre?.toLowerCase().includes("hiit") || e.nombre?.toLowerCase().includes("mantenimiento fisico"));
  if (hiitDrill) {
    const hiitRes = evaluateTacticalAffinity(hiitDrill, pCirc, "senior", "Senior");
    console.log(`- HIIT en Circulación: ${hiitRes === null ? "✅ DESCARTADO (score null)" : `❌ ERROR: Score ${hiitRes.score}`}`);
    if (hiitRes !== null) throw new Error("HIIT no fue descartado");
  } else {
    console.log("- HIIT en Circulación: ✅ No existe falso positivo");
  }

  // B: Río y los Puentes
  const rioDrill = exercises!.find(e => e.nombre?.includes("El Río y los Puentes"));
  if (rioDrill) {
    const rioRes = evaluateTacticalAffinity(rioDrill, pCirc, "querubin", "U6");
    console.log(`- Río y los Puentes en Circulación: ${rioRes === null ? "✅ DESCARTADO (score null)" : `❌ ERROR: Score ${rioRes.score}`}`);
    if (rioRes !== null) throw new Error("Río y los Puentes no fue descartado");
  }

  // C: Caza Tesoros
  const cazaDrill = exercises!.find(e => e.nombre?.includes("Caza-Tesoros"));
  if (cazaDrill) {
    const cazaRes = evaluateTacticalAffinity(cazaDrill, pCirc, "querubin", "U6");
    console.log(`- Caza-Tesoros en Circulación: ${cazaRes === null ? "✅ DESCARTADO (score null)" : `❌ ERROR: Score ${cazaRes.score}`}`);
    if (cazaRes !== null) throw new Error("Caza-Tesoros no fue descartado");
  }

  // D: Robo y cambio de orientación en Presión Alta
  const roboDrill = exercises!.find(e => e.nombre === "Robo y cambio de orientación");
  if (roboDrill) {
    const roboRes = evaluateTacticalAffinity(roboDrill, pPres, "senior", "Senior");
    console.log(`- Robo y cambio de orientación en Presión Alta: ${roboRes === null ? "✅ DESCARTADO (score null)" : `Nivel: ${roboRes.compatibilityLevel}`}`);
    if (roboRes !== null && roboRes.compatibilityLevel === "ALTA") {
      throw new Error("Robo y cambio de orientación no debe ser ALTA en Presión Alta");
    }
  }

  // E: Cambios de orientación en Presión Alta
  const cambiosDrill = exercises!.find(e => e.nombre === "Cambios de orientación");
  if (cambiosDrill) {
    const cambiosRes = evaluateTacticalAffinity(cambiosDrill, pPres, "senior", "Senior");
    console.log(`- Cambios de orientación en Presión Alta: ${cambiosRes === null ? "✅ DESCARTADO (score null)" : `Nivel: ${cambiosRes.compatibilityLevel}`}`);
    if (cambiosRes !== null && cambiosRes.compatibilityLevel === "ALTA") {
      throw new Error("Cambios de orientación no debe ser ALTA en Presión Alta");
    }
  }

  // F: 3 Zonas con ataque en superioridad en Presión Alta
  const tresZonasDrill = exercises!.find(e => e.nombre?.includes("3 Zonas con ataque en superioridad"));
  if (tresZonasDrill) {
    const tresZonasRes = evaluateTacticalAffinity(tresZonasDrill, pPres, "senior", "Senior");
    console.log(`- 3 Zonas en Presión Alta: ${tresZonasRes === null ? "✅ DESCARTADO (score null)" : `Nivel: ${tresZonasRes.compatibilityLevel}, Score Tác: ${tresZonasRes.explicability.tacticalScore}`}`);
    if (tresZonasRes !== null && tresZonasRes.compatibilityLevel === "ALTA") {
      throw new Error("3 Zonas no debe ser ALTA en Presión Alta");
    }
  }

  console.log("\n================================================================================");
  console.log("🏆 AUDITORÍA DEL CATÁLOGO 100% PASS");
  console.log("================================================================================");
}

audit199Catalog().catch(console.error);
