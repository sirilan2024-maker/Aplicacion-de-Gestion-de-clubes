/**
 * TESTS DE REGRESIÓN METODOLÓGICA GENERAL (FASE 5.8)
 * Antigravity Methodology OS
 */

console.log("================================================================================");
console.log("FASE 5.8 — TESTS DE REGRESIÓN METODOLÓGICA INTEGRAL");
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

const { calculateMethodologyPriorities } = require("./src/lib/methodology/methodologyPriorityEngine");
const { generateMethodologySessionProposal } = require("./src/lib/methodology/methodologySessionGenerator");
const { simulateScenario } = require("./src/lib/methodology/methodologyScenarioSimulationService");

function runRegressionTests() {
  console.log("--- 1. Determinismo en Motor de Prioridades ---");
  const ctx = {
    date: "2026-09-01",
    curriculumPrinciples: [{ id: "p1", name: "Salida de balón" }],
    recentSessions: []
  };
  const prio1 = calculateMethodologyPriorities(ctx);
  const prio2 = calculateMethodologyPriorities(ctx);
  assert(JSON.stringify(prio1) === JSON.stringify(prio2), "Regresión: Motor de prioridades es 100% determinista");

  console.log("\n--- 2. Determinismo en Generador de Sesiones ---");
  const sCtx = {
    team: { id: "t1", category: "cadete" },
    objective: "Presión alta",
    durationMinutes: 90,
    microcycleDay: "MD-3",
    intensityLoad: 3,
    exercises: [
      { id: "e1", nombre: "Activación", bloque_sesion: "activacion", dificultad: 2, duracion_recomendada: 15 },
      { id: "e2", nombre: "Principal 1", bloque_sesion: "principal", dificultad: 3, duracion_recomendada: 25 },
      { id: "e3", nombre: "Principal 2", bloque_sesion: "principal", dificultad: 3, duracion_recomendada: 25 },
      { id: "e4", nombre: "Global", bloque_sesion: "global", dificultad: 3, duracion_recomendada: 20 },
      { id: "e5", nombre: "Calma", bloque_sesion: "vuelta_calma", dificultad: 1, duracion_recomendada: 5 }
    ]
  };
  const sess1 = generateMethodologySessionProposal(sCtx);
  const sess2 = generateMethodologySessionProposal(sCtx);
  assert(JSON.stringify(sess1) === JSON.stringify(sess2), "Regresión: Generador de sesiones es 100% determinista");

  console.log("\n--- 3. Determinismo en Simulador de Escenarios ---");
  const sc1 = simulateScenario({ scenarioId: "sc-reg", basePlan: sess1 });
  const sc2 = simulateScenario({ scenarioId: "sc-reg", basePlan: sess1 });
  assert(JSON.stringify(sc1) === JSON.stringify(sc2), "Regresión: Simulador de escenarios es 100% determinista");

  console.log("\n================================================================================");
  console.log("RESULTADO FASE 5.8 TESTS REGRESIÓN: " + passed + " PASADOS, " + failed + " FALLADOS");
  console.log("================================================================================\n");

  if (failed > 0) process.exit(1);
}

runRegressionTests();
