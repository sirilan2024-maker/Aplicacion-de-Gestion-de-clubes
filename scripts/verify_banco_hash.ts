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

const EXPECTED_HASH = "aaef86e3f8a65599abba624226d9394f609bed7c819ee3d3e6df5f136ba6d927";

async function verifyBancoHash() {
  const { data: rows, error } = await supabase
    .from("banco_ejercicios")
    .select("id, nombre, tipo, duracion_recomendada")
    .order("id", { ascending: true });

  if (error) {
    console.error("Error al consultar banco_ejercicios:", error);
    return;
  }

  console.log(`Total registros en banco_ejercicios: ${rows?.length}`);
  const payload = JSON.stringify(rows);
  const hash = crypto.createHash("sha256").update(payload).digest("hex");
  console.log(`SHA256 calculado: ${hash}`);
  console.log(`SHA256 esperado:  ${EXPECTED_HASH}`);

  // Verificar invariante de 199 ejercicios
  if (rows?.length === 199) {
    console.log("✅ INVARIANTE VERIFICADO: EXACTAMENTE 199 EJERCICIOS EN BANCO_EJERCICIOS.");
  } else {
    console.error(`❌ INVARIANTE VIOLADO: ${rows?.length} != 199`);
  }
}

verifyBancoHash().catch(console.error);
