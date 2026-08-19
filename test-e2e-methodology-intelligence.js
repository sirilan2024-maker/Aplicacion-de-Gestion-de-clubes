/**
 * TESTS E2E DE CENTRO DE INTELIGENCIA METODOLÓGICA (FASE 5.5)
 * Antigravity Methodology OS
 */

console.log("================================================================================");
console.log("FASE 5.5 — TESTS E2E DE INTELIGENCIA METODOLÓGICA LONGITUDINAL");
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
const { generateAIWeeklyReview } = require("./src/lib/methodology/ai/methodologyAIWeeklyReviewService");

async function runE2EIntelligenceTests() {
  console.log("--- Flujo E2E: Sesiones Históricas -> Memoria Longitudinal -> Detección Patrones -> Revisión IA -> Cero Escrituras ---");

  const mockTeam = { id: "team-infantil-a", name: "Infantil A", category: "infantil" };
  const mockPrinciples = [
    { id: "p1", name: "Salida de balón", game_phase: "Ataque" },
    { id: "p2", name: "Presión alta", game_phase: "Defensa" }
  ];

  const sessions = [
    { id: "s1", date_time: "2026-09-01", duration_minutes: 90, objective: "Salida de balón", session_evaluations: [{ objective_achievement: 2.1, session_rpe: 6 }] },
    { id: "s2", date_time: "2026-09-03", duration_minutes: 90, objective: "Salida de balón", session_evaluations: [{ objective_achievement: 2.3, session_rpe: 6 }] },
    { id: "s3", date_time: "2026-09-05", duration_minutes: 90, objective: "Salida de balón", session_evaluations: [{ objective_achievement: 3.1, session_rpe: 6 }] },
    { id: "s4", date_time: "2026-09-08", duration_minutes: 90, objective: "Presión alta", session_evaluations: [{ objective_achievement: 3.4, session_rpe: 6 }] },
    { id: "s5", date_time: "2026-09-10", duration_minutes: 90, objective: "Presión alta", session_evaluations: [{ objective_achievement: 3.7, session_rpe: 6 }] }
  ];

  // 1. Memoria Longitudinal
  const mem = calculateLongitudinalMemory({ team: mockTeam, sessions, curriculumPrinciples: mockPrinciples });
  assert(mem.sampleSize === 5, "E2E Inteligencia Paso 1: Memoria calcula 5 sesiones");
  assert(mem.metrics.modelCoveragePercentage === 100, "E2E Inteligencia Paso 1: Cobertura del 100% calculada");

  // 2. Detección de Patrones
  const pat = detectLongitudinalPatterns(mem);
  assert(pat.isSufficient === true, "E2E Inteligencia Paso 2: Detección de patrones ejecutada");
  assert(pat.patterns.length > 0, "E2E Inteligencia Paso 2: Patrón positivo confirmado");

  // 3. Revisión IA
  const review = generateAIWeeklyReview({ team: mockTeam, sessions, curriculumPrinciples: mockPrinciples });
  assert(review.dataSufficiency.sufficient === true, "E2E Inteligencia Paso 3: Revisión IA completada con suficiencia de datos");
  assert(review.evolution.patterns.length > 0, "E2E Inteligencia Paso 3: Evolución contiene patrones auditables");

  // 4. Invariante 0 escrituras
  let writes = 0;
  const origFetch = global.fetch;
  global.fetch = function(...args) {
    const method = (args[1]?.method || "GET").toUpperCase();
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) writes++;
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  };

  calculateLongitudinalMemory({ team: mockTeam, sessions, curriculumPrinciples: mockPrinciples });
  detectLongitudinalPatterns(mem);
  generateAIWeeklyReview({ team: mockTeam, sessions, curriculumPrinciples: mockPrinciples });

  assert(writes === 0, "E2E Inteligencia Paso 4: 0 mutaciones en base de datos durante todo el análisis de inteligencia");

  if (origFetch) global.fetch = origFetch;

  console.log("\n================================================================================");
  console.log("RESULTADO FASE 5.5 TESTS E2E INTELIGENCIA: " + passed + " PASADOS, " + failed + " FALLADOS");
  console.log("================================================================================\n");

  if (failed > 0) process.exit(1);
}

runE2EIntelligenceTests();
