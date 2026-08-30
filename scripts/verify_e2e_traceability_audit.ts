process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import { SessionRequestParser } from "../src/lib/methodology/sessionGenerator/sessionRequestParser";
import { SessionPlannerService } from "../src/lib/methodology/sessionGenerator/sessionPlannerService";
import { evaluatePureTacticalAffinity } from "../src/lib/methodology/tacticalEngine/tacticalAffinityEngine";
import { PedagogicalProgressionEngine } from "../src/lib/methodology/sessionGenerator/pedagogicalProgressionEngine";
import { SessionCoherenceAuditor } from "../src/lib/methodology/sessionGenerator/sessionCoherenceAuditor";
import { scoreExercise, isExerciseSelectableForBlock } from "../src/lib/methodology/recommendationEngine";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function runE2ETraceabilityAudit() {
  console.log("================================================================================");
  console.log("PRUEBA E2E P0 — TRAZABILIDAD COMPLETA DEL GENERADOR METODOLÓGICO");
  console.log("Usuario → UI → Parser → Motor Afinidad → Selector → Auditor → UI");
  console.log("================================================================================\n");

  const { data: catalog } = await supabase.from("banco_ejercicios").select("*");
  if (!catalog || catalog.length === 0) {
    console.error("❌ Error cargando catálogo de ejercicios");
    process.exit(1);
  }

  let totalTests = 0;
  let passedTests = 0;

  function assertE2E(cond: boolean, label: string) {
    totalTests++;
    if (cond) {
      passedTests++;
      console.log(`  ✅ [PASS] ${label}`);
    } else {
      console.error(`  ❌ [FAIL] ${label}`);
      process.exit(1);
    }
  }

  const planner = SessionPlannerService.getInstance();
  const progEngine = PedagogicalProgressionEngine.getInstance();
  const auditor = SessionCoherenceAuditor.getInstance();

  // ============================================================================
  // PASO 1: UI → PARSER
  // ============================================================================
  console.log("--------------------------------------------------------------------------------");
  console.log("[PASO 1] UI → PARSER");
  console.log("--------------------------------------------------------------------------------");
  const rawQuery = "1v1 para Senior, 75 minutos.";
  console.log(`[E2E] UI Input capturado: "${rawQuery}"`);

  const parsedIntent = SessionRequestParser.parse(rawQuery);
  console.log("[E2E] PARSER Output:");
  console.log(`  - rawPrompt: "${parsedIntent.rawPrompt}"`);
  console.log(`  - primaryObjective: "${parsedIntent.primaryObjective}"`);
  console.log(`  - ageCategory: "${parsedIntent.ageCategory}"`);
  console.log(`  - players: ${parsedIntent.players ?? "undefined"}`);
  console.log(`  - durationMinutes: ${parsedIntent.durationMinutes}`);

  assertE2E(parsedIntent.rawPrompt === "1v1 para Senior, 75 minutos.", "rawPrompt exacto recibido");
  assertE2E(parsedIntent.primaryObjective === "progresion", "objective resuelto canónicamente a 'progresion'");
  assertE2E(parsedIntent.ageCategory === "senior", "category resuelta a 'senior'");
  assertE2E(parsedIntent.players === undefined, "players es undefined (1v1 NO activa número de jugadores)");
  assertE2E(parsedIntent.durationMinutes === 75, "durationMinutes es 75");

  // ============================================================================
  // PASO 2: PARSER → MOTOR DE AFINIDAD TÁCTICA
  // ============================================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("[PASO 2] PARSER → MOTOR DE AFINIDAD TÁCTICA");
  console.log("--------------------------------------------------------------------------------");
  const canonicalReceived = parsedIntent.primaryObjective;
  console.log(`[E2E] Principio canónico entregado al motor táctico: "${canonicalReceived}"`);
  assertE2E(canonicalReceived === "progresion", "El motor recibe estrictamente 'progresion' (nunca '1v1' o 'para')");

  // Evaluar afinidad directa de candidatos en catálogo
  const evaluatedCatalog = catalog.map(ex => {
    const aff = evaluatePureTacticalAffinity(ex, { name: canonicalReceived, game_phase: canonicalReceived });
    return { ex, aff };
  });
  const directMatches = evaluatedCatalog.filter(item => item.aff && item.aff.hasMeaningfulAffinity);
  console.log(`[E2E] Candidatos en catálogo con afinidad táctica directa: ${directMatches.length}`);
  assertE2E(directMatches.length >= 10, "Existen suficientes candidatos con afinidad directa para progresión/1v1");

  // ============================================================================
  // PASO 3: MOTOR DE AFINIDAD → SELECTOR (RANKING Y SELECCIÓN)
  // ============================================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("[PASO 3] MOTOR DE AFINIDAD → SELECTOR (RANKING Y SELECCIONABILIDAD)");
  console.log("--------------------------------------------------------------------------------");

  const phases = ["activacion", "principal_1", "principal_2", "global", "vuelta_calma"];
  const topCandidatesPerPhase: Record<string, any[]> = {};

  for (const phase of phases) {
    console.log(`\n--- Evaluación de candidatos para fase: ${phase.toUpperCase()} ---`);
    const scoredPhase = catalog.map(ex => {
      const sessionCtx = {
        category: parsedIntent.ageCategory,
        objective: parsedIntent.primaryObjective,
        durationMinutes: 75,
        targetBlock: phase as any
      };
      const scoreResult = scoreExercise(ex, sessionCtx);
      const isSelectable = isExerciseSelectableForBlock(scoreResult, sessionCtx);
      const breakdown = progEngine.scoreCandidate(ex, phase as any, parsedIntent);
      const pureAff = evaluatePureTacticalAffinity(ex, { name: canonicalReceived, game_phase: canonicalReceived });
      return { ex, isSelectable, breakdown, pureAff, scoreResult };
    });

    scoredPhase.sort((a, b) => b.breakdown.totalScore - a.breakdown.totalScore);
    topCandidatesPerPhase[phase] = scoredPhase.slice(0, 3);

    topCandidatesPerPhase[phase].forEach((c, idx) => {
      console.log(`  Top ${idx + 1}: "${c.ex.nombre}" (ID: ${c.ex.id})`);
      console.log(`     - Bloque: ${c.ex.bloque_sesion} | Fase: ${c.ex.game_phase} | Rep: ${c.ex.representatividad} | Opo: ${c.ex.oposicion}`);
      console.log(`     - ObjFit: ${c.breakdown.objectiveFit} | CatFit: ${c.breakdown.categoryFit} | PedagFit: ${c.breakdown.pedagogicalFit} | FinalScore: ${c.breakdown.totalScore}`);
      console.log(`     - isExerciseSelectableForBlock: ${c.isSelectable ? "TRUE" : "FALSE"}`);
    });
  }

  // ============================================================================
  // PASO 4: SELECTOR → AUDITOR (GENERACIÓN DE SESIÓN)
  // ============================================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("[PASO 4] SELECTOR → AUDITOR (PROPUESTA GENERADA)");
  console.log("--------------------------------------------------------------------------------");

  const generationResult = await planner.generateSession(rawQuery, catalog);
  assertE2E(generationResult.success === true && generationResult.session !== null, "Generador produjo sesión no nula");

  const generatedSession = generationResult.session!;
  console.log(`[E2E] Título generado: "${generatedSession.title}"`);
  console.log(`[E2E] Resumen metodológico: "${generatedSession.methodologicalSummary}"`);
  console.log(`[E2E] Número de bloques: ${generatedSession.drills.length}`);
  console.log(`[E2E] Duración calculada: ${generatedSession.calculatedDurationMinutes} min`);

  assertE2E(generatedSession.drills.length === 5, "Exactamente 5 bloques generados");
  assertE2E(generatedSession.drills[0].phase === "activacion", "Bloque 1 es 'activacion'");
  assertE2E(generatedSession.drills[1].phase === "principal_1", "Bloque 2 es 'principal_1'");
  assertE2E(generatedSession.drills[2].phase === "principal_2", "Bloque 3 es 'principal_2'");
  assertE2E(generatedSession.drills[3].phase === "global", "Bloque 4 es 'global'");
  assertE2E(generatedSession.drills[4].phase === "vuelta_calma", "Bloque 5 es 'vuelta_calma'");

  const dur1 = generatedSession.drills[0].allocatedDurationMin;
  const dur2 = generatedSession.drills[1].allocatedDurationMin;
  const dur3 = generatedSession.drills[2].allocatedDurationMin;
  const dur4 = generatedSession.drills[3].allocatedDurationMin;
  const dur5 = generatedSession.drills[4].allocatedDurationMin;
  const sumDurs = dur1 + dur2 + dur3 + dur4 + dur5;
  console.log(`[E2E] Reparto temporal: ${dur1} + ${dur2} + ${dur3} + ${dur4} + ${dur5} = ${sumDurs} min`);
  assertE2E(sumDurs === 75 && generatedSession.isDurationExact, "Suma temporal exacta: 10 + 20 + 20 + 15 + 10 = 75 min");

  // ============================================================================
  // PASO 5: AUDITOR (EJECUCIÓN DE SESSIONCOHERENCEAUDITOR)
  // ============================================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("[PASO 5] AUDITOR (EJECUCIÓN DE SESSIONCOHERENCEAUDITOR)");
  console.log("--------------------------------------------------------------------------------");

  const auditReport = auditor.auditAndRepairSession(generatedSession.drills, generatedSession.intent, catalog);
  console.log("[E2E] AUDITOR Report:");
  console.log(`  - valid: ${auditReport.valid}`);
  console.log(`  - coherenceScore: ${auditReport.coherenceScore}%`);
  console.log(`  - auditedDrills: ${auditReport.auditedDrills.length} / 5`);
  console.log(`  - pedagogicalChainValid: ${auditReport.progressionReport.chainValid}`);
  console.log(`  - warnings: ${auditReport.warnings.length}`);

  assertE2E(auditReport.valid === true, "Auditor dictamina valid = true");
  assertE2E(auditReport.coherenceScore === 100, "Auditor dictamina coherenceScore = 100%");
  assertE2E(auditReport.auditedDrills.length === 5, "Auditor verifica 5/5 bloques");
  assertE2E(auditReport.progressionReport.chainValid === true, "Auditor verifica cadena pedagógica continua");

  // ============================================================================
  // PASO 6: AUDITOR → UI (VERIFICACIÓN DEL PAYLOAD RENDERIZABLE)
  // ============================================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("[PASO 6] AUDITOR → UI (OBJETO RENDERIZABLE)");
  console.log("--------------------------------------------------------------------------------");

  console.log("[E2E] UI Payload Properties:");
  console.log(`  - rendered objective: "${generatedSession.intent.primaryObjective}"`);
  console.log(`  - rendered category: "${generatedSession.intent.ageCategory}"`);
  console.log(`  - rendered players: ${generatedSession.intent.players ?? "undefined"}`);
  console.log(`  - rendered totalDurationMinutes: ${generatedSession.totalDurationMinutes}`);
  console.log(`  - rendered calculatedDurationMinutes: ${generatedSession.calculatedDurationMinutes}`);
  console.log(`  - rendered coherenceScore: ${generatedSession.coherenceScore}%`);
  console.log(`  - rendered drills count: ${generatedSession.drills.length}`);

  assertE2E(generatedSession.intent.primaryObjective === "progresion", "UI muestra objetivo = 'progresion'");
  assertE2E(generatedSession.intent.ageCategory === "senior", "UI muestra categoría = 'senior'");
  assertE2E(generatedSession.intent.players === undefined, "UI NO muestra jugadores = 2 (undefined correcto)");
  assertE2E(generatedSession.coherenceScore === 100, "UI muestra badge de coherencia 100%");
  assertE2E(generatedSession.drills.length === 5, "UI muestra los 5 bloques completos");

  // ============================================================================
  // PASO 7: PRUEBA NEGATIVA (PETICIÓN INCOMPLETA: "Sesión de 1v1, 75 minutos.")
  // ============================================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("[PASO 7] PRUEBA NEGATIVA: 'Sesión de 1v1, 75 minutos.'");
  console.log("--------------------------------------------------------------------------------");

  const negativePrompt = "Sesión de 1v1, 75 minutos.";
  const negIntent = SessionRequestParser.parse(negativePrompt);
  console.log(`[E2E] Petición sin categoría explícita: "${negativePrompt}"`);
  console.log(`  - objective: "${negIntent.primaryObjective}"`);
  console.log(`  - category: ${negIntent.ageCategory ?? "undefined"}`);
  console.log(`  - players: ${negIntent.players ?? "undefined"}`);

  assertE2E(negIntent.primaryObjective === "progresion", "Detecta 'progresion'");
  assertE2E(negIntent.ageCategory === undefined, "No inventa categoría cuando no se indica");
  assertE2E(negIntent.players === undefined, "No inventa jugadores cuando no se indica");
  assertE2E(negIntent.primaryObjective !== "para", "El objetivo nunca es 'para'");

  const negGen = await planner.generateSession(negativePrompt, catalog);
  assertE2E(negGen.success === true && negGen.session?.drills.length === 5, "Genera sesión válida sin inventar datos");

  // ============================================================================
  // PASO 8: PRUEBA DE MODIFICACIÓN DE PETICIÓN (EDIT PROMPT)
  // ============================================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("[PASO 8] PRUEBA DE MODIFICACIÓN DE PETICIÓN (1v1 -> Finalización)");
  console.log("--------------------------------------------------------------------------------");

  const modifiedPrompt = "Finalización y remate para Senior, 75 minutos.";
  console.log(`[E2E] Usuario pulsa 'Modificar petición' y envía: "${modifiedPrompt}"`);

  const modIntent = SessionRequestParser.parse(modifiedPrompt);
  assertE2E(modIntent.primaryObjective === "finalizacion", "Nuevo objetivo es 'finalizacion'");
  assertE2E(modIntent.ageCategory === "senior", "Categoría es 'senior'");

  const modGen = await planner.generateSession(modifiedPrompt, catalog);
  assertE2E(modGen.success === true && modGen.session !== null, "Generación tras modificación exitosa");

  const modSession = modGen.session!;
  assertE2E(modSession.intent.primaryObjective === "finalizacion", "Sesión modificada tiene objetivo 'finalizacion'");
  assertE2E(modSession.drills[1].exercise.objetivo_tactico?.some((t: string) => t.includes("finalización") || t.includes("remate") || t.includes("definición")), "B2 tiene tareas de finalización (sin residuos de 1v1)");

  // ============================================================================
  // PASO 9: PRUEBA DE REGENERACIÓN DE VARIANTE (REGENERATE VARIANTE 2)
  // ============================================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("[PASO 9] PRUEBA DE REGENERACIÓN DE VARIANTE (VARIANTE 2)");
  console.log("--------------------------------------------------------------------------------");

  const initialDrillIds = generatedSession.drills.map(d => d.exercise.id);
  console.log(`[E2E] IDs de ejercicios en Variante 1: ${initialDrillIds.join(", ")}`);

  const variant2Result = await planner.generateSession(rawQuery, catalog, {
    variantNumber: 2,
    excludedExerciseIds: initialDrillIds
  });

  assertE2E(variant2Result.success === true && variant2Result.session !== null, "Generación de Variante 2 exitosa");
  const variant2Session = variant2Result.session!;

  console.log(`[E2E] Variante 2 título: "${variant2Session.title}"`);
  console.log(`[E2E] Variante 2 variante: "${variant2Session.variantLabel}"`);

  assertE2E(variant2Session.intent.primaryObjective === "progresion", "Variante 2 mantiene objetivo 'progresion'");
  assertE2E(variant2Session.intent.ageCategory === "senior", "Variante 2 mantiene categoría 'senior'");
  assertE2E(variant2Session.calculatedDurationMinutes === 75, "Variante 2 mantiene 75 minutos exactos");
  assertE2E(variant2Session.drills.length === 5, "Variante 2 mantiene 5 bloques");
  assertE2E(variant2Session.coherenceScore === 100, "Variante 2 pasa auditoría con 100% de coherencia");

  const variant2DrillIds = variant2Session.drills.map(d => d.exercise.id);
  console.log(`[E2E] IDs de ejercicios en Variante 2: ${variant2DrillIds.join(", ")}`);

  const rotatedCount = variant2DrillIds.filter(id => !initialDrillIds.includes(id)).length;
  console.log(`[E2E] Ejercicios rotados/nuevos en Variante 2: ${rotatedCount} / 5`);
  assertE2E(rotatedCount > 0, "Variante 2 rota ejercicios respecto a la Variante 1");

  console.log("\n================================================================================");
  console.log(`RESULTADO DE LA AUDITORÍA E2E: ${passedTests} / ${totalTests} PRUEBAS PASADAS (100% PASS)`);
  console.log("================================================================================");
}

runE2ETraceabilityAudit();
