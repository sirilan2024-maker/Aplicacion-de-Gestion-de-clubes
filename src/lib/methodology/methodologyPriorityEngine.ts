/**
 * Motor de Decisión y Priorización Metodológica Determinista v1.0
 * Antigravity Methodology OS
 * Transforma el diagnóstico histórico en prioridades explicables para el entrenador
 */

export const METHODOLOGY_RULES = {
  STALE_PRINCIPLE_DAYS: 21,
  LOW_ACHIEVEMENT_THRESHOLD: 2.2,
  MIN_TREND_OBSERVATIONS: 3,
  HIGH_RPE_THRESHOLD: 8,
  REPEATED_RPE_THRESHOLD: 7.5,
  MIN_COVERAGE_PERCENTAGE: 60,
  RECURRENT_DURATION_DEV_PERCENT: 0.3,
  DURATION_DEV_MINUTES: 15,
};

export type PriorityType = 
  | 'principle_gap'      // Principio nunca trabajado en el periodo
  | 'stale_principle'    // Principio sin trabajar en >= 21 días
  | 'low_achievement'    // Principio o comportamiento con media <= 2.2
  | 'behaviour_gap'      // Comportamiento en declive o baja puntuación (N >= 3)
  | 'load_warning'       // Alerta o directriz de carga y fatiga
  | 'objective_gap';     // Brecha de objetivo formativo

export type PriorityLevel = 'high' | 'medium' | 'low';

export interface PriorityEvidence {
  daysSinceLastWork?: number;
  sessionsInPeriod?: number;
  sampleSize?: number;
  avgScore?: number;
  firstScore?: number;
  lastScore?: number;
  trend?: string;
  recentRpe?: number;
  rpeHistory?: number[];
  durationDiffs?: number[];
  details?: string;
}

export interface MethodologyPriority {
  id: string;
  type: PriorityType;
  priority: PriorityLevel;
  title: string;
  description: string;
  evidence: PriorityEvidence;
  metricsUsed: string[];
  suggestedObjective?: string;
  suggestedPrinciple?: string;
  suggestedBehaviour?: string;
  explanation: string;
  createdAt: string;
}

export interface PriorityContext {
  teamId: string;
  date?: string;
  microcycleDay?: string;
  currentObjective?: string;
  currentSecondaryObjectives?: string[];
  history?: any[];
  summary?: any;
  curriculumPrinciples?: any[];
}

/**
 * Calcula las prioridades metodológicas deterministas basadas en el histórico
 */
export function calculateMethodologyPriorities(context: PriorityContext): MethodologyPriority[] {
  const priorities: MethodologyPriority[] = [];
  const currentDate = context.date ? new Date(context.date) : new Date();

  const sessions = context.history || [];
  const summary = context.summary;
  const curriculumPrinciples = context.curriculumPrinciples || [];

  // =========================================================================
  // 1. ANÁLISIS DE PRINCIPIOS (NUNCA TRABAJADOS vs OBSOLETOS vs BAJA CONSECUCIÓN)
  // =========================================================================

  // Mapear último uso y scores de cada principio
  const principleLastDate: Record<string, { date: Date; count: number; scores: number[] }> = {};

  sessions.forEach(s => {
    const sDate = s.date_time ? new Date(s.date_time) : new Date();
    const evalScore = s.session_evaluations?.[0]?.objective_achievement;

    const sessionPrinciples = [
      s.objective, 
      ...(s.objectives_secondary || [])
    ].filter(Boolean);

    sessionPrinciples.forEach((pName: string) => {
      if (!principleLastDate[pName]) {
        principleLastDate[pName] = { date: sDate, count: 0, scores: [] };
      }
      if (sDate > principleLastDate[pName].date) {
        principleLastDate[pName].date = sDate;
      }
      principleLastDate[pName].count += 1;
      if (evalScore) principleLastDate[pName].scores.push(evalScore);
    });
  });

  // A) Detectar principios NUNCA TRABAJADOS (principle_gap)
  if (curriculumPrinciples.length > 0) {
    const workedPrinciplesLower = new Set(Object.keys(principleLastDate).map(k => k.toLowerCase()));
    
    curriculumPrinciples.forEach(cp => {
      if (!workedPrinciplesLower.has(cp.name.toLowerCase())) {
        priorities.push({
          id: `p-gap-${cp.id || cp.name}`,
          type: 'principle_gap',
          priority: sessions.length >= 3 ? 'high' : 'medium',
          priorityLevel: sessions.length >= 3 ? 'high' : 'medium',
          title: `Principio no iniciado: ${cp.name}`,
          description: `El principio formativo '${cp.name}' (${cp.game_phase || 'Modelo'}) no se ha trabajado en ninguna sesión del periodo.`,
          evidence: {
            sessionsInPeriod: 0,
            details: `Currículo del club: Fase ${cp.game_phase || 'Modelo'}`
          },
          metricsUsed: ['sessions_count = 0', 'curriculum_coverage'],
          suggestedObjective: cp.name,
          suggestedPrinciple: cp.name,
          explanation: `Identificado porque '${cp.name}' forma parte del currículo oficial pero tiene 0 sesiones registradas en el periodo actual.`,
          createdAt: currentDate.toISOString()
        });
      }
    });
  }

  // B) Detectar principios OBSOLETOS (stale_principle >= 21 días)
  Object.entries(principleLastDate).forEach(([pName, data]) => {
    const diffTime = Math.abs(currentDate.getTime() - data.date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays >= METHODOLOGY_RULES.STALE_PRINCIPLE_DAYS) {
      priorities.push({
        id: `p-stale-${pName}`,
        type: 'stale_principle',
        priority: 'high',
        priorityLevel: 'high',
        title: `Principio sin trabajar recientemente: ${pName}`,
        description: `Han transcurrido ${diffDays} días desde la última sesión centrada en '${pName}'.`,
        evidence: {
          daysSinceLastWork: diffDays,
          sessionsInPeriod: data.count
        },
        metricsUsed: [`daysSinceLastWork = ${diffDays} >= ${METHODOLOGY_RULES.STALE_PRINCIPLE_DAYS}`],
        suggestedObjective: pName,
        suggestedPrinciple: pName,
        explanation: `Último trabajo registrado hace ${diffDays} días (${data.count} sesiones previas en el historial). Supera el umbral de ${METHODOLOGY_RULES.STALE_PRINCIPLE_DAYS} días.`,
        createdAt: currentDate.toISOString()
      });
    }

    // C) Detectar principios con BAJA CONSECUCIÓN (low_achievement <= 2.2)
    if (data.scores.length > 0) {
      const avgScore = Number((data.scores.reduce((a, b) => a + b, 0) / data.scores.length).toFixed(1));
      if (avgScore <= METHODOLOGY_RULES.LOW_ACHIEVEMENT_THRESHOLD && data.count >= 2) {
        priorities.push({
          id: `p-low-${pName}`,
          type: 'low_achievement',
          priority: 'high',
          priorityLevel: 'high',
          title: `Foco de mejora táctica: ${pName}`,
          description: `El principio '${pName}' presenta una consecución media de ${avgScore}/4 a lo largo de ${data.count} sesiones.`,
          evidence: {
            sampleSize: data.scores.length,
            avgScore,
            sessionsInPeriod: data.count
          },
          metricsUsed: [`avgScore = ${avgScore} <= ${METHODOLOGY_RULES.LOW_ACHIEVEMENT_THRESHOLD}`, `N = ${data.count}`],
          suggestedObjective: pName,
          suggestedPrinciple: pName,
          explanation: `Identificado como área de oportunidad pedagógica: consecución media ${avgScore}/4 en ${data.count} evaluaciones.`,
          createdAt: currentDate.toISOString()
        });
      }
    }
  });

  // =========================================================================
  // 2. ANÁLISIS DE COMPORTAMIENTOS OBSERVABLES (behaviour_gap con N >= 3)
  // =========================================================================
  const behaviourEvolution = summary?.behaviourEvolution || [];

  behaviourEvolution.forEach((b: any) => {
    // Comportamiento en declive o baja puntuación con muestra representativa (N >= 3)
    if (b.sampleSize >= METHODOLOGY_RULES.MIN_TREND_OBSERVATIONS) {
      if (b.trend === 'declining' || b.avgScore <= METHODOLOGY_RULES.LOW_ACHIEVEMENT_THRESHOLD) {
        const pLevel = b.avgScore <= 2.0 ? 'high' : 'medium';
        priorities.push({
          id: `b-gap-${b.behaviourDescription}`,
          type: 'behaviour_gap',
          priority: pLevel,
          priorityLevel: pLevel,
          title: `Reforzar conducta: ${b.behaviourDescription}`,
          description: `Comportamiento observable con media ${b.avgScore}/4 (${b.sampleSize} observaciones) y tendencia ${b.trend === 'declining' ? 'descendente' : 'irregular'}.`,
          evidence: {
            sampleSize: b.sampleSize,
            avgScore: b.avgScore,
            firstScore: b.firstScore,
            lastScore: b.lastScore,
            trend: b.trend
          },
          metricsUsed: [`sampleSize = ${b.sampleSize} >= 3`, `avgScore = ${b.avgScore}`, `trend = ${b.trend}`],
          suggestedObjective: b.behaviourDescription,
          suggestedBehaviour: b.behaviourDescription,
          explanation: `Se sugiere incidir en '${b.behaviourDescription}' porque los datos muestran evolución de ${b.firstScore} a ${b.lastScore} (Media ${b.avgScore}/4 en ${b.sampleSize} sesiones).`,
          createdAt: currentDate.toISOString()
        });
      }
    }
  });

  // =========================================================================
  // 3. ANÁLISIS DE CARGA Y RPE (load_warning)
  // =========================================================================
  const recentLoad = summary?.loadEvolution || [];
  const lastSession = recentLoad.length > 0 ? recentLoad[recentLoad.length - 1] : null;

  if (lastSession) {
    // A) Alerta de fatiga en MD-1
    if (context.microcycleDay === 'MD-1' && lastSession.actualRpe >= METHODOLOGY_RULES.HIGH_RPE_THRESHOLD) {
      priorities.push({
        id: `load-fatigue-md1`,
        type: 'load_warning',
        priority: 'high',
        priorityLevel: 'high',
        title: `Control de fatiga para MD-1`,
        description: `La sesión anterior registró un RPE elevado (${lastSession.actualRpe}/10). Para MD-1 se recomienda sesión de activación y velocidad de reacción corta sin sobrecarga física.`,
        evidence: {
          recentRpe: lastSession.actualRpe,
          details: `Día de microciclo MD-1 tras sesión con RPE ${lastSession.actualRpe}`
        },
        metricsUsed: [`MD = MD-1`, `lastSessionRpe = ${lastSession.actualRpe} >= 8`],
        explanation: `Advertencia de carga: La cercanía al partido aconseja limitar la carga física y la duración acumulada.`,
        createdAt: currentDate.toISOString()
      });
    }

    // B) Orientación óptima para MD-3
    if (context.microcycleDay === 'MD-3') {
      priorities.push({
        id: `load-guide-md3`,
        type: 'load_warning',
        priority: 'low',
        title: `Día MD-3: Ventana de alta intensidad táctica`,
        description: `El día MD-3 es propicio para juegos de posición con alta oposición (SSG, superioridades y transiciones intensas).`,
        evidence: {
          details: `Día de microciclo MD-3`
        },
        metricsUsed: ['MD = MD-3'],
        explanation: `El microciclo estructurado recomienda situar los ejercicios de mayor demanda cognitiva y física en MD-3.`,
        createdAt: currentDate.toISOString()
      });
    }
  }

  // =========================================================================
  // 4. ORDENAMIENTO DETERMINISTA
  // =========================================================================
  const priorityWeight: Record<PriorityLevel, number> = {
    high: 3,
    medium: 2,
    low: 1
  };

  return priorities.sort((a, b) => {
    const diff = priorityWeight[b.priority] - priorityWeight[a.priority];
    if (diff !== 0) return diff;

    // A igualdad de prioridad, ordenar por días sin trabajar o menor score
    const aScore = a.evidence.avgScore ?? (a.evidence.daysSinceLastWork ? -a.evidence.daysSinceLastWork : 0);
    const bScore = b.evidence.avgScore ?? (b.evidence.daysSinceLastWork ? -b.evidence.daysSinceLastWork : 0);
    return aScore - bScore;
  });
}
