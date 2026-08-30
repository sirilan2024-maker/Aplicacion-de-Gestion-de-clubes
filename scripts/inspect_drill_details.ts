process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

async function main() {
  const { data } = await supabase.from("banco_ejercicios").select("*").ilike("nombre", "%Rondo%");
  console.log("Rondos in DB:");
  data?.forEach(d => {
    console.log({
      id: d.id,
      nombre: d.nombre,
      objetivo_tactico: d.objetivo_tactico,
      tags: d.tags,
      age_category: d.age_category,
      dificultad: d.dificultad,
      game_phase: d.game_phase
    });
  });
}

main().catch(console.error);
