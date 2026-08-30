process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkCooldowns() {
  const { data: drills } = await supabase
    .from("banco_ejercicios")
    .select("id, nombre, bloque_sesion, carga_fisica, oposicion, tipo")
    .or("bloque_sesion.eq.vuelta_calma,tipo.ilike.%calma%,tipo.ilike.%estiramiento%,tipo.ilike.%ludico%");

  console.log("Cooldown candidates in DB:", drills);
}
checkCooldowns();
