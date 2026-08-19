/**
 * Servicio Determinista de Feedback y Comparación Planificado vs Ejecutado v1.0 (TypeScript)
 * Antigravity Methodology OS - Fase 5.4
 */

export interface PlannedVsExecutedFeedbackResult {
  sessionId: string;
  planned: {
    durationMinutes: number;
    intensityLoad: number;
    numPlayers: number;
    objective: string;
    microcycleDay: string;
  };
  executed: {
    actualDurationMin: number;
    sessionRpe: number | null;
    objectiveAchievement: number | null;
    actualPlayers: number;
    coachObservations: string;
    incidentsNotes: string;
    behavioursCount: number;
  };
  deviations: {
    durationDiffMin: number;
    durationAlert: 'optimal' | 'moderate' | 'severe';
    playersDiff: number;
    rpeAlert: 'optimal' | 'normal' | 'high' | 'excessive' | 'low';
    achievementAlert: 'optimal' | 'needs_improvement' | 'critical';
    isDurationDeviationSevere: boolean;
    isRpeExcessive: boolean;
  };
  methodologyImpact: {
    achievementLevel: 'satisfactorio' | 'requiere_atencion' | 'no_evaluado';
    lowScoringBehavioursCount: number;
    highScoringBehavioursCount: number;
    summary: string;
  };
  dataQuality: {
    isEvaluated: boolean;
    hasAttendanceRecorded: boolean;
    hasBehavioursEvaluated: boolean;
  };
}

export function calculatePlannedVsExecutedFeedback(params: {
  session: any;
  evaluation?: any;
  attendance?: any[];
  curriculumPrinciples?: any[];
}): PlannedVsExecutedFeedbackResult {
  const { session, evaluation, attendance = [], curriculumPrinciples = [] } = params;

  if (!session || !session.id) {
    throw new Error("Parámetros inválidos: se requiere la sesión objetivo.");
  }

  const plannedDuration = session.duration_minutes || session.plannedDurationMin || 90;
  const plannedPlayers = session.num_players || 16;
  const plannedLoad = session.intensity_load || session.estimated_load || 3;

  const hasEvaluation = Boolean(evaluation && typeof evaluation.actualDurationMin === 'number');

  const actualDuration = hasEvaluation ? evaluation.actualDurationMin : plannedDuration;
  const actualRpe = hasEvaluation ? evaluation.sessionRpe : null;
  const objectiveAchievement = hasEvaluation ? evaluation.objectiveAchievement : null;
  const actualPlayers = hasEvaluation ? (evaluation.playersPresentCount || attendance.filter(a => a.status === 'present').length) : plannedPlayers;

  const durationDiffMin = actualDuration - plannedDuration;
  const durationAbsDiff = Math.abs(durationDiffMin);
  const playersDiff = actualPlayers - plannedPlayers;

  let durationAlert: 'optimal' | 'moderate' | 'severe' = 'optimal';
  if (durationAbsDiff > 15) {
    durationAlert = 'severe';
  } else if (durationAbsDiff > 0) {
    durationAlert = 'moderate';
  }

  let rpeAlert: 'optimal' | 'normal' | 'high' | 'excessive' | 'low' = 'normal';
  if (actualRpe !== null) {
    if (actualRpe >= 8.5) {
      rpeAlert = 'excessive';
    } else if (actualRpe >= 7.5) {
      rpeAlert = 'high';
    } else if (actualRpe <= 4.0) {
      rpeAlert = 'low';
    }
  }

  let achievementAlert: 'optimal' | 'needs_improvement' | 'critical' = 'optimal';
  if (objectiveAchievement !== null) {
    if (objectiveAchievement < 2.0) {
      achievementAlert = 'critical';
    } else if (objectiveAchievement < 2.5) {
      achievementAlert = 'needs_improvement';
    }
  }

  const behaviourEvaluations = evaluation?.behaviours || [];
  const lowScoringBehaviours = behaviourEvaluations.filter((b: any) => b.score < 2.5);
  const highScoringBehaviours = behaviourEvaluations.filter((b: any) => b.score >= 3.0);

  const planned = {
    durationMinutes: plannedDuration,
    intensityLoad: plannedLoad,
    numPlayers: plannedPlayers,
    objective: session.objective || 'Desarrollo táctico general',
    microcycleDay: session.microcycleDay || 'MD-3'
  };

  const executed = {
    actualDurationMin: actualDuration,
    sessionRpe: actualRpe,
    objectiveAchievement,
    actualPlayers,
    coachObservations: evaluation?.coachObservations || '',
    incidentsNotes: evaluation?.incidentsNotes || '',
    behavioursCount: behaviourEvaluations.length
  };

  const deviations = {
    durationDiffMin,
    durationAlert,
    playersDiff,
    rpeAlert,
    achievementAlert,
    isDurationDeviationSevere: durationAbsDiff > 15,
    isRpeExcessive: actualRpe !== null && actualRpe >= 8.0
  };

  const methodologyImpact = {
    achievementLevel: (objectiveAchievement !== null ? (objectiveAchievement >= 3 ? 'satisfactorio' : 'requiere_atencion') : 'no_evaluado') as any,
    lowScoringBehavioursCount: lowScoringBehaviours.length,
    highScoringBehavioursCount: highScoringBehaviours.length,
    summary: objectiveAchievement !== null 
      ? `Consecución de ${objectiveAchievement.toFixed(1)}/4.0 con RPE de ${actualRpe || 'N/A'}/10.`
      : 'Sesión pendiente de evaluación pedagógica.'
  };

  const dataQuality = {
    isEvaluated: hasEvaluation,
    hasAttendanceRecorded: attendance.length > 0,
    hasBehavioursEvaluated: behaviourEvaluations.length > 0
  };

  return {
    sessionId: session.id,
    planned,
    executed,
    evaluation: evaluation || null,
    deviations,
    methodologyImpact,
    dataQuality
  };
}
