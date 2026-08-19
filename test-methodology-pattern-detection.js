/**
 * TESTS DE DETECCIÓN DETERMINISTA DE PATRONES (FASE 5.5)
 * Antigravity Methodology OS
 */

console.log("================================================================================");
console.log("FASE 5.5 — TESTS DE DETECCIÓN DE PATRONES METODOLÓGICOS");
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

const { calculateLongitudinalMemory } = require("./src/lib/methodology/methodologyLongitudinalMemoryService");
const { detectLongitudinalPatterns } = require("./src/lib/methodology/methodologyPatternDetectionService");

function runTests() {
  const mockTeam = { id: "t1", name: "Cadete A", category: "cadete" };
  const mockPrinciples = [
    { id: "p1", name: "Presión alta", game_phase: "Defensa" },
    { id: "p2", name: "Salida de balón", game_phase: "Ataque" }
  ];

  console.log("--- 1. Patrón: Mejora Sostenida (Delta >= 0.4) ---");
  const memMejora = calculateLongitudinalMemory({
    team: mockTeam,
    sessions: [
      { id: "s1", date_time: "2026-09-01", duration_minutes: 90, objective: "Presión alta", session_evaluations: [{ objective_achievement: 2.0, session_rpe: 6 }] },
      { id: "s2", date_time: "2026-09-03", duration_minutes: 90, objective: "Presión alta", session_evaluations: [{ objective_achievement: 2.2, session_rpe: 6 }] },
      { id: "s3", date_time: "2026-09-05", duration_minutes: 90, objective: "Salida de balón", session_evaluations: [{ objective_achievement: 3.2, session_rpe: 6 }] },
      { id: "s4", date_time: "2026-09-08", duration_minutes: 90, objective: "Salida de balón", session_evaluations: [{ objective_achievement: 3.6, session_rpe: 6 }] }
    ],
    curriculumPrinciples: mockPrinciples
  });

  const patMejora = detectLongitudinalPatterns(memMejora);
  assert(patMejora.isSufficient === true, "Patrones: muestra suficiente confirmada");
  assert(patMejora.patterns.some(p => p.type === 'positive_trend'), "Patrón: detecta 'positive_trend' (Mejora Sostenida)");

  console.log("\n--- 2. Patrón: Asociación Carga / Consecución ---");
  const memRpe = calculateLongitudinalMemory({
    team: mockTeam,
    sessions: [
      { id: "s1", date_time: "2026-09-01", duration_minutes: 90, objective: "Presión alta", session_evaluations: [{ objective_achievement: 3.5, session_rpe: 5 }] },
      { id: "s2", date_time: "2026-09-03", duration_minutes: 90, objective: "Presión alta", session_evaluations: [{ objective_achievement: 1.8, session_rpe: 9 }] },
      { id: "s3", date_time: "2026-09-05", duration_minutes: 90, objective: "Salida de balón", session_evaluations: [{ objective_achievement: 1.9, session_rpe: 8.5 }] }
    ],
    curriculumPrinciples: mockPrinciples
  });

  const patRpe = detectLongitudinalPatterns(memRpe);
  assert(patRpe.associations.some(a => a.id === 'assoc-rpe-fatiga'), "Asociación: detecta caída de consecución con RPE elevado sin afirmar causalidad arbitraria");

  console.log("\n================================================================================");
  console.log("RESULTADO FASE 5.5 TESTS PATRONES: " + passed + " PASADOS, " + failed + " FALLADOS");
  console.log("================================================================================\n");

  if (failed > 0) process.exit(1);
}

runTests();
