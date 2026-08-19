/**
 * TESTS DE MEMORIA METODOLÓGICA LONGITUDINAL (FASE 5.5)
 * Antigravity Methodology OS
 */

console.log("================================================================================");
console.log("FASE 5.5 — TESTS DE MEMORIA METODOLÓGICA LONGITUDINAL");
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

function runTests() {
  const mockTeam = { id: "t1", name: "Cadete A", category: "cadete" };
  const mockPrinciples = [
    { id: "p1", name: "Presión alta", game_phase: "Defensa" },
    { id: "p2", name: "Salida de balón", game_phase: "Ataque" },
    { id: "p3", name: "ABP Córner", game_phase: "Balón Parado" }
  ];

  console.log("--- 1. Memoria con datos insuficientes (N < 3) ---");
  const memN1 = calculateLongitudinalMemory({
    team: mockTeam,
    sessions: [
      { id: "s1", date_time: "2026-09-01", duration_minutes: 90, objective: "Presión alta", session_evaluations: [{ objective_achievement: 3.0, session_rpe: 6 }] }
    ],
    curriculumPrinciples: mockPrinciples
  });

  assert(memN1.sampleSize === 1, "N=1: sampleSize === 1");
  assert(memN1.dataSufficiency.sufficient === false, "N=1: dataSufficiency.sufficient === false");
  assert(memN1.dataSufficiency.notice.includes("N < 3"), "N=1: notice explícito de muestra reducida");

  console.log("\n--- 2. Memoria longitudinal con N >= 3 ---");
  const memN4 = calculateLongitudinalMemory({
    team: mockTeam,
    sessions: [
      { id: "s1", date_time: "2026-09-01", duration_minutes: 90, objective: "Presión alta", session_evaluations: [{ objective_achievement: 2.5, session_rpe: 7 }] },
      { id: "s2", date_time: "2026-09-03", duration_minutes: 90, objective: "Presión alta", session_evaluations: [{ objective_achievement: 3.0, session_rpe: 6 }] },
      { id: "s3", date_time: "2026-09-05", duration_minutes: 90, objective: "Salida de balón", session_evaluations: [{ objective_achievement: 3.5, session_rpe: 6 }] },
      { id: "s4", date_time: "2026-09-08", duration_minutes: 90, objective: "Salida de balón", session_evaluations: [{ objective_achievement: 3.8, session_rpe: 6 }] }
    ],
    curriculumPrinciples: mockPrinciples
  });

  assert(memN4.sampleSize === 4, "N=4: sampleSize === 4");
  assert(memN4.dataSufficiency.sufficient === true, "N=4: dataSufficiency.sufficient === true");
  assert(memN4.metrics.avgAchievement > 3.0, "N=4: consecución media calculada (> 3.0)");
  assert(memN4.trajectory.length === 4, "N=4: trayectoria completa de 4 sesiones");

  console.log("\n--- 3. Detección de Déficit Persistente ---");
  assert(memN4.prioritiesEvolution.persistentDeficitPrinciples.includes("ABP Córner"), "Déficit persistente: detecta principio nunca trabajado (ABP Córner)");

  console.log("\n================================================================================");
  console.log("RESULTADO FASE 5.5 TESTS MEMORIA LONGITUDINAL: " + passed + " PASADOS, " + failed + " FALLADOS");
  console.log("================================================================================\n");

  if (failed > 0) process.exit(1);
}

runTests();
