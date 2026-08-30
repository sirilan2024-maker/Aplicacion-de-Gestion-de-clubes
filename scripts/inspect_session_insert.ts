process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

async function inspectColumns() {
  const { data: team } = await supabase.from("teams").select("id, club_id").limit(1).single();
  console.log("Found team:", team);

  // Test inserting with exact schema
  const insertPayload = {
    club_id: team?.club_id,
    team_id: team?.id,
    title: "Test Session Insertion",
    date: new Date().toISOString().split("T")[0],
    start_time: "18:00:00",
    age_category: "alevin",
    microcycle_day: "MD-3",
    intensity_load: 3,
    objective: "Test Objective",
    objectives_secondary: ["Sec 1"],
    num_players: 16,
    num_goalkeepers: 2,
    available_space: "Campo completo",
    available_material: ["Balones", "Petos"],
    estimated_load: 65,
    is_completed: false,
    coach_notes: "Test Notes"
  };

  const { data, error } = await supabase.from("training_sessions").insert(insertPayload).select().single();
  if (error) {
    console.error("Insert error:", error);
  } else {
    console.log("Insert success! Row:", data);
    await supabase.from("training_sessions").delete().eq("id", data.id);
    console.log("Cleanup success!");
  }
}

inspectColumns().catch(console.error);
