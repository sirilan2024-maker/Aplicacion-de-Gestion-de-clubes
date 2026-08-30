/**
 * Servicio de Comparación y Evolución de Prioridades Metodológicas v1.0 (TypeScript)
 * Antigravity Methodology OS - Fase 5.4
 */

import { calculateMethodologyPriorities, MethodologyPriority, PriorityContext } from "./methodologyPriorityEngine";

export interface PriorityEvolutionResult {
  previousPriorities: MethodologyPriority[];
  currentPriorities: MethodologyPriority[];
  newPriorities: MethodologyPriority[];
  persistentPriorities: MethodologyPriority[];
  resolvedPriorities: MethodologyPriority[];
  aggravatedPriorities: MethodologyPriority[];
  changes: {
    newCount: number;
    persistentCount: number;
    resolvedCount: number;
    aggravatedCount: number;
    hasChanges: boolean;
  };
  evidence: string[];
}

export function computePrioritiesEvolution(
  contextBefore: PriorityContext, 
  contextAfter: PriorityContext
): PriorityEvolutionResult {
  const previousPriorities = calculateMethodologyPriorities(contextBefore);
  const currentPriorities = calculateMethodologyPriorities(contextAfter);

  const prevMap = new Map(previousPriorities.map(p => [p.id, p]));
  const currMap = new Map(currentPriorities.map(p => [p.id, p]));

  const newPriorities: MethodologyPriority[] = [];
  const persistentPriorities: MethodologyPriority[] = [];
  const resolvedPriorities: MethodologyPriority[] = [];
  const aggravatedPriorities: MethodologyPriority[] = [];

  currentPriorities.forEach(curr => {
    const prev = prevMap.get(curr.id);
    if (!prev) {
      newPriorities.push(curr);
    } else {
      if (curr.priorityLevel === 'high' && prev.priorityLevel === 'medium') {
        aggravatedPriorities.push(curr);
      } else {
        persistentPriorities.push(curr);
      }
    }
  });

  previousPriorities.forEach(prev => {
    if (!currMap.has(prev.id)) {
      resolvedPriorities.push(prev);
    }
  });

  const changes = {
    newCount: newPriorities.length,
    persistentCount: persistentPriorities.length,
    resolvedCount: resolvedPriorities.length,
    aggravatedCount: aggravatedPriorities.length,
    hasChanges: newPriorities.length > 0 || resolvedPriorities.length > 0 || aggravatedPriorities.length > 0
  };

  const evidence = [
    `Prioridades previas: ${previousPriorities.length}`,
    `Prioridades actuales: ${currentPriorities.length}`,
    `Resueltas tras la sesión: ${resolvedPriorities.length}`,
    `Nuevas detectadas: ${newPriorities.length}`
  ];

  return {
    previousPriorities,
    currentPriorities,
    newPriorities,
    persistentPriorities,
    resolvedPriorities,
    aggravatedPriorities,
    changes,
    evidence
  };
}
