process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

async function inspectExerciseData() {
  const { data: exercises, error } = await supabase
    .from("banco_ejercicios")
    .select("*");

  if (error || !exercises) {
    console.error("Error fetching exercises:", error);
    return;
  }

  console.log(`Total exercises: ${exercises.length}`);

  // Inspect age_category distribution
  const ageCatDist: Record<string, number> = {};
  const categoriaEdadDist: Record<string, number> = {};
  const dificultadDist: Record<string, number> = {};
  const tipoDist: Record<string, number> = {};
  const playersDist: Record<string, number> = {};

  exercises.forEach(e => {
    const ac = e.age_category || "NULL";
    ageCatDist[ac] = (ageCatDist[ac] || 0) + 1;

    if (e.categoria_edad) {
      e.categoria_edad.forEach((ce: string) => {
        categoriaEdadDist[ce] = (categoriaEdadDist[ce] || 0) + 1;
      });
    }

    const dif = e.dificultad ?? "NULL";
    dificultadDist[dif] = (dificultadDist[dif] || 0) + 1;

    const t = e.tipo || "NULL";
    tipoDist[t] = (tipoDist[t] || 0) + 1;

    const p = `${e.min_players || '?'}-${e.max_players || '?'}`;
    playersDist[p] = (playersDist[p] || 0) + 1;
  });

  console.log("\nDistribution of age_category:", ageCatDist);
  console.log("\nDistribution of categoria_edad elements:", categoriaEdadDist);
  console.log("\nDistribution of dificultad:", dificultadDist);
  console.log("\nDistribution of tipo:", tipoDist);
  console.log("\nSample 10 exercises with metadata:");
  exercises.slice(0, 10).forEach(e => {
    console.log({
      id: e.id,
      nombre: e.nombre,
      tipo: e.tipo,
      age_category: e.age_category,
      categoria_edad: e.categoria_edad,
      dificultad: e.dificultad,
      min_players: e.min_players,
      max_players: e.max_players,
      carga_cognitiva: e.carga_cognitiva,
      oposicion: e.oposicion,
      representatividad: e.representatividad,
      espacio: e.espacio,
      game_phase: e.game_phase
    });
  });
}

inspectExerciseData().catch(console.error);
