/**
 * Motor Determinista de Orquestación Metodológica Transversal y Visión 360º v1.0 (TS)
 * Antigravity Methodology OS - Fase 6.8
 */

export interface HealthProfile360 {
  quality: string;
  confidence: string;
  activeTeams: number;
  cycleCompleteness: number;
  openProposalsCount: number;
  activeDecisionsCount: number;
  learningsCount: number;
}

export interface ConsolidatedAlert {
  alert_id: string;
  origen: "CALIDAD_DATOS" | "SIMULACION_ESCENARIOS" | "GOBIERNO" | "EJECUCION";
  tipo: string;
  severidad: string;
  descripcion: string;
  recomendacion: string;
  status: "ABIERTA" | "EN_REVISION" | "RESUELTA" | "DESCARTADA";
}

export interface MethodologicalConflict {
  type: string;
  description: string;
  recommendation: string;
}

export interface Institutional360ViewResult {
  club_id: string;
  healthProfile: HealthProfile360;
  traceabilityGraph: {
    proposalsWithoutDecision: number;
    decisionsWithoutFollowUp: number;
    simulationsEvaluated: number;
  };
  consolidatedAlerts: ConsolidatedAlert[];
  conflicts: MethodologicalConflict[];
  orquestated_at: string;
}

export function buildInstitutional360View(params: {
  clubId: string;
  executiveKpis?: any;
  qualityAssessment?: any;
  adaptiveAnalysis?: any;
  governanceDecisions?: any[];
  simulationResults?: any[];
  institutionalLearnings?: any[];
}): Institutional360ViewResult {
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

  const healthProfile: HealthProfile360 = {
    quality: qualityAssessment.qualityProfile || "MEDIA",
    confidence: qualityAssessment.confidenceLevel || "CONFIANZA_MEDIA",
    activeTeams: executiveKpis.activeTeamsCount || 0,
    cycleCompleteness: qualityAssessment.metrics ? qualityAssessment.metrics.completenessRate : (executiveKpis.globalEvaluationPercentage || 0),
    openProposalsCount: adaptiveAnalysis.proposals ? adaptiveAnalysis.proposals.length : 0,
    activeDecisionsCount: governanceDecisions.filter((d: any) => d.status === "EN_SEGUIMIENTO").length,
    learningsCount: institutionalLearnings.length
  };

  const consolidatedAlerts: ConsolidatedAlert[] = [];

  if (qualityAssessment.alerts) {
    qualityAssessment.alerts.forEach((alt: any) => {
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

  simulationResults.forEach((sim: any) => {
    if (sim.risks) {
      sim.risks.forEach((r: any, idx: number) => {
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

  const conflicts: MethodologicalConflict[] = [];
  if (qualityAssessment.qualityProfile === "ALTA" && adaptiveAnalysis.trends) {
    const decliningTrends = adaptiveAnalysis.trends.filter((t: any) => t.type === "DESACELERACION");
    if (decliningTrends.length > 0) {
      conflicts.push({
        type: "CONFLICTO_CALIDAD_VS_RENDIMIENTO",
        description: `Datos con calidad alta pero se detectan ${decliningTrends.length} equipos con desaceleración formativa.`,
        recommendation: "Revisar idoneidad de los contenidos curriculares impartidos."
      });
    }
  }

  const traceabilityGraph = {
    proposalsWithoutDecision: (adaptiveAnalysis.proposals || []).filter((p: any) => !governanceDecisions.some((d: any) => d.proposal_id === p.proposal_id)).length,
    decisionsWithoutFollowUp: governanceDecisions.filter((d: any) => d.decision === "APROBADA" && d.status !== "EN_SEGUIMIENTO").length,
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
