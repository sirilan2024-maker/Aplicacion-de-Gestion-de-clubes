/**
 * TESTS DE REVISIÓN SEMANAL IA (FASE 5.5)
 * Antigravity Methodology OS
 */

console.log("================================================================================");
console.log("FASE 5.5 — TESTS DE REVISIÓN SEMANAL Y MENSUAL IA");
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

const { generateAIWeeklyReview } = require("./src/lib/methodology/ai/methodologyAIWeeklyReviewService");

function runTests() {
  const mockTeam = { id: "t1", name: "Cadete A", category: "cadete" };
  const mockPrinciples = [
    { id: "p1", name: "Presión alta", game_phase: "Defensa" },
    { id: "p2", name: "Salida de balón", game_phase: "Ataque" }
  ];

  console.log("--- 1. Revisión Semanal estructurada con N >= 3 ---");
  const revN4 = generateAIWeeklyReview({
    team: mockTeam,
    sessions: [
      { id: "s1", date_time: "2026-09-01", duration_minutes: 90, objective: "Presión alta", session_evaluations: [{ objective_achievement: 2.0, session_rpe: 6 }] },
      { id: "s2", date_time: "2026-09-03", duration_minutes: 90, objective: "Presión alta", session_evaluations: [{ objective_achievement: 2.2, session_rpe: 6 }] },
      { id: "s3", date_time: "2026-09-05", duration_minutes: 90, objective: "Salida de balón", session_evaluations: [{ objective_achievement: 3.2, session_rpe: 6 }] },
      { id: "s4", date_time: "2026-09-08", duration_minutes: 90, objective: "Salida de balón", session_evaluations: [{ objective_achievement: 3.6, session_rpe: 6 }] }
    ],
    curriculumPrinciples: mockPrinciples
  });

  assert(Array.isArray(revN4.facts) && revN4.facts.length > 0, "Revisión Semanal: facts presentes");
  assert(Array.isArray(revN4.interpretations) && revN4.interpretations.length > 0, "Revisión Semanal: interpretations presentes");
  assert(Array.isArray(revN4.recommendations) && revN4.recommendations.length > 0, "Revisión Semanal: recommendations presentes");
  assert(revN4.evolution.patterns.length > 0, "Revisión Semanal: incorpora patrones deterministas");
  assert(revN4.dataSufficiency.sufficient === true, "Revisión Semanal: dataSufficiency.sufficient === true");

  console.log("\n--- 2. Regla N < 3 en Revisión Semanal ---");
  const revN1 = generateAIWeeklyReview({
    team: mockTeam,
    sessions: [
      { id: "s1", date_time: "2026-09-01", duration_minutes: 90, objective: "Presión alta", session_evaluations: [{ objective_achievement: 3.0, session_rpe: 6 }] }
    ],
    curriculumPrinciples: mockPrinciples
  });

  assert(revN1.dataSufficiency.sufficient === false, "N=1: dataSufficiency.sufficient === false");
  assert(revN1.dataSufficiency.notice.includes("N < 3"), "N=1: notice explícito de N < 3");

  console.log("\n================================================================================");
  console.log("RESULTADO FASE 5.5 TESTS REVISIÓN IA: " + passed + " PASADOS, " + failed + " FALLADOS");
  console.log("================================================================================\n");

  if (failed > 0) process.exit(1);
}

runTests();
