process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import { generateMethodologySessionProposal, validateSessionProposal } from "../src/lib/methodology/methodologySessionGenerator";
import { recommendExercises, scoreExercise } from "../src/lib/methodology/recommendationEngine";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function testProposalGenerator() {
  const { data: catalog } = await supabase.from("banco_ejercicios").select("*");
  if (!catalog) return;

  const testCases = [
    { name: "Posesión Infantil", category: "infantil", objective: "posesión y circulación", durationMinutes: 75 },
    { name: "Presión tras pérdida Senior", category: "senior", objective: "presión tras pérdida", durationMinutes: 75 },
    { name: "Presión alta Senior", category: "senior", objective: "presión alta", durationMinutes: 75 },
  ];

  for (const tc of testCases) {
    console.log("================================================================================");
    console.log(`TEST CASE: ${tc.name}`);
    const proposal = generateMethodologySessionProposal({
      teamId: "team-1",
      category: tc.category,
      objective: tc.objective,
      secondaryObjectives: [],
      microcycleDay: "MD-3",
      durationMinutes: tc.durationMinutes,
      numPlayers: 16,
      intensityLoad: 3,
      allExercises: catalog
    });

    const validation = validateSessionProposal(proposal);
    console.log("Validation Result:", validation);
    console.log("Metrics:", proposal.metrics);

    for (const [bKey, bVal] of Object.entries(proposal.blocks)) {
      console.log(`  Block [${bKey}]: ${bVal.exercise ? bVal.exercise.nombre : "❌ NULL"} (${bVal.durationMin} min) | Score: ${bVal.score}`);
      if (!bVal.exercise) {
        // Diagnosticar por qué falló la recomendación
        console.log(`    🔍 Investigando por qué no hubo recomendación para ${bKey}:`);
        const blockContext = {
          category: tc.category,
          objective: tc.objective,
          secondaryObjectives: [],
          microcycleDay: "MD-3",
          durationMinutes: bVal.durationMin,
          numPlayers: 16,
          intensityLoad: 3,
          targetBlock: bKey as any
        };
        const scored = catalog.map(ex => scoreExercise(ex, blockContext));
        const selectable = scored.filter(s => s.isSelectable);
        console.log(`    Total catalog: ${catalog.length} | Selectable for ${bKey}: ${selectable.length}`);
        if (selectable.length === 0) {
          // Mostrar por qué fueron rechazados los que tienen afinidad con el objetivo
          const affinityList = scored.filter(s => (s.tacticalAffinity && s.tacticalAffinity.hasMeaningfulAffinity) || s.reasons.some(r => r.includes("Afinidad")));
          console.log(`    Ejercicios con afinidad pero rechazados (${affinityList.length}):`);
          affinityList.slice(0, 5).forEach(s => {
            console.log(`      * "${s.exercise.nombre}" (bloque_sesion: ${s.exercise.bloque_sesion}, tipo: ${s.exercise.tipo}, oposicion: ${s.exercise.oposicion}, rep: ${s.exercise.representatividad}): rejection=${s.rejectionReason}`);
          });
        }
      }
    }
  }
}

testProposalGenerator();
