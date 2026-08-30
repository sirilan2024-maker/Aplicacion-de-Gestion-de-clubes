process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

async function auditExerciseData() {
  const { data: exercises, error } = await supabase.from("banco_ejercicios").select("*");
  if (error || !exercises) {
    console.error("Error:", error);
    return;
  }

  console.log(`Total exercises: ${exercises.length}`);

  // Find exercises matching Querubín
  const u6Exercises = exercises.filter(e => e.age_category === "querubin" || (e.categoria_edad && e.categoria_edad.includes("querubin")));
  console.log(`\nU6 Querubín exercises (${u6Exercises.length}):`);
  u6Exercises.forEach(e => {
    console.log({
      id: e.id,
      nombre: e.nombre,
      tipo: e.tipo,
      objetivo_tactico: e.objetivo_tactico,
      objetivo_tecnico: e.objetivo_tecnico,
      descripcion: e.descripcion?.substring(0, 100),
      dificultad: e.dificultad,
      game_phase: e.game_phase
    });
  });
}

auditExerciseData().catch(console.error);
