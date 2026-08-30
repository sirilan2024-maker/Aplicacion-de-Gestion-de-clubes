process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import fs from "fs";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

async function main() {
  const { count } = await supabase.from("banco_ejercicios").select("*", { count: "exact", head: true });
  console.log(`Current banco_ejercicios count: ${count}`);

  if (count !== 199) {
    console.log("Restoring to 199 using execute_sql_query or migration...");
    const seedSql = fs.readFileSync("supabase/migrations/20260819_library_seed.sql", "utf8");
    
    // Split SQL by INSERT INTO statements or execute through rpc
    const { error } = await supabase.rpc("execute_sql_query", { query_text: seedSql });
    if (error) {
      console.log("RPC error:", error.message);
    } else {
      console.log("Seed applied successfully.");
    }
  }

  const { count: finalCount } = await supabase.from("banco_ejercicios").select("*", { count: "exact", head: true });
  console.log(`Final banco_ejercicios count: ${finalCount}`);
}

main().catch(console.error);
