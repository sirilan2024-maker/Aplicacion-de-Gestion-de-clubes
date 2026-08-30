process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || anonKey;

const supabaseAdmin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
const supabaseAnon = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });

async function checkRLS() {
  console.log("=== CHECK RLS ON METHODOLOGY TABLES ===");

  // 1. Admin query
  const { data: adminPrinciples, error: adminErr } = await supabaseAdmin
    .from("methodology_principles")
    .select("id, name, game_phase, club_id");
  console.log(`Admin query on methodology_principles: Count = ${adminPrinciples?.length}, Error =`, adminErr);

  // 2. Anon query (what client browser sees before/if session token is missing or if RLS restricts)
  const { data: anonPrinciples, error: anonErr } = await supabaseAnon
    .from("methodology_principles")
    .select("id, name, game_phase, club_id");
  console.log(`Anon query on methodology_principles: Count = ${anonPrinciples?.length}, Error =`, anonErr);

  // Check RLS policies on methodology_principles
  const { data: policies, error: polErr } = await supabaseAdmin
    .from("pg_policies")
    .select("*")
    .eq("tablename", "methodology_principles");
  console.log("RLS policies on methodology_principles:", policies, polErr);

  // Check clubs and user profiles
  const { data: clubs } = await supabaseAdmin.from("clubs").select("id, name");
  console.log("Clubs in DB:", clubs);

  const { data: profiles } = await supabaseAdmin.from("profiles").select("id, email, role, club_id").limit(5);
  console.log("Sample profiles:", profiles);
}

checkRLS().catch(console.error);
