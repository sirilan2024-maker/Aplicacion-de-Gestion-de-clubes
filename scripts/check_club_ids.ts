process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseAdmin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

async function checkRowsClubId() {
  const { data: p } = await supabaseAdmin.from("methodology_principles").select("id, name, club_id").limit(10);
  console.log("Principles club_id:", p);

  const { data: c } = await supabaseAdmin.from("methodology_curriculum").select("id, category_code, club_id");
  console.log("Curriculum club_id:", c);
}

checkRowsClubId().catch(console.error);
