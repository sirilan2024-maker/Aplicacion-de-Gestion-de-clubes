process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function identifyExercises() {
  const { data: exercises, error } = await supabase
    .from("banco_ejercicios")
    .select("id, nombre, created_at, tipo, bloque_sesion, game_phase, age_category, categoria_edad")
    .order("created_at", { ascending: true });

  if (error || !exercises) {
    console.error("Error:", error);
    return;
  }

  console.log(`Total exercises: ${exercises.length}`);

  // Group by created_at date
  const byDate: Record<string, number> = {};
  exercises.forEach(ex => {
    const d = ex.created_at ? ex.created_at.split("T")[0] : "no_date";
    byDate[d] = (byDate[d] || 0) + 1;
  });
  console.log("Distribution by creation date:");
  console.table(byDate);
}
identifyExercises();
