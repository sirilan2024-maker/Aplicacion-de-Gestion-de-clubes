process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { SessionRequestParser } from "../src/lib/methodology/sessionGenerator/sessionRequestParser";
import { PedagogicalProgressionEngine } from "../src/lib/methodology/sessionGenerator/pedagogicalProgressionEngine";
import { scoreExercise, isExerciseSelectableForBlock } from "../src/lib/methodology/recommendationEngine";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: catalog } = await supabase.from("banco_ejercicios").select("*");
  const parsed = SessionRequestParser.parse("1v1 para Senior, 75 minutos.");
  const progEngine = PedagogicalProgressionEngine.getInstance();

  console.log("=== Diagnóstico de B1 (activacion) para 1v1 ===");
  const ctx = { category: parsed.ageCategory, objective: parsed.primaryObjective, durationMinutes: 75, targetBlock: "activacion" as any };

  // Top 5 por pedagogicalScore
  const scored = catalog!.map(ex => {
    const scoreResult = scoreExercise(ex, ctx);
    const sel = isExerciseSelectableForBlock(scoreResult, ctx);
    const prog = progEngine.scoreCandidate(ex, "activacion", parsed);
    return { ex, scoreResult, sel, prog };
  }).sort((a, b) => b.prog.totalScore - a.prog.totalScore);

  console.log("\nTop 5 por progScore:");
  scored.slice(0, 5).forEach((c, i) => {
    console.log(`  ${i+1}. "${c.ex.nombre}" progScore=${c.prog.totalScore} sel=${c.sel}`);
    console.log(`     bloque_sesion="${c.ex.bloque_sesion}" score=${c.scoreResult.score} blockSuit=${c.scoreResult.breakdown.blockSuitability} catMatch=${c.scoreResult.breakdown.categoryMatch}`);
  });

  // Quién realmente selecciona el planner para activacion?
  const selectableCandidates = scored.filter(c => c.sel);
  console.log(`\nCandidatos seleccionables para activacion: ${selectableCandidates.length}`);
  selectableCandidates.slice(0, 3).forEach((c, i) => {
    console.log(`  ${i+1}. "${c.ex.nombre}" progScore=${c.prog.totalScore}`);
  });

  // What does the session planner actually pick for B1?
  const { SessionPlannerService } = await import("../src/lib/methodology/sessionGenerator/sessionPlannerService");
  const planner = SessionPlannerService.getInstance();
  const res = await planner.generateSession("1v1 para Senior, 75 minutos.", catalog!);
  if (res.session) {
    const b1 = res.session.drills[0];
    const b1ex = b1.exercise;
    console.log(`\nActual B1 selected by planner: "${b1ex.nombre}"`);
    console.log(`  bloque_sesion="${b1ex.bloque_sesion}" game_phase="${b1ex.game_phase}" rep=${b1ex.representatividad} opo=${b1ex.oposicion}`);
    // Verify selectability with the SAME context used by the planner
    const b1ctx = { category: parsed.ageCategory, objective: parsed.primaryObjective, durationMinutes: 75, targetBlock: "activacion" as any };
    const b1Score = scoreExercise(b1ex, b1ctx);
    const b1Sel = isExerciseSelectableForBlock(b1Score, b1ctx);
    console.log(`  isSelectable (with activacion ctx): ${b1Sel}`);
    console.log(`  score=${b1Score.score} blockSuitability=${b1Score.breakdown.blockSuitability} catMatch=${b1Score.breakdown.categoryMatch}`);
  }
}

main().catch(console.error);
