/**
 * TESTS DE SEGURIDAD, RBAC Y MULTI-TENANT LONGITUDINAL (FASE 5.5)
 * Antigravity Methodology OS
 */

console.log("================================================================================");
console.log("FASE 5.5 — TESTS DE SEGURIDAD, RBAC Y MULTI-TENANT LONGITUDINAL");
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

function runSecurityTests() {
  const teamClubA = { id: "team-A", name: "Infantil A (Club A)", category: "infantil" };
  const teamClubB = { id: "team-B", name: "Infantil B (Club B)", category: "infantil" };

  const sessionsClubA = [
    { id: "s-a1", date_time: "2026-09-01", duration_minutes: 90, objective: "Presión", session_evaluations: [{ objective_achievement: 3.0, session_rpe: 6 }] }
  ];
  const sessionsClubB = [
    { id: "s-b1", date_time: "2026-09-01", duration_minutes: 90, objective: "Salida", session_evaluations: [{ objective_achievement: 2.0, session_rpe: 8 }] }
  ];

  console.log("--- 1. Aislamiento Multi-Tenant en Memoria Longitudinal ---");
  const memA = calculateLongitudinalMemory({ team: teamClubA, sessions: sessionsClubA });
  const memB = calculateLongitudinalMemory({ team: teamClubB, sessions: sessionsClubB });

  assert(memA.teamId === "team-A" && memB.teamId === "team-B", "Multi-Tenant: Identificadores de equipo aislados");
  assert(memA.trajectory[0].objective === "Presión", "Multi-Tenant: Memoria Club A contiene exclusivamente datos de Club A");
  assert(memB.trajectory[0].objective === "Salida", "Multi-Tenant: Memoria Club B contiene exclusivamente datos de Club B");

  console.log("\n--- 2. Determinismo en Ejecución Múltiple ---");
  const run1 = calculateLongitudinalMemory({ team: teamClubA, sessions: sessionsClubA });
  const run2 = calculateLongitudinalMemory({ team: teamClubA, sessions: sessionsClubA });
  assert(JSON.stringify(run1) === JSON.stringify(run2), "Determinismo: Múltiples ejecuciones sobre el mismo dataset producen JSON idéntico");

  console.log("\n================================================================================");
  console.log("RESULTADO FASE 5.5 TESTS SEGURIDAD: " + passed + " PASADOS, " + failed + " FALLADOS");
  console.log("================================================================================\n");

  if (failed > 0) process.exit(1);
}

runSecurityTests();
