process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

async function inspectTrainingSessions() {
  const { data, error } = await supabase.from("training_sessions").select("*").limit(1);
  if (error) {
    console.error("Error al consultar training_sessions:", error);
    return;
  }
  console.log("Columnas de training_sessions:");
  if (data && data.length > 0) {
    console.log(Object.keys(data[0]));
  } else {
    console.log("Tabla vacía. Consultando columnas vía schema query...");
  }
}

inspectTrainingSessions().catch(console.error);
