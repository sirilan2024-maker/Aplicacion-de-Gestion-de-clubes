/**
 * Context Builder para la IA Metodológica v1.0
 * Antigravity Methodology OS - Fase 5.1
 */

const { METHODOLOGY_RULES } = require("../methodologyPriorityEngine");

function buildClubDirectionAIContext(params) {
  const { club, season, reports = [], globalKpis, transversalAlerts = [] } = params;

  const teamsOverview = reports.map(r => ({
    teamId: r.team?.id || '',
    teamName: r.team?.name || 'Equipo',
    category: r.team?.category || '',
    status: r.statusDetail?.status || 'datos_insuficientes',
    avgAchievement: r.summary?.avgObjectiveAchievement || 0,
    avgRpe: r.summary?.avgRpe || 0,
    modelCoveragePercentage: r.summary?.modelCoveragePercentage || 0,
    evaluationPercentage: r.summary?.evaluationPercentage || 0,
    evaluatedSessions: r.summary?.evaluatedSessions || 0,
    totalSessions: r.summary?.totalSessions || 0,
    alertsCount: (r.alerts || []).length
  }));

  const alerts = transversalAlerts.map((a, idx) => ({
    id: `alert-${idx + 1}`,
    teamId: a.teamId,
    teamName: a.teamName,
    severity: a.severity,
    message: a.message,
    metric: a.metric
  }));

  return {
    club: {
      id: club?.id || '',
      name: club?.name || 'Club'
    },
    scope: 'club_direction',
    season: {
      id: season?.id || '',
      name: season?.name || 'Temporada Actual'
    },
    globalKpis: globalKpis || {
      totalTeams: teamsOverview.length,
      solidTeams: teamsOverview.filter(t => t.status === 'solido').length,
      trackingTeams: teamsOverview.filter(t => t.status === 'en_seguimiento').length,
      attentionTeams: teamsOverview.filter(t => t.status === 'atencion').length,
      insufficientDataTeams: teamsOverview.filter(t => t.status === 'datos_insuficientes').length,
      globalAvgAchievement: 0,
      globalAvgRpe: 0,
      globalModelCoverage: 0
    },
    teamsOverview,
    alerts
  };
}

function buildTeamAIContext(params) {
  const { club, team, season, report, currentMicrocycle } = params;
  
  const evaluatedCount = report?.summary?.evaluatedSessions || 0;
  const behaviours = report?.behaviours || [];
  const principles = report?.principles || { mostTrained: [], leastTrained: [] };

  return {
    club: {
      id: club?.id || '',
      name: club?.name || 'Club'
    },
    scope: 'team',
    team: {
      id: team?.id || '',
      name: team?.name || 'Equipo',
      category: team?.category || ''
    },
    season: {
      id: season?.id || '',
      name: season?.name || 'Temporada'
    },
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
      topPrinciples: (principles.mostTrained || []).map(p => p.principle),
      leastPrinciples: (principles.leastTrained || []).map(p => p.principle),
      decliningBehaviours: behaviours.filter(b => b.trend === 'declining').map(b => b.behaviourDescription),
      improvingBehaviours: behaviours.filter(b => b.trend === 'improving').map(b => b.behaviourDescription),
      sampleSize: evaluatedCount
    },
    currentMicrocycle: currentMicrocycle ? {
      weekStartDate: currentMicrocycle.week_start_date,
      matchOpponent: currentMicrocycle.match_opponent,
      objective: currentMicrocycle.objective
    } : undefined
  };
}

module.exports = {
  buildClubDirectionAIContext,
  buildTeamAIContext
};
