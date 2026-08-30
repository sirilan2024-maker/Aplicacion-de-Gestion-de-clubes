// ============================================================================
// BLINDAJE DE SEGURIDAD CONTRA EJECUCIÓN ACCIDENTAL EN PRODUCCIÓN (P17-C9)
// ============================================================================
if (process.env.NODE_ENV === 'production' || process.env.ALLOW_SEED_EXECUTION !== 'true') {
  console.error('\n[SEGURIDAD CRÍTICA] Ejecución abortada.');
  console.error('Este script genera datos de prueba/seed y está terminantemente PROHIBIDO en producción.');
  console.error('Para ejecutarlo en un entorno de desarrollo aislado, define explícitamente:');
  console.error('  ALLOW_SEED_EXECUTION=true y asegúrate de no apuntar a producción.\n');
  process.exit(1);
}

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
  const { data: existing } = await supabase.from("banco_ejercicios").select("nombre");
  console.log(`Current existing count: ${existing?.length}`);
  
  const seed1 = fs.readFileSync("supabase/migrations/20260819_library_seed.sql", "utf8");
  await supabase.rpc("execute_sql_query", { query_text: seed1 });

  const { count } = await supabase.from("banco_ejercicios").select("*", { count: "exact", head: true });
  console.log(`Updated count: ${count}`);

  // Deduplicate if any exact name was duplicated
  const { data: allRows } = await supabase.from("banco_ejercicios").select("id, nombre, created_at").order("created_at", { ascending: true });
  const seen = new Set<string>();
  const toDelete: string[] = [];
  for (const r of allRows || []) {
    const norm = (r.nombre || "").trim().toLowerCase();
    if (seen.has(norm)) {
      toDelete.push(r.id);
    } else {
      seen.add(norm);
    }
  }

  if (toDelete.length > 0) {
    await supabase.from("banco_ejercicios").delete().in("id", toDelete);
    console.log(`Deduplicated ${toDelete.length} rows.`);
  }

  const { count: finalCount } = await supabase.from("banco_ejercicios").select("*", { count: "exact", head: true });
  console.log(`Final official banco_ejercicios count: ${finalCount}`);
}

main().catch(console.error);
