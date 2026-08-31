process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function getClubId() {
  const { data: players, error } = await supabase.from("players").select("id, first_name, last_name, club_id, status");
  console.log("Total players:", players?.length, "error:", error);
  const clubCounts: Record<string, number> = {};
  players?.forEach(p => {
    const c = p.club_id || "NULL";
    clubCounts[c] = (clubCounts[c] || 0) + 1;
  });
  console.log("Players club_id counts:", clubCounts);

  const { data: injuries } = await supabase.from("player_injuries").select("id, player_id, club_id, injury_type, status");
  console.log("Total injuries in DB:", injuries?.length);
  console.log("Injured players:", injuries?.map(i => ({ player_id: i.player_id, type: i.injury_type, status: i.status })));
}
getClubId();

