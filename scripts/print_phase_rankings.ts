process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import { evaluatePureTacticalAffinity } from "../src/lib/methodology/tacticalEngine/tacticalAffinityEngine";
import { PedagogicalProgressionEngine } from "../src/lib/methodology/sessionGenerator/pedagogicalProgressionEngine";
import { SessionRequestParser } from "../src/lib/methodology/sessionGenerator/sessionRequestParser";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function printPhaseRankings() {
  const { data: catalog } = await supabase.from("banco_ejercicios").select("*");
  if (!catalog) return;

  const prompt = "1v1 para Senior, 75 minutos.";
  const intent = SessionRequestParser.parse(prompt);
  const progEngine = PedagogicalProgressionEngine.getInstance();

  for (const phase of ["activacion", "principal_1", "principal_2", "global"]) {
    console.log(`\n================================================================================`);
    console.log(`RANKING DETALLADO PARA ${phase.toUpperCase()}`);
    console.log(`================================================================================`);

    const scored = catalog.map(ex => {
      const pureAff = evaluatePureTacticalAffinity(ex, { name: intent.primaryObjective, game_phase: intent.primaryObjective });
      const breakdown = progEngine.scoreCandidate(ex, phase as any, intent);
      return { ex, pureAff, breakdown };
    });

    scored.sort((a, b) => b.breakdown.totalScore - a.breakdown.totalScore);

    scored.slice(0, 5).forEach((item, idx) => {
      const e = item.ex;
      const b = item.breakdown;
      const aff = item.pureAff;
      console.log(`\n#${idx + 1} [Score: ${b.totalScore}] "${e.nombre}"`);
      console.log(`   - Bloque: ${e.bloque_sesion} | Tipo: ${e.tipo} | Game Phase: ${e.game_phase}`);
      console.log(`   - Carga: ${e.carga_fisica} | Oposicion: ${e.oposicion} | Representatividad: ${e.representatividad} | Cat: ${JSON.stringify(e.categoria_edad || e.age_category)}`);
      console.log(`   - PureAffinity: ${aff?.affinityType} (score: ${aff?.tacticalScore})`);
      console.log(`   - ObjFit: ${b.objectiveFit} | CatFit: ${b.categoryFit} | PedagFit: ${b.pedagogicalFit} | RepFit: ${b.representationFit}`);
    });
  }
}

printPhaseRankings();
