/**
 * Servicio de Revisión Semanal y Mensual de Inteligencia Metodológica IA v1.0 (TypeScript)
 * Antigravity Methodology OS - Fase 5.5
 */

import { calculateLongitudinalMemory, LongitudinalMemoryResult } from "../methodologyLongitudinalMemoryService";
import { detectLongitudinalPatterns, PatternDetectionResult } from "../methodologyPatternDetectionService";

export interface AIWeeklyReviewResult {
  answer: string;
  facts: string[];
  interpretations: string[];
  evolution: {
    trajectory: any[];
    patterns: any[];
    associations: any[];
  };
  recommendations: string[];
  evidence: Array<{
    metric: string;
    value: string | number;
    reference: string;
  }>;
  dataSufficiency: {
    sufficient: boolean;
    sampleSize: number;
    notice?: string;
  };
}

export function generateAIWeeklyReview(params: {
  team: { id: string; name: string; category: string };
  season?: { id: string; name: string };
  sessions?: any[];
  curriculumPrinciples?: any[];
}): AIWeeklyReviewResult {
  const { team, season, sessions = [], curriculumPrinciples = [] } = params;

  const memory: LongitudinalMemoryResult = calculateLongitudinalMemory({ team, season, sessions, curriculumPrinciples });
  const patternsResult: PatternDetectionResult = detectLongitudinalPatterns(memory);

  const sampleSize = memory.sampleSize;
  const isInsufficient = sampleSize < 3;

  const facts: string[] = [
    `Equipo auditado: ${team.name} (${team.category}).`,
    `Total sesiones evaluadas: ${sampleSize} de ${memory.metrics.totalSessions} planificadas (Tasa: ${memory.metrics.evaluationRate}%).`,
    `Consecución media: ${memory.metrics.avgAchievement}/4.0, RPE medio: ${memory.metrics.avgRpe}/10, Cobertura: ${memory.metrics.modelCoveragePercentage}%.`
  ];

  const interpretations: string[] = [];
  const recommendations: string[] = [];

  if (isInsufficient) {
    interpretations.push("Muestra estadística reducida (N < 3). No se formulan inferencias de evolución longitudinal ni causalidades.");
    recommendations.push("Mantener la constancia en el registro y evaluación de sesiones para habilitar el análisis de tendencias.");
  } else {
    patternsResult.patterns.forEach(pat => {
      interpretations.push(`[Patrón Detectado] ${pat.title}: ${pat.description}`);
    });

    patternsResult.associations.forEach(assoc => {
      interpretations.push(`[Asociación Estadística] ${assoc.title}: ${assoc.description}`);
    });

    if (memory.prioritiesEvolution.persistentDeficitPrinciples.length > 0) {
      interpretations.push(`Existen ${memory.prioritiesEvolution.persistentDeficitPrinciples.length} principio(s) sin trabajar en más de 21 días.`);
      recommendations.push(`Programar en el próximo microciclo los principios rezagados: ${memory.prioritiesEvolution.persistentDeficitPrinciples.slice(0, 3).join(', ')}.`);
    }

    if (memory.prioritiesEvolution.persistentPriorities.length > 0) {
      recommendations.push(`Revisar con el cuerpo técnico la metodología aplicada a las prioridades persistentes.`);
    } else {
      recommendations.push("Continuar con la progresión planificada manteniendo la supervisión de carga en MD-1.");
    }
  }

  const evidence = [
    { metric: 'Muestra auditada', value: `${sampleSize} sesiones`, reference: team.name },
    { metric: 'Consecución', value: `${memory.metrics.avgAchievement}/4.0`, reference: team.name },
    { metric: 'Patrones confirmados', value: patternsResult.patterns.length, reference: team.name }
  ];

  return {
    answer: isInsufficient
      ? `Revisión semanal completada para ${team.name}: Muestra reducida (N < 3), datos insuficientes para inferir tendencias.`
      : `Revisión semanal completada para ${team.name}: Consecución ${memory.metrics.avgAchievement}/4.0, ${patternsResult.patterns.length} patrones detectados.`,
    facts,
    interpretations,
    evolution: {
      trajectory: memory.trajectory,
      patterns: patternsResult.patterns,
      associations: patternsResult.associations
    },
    recommendations,
    evidence,
    dataSufficiency: {
      sufficient: !isInsufficient,
      sampleSize,
      notice: isInsufficient ? "N < 3: Muestra insuficiente para tendencias longitudinales." : undefined
    }
  };
}
