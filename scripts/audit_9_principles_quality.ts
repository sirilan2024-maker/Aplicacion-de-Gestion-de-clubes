process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import { SessionPlannerService } from "../src/lib/methodology/sessionGenerator/sessionPlannerService";
import { evaluatePureTacticalAffinity } from "../src/lib/methodology/tacticalEngine/tacticalAffinityEngine";
import { PedagogicalProgressionEngine } from "../src/lib/methodology/sessionGenerator/pedagogicalProgressionEngine";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const NINE_PRINCIPLES = [
  { name: "Posesión y Circulación", prompt: "Sesión de posesión y circulación para Cadete, 75 minutos.", expectedTaxKey: "circulacion", cat: "cadete" },
  { name: "Organización Defensiva y Basculación", prompt: "Sesión de organización defensiva y basculación para Cadete, 75 minutos.", expectedTaxKey: "basculacion", cat: "cadete" },
  { name: "Presión Alta", prompt: "Sesión de presión alta para Senior, 75 minutos.", expectedTaxKey: "presion alta", cat: "senior" },
  { name: "Presión tras Pérdida", prompt: "Sesión de presión tras pérdida para Senior, 75 minutos.", expectedTaxKey: "transicion defensiva", cat: "senior" },
  { name: "Transición Ofensiva", prompt: "Sesión de transición ofensiva y contraataque para Juvenil, 75 minutos.", expectedTaxKey: "transicion ofensiva", cat: "juvenil" },
  { name: "Salida de Balón", prompt: "Sesión de salida de balón e iniciación para Infantil, 75 minutos.", expectedTaxKey: "salida de balon", cat: "infantil" },
  { name: "Balón Parado (ABP)", prompt: "Sesión de balón parado y estrategia ABP para Senior, 75 minutos.", expectedTaxKey: "balon parado", cat: "senior" },
  { name: "Finalización y Remate", prompt: "Sesión de finalización y remate para Senior, 75 minutos.", expectedTaxKey: "finalizacion", cat: "senior" },
  { name: "Progresión y Duelos 1v1", prompt: "Sesión de progresión y duelos 1v1 para Senior, 75 minutos.", expectedTaxKey: "progresion", cat: "senior" }
];

async function runComprehensive9PrinciplesAudit() {
  const { data: catalog } = await supabase.from("banco_ejercicios").select("*");
  if (!catalog) {
    console.error("Error loading catalog from database");
    process.exit(1);
  }

  const planner = SessionPlannerService.getInstance();
  const progEngine = PedagogicalProgressionEngine.getInstance();

  console.log("================================================================================");
  console.log("AUDITORÍA INTEGRAL DE AFINIDAD TÁCTICA Y RANKING — 9 PRINCIPIOS CANÓNICOS");
  console.log("================================================================================\n");

  let totalChecks = 0;
  let passedChecks = 0;

  function verify(cond: boolean, desc: string) {
    totalChecks++;
    if (cond) {
      passedChecks++;
      console.log(`  ✅ [PASS] ${desc}`);
    } else {
      console.error(`  ❌ [FAIL] ${desc}`);
    }
  }

  for (let i = 0; i < NINE_PRINCIPLES.length; i++) {
    const p = NINE_PRINCIPLES[i];
    console.log(`\n================================================================================`);
    console.log(`[PRINCIPIO ${i + 1}/9] ${p.name.toUpperCase()}`);
    console.log(`Prompt: "${p.prompt}"`);
    console.log(`================================================================================`);

    const res = await planner.generateSession(p.prompt, catalog);
    const s = res.session;

    if (!s) {
      console.error("  ❌ Error: no se generó sesión:", res.error);
      continue;
    }

    verify(s.intent.primaryObjective === p.expectedTaxKey, `Objetivo resuelto a clave canónica '${p.expectedTaxKey}' (actual: '${s.intent.primaryObjective}')`);
    verify(s.drills.length === 5, `Estructura completa de 5 bloques (actual: ${s.drills.length})`);
    verify(s.calculatedDurationMinutes === 75, `Presupuesto temporal exacto 75/75 min (actual: ${s.calculatedDurationMinutes})`);
    verify(s.coherenceScore === 100, `Coherencia Metodológica 100% (actual: ${s.coherenceScore}%)`);
    verify(s.pedagogicalChainValid === true, `Cadena pedagógica continua válida`);

    console.log("\nDetalle de bloques seleccionados:");
    s.drills.forEach((d, idx) => {
      const e = d.exercise;
      const pureAff = evaluatePureTacticalAffinity(e, { name: s.intent.primaryObjective, game_phase: s.intent.primaryObjective });
      const breakdown = progEngine.scoreCandidate(e, d.phase, s.intent);

      console.log(`\n  Bloque ${idx + 1}: [${d.phase.toUpperCase()}] "${e.nombre}" (${d.allocatedDurationMin} min)`);
      console.log(`    - ID: ${e.id}`);
      console.log(`    - Tipo: ${e.tipo} | Bloque catálogo: ${e.bloque_sesion} | Game Phase: ${e.game_phase}`);
      console.log(`    - Carga física: ${e.carga_fisica} | Oposición: ${e.oposicion} | Representatividad: ${e.representatividad}`);
      console.log(`    - Pure Affinity: ${pureAff?.affinityType ?? "NONE"} (Score táctico: ${pureAff?.tacticalScore ?? 0})`);
      console.log(`    - Breakdown: TotalScore=${breakdown.totalScore} | ObjFit=${breakdown.objectiveFit} | CatFit=${breakdown.categoryFit} | PedagFit=${breakdown.pedagogicalFit} | RepFit=${breakdown.representationFit}`);
    });

    // Validaciones de Calidad Específicas
    console.log("\nValidaciones de Calidad Metodológica:");
    const [b1, b2, b3, b4, b5] = s.drills;

    // B1: Activación
    verify((b1.exercise.carga_fisica ?? 2) <= 2, "B1 Carga física suave/progresiva (<= 2)");

    // B2: Principal 1
    const b2Aff = evaluatePureTacticalAffinity(b2.exercise, { name: s.intent.primaryObjective, game_phase: s.intent.primaryObjective });
    verify(b2Aff !== null && b2Aff.hasMeaningfulAffinity, "B2 Afinidad táctica directa con el principio solicitado");

    // B3: Principal 2
    const b3Aff = evaluatePureTacticalAffinity(b3.exercise, { name: s.intent.primaryObjective, game_phase: s.intent.primaryObjective });
    verify(b3Aff !== null && b3Aff.hasMeaningfulAffinity, "B3 Afinidad táctica directa con el principio solicitado");
    verify((b3.exercise.oposicion ?? 2) >= (b2.exercise.oposicion ?? 2), `B3 Oposición didácticamente creciente o igual (B3:${b3.exercise.oposicion} >= B2:${b2.exercise.oposicion})`);

    // B4: Global
    const b4Aff = evaluatePureTacticalAffinity(b4.exercise, { name: s.intent.primaryObjective, game_phase: s.intent.primaryObjective });
    verify(b4Aff !== null && b4Aff.hasMeaningfulAffinity, "B4 Afinidad táctica directa con el principio solicitado");
    verify((b4.exercise.representatividad ?? 2) >= 3, `B4 Representatividad global alta (Rep: ${b4.exercise.representatividad} >= 3)`);

    // B5: Vuelta a la Calma
    verify((b5.exercise.carga_fisica ?? 2) <= 2 && (b5.exercise.oposicion ?? 2) <= 1, "B5 Exclusivamente regenerativo (Carga <= 2, Oposición <= 1)");
  }

  console.log("\n================================================================================");
  console.log(`RESUMEN DE AUDITORÍA: ${passedChecks} / ${totalChecks} VALIDACIONES PASADAS (${Math.round((passedChecks / totalChecks) * 100)}%)`);
  console.log("================================================================================");

  if (passedChecks === totalChecks) {
    console.log("🎯 RESULTADO: 9/9 PRINCIPIOS VALIDAN CON MÁXIMA CALIDAD DE AFINIDAD TÁCTICA");
  } else {
    console.error("❌ Hay fallos en la auditoría");
    process.exit(1);
  }
}

runComprehensive9PrinciplesAudit();
