/**
 * Generador Asistido de Sesiones Metodológicas Determinista v1.0
 * Antigravity Methodology OS
 * Arquitectura: Prioridades -> Propuesta de 5 Bloques -> Validación -> Decisión del Entrenador
 */

import { 
  scoreExercise, 
  recommendExercises, 
  calculateSessionMetrics,
  SessionContext, 
  SessionMetrics 
} from "./recommendationEngine";

export interface SessionProposalBlock {
  blockId: 'activacion' | 'principal_1' | 'principal_2' | 'global' | 'vuelta_calma';
  blockName: string;
  durationMin: number;
  duration: number; // alias para cumplimiento de especificación
  exercise: any;
  objective: string;
  principle: string;
  subprinciple: string;
  behaviour: string;
  organization: string;
  space: string;
  material: string[];
  estimatedLoad: number;
  score: number;
  reasons: string[];
  selectionReasons: string[];
}

export interface SessionProposal {
  teamId: string;
  category: string;
  objective: string;
  secondaryObjectives: string[];
  microcycleDay: string;
  plannedDurationMin: number;
  totalDurationMin: number;
  numPlayers: number;
  intensityLoad: number;
  priorityContext?: string;
  blocks: Record<string, SessionProposalBlock>;
  sessionReasons: string[];
  rationale: string[];
  metrics: SessionMetrics;
}

export interface SessionValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  metrics: SessionMetrics;
}

export interface GeneratorContext extends SessionContext {
  teamId: string;
  allExercises: any[];
}

export interface TimeAllocationResult {
  success: boolean;
  durations: Record<string, number>;
  totalMinutes: number;
  error?: string;
}

/**
 * Distribuye de forma determinista y exacta el presupuesto de tiempo entre los 5 bloques.
 * Casos obligatorios: 60', 90', 120' y duraciones personalizadas válidas entre 30' y 180'.
 */
export function allocateSessionTime(totalDuration: number): TimeAllocationResult {
  if (typeof totalDuration !== 'number' || isNaN(totalDuration) || totalDuration < 30 || totalDuration > 180) {
    return {
      success: false,
      durations: {},
      totalMinutes: 0,
      error: `Duración inválida: ${totalDuration} min. La duración de la sesión debe situarse entre 30 y 180 minutos.`
    };
  }

  const mins = Math.round(totalDuration);

  let durations: Record<string, number>;

  if (mins === 60) {
    durations = {
      activacion: 10,
      principal_1: 15,
      principal_2: 15,
      global: 15,
      vuelta_calma: 5
    };
  } else if (mins === 90) {
    durations = {
      activacion: 15,
      principal_1: 20,
      principal_2: 25,
      global: 20,
      vuelta_calma: 10
    };
  } else if (mins === 120) {
    durations = {
      activacion: 20,
      principal_1: 30,
      principal_2: 35,
      global: 25,
      vuelta_calma: 10
    };
  } else {
    // Para duraciones arbitrarias (ej. 75', 105', etc.)
    const activacion = Math.max(5, Math.round(mins * 0.15));
    const principal_1 = Math.max(10, Math.round(mins * 0.22));
    const principal_2 = Math.max(10, Math.round(mins * 0.28));
    const vuelta_calma = Math.max(5, Math.round(mins * 0.10));
    const global = mins - (activacion + principal_1 + principal_2 + vuelta_calma);

    durations = {
      activacion,
      principal_1,
      principal_2,
      global,
      vuelta_calma
    };
  }

  const sum = Object.values(durations).reduce((a, b) => a + b, 0);
  if (sum !== mins) {
    // Ajuste fino en global si hay desvío de redondeo
    durations.global += (mins - sum);
  }

  return {
    success: true,
    durations,
    totalMinutes: mins
  };
}

/**
 * Helper retrocompatible para obtener el presupuesto de tiempo
 */
export function calculateBlockTimeBudget(totalMinutes: number): Record<string, number> {
  const res = allocateSessionTime(totalMinutes);
  if (!res.success) {
    return { activacion: 15, principal_1: 20, principal_2: 25, global: 20, vuelta_calma: 10 };
  }
  return res.durations;
}

/**
 * Genera una propuesta completa de sesión estructurada en 5 bloques
 */
export function generateMethodologySessionProposal(context: GeneratorContext): SessionProposal {
  const allocation = allocateSessionTime(context.durationMinutes);
  if (!allocation.success) {
    throw new Error(allocation.error || "No se pudo asignar el tiempo para la sesión");
  }

  const timeBudget = allocation.durations;
  const allExercises = context.allExercises || [];
  
  const blockDefs: { id: 'activacion' | 'principal_1' | 'principal_2' | 'global' | 'vuelta_calma'; name: string }[] = [
    { id: "activacion", name: "✨ Activación" },
    { id: "principal_1", name: "🎯 Principal 1" },
    { id: "principal_2", name: "📊 Principal 2" },
    { id: "global", name: "🏟️ Global / Partido" },
    { id: "vuelta_calma", name: "🔄 Vuelta a la Calma" },
  ];

  const selectedExerciseIds = new Set<string>();
  (context.recentExerciseIds || []).forEach(id => selectedExerciseIds.add(id));

  const proposalBlocks: Record<string, SessionProposalBlock> = {};
  const sessionBlocksForMetrics: Record<string, any[]> = {
    activacion: [],
    principal_1: [],
    principal_2: [],
    global: [],
    vuelta_calma: []
  };

  blockDefs.forEach(block => {
    const blockDuration = timeBudget[block.id] || 15;
    
    const blockContext: SessionContext = {
      ...context,
      targetBlock: block.id,
      durationMinutes: blockDuration
    };

    // Candidatos que no han sido seleccionados aún en esta propuesta ni son de uso reciente
    const availableCandidates = allExercises.filter(ex => !selectedExerciseIds.has(ex.id));
    const pool = availableCandidates.length > 0 ? availableCandidates : allExercises;
    const recommendations = recommendExercises(pool, blockContext, 5);

    const chosen = recommendations.length > 0 ? recommendations[0] : null;

    if (chosen) {
      selectedExerciseIds.add(chosen.exercise.id);

      const reasons = [
        `Seleccionado para ${block.name} (Compatibilidad: ${chosen.score} pts)`,
        ...chosen.reasons.slice(0, 3)
      ];

      const ex = chosen.exercise;

      proposalBlocks[block.id] = {
        blockId: block.id,
        blockName: block.name,
        durationMin: blockDuration,
        duration: blockDuration,
        exercise: ex,
        objective: ex.objetivo_tactico?.[0] || ex.objetivo_tecnico?.[0] || context.objective || "Acondicionamiento",
        principle: ex.principle_id || ex.familia || "Modelo de Juego",
        subprinciple: ex.subprinciple_id || ex.tipo || "Dinámica colectiva",
        behaviour: ex.criterios_exito?.[0] || "Orientación y toma de decisión",
        organization: ex.drill_structure || ex.tipo || "Colectiva",
        space: ex.espacio || "Espacio reglamentario adaptado",
        material: ex.material || ["balones", "petos", "conos"],
        estimatedLoad: Math.round(((ex.carga_fisica || 2) / 4) * 100),
        score: chosen.score,
        reasons,
        selectionReasons: reasons
      };

      sessionBlocksForMetrics[block.id].push({
        ...ex,
        duration_min: blockDuration
      });
    } else {
      // Bloque sin candidato metodológicamente válido
      proposalBlocks[block.id] = {
        blockId: block.id,
        blockName: block.name,
        durationMin: blockDuration,
        duration: blockDuration,
        exercise: null,
        objective: context.objective || "Sin asignar",
        principle: "Sin asignar",
        subprinciple: "Sin asignar",
        behaviour: "Sin asignar",
        organization: "Sin asignar",
        space: "Sin asignar",
        material: [],
        estimatedLoad: 0,
        score: 0,
        reasons: [`⚠️ Sin ejercicio metodológicamente pertinente para ${block.name}`],
        selectionReasons: [`⚠️ Sin ejercicio metodológicamente pertinente para ${block.name}`]
      };
    }
  });

  const metrics = calculateSessionMetrics(sessionBlocksForMetrics, context.durationMinutes);
  const totalDuration = Object.values(proposalBlocks).reduce((sum, b) => sum + b.durationMin, 0);

  const sessionReasons: string[] = [];
  if (context.priorityContext) {
    sessionReasons.push(`Prioridad metodológica activa: ${context.priorityContext}`);
  }
  if (context.objective) {
    sessionReasons.push(`Objetivo pedagógico central: ${context.objective}`);
  }
  if (context.microcycleDay) {
    sessionReasons.push(`Día de microciclo ${context.microcycleDay}: modulación de carga y oposición`);
  }
  if (context.recentExerciseIds && context.recentExerciseIds.length > 0) {
    sessionReasons.push(`Filtro anti-repetición: ${context.recentExerciseIds.length} tareas recientes excluidas`);
  }
  sessionReasons.push(`Presupuesto temporal exacto: ${totalDuration} min repartidos en 5 fases metodológicas`);

  return {
    teamId: context.teamId,
    category: context.category || 'General',
    objective: context.objective,
    secondaryObjectives: context.secondaryObjectives || [],
    microcycleDay: context.microcycleDay || 'MD-3',
    plannedDurationMin: context.durationMinutes,
    totalDurationMin: totalDuration,
    numPlayers: context.numPlayers || 16,
    intensityLoad: context.intensityLoad || 3,
    priorityContext: context.priorityContext,
    blocks: proposalBlocks,
    sessionReasons,
    rationale: sessionReasons,
    metrics
  };
}

/**
 * Regenera un bloque específico manteniendo intactos los otros 4 bloques
 */
export function regenerateMethodologyBlock(
  proposal: SessionProposal,
  blockId: 'activacion' | 'principal_1' | 'principal_2' | 'global' | 'vuelta_calma',
  context: GeneratorContext
): SessionProposal {
  const currentBlock = proposal.blocks[blockId];
  if (!currentBlock) return proposal;

  // Excluir ejercicios que ya están asignados a los otros 4 bloques
  const excludedIds = new Set<string>();
  (context.recentExerciseIds || []).forEach(id => excludedIds.add(id));
  
  Object.entries(proposal.blocks).forEach(([bId, b]) => {
    if (bId !== blockId && b.exercise) {
      excludedIds.add(b.exercise.id);
    }
  });

  // Excluir el ejercicio actual para rotar a una nueva variante
  if (currentBlock.exercise) {
    excludedIds.add(currentBlock.exercise.id);
  }

  const blockContext: SessionContext = {
    ...context,
    targetBlock: blockId,
    durationMinutes: currentBlock.durationMin
  };

  let candidates = context.allExercises.filter(ex => !excludedIds.has(ex.id));
  if (candidates.length === 0) {
    candidates = context.allExercises.filter(ex => {
      return !Object.entries(proposal.blocks).some(([bId, b]) => bId !== blockId && b.exercise?.id === ex.id);
    });
  }

  const recommendations = recommendExercises(candidates, blockContext, 5);
  const chosen = recommendations.length > 0 ? recommendations[0] : null;

  if (!chosen) return proposal;

  const ex = chosen.exercise;
  const reasons = [
    `Regenerado para ${currentBlock.blockName} (Compatibilidad: ${chosen.score} pts)`,
    ...chosen.reasons.slice(0, 3)
  ];

  const newBlocks = {
    ...proposal.blocks,
    [blockId]: {
      ...currentBlock,
      exercise: ex,
      objective: ex.objetivo_tactico?.[0] || ex.objetivo_tecnico?.[0] || context.objective || "Acondicionamiento",
      principle: ex.principle_id || ex.familia || "Modelo de Juego",
      subprinciple: ex.subprinciple_id || ex.tipo || "Dinámica colectiva",
      behaviour: ex.criterios_exito?.[0] || "Orientación y toma de decisión",
      organization: ex.drill_structure || ex.tipo || "Colectiva",
      space: ex.espacio || "Espacio adaptado",
      material: ex.material || ["balones", "petos"],
      estimatedLoad: Math.round(((ex.carga_fisica || 2) / 4) * 100),
      score: chosen.score,
      reasons,
      selectionReasons: reasons
    }
  };

  const sessionBlocksForMetrics: Record<string, any[]> = {};
  Object.entries(newBlocks).forEach(([bId, b]) => {
    sessionBlocksForMetrics[bId] = [{
      ...b.exercise,
      duration_min: b.durationMin
    }];
  });

  const metrics = calculateSessionMetrics(sessionBlocksForMetrics, proposal.plannedDurationMin);

  return {
    ...proposal,
    blocks: newBlocks,
    metrics
  };
}

// Alias de conveniencia
export const regenerateSessionBlock = regenerateMethodologyBlock;
export const validateSessionProposal = validateMethodologySessionProposal;

/**
 * Valida globalmente una propuesta o sesión construida antes de guardar
 */
export function validateMethodologySessionProposal(
  proposal: SessionProposal | { durationMinutes: number; blocks: Record<string, any[]>; microcycleDay?: string; numPlayers?: number; category?: string }
): SessionValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  let plannedDuration = 90;
  let blocksMap: Record<string, any[]> = {};
  let microcycleDay = 'MD-3';
  let numPlayers = 16;
  let category = 'cadete';

  if ('plannedDurationMin' in proposal) {
    plannedDuration = proposal.plannedDurationMin;
    microcycleDay = proposal.microcycleDay || 'MD-3';
    numPlayers = proposal.numPlayers || 16;
    category = proposal.category || 'cadete';
    Object.entries(proposal.blocks).forEach(([bId, b]) => {
      blocksMap[bId] = [{ ...b.exercise, duration_min: b.durationMin }];
    });
  } else {
    plannedDuration = proposal.durationMinutes;
    blocksMap = proposal.blocks || {};
    microcycleDay = proposal.microcycleDay || 'MD-3';
    numPlayers = proposal.numPlayers || 16;
    category = proposal.category || 'cadete';
  }

  const metrics = calculateSessionMetrics(blocksMap, plannedDuration);

  // 1. Validación de Duración (Error si desvío > 15', Warning si desvío menor pero distinto de 0)
  if (metrics.totalDurationMin !== plannedDuration) {
    const diff = metrics.totalDurationMin - plannedDuration;
    if (Math.abs(diff) > 15) {
      errors.push(`Error de duración: La sesión suma ${metrics.totalDurationMin} min pero está configurada a ${plannedDuration} min (desvío de ${diff > 0 ? `+${diff}` : diff} min).`);
    } else {
      warnings.push(`Aviso de duración: La sesión suma ${metrics.totalDurationMin} min (duración planificada: ${plannedDuration} min).`);
    }
  }

  // 2. Validación de Contenido y 5 Bloques
  const allExercises: any[] = [];
  const requiredBlocks = ['activacion', 'principal_1', 'principal_2', 'global', 'vuelta_calma'];
  
  requiredBlocks.forEach(bId => {
    const blockList = blocksMap[bId] || [];
    if (blockList.length === 0) {
      warnings.push(`Fase sin contenido: El bloque '${bId}' no tiene ningún ejercicio asignado.`);
    }
    blockList.forEach(item => allExercises.push(item));
  });

  if (allExercises.length === 0) {
    errors.push("Error de contenido: La sesión no contiene ningún ejercicio.");
  }

  // 3. Validación de Duplicados en la misma sesión
  const seenExerciseIds = new Set<string>();
  allExercises.forEach(ex => {
    if (ex.id) {
      if (seenExerciseIds.has(ex.id)) {
        errors.push(`Ejercicio duplicado: '${ex.nombre || ex.id}' está asignado más de una vez en la misma sesión.`);
      }
      seenExerciseIds.add(ex.id);
    }
  });

  // 4. Validación de Jugadores y Categoría
  allExercises.forEach(ex => {
    if (ex.min_players && numPlayers < ex.min_players) {
      warnings.push(`Aviso de participantes: '${ex.nombre}' sugiere mínimo ${ex.min_players} jugadores (actual: ${numPlayers}).`);
    }
    if (ex.max_players && numPlayers > ex.max_players) {
      warnings.push(`Aviso de participantes: '${ex.nombre}' sugiere máximo ${ex.max_players} jugadores (actual: ${numPlayers}).`);
    }
  });

  // 5. Validación de Carga y Microciclo
  if (microcycleDay === 'MD-1' && metrics.estimatedMethodologicalLoad > 65) {
    warnings.push(`Alerta de Carga: La carga metodológica estimada (${metrics.estimatedMethodologicalLoad}%) es alta para el día previo a partido (MD-1).`);
  }

  if (microcycleDay === 'MD+1' && metrics.avgCargaFisica > 2.5) {
    warnings.push(`Alerta de Carga: La carga física media (${metrics.avgCargaFisica}/4) supera los parámetros regenerativos de MD+1.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    metrics
  };
}
