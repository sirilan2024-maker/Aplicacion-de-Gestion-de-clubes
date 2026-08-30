process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import { evaluatePureTacticalAffinity } from "../src/lib/methodology/tacticalEngine/tacticalAffinityEngine";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function testWithWordBoundaries() {
  const { data: catalog } = await supabase.from("banco_ejercicios").select("*");
  if (!catalog) return;

  const ex11v11 = catalog.find(e => e.nombre.includes("11v11"));
  const ex1v1Global = catalog.find(e => e.nombre.includes("Zonas de Desborde 1v1"));
  const ex6v6 = catalog.find(e => e.nombre.includes("6v6+1 Comodín"));
  const exAcciones1c1 = catalog.find(e => e.nombre.includes("Acciones de 1c1"));

  console.log("11v11 affinity with word boundary check:");
  console.log("Salida 11v11:", evaluatePureTacticalAffinity(ex11v11, { name: "progresion", game_phase: "progresion" }));

  console.log("\nZonas de Desborde 1v1 (B4 Global):", evaluatePureTacticalAffinity(ex1v1Global, { name: "progresion", game_phase: "progresion" }));
  console.log("\n6v6+1 Comodín (B3/B4):", evaluatePureTacticalAffinity(ex6v6, { name: "progresion", game_phase: "progresion" }));
  console.log("\nAcciones de 1c1 rápidas (B2):", evaluatePureTacticalAffinity(exAcciones1c1, { name: "progresion", game_phase: "progresion" }));
}

testWithWordBoundaries();
