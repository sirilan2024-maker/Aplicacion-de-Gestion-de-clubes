process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function getClubId() {
  const { data: ex } = await supabase.from("banco_ejercicios").select("club_id").limit(1);
  console.log("club_id in banco_ejercicios:", ex![0]?.club_id);
}
getClubId();
