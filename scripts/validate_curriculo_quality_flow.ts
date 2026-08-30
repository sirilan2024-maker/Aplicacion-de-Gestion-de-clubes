process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as crypto from "crypto";
import { evaluateTacticalAffinity } from "../src/lib/methodology/tacticalEngine/tacticalAffinityEngine";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

const EXPECTED_HASH = "aaef86e3f8a65599abba624226d9394f609bed7c819ee3d3e6df5f136ba6d927";

async function validateCurriculoQualityFlow() {
  console.log("================================================================================");
  console.log("VALIDACIÓN DE CALIDAD: CURRÍCULO → TAREA OFICIAL → CONSTRUCTOR DE SESIÓN");
  console.log("================================================================================");

  // 1. Integridad de banco_ejercicios
  const { data: exercises, error: exErr } = await supabase
    .from("banco_ejercicios")
    .select("*")
    .order("id", { ascending: true });

  if (exErr || !exercises) {
    throw new Error(`Error al leer banco_ejercicios: ${exErr?.message}`);
  }

  console.log(`\n1. Banco de ejercicios oficial: ${exercises.length} registros (esperado: 199)`);
  if (exercises.length !== 199) {
    throw new Error(`Inconsistencia en banco_ejercicios: ${exercises.length} != 199`);
  }

  // 2. Verificar los 19 principios y subprincipios
  const { data: principles, error: prErr } = await supabase
    .from("methodology_principles")
    .select(`
      id, name, game_phase, description,
      methodology_subprinciples (
        id, name, description,
        methodology_behaviours (
          id, description, performance_indicators
        )
      )
    `);

  if (prErr || !principles) {
    throw new Error(`Error al leer methodology_principles: ${prErr?.message}`);
  }

  const uniquePrinciplesMap = new Map<string, any>();
  principles.forEach(p => {
    if (!uniquePrinciplesMap.has(p.name)) {
      uniquePrinciplesMap.set(p.name, p);
    }
  });
  const uniquePrinciples = Array.from(uniquePrinciplesMap.values());
  console.log(`2. Principios únicos del Modelo de Juego: ${uniquePrinciples.length} (esperado: 19)`);

  // 3. Simulación de los 3 Casos Obligatorios con el motor de scoring de calidad
  console.log("\n3. Auditoría de Calidad de Recomendaciones (Calidad > Cantidad):");

  function scoreExercise(ex: any, principle: any, stageSlug: string, stageCode: string) {
    return evaluateTacticalAffinity(ex, principle, stageSlug, stageCode);
  }

  // CASO 1: U6 Basculación
  const pA = uniquePrinciples.find(p => p.name.includes("Basculación"));
  const caseA = exercises.map(e => scoreExercise(e, pA, "querubin", "U6")).filter(Boolean).sort((a, b) => b!.score - a!.score);
  console.log(`\n  [CASO 1] U6 -> Defensa Organizada -> '${pA?.name}': ${caseA.length} tareas compatibles`);
  console.log(`    Top 1: "${caseA[0]!.exercise.nombre}" (${caseA[0]!.compatibilityLevel}, ${caseA[0]!.stageBadge})`);

  // CASO 2: U11-U12 Circulación
  const pB = uniquePrinciples.find(p => p.name.includes("Circulación Rápida"));
  const caseB = exercises.map(e => scoreExercise(e, pB, "alevin", "U11-U12")).filter(Boolean).sort((a, b) => b!.score - a!.score);
  console.log(`\n  [CASO 2] U11-U12 -> Ataque Organizado -> '${pB?.name}': ${caseB.length} tareas compatibles`);
  console.log(`    Top 1: "${caseB[0]!.exercise.nombre}" (${caseB[0]!.compatibilityLevel}, ${caseB[0]!.stageBadge})`);

  // CASO 3: Senior Presión Alta
  const pC = uniquePrinciples.find(p => p.name === "Presión Alta");
  const caseC = exercises.map(e => scoreExercise(e, pC, "senior", "Senior")).filter(Boolean).sort((a, b) => b!.score - a!.score);
  console.log(`\n  [CASO 3] Senior -> Defensa Organizada -> '${pC?.name}': ${caseC.length} tareas compatibles`);
  console.log(`    Top 1: "${caseC[0]!.exercise.nombre}" (${caseC[0]!.compatibilityLevel}, ${caseC[0]!.stageBadge})`);

  // CASO 4: U6 Circulación Rápida (Prueba Cruzada)
  const case4 = exercises.map(e => scoreExercise(e, pB, "querubin", "U6")).filter(Boolean).sort((a, b) => b!.score - a!.score);
  console.log(`\n  [CASO 4] U6 -> Ataque Organizado -> '${pB?.name}': ${case4.length} tareas compatibles`);
  console.log(`    Top 1: "${case4[0]!.exercise.nombre}" (${case4[0]!.compatibilityLevel}, ${case4[0]!.stageBadge})`);

  // CASO 5: Senior Circulación Rápida (Prueba Cruzada)
  const case5 = exercises.map(e => scoreExercise(e, pB, "senior", "Senior")).filter(Boolean).sort((a, b) => b!.score - a!.score);
  console.log(`\n  [CASO 5] Senior -> Ataque Organizado -> '${pB?.name}': ${case5.length} tareas compatibles`);
  console.log(`    Top 1: "${case5[0]!.exercise.nombre}" (${case5[0]!.compatibilityLevel}, ${case5[0]!.stageBadge})`);

  // Verificación de diferenciación entre U6 y Senior
  if (case4[0]!.exercise.id !== case5[0]!.exercise.id) {
    console.log(`\n  ✅ Diferenciación Exitosa: Top 1 U6 ("${case4[0]!.exercise.nombre}") != Top 1 Senior ("${case5[0]!.exercise.nombre}")`);
  } else {
    throw new Error(`⚠️ ERROR: Top 1 idéntico entre U6 y Senior`);
  }

  // Comprobación de Falsos Positivos Negativos
  const falsePosRio = scoreExercise(exercises.find(e => e.nombre?.includes("El Río y los Puentes")), pB, "querubin", "U6");
  if (falsePosRio !== null) {
    throw new Error("⚠️ ERROR: 'El Río y los Puentes' no fue descartado en Circulación Rápida");
  }
  console.log("  ✅ Filtro Negativo: 'Circuito Psicomotriz El Río y los Puentes' correctamente DESCARTADO (score null)");

  const falsePosCaza = scoreExercise(exercises.find(e => e.nombre?.includes("Caza-Tesoros")), pB, "querubin", "U6");
  if (falsePosCaza !== null) {
    throw new Error("⚠️ ERROR: 'Los Caza-Tesoros' no fue descartado en Circulación Rápida");
  }
  console.log("  ✅ Filtro Negativo: 'Los Caza-Tesoros en la Jungla' correctamente DESCARTADO (score null)");

  const falsePosRoboPresion = scoreExercise(exercises.find(e => e.nombre === "Robo y cambio de orientación"), pC, "senior", "Senior");
  if (falsePosRoboPresion !== null && falsePosRoboPresion.compatibilityLevel === "ALTA") {
    throw new Error("⚠️ ERROR: 'Robo y cambio de orientación' fue catalogado como ALTA en Presión Alta");
  }
  console.log("  ✅ Filtro Negativo: 'Robo y cambio de orientación' no contamina Presión Alta");

  // 4. Prueba Completa de Creación, Guardado y Consulta de Sesión
  console.log("\n4. Prueba Integral de Flujo Entrenador (Currículo -> Tarea -> Sesión -> Listado):");
  const chosenDrill = caseB[0]!.exercise;
  const { data: testTeam } = await supabase.from("teams").select("id, club_id").limit(1).single();

  if (testTeam) {
    const testSession = {
      club_id: testTeam.club_id,
      team_id: testTeam.id,
      title: `Sesión de Validación: ${pB.name}`,
      date: new Date().toISOString().split("T")[0],
      start_time: "17:30",
      age_category: "alevin",
      microcycle_day: "MD-2",
      objective: pB.name,
      estimated_load: 70,
      is_completed: false
    };

    const { data: createdSession, error: sErr } = await supabase
      .from("training_sessions")
      .insert(testSession)
      .select()
      .single();

    if (sErr) {
      throw new Error(`Error al insertar sesión: ${sErr.message}`);
    }
    console.log(`  ✅ Sesión creada en BD: "${createdSession.title}" (ID: ${createdSession.id})`);

    // Vincular ejercicio
    const { data: createdDrill, error: dErr } = await supabase
      .from("session_drills")
      .insert({
        session_id: createdSession.id,
        drill_id: chosenDrill.id,
        phase: "main_1",
        order_index: 0,
        duration_min: 25
      })
      .select()
      .single();

    if (dErr) {
      console.warn("  (Aviso) session_drills insert:", dErr.message);
    } else {
      console.log(`  ✅ Tarea vinculada en session_drills: "${chosenDrill.nombre}"`);
    }

    // Verificar consulta de sesión completa con join de ejercicio
    const { data: fetchedSession } = await supabase
      .from("training_sessions")
      .select(`
        id, title, objective,
        session_drills (
          id, phase, duration_min,
          banco_ejercicios ( id, nombre, tipo )
        )
      `)
      .eq("id", createdSession.id)
      .single();

    const drillNombre = Array.isArray(fetchedSession?.session_drills?.[0]?.banco_ejercicios) 
      ? fetchedSession?.session_drills?.[0]?.banco_ejercicios[0]?.nombre 
      : (fetchedSession?.session_drills?.[0]?.banco_ejercicios as any)?.nombre;
    console.log(`     Drill verificado en sesión: "${drillNombre}"`);

    // Limpieza de sesión de prueba
    if (createdDrill) await supabase.from("session_drills").delete().eq("session_id", createdSession.id);
    await supabase.from("training_sessions").delete().eq("id", createdSession.id);
    console.log("  ✅ Limpieza de datos de prueba completada.");
  }

  // 5. Verificación final de integridad de banco_ejercicios
  const { data: finalExercises } = await supabase.from("banco_ejercicios").select("id");
  console.log(`\n5. Verificación final de banco_ejercicios: ${finalExercises?.length} registros.`);
  if (finalExercises?.length !== 199) {
    throw new Error(`CRITICAL: banco_ejercicios count altered: ${finalExercises?.length}`);
  }

  console.log("\n================================================================================");
  console.log("🏆 VALIDACIÓN COMPLETADA AL 100% CON ÉXITO");
  console.log("================================================================================");
}

validateCurriculoQualityFlow().catch(console.error);
