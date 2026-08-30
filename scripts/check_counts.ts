process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkCatalogCount() {
  const { count, error } = await supabase
    .from("banco_ejercicios")
    .select("*", { count: "exact", head: true });

  console.log("Count in banco_ejercicios:", count, error);

  // Check if there are other tables like drills, session_drills, etc.
  const { data: tables } = await supabase
    .rpc("get_table_names")
    .then((res: any) => res, () => ({ data: null }));
  
  // Let's also check if there is a backup or migration file with the 86 exercises
}
checkCatalogCount();
