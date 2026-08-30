/**
 * VALIDACIÓN E2E FINAL — TRAZABILIDAD COMPLETA DEL GENERADOR METODOLÓGICO
 * 
 * Flujo real auditado capa por capa:
 * UI → NaturalLanguageQueryParser → SessionRequestParser → tacticalAffinityEngine
 *   → PedagogicalProgressionEngine → barrera interna del planner (isBlockAppropriate + pertinenceScore > 30)
 *   → SessionCoherenceAuditor → UI
 * 
 * NOTA ARQUITECTÓNICA: El SessionPlannerService usa PedagogicalProgressionEngine.scoreCandidate()
 * como barrera interna (isBlockAppropriate && pertinenceScore > 30), NO la función isExerciseSelectableForBlock()
 * de recommendationEngine, que es una barrera complementaria para búsquedas externas.
 * La CAPA 6 verifica la barrera que realmente aplica el planner.
 * 
 * Casos de prueba:
 *   CASO 1: "1v1 para Senior, 75 minutos."
 *   CASO 2: "Sesión de finalización y remate para Senior, 75 minutos."
 *   CASO 3: "Sesión de posesión y circulación para Infantil, 75 minutos."
 *   NEGATIVA: "1v1 para Senior, 75 minutos, para 2 jugadores."
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import { createClient } from "@supabase/supabase-js";
import { NaturalLanguageQueryParser } from "../src/lib/methodology/intelligentSearch/naturalLanguageQueryParser";
import { SessionRequestParser } from "../src/lib/methodology/sessionGenerator/sessionRequestParser";
import { SessionPlannerService } from "../src/lib/methodology/sessionGenerator/sessionPlannerService";
import { evaluatePureTacticalAffinity } from "../src/lib/methodology/tacticalEngine/tacticalAffinityEngine";
import { PedagogicalProgressionEngine } from "../src/lib/methodology/sessionGenerator/pedagogicalProgressionEngine";
import { SessionCoherenceAuditor } from "../src/lib/methodology/sessionGenerator/sessionCoherenceAuditor";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── RESULT TRACKING ─────────────────────────────────────────────────────────

interface AssertionRow {
  caseLabel: string;
  stage: string;
  input: string;
  output: string;
  assertion: string;
  result: "PASS" | "FAIL";
  error?: string;
}

const allRows: AssertionRow[] = [];
let totalPass = 0;
let totalFail = 0;
let currentCaseLabel = "";

function record(
  stage: string,
  input: string,
  output: string,
  assertion: string,
  cond: boolean,
  error?: string
): boolean {
  const result: "PASS" | "FAIL" = cond ? "PASS" : "FAIL";
  if (cond) totalPass++; else totalFail++;
  allRows.push({ caseLabel: currentCaseLabel, stage, input, output, assertion, result, error });
  const icon = cond ? "✅" : "❌";
  console.log(`  ${icon} [${result}] ${assertion}`);
  if (!cond && error) console.error(`       ↳ DETALLE: ${error}`);
  return cond;
}

// ─── CASE SPEC ────────────────────────────────────────────────────────────────

interface CaseSpec {
  label: string;
  prompt: string;
  expectedObjective: string;      // La clave canónica real que devuelve el parser/taxonomía
  expectedCategory?: string;
  assertPlayersUndefined: boolean;
  expectedPlayers?: number;
  expectedDuration: number;
}

// ─── FULL PIPELINE TRACE FOR ONE CASE ─────────────────────────────────────────

async function runCase(spec: CaseSpec, catalog: any[]): Promise<void> {
  currentCaseLabel = spec.label;
  const sep = "=".repeat(90);
  console.log(`\n${sep}`);
  console.log(`  CASO: ${spec.label}`);
  console.log(`  Prompt exacto: "${spec.prompt}"`);
  console.log(sep);

  // ──────────────────────────────────────────────────────────────────────────
  // CAPA 1: UI → NaturalLanguageQueryParser
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n[CAPA 1] UI → NaturalLanguageQueryParser");
  console.log(`  Input (prompt desde campo de texto UI): "${spec.prompt}"`);

  const nlpOutput = NaturalLanguageQueryParser.parse(spec.prompt);

  console.log(`  Output NaturalLanguageQueryParser:`);
  console.log(`    rawQuery: "${nlpOutput.rawQuery}"`);
  console.log(`    cleanedQuery: "${nlpOutput.cleanedQuery}"`);
  console.log(`    extractedObjectives: [${(nlpOutput.extractedObjectives || []).join(", ")}]`);
  console.log(`    extractedAgeCategory: ${nlpOutput.extractedAgeCategory ?? "undefined"}`);
  console.log(`    extractedPlayersMin: ${nlpOutput.extractedPlayersMin ?? "undefined"}`);
  console.log(`    extractedDurationMin: ${nlpOutput.extractedDurationMin ?? "undefined"}`);

  record(
    "NLParser",
    `prompt="${spec.prompt}"`,
    `extractedObjectives=[${nlpOutput.extractedObjectives?.join(",")}]`,
    `NLP extrae al menos 1 objetivo válido`,
    Array.isArray(nlpOutput.extractedObjectives) && nlpOutput.extractedObjectives.length > 0
  );

  if (spec.expectedCategory) {
    record(
      "NLParser",
      `prompt="${spec.prompt}"`,
      `extractedAgeCategory="${nlpOutput.extractedAgeCategory}"`,
      `NLP extrae categoría "${spec.expectedCategory}"`,
      nlpOutput.extractedAgeCategory === spec.expectedCategory
    );
  }

  if (spec.assertPlayersUndefined) {
    record(
      "NLParser",
      `prompt="${spec.prompt}"`,
      `extractedPlayersMin=${nlpOutput.extractedPlayersMin ?? "undefined"}`,
      `NLP NO extrae jugadores (players = undefined)`,
      nlpOutput.extractedPlayersMin === undefined
    );
  }

  if (spec.expectedPlayers !== undefined) {
    record(
      "NLParser",
      `prompt="${spec.prompt}"`,
      `extractedPlayersMin=${nlpOutput.extractedPlayersMin}`,
      `NLP extrae players = ${spec.expectedPlayers}`,
      nlpOutput.extractedPlayersMin === spec.expectedPlayers
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CAPA 2: NaturalLanguageQueryParser → SessionRequestParser
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n[CAPA 2] NLParser → SessionRequestParser (resolución canónica de intención)");
  console.log(`  Input: NLParser output (extractedObjectives, extractedAgeCategory, etc.)`);

  const parsedIntent = SessionRequestParser.parse(spec.prompt);

  console.log(`  Output SessionRequestParser.SessionRequestIntent:`);
  console.log(`    rawPrompt: "${parsedIntent.rawPrompt}"`);
  console.log(`    primaryObjective: "${parsedIntent.primaryObjective}"`);
  console.log(`    ageCategory: ${parsedIntent.ageCategory ?? "undefined"}`);
  console.log(`    players: ${parsedIntent.players ?? "undefined"}`);
  console.log(`    durationMinutes: ${parsedIntent.durationMinutes}`);
  console.log(`    secondaryObjectives: [${parsedIntent.secondaryObjectives?.join(", ") ?? ""}]`);

  record(
    "SessionRequestParser",
    `NLParser.extractedObjectives=[${nlpOutput.extractedObjectives?.join(",")}]`,
    `rawPrompt="${parsedIntent.rawPrompt}"`,
    `rawPrompt preserva el texto original exacto`,
    parsedIntent.rawPrompt === spec.prompt
  );

  record(
    "SessionRequestParser",
    `NLParser.extractedObjectives=[${nlpOutput.extractedObjectives?.join(",")}]`,
    `primaryObjective="${parsedIntent.primaryObjective}"`,
    `primaryObjective resuelto canónicamente = "${spec.expectedObjective}"`,
    parsedIntent.primaryObjective === spec.expectedObjective
  );

  if (spec.expectedCategory) {
    record(
      "SessionRequestParser",
      `NLParser.extractedAgeCategory="${nlpOutput.extractedAgeCategory}"`,
      `ageCategory="${parsedIntent.ageCategory}"`,
      `ageCategory = "${spec.expectedCategory}"`,
      parsedIntent.ageCategory === spec.expectedCategory
    );
  }

  if (spec.assertPlayersUndefined) {
    record(
      "SessionRequestParser",
      `NLParser.extractedPlayersMin=undefined`,
      `players=${parsedIntent.players ?? "undefined"}`,
      `players = undefined (sin fabricación de datos)`,
      parsedIntent.players === undefined
    );
  }

  if (spec.expectedPlayers !== undefined) {
    record(
      "SessionRequestParser",
      `NLParser.extractedPlayersMin=${nlpOutput.extractedPlayersMin}`,
      `players=${parsedIntent.players}`,
      `players = ${spec.expectedPlayers} (detectado correctamente del texto)`,
      parsedIntent.players === spec.expectedPlayers
    );
  }

  record(
    "SessionRequestParser",
    `NLParser.extractedDurationMin=${nlpOutput.extractedDurationMin}`,
    `durationMinutes=${parsedIntent.durationMinutes}`,
    `durationMinutes = ${spec.expectedDuration}`,
    parsedIntent.durationMinutes === spec.expectedDuration
  );

  // ──────────────────────────────────────────────────────────────────────────
  // CAPA 3: SessionRequestParser → tacticalAffinityEngine
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n[CAPA 3] SessionRequestParser → tacticalAffinityEngine (evaluatePureTacticalAffinity)");
  console.log(`  Input: principio canónico "${parsedIntent.primaryObjective}"`);

  const principle = { name: parsedIntent.primaryObjective, game_phase: parsedIntent.primaryObjective };
  const affinityResults = catalog.map(ex => ({
    ex,
    aff: evaluatePureTacticalAffinity(ex, principle)
  }));
  const directMatches = affinityResults.filter(r => r.aff?.hasMeaningfulAffinity);

  console.log(`  Output evaluatePureTacticalAffinity:`);
  console.log(`    Principio evaluado: "${parsedIntent.primaryObjective}"`);
  console.log(`    Candidatos hasMeaningfulAffinity=true: ${directMatches.length}`);
  console.log(`    Top 3 con afinidad táctica directa:`);
  directMatches.slice(0, 3).forEach((r, i) => {
    console.log(`      ${i+1}. "${r.ex.nombre}" | type=${r.aff?.affinityType} | tacticalScore=${r.aff?.tacticalScore}`);
  });

  record(
    "tacticalAffinityEngine",
    `principle="${parsedIntent.primaryObjective}"`,
    `hasMeaningfulAffinity candidates=${directMatches.length}`,
    `Motor recibe el principio canónico correcto (no texto residual como "para")`,
    parsedIntent.primaryObjective === spec.expectedObjective
  );

  record(
    "tacticalAffinityEngine",
    `principle="${parsedIntent.primaryObjective}"`,
    `directMatches=${directMatches.length}`,
    `Al menos 5 candidatos con afinidad táctica directa`,
    directMatches.length >= 5
  );

  // ──────────────────────────────────────────────────────────────────────────
  // CAPA 4: → PedagogicalProgressionEngine (barrera interna del planner)
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n[CAPA 4] → PedagogicalProgressionEngine.scoreCandidate (barrera interna del planner)");
  console.log(`  Input: parsedIntent + catálogo de ${catalog.length} ejercicios`);
  console.log(`  NOTA: El planner usa scoreCandidate + filtro isBlockAppropriate && pertinenceScore > 30`);

  const progEngine = PedagogicalProgressionEngine.getInstance();
  const phases: Array<{ key: string; label: string }> = [
    { key: "activacion", label: "B1 Activación" },
    { key: "principal_1", label: "B2 Principal 1" },
    { key: "principal_2", label: "B3 Principal 2" },
    { key: "global", label: "B4 Global" },
    { key: "vuelta_calma", label: "B5 Vuelta a la Calma" }
  ];

  for (const phase of phases) {
    const scoredCandidates = catalog.map(ex => {
      const progScore = progEngine.scoreCandidate(ex, phase.key as any, parsedIntent);
      const isBlockAppropriate = progScore.totalScore > 30;
      return { ex, progScore, isBlockAppropriate };
    }).filter(c => c.isBlockAppropriate && c.progScore.totalScore > 0)
      .sort((a, b) => b.progScore.totalScore - a.progScore.totalScore);

    console.log(`\n  ${phase.label}: ${scoredCandidates.length} ejercicios pasan la barrera interna del planner`);
    scoredCandidates.slice(0, 3).forEach((c, i) => {
      console.log(`    Top ${i+1}: "${c.ex.nombre}" | progScore=${c.progScore.totalScore} | objFit=${c.progScore.objectiveFit} | catFit=${c.progScore.categoryFit} | pedagFit=${c.progScore.pedagogicalFit}`);
      console.log(`      bloque_sesion="${c.ex.bloque_sesion}" game_phase="${c.ex.game_phase}" rep=${c.ex.representatividad} opo=${c.ex.oposicion}`);
    });

    record(
      `PedagogicalEngine`,
      `phase="${phase.key}", objective="${parsedIntent.primaryObjective}"`,
      `selectableCandidates=${scoredCandidates.length}`,
      `${phase.label} tiene candidatos que pasan barrera interna (pertinenceScore > 30)`,
      scoredCandidates.length > 0
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CAPA 5: → SessionPlannerService.generateSession (flujo real completo)
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n[CAPA 5] → SessionPlannerService.generateSession (generación real de la sesión)");
  console.log(`  Input: prompt="${spec.prompt}", catalog=[${catalog.length} ejercicios]`);

  const planner = SessionPlannerService.getInstance();
  const genResult = await planner.generateSession(spec.prompt, catalog);

  record(
    "SessionPlannerService",
    `prompt="${spec.prompt}"`,
    `success=${genResult.success}, session=${genResult.session ? "GENERADA" : "NULL"}, error="${genResult.error ?? "ninguno"}"`,
    `generateSession retorna success=true con sesión no nula`,
    genResult.success === true && genResult.session != null
  );

  if (!genResult.success || !genResult.session) {
    console.error(`  FATAL: Sesión no generada. Error: ${genResult.error}`);
    return;
  }

  const session = genResult.session;

  console.log(`\n  Output GeneratedSessionPlan:`);
  console.log(`    title: "${session.title}"`);
  console.log(`    methodologicalSummary: "${session.methodologicalSummary}"`);
  console.log(`    intent.primaryObjective: "${session.intent.primaryObjective}"`);
  console.log(`    intent.ageCategory: "${session.intent.ageCategory ?? "undefined"}"`);
  console.log(`    intent.players: ${session.intent.players ?? "undefined"}`);
  console.log(`    totalDurationMinutes: ${session.totalDurationMinutes}`);
  console.log(`    calculatedDurationMinutes: ${session.calculatedDurationMinutes}`);
  console.log(`    isDurationExact: ${session.isDurationExact}`);
  console.log(`    coherenceScore: ${session.coherenceScore}%`);
  console.log(`    drills.length: ${session.drills.length}`);
  console.log(`    variantLabel: "${session.variantLabel}"`);

  console.log(`\n  Ejercicios seleccionados por el planner:`);
  const duraciones: number[] = [];
  session.drills.forEach((d, i) => {
    const ex = d.exercise;
    duraciones.push(d.allocatedDurationMin);
    console.log(`    B${i+1} [${d.phase}] "${ex.nombre || ex.title}" (${d.allocatedDurationMin} min)`);
    console.log(`      ID: ${ex.id} | bloque_sesion: ${ex.bloque_sesion} | game_phase: ${ex.game_phase}`);
    console.log(`      carga_fisica: ${ex.carga_fisica} | oposicion: ${ex.oposicion} | rep: ${ex.representatividad}`);
    console.log(`      matchScore: ${d.matchScore}`);
  });
  console.log(`    Duraciones: [${duraciones.join(" + ")}] = ${duraciones.reduce((a,b)=>a+b,0)} min`);

  record(
    "SessionPlannerService",
    `parsedIntent.primaryObjective="${parsedIntent.primaryObjective}"`,
    `session.intent.primaryObjective="${session.intent.primaryObjective}"`,
    `Objetivo en sesión = "${spec.expectedObjective}"`,
    session.intent.primaryObjective === spec.expectedObjective
  );

  if (spec.expectedCategory) {
    record(
      "SessionPlannerService",
      `parsedIntent.ageCategory="${parsedIntent.ageCategory}"`,
      `session.intent.ageCategory="${session.intent.ageCategory}"`,
      `Categoría en sesión = "${spec.expectedCategory}"`,
      session.intent.ageCategory === spec.expectedCategory
    );
  }

  if (spec.assertPlayersUndefined) {
    record(
      "SessionPlannerService",
      `parsedIntent.players=undefined`,
      `session.intent.players=${session.intent.players ?? "undefined"}`,
      `players en sesión = undefined (sin inventar datos)`,
      session.intent.players === undefined
    );
  }

  if (spec.expectedPlayers !== undefined) {
    record(
      "SessionPlannerService",
      `parsedIntent.players=${parsedIntent.players}`,
      `session.intent.players=${session.intent.players}`,
      `players en sesión = ${spec.expectedPlayers}`,
      session.intent.players === spec.expectedPlayers
    );
  }

  record(
    "SessionPlannerService",
    `phaseDurations=[5 fases]`,
    `drills.length=${session.drills.length}`,
    `Exactamente 5 bloques generados`,
    session.drills.length === 5
  );

  const expectedPhases = ["activacion", "principal_1", "principal_2", "global", "vuelta_calma"];
  expectedPhases.forEach((ph, i) => {
    if (session.drills[i]) {
      record(
        "SessionPlannerService",
        `phaseTemplate[${i}].key="${ph}"`,
        `drills[${i}].phase="${session.drills[i].phase}"`,
        `Bloque ${i+1} tiene fase correcta = "${ph}"`,
        session.drills[i].phase === ph
      );
    }
  });

  const sumDur = session.drills.reduce((acc, d) => acc + d.allocatedDurationMin, 0);
  record(
    "SessionPlannerService",
    `totalDurationMinutes=${spec.expectedDuration}`,
    `sum=${sumDur}, isDurationExact=${session.isDurationExact}`,
    `Suma de duraciones = ${spec.expectedDuration} min exactos`,
    sumDur === spec.expectedDuration && session.isDurationExact
  );

  // ──────────────────────────────────────────────────────────────────────────
  // CAPA 6: Barrera interna del planner verificada sobre ejercicios seleccionados
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n[CAPA 6] Barrera interna del planner → verificación sobre ejercicios seleccionados");
  console.log(`  Input: session.drills (ejercicios elegidos por el planner)`);
  console.log(`  NOTA: Se verifica que cada ejercicio pasó la barrera pertinenceScore > 30 del planner.`);
  console.log(`        El planner usa PedagogicalProgressionEngine, NO isExerciseSelectableForBlock del recommendationEngine.`);

  session.drills.forEach((d, i) => {
    const progScore = progEngine.scoreCandidate(d.exercise, d.phase as any, parsedIntent);
    const passedBarrier = progScore.totalScore > 30;
    console.log(`  Drill B${i+1} "${d.exercise.nombre}" → pertinenceScore=${progScore.totalScore} → passedInternalBarrier: ${passedBarrier}`);

    record(
      "PlannerBarrier",
      `exercise="${d.exercise.nombre}", phase="${d.phase}"`,
      `pertinenceScore=${progScore.totalScore}, passedBarrier=${passedBarrier}`,
      `Ejercicio B${i+1} pasa la barrera interna del planner (pertinenceScore > 30)`,
      passedBarrier
    );
  });

  // ──────────────────────────────────────────────────────────────────────────
  // CAPA 7: SessionCoherenceAuditor → Auditoría real sobre la sesión generada
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n[CAPA 7] SessionCoherenceAuditor → auditAndRepairSession (auditoría real)");
  console.log(`  Input: session.drills (${session.drills.length}), session.intent, catalog`);

  const auditor = SessionCoherenceAuditor.getInstance();
  const auditResult = auditor.auditAndRepairSession(session.drills, session.intent, catalog);

  console.log(`  Output CoherenceAuditResult:`);
  console.log(`    valid: ${auditResult.valid}`);
  console.log(`    coherenceScore: ${auditResult.coherenceScore}%`);
  console.log(`    auditedDrills: ${auditResult.auditedDrills.length} / 5`);
  console.log(`    chainValid: ${auditResult.progressionReport.chainValid}`);
  console.log(`    affinityScoreP1P2: ${auditResult.progressionReport.affinityScoreP1P2}`);
  console.log(`    oppositionCurve: [${auditResult.progressionReport.oppositionCurve.join(", ")}]`);
  console.log(`    representativenessCurve: [${auditResult.progressionReport.representativenessCurve.join(", ")}]`);
  console.log(`    warnings: [${auditResult.warnings.join(" | ") || "ninguna"}]`);

  record(
    "SessionCoherenceAuditor",
    `session.drills.length=${session.drills.length}`,
    `valid=${auditResult.valid}`,
    `Auditor dictamina valid = true`,
    auditResult.valid === true
  );

  record(
    "SessionCoherenceAuditor",
    `session.drills`,
    `coherenceScore=${auditResult.coherenceScore}`,
    `coherenceScore = 100%`,
    auditResult.coherenceScore === 100
  );

  record(
    "SessionCoherenceAuditor",
    `session.drills`,
    `auditedDrills.length=${auditResult.auditedDrills.length}`,
    `5/5 bloques auditados sin errores`,
    auditResult.auditedDrills.length === 5
  );

  record(
    "SessionCoherenceAuditor",
    `progressionReport`,
    `chainValid=${auditResult.progressionReport.chainValid}`,
    `Cadena pedagógica B1→B4 es válida`,
    auditResult.progressionReport.chainValid === true
  );

  // B5 regenerativo
  const b5drill = auditResult.auditedDrills[4];
  const b5carga = b5drill?.physicalLoad ?? b5drill?.exercise?.carga_fisica ?? 999;
  const b5opo = b5drill?.oppositionLevel ?? b5drill?.exercise?.oposicion ?? 999;
  console.log(`  B5 vuelta_calma: physicalLoad=${b5carga}, oppositionLevel=${b5opo}`);

  record(
    "SessionCoherenceAuditor",
    `B5.physicalLoad=${b5carga}, B5.oppositionLevel=${b5opo}`,
    `regenerativo=${b5carga <= 2 && b5opo <= 1}`,
    `B5 es estrictamente regenerativo (carga≤2, oposición≤1)`,
    b5carga <= 2 && b5opo <= 1
  );

  // Progresión de oposición B1→B4
  const opoB1 = auditResult.progressionReport.oppositionCurve[0] ?? 0;
  const opoB4 = auditResult.progressionReport.oppositionCurve[3] ?? 0;
  record(
    "SessionCoherenceAuditor",
    `oppositionCurve=[${auditResult.progressionReport.oppositionCurve.join(",")}]`,
    `opoB1=${opoB1}, opoB4=${opoB4}`,
    `Progresión de oposición B1→B4 no decrece (B4 ≥ B1)`,
    opoB4 >= opoB1
  );

  // ──────────────────────────────────────────────────────────────────────────
  // CAPA 8: Auditor → UI (payload final renderizable)
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n[CAPA 8] SessionCoherenceAuditor → UI (payload final renderizable en biblioteca/page.tsx)");
  console.log(`  Input: GeneratedSessionPlan (objeto completo devuelto por generateIntelligentSessionAction)`);

  // El objeto que la UI recibe es session (GeneratedSessionPlan)
  console.log(`  Output UI renderizado (state: setGeneratedSession(res.session)):`);
  console.log(`    [📌 objective badge]: "${session.intent.primaryObjective}"`);
  console.log(`    [📌 category badge]: "${session.intent.ageCategory ?? "—"}"`);
  console.log(`    [📌 players display]: ${session.intent.players ?? "no mostrado (undefined)"}`);
  console.log(`    [📌 duration display]: "${session.calculatedDurationMinutes} / ${session.totalDurationMinutes} min"`);
  console.log(`    [📌 coherence badge]: "${session.coherenceScore}% Coherencia Metodológica"`);
  console.log(`    [📌 drills list]: ${session.drills.length} bloques`);
  console.log(`    [📌 isDurationExact]: ${session.isDurationExact} → badge: "${session.isDurationExact ? 'Duración exacta' : 'Ajuste necesario'}"`);
  console.log(`    [📌 variantLabel]: "${session.variantLabel}"`);

  record(
    "UI (payload final)",
    `GeneratedSessionPlan`,
    `intent.primaryObjective="${session.intent.primaryObjective}"`,
    `UI muestra objective = "${spec.expectedObjective}"`,
    session.intent.primaryObjective === spec.expectedObjective
  );

  if (spec.expectedCategory) {
    record(
      "UI (payload final)",
      `GeneratedSessionPlan`,
      `intent.ageCategory="${session.intent.ageCategory}"`,
      `UI muestra category = "${spec.expectedCategory}"`,
      session.intent.ageCategory === spec.expectedCategory
    );
  }

  if (spec.assertPlayersUndefined) {
    record(
      "UI (payload final)",
      `GeneratedSessionPlan`,
      `intent.players=${session.intent.players ?? "undefined"}`,
      `UI NO renderiza players (undefined — campo ocultado en UI)`,
      session.intent.players === undefined
    );
  }

  if (spec.expectedPlayers !== undefined) {
    record(
      "UI (payload final)",
      `GeneratedSessionPlan`,
      `intent.players=${session.intent.players}`,
      `UI muestra "Jugadores: ${spec.expectedPlayers}"`,
      session.intent.players === spec.expectedPlayers
    );
  }

  record(
    "UI (payload final)",
    `GeneratedSessionPlan`,
    `coherenceScore=${session.coherenceScore}`,
    `Badge "Coherencia Metodológica 100%" visible en UI`,
    session.coherenceScore === 100
  );

  record(
    "UI (payload final)",
    `GeneratedSessionPlan`,
    `drills.length=${session.drills.length}`,
    `UI muestra exactamente 5 bloques en lista de progresión`,
    session.drills.length === 5
  );

  record(
    "UI (payload final)",
    `GeneratedSessionPlan`,
    `calculatedDurationMinutes=${session.calculatedDurationMinutes}, isDurationExact=${session.isDurationExact}`,
    `UI muestra badge "Duración exacta: ${spec.expectedDuration}/${spec.expectedDuration} min"`,
    session.calculatedDurationMinutes === spec.expectedDuration && session.isDurationExact
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(90));
  console.log("  VALIDACIÓN E2E FINAL — GENERADOR METODOLÓGICO SPORTING SALADAR");
  console.log("  Flujo real: UI → NLParser → SessionRequestParser → TacticalEngine");
  console.log("  → PedagogicalEngine → barrera interna → CoherenceAuditor → UI");
  console.log("=".repeat(90));

  console.log("\n[INIT] Cargando catálogo real desde banco_ejercicios (Supabase)...");
  const { data: catalog, error } = await supabase.from("banco_ejercicios").select("*");

  if (error || !catalog) {
    console.error("FATAL: No se pudo cargar el catálogo.", error?.message);
    process.exit(1);
  }

  console.log(`[INIT] Catálogo cargado: ${catalog.length} ejercicios desde Supabase (misma fuente que generateIntelligentSessionAction)`);

  // ─── CASO 1: 1v1 para Senior, 75 minutos ──────────────────────────────────
  await runCase({
    label: "CASO 1 — 1v1 para Senior, 75 minutos",
    prompt: "1v1 para Senior, 75 minutos.",
    expectedObjective: "progresion",
    expectedCategory: "senior",
    assertPlayersUndefined: true,
    expectedPlayers: undefined,
    expectedDuration: 75
  }, catalog);

  // ─── CASO 2: Finalización y remate para Senior, 75 minutos ───────────────
  await runCase({
    label: "CASO 2 — Sesión de finalización y remate para Senior, 75 minutos",
    prompt: "Sesión de finalización y remate para Senior, 75 minutos.",
    expectedObjective: "finalizacion",
    expectedCategory: "senior",
    assertPlayersUndefined: true,
    expectedPlayers: undefined,
    expectedDuration: 75
  }, catalog);

  // ─── CASO 3: Posesión y circulación para Infantil, 75 minutos ────────────
  // NOTA: La clave canónica para "posesión y circulación" es "circulacion" según getPrincipleTaxonomyKey
  await runCase({
    label: "CASO 3 — Sesión de posesión y circulación para Infantil, 75 minutos",
    prompt: "Sesión de posesión y circulación para Infantil, 75 minutos.",
    expectedObjective: "circulacion",   // clave canónica real: "circulacion" (no "posesion")
    expectedCategory: "infantil",
    assertPlayersUndefined: true,
    expectedPlayers: undefined,
    expectedDuration: 75
  }, catalog);

  // ─── CASO NEGATIVO: 1v1 para Senior, 75 minutos, para 2 jugadores ────────
  // ÚNICO caso donde players DEBE ser 2
  await runCase({
    label: "CASO NEGATIVO — 1v1 para Senior, 75 minutos, para 2 jugadores",
    prompt: "1v1 para Senior, 75 minutos, para 2 jugadores.",
    expectedObjective: "progresion",
    expectedCategory: "senior",
    assertPlayersUndefined: false,
    expectedPlayers: 2,   // SOLO en este caso players debe ser 2
    expectedDuration: 75
  }, catalog);

  // ─── TABLA FINAL ──────────────────────────────────────────────────────────
  console.log("\n");
  console.log("=".repeat(140));
  console.log("  TABLA RESUMEN — VALIDACIÓN E2E FINAL");
  console.log("  ETAPA | INPUT | OUTPUT | ASSERTION | PASS/FAIL");
  console.log("=".repeat(140));

  const cases = [
    "CASO 1 — 1v1 para Senior, 75 minutos",
    "CASO 2 — Sesión de finalización y remate para Senior, 75 minutos",
    "CASO 3 — Sesión de posesión y circulación para Infantil, 75 minutos",
    "CASO NEGATIVO — 1v1 para Senior, 75 minutos, para 2 jugadores"
  ];

  for (const caseLabel of cases) {
    const caseRows = allRows.filter(r => r.caseLabel === caseLabel);
    const casePass = caseRows.filter(r => r.result === "PASS").length;
    const caseFail = caseRows.filter(r => r.result === "FAIL").length;
    console.log(`\n  ════ ${caseLabel} [${casePass} PASS / ${caseFail} FAIL] ════`);
    console.log(`  ${"ETAPA".padEnd(28)} | ${"ASSERTION".padEnd(65)} | ${"RESULT".padEnd(6)}`);
    console.log(`  ${"-".repeat(28)} | ${"-".repeat(65)} | ${"-".repeat(6)}`);
    for (const row of caseRows) {
      const icon = row.result === "PASS" ? "✅" : "❌";
      const stage = row.stage.padEnd(28).slice(0, 28);
      const assertion = row.assertion.padEnd(65).slice(0, 65);
      console.log(`  ${icon} ${stage} | ${assertion} | ${row.result}`);
      if (row.error) console.log(`     DETALLE: ${row.error}`);
    }
  }

  // ─── RESULTADO GLOBAL ─────────────────────────────────────────────────────
  console.log("\n");
  console.log("=".repeat(90));
  console.log(`  RESULTADO GLOBAL DE LA VALIDACIÓN E2E FINAL`);
  console.log(`  Total: ${allRows.length} assertions | ${totalPass} PASS | ${totalFail} FAIL`);
  if (totalFail === 0) {
    console.log(`  ✅ 100% PASS — Flujo UI→Motor→UI verificado para los 4 casos`);
    console.log(`  ✅ Cadena completa: NLParser → SessionRequestParser → TacticalEngine → PedagogicalEngine → CoherenceAuditor → UI`);
  } else {
    console.log(`  ❌ HAY FALLOS — Revisar tabla de assertions arriba`);
  }
  console.log("=".repeat(90));

  process.exit(totalFail > 0 ? 1 : 0);
}

main().catch(err => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
