process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import { scoreExercise, isExerciseSelectableForBlock } from "../src/lib/methodology/recommendationEngine";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function inspectSeniorPressing() {
  const { data: catalog } = await supabase.from("banco_ejercicios").select("*");
  if (!catalog) return;

  const objectives = ["presión tras pérdida", "presión alta", "transición defensiva"];
  const targetBlocks = ["activacion", "principal_1", "principal_2", "global", "vuelta_calma"];

  for (const obj of objectives) {
    console.log("================================================================================");
    console.log(`OBJETIVO: "${obj}" | Categoría: SENIOR`);
    console.log("================================================================================");

    for (const block of targetBlocks) {
      const context = {
        category: "senior",
        objective: obj,
        secondaryObjectives: [],
        microcycleDay: "MD-3",
        durationMinutes: 20,
        numPlayers: 16,
        intensityLoad: 3,
        targetBlock: block as any
      };

      const results = catalog.map(ex => {
        const scoreRes = scoreExercise(ex, context);
        return {
          ex,
          scoreRes,
          selectable: scoreRes.isSelectable
        };
      });

      const selectable = results.filter(r => r.selectable);
      console.log(`Bloque [${block}]: ${selectable.length} ejercicios SELECCIONABLES (de ${catalog.length})`);

      if (selectable.length === 0) {
        console.log(`  🔍 ¿Por qué 0 seleccionables en ${block}?`);
        // Ver los que tienen afinidad con el objetivo
        const withAffinity = results.filter(r => r.scoreRes.tacticalAffinity && r.scoreRes.tacticalAffinity.hasMeaningfulAffinity);
        console.log(`  Ejercicios con afinidad táctica a "${obj}": ${withAffinity.length}`);
        withAffinity.forEach(w => {
          console.log(`    - "${w.ex.nombre}"`);
          console.log(`      * bloque_sesion: "${w.ex.bloque_sesion}", tipo: "${w.ex.tipo}", oposicion: ${w.ex.oposicion}, rep: ${w.ex.representatividad}, cat: ${JSON.stringify(w.ex.categoria_edad || w.ex.age_category)}`);
          console.log(`      * rejectionReason: ${w.scoreRes.rejectionReason}`);
          console.log(`      * reasons: ${w.scoreRes.reasons.join(" | ")}`);
        });
      }
    }
  }
}

inspectSeniorPressing();
