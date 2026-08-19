/**
 * Servicio Central de Dirección Deportiva y Análisis Transversal v1.0 (Versión JS para tests y runtime)
 * Antigravity Methodology OS - Fase 4.9
 */

const { METHODOLOGY_RULES } = require("./methodologyPriorityEngine");

function evaluateTeamMethodologyStatus(summary) {
  const metrics = {
    evaluatedSessions: summary.evaluatedSessions,
    evaluationPercentage: summary.evaluationPercentage,
    modelCoveragePercentage: summary.modelCoveragePercentage,
    avgAchievement: summary.avgObjectiveAchievement,
    decliningBehavioursCount: summary.decliningBehavioursCount,
    avgRpe: summary.avgRpe
  };

  // 1. Datos insuficientes: Menos de 3 sesiones evaluadas
  if (summary.evaluatedSessions < METHODOLOGY_RULES.MIN_TREND_OBSERVATIONS) {
    return {
      status: 'datos_insuficientes',
      statusLabel: 'Datos Insuficientes',
      statusColor: 'slate',
      reason: `Muestra insuficiente: Se requieren al menos ${METHODOLOGY_RULES.MIN_TREND_OBSERVATIONS} sesiones evaluadas (actual: ${summary.evaluatedSessions}).`,
      metrics
    };
  }

  // 2. Atención: Indicadores críticos objetivos
  if (
    summary.avgObjectiveAchievement < METHODOLOGY_RULES.LOW_ACHIEVEMENT_THRESHOLD ||
    summary.modelCoveragePercentage < 40 ||
    summary.decliningBehavioursCount >= 2 ||
    summary.avgRpe >= METHODOLOGY_RULES.HIGH_RPE_THRESHOLD ||
    summary.evaluationPercentage < 50
  ) {
    const reasons = [];
    if (summary.avgObjectiveAchievement < METHODOLOGY_RULES.LOW_ACHIEVEMENT_THRESHOLD) {
      reasons.push(`Consecución táctica media (${summary.avgObjectiveAchievement.toFixed(1)}/4) inferior a ${METHODOLOGY_RULES.LOW_ACHIEVEMENT_THRESHOLD}`);
    }
    if (summary.modelCoveragePercentage < 40) {
      reasons.push(`Cobertura de currículo (${summary.modelCoveragePercentage.toFixed(0)}%) inferior al umbral crítico del 40%`);
    }
    if (summary.decliningBehavioursCount >= 2) {
      reasons.push(`${summary.decliningBehavioursCount} conductas observables en tendencia descendente confirmada (N >= 3)`);
    }
    if (summary.avgRpe >= METHODOLOGY_RULES.HIGH_RPE_THRESHOLD) {
      reasons.push(`RPE medio (${summary.avgRpe.toFixed(1)}/10) persistentemente elevado`);
    }
    if (summary.evaluationPercentage < 50) {
      reasons.push(`Ratio de evaluación post-sesión (${summary.evaluationPercentage.toFixed(0)}%) inferior al 50%`);
    }

    return {
      status: 'atencion',
      statusLabel: 'Atención Requerida',
      statusColor: 'rose',
      reason: reasons.join(". "),
      metrics
    };
  }

  // 3. En Seguimiento: Consecución moderada o cobertura media
  if (
    summary.avgObjectiveAchievement < 2.8 ||
    summary.modelCoveragePercentage < METHODOLOGY_RULES.MIN_COVERAGE_PERCENTAGE ||
    summary.evaluationPercentage < 70 ||
    summary.decliningBehavioursCount === 1
  ) {
    const reasons = [];
    if (summary.avgObjectiveAchievement < 2.8) reasons.push(`Consecución media en progreso (${summary.avgObjectiveAchievement.toFixed(1)}/4)`);
    if (summary.modelCoveragePercentage < METHODOLOGY_RULES.MIN_COVERAGE_PERCENTAGE) reasons.push(`Cobertura (${summary.modelCoveragePercentage.toFixed(0)}%) por debajo del objetivo del ${METHODOLOGY_RULES.MIN_COVERAGE_PERCENTAGE}%`);
    if (summary.evaluationPercentage < 70) reasons.push(`Seguimiento de evaluación al ${summary.evaluationPercentage.toFixed(0)}%`);
    if (summary.decliningBehavioursCount === 1) reasons.push(`1 conducta en declive bajo observación`);

    return {
      status: 'en_seguimiento',
      statusLabel: 'En Seguimiento',
      statusColor: 'amber',
      reason: reasons.join(". "),
      metrics
    };
  }

  // 4. Sólido: Cumplimiento óptimo de todos los indicadores
  return {
    status: 'solido',
    statusLabel: 'Sólido',
    statusColor: 'emerald',
    reason: `Cumplimiento metodológico consistente: ${summary.modelCoveragePercentage.toFixed(0)}% cobertura, consecución ${summary.avgObjectiveAchievement.toFixed(1)}/4 y ${summary.evaluationPercentage.toFixed(0)}% evaluaciones completadas.`,
    metrics
  };
}

function calculateClubGlobalKpis(reports) {
  if (!reports || reports.length === 0) {
    return {
      activeTeamsCount: 0,
      totalPlannedSessions: 0,
      totalCompletedSessions: 0,
      totalEvaluatedSessions: 0,
      globalEvaluationPercentage: 0,
      globalAvgRpe: 0,
      globalAvgAchievement: 0,
      globalAvgAttendance: 0,
      globalModelCoverage: 0,
      teamsSolidCount: 0,
      teamsMonitoringCount: 0,
      teamsAttentionCount: 0,
      teamsInsufficientDataCount: 0
    };
  }

  let totalPlanned = 0;
  let totalCompleted = 0;
  let totalEvaluated = 0;
  let sumRpe = 0;
  let sumAchievement = 0;
  let sumAttendance = 0;
  let sumCoverage = 0;
  let countWithEvaluations = 0;

  let solid = 0;
  let monitoring = 0;
  let attention = 0;
  let insufficient = 0;

  reports.forEach(r => {
    totalPlanned += r.summary.plannedSessions;
    totalCompleted += r.summary.completedSessions;
    totalEvaluated += r.summary.evaluatedSessions;
    sumCoverage += r.summary.modelCoveragePercentage;

    if (r.summary.evaluatedSessions > 0) {
      sumRpe += r.summary.avgRpe;
      sumAchievement += r.summary.avgObjectiveAchievement;
      sumAttendance += r.summary.avgAttendanceRate;
      countWithEvaluations++;
    }

    const statusDetail = evaluateTeamMethodologyStatus(r.summary);
    if (statusDetail.status === 'solido') solid++;
    else if (statusDetail.status === 'en_seguimiento') monitoring++;
    else if (statusDetail.status === 'atencion') attention++;
    else insufficient++;
  });

  const activeTeamsCount = reports.length;
  const globalEvaluationPercentage = totalPlanned > 0 ? Number(((totalEvaluated / totalPlanned) * 100).toFixed(1)) : 0;
  const globalModelCoverage = activeTeamsCount > 0 ? Number((sumCoverage / activeTeamsCount).toFixed(1)) : 0;
  const globalAvgRpe = countWithEvaluations > 0 ? Number((sumRpe / countWithEvaluations).toFixed(1)) : 0;
  const globalAvgAchievement = countWithEvaluations > 0 ? Number((sumAchievement / countWithEvaluations).toFixed(2)) : 0;
  const globalAvgAttendance = countWithEvaluations > 0 ? Number((sumAttendance / countWithEvaluations).toFixed(1)) : 0;

  return {
    activeTeamsCount,
    totalPlannedSessions: totalPlanned,
    totalCompletedSessions: totalCompleted,
    totalEvaluatedSessions: totalEvaluated,
    globalEvaluationPercentage,
    globalAvgRpe,
    globalAvgAchievement,
    globalAvgAttendance,
    globalModelCoverage,
    teamsSolidCount: solid,
    teamsMonitoringCount: monitoring,
    teamsAttentionCount: attention,
    teamsInsufficientDataCount: insufficient
  };
}

function buildClubTeamsMatrix(reports) {
  return reports.map(r => {
    const statusDetail = evaluateTeamMethodologyStatus(r.summary);
    const activePrioritiesCount = r.prioritiesAnalysis?.openPriorities?.length || 0;

    return {
      teamId: r.team.id,
      teamName: r.team.name,
      category: r.team.category || 'General',
      plannedSessions: r.summary.plannedSessions,
      completedSessions: r.summary.completedSessions,
      evaluatedSessions: r.summary.evaluatedSessions,
      evaluationPercentage: r.summary.evaluationPercentage,
      avgAchievement: r.summary.avgObjectiveAchievement,
      avgRpe: r.summary.avgRpe,
      avgAttendance: r.summary.avgAttendanceRate,
      modelCoveragePercentage: r.summary.modelCoveragePercentage,
      statusDetail,
      activePrioritiesCount,
      decliningBehavioursCount: r.summary.decliningBehavioursCount,
      dataQualityNotes: r.dataQuality?.notes || []
    };
  }).sort((a, b) => a.teamName.localeCompare(b.teamName));
}

function generateClubTransversalAlerts(reports) {
  const alerts = [];

  reports.forEach(r => {
    const teamId = r.team.id;
    const teamName = r.team.name;
    const category = r.team.category || 'General';
    const seasonId = r.season?.id || 'default';
    const actionUrl = `/admin/metodologia/equipos/${teamId}/temporada/${seasonId}`;

    if (r.summary.modelCoveragePercentage < METHODOLOGY_RULES.MIN_COVERAGE_PERCENTAGE && r.summary.plannedSessions >= 3) {
      alerts.push({
        id: `alert-cov-${teamId}`,
        teamId,
        teamName,
        category,
        ruleActivated: `modelCoverage < ${METHODOLOGY_RULES.MIN_COVERAGE_PERCENTAGE}%`,
        type: 'principle_gap',
        title: `Baja cobertura del currículo (${r.summary.modelCoveragePercentage}%)`,
        description: `El equipo ha cubierto ${r.summary.modelCoveragePercentage}% de los principios formativos oficiales (mínimo establecido: ${METHODOLOGY_RULES.MIN_COVERAGE_PERCENTAGE}%).`,
        evidence: {
          coverage: r.summary.modelCoveragePercentage,
          details: `${r.summary.trainedPrinciplesCount} principios trabajados, ${r.summary.neverTrainedPrinciplesCount} nunca trabajados.`
        },
        severity: r.summary.modelCoveragePercentage < 40 ? 'high' : 'medium',
        actionUrl
      });
    }

    (r.behaviourEvolution || []).forEach(b => {
      if (b.sampleSize >= METHODOLOGY_RULES.MIN_TREND_OBSERVATIONS && b.trend === 'declining') {
        alerts.push({
          id: `alert-beh-dec-${teamId}-${b.behaviourDescription}`,
          teamId,
          teamName,
          category,
          ruleActivated: `N >= ${METHODOLOGY_RULES.MIN_TREND_OBSERVATIONS} && trend == 'declining'`,
          type: 'declining_behaviour',
          title: `Conducta en declive: ${b.behaviourDescription}`,
          description: `Descenso progresivo en '${b.behaviourDescription}' con ${b.sampleSize} observaciones (${b.firstScore} -> ${b.lastScore}, media ${b.avgScore}/4).`,
          evidence: {
            sampleSize: b.sampleSize,
            score: b.avgScore,
            details: `Variación: ${b.percentageVariation !== null ? b.percentageVariation + '%' : 'N/A'}`
          },
          severity: b.avgScore <= 2.0 ? 'high' : 'medium',
          actionUrl
        });
      }
    });

    (r.principlesCoverage || []).forEach(p => {
      if (p.sampleSize >= 2 && p.avgAchievement <= METHODOLOGY_RULES.LOW_ACHIEVEMENT_THRESHOLD) {
        alerts.push({
          id: `alert-princ-low-${teamId}-${p.principleName}`,
          teamId,
          teamName,
          category,
          ruleActivated: `avgAchievement <= ${METHODOLOGY_RULES.LOW_ACHIEVEMENT_THRESHOLD} && N >= 2`,
          type: 'low_achievement',
          title: `Déficit táctico: ${p.principleName}`,
          description: `Consecución media de ${p.avgAchievement}/4 a lo largo de ${p.sessionsCount} sesiones.`,
          evidence: {
            sampleSize: p.sampleSize,
            score: p.avgAchievement,
            details: `Fase: ${p.gamePhase}`
          },
          severity: 'medium',
          actionUrl
        });
      }
    });

    if (r.summary.plannedSessions >= 3 && r.summary.evaluationPercentage < 50) {
      alerts.push({
        id: `alert-eval-rate-${teamId}`,
        teamId,
        teamName,
        category,
        ruleActivated: `plannedSessions >= 3 && evalRate < 50%`,
        type: 'low_evaluation_rate',
        title: `Seguimiento post-sesión incompleto (${r.summary.evaluationPercentage}%)`,
        description: `Solo se han evaluado ${r.summary.evaluatedSessions} de ${r.summary.plannedSessions} sesiones planificadas.`,
        evidence: {
          details: `${r.summary.plannedSessions - r.summary.evaluatedSessions} sesiones pendientes de evaluación.`
        },
        severity: 'high',
        actionUrl
      });
    }
  });

  const severityWeight = { high: 3, medium: 2, low: 1 };
  return alerts.sort((a, b) => {
    const diff = severityWeight[b.severity] - severityWeight[a.severity];
    if (diff !== 0) return diff;
    const teamDiff = a.teamName.localeCompare(b.teamName);
    if (teamDiff !== 0) return teamDiff;
    return a.id.localeCompare(b.id);
  });
}

function compareSpecificTeams(reports, selectedTeamIds) {
  const filteredReports = reports.filter(r => selectedTeamIds.includes(r.team.id));
  
  return filteredReports.map(r => ({
    teamId: r.team.id,
    teamName: r.team.name,
    category: r.team.category || 'General',
    summary: r.summary,
    statusDetail: evaluateTeamMethodologyStatus(r.summary),
    principlesTrained: r.principlesCoverage.filter(p => p.classification !== 'nunca_trabajado'),
    principlesPending: r.principlesCoverage.filter(p => p.classification === 'nunca_trabajado'),
    improvingBehaviours: (r.behaviourEvolution || []).filter(b => b.trend === 'improving'),
    decliningBehaviours: (r.behaviourEvolution || []).filter(b => b.trend === 'declining'),
    conclusions: r.conclusions
  })).sort((a, b) => a.teamName.localeCompare(b.teamName));
}

function calculateClubMonthlyEvolution(allSessions) {
  const monthMap = {};

  allSessions.forEach(s => {
    if (!s.date_time) return;
    const monthKey = s.date_time.substring(0, 7);
    if (!monthMap[monthKey]) monthMap[monthKey] = [];
    monthMap[monthKey].push(s);
  });

  const monthKeys = Object.keys(monthMap).sort();
  const MONTH_NAMES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  return monthKeys.map(key => {
    const sessions = monthMap[key];
    const [year, monthStr] = key.split('-');
    const monthIdx = parseInt(monthStr, 10) - 1;
    const monthLabel = `${MONTH_NAMES[monthIdx]} ${year}`;

    const evaluatedSessions = sessions.filter(s => s.session_evaluations && s.session_evaluations.length > 0);
    const evalCount = evaluatedSessions.length;
    const totalCount = sessions.length;
    const evalPct = totalCount > 0 ? Number(((evalCount / totalCount) * 100).toFixed(1)) : 0;

    const rpeScores = evaluatedSessions.map(s => Number(s.session_evaluations[0]?.session_rpe)).filter(n => !isNaN(n) && n > 0);
    const avgRpe = rpeScores.length > 0 ? Number((rpeScores.reduce((a, b) => a + b, 0) / rpeScores.length).toFixed(1)) : 0;

    const achScores = evaluatedSessions.map(s => Number(s.session_evaluations[0]?.objective_achievement)).filter(n => !isNaN(n) && n > 0);
    const avgAchievement = achScores.length > 0 ? Number((achScores.reduce((a, b) => a + b, 0) / achScores.length).toFixed(2)) : 0;

    const uniqueTeams = new Set(sessions.map(s => s.team_id)).size;

    return {
      monthKey: key,
      monthLabel,
      sessionsCount: totalCount,
      evaluatedSessionsCount: evalCount,
      evaluationPercentage: evalPct,
      avgAchievement,
      avgRpe,
      avgAttendance: 90,
      activeTeamsCount: uniqueTeams
    };
  });
}

module.exports = {
  evaluateTeamMethodologyStatus,
  calculateClubGlobalKpis,
  buildClubTeamsMatrix,
  generateClubTransversalAlerts,
  compareSpecificTeams,
  calculateClubMonthlyEvolution
};
