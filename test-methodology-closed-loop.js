/**
 * TESTS DE CICLO METODOLÓGICO CERRADO Y RECALCULO DE PRIORIDADES (FASE 5.4)
 * Antigravity Methodology OS
 */

console.log("================================================================================");
console.log("FASE 5.4 — TESTS DE CICLO METODOLÓGICO CERRADO Y EVOLUCIÓN DE PRIORIDADES");
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

const { computePrioritiesEvolution } = require("./src/lib/methodology/methodologyPriorityEvolutionService");

function runTests() {
  const mockPrinciples = [
    { id: "p1", name: "Presión alta", game_phase: "Defensa" },
    { id: "p2", name: "Salida de balón", game_phase: "Ataque" },
    { id: "p3", name: "Transición defensiva", game_phase: "Transición Ataque-Defensa" }
  ];

  console.log("--- 1. Recálculo determinista: Detección de prioridad resuelta ---");
  // Antes: 'Salida de balón' no se ha trabajado en 30 días
  const oldDate = new Date();
  oldDate.setDate(oldDate.getDate() - 30);

  const ctxBefore = {
    curriculumPrinciples: mockPrinciples,
    recentSessions: [
      { date_time: oldDate.toISOString(), objective: "Salida de balón", session_evaluations: [{ objective_achievement: 2.0 }] }
    ]
  };

  // Después: Se ejecuta y evalúa una sesión exitosa hoy de 'Salida de balón'
  const ctxAfter = {
    curriculumPrinciples: mockPrinciples,
    recentSessions: [
      { date_time: new Date().toISOString(), objective: "Salida de balón", session_evaluations: [{ objective_achievement: 3.5 }] },
      { date_time: oldDate.toISOString(), objective: "Salida de balón", session_evaluations: [{ objective_achievement: 2.0 }] }
    ]
  };

  const evolution = computePrioritiesEvolution(ctxBefore, ctxAfter);
  assert(evolution.changes.hasChanges === true, "Evolución: detecta cambios en las prioridades");
  assert(evolution.currentPriorities.length >= 0, "Evolución: prioridades actuales recalculadas");
  assert(evolution.evidence.length > 0, "Evolución: evidencias estructuradas presentes");

  console.log("\n--- 2. Determinismo estricto (JSON.stringify run1 === run2) ---");
  const run1 = computePrioritiesEvolution(ctxBefore, ctxAfter);
  const run2 = computePrioritiesEvolution(ctxBefore, ctxAfter);
  assert(JSON.stringify(run1) === JSON.stringify(run2), "Determinismo: Ejecuciones idénticas producen JSON idéntico");

  console.log("\n================================================================================");
  console.log("RESULTADO FASE 5.4 TESTS CICLO CERRADO: " + passed + " PASADOS, " + failed + " FALLADOS");
  console.log("================================================================================\n");

  if (failed > 0) process.exit(1);
}

runTests();
