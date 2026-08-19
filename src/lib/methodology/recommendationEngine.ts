/**
 * Motor de Recomendación y Planificación Metodológica Determinista v1.0
 * Antigravity Methodology OS
 * Implementa las reglas exactas de scoring ponderado y métricas de carga
 */

export interface SessionContext {
  category: string; // querubin, prebenjamin, benjamin, alevin, infantil, cadete, juvenil, senior
  objective: string; // Objetivo principal
  secondaryObjectives?: string[];
  numPlayers: number;
  durationMinutes: number;
  microcycleDay: string; // MD, MD-5, MD-4, MD-3, MD-2, MD-1, MD+1, REST
  intensityLoad: number; // 1-5
  availableSpace?: string;
  availableMaterial?: string[];
  recentExerciseIds?: string[]; // IDs de ejercicios usados en las últimas 3-5 sesiones
  targetBlock?: 'activacion' | 'principal_1' | 'principal_2' | 'global' | 'vuelta_calma';
  priorityContext?: string; // Prioridad metodológica aplicada por el entrenador
}

export interface ExerciseScoreResult {
  exercise: any;
  score: number;
  breakdown: {
    categoryMatch: number;
    objectiveMatch: number;
    principleMatch: number;
    subprincipleMatch: number;
    behaviourMatch: number;
    priorityMatch?: number;
    difficultyMatch: number;
    playerCountMatch: number;
    spaceMatch: number;
    durationMatch: number;
    loadMatch: number;
    blockSuitability: number;
    microcycleSuitability: number;
    recencyPenalty: number;
  };
  reasons: string[];
}

export interface SessionMetrics {
  totalDurationMin: number;
  plannedDurationMin: number;
  durationDifferenceMin: number;
  durationAlert: 'optimal' | 'warning_short' | 'warning_long';
  avgCargaFisica: number; // 1-4
  avgCargaCognitiva: number; // 1-4
  avgOposicion: number; // 1-4
  avgRepresentatividad: number; // 1-4
  estimatedMethodologicalLoad: number; // 1-100
  exerciseCount: number;
  principlesCovered: string[];
  familiesDistribution: Record<string, number>;
}

export const RECOMMENDATION_WEIGHTS = {
  CATEGORY_MATCH: 30,
  CATEGORY_INCOMPATIBLE: -30,
  OBJECTIVE_PRIMARY: 25,
  PRINCIPLE_MATCH: 15,
  SUBPRINCIPLE_MATCH: 10,
  BEHAVIOUR_MATCH: 10,
  DIFFICULTY_FIT: 5,
  PLAYER_CAPACITY_FIT: 5,
  SPACE_FIT: 5,
  DURATION_FIT: 5,
  LOAD_FIT: 5,
  BLOCK_PERFECT_MATCH: 40,
  BLOCK_GOOD_MATCH: 20,
  BLOCK_INCOMPATIBLE: -40,
  MICROCYCLE_IDEAL: 15,
  RECENCY_PENALTY: -20,
};

export function scoreExercise(exercise: any, context: SessionContext): ExerciseScoreResult {
  let score = 0;
  const reasons: string[] = [];
  const breakdown = {
    categoryMatch: 0,
    objectiveMatch: 0,
    principleMatch: 0,
    subprincipleMatch: 0,
    behaviourMatch: 0,
    difficultyMatch: 0,
    playerCountMatch: 0,
    spaceMatch: 0,
    durationMatch: 0,
    loadMatch: 0,
    blockSuitability: 0,
    microcycleSuitability: 0,
    recencyPenalty: 0,
  };

  // 1. Compatibilidad de Categoría (+30 / -30)
  const exCats: string[] = Array.isArray(exercise.categoria_edad) 
    ? exercise.categoria_edad 
    : [exercise.age_category].filter(Boolean);

  if (context.category) {
    if (exCats.includes(context.category) || exercise.age_category === context.category) {
      breakdown.categoryMatch = RECOMMENDATION_WEIGHTS.CATEGORY_MATCH;
      reasons.push("Categoría idónea (+30)");
    } else {
      const catOrder = ["querubin", "prebenjamin", "benjamin", "alevin", "infantil", "cadete", "juvenil", "senior"];
      const targetIdx = catOrder.indexOf(context.category);
      const exIdx = catOrder.indexOf(exercise.age_category || exCats[0]);
      
      if (targetIdx !== -1 && exIdx !== -1 && Math.abs(targetIdx - exIdx) === 1) {
        breakdown.categoryMatch = 10;
        reasons.push("Categoría adyacente compatible (+10)");
      } else {
        breakdown.categoryMatch = RECOMMENDATION_WEIGHTS.CATEGORY_INCOMPATIBLE;
        reasons.push("Incompatible con la franja de edad (-30)");
      }
    }
  }

  // 2. Coincidencia con Objetivo Principal (+25)
  const exTacticalObjs = (exercise.objetivo_tactico || []).map((o: string) => o.toLowerCase());
  const exTechnicalObjs = (exercise.objetivo_tecnico || []).map((o: string) => o.toLowerCase());
  const exFamilia = (exercise.familia || "").toLowerCase();
  const allExTargets = [...exTacticalObjs, ...exTechnicalObjs, exFamilia].filter(Boolean);

  if (context.objective) {
    const mainTarget = context.objective.toLowerCase().trim();
    const hasExact = mainTarget && allExTargets.some(t => t.length > 2 && (t.includes(mainTarget) || mainTarget.includes(t)));
    
    if (hasExact) {
      breakdown.objectiveMatch += RECOMMENDATION_WEIGHTS.OBJECTIVE_PRIMARY;
      reasons.push("Alineado directamente con el objetivo principal (+25)");
    }
  }

  // 3. Principio Compatible (+15)
  if (context.objective || (context.secondaryObjectives && context.secondaryObjectives.length > 0)) {
    const targetPhrases = [context.objective, ...(context.secondaryObjectives || [])].filter(Boolean).map(s => s.toLowerCase());
    const gamePhase = (exercise.game_phase || "").toLowerCase();
    const isPhaseMatch = targetPhrases.some(p => gamePhase.includes(p) || p.includes(gamePhase) || (exercise.principle_id && true));
    
    if (isPhaseMatch) {
      breakdown.principleMatch = RECOMMENDATION_WEIGHTS.PRINCIPLE_MATCH;
      reasons.push("Principio táctico del modelo compatible (+15)");
    }
  }

  // 4. Subprincipio y Comportamiento (+10 c/u)
  if (exercise.subprinciple_id || (exercise.criterios_exito && exercise.criterios_exito.length > 0)) {
    breakdown.subprincipleMatch = RECOMMENDATION_WEIGHTS.SUBPRINCIPLE_MATCH;
    breakdown.behaviourMatch = RECOMMENDATION_WEIGHTS.BEHAVIOUR_MATCH;
  }

  // 5. Ajuste a la Dificultad (+5)
  const targetDiff = Math.min(4, Math.max(1, Math.ceil((context.intensityLoad || 3) * 0.8)));
  if (Math.abs((exercise.dificultad || 2) - targetDiff) <= 1) {
    breakdown.difficultyMatch = RECOMMENDATION_WEIGHTS.DIFFICULTY_FIT;
  }

  // 6. Número de Jugadores (+5)
  if (context.numPlayers && exercise.min_players && exercise.max_players) {
    if (context.numPlayers >= exercise.min_players && context.numPlayers <= exercise.max_players) {
      breakdown.playerCountMatch = RECOMMENDATION_WEIGHTS.PLAYER_CAPACITY_FIT;
    }
  }

  // 7. Espacio Disponible (+5)
  if (context.availableSpace && exercise.espacio) {
    breakdown.spaceMatch = RECOMMENDATION_WEIGHTS.SPACE_FIT;
  }

  // 8. Duración Compatible (+5)
  if (exercise.duracion_recomendada && exercise.duracion_recomendada >= 8 && exercise.duracion_recomendada <= 30) {
    breakdown.durationMatch = RECOMMENDATION_WEIGHTS.DURATION_FIT;
  }

  // 9. Carga Compatible (+5)
  const exCargaFisica = exercise.carga_fisica || 2;
  const targetCarga = Math.min(4, Math.max(1, context.intensityLoad ? Math.round(context.intensityLoad * 0.8) : 2));
  if (Math.abs(exCargaFisica - targetCarga) <= 1) {
    breakdown.loadMatch = RECOMMENDATION_WEIGHTS.LOAD_FIT;
  }

  // 10. Ajuste al Bloque de Sesión (+40 / +20 / -40)
  if (context.targetBlock) {
    const structure = (exercise.drill_structure || exercise.tipo || "").toLowerCase();
    const blockSesion = (exercise.bloque_sesion || "").toLowerCase();
    const exType = (exercise.tipo || "").toLowerCase();

    if (context.targetBlock === 'activacion') {
      if (blockSesion === 'calentamiento' || structure.includes('calentamiento') || structure.includes('circuito') || exType === 'rondo') {
        breakdown.blockSuitability = RECOMMENDATION_WEIGHTS.BLOCK_PERFECT_MATCH;
        reasons.push("Estructura óptima para activación (+40)");
      } else {
        breakdown.blockSuitability = RECOMMENDATION_WEIGHTS.BLOCK_INCOMPATIBLE;
        reasons.push("Tarea no apta para activación (-40)");
      }
    } else if (context.targetBlock === 'principal_1') {
      if (exType === 'juego_medio' || exType === 'rondo' || exType === 'analitico' || (blockSesion === 'principal' && exType !== 'ssg' && exType !== 'juego_global')) {
        breakdown.blockSuitability = RECOMMENDATION_WEIGHTS.BLOCK_PERFECT_MATCH;
        reasons.push("Ideal para fijación táctica (Principal 1) (+40)");
      } else if (exType === 'ssg') {
        breakdown.blockSuitability = RECOMMENDATION_WEIGHTS.BLOCK_GOOD_MATCH;
      } else {
        breakdown.blockSuitability = RECOMMENDATION_WEIGHTS.BLOCK_INCOMPATIBLE;
      }
    } else if (context.targetBlock === 'principal_2') {
      if (exType === 'ssg' || exType === 'transiciones') {
        breakdown.blockSuitability = RECOMMENDATION_WEIGHTS.BLOCK_PERFECT_MATCH;
        reasons.push("Óptimo para aumento de oposición contextual (Principal 2) (+40)");
      } else if (exType === 'juego_medio') {
        breakdown.blockSuitability = RECOMMENDATION_WEIGHTS.BLOCK_GOOD_MATCH;
      } else if (exType === 'juego_global') {
        breakdown.blockSuitability = 10;
      } else {
        breakdown.blockSuitability = RECOMMENDATION_WEIGHTS.BLOCK_INCOMPATIBLE;
      }
    } else if (context.targetBlock === 'global') {
      if (exType === 'juego_global' || blockSesion === 'global') {
        breakdown.blockSuitability = RECOMMENDATION_WEIGHTS.BLOCK_PERFECT_MATCH;
        reasons.push("Alta representatividad para bloque global (+40)");
      } else if (exType === 'ssg') {
        breakdown.blockSuitability = RECOMMENDATION_WEIGHTS.BLOCK_GOOD_MATCH;
      } else {
        breakdown.blockSuitability = RECOMMENDATION_WEIGHTS.BLOCK_INCOMPATIBLE;
      }
    } else if (context.targetBlock === 'vuelta_calma') {
      if (blockSesion === 'vuelta_calma' || exType === 'analitico' || (exercise.carga_fisica && exercise.carga_fisica <= 1)) {
        breakdown.blockSuitability = RECOMMENDATION_WEIGHTS.BLOCK_PERFECT_MATCH;
        reasons.push("Regenerativo para vuelta a la calma (+40)");
      } else {
        breakdown.blockSuitability = RECOMMENDATION_WEIGHTS.BLOCK_INCOMPATIBLE;
      }
    }
  }

  // 11. Reglas de Microciclo (MD-x)
  if (context.microcycleDay) {
    const md = context.microcycleDay.toUpperCase();
    const cargaFisica = exercise.carga_fisica || 2;
    const exType = (exercise.tipo || "").toLowerCase();

    if (md === 'MD-3') {
      if (exType === 'ssg' || (exercise.oposicion && exercise.oposicion >= 3) || cargaFisica >= 3) {
        breakdown.microcycleSuitability += RECOMMENDATION_WEIGHTS.MICROCYCLE_IDEAL;
        reasons.push("Ajuste perfecto a MD-3 (Tensión/Fuerza) (+15)");
      }
    } else if (md === 'MD-2') {
      if (exType === 'juego_global' || exType === 'juego_medio' || (exercise.representatividad && exercise.representatividad >= 3)) {
        breakdown.microcycleSuitability += RECOMMENDATION_WEIGHTS.MICROCYCLE_IDEAL;
        reasons.push("Ajuste óptimo a MD-2 (Espacios amplios) (+15)");
      }
    } else if (md === 'MD-1') {
      if (cargaFisica <= 2 && (exType === 'rondo' || exercise.familia === 'BALÓN PARADO' || exType === 'analitico')) {
        breakdown.microcycleSuitability += RECOMMENDATION_WEIGHTS.MICROCYCLE_IDEAL;
        reasons.push("Baja fatiga, ideal para MD-1 (+15)");
      } else if (cargaFisica >= 4 || (exercise.duracion_recomendada && exercise.duracion_recomendada > 20)) {
        breakdown.microcycleSuitability -= 20;
        reasons.push("Demasiada carga física para víspera de partido (MD-1) (-20)");
      }
    } else if (md === 'MD+1') {
      if (cargaFisica <= 2 && (exercise.dificultad && exercise.dificultad <= 2)) {
        breakdown.microcycleSuitability += RECOMMENDATION_WEIGHTS.MICROCYCLE_IDEAL;
        reasons.push("Carga regenerativa para MD+1 (+15)");
      }
    }
  }

  // 12. Penalización por Repetición Reciente (-20)
  if (context.recentExerciseIds && context.recentExerciseIds.includes(exercise.id)) {
    breakdown.recencyPenalty = RECOMMENDATION_WEIGHTS.RECENCY_PENALTY;
    reasons.push("Utilizado recientemente en las últimas sesiones (-20)");
  }

  // 13. Alineación con Prioridad Metodológica Seleccionada (+15)
  if (context.priorityContext) {
    const pTarget = context.priorityContext.toLowerCase().trim();
    const allExTargets = [
      exercise.nombre || "",
      exercise.familia || "",
      exercise.game_phase || "",
      ...(exercise.objetivo_tactico || []),
      ...(exercise.objetivo_tecnico || []),
      ...(exercise.criterios_exito || [])
    ].map((t: string) => t.toLowerCase());

    const isPriorityMatch = allExTargets.some(t => t.includes(pTarget) || pTarget.includes(t));
    if (isPriorityMatch) {
      breakdown.priorityMatch = 15;
      reasons.push(`Recomendado porque coincide con la prioridad metodológica seleccionada: "${context.priorityContext}" (+15)`);
    }
  }

  score = Object.values(breakdown).reduce((a, b) => a + (b || 0), 0);

  return {
    exercise,
    score,
    breakdown,
    reasons
  };
}

export function recommendExercises(
  allExercises: any[], 
  context: SessionContext, 
  limit: number = 8
): ExerciseScoreResult[] {
  const scored = allExercises.map(ex => scoreExercise(ex, context));
  
  return scored
    .filter(res => res.score > 0)
    .sort((a, b) => {
      // 1. Mayor score
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // 2. Menor penalización por repetición (recencyPenalty = 0 mejor que -20)
      const recencyA = a.breakdown.recencyPenalty || 0;
      const recencyB = b.breakdown.recencyPenalty || 0;
      if (recencyB !== recencyA) {
        return recencyB - recencyA;
      }
      // 3. Mejor compatibilidad específica con el bloque
      const blockA = a.breakdown.blockSuitability || 0;
      const blockB = b.breakdown.blockSuitability || 0;
      if (blockB !== blockA) {
        return blockB - blockA;
      }
      // 4. Mejor coincidencia con la prioridad activa
      const prioA = a.breakdown.priorityMatch || 0;
      const prioB = b.breakdown.priorityMatch || 0;
      if (prioB !== prioA) {
        return prioB - prioA;
      }
      // 5. Menor exercise.id como desempate final
      const idA = String(a.exercise?.id || '');
      const idB = String(b.exercise?.id || '');
      return idA.localeCompare(idB);
    })
    .slice(0, limit);
}

export function calculateSessionMetrics(
  sessionBlocks: Record<string, any[]>,
  plannedDurationMin: number = 90
): SessionMetrics {
  const allExercises: any[] = [];
  Object.values(sessionBlocks).forEach(block => {
    block.forEach(item => allExercises.push(item));
  });

  const totalDuration = allExercises.reduce((sum, item) => sum + (Number(item.duration_min) || 0), 0);
  const diff = totalDuration - plannedDurationMin;

  let durationAlert: 'optimal' | 'warning_short' | 'warning_long' = 'optimal';
  if (diff < -15) durationAlert = 'warning_short';
  else if (diff > 15) durationAlert = 'warning_long';

  const count = allExercises.length;

  const avgCargaFisica = count > 0 
    ? Number((allExercises.reduce((sum, ex) => sum + (Number(ex.carga_fisica) || 2), 0) / count).toFixed(1))
    : 0;

  const avgCargaCognitiva = count > 0 
    ? Number((allExercises.reduce((sum, ex) => sum + (Number(ex.carga_cognitiva) || 2), 0) / count).toFixed(1))
    : 0;

  const avgOposicion = count > 0 
    ? Number((allExercises.reduce((sum, ex) => sum + (Number(ex.oposicion) || 2), 0) / count).toFixed(1))
    : 0;

  const avgRepresentatividad = count > 0 
    ? Number((allExercises.reduce((sum, ex) => sum + (Number(ex.representatividad) || 3), 0) / count).toFixed(1))
    : 0;

  const durationFactor = Math.min(1.2, Math.max(0.5, totalDuration / 90));
  const intensityFactor = ((avgCargaFisica * 0.35) + (avgCargaCognitiva * 0.25) + (avgOposicion * 0.2) + (avgRepresentatividad * 0.2)) / 4;
  const estimatedMethodologicalLoad = Math.round(Math.min(100, Math.max(10, intensityFactor * durationFactor * 90)));

  const principlesSet = new Set<string>();
  const familiesDist: Record<string, number> = {};

  allExercises.forEach(ex => {
    (ex.objetivo_tactico || []).forEach((t: string) => principlesSet.add(t));
    const fam = ex.familia || 'TÁCTICA';
    familiesDist[fam] = (familiesDist[fam] || 0) + 1;
  });

  return {
    totalDurationMin: totalDuration,
    plannedDurationMin,
    durationDifferenceMin: diff,
    durationAlert,
    avgCargaFisica,
    avgCargaCognitiva,
    avgOposicion,
    avgRepresentatividad,
    estimatedMethodologicalLoad,
    exerciseCount: count,
    principlesCovered: Array.from(principlesSet),
    familiesDistribution: familiesDist,
  };
}
