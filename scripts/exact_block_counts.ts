process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function printExactBlockCounts() {
  const { data: exercises } = await supabase.from("banco_ejercicios").select("id, bloque_sesion, created_at");
  if (!exercises) return;

  const counts: Record<string, number> = {};
  exercises.forEach(e => {
    const b = e.bloque_sesion === null ? "NULL" : String(e.bloque_sesion);
    counts[b] = (counts[b] || 0) + 1;
  });
  console.log("Conteo exacto en PostgreSQL de bloque_sesion:", counts);
}
printExactBlockCounts();
