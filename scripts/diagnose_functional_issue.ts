process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import { SessionPlannerService } from "../src/lib/methodology/sessionGenerator/sessionPlannerService";
import { SessionRequestParser } from "../src/lib/methodology/sessionGenerator/sessionRequestParser";
import { evaluatePureTacticalAffinity } from "../src/lib/methodology/tacticalEngine/tacticalAffinityEngine";
import { PedagogicalProgressionEngine } from "../src/lib/methodology/sessionGenerator/pedagogicalProgressionEngine";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function diagnose() {
  const { data: catalog } = await supabase.from("banco_ejercicios").select("*");
  if (!catalog) return;

  const prompts = [
    "Sesión de posesión y circulación para Infantil",
    "Sesión de presión tras pérdida para Senior, 75 minutos",
    "Sesión de presión alta para Senior, 75 minutos"
  ];

  const service = SessionPlannerService.getInstance();
  const progEngine = PedagogicalProgressionEngine.getInstance();

  for (const p of prompts) {
    console.log("================================================================================");
    console.log(`PROMPT: "${p}"`);
    const intent = SessionRequestParser.parse(p);
    console.log("Parsed Intent:", {
      primaryObjective: intent.primaryObjective,
      ageCategory: intent.ageCategory,
      durationMinutes: intent.durationMinutes,
      players: intent.players
    });

    const res = await service.generateSession(p, catalog);
    const session = res.session;
    if (session) {
      console.log(`RESULT: ${session.drills.length} bloques / ${session.calculatedDurationMinutes} min | Coherence: ${session.coherenceScore}% | ChainValid: ${session.pedagogicalChainValid}`);
      session.drills.forEach(d => {
        console.log(`  - [${d.phase}] ${d.exercise?.nombre} (${d.allocatedDurationMin} min) | Score: ${d.matchScore}`);
      });
    }

    // Diagnosticar candidatos para cada fase
    console.log("\n--- DIAGNÓSTICO DE CANDIDATOS POR FASE ---");
    const phases = ["activacion", "principal_1", "principal_2", "global", "vuelta_calma"];
    for (const ph of phases) {
      const candidates = catalog.map(ex => {
        const score = progEngine.scoreCandidate(ex, ph as any, intent);
        return { ex, score };
      }).filter(c => c.score.totalScore > 30);

      console.log(`Fase ${ph}: ${candidates.length} candidatos con score > 30`);
      if (candidates.length === 0) {
        // Ver por qué fueron descartados los que tienen afinidad
        const affinityExs = catalog.filter(ex => {
          const aff = evaluatePureTacticalAffinity(ex, { name: intent.primaryObjective, game_phase: intent.primaryObjective });
          return aff && aff.hasMeaningfulAffinity;
        });
        console.log(`  Total ejercicios en catálogo con afinidad táctica a "${intent.primaryObjective}": ${affinityExs.length}`);
        affinityExs.slice(0, 5).forEach(ex => {
          const sc = progEngine.scoreCandidate(ex, ph as any, intent);
          console.log(`    * "${ex.nombre}" (bloque: ${ex.bloque_sesion}, tipo: ${ex.tipo}, edad: ${JSON.stringify(ex.categoria_edad || ex.age_category)}): totalScore=${sc.totalScore}`);
          console.log(`      reasons: ${sc.reasons.join(" | ")}`);
        });
      }
    }
  }
}

diagnose();
