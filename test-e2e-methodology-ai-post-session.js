/**
 * TESTS E2E DE FEEDBACK POST-SESIÓN CON IA Y ACCIONES (FASE 5.4)
 * Antigravity Methodology OS
 */

console.log("================================================================================");
console.log("FASE 5.4 — TESTS E2E DE FEEDBACK POST-SESIÓN IA Y PROPUESTAS DE ACTUACIÓN");
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

const { generatePostSessionFeedback } = require("./src/lib/methodology/ai/methodologyAIPostSessionService");
const { getActionImpactPreview, applyAIActionToLocalState } = require("./src/lib/methodology/ai/methodologyAIActionService");

function runE2EPostSessionTests() {
  const session = {
    id: "sess-e2e-post-1",
    objective: "Salida de balón bajo presión",
    microcycleDay: "MD-3",
    duration_minutes: 90,
    num_players: 16
  };

  const evaluation = {
    actualDurationMin: 110, // Desviación severa +20 min
    sessionRpe: 8.5,        // RPE excesivo
    objectiveAchievement: 1.9, // Consecución crítica
    playersPresentCount: 16
  };

  const feedback = generatePostSessionFeedback({
    session,
    evaluation,
    history: [{ id: "h1" }, { id: "h2" }, { id: "h3" }]
  });

  assert(feedback.actionProposals.length >= 2, "E2E Post-Session: IA genera 2 propuestas ante RPE alto y baja consecución");
  assert(feedback.actionProposals[0].requiresHumanConfirmation === true, "E2E Post-Session: Propuestas con confirmación humana obligatoria");

  // Validar preview de la propuesta sin modificar BD
  let writes = 0;
  const origFetch = global.fetch;
  global.fetch = function(...args) {
    const method = (args[1]?.method || "GET").toUpperCase();
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) writes++;
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  };

  const prop = feedback.actionProposals[0];
  const mockMicro = {
    days: [
      { dayOfWeek: 4, microcycleDay: "MD-2", plannedDurationMin: 90, targetLoad: "Alta", objective: "Juego posición" }
    ]
  };

  const preview = getActionImpactPreview(prop, mockMicro, {});
  assert(preview.proposalId !== undefined, "E2E Post-Session: Preview de impacto generado correctamente");
  assert(writes === 0, "E2E Post-Session: 0 mutaciones en base de datos durante feedback y preview");

  if (origFetch) global.fetch = origFetch;

  console.log("\n================================================================================");
  console.log("RESULTADO FASE 5.4 TESTS E2E POST-SESIÓN: " + passed + " PASADOS, " + failed + " FALLADOS");
  console.log("================================================================================\n");

  if (failed > 0) process.exit(1);
}

runE2EPostSessionTests();
