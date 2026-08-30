process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import { SessionPlannerService } from "../src/lib/methodology/sessionGenerator/sessionPlannerService";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function test1v1Senior() {
  const { data: catalog } = await supabase.from("banco_ejercicios").select("*");
  if (!catalog) return;

  const planner = SessionPlannerService.getInstance();
  const prompt = "1v1 para Senior, 75 minutos.";

  console.log("================================================================================");
  console.log(`GENERANDO SESIÓN: "${prompt}"`);
  console.log("================================================================================\n");

  const res = await planner.generateSession(prompt, catalog);
  const s = res.session;

  if (!s) {
    console.error("Error al generar:", res.error);
    return;
  }

  console.log(`- Bloques: ${s.drills.length} / 5`);
  console.log(`- Duración: ${s.calculatedDurationMinutes} / 75 min`);
  console.log(`- Coherencia: ${s.coherenceScore}%`);
  console.log(`- Cadena válida: ${s.pedagogicalChainValid}`);
  console.log(`- Objetivo: "${s.intent.primaryObjective}"`);
  console.log(`- Categoría: "${s.intent.ageCategory}"`);
  console.log(`- Jugadores: ${s.intent.players ?? "undefined (correcto)"}`);

  console.log("\nDETALLE DE BLOQUES ELEGIDOS:");
  s.drills.forEach((d, idx) => {
    const e = d.exercise;
    console.log(`\nBloque ${idx + 1}: [${d.phase.toUpperCase()}] "${e.nombre}" (${d.allocatedDurationMin} min)`);
    console.log(`  - Tipo: ${e.tipo} | Bloque catálogo: ${e.bloque_sesion} | Game Phase: ${e.game_phase}`);
    console.log(`  - Carga física: ${e.carga_fisica} | Oposición: ${e.oposicion} | Representatividad: ${e.representatividad}`);
    console.log(`  - Categoría: ${JSON.stringify(e.categoria_edad || e.age_category)}`);
    console.log(`  - Objetivo táctico: ${JSON.stringify(e.objetivo_tactico)}`);
    console.log(`  - Justificación: ${d.selectionRationale}`);
  });
}

test1v1Senior();
