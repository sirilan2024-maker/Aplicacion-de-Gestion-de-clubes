/**
 * TESTS UNITARIOS DE IA DE PLANIFICACIÓN METODOLÓGICA (FASE 5.3)
 * Antigravity Methodology OS
 */

console.log("================================================================================");
console.log("FASE 5.3 — TESTS DE IA DE PLANIFICACIÓN METODOLÓGICA (MICROCICLOS Y SESIONES)");
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
const { MethodologyAIProvider } = require("./src/lib/methodology/ai/methodologyAIProvider");

async function runTests() {
  const mockClub = { id: "club-1", name: "Sporting Saladar" };
  const mockTeam = { id: "team-cadete", name: "Cadete A", category: "cadete" };
  const mockSeason = { id: "season-2026", name: "2026-27" };
  const mockPrinciples = [
    { id: "p1", name: "Presión tras pérdida", game_phase: "Transición Ataque-Defensa" },
    { id: "p2", name: "Salida de balón", game_phase: "Ataque" },
    { id: "p3", name: "Basculación defensiva", game_phase: "Defensa" }
  ];

  console.log("--- 1. Construcción de Contexto de Planificación ---");
  const ctxValid = buildTeamPlanningAIContext({
    club: mockClub,
    team: mockTeam,
    season: mockSeason,
    weekStartDate: "2026-08-24",
    matchDayDate: "2026-08-30",
    matchOpponent: "Rival CF",
    trainingDays: [2, 4, 5],
    report: {
      summary: { evaluatedSessions: 5, avgObjectiveAchievement: 3.2, modelCoveragePercentage: 75 }
    },
    priorities: [
      { id: "pr-1", title: "Mejorar Presión", priorityLevel: "high", evidence: "Baja consecución en transiciones", suggestedDay: "MD-3" }
    ]
  });

  assert(ctxValid.scope === "planning", "Contexto Planificación: scope === 'planning'");
  assert(ctxValid.planningContext.dateRange.weekStartDate === "2026-08-24", "Contexto Planificación: fecha inicio correcta");
  assert(ctxValid.planningContext.matchContext.matchOpponent === "Rival CF", "Contexto Planificación: rival registrado");
  assert(ctxValid.planningContext.priorities.length === 1, "Contexto Planificación: prioridad transferida con N>=3");

  console.log("\n--- 2. Regla N < 3 en Contexto de Planificación ---");
  const ctxN1 = buildTeamPlanningAIContext({
    club: mockClub,
    team: mockTeam,
    season: mockSeason,
    weekStartDate: "2026-08-24",
    trainingDays: [2, 4, 5],
    report: {
      summary: { evaluatedSessions: 1, avgObjectiveAchievement: 2.0, modelCoveragePercentage: 20 }
    },
    priorities: [
      { id: "pr-fake", title: "Prioridad sin muestra", priorityLevel: "high" }
    ]
  });

  assert(ctxN1.planningContext.priorities.length === 0, "Regla N < 3: no incluye prioridades inferidas con muestra insuficiente");

  console.log("\n--- 3. Generación de Planning Proposal Determinista ---");
  const plan = buildAIPlanningProposal(ctxValid, mockPrinciples);

  assert(plan.scope === "team_microcycle_planning", "Proposal: scope correcto");
  assert(plan.requiresHumanConfirmation === true, "Proposal: requiresHumanConfirmation === true incondicional");
  assert(plan.proposedMicrocycle.days.length === 7, "Proposal: microciclo contiene 7 días exactos");
  assert(plan.proposedMicrocycle.trainingDaysCount === 3, "Proposal: 3 días de entrenamiento programados");
  assert(plan.proposedSessions.length === 3, "Proposal: genera 3 plantillas de sesión con bloques");
  assert(plan.validationResults.valid === true, "Proposal: validación determinista confirma microciclo válido");

  console.log("\n--- 4. Trazabilidad de Prioridades en la Planificación ---");
  const md3Day = plan.proposedMicrocycle.days.find(d => d.microcycleDay === "MD-3");
  assert(md3Day !== undefined && md3Day.sessionType === "Entrenamiento", "Trazabilidad: Jornada MD-3 identificada como entrenamiento");
  assert(plan.priorities.length > 0 && plan.priorities[0].affectedDay === "MD-3", "Trazabilidad: Prioridad mapeada a MD-3");

  console.log("\n--- 5. Edición Humana y Revalidación Determinista ---");
  // Editar día 2 (Martes) cambiando objetivo y duración
  const editResult = updateAIPlanningDay(plan, 2, {
    plannedDurationMin: 75,
    objective: "Salida de balón y repliegue"
  }, mockPrinciples);

  assert(editResult.valid === true, "Edición Humana: actualización de día válida");
  const updatedDay2 = editResult.proposal.proposedMicrocycle.days.find(d => d.dayOfWeek === 2);
  assert(updatedDay2.plannedDurationMin === 75, "Edición Humana: duración modificada a 75 min");
  assert(updatedDay2.objective === "Salida de balón y repliegue", "Edición Humana: objetivo actualizado");

  // Forzar error: duración fuera de regla
  const badEditResult = updateAIPlanningDay(plan, 2, {
    plannedDurationMin: 200 // Excede límite
  }, mockPrinciples);
  assert(badEditResult.warnings.length > 0 || badEditResult.valid === false, "Edición Humana: detecta advertencia ante duración excesiva");

  console.log("\n--- 6. Fallback de Provider IA ante Planificación ---");
  const aiProvider = new MethodologyAIProvider("mock-offline-key");
  const aiResponse = await aiProvider.generateDeterministicAnalysis("Planificar microciclo", ctxValid);

  assert(aiResponse.planningProposal !== undefined, "Provider: genera planningProposal en fallback");
  assert(aiResponse.planningProposal.proposedMicrocycle.days.length === 7, "Provider: planningProposal completa");
  assert(aiResponse.dataSufficiency.sufficient === true, "Provider: dataSufficiency.sufficient === true con N>=3");

  console.log("\n--- 7. Cero Persistencia en BD ---");
  let writesCount = 0;
  const origFetch = global.fetch;
  global.fetch = function(...args) {
    const method = (args[1]?.method || "GET").toUpperCase();
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      writesCount++;
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  };

  buildAIPlanningProposal(ctxValid, mockPrinciples);
  updateAIPlanningDay(plan, 2, { plannedDurationMin: 80 }, mockPrinciples);
  await aiProvider.askAssistant("Planificar", ctxValid);

  assert(writesCount === 0, "No Autonomía: 0 escrituras en BD durante propuesta, preview, edición y fallback");

  if (origFetch) global.fetch = origFetch;

  console.log("\n================================================================================");
  console.log("RESULTADO FASE 5.3 TESTS PLANIFICACIÓN: " + passed + " PASADOS, " + failed + " FALLADOS");
  console.log("================================================================================\n");

  if (failed > 0) process.exit(1);
}

runTests();
