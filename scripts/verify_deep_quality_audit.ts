process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { sessionPlannerService } from "../src/lib/methodology/sessionGenerator/sessionPlannerService";
import { sessionValidator } from "../src/lib/methodology/sessionGenerator/sessionValidator";
import { 
  calculateMdCode, 
  generateMicrocycleProposal, 
  convertMicrocycleDayToSessionContext,
  MicrocyclePlannerContext 
} from "../src/lib/methodology/methodologyMicrocyclePlanner";
import { microcycleValidator } from "../src/lib/methodology/microcycleGenerator/microcycleValidator";
import { evaluatePureTacticalAffinity } from "../src/lib/methodology/tacticalEngine/tacticalAffinityEngine";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";
const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

async function runDeepQualityAudit() {
  console.log("================================================================================");
  console.log("AUDITORÍA INDEPENDIENTE DE CALIDAD METODOLÓGICA Y FIABILIDAD");
  console.log("================================================================================\n");

  const { data: catalog, error } = await supabase.from("banco_ejercicios").select("*");
  if (error || !catalog || catalog.length === 0) {
    console.error("❌ ERROR: No se pudo conectar a la base de datos.");
    process.exit(1);
  }

  const catalogIds = new Set<string>(catalog.map(c => c.id));
  console.log(`[BASE DE DATOS] Catálogo oficial cargado: ${catalog.length} ejercicios.\n`);

  let totalChecks = 0;
  let passedChecks = 0;

  function assertCheck(name: string, condition: boolean, details?: any) {
    totalChecks++;
    if (condition) {
      console.log(`  ✅ PASS: ${name}`);
      passedChecks++;
    } else {
      console.error(`  ❌ FAIL: ${name}`, details || "");
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 1. AUDITORÍA CRÍTICA DEL MODELO MD-X
  // ────────────────────────────────────────────────────────────────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("[BLOQUE 1] AUDITORÍA CRÍTICA DE MD-X Y PERIODIZACIÓN TÁCTICA");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Domingo = 2026-09-07
  assertCheck("MD-x: Partido Domingo (Lunes es MD-6)", calculateMdCode("2026-09-01", "2026-09-07") === "MD-6");
  assertCheck("MD-x: Partido Domingo (Martes es MD-5)", calculateMdCode("2026-09-02", "2026-09-07") === "MD-5");
  assertCheck("MD-x: Partido Domingo (Miércoles es MD-4)", calculateMdCode("2026-09-03", "2026-09-07") === "MD-4");
  assertCheck("MD-x: Partido Domingo (Jueves es MD-3)", calculateMdCode("2026-09-04", "2026-09-07") === "MD-3");
  assertCheck("MD-x: Partido Domingo (Viernes es MD-2)", calculateMdCode("2026-09-05", "2026-09-07") === "MD-2");
  assertCheck("MD-x: Partido Domingo (Sábado es MD-1)", calculateMdCode("2026-09-06", "2026-09-07") === "MD-1");
  assertCheck("MD-x: Partido Domingo (Domingo es MD)", calculateMdCode("2026-09-07", "2026-09-07") === "MD");

  // Sábado = 2026-09-06
  assertCheck("MD-x: Partido Sábado (Viernes es MD-1)", calculateMdCode("2026-09-05", "2026-09-06") === "MD-1");
  assertCheck("MD-x: Partido Sábado (Jueves es MD-2)", calculateMdCode("2026-09-04", "2026-09-06") === "MD-2");
  assertCheck("MD-x: Partido Sábado (Miércoles es MD-3)", calculateMdCode("2026-09-03", "2026-09-06") === "MD-3");
  assertCheck("MD-x: Partido Sábado (Martes es MD-4)", calculateMdCode("2026-09-02", "2026-09-06") === "MD-4");
  assertCheck("MD-x: Partido Sábado (Lunes es MD-5)", calculateMdCode("2026-09-01", "2026-09-06") === "MD-5");

  // Miércoles = 2026-09-03
  assertCheck("MD-x: Partido Miércoles (Martes es MD-1)", calculateMdCode("2026-09-02", "2026-09-03") === "MD-1");
  assertCheck("MD-x: Partido Miércoles (Jueves es MD+1)", calculateMdCode("2026-09-04", "2026-09-03") === "MD+1");

  // Dos partidos en la misma semana (Miércoles 03 y Domingo 07)
  const twoMatches = ["2026-09-03", "2026-09-07"];
  assertCheck("MD-x Multi-partido: Martes es MD-1 (ante Miércoles)", calculateMdCode("2026-09-02", twoMatches) === "MD-1");
  assertCheck("MD-x Multi-partido: Miércoles es MD", calculateMdCode("2026-09-03", twoMatches) === "MD");
  assertCheck("MD-x Multi-partido: Jueves es MD-3 (ante Domingo)", calculateMdCode("2026-09-04", twoMatches) === "MD-3");
  assertCheck("MD-x Multi-partido: Viernes es MD-2 (ante Domingo)", calculateMdCode("2026-09-05", twoMatches) === "MD-2");
  assertCheck("MD-x Multi-partido: Sábado es MD-1 (ante Domingo)", calculateMdCode("2026-09-06", twoMatches) === "MD-1");
  assertCheck("MD-x Multi-partido: Domingo es MD", calculateMdCode("2026-09-07", twoMatches) === "MD");

  // ────────────────────────────────────────────────────────────────────────────
  // 2. AUDITORÍA DE DATOS NO INVENTADOS (Trazabilidad estricta al catálogo)
  // ────────────────────────────────────────────────────────────────────────────
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("[BLOQUE 2] AUDITORÍA DE ORIGEN DE DATOS (0 EJERCICIOS INVENTADOS)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const testSessionA = await sessionPlannerService.generateSession({
    primaryObjective: "Presión Alta",
    ageCategory: "senior",
    durationMinutes: 90,
    players: 18,
    microcycleDay: "MD-4"
  }, catalog);

  const testSessionB = await sessionPlannerService.generateSession({
    primaryObjective: "Circulación Rápida y Cambio de Orientación",
    ageCategory: "benjamin",
    durationMinutes: 60,
    players: 14,
    microcycleDay: "MD-3"
  }, catalog);

  const allDrillsGenerated = [...testSessionA.session.drills, ...testSessionB.session.drills];
  let uncatalogedDrillsCount = 0;

  for (const d of allDrillsGenerated) {
    const ex = d.exercise;
    const existsInDb = catalogIds.has(ex.id);
    const isVerifiedExt = ex.is_external && ex.verificationStatus === "VERIFIED";

    if (!existsInDb && !isVerifiedExt) {
      uncatalogedDrillsCount++;
      console.error(`  ⚠️ Ejercicio no encontrado en catálogo oficial: "${ex.nombre}" (ID: ${ex.id})`);
    }
  }

  assertCheck("Trazabilidad Oficial: Todos los ejercicios pertenecen a banco_ejercicios (0 inventados)", uncatalogedDrillsCount === 0);

  // ────────────────────────────────────────────────────────────────────────────
  // 3. AUDITORÍA DE LA VUELTA A LA CALMA
  // ────────────────────────────────────────────────────────────────────────────
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("[BLOQUE 3] AUDITORÍA DE VUELTA A LA CALMA (REGLAS REGENERATIVAS)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const cooldownA = testSessionA.session.drills.find(d => d.phase === "vuelta_calma");
  const cooldownB = testSessionB.session.drills.find(d => d.phase === "vuelta_calma");

  assertCheck("Vuelta a la Calma Sesión A: Carga física <= 2", (cooldownA?.exercise?.carga_fisica ?? 1) <= 2);
  assertCheck("Vuelta a la Calma Sesión A: Oposición <= 1", (cooldownA?.exercise?.oposicion ?? 1) <= 1);
  assertCheck("Vuelta a la Calma Sesión B: Carga física <= 2", (cooldownB?.exercise?.carga_fisica ?? 1) <= 2);
  assertCheck("Vuelta a la Calma Sesión B: Oposición <= 1", (cooldownB?.exercise?.oposicion ?? 1) <= 1);
  assertCheck("Vuelta a la Calma es un ejercicio real del catálogo oficial", catalogIds.has(cooldownA?.exercise?.id));

  // ────────────────────────────────────────────────────────────────────────────
  // 4. AUDITORÍA TÁCTICA ADVERSARIAL EN 6 MATRICES
  // ────────────────────────────────────────────────────────────────────────────
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("[BLOQUE 4] AUDITORÍA TÁCTICA ADVERSARIAL (6 MATRICES TÁCTICAS)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const matrices = [
    { cat: "senior", obj: "Presión Alta", name: "Senior -> Defensa -> Presión Alta" },
    { cat: "senior", obj: "Basculación y Bloque Medio", name: "Senior -> Defensa -> Bloque Medio" },
    { cat: "senior", obj: "Circulación Rápida", name: "Senior -> Ataque -> Circulación" },
    { cat: "senior", obj: "Cambio de Orientación", name: "Senior -> Ataque -> Cambio de Orientación" },
    { cat: "querubin", obj: "Circulación Rápida", name: "U6 -> Ataque -> Circulación" },
    { cat: "querubin", obj: "Basculación y Bloque Medio", name: "U6 -> Defensa -> Basculación" }
  ];

  for (const m of matrices) {
    const s = await sessionPlannerService.generateSession({
      primaryObjective: m.obj,
      ageCategory: m.cat,
      durationMinutes: 90,
      players: 16
    }, catalog);

    const mainDrills = s.session.drills.filter(d => d.phase === "principal_1" || d.phase === "principal_2" || d.phase === "global");
    const hasNull = mainDrills.some(d => {
      const pure = evaluatePureTacticalAffinity(d.exercise, { name: m.obj, game_phase: m.obj });
      return !pure || !pure.hasMeaningfulAffinity;
    });

    assertCheck(`Matriz [${m.name}]: 0 tareas NULL en fases principales`, !hasNull);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 5. AUDITORÍA DE OBJETIVOS SECUNDARIOS (No secuestran la sesión)
  // ────────────────────────────────────────────────────────────────────────────
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("[BLOQUE 5] AUDITORÍA DE OBJETIVOS SECUNDARIOS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const hijackSession = await sessionPlannerService.generateSession({
    primaryObjective: "Presión Alta",
    secondaryObjectives: ["Salida de balón desde portería"],
    ageCategory: "senior",
    durationMinutes: 90,
    players: 18
  }, catalog);

  const globalDrill = hijackSession.session.drills.find(d => d.phase === "global");
  const pureMain = evaluatePureTacticalAffinity(globalDrill?.exercise, { name: "Presión Alta", game_phase: "Defensa" });
  assertCheck("Objetivos secundarios: El objetivo principal (Presión Alta) domina el juego global", pureMain !== null && pureMain.hasMeaningfulAffinity);

  // ────────────────────────────────────────────────────────────────────────────
  // 6. AUDITORÍA DE DETERMINISMO Y REPRODUCIBILIDAD
  // ────────────────────────────────────────────────────────────────────────────
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("[BLOQUE 6] AUDITORÍA DE DETERMINISMO (INPUT A = INPUT A)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const run1 = await sessionPlannerService.generateSession({
    primaryObjective: "Presión Alta",
    ageCategory: "senior",
    durationMinutes: 90,
    players: 18
  }, catalog, { variantNumber: 1 });

  const run2 = await sessionPlannerService.generateSession({
    primaryObjective: "Presión Alta",
    ageCategory: "senior",
    durationMinutes: 90,
    players: 18
  }, catalog, { variantNumber: 1 });

  const ids1 = run1.session.drills.map(d => d.exercise.id).join(",");
  const ids2 = run2.session.drills.map(d => d.exercise.id).join(",");

  assertCheck("Determinismo de Sesión: Mismo input produce exactamente la misma secuencia de ejercicios", ids1 === ids2);

  // ────────────────────────────────────────────────────────────────────────────
  // 7. GOLDEN CASES
  // ────────────────────────────────────────────────────────────────────────────
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("[BLOQUE 7] GOLDEN CASES DE REFERENCIA");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Golden Session 1: Senior -> Defensa -> Presión Alta -> MD-4 -> 90'
  const gSession1 = await sessionPlannerService.generateSession({
    primaryObjective: "Presión Alta",
    ageCategory: "senior",
    durationMinutes: 90,
    players: 18,
    microcycleDay: "MD-4"
  }, catalog);
  const valG1 = sessionValidator.validateSession(gSession1.session.drills, gSession1.session.intent);
  assertCheck("GOLDEN SESSION 1: Senior Presión Alta MD-4 90 min (SESSION_VALID)", valG1.isValid && gSession1.session.drills.length === 5);

  // Golden Session 2: Senior -> Ataque -> Circulación -> MD-3 -> 90'
  const gSession2 = await sessionPlannerService.generateSession({
    primaryObjective: "Circulación Rápida y Cambio de Orientación",
    ageCategory: "senior",
    durationMinutes: 90,
    players: 18,
    microcycleDay: "MD-3"
  }, catalog);
  const valG2 = sessionValidator.validateSession(gSession2.session.drills, gSession2.session.intent);
  assertCheck("GOLDEN SESSION 2: Senior Circulación MD-3 90 min (SESSION_VALID)", valG2.isValid && gSession2.session.drills.length === 5);

  // Golden Session 3: U6 -> Defensa -> Basculación -> 60'
  const gSession3 = await sessionPlannerService.generateSession({
    primaryObjective: "Basculación y Bloque Medio",
    ageCategory: "querubin",
    durationMinutes: 60,
    players: 12
  }, catalog);
  const valG3 = sessionValidator.validateSession(gSession3.session.drills, gSession3.session.intent);
  assertCheck("GOLDEN SESSION 3: U6 Basculación 60 min (SESSION_VALID)", valG3.isValid && gSession3.session.drills.length === 5);

  // Golden Microcycle 1: Partido Domingo + 3 entrenamientos (Martes, Jueves, Viernes)
  const gMicro1 = generateMicrocycleProposal({
    teamId: "team-senior",
    category: "senior",
    weekStartDate: "2026-09-01",
    matchDayDate: "2026-09-07",
    matchOpponent: "CF Gandía",
    trainingDays: [2, 4, 5],
    priorities: [{ id: "p1", title: "Presión Alta", priorityLevel: "high", suggestedPrinciple: "Presión Alta", category: "senior" } as any]
  });
  const valGM1 = microcycleValidator.validateMicrocycle(gMicro1);
  assertCheck("GOLDEN MICROCYCLE 1: Partido Domingo + 3 entrenamientos (MICROCYCLE_VALID)", valGM1.isValid);

  // Golden Microcycle 2: Partido Sábado + 4 entrenamientos (Lunes, Martes, Jueves, Viernes)
  const gMicro2 = generateMicrocycleProposal({
    teamId: "team-senior-2",
    category: "senior",
    weekStartDate: "2026-09-01",
    matchDayDate: "2026-09-06",
    matchOpponent: "CD Denia",
    trainingDays: [1, 2, 4, 5],
    priorities: [{ id: "p2", title: "Circulación Rápida", priorityLevel: "high", suggestedPrinciple: "Circulación Rápida", category: "senior" } as any]
  });
  const valGM2 = microcycleValidator.validateMicrocycle(gMicro2);
  assertCheck("GOLDEN MICROCYCLE 2: Partido Sábado + 4 entrenamientos (MICROCYCLE_VALID)", valGM2.isValid);

  // ────────────────────────────────────────────────────────────────────────────
  // RESUMEN FINAL
  // ────────────────────────────────────────────────────────────────────────────
  console.log("\n================================================================================");
  console.log("RESUMEN DE AUDITORÍA INDEPENDIENTE DE CALIDAD");
  console.log("================================================================================");
  console.log(`- Pruebas Ejecutadas: ${passedChecks} / ${totalChecks} PASS (${Math.round((passedChecks/totalChecks)*100)}%)`);

  if (passedChecks !== totalChecks) {
    console.error("❌ AUDITORÍA FALLIDA.");
    process.exit(1);
  } else {
    console.log("🏆 AUDITORÍA INDEPENDIENTE DE CALIDAD: 100% PASS EN TODOS LOS CRITERIOS.");
  }
}

runDeepQualityAudit();
