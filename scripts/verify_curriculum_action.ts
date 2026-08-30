process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { getFullMethodologyCurriculumAction } from "../src/app/actions/methodology-actions";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function verifyCurriculumAction() {
  console.log("=== VERIFICACIÓN ACTION DE CURRÍCULO ===");
  const res = await getFullMethodologyCurriculumAction();
  console.log(`Curricula recibidos: ${res.curricula.length}`);
  console.log(`Principios recibidos: ${res.principles.length}`);
  console.log(`Ejercicios recibidos: ${res.exercises.length}`);

  const phaseCounts: Record<string, number> = {};
  res.principles.forEach((p: any) => {
    phaseCounts[p.game_phase] = (phaseCounts[p.game_phase] || 0) + 1;
  });
  console.log("Conteo por fase:", phaseCounts);

  if (res.principles.length === 19 && res.curricula.length === 8 && res.exercises.length === 199) {
    console.log("✅ VERIFICACIÓN PERFECTA: 19 principios, 8 currículos y 199 ejercicios.");
  } else {
    console.error("❌ Fallo de conteo:", res);
  }
}

verifyCurriculumAction().catch(console.error);
