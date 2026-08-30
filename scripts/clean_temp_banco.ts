process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

async function cleanTemporaryRows() {
  const { data: tempRows } = await supabase
    .from("banco_ejercicios")
    .select("id, nombre, created_at")
    .gte("created_at", "2026-08-24T00:00:00.000Z");

  console.log(`Found ${tempRows?.length} temporary rows created on 2026-08-24 to remove.`);
  if (tempRows && tempRows.length > 0) {
    const ids = tempRows.map(r => r.id);
    const { error } = await supabase.from("banco_ejercicios").delete().in("id", ids);
    if (error) console.error("Error deleting:", error);
    else console.log(`Successfully removed ${ids.length} temporary rows.`);
  }

  const { count } = await supabase.from("banco_ejercicios").select("*", { count: "exact", head: true });
  console.log(`Official banco_ejercicios count: ${count} (expected: 199)`);
}

cleanTemporaryRows().catch(console.error);
