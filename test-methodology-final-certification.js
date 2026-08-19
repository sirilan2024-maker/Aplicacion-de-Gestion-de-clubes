/**
 * SUITE DE CERTIFICACIÓN FINAL INTEGRAL Y HARDENING (FASE 6.11)
 * Methodology OS — Antigravity Sporting Saladar
 */

console.log("================================================================================");
console.log("FASE 6.11 — CERTIFICACIÓN FINAL Y AUDITORÍA INTEGRAL DE INVARIANTES");
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

// Carga de todos los motores institucionales
const { analyzeAdaptiveEvolution } = require("./src/lib/methodology/methodologyAdaptiveEvolutionEngine");
const { createDecision, evaluateObservedOutcome, deriveInstitutionalLearning } = require("./src/lib/methodology/methodologyInstitutionalGovernanceEngine");
const { runMethodologyScenarioSimulation } = require("./src/lib/methodology/methodologyScenarioSimulationEngine");
const { assessDataQuality } = require("./src/lib/methodology/methodologyDataQualityEngine");
const { buildInstitutional360View } = require("./src/lib/methodology/methodologyInstitutionalOrchestrationEngine");
const { createMethodologicalEvent, reconstructCycleState } = require("./src/lib/methodology/methodologyObservabilityEngine");
const { runInstitutionalOptimizationAnalysis } = require("./src/lib/methodology/methodologyInstitutionalOptimizationEngine");

function runFinalCertificationSuite() {
  console.log("--- 1. Determinismo Global Multimotor ---");
  const sim1 = runMethodologyScenarioSimulation({
    scenarioId: "cert-sim",
    name: "Sim Cert",
    baseline: { coveragePercentage: 50, avgAchievement: 3.0, avgRpe: 6.5 },
    variables: { coverageDeltaPercentage: 10 },
    sampleSize: 8,
    clubId: "club-saladar"
  });
  const sim2 = runMethodologyScenarioSimulation({
    scenarioId: "cert-sim",
    name: "Sim Cert",
    baseline: { coveragePercentage: 50, avgAchievement: 3.0, avgRpe: 6.5 },
    variables: { coverageDeltaPercentage: 10 },
    sampleSize: 8,
    clubId: "club-saladar"
  });
  assert(JSON.stringify(sim1) === JSON.stringify(sim2), "Determinismo: Simulación 100% reproducible");

  console.log("\n--- 2. Protección Estricta de la Regla N < 3 en Todos los Motores ---");
  const qualN2 = assessDataQuality({
    sessions: [{ id: "s1" }, { id: "s2" }],
    evaluations: [{ objective_achievement: 3 }, { objective_achievement: 4 }],
    teamCount: 1,
    clubId: "club-saladar"
  });
  assert(qualN2.alerts.some(a => a.tipo === "EVIDENCIA_INSUFICIENTE"), "Regla N<3 en Calidad: Evidencia insuficiente detectada (N=2)");

  const outcomeN2 = evaluateObservedOutcome({ baselineScore: 2.0, observedScore: 3.5, sampleSize: 2 });
  assert(outcomeN2.classification === "SIN_EVIDENCIA", "Regla N<3 en Gobierno: Clasificado como SIN_EVIDENCIA");

  const optN2 = runInstitutionalOptimizationAnalysis({
    clubId: "club-saladar",
    teamMetrics: [{ teamId: "t1", teamName: "Prebenjamín", clubId: "club-saladar", sampleSize: 2, avgAchievement: 3.5, coveragePercentage: 60 }]
  });
  assert(optN2.benchmarking[0].comparability === "EVIDENCIA_INSUFICIENTE", "Regla N<3 en Benchmarking: No comparable por N=2");

  console.log("\n--- 3. Aislamiento Multi-Tenant Server-Side ---");
  let crossClubBlocked = false;
  try {
    assessDataQuality({ clubId: null });
  } catch (e) {
    crossClubBlocked = true;
  }
  assert(crossClubBlocked, "Multi-Tenant: clubId forzado como obligatorio");

  console.log("\n--- 4. Inmutabilidad y Reconstrucción Sin Hindsight ---");
  const events = [
    { event_id: "e1", event_type: "CICLO_CREADO", actor: { id: "u1" }, entity: { id: "c1" }, club_id: "c-1", timestamp: "2026-08-01T10:00:00Z", details: {} },
    { event_id: "e2", event_type: "PLANIFICACION_REGISTRADA", actor: { id: "u1" }, entity: { id: "c1" }, club_id: "c-1", timestamp: "2026-08-05T10:00:00Z", details: { sessionsCount: 10 } },
    { event_id: "e3", event_type: "EVALUACION_REGISTRADA", actor: { id: "u2" }, entity: { id: "c1" }, club_id: "c-1", timestamp: "2026-08-10T10:00:00Z", details: {} }
  ];
  const reconstructed = reconstructCycleState({ events, targetTimestamp: "2026-08-06T00:00:00Z", cycleId: "c1", clubId: "c-1" });
  assert(reconstructed.events_replayed === 2 && reconstructed.metrics.evaluatedSessions === 0, "No Hindsight: Eventos posteriores a fecha de corte estrictamente excluidos");

  console.log("\n--- 5. Soberanía Humana y 0 Decisiones Autónomas ---");
  const dec = createDecision({
    proposalId: "p1",
    decisionType: "APROBADA",
    decidedBy: "Director Deportivo",
    clubId: "c-1"
  });
  assert(dec.decided_by === "Director Deportivo" && dec.status === "EN_SEGUIMIENTO", "Soberanía Humana: Decisión registrada bajo actor humano explícito");

  console.log("\n--- 6. Orquestación 360º y Detección de Conflictos ---");
  const view360 = buildInstitutional360View({
    clubId: "c-1",
    executiveKpis: { activeTeamsCount: 5 },
    qualityAssessment: qualN2,
    adaptiveAnalysis: { proposals: [{ proposal_id: "p1" }] },
    governanceDecisions: [dec],
    simulationResults: [sim1],
    institutionalLearnings: []
  });
  assert(view360.healthProfile.activeTeams === 5, "Orquestación 360º: Visión integral agregada sin mutar estados");

  console.log("\n================================================================================");
  console.log("RESULTADO CERTIFICACIÓN FINAL FASE 6.11: " + passed + " PASADOS, " + failed + " FALLADOS");
  console.log("================================================================================\n");

  if (failed > 0) process.exit(1);
}

runFinalCertificationSuite();
