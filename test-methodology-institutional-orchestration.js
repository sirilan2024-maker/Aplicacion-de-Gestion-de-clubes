/**
 * TESTS DE ORQUESTACIÓN METODOLÓGICA TRANSVERSAL Y VISIÓN 360º (FASE 6.8)
 * Antigravity Methodology OS
 */

console.log("================================================================================");
console.log("FASE 6.8 — SUITE DE ORQUESTACIÓN METODOLÓGICA Y CENTRO DE CONTROL 360º");
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

const { buildInstitutional360View } = require("./src/lib/methodology/methodologyInstitutionalOrchestrationEngine");

function runOrchestrationTests() {
  console.log("--- 1. Orquestación y Perfil de Salud Metodológica 360º ---");
  const view = buildInstitutional360View({
    clubId: "club-123",
    executiveKpis: { activeTeamsCount: 4, globalEvaluationPercentage: 85.0 },
    qualityAssessment: {
      qualityProfile: "ALTA",
      confidenceLevel: "CONFIANZA_ALTA",
      metrics: { completenessRate: 85.0 },
      alerts: [{ alert_id: "a1", tipo: "DATOS_INCOMPLETOS", severidad: "MEDIA", descripcion: "Desc", recomendacion: "Rec" }]
    },
    adaptiveAnalysis: {
      proposals: [{ proposal_id: "p1" }, { proposal_id: "p2" }],
      trends: [{ type: "DESACELERACION" }]
    },
    governanceDecisions: [
      { proposal_id: "p1", decision: "APROBADA", status: "EN_SEGUIMIENTO" }
    ],
    simulationResults: [
      { scenario_id: "sc1", risks: [{ type: "RIESGO_SOBRECARGA", severity: "ALTO", description: "Riesgo alto" }] }
    ],
    institutionalLearnings: [{ learning_id: "l1" }]
  });

  assert(view.healthProfile.activeTeams === 4, "360º: 4 equipos auditados");
  assert(view.healthProfile.openProposalsCount === 2, "360º: 2 propuestas abiertas integradas");
  assert(view.consolidatedAlerts.length === 2, "360º: Alertas de calidad y simulación consolidadas");
  assert(view.conflicts.length > 0, "360º: Conflicto calidad vs rendimiento detectado");
  assert(view.traceabilityGraph.proposalsWithoutDecision === 1, "Trazabilidad: 1 propuesta pendiente identificada en grafo");

  console.log("\n--- 2. Determinismo Estricto en Orquestación ---");
  const viewRun2 = buildInstitutional360View({
    clubId: "club-123",
    executiveKpis: { activeTeamsCount: 4, globalEvaluationPercentage: 85.0 },
    qualityAssessment: {
      qualityProfile: "ALTA",
      confidenceLevel: "CONFIANZA_ALTA",
      metrics: { completenessRate: 85.0 },
      alerts: [{ alert_id: "a1", tipo: "DATOS_INCOMPLETOS", severidad: "MEDIA", descripcion: "Desc", recomendacion: "Rec" }]
    },
    adaptiveAnalysis: {
      proposals: [{ proposal_id: "p1" }, { proposal_id: "p2" }],
      trends: [{ type: "DESACELERACION" }]
    },
    governanceDecisions: [
      { proposal_id: "p1", decision: "APROBADA", status: "EN_SEGUIMIENTO" }
    ],
    simulationResults: [
      { scenario_id: "sc1", risks: [{ type: "RIESGO_SOBRECARGA", severity: "ALTO", description: "Riesgo alto" }] }
    ],
    institutionalLearnings: [{ learning_id: "l1" }]
  });

  assert(JSON.stringify(view) === JSON.stringify(viewRun2), "Determinismo: Resultado 100% reproducible");

  console.log("\n================================================================================");
  console.log("RESULTADO FASE 6.8 TESTS ORQUESTACIÓN 360º: " + passed + " PASADOS, " + failed + " FALLADOS");
  console.log("================================================================================\n");

  if (failed > 0) process.exit(1);
}

runOrchestrationTests();
