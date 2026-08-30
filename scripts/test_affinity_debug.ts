process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import { evaluatePureTacticalAffinity, getPrincipleTaxonomyKey, normalizeText } from "../src/lib/methodology/tacticalEngine/tacticalAffinityEngine";
import { SessionPlannerService } from "../src/lib/methodology/sessionGenerator/sessionPlannerService";
import { generateMethodologySessionProposal } from "../src/lib/methodology/methodologySessionGenerator";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function testAffinity() {
  const { data: catalog } = await supabase.from("banco_ejercicios").select("*");
  if (!catalog) return;

  const testObjectives = ["presión tras pérdida", "presión alta", "transición defensiva"];

  for (const obj of testObjectives) {
    console.log("================================================================================");
    console.log(`Testing objective: "${obj}"`);
    console.log(`getPrincipleTaxonomyKey("${obj}") = "${getPrincipleTaxonomyKey(obj)}"`);

    const withAffinity = catalog.map(ex => {
      const aff = evaluatePureTacticalAffinity(ex, { name: obj, game_phase: obj });
      return { ex, aff };
    }).filter(item => item.aff && item.aff.hasMeaningfulAffinity);

    console.log(`Total exercises with affinity: ${withAffinity.length}`);
    withAffinity.forEach(item => {
      console.log(`  * "${item.ex.nombre}" (bloque: ${item.ex.bloque_sesion}, tipo: ${item.ex.tipo}, cat: ${item.ex.age_category || item.ex.categoria_edad}) -> affinityType: ${item.aff?.affinityType}, score: ${item.aff?.tacticalScore}`);
    });
  }
}

testAffinity();
