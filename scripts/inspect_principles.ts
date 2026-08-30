process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

async function inspectAllPrinciples() {
  const { data: principles } = await supabase.from("methodology_principles").select("id, name, game_phase, description");
  console.log(`Total principles in DB: ${principles?.length}`);
  const unique = new Map<string, any>();
  principles?.forEach(p => {
    const key = `${p.game_phase} -> ${p.name}`;
    if (!unique.has(key)) unique.set(key, p);
  });
  console.log(`Unique (Phase -> Name) combinations (${unique.size}):`);
  Array.from(unique.entries()).forEach(([key, p]) => {
    console.log(`- [${p.game_phase}] "${p.name}"`);
  });
}

inspectAllPrinciples().catch(console.error);
