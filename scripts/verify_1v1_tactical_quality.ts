process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import { SessionPlannerService } from "../src/lib/methodology/sessionGenerator/sessionPlannerService";
import { evaluatePureTacticalAffinity } from "../src/lib/methodology/tacticalEngine/tacticalAffinityEngine";
import { PedagogicalProgressionEngine } from "../src/lib/methodology/sessionGenerator/pedagogicalProgressionEngine";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run1v1TacticalAudit() {
  console.log("================================================================================");
  console.log("AUDITORÍA P0: CALIDAD DE AFINIDAD TÁCTICA 1v1 (SENIOR, 75 MIN)");
  console.log("================================================================================\n");

  const { data: catalog } = await supabase.from("banco_ejercicios").select("*");
  if (!catalog) {
    console.error("Error cargando catálogo");
    process.exit(1);
  }

  const planner = SessionPlannerService.getInstance();
  const progEngine = PedagogicalProgressionEngine.getInstance();
  const prompt = "1v1 para Senior, 75 minutos.";

  const res = await planner.generateSession(prompt, catalog);
  const s = res.session;

  if (!s) {
    console.error("❌ Falló la generación:", res.error);
    process.exit(1);
  }

  let passed = 0;
  let total = 0;

  function assert(cond: boolean, msg: string) {
    total++;
    if (cond) {
      passed++;
      console.log(`✅ [PASS] ${msg}`);
    } else {
      console.error(`❌ [FAIL] ${msg}`);
      process.exit(1);
    }
  }

  // Comprobaciones Generales
  assert(s.intent.primaryObjective === "progresion", "Objetivo interpretado: 'progresion'");
  assert(s.intent.ageCategory === "senior", "Categoría interpretada: 'senior'");
  assert(s.intent.players === undefined, "Jugadores: undefined (sin inferencia errónea)");
  assert(s.drills.length === 5, "5 / 5 bloques generados");
  assert(s.calculatedDurationMinutes === 75, "75 / 75 minutos exactos");
  assert(s.coherenceScore === 100, "Coherencia Metodológica 100%");
  assert(s.pedagogicalChainValid === true, "Cadena pedagógica continua B1-B5");

  console.log("\n--------------------------------------------------------------------------------");
  console.log("DESGLOSE DE MÉTRICAS Y JUSTIFICACIÓN DE CADA BLOQUE SELECCIONADO:");
  console.log("--------------------------------------------------------------------------------");

  const expectedPhases = ["activacion", "principal_1", "principal_2", "global", "vuelta_calma"];

  s.drills.forEach((d, idx) => {
    const e = d.exercise;
    const pureAff = evaluatePureTacticalAffinity(e, { name: s.intent.primaryObjective, game_phase: s.intent.primaryObjective });
    const breakdown = progEngine.scoreCandidate(e, d.phase, s.intent);

    console.log(`\n[BLOQUE ${idx + 1}: ${d.phase.toUpperCase()}] "${e.nombre}" (${d.allocatedDurationMin} min)`);
    console.log(`  - ID: ${e.id}`);
    console.log(`  - Tipo: ${e.tipo} | Bloque catálogo: ${e.bloque_sesion} | Game Phase: ${e.game_phase}`);
    console.log(`  - Carga física: ${e.carga_fisica} | Oposición: ${e.oposicion} | Representatividad: ${e.representatividad}`);
    console.log(`  - Categorías: ${JSON.stringify(e.categoria_edad || e.age_category)}`);
    console.log(`  - Objetivos tácticos: ${JSON.stringify(e.objetivo_tactico)}`);
    console.log(`  - Pure Tactical Affinity: ${pureAff?.affinityType ?? "NONE"} (Score táctico: ${pureAff?.tacticalScore ?? 0})`);
    console.log(`  - Breakdown: TotalScore=${breakdown.totalScore} | ObjFit=${breakdown.objectiveFit} | CatFit=${breakdown.categoryFit} | PedagFit=${breakdown.pedagogicalFit} | RepFit=${breakdown.representationFit}`);
    console.log(`  - Justificación: ${d.selectionRationale}`);
  });

  // Validaciones Específicas de Calidad por Bloque
  console.log("\n--------------------------------------------------------------------------------");
  console.log("VALIDACIONES ESPECÍFICAS DE AFINIDAD TÁCTICA:");
  console.log("--------------------------------------------------------------------------------");

  // B1: Activación
  const b1 = s.drills[0];
  assert(b1.phase === "activacion", "B1 es activación");
  assert((b1.exercise.carga_fisica ?? 2) <= 2, "B1 carga física <= 2");

  // B2: Principal 1 (Fijación/Progresión)
  const b2 = s.drills[1];
  const b2Aff = evaluatePureTacticalAffinity(b2.exercise, { name: "progresion", game_phase: "progresion" });
  assert(b2Aff !== null && b2Aff.hasMeaningfulAffinity, "B2 tiene afinidad táctica directa con progresión/1v1");
  assert((b2.exercise.oposicion ?? 2) >= 2, "B2 tiene oposición estructurada");

  // B3: Principal 2 (Mayor oposición / duelos)
  const b3 = s.drills[2];
  const b3Aff = evaluatePureTacticalAffinity(b3.exercise, { name: "progresion", game_phase: "progresion" });
  assert(b3Aff !== null && b3Aff.hasMeaningfulAffinity, "B3 tiene afinidad táctica directa con progresión/1v1");
  assert((b3.exercise.oposicion ?? 2) >= (b2.exercise.oposicion ?? 2), "B3 oposición >= B2 oposición (progresión pedagógica)");

  // B4: Global (Partido Condicionado / Transferencia)
  const b4 = s.drills[3];
  const b4Aff = evaluatePureTacticalAffinity(b4.exercise, { name: "progresion", game_phase: "progresion" });
  assert(b4Aff !== null && b4Aff.hasMeaningfulAffinity, "B4 tiene afinidad táctica directa con progresión/1v1");
  assert((b4.exercise.representatividad ?? 2) >= 3, "B4 representatividad global >= 3");
  assert((b4.exercise.oposicion ?? 2) >= 3, "B4 oposición global >= 3");

  // B5: Vuelta a la Calma
  const b5 = s.drills[4];
  assert(b5.phase === "vuelta_calma", "B5 es vuelta a la calma");
  assert((b5.exercise.carga_fisica ?? 2) <= 2 && (b5.exercise.oposicion ?? 2) <= 1, "B5 es regenerativo (carga <= 2, opo <= 1)");

  console.log("\n================================================================================");
  console.log(`RESULTADO AUDITORÍA 1v1: ${passed} / ${total} TESTS PASADOS (100% PASS)`);
  console.log("================================================================================");
}

run1v1TacticalAudit();
