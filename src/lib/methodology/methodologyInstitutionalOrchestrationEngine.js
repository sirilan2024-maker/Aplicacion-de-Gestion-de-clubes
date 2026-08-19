/**
 * Motor Determinista de Orquestación Metodológica Transversal y Visión 360º v1.0
 * Antigravity Methodology OS - Fase 6.8
 *
 * ORQUESTAR = RECIBIR -> NORMALIZAR -> COORDINAR -> RELACIONAR -> AGREGAR -> PRIORIZAR -> DEVOLVER
 * (0 decisiones autónomas, 0 duplicación lógica)
 */

function buildInstitutional360View(params) {
  const {
    clubId,
    executiveKpis = {},
    qualityAssessment = {},
    adaptiveAnalysis = {},
    governanceDecisions = [],
    simulationResults = [],
    institutionalLearnings = []
  } = params;

  if (!clubId) {
    throw new Error("clubId obligatorio para generar la visión metodológica 360º.");
  }

  // 1. Estado de Salud Metodológica Multidimensional
  const healthProfile = {
    quality: qualityAssessment.qualityProfile || "MEDIA",
    confidence: qualityAssessment.confidenceLevel || "CONFIANZA_MEDIA",
    activeTeams: executiveKpis.activeTeamsCount || 0,
    cycleCompleteness: qualityAssessment.metrics ? qualityAssessment.metrics.completenessRate : (executiveKpis.globalEvaluationPercentage || 0),
    openProposalsCount: adaptiveAnalysis.proposals ? adaptiveAnalysis.proposals.length : 0,
    activeDecisionsCount: governanceDecisions.filter(d => d.status === "EN_SEGUIMIENTO").length,
    learningsCount: institutionalLearnings.length
  };

  // 2. Consolidación y Priorización de Alertas Transversales
  const consolidatedAlerts = [];

  // Alertas de Calidad (Fase 6.7)
  if (qualityAssessment.alerts) {
    qualityAssessment.alerts.forEach((alt) => {
      consolidatedAlerts.push({
        alert_id: alt.alert_id,
        origen: "CALIDAD_DATOS",
        tipo: alt.tipo,
        severidad: alt.severidad,
        descripcion: alt.descripcion,
        recomendacion: alt.recomendacion,
        status: "ABIERTA"
      });
    });
  }

  // Alertas de Simulación / Riesgos (Fase 6.6)
  simulationResults.forEach((sim) => {
    if (sim.risks) {
      sim.risks.forEach((r, idx) => {
        consolidatedAlerts.push({
          alert_id: `alt-sim-${sim.scenario_id}-${idx}`,
          origen: "SIMULACION_ESCENARIOS",
          tipo: r.type,
          severidad: r.severity === "ALTO" ? "ALTA" : "MEDIA",
          descripcion: r.description,
          recomendacion: "Revisar variables de carga antes de confirmar cambios metodológicos.",
          status: "ABIERTA"
        });
      });
    }
  });

  // 3. Detección de Conflictos Metodológicos Transversales
  const conflicts = [];
  if (qualityAssessment.qualityProfile === "ALTA" && adaptiveAnalysis.trends) {
    const decliningTrends = adaptiveAnalysis.trends.filter(t => t.type === "DESACELERACION");
    if (decliningTrends.length > 0) {
      conflicts.push({
        type: "CONFLICTO_CALIDAD_VS_RENDIMIENTO",
        description: `Datos con calidad alta pero se detectan ${decliningTrends.length} equipos con desaceleración formativa.`,
        recommendation: "Revisar idoneidad de los contenidos curriculares impartidos."
      });
    }
  }

  // 4. Grafo de Relaciones Metodológicas (Trazabilidad 360º)
  const traceabilityGraph = {
    proposalsWithoutDecision: (adaptiveAnalysis.proposals || []).filter(p => !governanceDecisions.some(d => d.proposal_id === p.proposal_id)).length,
    decisionsWithoutFollowUp: governanceDecisions.filter(d => d.decision === "APROBADA" && d.status !== "EN_SEGUIMIENTO").length,
    simulationsEvaluated: simulationResults.length
  };

  return {
    club_id: clubId,
    healthProfile,
    traceabilityGraph,
    consolidatedAlerts,
    conflicts,
    orquestated_at: "DETERMINISTIC_TIMESTAMP"
  };
}

module.exports = {
  buildInstitutional360View
};
