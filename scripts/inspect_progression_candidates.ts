process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import { evaluatePureTacticalAffinity, getPrincipleTaxonomyKey } from "../src/lib/methodology/tacticalEngine/tacticalAffinityEngine";
import { PedagogicalProgressionEngine } from "../src/lib/methodology/sessionGenerator/pedagogicalProgressionEngine";
import { SessionRequestParser } from "../src/lib/methodology/sessionGenerator/sessionRequestParser";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function inspectProgressionCandidates() {
  const { data: catalog } = await supabase.from("banco_ejercicios").select("*");
  if (!catalog) return;

  const prompt = "1v1 para Senior, 75 minutos.";
  const intent = SessionRequestParser.parse(prompt);
  console.log("Intent:", intent);

  const progEngine = PedagogicalProgressionEngine.getInstance();

  const phases = ["activacion", "principal_1", "principal_2", "global", "vuelta_calma"];

  for (const phase of phases) {
    console.log(`\n================================================================================`);
    console.log(`CANDIDATOS PARA FASE: ${phase}`);
    console.log(`================================================================================`);

    const scored = catalog.map(ex => {
      const pureAff = evaluatePureTacticalAffinity(ex, { name: intent.primaryObjective, game_phase: intent.primaryObjective });
      const breakdown = progEngine.scoreCandidate(ex, phase as any, intent);
      return {
        ex,
        pureAff,
        breakdown
      };
    });

    scored.sort((a, b) => b.breakdown.totalScore - a.breakdown.totalScore);

    console.log(`Top 10 candidatos para ${phase}:`);
    scored.slice(0, 10).forEach((item, idx) => {
      const e = item.ex;
      const b = item.breakdown;
      const aff = item.pureAff;
      console.log(`${idx + 1}. [Score: ${b.totalScore}] "${e.nombre}"`);
      console.log(`   - Bloque: ${e.bloque_sesion} | Tipo: ${e.tipo} | Game Phase: ${e.game_phase}`);
      console.log(`   - Carga: ${e.carga_fisica} | Opo: ${e.oposicion} | Rep: ${e.representatividad} | Cat: ${JSON.stringify(e.categoria_edad || e.age_category)}`);
      console.log(`   - PureAff: ${aff?.affinityType} (score: ${aff?.tacticalScore}) | ObjFit: ${b.objectiveFit} | CatFit: ${b.categoryFit} | PedagFit: ${b.pedagogicalFit} | RepFit: ${b.representationFit}`);
      console.log(`   - Reasons: ${b.reasons.join(" | ")}`);
    });
  }
}

inspectProgressionCandidates();
