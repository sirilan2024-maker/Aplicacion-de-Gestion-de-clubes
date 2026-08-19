/**
 * TESTS DE PROPUESTAS DE ACCIÓN Y COPILOTO METODOLÓGICO (FASE 5.2)
 * Antigravity Methodology OS
 */

console.log("================================================================================");
console.log("FASE 5.2 — TESTS DE COPILOTO OPERATIVO Y PROPUESTAS DE ACTUACIÓN");
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

const { 
  buildSessionActionProposal, 
  buildMicrocycleActionProposal, 
  validateAIActionProposal, 
  applyAIActionToLocalState, 
  getActionImpactPreview 
} = require("./src/lib/methodology/ai/methodologyAIActionService");
const { buildClubDirectionAIContext, buildTeamAIContext } = require("./src/lib/methodology/ai/methodologyAIContextBuilder");
const { MethodologyAIProvider } = require("./src/lib/methodology/ai/methodologyAIProvider");
const { generateMethodologySessionProposal } = require("./src/lib/methodology/methodologySessionGenerator");
const { generateMicrocycleProposal } = require("./src/lib/methodology/methodologyMicrocyclePlanner");

async function runTests() {
  console.log("--- 1. Creación de Contratos de AI Action Proposal ---");
  const sessionAction = buildSessionActionProposal({
    type: 'regenerate_session_block',
    title: 'Optimizar Bloque Principal 1',
    target: { blockId: 'principal_1' },
    proposedChanges: { modificationsSummary: ['Ajustar oposición a nivel 2'] }
  });

  assert(sessionAction.type === 'regenerate_session_block', "Action Proposal: tipo correcto");
  assert(sessionAction.requiresHumanConfirmation === true, "Action Proposal: requiresHumanConfirmation = true incondicional");
  assert(sessionAction.validationRequirements.length > 0, "Action Proposal: requisitos de validación declarados");

  const microAction = buildMicrocycleActionProposal({
    type: 'regenerate_microcycle_day',
    title: 'Ajustar Carga en MD-1',
    target: { dayOfWeek: 5, microcycleDay: 'MD-1' },
    proposedChanges: { modificationsSummary: ['Reducir a carga Baja'] }
  });

  assert(microAction.type === 'regenerate_microcycle_day', "Microcycle Action: tipo correcto");
  assert(microAction.requiresHumanConfirmation === true, "Microcycle Action: requiresHumanConfirmation = true incondicional");

  console.log("\n--- 2. Validación Determinista de Acciones IA ---");
  const invalidAction = { type: 'unknown_type' };
  const valInvalid = validateAIActionProposal(invalidAction, null);
  assert(valInvalid.valid === false, "Validación: rechaza acción con tipo desconocido o sin objeto objetivo");

  const validActionSession = buildSessionActionProposal({
    type: 'regenerate_session_block',
    target: { blockId: 'principal_1' }
  });
  const mockSession = { blocks: { principal_1: { exercises: [] } } };
  const valValidSession = validateAIActionProposal(validActionSession, mockSession);
  assert(valValidSession.valid === true, "Validación: acepta propuesta de bloque con blockId válido");

  const missingBlockId = buildSessionActionProposal({
    type: 'regenerate_session_block',
    target: {}
  });
  const valMissing = validateAIActionProposal(missingBlockId, mockSession);
  assert(valMissing.valid === false, "Validación: rechaza propuesta de bloque sin target.blockId");

  console.log("\n--- 3. Preview de Impacto (Antes / Después) ---");
  const mockExercises = [
    { id: "e1", nombre: "Rondo 4v2", tipo: "rondo", bloque_sesion: "activacion", dificultad: 2, duracion_recomendada: 15, tags: ["posesion"] },
    { id: "e2", nombre: "Juego Posición 6v4", tipo: "juego_medio", bloque_sesion: "principal", dificultad: 3, duracion_recomendada: 20, tags: ["presion"] },
    { id: "e3", nombre: "Rondo 3v1", tipo: "rondo", bloque_sesion: "principal", dificultad: 2, duracion_recomendada: 20, tags: ["presion"] },
    { id: "e4", nombre: "Partido Reducido 7v7", tipo: "juego_global", bloque_sesion: "global", dificultad: 3, duracion_recomendada: 20, tags: ["global"] },
    { id: "e5", nombre: "Vuelta a la Calma", tipo: "calentamiento", bloque_sesion: "vuelta_calma", dificultad: 1, duracion_recomendada: 10, tags: ["regenerativo"] },
    { id: "e6", nombre: "Presión en Zonas 5v5", tipo: "juego_medio", bloque_sesion: "principal", dificultad: 3, duracion_recomendada: 20, tags: ["presion"] }
  ];

  const sessionProposal = generateMethodologySessionProposal({
    teamId: "t1",
    category: "cadete",
    durationMinutes: 90,
    microcycleDay: "MD-3",
    intensityLoad: 3,
    objective: "Presión tras pérdida",
    allExercises: mockExercises
  });

  const preview = getActionImpactPreview(validActionSession, sessionProposal, {
    teamId: "t1",
    category: "cadete",
    durationMinutes: 90,
    microcycleDay: "MD-3",
    intensityLoad: 3,
    objective: "Presión tras pérdida",
    allExercises: mockExercises
  });

  assert(preview.proposalId !== undefined, "Preview: proposalId presente");
  assert(preview.before.durationMinutes === 90, "Preview: métricas antes calculadas (90 min)");
  assert(preview.after.durationMinutes === 90, "Preview: métricas después calculadas (90 min)");
  assert(preview.changes.deterministicRuleApplied.length > 0, "Preview: regla determinista documentada");
  assert(preview.validation.valid === true, "Preview: validación determinista confirma validez");

  console.log("\n--- 4. Aislamiento en Regeneración de Microciclo ---");
  const microProposal = generateMicrocycleProposal({
    teamId: "t1",
    category: "cadete",
    seasonId: "s1",
    weekStartDate: "2026-08-24",
    matchDayDate: "2026-08-30",
    matchOpponent: "Rival FC",
    trainingDays: [2, 4, 5],
    curriculumPrinciples: [{ id: "p1", name: "Presión alta", game_phase: "Defensa" }]
  });

  const day4Before = microProposal.days.find(d => d.dayOfWeek === 4);
  const day2Before = microProposal.days.find(d => d.dayOfWeek === 2);

  const microActionDay4 = buildMicrocycleActionProposal({
    type: 'regenerate_microcycle_day',
    target: { dayOfWeek: 4 }
  });

  const { updatedObject: updatedMicro } = applyAIActionToLocalState(microActionDay4, microProposal, {
    teamId: "t1",
    category: "cadete",
    seasonId: "s1",
    weekStartDate: "2026-08-24",
    matchDayDate: "2026-08-30",
    matchOpponent: "Rival FC",
    trainingDays: [2, 4, 5],
    curriculumPrinciples: [{ id: "p1", name: "Presión alta", game_phase: "Defensa" }]
  });

  const day2After = updatedMicro.days.find(d => d.dayOfWeek === 2);
  assert(day2After.plannedDurationMin === day2Before.plannedDurationMin, "Aislamiento Microciclo: Día 2 permanece idéntico al regenerar Día 4");

  console.log("\n--- 5. Copiloto IA: Generación de Action Proposals desde Provider ---");
  const aiProvider = new MethodologyAIProvider("mock-key-trigger-offline");
  const mockClub = { id: "club-1", name: "Sporting Saladar" };
  const mockSeason = { id: "season-1", name: "2026-27" };
  const mockReports = [
    {
      team: { id: "t1", name: "Infantil B", category: "infantil" },
      statusDetail: { status: "atencion", statusLabel: "Atención" },
      summary: { avgObjectiveAchievement: 1.9, avgRpe: 8.5, modelCoveragePercentage: 35, evaluatedSessions: 4, totalSessions: 6 },
      alerts: [{ message: "Baja consecución", severity: "high" }]
    }
  ];

  const ctxClub = buildClubDirectionAIContext({
    club: mockClub,
    season: mockSeason,
    reports: mockReports,
    globalKpis: null,
    transversalAlerts: []
  });

  const aiRes = await aiProvider.generateDeterministicAnalysis("¿Qué actuación propones?", ctxClub);
  assert(Array.isArray(aiRes.actionProposals) && aiRes.actionProposals.length > 0, "Provider Copiloto: genera actionProposals automáticas ante equipos en atención");
  assert(aiRes.actionProposals[0].requiresHumanConfirmation === true, "Provider Copiloto: propuestas generadas exigen confirmación humana");

  console.log("\n--- 6. Cero Persistencia y Regla de No Autonomía ---");
  let writesCount = 0;
  const origFetch = global.fetch;
  global.fetch = function(...args) {
    const method = (args[1]?.method || "GET").toUpperCase();
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      writesCount++;
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  };

  // Simular flujo completo IA -> Action Proposal -> Preview -> Local Apply
  const act = buildSessionActionProposal({ type: 'regenerate_session_block', target: { blockId: 'principal_1' } });
  const mockCtx = {
    teamId: "t1",
    category: "cadete",
    durationMinutes: 90,
    microcycleDay: "MD-3",
    intensityLoad: 3,
    objective: "Presión tras pérdida",
    allExercises: mockExercises
  };
  getActionImpactPreview(act, sessionProposal, mockCtx);
  applyAIActionToLocalState(act, sessionProposal, mockCtx);

  assert(writesCount === 0, "No Autonomía: 0 escrituras en BD durante propuesta, preview y aplicación local");

  if (origFetch) global.fetch = origFetch;

  console.log("\n================================================================================");
  console.log("RESULTADO FASE 5.2 TESTS ACCIONES: " + passed + " PASADOS, " + failed + " FALLADOS");
  console.log("================================================================================\n");

  if (failed > 0) process.exit(1);
}

runTests();
