process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

async function testSessionSave() {
  console.log("================================================================================");
  console.log("PROBANDO GUARDADO DE SESIÓN CON EL SCHEMA REAL");
  console.log("================================================================================");

  const { data: team } = await supabase.from("teams").select("id, club_id").limit(1).single();
  const { data: drill } = await supabase.from("banco_ejercicios").select("id, nombre").limit(1).single();

  console.log("Team:", team?.id, "Club:", team?.club_id);
  console.log("Drill:", drill?.id, drill?.nombre);

  // 1. Simular inserción
  const testInsert = {
    club_id: team?.club_id,
    team_id: team?.id,
    title: "Sesión: Transición Defensiva y Presión",
    date: "2026-08-22",
    start_time: "18:00",
    status: "scheduled",
    age_category: "alevin",
    microcycle_day: "MD-3",
    intensity_load: 3,
    objective: "Presión tras pérdida",
    objectives_secondary: ["Transición defensiva"],
    num_players: 16,
    num_goalkeepers: 2,
    available_space: "Medio campo",
    available_material: ["balones", "conos", "petos"],
    estimated_load: 65,
    is_completed: false,
    coach_notes: "Presión tras pérdida"
  };

  const { data: savedSession, error: sErr } = await supabase
    .from("training_sessions")
    .insert(testInsert)
    .select()
    .single();

  if (sErr) {
    console.error("❌ Error en training_sessions:", sErr);
    return;
  }
  console.log("✅ Sesión guardada con éxito! ID:", savedSession.id);

  // 2. Simular inserción en session_drills
  const { data: savedDrill, error: dErr } = await supabase
    .from("session_drills")
    .insert({
      session_id: savedSession.id,
      drill_id: drill?.id,
      phase: "main_1",
      order_index: 0,
      duration_min: 20
    })
    .select()
    .single();

  if (dErr) {
    console.error("❌ Error en session_drills:", dErr);
  } else {
    console.log("✅ Ejercicio vinculado en session_drills! ID:", savedDrill.id);
  }

  // 3. Consultar la sesión con el join de metodología
  const { data: fullSession, error: fErr } = await supabase
    .from("training_sessions")
    .select(`
      *,
      teams ( id, name, category ),
      session_drills (
        id, drill_id, phase, order_index, duration_min,
        banco_ejercicios ( id, nombre, tipo )
      )
    `)
    .eq("id", savedSession.id)
    .single();

  if (fErr) {
    console.error("❌ Error al consultar sesión completa:", fErr);
  } else {
    console.log("✅ Sesión completa recuperada:");
    console.log("   Título:", fullSession.title);
    console.log("   Equipo:", fullSession.teams?.name);
    console.log("   Drills vinculados:", fullSession.session_drills?.length);
    console.log("   Primer drill:", fullSession.session_drills?.[0]?.banco_ejercicios?.nombre);
  }

  // 4. Limpieza
  await supabase.from("session_drills").delete().eq("session_id", savedSession.id);
  await supabase.from("training_sessions").delete().eq("id", savedSession.id);
  console.log("✅ Limpieza completada con éxito.");
}

testSessionSave().catch(console.error);
