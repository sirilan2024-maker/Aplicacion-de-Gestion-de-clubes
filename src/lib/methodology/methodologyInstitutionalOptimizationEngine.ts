/**
 * Motor Determinista de Optimización Institucional y Benchmarking Interno v1.0 (TS)
 * Antigravity Methodology OS - Fase 6.10
 */

export type ComparabilityStatus = "COMPARABLE_ROBUSTA" | "LIMITADA" | "EVIDENCIA_INSUFICIENTE" | "NO_COMPARABLE";
export type OpportunityPriority = "INFORMATIVA" | "BAJA" | "MEDIA" | "ALTA" | "ESTRATEGICA";

export interface BenchmarkTeamResult {
  teamId: string;
  teamName: string;
  comparability: ComparabilityStatus;
  sampleSize: number;
  avgAchievement: number;
  deltaVsBaseline: number;
  coveragePercentage: number;
}

export interface InstitutionalOpportunity {
  opportunity_id: string;
  tipo: string;
  prioridad: OpportunityPriority;
  alcance: string;
  descripcion: string;
  recomendacion: string;
}

export interface OptimizationTradeOff {
  teamId: string;
  type: string;
  description: string;
  recommendation: string;
}

export interface InstitutionalOptimizationAnalysisResult {
  club_id: string;
  benchmarking: BenchmarkTeamResult[];
  opportunities: InstitutionalOpportunity[];
  tradeOffs: OptimizationTradeOff[];
  patterns: any[];
  optimized_at: string;
}

export function runInstitutionalOptimizationAnalysis(params: {
  clubId: string;
  teamMetrics?: any[];
  historicalBaseline?: {
    avgAchievement?: number;
    coveragePercentage?: number;
  };
  minSessionsThreshold?: number;
}): InstitutionalOptimizationAnalysisResult {
  const {
    clubId,
    teamMetrics = [],
    historicalBaseline = {},
    minSessionsThreshold = 3
  } = params;

  if (!clubId) {
    throw new Error("clubId obligatorio para ejecutar la optimización institucional.");
  }

  const benchmarking: BenchmarkTeamResult[] = [];
  const opportunities: InstitutionalOpportunity[] = [];
  const tradeOffs: OptimizationTradeOff[] = [];
  const patterns: any[] = [];

  teamMetrics.forEach((tm: any) => {
    const isComparable = tm.clubId === clubId && tm.sampleSize >= minSessionsThreshold;
    const comparabilityStatus: ComparabilityStatus = !isComparable
      ? (tm.sampleSize < minSessionsThreshold ? "EVIDENCIA_INSUFICIENTE" : "NO_COMPARABLE")
      : "COMPARABLE_ROBUSTA";

    const deltaVsBaseline = isComparable && historicalBaseline.avgAchievement
      ? Number((tm.avgAchievement - historicalBaseline.avgAchievement).toFixed(2))
      : 0;

    benchmarking.push({
      teamId: tm.teamId,
      teamName: tm.teamName,
      comparability: comparabilityStatus,
      sampleSize: tm.sampleSize,
      avgAchievement: tm.avgAchievement,
      deltaVsBaseline,
      coveragePercentage: tm.coveragePercentage
    });

    if (isComparable) {
      if (tm.avgAchievement >= 3.4 && tm.coveragePercentage >= 70) {
        patterns.push({
          type: "BUENA_PRACTICA_INTERNA",
          teamId: tm.teamId,
          description: `El equipo ${tm.teamName} mantiene alta consecución (${tm.avgAchievement}) con alta cobertura (${tm.coveragePercentage}%).`
        });
        opportunities.push({
          opportunity_id: `opp-rep-${tm.teamId}`,
          tipo: "OPORTUNIDAD_DE_REPLICACION",
          prioridad: "ESTRATEGICA",
          alcance: "CATEGORIA",
          descripcion: `Replicar distribución de tareas y microciclos de ${tm.teamName} en equipos de la misma etapa.`,
          recomendacion: "Analizar microciclos estructurados de este equipo en Dirección Deportiva."
        });
      } else if (tm.avgAchievement < 2.5) {
        opportunities.push({
          opportunity_id: `opp-rev-${tm.teamId}`,
          tipo: "OPORTUNIDAD_DE_REVISION",
          prioridad: "ALTA",
          alcance: "EQUIPO",
          descripcion: `Baja consecución acumulada (${tm.avgAchievement}) en ${tm.teamName}.`,
          recomendacion: "Modular dificultad y evaluar oposición en tareas principales."
        });
      }

      if (tm.coveragePercentage >= 85 && tm.avgRpe >= 8.0) {
        tradeOffs.push({
          teamId: tm.teamId,
          type: "RIESGO_SOBREOPTIMIZACION",
          description: `Alta cobertura (${tm.coveragePercentage}%) lograda a costa de un RPE medio crítico (${tm.avgRpe}/10).`,
          recommendation: "Rebalancear minutaje y bloques de descanso."
        });
      }
    }
  });

  return {
    club_id: clubId,
    benchmarking,
    opportunities,
    tradeOffs,
    patterns,
    optimized_at: "DETERMINISTIC_TIMESTAMP"
  };
}
