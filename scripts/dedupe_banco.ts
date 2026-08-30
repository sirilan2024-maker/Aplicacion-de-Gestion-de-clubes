process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

async function dedupeBanco() {
  const { data: rows } = await supabase
    .from("banco_ejercicios")
    .select("id, nombre, created_at")
    .order("created_at", { ascending: true });

  if (!rows) return;

  const seen = new Map<string, string>();
  const duplicateIds: string[] = [];

  for (const r of rows) {
    const key = (r.nombre || "").trim().toLowerCase();
    if (seen.has(key)) {
      duplicateIds.push(r.id);
    } else {
      seen.set(key, r.id);
    }
  }

  console.log(`Found ${duplicateIds.length} duplicate rows out of ${rows.length} total.`);

  if (duplicateIds.length > 0) {
    const { error } = await supabase.from("banco_ejercicios").delete().in("id", duplicateIds);
    if (error) console.error("Error deleting duplicates:", error);
    else console.log(`Deleted ${duplicateIds.length} duplicates successfully.`);
  }

  const { count } = await supabase.from("banco_ejercicios").select("*", { count: "exact", head: true });
  console.log(`Current official banco_ejercicios count: ${count} (expected: 199)`);
}

dedupeBanco().catch(console.error);
