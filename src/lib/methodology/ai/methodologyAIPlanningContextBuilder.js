/**
 * Constructor de Contexto de Planificación Metodológica IA v1.0 (JS & TS)
 * Antigravity Methodology OS - Fase 5.3
 */

function buildTeamPlanningAIContext(params) {
  const {
    club,
    team,
    season,
    report,
    priorities = [],
    weekStartDate,
    matchDayDate,
    matchOpponent,
    trainingDays = [2, 4, 5],
    recentSessions = []
  } = params;

  if (!club || !club.id || !team || !team.id || !season || !season.id) {
    throw new Error("Parámetros obligatorios incompletos para construir el contexto de planificación IA");
  }

  const sampleSize = report?.summary?.evaluatedSessions || 0;
  const isInsufficient = sampleSize < 3;

  const startD = new Date(weekStartDate);
  const endD = new Date(startD);
  endD.setDate(startD.getDate() + 6);

  return {
    club: { id: club.id, name: club.name },
    scope: 'planning',
    team: { id: team.id, name: team.name, category: team.category },
    season: { id: season.id, name: season.name },
    teamReport: {
      summary: report?.summary || {
        totalSessions: 0,
        completedSessions: 0,
        evaluatedSessions: 0,
        evaluationPercentage: 0,
        avgObjectiveAchievement: 0,
        avgRpe: 0,
        modelCoveragePercentage: 0
      },
      topPrinciples: report?.topPrinciples || [],
      leastPrinciples: report?.leastPrinciples || [],
      decliningBehaviours: report?.decliningBehaviours || [],
      improvingBehaviours: report?.improvingBehaviours || [],
      sampleSize
    },
    planningContext: {
      dateRange: {
        weekStartDate,
        weekEndDate: endD.toISOString().split('T')[0]
      },
      matchContext: matchDayDate ? {
        matchDayDate,
        matchOpponent: matchOpponent || 'Rival Oficial',
        isHome: true
      } : undefined,
      trainingDays,
      priorities: isInsufficient ? [] : priorities.map(p => ({
        id: p.id,
        title: p.title,
        priorityLevel: p.priorityLevel || 'medium',
        evidence: p.evidence || p.justification || 'Basado en histórico',
        principleName: p.principleName,
        suggestedDay: p.suggestedDay
      })),
      recentSessions: recentSessions.slice(0, 5).map(s => ({
        date_time: s.date_time,
        duration_minutes: s.duration_minutes || 90,
        objective: s.objective || 'Entrenamiento táctico',
        rpe: s.session_evaluations?.[0]?.session_rpe,
        achievement: s.session_evaluations?.[0]?.objective_achievement
      }))
    }
  };
}

module.exports = {
  buildTeamPlanningAIContext
};
