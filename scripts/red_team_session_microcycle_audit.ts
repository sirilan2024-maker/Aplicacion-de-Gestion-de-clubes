process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { sessionPlannerService } from "../src/lib/methodology/sessionGenerator/sessionPlannerService";
import { sessionValidator } from "../src/lib/methodology/sessionGenerator/sessionValidator";
import { generateMicrocycleProposal, convertMicrocycleDayToSessionContext } from "../src/lib/methodology/methodologyMicrocyclePlanner";
import { microcycleValidator } from "../src/lib/methodology/microcycleGenerator/microcycleValidator";
import { evaluatePureTacticalAffinity } from "../src/lib/methodology/tacticalEngine/tacticalAffinityEngine";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";
const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

async function runRedTeamSessionMicrocycleAudit() {
  console.log("================================================================================");
  console.log("RED TEAM AUDIT: GENERADOR UNIFICADO DE SESIONES Y MICROCICLOS");
  console.log("================================================================================");

  // 1. Cargar catálogo oficial de 199 ejercicios
  const { data: catalog, error } = await supabase.from("banco_ejercicios").select("*");
  if (error || !catalog || catalog.length === 0) {
    console.error("❌ ERROR: No se pudo cargar el catálogo de la base de datos.");
    process.exit(1);
  }

  console.log(`[FASE 0] Catálogo oficial cargado: ${catalog.length} ejercicios.\n`);

  let totalSessionAttacks = 0;
  let passedSessionAttacks = 0;

  // ────────────────────────────────────────────────────────────────────────────
  // ATAQUES RED TEAM A LA GENERACIÓN DE SESIONES
  // ────────────────────────────────────────────────────────────────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("[BLOQUE 1] ATAQUES ADVERSARIALES A GENERACIÓN DE SESIONES");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // ATAQUE 1: Inyección de objetivo contradictorio
  totalSessionAttacks++;
  const session1 = await sessionPlannerService.generateSession({
    primaryObjective: "Presión Alta",
    secondaryObjectives: ["Acoso", "Robo en campo rival"],
    ageCategory: "senior",
    durationMinutes: 90,
    players: 18,
    difficulty: 4,
    microcycleDay: "MD-4",
    excludedObjectives: ["Salida de balón desde portería"]
  }, catalog);

  const val1 = sessionValidator.validateSession(session1.session.drills, session1.session.intent);
  if (val1.isValid && !val1.failures.some(f => f.code === "EXCLUDED_OBJECTIVE_VIOLATION")) {
    console.log("  1. Ataque de Exclusiones y Contradicciones: ✅ PASS (Exclusiones respetadas al 100%)");
    passedSessionAttacks++;
  } else {
    console.error("  1. Ataque de Exclusiones y Contradicciones: ❌ FAIL", val1.failures);
  }

  // ATAQUE 2: Intento de rescate de ejercicio NULL (Físico puro / Psicomotriz)
  totalSessionAttacks++;
  const mainPhaseDrills = session1.session.drills.filter(d => d.phase === "principal_1" || d.phase === "principal_2" || d.phase === "global");
  const nullDrillsInMain = mainPhaseDrills.filter(d => {
    const tac = evaluatePureTacticalAffinity(d.exercise, { name: "Presión Alta", game_phase: "Defensa" });
    return !tac || !tac.hasMeaningfulAffinity;
  });

  if (nullDrillsInMain.length === 0) {
    console.log("  2. Ataque a Tareas NULL en Fases Principales: ✅ PASS (0 tareas null en fases principales)");
    passedSessionAttacks++;
  } else {
    console.error("  2. Ataque a Tareas NULL en Fases Principales: ❌ FAIL (Encontradas tareas sin afinidad táctica)", nullDrillsInMain.map(d => d.exercise.nombre));
  }

  // ATAQUE 3: Ataque a la suma exacta de minutos (60, 75, 90, 105, 120 min)
  totalSessionAttacks++;
  const durationsToTest = [60, 75, 90, 105, 120];
  let allDurationsExact = true;
  for (const dur of durationsToTest) {
    const s = await sessionPlannerService.generateSession({
      primaryObjective: "Circulación Rápida y Cambio de Orientación",
      ageCategory: "infantil",
      durationMinutes: dur,
      players: 16
    }, catalog);
    const sum = s.session.drills.reduce((acc, d) => acc + d.allocatedDurationMin, 0);
    if (sum !== dur || !s.session.isDurationExact) {
      allDurationsExact = false;
    }
  }
  if (allDurationsExact) {
    console.log("  3. Ataque a Presupuesto Temporal Exacto: ✅ PASS (Suma matemática exacta en 60, 75, 90, 105, 120 min)");
    passedSessionAttacks++;
  } else {
    console.error("  3. Ataque a Presupuesto Temporal Exacto: ❌ FAIL");
  }

  // ATAQUE 4: Ataque a la Vuelta a la Calma (Intento de sobrecarga fisiológica)
  totalSessionAttacks++;
  const cooldownDrill = session1.session.drills.find(d => d.phase === "vuelta_calma");
  const isCooldownSafe = (cooldownDrill?.exercise?.carga_fisica ?? 1) <= 2 && (cooldownDrill?.exercise?.oposicion ?? 1) <= 1;
  if (isCooldownSafe) {
    console.log("  4. Ataque a Vuelta a la Calma Regenerativa: ✅ PASS (Carga física <= 2, Oposición <= 1)");
    passedSessionAttacks++;
  } else {
    console.error("  4. Ataque a Vuelta a la Calma Regenerativa: ❌ FAIL", cooldownDrill?.exercise);
  }

  // ATAQUE 5: Ataque de Duplicados en la Misma Sesión
  totalSessionAttacks++;
  const seenIds = new Set<string>();
  let hasDuplicate = false;
  for (const d of session1.session.drills) {
    if (d.exercise?.id && !d.exercise.id.startsWith("cooldown-")) {
      if (seenIds.has(d.exercise.id)) {
        hasDuplicate = true;
      }
      seenIds.add(d.exercise.id);
    }
  }
  if (!hasDuplicate) {
    console.log("  5. Ataque de Deduplicación Intra-Sesión: ✅ PASS (0 tareas duplicadas en la sesión)");
    passedSessionAttacks++;
  } else {
    console.error("  5. Ataque de Deduplicación Intra-Sesión: ❌ FAIL");
  }

  // ────────────────────────────────────────────────────────────────────────────
  // ATAQUES RED TEAM A LA GENERACIÓN DE MICROCICLOS
  // ────────────────────────────────────────────────────────────────────────────
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("[BLOQUE 2] ATAQUES ADVERSARIALES A GENERACIÓN DE MICROCICLOS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  let totalMicroAttacks = 0;
  let passedMicroAttacks = 0;

  // ATAQUE 6: Microciclo estándar con Domingo como Día de Partido (MD)
  totalMicroAttacks++;
  const microProposal = generateMicrocycleProposal({
    teamId: "team-test-01",
    category: "senior",
    weekStartDate: "2026-09-01",
    matchDayDate: "2026-09-07",
    matchOpponent: "CF Gandía",
    trainingDays: [2, 4, 5], // Martes, Jueves, Viernes
    priorities: [
      {
        id: "p1",
        title: "Presión Alta y Robo en Campo Contrario",
        priorityLevel: "high",
        suggestedPrinciple: "Presión Alta",
        category: "senior"
      } as any
    ]
  });

  const microVal = microcycleValidator.validateMicrocycle(microProposal);
  if (microVal.isValid) {
    console.log("  6. Estructura y Coherencia de Microciclo MD-x: ✅ PASS (7 días exactos, MD en Domingo)");
    passedMicroAttacks++;
  } else {
    console.error("  6. Estructura y Coherencia de Microciclo MD-x: ❌ FAIL", microVal.failures);
  }

  // ATAQUE 7: Intento de sobrecarga en MD-1 (Víspera de Partido)
  totalMicroAttacks++;
  const md1Day = microProposal.days.find(d => d.microcycleDay === "MD-1");
  const isMd1LowLoad = md1Day ? md1Day.targetLoad !== "Alta" && md1Day.targetLoadPercentage <= 60 : true;
  if (isMd1LowLoad) {
    console.log("  7. Blindaje de Carga en MD-1 (Pre-Partido): ✅ PASS (Carga baja/moderada sin fatiga)");
    passedMicroAttacks++;
  } else {
    console.error("  7. Blindaje de Carga en MD-1 (Pre-Partido): ❌ FAIL", md1Day);
  }

  // ATAQUE 8: Intento de días consecutivos de Carga Alta
  totalMicroAttacks++;
  let consecutiveHighLoad = false;
  for (let i = 0; i < microProposal.days.length - 1; i++) {
    if (microProposal.days[i].isTrainingDay && microProposal.days[i + 1].isTrainingDay) {
      if (microProposal.days[i].targetLoad === "Alta" && microProposal.days[i + 1].targetLoad === "Alta") {
        consecutiveHighLoad = true;
      }
    }
  }
  if (!consecutiveHighLoad) {
    console.log("  8. Distribución Fisiológica Semanal: ✅ PASS (0 días consecutivos de carga Alta)");
    passedMicroAttacks++;
  } else {
    console.error("  8. Distribución Fisiológica Semanal: ❌ FAIL");
  }

  // ATAQUE 9: Deduplicación Inter-Sesiones dentro del Microciclo (Memoria de uso)
  totalMicroAttacks++;
  const usedExerciseIdsInWeek = new Set<string>();
  let interSessionDuplicates = 0;

  for (const day of microProposal.days.filter(d => d.isTrainingDay)) {
    const sessionContext = convertMicrocycleDayToSessionContext(
      day,
      { id: "team-test-01", category: "senior" },
      catalog,
      Array.from(usedExerciseIdsInWeek)
    );

    const daySession = await sessionPlannerService.generateSession({
      primaryObjective: day.objective,
      secondaryObjectives: day.secondaryObjectives,
      ageCategory: "senior",
      durationMinutes: day.plannedDurationMin || 90,
      players: 18,
      microcycleDay: day.microcycleDay,
      recentExerciseIds: Array.from(usedExerciseIdsInWeek)
    }, catalog);

    for (const d of daySession.session.drills) {
      const exId = d.exercise?.id;
      if (exId && !exId.startsWith("cooldown-")) {
        if (usedExerciseIdsInWeek.has(exId)) {
          interSessionDuplicates++;
        }
        usedExerciseIdsInWeek.add(exId);
      }
    }
  }

  if (interSessionDuplicates === 0) {
    console.log("  9. Variación y Memoria Inter-Sesiones: ✅ PASS (0 ejercicios repetidos en los diferentes días)");
    passedMicroAttacks++;
  } else {
    console.error(`  9. Variación y Memoria Inter-Sesiones: ❌ FAIL (${interSessionDuplicates} repeticiones detectadas)`);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // RESUMEN FINAL DE LA AUDITORÍA RED TEAM
  // ────────────────────────────────────────────────────────────────────────────
  console.log("\n================================================================================");
  console.log("RESUMEN DE AUDITORÍA RED TEAM (SESIONES & MICROCICLOS)");
  console.log("================================================================================");
  console.log(`- Pruebas de Sesiones:    ${passedSessionAttacks} / ${totalSessionAttacks} PASS`);
  console.log(`- Pruebas de Microciclos: ${passedMicroAttacks} / ${totalMicroAttacks} PASS`);

  const allPassed = (passedSessionAttacks === totalSessionAttacks) && (passedMicroAttacks === totalMicroAttacks);
  if (!allPassed) {
    console.error("❌ AUDITORÍA RED TEAM FALLIDA.");
    process.exit(1);
  } else {
    console.log("🏆 TODAS LAS PRUEBAS RED TEAM DE SESIONES Y MICROCICLOS ESTÁN EN 100% PASS.");
  }
}

runRedTeamSessionMicrocycleAudit();
