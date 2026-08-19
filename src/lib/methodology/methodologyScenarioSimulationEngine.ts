/**
 * Motor Determinista de Simulación Metodológica y Anticipación Institucional v1.0 (TS)
 * Antigravity Methodology OS - Fase 6.6
 */

export type SimulationHorizon = "CORTO" | "MEDIO" | "LARGO";
export type EvidenceLevel = "INSUFICIENTE" | "LIMITADA" | "MODERADA" | "ROBUSTA";
export type RiskLevel = "BAJO" | "MODERADO" | "ALTO" | "CRÍTICO";

export interface ScenarioRisk {
  type: string;
  severity: "BAJO" | "MODERADO" | "ALTO" | "CRÍTICO";
  description: string;
}

export interface ScenarioSimulationResult {
  scenario_id: string;
  name: string;
  horizon: SimulationHorizon;
  club_id: string;
  isHypotheticalOnly: boolean;
  evidenceLevel: EvidenceLevel;
  baseline: {
    coveragePercentage: number;
    avgAchievement: number;
    avgRpe: number;
    sampleSize: number;
  };
  simulated: {
    coveragePercentage: number;
    avgAchievement: number;
    avgRpe: number;
  };
  deltas: {
    coverage: number;
    achievement: number;
    rpe: number;
  };
  assumptions: any[];
  risks: ScenarioRisk[];
  riskProfile: RiskLevel;
  simulated_at: string;
  notice: string;
}

export function runMethodologyScenarioSimulation(params: {
  scenarioId: string;
  name: string;
  baseline?: {
    coveragePercentage?: number;
    avgAchievement?: number;
    avgRpe?: number;
  };
  variables?: {
    coverageDeltaPercentage?: number;
    tacticalLoadDeltaPercentage?: number;
    durationDeltaMin?: number;
  };
  assumptions?: any[];
  horizon?: SimulationHorizon;
  sampleSize?: number;
  clubId: string;
}): ScenarioSimulationResult {
  const {
    scenarioId,
    name,
    baseline = {},
    variables = {},
    assumptions = [],
    horizon = "MEDIO",
    sampleSize = 0,
    clubId
  } = params;

  if (!scenarioId || !name || !clubId) {
    throw new Error("Parámetros obligatorios incompletos para ejecutar la simulación metodológica.");
  }

  const isHypotheticalOnly = sampleSize < 3;
  let evidenceLevel: EvidenceLevel = "ROBUSTA";
  if (sampleSize < 3) evidenceLevel = "INSUFICIENTE";
  else if (sampleSize < 6) evidenceLevel = "LIMITADA";
  else if (sampleSize < 12) evidenceLevel = "MODERADA";

  const baseCoverage = baseline.coveragePercentage || 50;
  const baseAchievement = baseline.avgAchievement || 3.0;
  const baseRpe = baseline.avgRpe || 6.5;

  const coverageDelta = variables.coverageDeltaPercentage || 0;
  const tacticalLoadDelta = variables.tacticalLoadDeltaPercentage || 0;
  const durationDeltaMin = variables.durationDeltaMin || 0;

  const simulatedCoverage = Math.max(0, Math.min(100, Number((baseCoverage + coverageDelta).toFixed(1))));
  const simulatedAchievement = Math.max(1.0, Math.min(4.0, Number((baseAchievement + (coverageDelta > 0 ? 0.2 : -0.1)).toFixed(2))));
  const simulatedRpe = Math.max(1.0, Math.min(10.0, Number((baseRpe + (tacticalLoadDelta * 0.05) + (durationDeltaMin * 0.02)).toFixed(1))));

  const risks: ScenarioRisk[] = [];
  let riskProfile: RiskLevel = "BAJO";

  if (simulatedRpe >= 8.0) {
    risks.push({
      type: "RIESGO_SOBRECARGA",
      severity: "ALTO",
      description: `RPE simulado elevado (${simulatedRpe}/10). Posible fatiga neuromuscular.`
    });
    riskProfile = "ALTO";
  }

  if (simulatedCoverage < 40) {
    risks.push({
      type: "RIESGO_ESTANCAMIENTO",
      severity: "MODERADO",
      description: `Cobertura curricular reducida (${simulatedCoverage}%). Modelo de juego desatendido.`
    });
    if (riskProfile !== "ALTO") riskProfile = "MODERADO";
  }

  if (isHypotheticalOnly) {
    risks.push({
      type: "RIESGO_INSUFICIENCIA_EVIDENCIA",
      severity: "MODERADO",
      description: `Muestra N=${sampleSize} < 3. Simulación puramente hipotética sin validez predictiva.`
    });
  }

  return {
    scenario_id: scenarioId,
    name,
    horizon,
    club_id: clubId,
    isHypotheticalOnly,
    evidenceLevel,
    baseline: {
      coveragePercentage: baseCoverage,
      avgAchievement: baseAchievement,
      avgRpe: baseRpe,
      sampleSize
    },
    simulated: {
      coveragePercentage: simulatedCoverage,
      avgAchievement: simulatedAchievement,
      avgRpe: simulatedRpe
    },
    deltas: {
      coverage: Number((simulatedCoverage - baseCoverage).toFixed(1)),
      achievement: Number((simulatedAchievement - baseAchievement).toFixed(2)),
      rpe: Number((simulatedRpe - baseRpe).toFixed(1))
    },
    assumptions,
    risks,
    riskProfile,
    simulated_at: "DETERMINISTIC_TIMESTAMP",
    notice: "SIMULACIÓN PROSPECTIVA: Este resultado representa un escenario hipotético condicionado a supuestos. No constituye una predicción ni garantía de resultado futuro."
  };
}
