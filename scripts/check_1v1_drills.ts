process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import { evaluatePureTacticalAffinity } from "../src/lib/methodology/tacticalEngine/tacticalAffinityEngine";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check1v1Drills() {
  const { data: catalog } = await supabase.from("banco_ejercicios").select("*");
  if (!catalog) return;

  const matches = catalog.filter(ex => {
    const str = `${ex.nombre} ${JSON.stringify(ex.tags)} ${JSON.stringify(ex.objetivo_tactico)} ${JSON.stringify(ex.objetivo_tecnico)} ${ex.descripcion}`.toLowerCase();
    return str.includes("1v1") || str.includes("1c1") || str.includes("1 contra 1") || str.includes("duelo") || str.includes("desborde") || str.includes("regate") || str.includes("progresion");
  });

  console.log(`Total matching exercises: ${matches.length}`);
  matches.forEach(ex => {
    const aff = evaluatePureTacticalAffinity(ex, { name: "progresion", game_phase: "progresion" });
    console.log(`\n- "${ex.nombre}" (ID: ${ex.id})`);
    console.log(`  bloque: ${ex.bloque_sesion} | tipo: ${ex.tipo} | game_phase: ${ex.game_phase} | representatividad: ${ex.representatividad} | oposicion: ${ex.oposicion}`);
    console.log(`  categoria_edad: ${JSON.stringify(ex.categoria_edad || ex.age_category)}`);
    console.log(`  objetivo_tactico: ${JSON.stringify(ex.objetivo_tactico)}`);
    console.log(`  tags: ${JSON.stringify(ex.tags)}`);
    console.log(`  PureTacticalAffinity with "progresion": ${aff ? `${aff.affinityType} (score: ${aff.tacticalScore}, reasons: ${aff.reasons?.join(", ") || "N/A"})` : "NONE / UNDEFINED"}`);
  });
}

check1v1Drills();
