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
  const { data, count } = await supabase
    .from("banco_ejercicios")
    .select("id, nombre, created_at", { count: "exact" })
    .order("created_at", { ascending: false });

  console.log(`Total banco_ejercicios count: ${count}`);
  console.log("Top 10 most recent:");
  data?.slice(0, 10).forEach((r, i) => {
    console.log(`${i + 1}. [${r.created_at}] ${r.id} -> ${r.nombre}`);
  });
}

main().catch(console.error);
