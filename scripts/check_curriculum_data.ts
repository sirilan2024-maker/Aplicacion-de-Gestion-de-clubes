import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: clubs } = await supabase.from("clubs").select("id, name");
  console.log("Clubs in DB:", clubs);

  const { data: curriculum, count: currCount } = await supabase.from("methodology_curriculum").select("*", { count: "exact" });
  console.log("Curriculums count:", currCount);
  if (curriculum && curriculum.length > 0) {
    console.log("Sample curriculum:", curriculum[0]);
  }

  const { data: principles, count: princCount } = await supabase.from("methodology_principles").select("*", { count: "exact" });
  console.log("Principles count:", princCount);

  const { data: subprinciples, count: subCount } = await supabase.from("methodology_subprinciples").select("*", { count: "exact" });
  console.log("Subprinciples count:", subCount);

  const { data: behaviours, count: behCount } = await supabase.from("methodology_behaviours").select("*", { count: "exact" });
  console.log("Behaviours count:", behCount);
}

main().catch(console.error);
