process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function getSampleAndPrinciples() {
  const { data: sample } = await supabase.from("banco_ejercicios").select("*").limit(1);
  console.log("Sample columns:", Object.keys(sample![0]));

  const { data: principles } = await supabase.from("methodology_principles").select("id, name, game_phase");
  console.log("Principles in DB:", principles);
}

getSampleAndPrinciples();
