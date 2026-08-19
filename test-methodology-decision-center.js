/**
 * TESTS DEL CENTRO DE DECISIÓN DEPORTIVA Y COORDINACIÓN (FASE 6.2)
 * Antigravity Methodology OS
 */

console.log("================================================================================");
console.log("FASE 6.2 — SUITE DE CENTRO DE DECISIÓN DEPORTIVA Y SIMULACIÓN");
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

const { generateClubTransversalAlerts } = require("./src/lib/methodology/sportsDirectionService");
const { simulateScenario } = require("./src/lib/methodology/methodologyScenarioSimulationService");
const { compareScenarios } = require("./src/lib/methodology/methodologyScenarioComparisonService");

function runDecisionCenterTests() {
  console.log("--- 1. Generación y Trazabilidad de Alertas de Decisión ---");
  const mockReports = [
    {
      team: { id: "t1", name: "Cadete A", category: "cadete" },
      summary: { plannedSessions: 10, completedSessions: 10, evaluatedSessions: 4, evaluationPercentage: 40, avgObjectiveAchievement: 2.1, avgRpe: 8.5, avgAttendanceRate: 90, modelCoveragePercentage: 35, decliningBehavioursCount: 2 }
    }
  ];

  const alerts = generateClubTransversalAlerts(mockReports);
  assert(alerts.length > 0, "Decisión: Alertas transversales generadas");
  assert(alerts[0].evidence !== undefined, "Decisión: Alerta incluye evidencia empírica trazable");
  assert(alerts[0].ruleActivated !== undefined, "Decisión: Alerta referencia la regla metodológica activada");

  console.log("\n--- 2. Simulación en Memoria de Alternativas de Decisión ---");
  const basePlan = { objective: "Juego posición", durationMinutes: 90, intensityLoad: "Media" };

  const scA = simulateScenario({ scenarioId: "sc-a", basePlan, modifications: { durationMinutes: 80, intensityLoad: "Media" } });
  const scB = simulateScenario({ scenarioId: "sc-b", basePlan, modifications: { durationMinutes: 60, intensityLoad: "Baja" } });

  assert(scA.simulated.durationMin === 80, "Simulación A: Total minutos calculado (80 min)");
  assert(scB.simulated.durationMin === 60, "Simulación B: Reducción de duración calculada (60 min)");

  console.log("\n--- 3. Comparativa Matricial de Alternativas ---");
  const comparison = compareScenarios([scA, scB]);
  assert(comparison.scenariosCount === 2, "Comparativa: 2 escenarios contrastados");
  assert(comparison.matrix.length === 2, "Comparativa: Matriz de 2 filas generada");
  assert(comparison.keyDifferences.length > 0, "Comparativa: Diferencias clave identificadas");

  console.log("\n--- 4. Determinismo Estricto en Decisión y Simulación ---");
  const scA_run2 = simulateScenario({ scenarioId: "sc-a", basePlan, modifications: { durationMinutes: 80, intensityLoad: "Media" } });
  assert(JSON.stringify(scA) === JSON.stringify(scA_run2), "Determinismo: Simulación produce resultados idénticos");

  console.log("\n================================================================================");
  console.log("RESULTADO FASE 6.2 TESTS DECISIÓN: " + passed + " PASADOS, " + failed + " FALLADOS");
  console.log("================================================================================\n");

  if (failed > 0) process.exit(1);
}

runDecisionCenterTests();
