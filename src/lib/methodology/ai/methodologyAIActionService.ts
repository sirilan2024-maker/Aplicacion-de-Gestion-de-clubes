/**
 * Servicio de Acciones y Copiloto Operativo Metodológico v1.0 (TypeScript)
 * Antigravity Methodology OS - Fase 5.2
 */

import { 
  MethodologyAIActionProposal, 
  ActionImpactPreview,
  AIActionType 
} from "./types";
import { 
  regenerateSessionBlock, 
  validateMethodologySessionProposal,
  SessionProposal,
  GeneratorContext
} from "../methodologySessionGenerator";
import { 
  regenerateMicrocycleDay, 
  validateMicrocycleProposal,
  MicrocycleProposal,
  MicrocyclePlannerContext
} from "../methodologyMicrocyclePlanner";

export function buildSessionActionProposal(params: Partial<MethodologyAIActionProposal>): MethodologyAIActionProposal {
  const { 
    id = `act-sess-${Date.now()}`,
    type = 'regenerate_session_block',
    title,
    rationale,
    evidence = [],
    target = {},
    proposedChanges = { modificationsSummary: [] },
    warnings = [],
    confidence = 0.9
  } = params;

  return {
    id,
    type: type as AIActionType,
    title: title || 'Ajuste operativo de sesión',
    rationale: rationale || 'Propuesta orientada a optimizar la coherencia metodológica.',
    evidence,
    confidence,
    target,
    proposedChanges: {
      ...proposedChanges,
      modificationsSummary: proposedChanges.modificationsSummary || []
    },
    validationRequirements: [
      'Validar duración total en rango 30-180 min',
      'Comprobar compatibilidad de carga con microcycleDay',
      'Verificar pertinencia curricular'
    ],
    warnings,
    requiresHumanConfirmation: true
  };
}

export function buildMicrocycleActionProposal(params: Partial<MethodologyAIActionProposal>): MethodologyAIActionProposal {
  const {
    id = `act-micro-${Date.now()}`,
    type = 'regenerate_microcycle_day',
    title,
    rationale,
    evidence = [],
    target = {},
    proposedChanges = { modificationsSummary: [] },
    warnings = [],
    confidence = 0.9
  } = params;

  return {
    id,
    type: type as AIActionType,
    title: title || 'Ajuste operativo de microciclo',
    rationale: rationale || 'Propuesta de modulación de carga y prioridades del microciclo.',
    evidence,
    confidence,
    target,
    proposedChanges: {
      ...proposedChanges,
      modificationsSummary: proposedChanges.modificationsSummary || []
    },
    validationRequirements: [
      'Respetar aislamiento del resto de días',
      'Modular carga en jornada MD-1',
      'Validar índices acumulados de carga semanal'
    ],
    warnings,
    requiresHumanConfirmation: true
  };
}

const ALLOWED_ACTION_TYPES: string[] = [
  'adjust_session',
  'regenerate_session_block',
  'adjust_microcycle_day',
  'regenerate_microcycle_day',
  'review_methodology_priority',
  'create_methodology_note'
];

export function validateAIActionProposal(
  proposal: MethodologyAIActionProposal, 
  currentObject: any
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [...(proposal?.warnings || [])];

  if (!proposal || !proposal.type || !ALLOWED_ACTION_TYPES.includes(proposal.type)) {
    return { valid: false, errors: ['Propuesta de acción inválida o con tipo no reconocido.'], warnings };
  }

  if (proposal.type === 'regenerate_session_block' || proposal.type === 'adjust_session') {
    if (!currentObject || !currentObject.blocks) {
      errors.push('No se proporcionó una propuesta de sesión válida sobre la que aplicar la acción.');
    } else if (proposal.type === 'regenerate_session_block' && (!proposal.target || !proposal.target.blockId)) {
      errors.push('Se requiere especificar blockId para regenerar un bloque de sesión.');
    }
  } else if (proposal.type === 'regenerate_microcycle_day' || proposal.type === 'adjust_microcycle_day') {
    if (!currentObject || !Array.isArray(currentObject.days)) {
      errors.push('No se proporcionó una propuesta de microciclo válida.');
    } else if (!proposal.target || proposal.target.dayOfWeek === undefined || proposal.target.dayOfWeek < 1 || proposal.target.dayOfWeek > 7) {
      errors.push('El día de la semana (dayOfWeek) debe situarse entre 1 y 7.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function applyAIActionToLocalState(
  proposal: MethodologyAIActionProposal, 
  currentObject: any, 
  context: any
): { updatedObject: any; applied: boolean } {
  // 0 ESCRITURAS EN BD: Modifica únicamente estructuras en memoria local
  if (!proposal || !currentObject) return { updatedObject: currentObject, applied: false };

  if (proposal.type === 'regenerate_session_block') {
    const blockId = proposal.target.blockId;
    if (!blockId || !currentObject.blocks) return { updatedObject: currentObject, applied: false };
    const updatedProposal = regenerateSessionBlock(
      currentObject as SessionProposal,
      blockId as 'activacion' | 'principal_1' | 'principal_2' | 'global' | 'vuelta_calma',
      context as GeneratorContext
    );
    return { updatedObject: updatedProposal, applied: true };
  }

  if (proposal.type === 'regenerate_microcycle_day') {
    const dayOfWeek = proposal.target.dayOfWeek;
    if (dayOfWeek === undefined || !currentObject.days) return { updatedObject: currentObject, applied: false };
    const updatedMicro = regenerateMicrocycleDay(currentObject as MicrocycleProposal, dayOfWeek, context as MicrocyclePlannerContext);
    return { updatedObject: updatedMicro, applied: true };
  }

  return { updatedObject: currentObject, applied: false };
}

export function getActionImpactPreview(
  proposal: MethodologyAIActionProposal, 
  currentObject: any, 
  context: any
): ActionImpactPreview {
  const isSession = proposal.type === 'regenerate_session_block' || proposal.type === 'adjust_session';

  if (isSession) {
    const beforeMetrics = {
      durationMinutes: currentObject?.totalDurationMin || currentObject?.plannedDurationMin || 90,
      intensityLoad: currentObject?.intensityLoad || 3,
      objective: currentObject?.objective || 'Sin objetivo',
      exerciseCount: Object.values(currentObject?.blocks || {}).reduce((sum: number, b: any) => sum + (b.exercises?.length || 0), 0)
    };

    const { updatedObject } = applyAIActionToLocalState(proposal, currentObject, context);
    const validation = validateMethodologySessionProposal(updatedObject);

    const afterMetrics = {
      durationMinutes: updatedObject?.totalDurationMin || updatedObject?.plannedDurationMin || 90,
      intensityLoad: updatedObject?.intensityLoad || 3,
      objective: updatedObject?.objective || 'Sin objetivo',
      exerciseCount: Object.values(updatedObject?.blocks || {}).reduce((sum: number, b: any) => sum + (b.exercises?.length || 0), 0)
    };

    return {
      proposalId: proposal.id,
      actionType: proposal.type,
      before: beforeMetrics,
      after: afterMetrics,
      changes: {
        whatChanges: proposal.proposedChanges.modificationsSummary || [`Regeneración asistida del bloque ${proposal.target.blockId}`],
        whatStaysSame: ['Duración total de sesión', 'Objetivo principal', 'Bloques no seleccionados'],
        deterministicRuleApplied: 'Regeneración determinista de bloque con penalización de redundancia'
      },
      validation: {
        valid: validation.valid,
        errors: validation.errors || [],
        warnings: validation.warnings || []
      },
      risks: validation.warnings || []
    };
  } else {
    const dayOfWeek = proposal.target.dayOfWeek || 1;
    const targetDayBefore = currentObject?.days?.find((d: any) => d.dayOfWeek === dayOfWeek);

    const beforeMetrics = {
      durationMinutes: targetDayBefore?.plannedDurationMin || 0,
      intensityLoad: targetDayBefore?.targetLoad === 'Alta' ? 4 : targetDayBefore?.targetLoad === 'Media-Alta' ? 3 : 2,
      objective: targetDayBefore?.objective || 'Descanso',
      principlesCount: currentObject?.principlesCovered?.covered?.length || 0
    };

    const { updatedObject } = applyAIActionToLocalState(proposal, currentObject, context);
    const validation = validateMicrocycleProposal(updatedObject);
    const targetDayAfter = updatedObject?.days?.find((d: any) => d.dayOfWeek === dayOfWeek);

    const afterMetrics = {
      durationMinutes: targetDayAfter?.plannedDurationMin || 0,
      intensityLoad: targetDayAfter?.targetLoad === 'Alta' ? 4 : targetDayAfter?.targetLoad === 'Media-Alta' ? 3 : 2,
      objective: targetDayAfter?.objective || 'Descanso',
      principlesCount: updatedObject?.principlesCovered?.covered?.length || 0
    };

    return {
      proposalId: proposal.id,
      actionType: proposal.type,
      before: beforeMetrics,
      after: afterMetrics,
      changes: {
        whatChanges: proposal.proposedChanges.modificationsSummary || [`Ajuste en día ${dayOfWeek} (${targetDayBefore?.dayName || 'Jornada'})`],
        whatStaysSame: ['Resto de días del microciclo (1-7)', 'Fecha de partido', 'Estructura MD'],
        deterministicRuleApplied: 'Aislamiento estricto de regeneración por jornada de microciclo'
      },
      validation: {
        valid: validation.valid,
        errors: validation.errors || [],
        warnings: validation.warnings || []
      },
      risks: validation.warnings || []
    };
  }
}
