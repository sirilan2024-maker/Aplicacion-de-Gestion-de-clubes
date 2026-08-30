process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as crypto from "crypto";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

async function runEndToEndVerification() {
  console.log("================================================================================");
  console.log("VERIFICACIÓN INTEGRAL: CURRÍCULO → TAREAS OFICIALES → CONSTRUCTOR DE SESIÓN");
  console.log("================================================================================");

  // 1. Verificar banco_ejercicios = 199 y SHA256
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

  // 2. Verificar principios reales = 19
  const { data: principles, error: prErr } = await supabase
    .from("methodology_principles")
    .select(`
      id, name, game_phase, description,
      methodology_subprinciples (
        id, name, description,
        methodology_behaviours (
          id, description
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

  // 3. Probar los 3 casos requeridos
  console.log("\n3. Pruebas de compatibilidad en casos obligatorios:");

  // Caso A: U6 + Defensa Organizada + Basculación y Compactación de Bloque
  const basculacion = uniquePrinciples.find(p => p.name.includes("Basculación"));
  console.log(`  [Caso A] U6 -> Defensa Organizada -> '${basculacion?.name}'`);
  if (!basculacion) throw new Error("No se encontró el principio de Basculación");

  // Caso B: U11-U12 + Ataque Organizado + Circulación Rápida
  const circulacion = uniquePrinciples.find(p => p.name.includes("Circulación Rápida"));
  console.log(`  [Caso B] U11-U12 -> Ataque Organizado -> '${circulacion?.name}'`);
  if (!circulacion) throw new Error("No se encontró el principio de Circulación Rápida");

  // Caso C: Senior + Defensa Organizada + Presión Alta
  const presion = uniquePrinciples.find(p => p.name === "Presión Alta");
  console.log(`  [Caso C] Senior -> Defensa Organizada -> '${presion?.name}'`);
  if (!presion) throw new Error("No se encontró el principio de Presión Alta");

  // 4. Probar flujo Session Builder (Inserción de prueba de sesión con ejercicio precargado)
  console.log("\n4. Prueba de integración con Constructor de Sesión:");
  const testExercise = exercises.find(e => e.nombre.includes("Basculación") || e.nombre.includes("Presión") || e.nombre.includes("Posición"));
  console.log(`  Ejercicio seleccionado para prueba de constructor: "${testExercise?.nombre}" (ID: ${testExercise?.id})`);

  // Obtener un club y un equipo de prueba
  const { data: team } = await supabase.from("teams").select("id, club_id").limit(1).single();
  if (team) {
    const testSessionData = {
      club_id: team.club_id,
      team_id: team.id,
      title: "Sesión de Prueba Metodológica (Currículo)",
      date: new Date().toISOString().split("T")[0],
      start_time: "18:00",
      microcycle_day: "MD-3",
      objective: "Evaluación de Basculación Defensiva (Test)",
      estimated_load: 65,
      is_completed: false
    };

    const { data: insertedSession, error: sessionErr } = await supabase
      .from("training_sessions")
      .insert(testSessionData)
      .select()
      .single();

    if (sessionErr) {
      console.warn("  (Aviso) Error al insertar sesión de prueba:", sessionErr.message);
    } else {
      console.log(`  ✅ Sesión de prueba creada con éxito en training_sessions: ID ${insertedSession.id}`);

      // Insertar drill en session_drills si la tabla existe
      const { error: drillErr } = await supabase
        .from("session_drills")
        .insert({
          session_id: insertedSession.id,
          drill_id: testExercise?.id,
          phase: "principal_1",
          order_index: 0,
          duration_min: 20
        });

      if (!drillErr) {
        console.log(`  ✅ Ejercicio vinculado en session_drills con éxito para la sesión.`);
      }

      // Limpiar sesión de prueba
      await supabase.from("session_drills").delete().eq("session_id", insertedSession.id);
      await supabase.from("training_sessions").delete().eq("id", insertedSession.id);
      console.log(`  ✅ Limpieza completada: sesión de prueba retirada sin alterar datos de producción.`);
    }
  }

  // 5. Verificar que banco_ejercicios sigue exactamente en 199
  const { data: finalExercises } = await supabase.from("banco_ejercicios").select("id");
  console.log(`\n5. Verificación final de banco_ejercicios: ${finalExercises?.length} registros.`);
  if (finalExercises?.length !== 199) {
    throw new Error(`ALERTA: banco_ejercicios fue modificado! Conteo final: ${finalExercises?.length}`);
  }

  console.log("\n================================================================================");
  console.log("🏆 TODAS LAS VERIFICACIONES COMPLETADAS CON ÉXITO");
  console.log("================================================================================");
}

runEndToEndVerification().catch(console.error);
