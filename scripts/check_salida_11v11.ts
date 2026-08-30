process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import { evaluatePureTacticalAffinity } from "../src/lib/methodology/tacticalEngine/tacticalAffinityEngine";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkSalidaBalon11v11() {
  const { data } = await supabase.from("banco_ejercicios").select("*").ilike("nombre", "%11v11%").limit(5);
  data?.forEach(d => {
    console.log(`- "${d.nombre}"`);
    console.log(`  objetivo_tactico:`, d.objetivo_tactico);
    console.log(`  game_phase:`, d.game_phase);
    const aff = evaluatePureTacticalAffinity(d, { name: "progresion", game_phase: "progresion" });
    console.log(`  aff reasons:`, aff?.evidence);
  });
}

checkSalidaBalon11v11();
