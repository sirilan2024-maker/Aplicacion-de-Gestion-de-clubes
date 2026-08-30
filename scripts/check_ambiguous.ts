process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkAmbiguous() {
  const { data: exercises } = await supabase.from("banco_ejercicios").select("*");
  if (!exercises) return;

  const noBlock = exercises.filter(ex => !ex.bloque_sesion);
  for (const ex of noBlock) {
    const raw = `${ex.nombre} ${ex.tipo} ${ex.game_phase} ${ex.descripcion}`;
    if (!ex.tipo && !ex.game_phase) {
      console.log("Completamente ambiguo:", ex.id, ex.nombre);
    }
  }
}
checkAmbiguous();
