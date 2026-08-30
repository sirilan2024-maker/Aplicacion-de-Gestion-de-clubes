process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

async function checkSessionDrillsConstraint() {
  const { data: team } = await supabase.from("teams").select("id, club_id").limit(1).single();
  if (!team) {
    console.error("No team found");
    return;
  }

  const { data: session, error: sErr } = await supabase.from("training_sessions").insert({
    club_id: team.club_id,
    team_id: team.id,
    title: "Test Session Phase",
    date: new Date().toISOString().split("T")[0],
    start_time: "18:00"
  }).select().single();

  if (sErr) {
    console.error("Session insert error:", sErr);
    return;
  }

  const { data: drill } = await supabase.from("banco_ejercicios").select("id").limit(1).single();

  const testPhases = ["activacion", "calentamiento", "warmup", "principal", "principal_1", "main_1", "global", "vuelta_calma", "cooldown"];

  for (const p of testPhases) {
    const { error } = await supabase.from("session_drills").insert({
      session_id: session.id,
      drill_id: drill?.id,
      phase: p,
      order_index: 0
    });
    if (error) {
      console.log(`Phase "${p}": ❌ ERROR: ${error.message}`);
    } else {
      console.log(`Phase "${p}": ✅ ALLOWED`);
      await supabase.from("session_drills").delete().eq("session_id", session.id);
    }
  }

  await supabase.from("training_sessions").delete().eq("id", session.id);
}

checkSessionDrillsConstraint().catch(console.error);
