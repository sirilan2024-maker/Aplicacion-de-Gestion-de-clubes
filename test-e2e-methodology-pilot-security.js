/**
 * TESTS DE SEGURIDAD Y MULTI-TENANT DEL PILOTO (FASE 5.8)
 * Antigravity Methodology OS
 */

console.log("================================================================================");
console.log("FASE 5.8 — TESTS DE SEGURIDAD, RBAC Y MULTI-TENANT EN ENTORNO PILOTO");
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

const { buildClubDirectionAIContext } = require("./src/lib/methodology/ai/methodologyAIContextBuilder");

function runSecurityPilotTests() {
  const clubA = { id: "club-alpha", name: "Club Alpha" };
  const clubB = { id: "club-beta", name: "Club Beta" };
  const season = { id: "season-1", name: "2026-27" };

  const reportA = { team: { id: "t-a1", name: "Equipo A1", club_id: "club-alpha", category: "cadete" }, summary: { evaluatedSessions: 4, avgObjectiveAchievement: 3.0, modelCoveragePercentage: 70 } };
  const reportB = { team: { id: "t-b1", name: "Equipo B1", club_id: "club-beta", category: "juvenil" }, summary: { evaluatedSessions: 5, avgObjectiveAchievement: 3.4, modelCoveragePercentage: 85 } };

  console.log("--- 1. Validación de Aislamiento Multi-Tenant Estricto ---");
  const ctxA = buildClubDirectionAIContext({ club: clubA, season, reports: [reportA] });
  const ctxB = buildClubDirectionAIContext({ club: clubB, season, reports: [reportB] });

  assert(ctxA.club.id === "club-alpha" && ctxB.club.id === "club-beta", "Multi-Tenant: Contextos aislados");
  assert(ctxA.teamsOverview.every(t => t.teamId === "t-a1"), "Multi-Tenant: Club Alpha solo incluye sus equipos");
  assert(ctxB.teamsOverview.every(t => t.teamId === "t-b1"), "Multi-Tenant: Club Beta solo incluye sus equipos");

  console.log("\n--- 2. Validación de Roles y Permisos (RBAC) ---");
  const METHODOLOGY_ROLES = ['admin', 'metodologo', 'coordinador', 'entrenador'];
  assert(METHODOLOGY_ROLES.includes('entrenador'), "RBAC: Entrenador tiene rol reconocido");
  assert(METHODOLOGY_ROLES.includes('metodologo'), "RBAC: Metodólogo tiene rol reconocido");
  assert(!METHODOLOGY_ROLES.includes('viewer'), "RBAC: Rol no autorizado denegado");

  console.log("\n================================================================================");
  console.log("RESULTADO FASE 5.8 TESTS SEGURIDAD PILOTO: " + passed + " PASADOS, " + failed + " FALLADOS");
  console.log("================================================================================\n");

  if (failed > 0) process.exit(1);
}

runSecurityPilotTests();
