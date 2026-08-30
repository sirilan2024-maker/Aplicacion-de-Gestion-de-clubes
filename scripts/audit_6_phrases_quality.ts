process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import { SessionPlannerService } from "../src/lib/methodology/sessionGenerator/sessionPlannerService";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const testCases = [
  { phrase: "Sesión de posesión y circulación para Infantil, 75 minutos.", expectedObj: "circulacion", cat: "infantil" },
  { phrase: "Sesión de finalización y remate para Senior, 75 minutos.", expectedObj: "finalizacion", cat: "senior" },
  { phrase: "Sesión de presión alta para Senior, 75 minutos.", expectedObj: "presion alta", cat: "senior" },
  { phrase: "Sesión de presión tras pérdida para Senior, 75 minutos.", expectedObj: "transicion defensiva", cat: "senior" },
  { phrase: "Sesión de progresión y duelos 1v1 para Senior, 75 minutos.", expectedObj: "progresion", cat: "senior" },
  { phrase: "1v1 para Senior, 75 minutos.", expectedObj: "progresion", cat: "senior" }
];

async function runAudit6Phrases() {
  const { data: catalog } = await supabase.from("banco_ejercicios").select("*");
  if (!catalog) return;

  const planner = SessionPlannerService.getInstance();

  console.log("================================================================================");
  console.log("AUDITORÍA P0: CALIDAD DE AFINIDAD TÁCTICA EN LAS 6 FRASES DE PRUEBA");
  console.log("================================================================================\n");

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    console.log(`\n================================================================================`);
    console.log(`[TEST ${i + 1}/6] "${tc.phrase}"`);
    console.log(`================================================================================`);

    const res = await planner.generateSession(tc.phrase, catalog);
    const s = res.session;

    if (!s) {
      console.error("❌ Falló la generación:", res.error);
      process.exit(1);
    }

    console.log(`- Objetivo detectado: "${s.intent.primaryObjective}" (esperado: "${tc.expectedObj}")`);
    console.log(`- Categoría: "${s.intent.ageCategory}" (esperado: "${tc.cat}")`);
    console.log(`- Jugadores: ${s.intent.players ?? "undefined (correcto)"}`);
    console.log(`- Bloques: ${s.drills.length}/5 | Minutos: ${s.calculatedDurationMinutes}/75 min | Coherencia: ${s.coherenceScore}%`);

    s.drills.forEach((d, idx) => {
      const e = d.exercise;
      console.log(`  ${idx + 1}. [${d.phase.toUpperCase()}] "${e.nombre}" (${d.allocatedDurationMin} min)`);
      console.log(`     Tipo: ${e.tipo} | Game Phase: ${e.game_phase} | Rep: ${e.representatividad} | Opo: ${e.oposicion} | Carga: ${e.carga_fisica}`);
      console.log(`     Obj Táctico: ${JSON.stringify(e.objetivo_tactico)}`);
    });
  }
}

runAudit6Phrases();
