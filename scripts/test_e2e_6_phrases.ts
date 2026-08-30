process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import { SessionPlannerService } from "../src/lib/methodology/sessionGenerator/sessionPlannerService";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const phrases = [
  "Sesión de posesión y circulación para Infantil, 75 minutos.",
  "Sesión de finalización y remate para Senior, 75 minutos.",
  "Sesión de presión alta para Senior, 75 minutos.",
  "Sesión de presión tras pérdida para Senior, 75 minutos.",
  "Sesión de progresión y duelos 1v1 para Senior, 75 minutos.",
  "1v1 para Senior, 75 minutos."
];

async function testFullGeneration() {
  const { data: catalog, error } = await supabase.from("banco_ejercicios").select("*");
  if (error || !catalog) {
    console.error("Error loading catalog:", error);
    return;
  }

  const planner = SessionPlannerService.getInstance();

  console.log("================================================================================");
  console.log("PRUEBA E2E: GENERACIÓN DE LAS 6 FRASES DE PRUEBA");
  console.log("================================================================================\n");

  for (let i = 0; i < phrases.length; i++) {
    const p = phrases[i];
    console.log(`\n================================================================================`);
    console.log(`[PRUEBA ${i + 1}/6] "${p}"`);
    console.log(`================================================================================`);

    const res = await planner.generateSession(p, catalog);
    const session = res.session;

    if (!session) {
      console.error("❌ Error: no se generó sesión:", res.error);
      continue;
    }

    console.log(`- Bloques generados: ${session.drills.length} / 5`);
    console.log(`- Duración total calculada: ${session.calculatedDurationMinutes} / ${session.totalDurationMinutes} min`);
    console.log(`- Coherencia metodológica: ${session.coherenceScore}%`);
    console.log(`- Cadena pedagógica válida: ${session.pedagogicalChainValid}`);
    console.log(`- Éxito general: ${res.success}`);
    console.log(`- Objetivo canónico interpretado: "${session.intent.primaryObjective}"`);
    console.log(`- Categoría interpretada: "${session.intent.ageCategory}"`);
    console.log(`- Jugadores interpretados: ${session.intent.players ?? "undefined (correcto)"}`);

    console.log("\nDetalle de Bloques:");
    session.drills.forEach((d, idx) => {
      console.log(`  ${idx + 1}. [${d.phase}] ${d.exercise?.nombre} (${d.allocatedDurationMin} min)`);
      console.log(`     Tipo: ${d.exercise?.tipo} | Bloque: ${d.exercise?.bloque_sesion} | Carga: ${d.exercise?.carga_fisica} | Opo: ${d.exercise?.oposicion} | Rep: ${d.exercise?.representatividad}`);
      console.log(`     Justificación: ${d.selectionRationale}`);
    });
  }
}

testFullGeneration();
