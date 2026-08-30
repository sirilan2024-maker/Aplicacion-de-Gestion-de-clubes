process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseAdmin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

async function checkUserClubMismatch() {
  const { data: profiles } = await supabaseAdmin.from("profiles").select("id, email, role, club_id");
  console.log("All profiles with club_id:", profiles);

  const { data: clubs } = await supabaseAdmin.from("clubs").select("id, name");
  console.log("All clubs:", clubs);

  const { data: currClubs } = await supabaseAdmin.from("methodology_curriculum").select("distinct club_id");
  console.log("Curriculum distinct club_ids:", currClubs);

  const { data: princClubs } = await supabaseAdmin.from("methodology_principles").select("distinct club_id");
  console.log("Principles distinct club_ids:", princClubs);
}

checkUserClubMismatch().catch(console.error);
