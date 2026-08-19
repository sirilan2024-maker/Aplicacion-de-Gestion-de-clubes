/**
 * TESTS E2E DEL PILOTO PRODUCTIVO DEL ENTRENADOR (FASE 5.8)
 * Antigravity Methodology OS
 */

console.log("================================================================================");
console.log("FASE 5.8 — TESTS E2E DEL PILOTO PRODUCTIVO: FLUJO COMPLETO DEL ENTRENADOR");
console.log("================================================================================\n");

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log("OK [PASS] " + testName);
    passed++;
  } else {
    console.error("XX [FAIL] " + testName);
    failed++;
  }
}

const { buildTeamPlanningAIContext } = require("./src/lib/methodology/ai/methodologyAIPlanningContextBuilder");
const { buildAIPlanningProposal, updateAIPlanningDay } = require("./src/lib/methodology/ai/methodologyAIPlanningService");
const { convertMicrocycleDayToSessionContext } = require("./src/lib/methodology/methodologyMicrocyclePlanner");
const { generateMethodologySessionProposal, validateMethodologySessionProposal } = require("./src/lib/methodology/methodologySessionGenerator");
const { calculatePlannedVsExecutedFeedback } = require("./src/lib/methodology/sessionExecutionFeedbackService");
const { generatePostSessionFeedback } = require("./src/lib/methodology/ai/methodologyAIPostSessionService");
const { computePrioritiesEvolution } = require("./src/lib/methodology/methodologyPriorityEvolutionService");
const { defaultObservabilityService } = require("./src/lib/methodology/methodologyObservabilityService");

async function runCoachPilotFlow() {
  const club = { id: "club-pilot-1", name: "Sporting Saladar" };
  const team = { id: "team-infantil-a", name: "Infantil A", category: "infantil" };
  const season = { id: "season-2026-27", name: "2026-27" };

  const principles = [
    { id: "p1", name: "Salida de balón", game_phase: "Ataque" },
    { id: "p2", name: "Presión tras pérdida", game_phase: "Transición Ataque-Defensa" }
  ];

  const exercises = [
    { id: "e1", nombre: "Activación Rondo 4v2", tipo: "rondo", bloque_sesion: "activacion", dificultad: 2, duracion_recomendada: 15, tags: ["posesion"] },
    { id: "e2", nombre: "Juego de Posición 6v4", tipo: "juego_medio", bloque_sesion: "principal", dificultad: 3, duracion_recomendada: 20, tags: ["salida"] },
    { id: "e3", nombre: "Circuito Técnico de Pase", tipo: "analitico", bloque_sesion: "principal", dificultad: 2, duracion_recomendada: 25, tags: ["pase"] },
    { id: "e4", nombre: "Partido Condicionado 8v8", tipo: "juego_global", bloque_sesion: "global", dificultad: 3, duracion_recomendada: 20, tags: ["global"] },
    { id: "e5", nombre: "Vuelta a la Calma", tipo: "calentamiento", bloque_sesion: "vuelta_calma", dificultad: 1, duracion_recomendada: 10, tags: ["regenerativo"] },
    { id: "e6", nombre: "Juego Global 7v7 Amplitud", tipo: "juego_global", bloque_sesion: "global", dificultad: 3, duracion_recomendada: 20, tags: ["global"] }
  ];

  console.log("--- 1. Consulta de Memoria y Prioridades Iniciales ---");
  const ctxPlanning = buildTeamPlanningAIContext({
    club,
    team,
    season,
    weekStartDate: "2026-09-01",
    matchDayDate: "2026-09-07",
    matchOpponent: "Levante UD",
    trainingDays: [2, 4, 5],
    report: { summary: { evaluatedSessions: 4, avgObjectiveAchievement: 2.7, modelCoveragePercentage: 70 } },
    priorities: [{ id: "prio-1", title: "Salida de balón", suggestedDay: "MD-3" }]
  });

  assert(ctxPlanning.planningContext.priorities.length === 1, "Paso 1: Prioridad institucional cargada");

  console.log("\n--- 2. Generación y Revisión de Planificación Semanal Asistida ---");
  const planProposal = buildAIPlanningProposal(ctxPlanning, principles, exercises);
  assert(planProposal.proposedMicrocycle.days.length === 7, "Paso 2: Microciclo de 7 días propuesto");

  console.log("\n--- 3. Modificación Humana de una Jornada (MD-3 a 80 min) y Revalidación ---");
  const editResult = updateAIPlanningDay(planProposal, 2, { plannedDurationMin: 80, objective: "Salida de balón limpia" }, principles);
  assert(editResult.valid === true, "Paso 3: Modificación humana revalidada por el motor determinista");

  console.log("\n--- 4. Generación Asistida de Sesión en el Constructor ---");
  const sessionCtx = convertMicrocycleDayToSessionContext(
    { objective: "Salida de balón limpia", secondaryObjectives: ["Pase"], plannedDurationMin: 80, microcycleDay: "MD-3", targetLoad: "Media" },
    team,
    exercises
  );
  const sessionProposal = generateMethodologySessionProposal(sessionCtx);
  const valSession = validateMethodologySessionProposal(sessionProposal);
  assert(valSession.valid === true, "Paso 4: Sesión validada determinísticamente para ejecución");

  console.log("\n--- 5. Ejecución, Cierre y Evaluación Cuantitativa de la Sesión ---");
  const sessionExecuted = {
    id: "sess-pilot-001",
    objective: "Salida de balón limpia",
    microcycleDay: "MD-3",
    duration_minutes: 80,
    num_players: 16
  };

  const evalPayload = {
    actualDurationMin: 80,
    sessionRpe: 7,
    objectiveAchievement: 3.2,
    playersPresentCount: 16,
    behaviours: [{ behaviourDescription: "Perfilación corporal", score: 3.0 }]
  };

  const compResult = calculatePlannedVsExecutedFeedback({ session: sessionExecuted, evaluation: evalPayload });
  assert(compResult.deviations.durationDiffMin === 0, "Paso 5: Desviación temporal nula confirmada (Δ=0)");
  assert(compResult.executed.objectiveAchievement === 3.2, "Paso 5: Consecución 3.2 registrada");

  console.log("\n--- 6. Feedback Post-Sesión IA y Evolución de Prioridades ---");
  const postSessionFeedback = generatePostSessionFeedback({
    session: sessionExecuted,
    evaluation: evalPayload,
    history: [{ id: "s1" }, { id: "s2" }, { id: "s3" }]
  });
  assert(postSessionFeedback.dataSufficiency.sufficient === true, "Paso 6: Feedback post-sesión generado con suficiencia");

  const evol = computePrioritiesEvolution(
    { curriculumPrinciples: principles, recentSessions: [] },
    { curriculumPrinciples: principles, recentSessions: [{ date_time: new Date().toISOString(), objective: "Salida de balón limpia", session_evaluations: [{ objective_achievement: 3.2 }] }] }
  );
  assert(evol.currentPriorities !== undefined, "Paso 6: Prioridades actualizadas tras la sesión");

  console.log("\n--- 7. Registro de Observabilidad y Feedback Humano ---");
  defaultObservabilityService.logEvent({
    type: 'proposal_applied',
    clubId: club.id,
    teamId: team.id
  });
  defaultObservabilityService.recordHumanFeedback({
    proposalId: planProposal.id,
    teamId: team.id,
    clubId: club.id,
    rating: 'util',
    coachComment: 'Planificación coherente con el modelo'
  });

  const metrics = defaultObservabilityService.getOperationalMetrics(club.id);
  assert(metrics.proposals.applied >= 1, "Paso 7: Propuesta aplicada contabilizada en observabilidad");
  assert(metrics.feedbackSummary.usefulCount >= 1, "Paso 7: Feedback humano 'útil' registrado");

  console.log("\n================================================================================");
  console.log("RESULTADO FASE 5.8 TESTS PILOTO: " + passed + " PASADOS, " + failed + " FALLADOS");
  console.log("================================================================================\n");

  if (failed > 0) process.exit(1);
}

runCoachPilotFlow();
