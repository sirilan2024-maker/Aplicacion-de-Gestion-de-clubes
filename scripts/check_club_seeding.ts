process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

async function checkClubSeeding() {
  const { data: clubs } = await supabase.from("clubs").select("id, name");
  console.log("Found clubs:", clubs);

  for (const club of (clubs || [])) {
    const { data: curr } = await supabase.from("methodology_curriculum").select("id").eq("club_id", club.id);
    const { data: princ } = await supabase.from("methodology_principles").select("id").eq("club_id", club.id);
    console.log(`Club: '${club.name}' (${club.id}) => Curricula: ${curr?.length || 0}, Principles: ${princ?.length || 0}`);
  }
}

checkClubSeeding().catch(console.error);
