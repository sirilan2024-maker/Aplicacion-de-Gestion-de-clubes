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
  const { data: rows } = await supabase
    .from("banco_ejercicios")
    .select("id, nombre, created_at, fuente")
    .order("created_at", { ascending: false });

  console.log(`Total rows: ${rows?.length}`);
  console.log("Distribution by created_at date:");
  const byDate: Record<string, number> = {};
  rows?.forEach(r => {
    const d = r.created_at?.split("T")[0] || "unknown";
    byDate[d] = (byDate[d] || 0) + 1;
  });
  console.log(byDate);

  console.log("\nSample recent rows:");
  rows?.slice(0, 20).forEach((r, i) => {
    console.log(`${i+1}. [${r.created_at}] [${r.fuente}] ${r.nombre}`);
  });
}

main().catch(console.error);
