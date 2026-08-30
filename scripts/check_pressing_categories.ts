process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import { evaluatePureTacticalAffinity } from "../src/lib/methodology/tacticalEngine/tacticalAffinityEngine";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkPressingCategories() {
  const { data: catalog } = await supabase.from("banco_ejercicios").select("*");
  if (!catalog) return;

  const pressing = catalog.filter(ex => {
    const affLoss = evaluatePureTacticalAffinity(ex, { name: "presión tras pérdida", game_phase: "presión tras pérdida" });
    const affHigh = evaluatePureTacticalAffinity(ex, { name: "presión alta", game_phase: "presión alta" });
    const affDef = evaluatePureTacticalAffinity(ex, { name: "transición defensiva", game_phase: "transición defensiva" });
    return (affLoss && affLoss.hasMeaningfulAffinity) || (affHigh && affHigh.hasMeaningfulAffinity) || (affDef && affDef.hasMeaningfulAffinity);
  });

  console.log(`Total pressing/transition exercises: ${pressing.length}`);
  pressing.forEach(p => {
    console.log(`- "${p.nombre}"`);
    console.log(`  id: ${p.id}`);
    console.log(`  bloque: ${p.bloque_sesion} | tipo: ${p.tipo} | representatividad: ${p.representatividad} | oposicion: ${p.oposicion}`);
    console.log(`  age_category: ${p.age_category} | categoria_edad: ${JSON.stringify(p.categoria_edad)}`);
  });
}

checkPressingCategories();
