process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function getClubId() {
  const testPlayerId = "a6c722b3-d9cb-4723-98c8-96bfeafee762"; // Jhon Franco Elias
  const clubId = "7ff5dbeb-2942-4576-8e74-b45a17646fb7";

  const { data: player, error: pErr } = await supabase
    .from("players")
    .select("id, club_id, first_name, last_name")
    .eq("id", testPlayerId)
    .single();

  console.log("Player check:", player, "Error:", pErr);

  // Check RLS or insert
  const { data: insertTest, error: insErr } = await supabase
    .from("player_injuries")
    .insert([{
      club_id: clubId,
      player_id: testPlayerId,
      injury_date: "2026-09-01",
      injury_type: "Sobrecarga",
      status: "activa"
    }])
    .select();

  console.log("Insert test:", insertTest, "Error:", insErr);

  if (insertTest && insertTest.length > 0) {
    // Delete test record
    await supabase.from("player_injuries").delete().eq("id", insertTest[0].id);
    console.log("Cleaned up test record.");
  }
}
getClubId();

