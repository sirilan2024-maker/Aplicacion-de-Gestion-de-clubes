/**
 * Servicio de Planificación Metodológica Asistida por IA v1.0 (TypeScript)
 * Antigravity Methodology OS - Fase 5.3
 */

import { 
  MethodologyAIContext, 
  MethodologyAIPlanningProposal, 
  ProposedMicrocycleDay, 
  ProposedSessionTemplate 
} from "./types";
import { 
  generateMicrocycleProposal, 
  validateMicrocycleProposal,
  MicrocycleProposal 
} from "../methodologyMicrocyclePlanner";

export function buildAIPlanningProposal(
  context: MethodologyAIContext, 
  curriculumPrinciples: any[] = [], 
  allExercises: any[] = []
): MethodologyAIPlanningProposal {
  const {
    team,
    season,
    planningContext,
    teamReport
  } = context;

  if (!team || !season || !planningContext) {
    throw new Error("Contexto incompleto para planificación IA");
  }

  const {
    dateRange,
    matchContext,
    trainingDays = [2, 4, 5],
    priorities = []
  } = planningContext;

  const weekStartDate = dateRange?.weekStartDate || new Date().toISOString().split('T')[0];
  const matchDayDate = matchContext?.matchDayDate;
  const matchOpponent = matchContext?.matchOpponent;
  const sampleSize = teamReport?.sampleSize || 0;
  const isInsufficient = sampleSize < 3;

  const deterministicMicro: MicrocycleProposal = generateMicrocycleProposal({
    teamId: team.id,
    category: team.category,
    seasonId: season.id,
    weekStartDate,
    matchDayDate,
    matchOpponent,
    trainingDays,
    priorities: priorities as any[],
    curriculumPrinciples,
    teamObjectives: []
  });

  const validationResults = validateMicrocycleProposal(deterministicMicro);

  const proposedDays: ProposedMicrocycleDay[] = deterministicMicro.days.map(d => {
    const sessionType = d.isMatchDay ? 'Partido' : (d.isTrainingDay ? 'Entrenamiento' : 'Descanso');
    let rationale = 'Jornada de descanso y regeneración pasiva.';
    let evidence = [`Estructura semanal: ${d.microcycleDay}`];

    if (d.isMatchDay) {
      rationale = `Competición oficial frente a ${matchOpponent || 'Rival'}.`;
      evidence = [`Fecha de partido programada: ${matchDayDate}`];
    } else if (d.isTrainingDay) {
      if (d.priorityContext) {
        rationale = `Foco prioritario en '${d.priorityContext}' con modulación de carga para ${d.microcycleDay}.`;
        evidence = [`Prioridad institucional detectada: ${d.priorityContext}`];
      } else {
        rationale = `Sesión formativa de desarrollo del modelo de juego adaptada a ${d.microcycleDay}.`;
        evidence = [`Día de entrenamiento fijado: ${d.dayName}`];
      }
    }

    return {
      dayOfWeek: d.dayOfWeek,
      dayName: d.dayName,
      dateStr: d.date,
      microcycleDay: d.microcycleDay,
      sessionType: sessionType as any,
      targetLoad: d.targetLoad as any,
      plannedDurationMin: d.plannedDurationMin,
      objective: d.objective,
      priorityContext: d.priorityContext,
      priorityTitle: d.priorityContext,
      suggestedPrinciple: d.principles?.[0],
      rationale,
      evidence
    };
  });

  const proposedSessions: ProposedSessionTemplate[] = deterministicMicro.days
    .filter(d => d.isTrainingDay)
    .map(d => {
      const loadScore = d.targetLoad === 'Alta' ? 4 : d.targetLoad === 'Media-Alta' ? 3 : 2;
      return {
        dayOfWeek: d.dayOfWeek,
        microcycleDay: d.microcycleDay,
        durationMinutes: d.plannedDurationMin || 90,
        intensityLoad: loadScore,
        objective: d.objective,
        suggestedPrinciple: d.principles?.[0],
        organization: 'Trabajo sectorial e intersectorial adaptado',
        suggestedBlocks: [
          { blockId: 'activacion', name: '✨ Activación', durationMin: 15, focus: 'Movilidad y activación técnica' },
          { blockId: 'principal_1', name: '🎯 Principal 1', durationMin: 20, focus: d.objective },
          { blockId: 'principal_2', name: '📊 Principal 2', durationMin: 25, focus: 'Transferencia táctica' },
          { blockId: 'global', name: '🏟️ Global / Partido', durationMin: 20, focus: 'Juego condicionado' },
          { blockId: 'vuelta_calma', name: '🔄 Vuelta a la Calma', durationMin: 10, focus: 'Regenerativo' }
        ],
        rationale: `Diseño metodológico para ${d.microcycleDay} enfocado en ${d.objective}.`
      };
    });

  const warnings = [...(validationResults.warnings || [])];
  if (isInsufficient) {
    warnings.push("Aviso N < 3: Planificación basada en modelo general por muestra estadística reducida.");
  }

  return {
    id: `plan-prop-${team.id}-${Date.now()}`,
    scope: 'team_microcycle_planning',
    team: { id: team.id, name: team.name, category: team.category },
    dateRange: {
      weekStartDate,
      weekEndDate: planningContext.dateRange?.weekEndDate || weekStartDate
    },
    matchContext: matchContext ? {
      matchDayDate: matchContext.matchDayDate,
      matchOpponent: matchContext.matchOpponent
    } : undefined,
    currentMethodologyState: {
      status: isInsufficient ? 'datos_insuficientes' : ((teamReport?.summary?.avgObjectiveAchievement || 0) < 2.2 ? 'atencion' : 'solido'),
      modelCoveragePercentage: teamReport?.summary?.modelCoveragePercentage || 0,
      avgAchievement: teamReport?.summary?.avgObjectiveAchievement || 0,
      evaluatedSessions: sampleSize
    },
    priorities: priorities.map((p: any) => ({
      id: p.id,
      title: p.title,
      priorityLevel: p.priorityLevel,
      rationale: p.evidence || 'Prioridad de desarrollo',
      affectedDay: p.suggestedDay || 'MD-3'
    })),
    rationale: `Planificación semanal asistida estructurada para optimizar el rendimiento y la adherencia al currículo institucional.`,
    evidence: [
      { metric: 'Sesiones previas evaluadas', value: sampleSize, reference: team.name },
      { metric: 'Consecución histórica', value: `${(teamReport?.summary?.avgObjectiveAchievement || 0).toFixed(1)}/4`, reference: team.name },
      { metric: 'Cobertura del modelo', value: `${teamReport?.summary?.modelCoveragePercentage || 0}%`, reference: team.name }
    ],
    proposedMicrocycle: {
      days: proposedDays,
      weeklyLoadIndex: deterministicMicro.weeklyLoadIndex,
      totalPlannedMinutes: deterministicMicro.totalPlannedMinutes,
      trainingDaysCount: deterministicMicro.days.filter(d => d.isTrainingDay).length
    },
    proposedSessions,
    warnings,
    validationResults,
    confidence: isInsufficient ? 0.65 : 0.95,
    requiresHumanConfirmation: true
  };
}

export function updateAIPlanningDay(
  proposal: MethodologyAIPlanningProposal, 
  dayOfWeek: number, 
  dayEdits: Partial<ProposedMicrocycleDay>, 
  curriculumPrinciples: any[] = []
): { proposal: MethodologyAIPlanningProposal; valid: boolean; errors: string[]; warnings: string[] } {
  if (!proposal || !proposal.proposedMicrocycle || !Array.isArray(proposal.proposedMicrocycle.days)) {
    return { proposal, valid: false, errors: ['Propuesta de planificación inválida'], warnings: [] };
  }

  const updatedDays = proposal.proposedMicrocycle.days.map(d => {
    if (d.dayOfWeek === dayOfWeek) {
      return {
        ...d,
        ...dayEdits,
        dayOfWeek: d.dayOfWeek,
        dayName: d.dayName,
        dateStr: d.dateStr,
        microcycleDay: dayEdits.microcycleDay || d.microcycleDay
      };
    }
    return d;
  });

  const totalMinutes = updatedDays.reduce((sum, d) => sum + (d.plannedDurationMin || 0), 0);
  const trainingCount = updatedDays.filter(d => d.sessionType === 'Entrenamiento').length;

  const mockMicroForValidation: any = {
    teamId: proposal.team.id,
    category: proposal.team.category,
    weekStartDate: proposal.dateRange.weekStartDate,
    days: updatedDays.map(d => ({
      dayOfWeek: d.dayOfWeek,
      dayName: d.dayName,
      date: d.dateStr,
      microcycleDay: d.microcycleDay,
      isTrainingDay: d.sessionType === 'Entrenamiento',
      isMatchDay: d.sessionType === 'Partido',
      sessionType: d.sessionType,
      targetLoad: d.targetLoad,
      plannedDurationMin: d.plannedDurationMin,
      objective: d.objective
    })),
    totalPlannedMinutes: totalMinutes,
    weeklyLoadIndex: proposal.proposedMicrocycle.weeklyLoadIndex,
    principlesCovered: { covered: curriculumPrinciples.map(p => p.name || p.id) }
  };

  const validationResults = validateMicrocycleProposal(mockMicroForValidation);

  const updatedProposal: MethodologyAIPlanningProposal = {
    ...proposal,
    proposedMicrocycle: {
      ...proposal.proposedMicrocycle,
      days: updatedDays,
      totalPlannedMinutes: totalMinutes,
      trainingDaysCount: trainingCount
    },
    validationResults,
    warnings: validationResults.warnings || []
  };

  return {
    proposal: updatedProposal,
    valid: validationResults.valid,
    errors: validationResults.errors || [],
    warnings: validationResults.warnings || []
  };
}
