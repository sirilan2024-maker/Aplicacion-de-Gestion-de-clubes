process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

async function checkExercises() {
  const { data: exercises, error } = await supabase.from("banco_ejercicios").select("id, nombre, game_phase, age_category, categoria_edad, tags, objetivo_tactico, bloque_sesion, tipo");
  if (error) {
    console.error("Error:", error);
    return;
  }
  console.log("Total exercises in banco_ejercicios:", exercises?.length);
  
  // Game phases distribution
  const phaseCounts: Record<string, number> = {};
  const ageCounts: Record<string, number> = {};

  exercises?.forEach((e) => {
    const phase = e.game_phase || "none";
    phaseCounts[phase] = (phaseCounts[phase] || 0) + 1;

    const age = e.age_category || "none";
    ageCounts[age] = (ageCounts[age] || 0) + 1;
  });

  console.log("Game Phase distribution:", phaseCounts);
  console.log("Age Category distribution:", ageCounts);
}

checkExercises().catch(console.error);
