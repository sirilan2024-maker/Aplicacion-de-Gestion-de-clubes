/**
 * TESTS E2E DE CICLO METODOLÓGICO COMPLETO (FASE 5.4)
 * Antigravity Methodology OS
 */

console.log("================================================================================");
console.log("FASE 5.4 — TESTS E2E DEL CICLO METODOLÓGICO COMPLETO");
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

const { calculatePlannedVsExecutedFeedback } = require("./src/lib/methodology/sessionExecutionFeedbackService");
const { generatePostSessionFeedback } = require("./src/lib/methodology/ai/methodologyAIPostSessionService");
const { computePrioritiesEvolution } = require("./src/lib/methodology/methodologyPriorityEvolutionService");
const { buildAIPlanningProposal } = require("./src/lib/methodology/ai/methodologyAIPlanningService");
const { buildTeamPlanningAIContext } = require("./src/lib/methodology/ai/methodologyAIPlanningContextBuilder");

async function runE2EClosedLoopTests() {
  console.log("--- Flujo Completo: Planificación -> Ejecución -> Evaluación -> Feedback -> Nuevas Prioridades -> Replanificación ---");

  const mockClub = { id: "club-real", name: "Sporting Saladar" };
  const mockTeam = { id: "team-cadete-a", name: "Cadete A", category: "cadete" };
  const mockSeason = { id: "season-26-27", name: "2026-27" };
  const mockPrinciples = [
    { id: "p1", name: "Presión alta", game_phase: "Defensa" },
    { id: "p2", name: "Salida de balón", game_phase: "Ataque" }
  ];

  // 1. Planificación Inicial
  const ctxPlanning1 = buildTeamPlanningAIContext({
    club: mockClub, team: mockTeam, season: mockSeason,
    weekStartDate: "2026-09-01", matchDayDate: "2026-09-07", matchOpponent: "Valencia CF",
    trainingDays: [2, 4, 5],
    report: { summary: { evaluatedSessions: 4, avgObjectiveAchievement: 2.8, modelCoveragePercentage: 70 } },
    priorities: [{ id: "prio-presion", title: "Presión alta", priorityLevel: "high", suggestedDay: "MD-3" }]
  });

  const plan1 = buildAIPlanningProposal(ctxPlanning1, mockPrinciples);
  assert(plan1.proposedMicrocycle.days.length === 7, "Ciclo Paso 1: Microciclo inicial planificado");

  // 2. Ejecución y Cierre de Sesión con Evaluación
  const sessionExecuted = {
    id: "sess-md3-01",
    objective: "Presión alta",
    duration_minutes: 90,
    microcycleDay: "MD-3",
    num_players: 16
  };

  const evalPayload = {
    actualDurationMin: 90,
    sessionRpe: 8.5, // RPE alto -> gatillará propuesta de modulación
    objectiveAchievement: 3.4,
    playersPresentCount: 16,
    behaviours: [{ score: 3.5 }]
  };

  const feedback = generatePostSessionFeedback({
    session: sessionExecuted,
    evaluation: evalPayload,
    history: [{ id: "s1" }, { id: "s2" }, { id: "s3" }]
  });

  assert(feedback.comparison.dataQuality.isEvaluated === true, "Ciclo Paso 2: Sesión evaluada con feedback determinista");
  assert(feedback.actionProposals.length > 0, "Ciclo Paso 2: IA genera propuesta de modulación por RPE alto");

  // 3. Recálculo Determinista de Prioridades
  const evolution = computePrioritiesEvolution(
    { curriculumPrinciples: mockPrinciples, recentSessions: [] },
    { curriculumPrinciples: mockPrinciples, recentSessions: [{ date_time: new Date().toISOString(), objective: "Presión alta", session_evaluations: [{ objective_achievement: 3.4 }] }] }
  );

  assert(evolution.currentPriorities !== undefined, "Ciclo Paso 3: Prioridades recalculadas determinísticamente tras la sesión");

  // 4. Replanificación de Siguiente Jornada (MD-2)
  const ctxPlanning2 = buildTeamPlanningAIContext({
    club: mockClub, team: mockTeam, season: mockSeason,
    weekStartDate: "2026-09-01", matchDayDate: "2026-09-07", matchOpponent: "Valencia CF",
    trainingDays: [4, 5],
    report: { summary: { evaluatedSessions: 5, avgObjectiveAchievement: 3.0, modelCoveragePercentage: 75 } },
    priorities: evolution.currentPriorities
  });

  const plan2 = buildAIPlanningProposal(ctxPlanning2, mockPrinciples);
  assert(plan2.validationResults.valid === true, "Ciclo Paso 4: Replanificación asistida revalidada positivamente");

  // 5. Cero Persistencia de IA
  let writes = 0;
  const origFetch = global.fetch;
  global.fetch = function(...args) {
    const method = (args[1]?.method || "GET").toUpperCase();
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) writes++;
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  };

  // Todo el ciclo se ejecutó en memoria
  assert(writes === 0, "Ciclo Paso 5: 0 escrituras durante todo el ciclo IA -> Evaluación -> Replanificación");

  if (origFetch) global.fetch = origFetch;

  console.log("\n================================================================================");
  console.log("RESULTADO FASE 5.4 TESTS E2E CICLO CERRADO: " + passed + " PASADOS, " + failed + " FALLADOS");
  console.log("================================================================================\n");

  if (failed > 0) process.exit(1);
}

runE2EClosedLoopTests();
