/**
 * TESTS E2E DE FLUJO DE COPILOTO Y CONFIRMACIÓN HUMANA (FASE 5.2)
 * Antigravity Methodology OS
 */

console.log("================================================================================");
console.log("FASE 5.2 — TESTS E2E DE FLUJO COPILOTO Y CONFIRMACIÓN HUMANA");
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
  validateAIActionProposal, 
  applyAIActionToLocalState, 
  getActionImpactPreview 
} = require("./src/lib/methodology/ai/methodologyAIActionService");
const { generateMethodologySessionProposal, validateMethodologySessionProposal } = require("./src/lib/methodology/methodologySessionGenerator");

async function runE2ETests() {
  console.log("--- Flujo E2E: Diagnóstico -> Propuesta Copiloto -> Preview -> Confirmación Humana ---");

  const mockExercises = [
    { id: "e1", nombre: "Activación General", tipo: "calentamiento", bloque_sesion: "activacion", dificultad: 1, duracion_recomendada: 15, tags: ["calentamiento"] },
    { id: "e2", nombre: "Rondo 4v2 Presión", tipo: "rondo", bloque_sesion: "principal", dificultad: 2, duracion_recomendada: 20, tags: ["presion"] },
    { id: "e3", nombre: "Rondo 5v2 Alternativo", tipo: "rondo", bloque_sesion: "principal", dificultad: 2, duracion_recomendada: 25, tags: ["presion"] },
    { id: "e4", nombre: "Juego Global 8v8", tipo: "juego_global", bloque_sesion: "global", dificultad: 3, duracion_recomendada: 20, tags: ["global"] },
    { id: "e5", nombre: "Estiramientos y Feedback", tipo: "calentamiento", bloque_sesion: "vuelta_calma", dificultad: 1, duracion_recomendada: 10, tags: ["regenerativo"] }
  ];

  // 1. Estado inicial de la propuesta de sesión generada determinísticamente
  const initialSession = generateMethodologySessionProposal({
    teamId: "team-cadete-a",
    category: "cadete",
    durationMinutes: 90,
    microcycleDay: "MD-3",
    intensityLoad: 3,
    objective: "Presión tras pérdida",
    allExercises: mockExercises
  });

  assert(initialSession.totalDurationMin === 90, "E2E Paso 1: Sesión inicial generada (90 min)");

  // 2. La IA genera una Action Proposal consultiva
  const proposal = buildSessionActionProposal({
    id: "prop-session-block-2",
    type: "regenerate_session_block",
    title: "Regenerar Principal 2 para reducir fatiga",
    target: { blockId: "principal_2" },
    rationale: "Optimizar la rotación de ejercicios conservando el objetivo curricular.",
    proposedChanges: { modificationsSummary: ["Cambiar tarea en Principal 2"] }
  });

  assert(proposal.requiresHumanConfirmation === true, "E2E Paso 2: Propuesta IA exige confirmación humana");

  // 3. Validación determinista previa
  const validationBeforeApply = validateAIActionProposal(proposal, initialSession);
  assert(validationBeforeApply.valid === true, "E2E Paso 3: Validación determinista aprueba propuesta");

  // 4. Previsualización de Impacto (Antes / Después)
  const impact = getActionImpactPreview(proposal, initialSession, {
    teamId: "team-cadete-a",
    category: "cadete",
    durationMinutes: 90,
    microcycleDay: "MD-3",
    intensityLoad: 3,
    objective: "Presión tras pérdida",
    allExercises: mockExercises
  });

  assert(impact.before.durationMinutes === 90, "E2E Paso 4: Impacto antes verificado");
  assert(impact.after.durationMinutes === 90, "E2E Paso 4: Impacto después verificado");
  assert(impact.validation.valid === true, "E2E Paso 4: Validación determinista post-cambio confirmada");

  // 5. Aplicación a Estado Local (Memoria del Constructor)
  const mockExercisesPool = [
    ...mockExercises,
    { id: "e6", nombre: "Presión en Zonas 5v5", tipo: "juego_medio", bloque_sesion: "principal", dificultad: 3, duracion_recomendada: 20, tags: ["presion"] }
  ];

  const { updatedObject: finalLocalSession, applied } = applyAIActionToLocalState(proposal, initialSession, {
    teamId: "team-cadete-a",
    category: "cadete",
    durationMinutes: 90,
    microcycleDay: "MD-3",
    intensityLoad: 3,
    objective: "Presión tras pérdida",
    allExercises: mockExercisesPool
  });

  assert(applied === true, "E2E Paso 5: Aplicado a estado local de UI");
  assert(finalLocalSession.blocks.activacion.exercise.id === initialSession.blocks.activacion.exercise.id, "E2E Paso 5: Bloque 1 no afectado por regeneración de Bloque 3");

  // 6. Validación Final antes de Persistencia Humana
  const finalValidation = validateMethodologySessionProposal(finalLocalSession);
  assert(finalValidation.valid === true, "E2E Paso 6: Validación global del motor lista para Confirmar y Guardar");

  console.log("\n================================================================================");
  console.log("RESULTADO FASE 5.2 TESTS E2E: " + passed + " PASADOS, " + failed + " FALLADOS");
  console.log("================================================================================\n");

  if (failed > 0) process.exit(1);
}

runE2ETests();
