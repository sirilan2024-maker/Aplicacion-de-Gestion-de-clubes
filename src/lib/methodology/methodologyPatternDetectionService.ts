/**
 * Servicio Determinista de Detección de Patrones Metodológicos Longitudinales v1.0 (TypeScript)
 * Antigravity Methodology OS - Fase 5.5
 */

import { LongitudinalMemoryResult } from "./methodologyLongitudinalMemoryService";

export interface LongitudinalPattern {
  id: string;
  type: 'positive_trend' | 'negative_trend' | 'persistent_priority' | 'recurrent_duration_deviation';
  title: string;
  description: string;
  confidence: number;
  evidence: string[];
}

export interface StatisticalAssociation {
  id: string;
  type: 'statistical_association';
  title: string;
  description: string;
  evidence: string[];
}

export interface PatternDetectionResult {
  sampleSize: number;
  isSufficient: boolean;
  notice?: string;
  patterns: LongitudinalPattern[];
  associations: StatisticalAssociation[];
}

export function detectLongitudinalPatterns(memoryResult: LongitudinalMemoryResult): PatternDetectionResult {
  const { sampleSize, metrics, trajectory = [], prioritiesEvolution, teamName } = memoryResult;

  if (sampleSize < 3) {
    return {
      sampleSize,
      isSufficient: false,
      notice: "Datos insuficientes (N < 3) para formular patrones o tendencias longitudinales.",
      patterns: [],
      associations: []
    };
  }

  const patterns: LongitudinalPattern[] = [];
  const associations: StatisticalAssociation[] = [];

  // 1. Patrón: Tendencia de Consecución (Mejora sostenida o Deterioro)
  if (trajectory.length >= 3) {
    const recentHalf = trajectory.slice(-Math.ceil(trajectory.length / 2));
    const earlyHalf = trajectory.slice(0, Math.floor(trajectory.length / 2));

    const avgRecent = recentHalf.reduce((sum, s) => sum + s.achievement, 0) / recentHalf.length;
    const avgEarly = earlyHalf.reduce((sum, s) => sum + s.achievement, 0) / earlyHalf.length;

    const delta = avgRecent - avgEarly;

    if (delta >= 0.4) {
      patterns.push({
        id: "pat-mejora-sostenida",
        type: "positive_trend",
        title: "Mejora Sostenida en Asimilación",
        description: `La consecución táctica media aumentó de ${avgEarly.toFixed(1)}/4 a ${avgRecent.toFixed(1)}/4 en la segunda mitad del período auditado.`,
        confidence: 0.9,
        evidence: [`Muestra: ${trajectory.length} sesiones`, `Delta positivo: +${delta.toFixed(1)}`]
      });
    } else if (delta <= -0.4) {
      patterns.push({
        id: "pat-deterioro",
        type: "negative_trend",
        title: "Deterioro en Consecución de Objetivos",
        description: `Descenso progresivo en la asimilación conceptual de ${avgEarly.toFixed(1)}/4 a ${avgRecent.toFixed(1)}/4.`,
        confidence: 0.85,
        evidence: [`Muestra: ${trajectory.length} sesiones`, `Delta negativo: ${delta.toFixed(1)}`]
      });
    }
  }

  // 2. Patrón: Prioridad Persistente
  if (prioritiesEvolution?.persistentPriorities && prioritiesEvolution.persistentPriorities.length > 0) {
    prioritiesEvolution.persistentPriorities.forEach(p => {
      patterns.push({
        id: `pat-persistent-${p.id}`,
        type: "persistent_priority",
        title: `Prioridad Persistente: ${p.title}`,
        description: `El déficit asociado a '${p.title}' se mantiene activo tras múltiples sesiones evaluadas.`,
        confidence: 0.95,
        evidence: [p.evidence || 'Persistencia a lo largo del período']
      });
    });
  }

  // 3. Patrón: Asociación entre Carga (RPE) y Consecución
  const highRpeSessions = trajectory.filter(s => s.rpe >= 8.0);
  if (highRpeSessions.length >= 2) {
    const avgAchHighRpe = highRpeSessions.reduce((sum, s) => sum + s.achievement, 0) / highRpeSessions.length;
    if (avgAchHighRpe < metrics.avgAchievement) {
      associations.push({
        id: "assoc-rpe-fatiga",
        type: "statistical_association",
        title: "Asociación: Fatiga / Consecución",
        description: `En sesiones con RPE ≥ 8.0, la consecución media cae a ${avgAchHighRpe.toFixed(1)}/4 (vs ${metrics.avgAchievement}/4 global).`,
        evidence: [`${highRpeSessions.length} sesiones con RPE elevado registraron menor asimilación`]
      });
    }
  }

  // 4. Patrón: Desviación Temporal Recurrente
  const severeDevSessions = trajectory.filter(s => Math.abs(s.durationDevMin) > 15);
  if (severeDevSessions.length >= 2) {
    patterns.push({
      id: "pat-desviacion-tiempo",
      type: "recurrent_duration_deviation",
      title: "Desviación Temporal Recurrente",
      description: `El ${Math.round((severeDevSessions.length / trajectory.length) * 100)}% de las sesiones evaluadas presentan desviaciones superiores a 15 minutos respecto a lo planificado.`,
      confidence: 0.88,
      evidence: [`${severeDevSessions.length} de ${trajectory.length} sesiones con |Δ| > 15 min`]
    });
  }

  return {
    sampleSize,
    isSufficient: true,
    patterns,
    associations
  };
}
