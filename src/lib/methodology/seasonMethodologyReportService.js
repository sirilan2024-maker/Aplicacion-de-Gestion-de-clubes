/**
 * Servicio de Memoria Metodológica de Temporada y Dirección Deportiva v1.0 (Versión JS para tests y runtime)
 * Antigravity Methodology OS
 */

const { METHODOLOGY_RULES } = require("./methodologyPriorityEngine");

function buildSeasonMethodologyReportFromData(params) {
  const { team, season, sessions = [], curriculumPrinciples = [], teamObjectives = [], attendanceRecords = [] } = params;

  const totalSessions = sessions.length;
  const completedSessions = sessions.filter(s => s.is_completed !== false).length;
  const evaluatedSessionsList = sessions.filter(s => s.session_evaluations && s.session_evaluations.length > 0);
  const evaluatedSessionsCount = evaluatedSessionsList.length;
  const evaluationPercentage = totalSessions > 0 ? Math.round((evaluatedSessionsCount / totalSessions) * 100) : 0;

  const totalPlannedDurationMin = sessions.reduce((sum, s) => sum + (Number(s.duration_minutes) || 0), 0);
  const totalActualDurationMin = sessions.reduce((sum, s) => {
    const evalData = s.session_evaluations?.[0];
    return sum + (evalData?.actual_duration_min !== undefined ? Number(evalData.actual_duration_min) : (Number(s.duration_minutes) || 0));
  }, 0);
  const durationDeviationMin = totalActualDurationMin - totalPlannedDurationMin;

  const achievementScores = [];
  const rpeScores = [];

  evaluatedSessionsList.forEach(s => {
    const ev = s.session_evaluations[0];
    if (ev.objective_achievement) achievementScores.push(Number(ev.objective_achievement));
    if (ev.session_rpe) rpeScores.push(Number(ev.session_rpe));
  });

  const avgObjectiveAchievement = achievementScores.length > 0
    ? Number((achievementScores.reduce((a, b) => a + b, 0) / achievementScores.length).toFixed(2))
    : 0;

  const avgRpe = rpeScores.length > 0
    ? Number((rpeScores.reduce((a, b) => a + b, 0) / rpeScores.length).toFixed(1))
    : 0;

  // Asistencia media
  let avgAttendanceRate = 0;
  if (attendanceRecords.length > 0) {
    const present = attendanceRecords.filter(a => a.attended || a.status === 'present').length;
    avgAttendanceRate = Math.round((present / attendanceRecords.length) * 100);
  } else if (evaluatedSessionsCount > 0) {
    const rates = [];
    evaluatedSessionsList.forEach(s => {
      const ev = s.session_evaluations[0];
      if (s.num_players && ev.players_present_count !== undefined) {
        rates.push(Math.min(100, Math.round((ev.players_present_count / s.num_players) * 100)));
      }
    });
    if (rates.length > 0) {
      avgAttendanceRate = Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);
    }
  }

  // 1. COBERTURA DETALLADA DE PRINCIPIOS
  const principleStats = {};

  curriculumPrinciples.forEach(cp => {
    principleStats[cp.name] = { count: 0, scores: [], gamePhase: cp.game_phase || 'Modelo de Juego' };
  });

  sessions.forEach(s => {
    const sDate = s.date_time ? new Date(s.date_time).toISOString().split('T')[0] : undefined;
    const evalScore = s.session_evaluations?.[0]?.objective_achievement;
    const sessionPrinciples = [s.objective, ...(s.objectives_secondary || [])].filter(Boolean);

    sessionPrinciples.forEach(pName => {
      if (!principleStats[pName]) {
        principleStats[pName] = { count: 0, scores: [], gamePhase: 'Modelo de Juego' };
      }
      principleStats[pName].count += 1;
      if (sDate) principleStats[pName].lastDate = sDate;
      if (evalScore) principleStats[pName].scores.push(Number(evalScore));
    });
  });

  const principlesCoverage = Object.entries(principleStats).map(([pName, data]) => {
    let classification = 'nunca_trabajado';
    if (data.count >= 8) classification = 'muy_trabajado';
    else if (data.count >= 4) classification = 'trabajado';
    else if (data.count >= 1) classification = 'poco_trabajado';

    const sampleSize = data.scores.length;
    const avgAchievement = sampleSize > 0
      ? Number((data.scores.reduce((a, b) => a + b, 0) / sampleSize).toFixed(2))
      : 0;

    const isLowAchievement = avgAchievement <= METHODOLOGY_RULES.LOW_ACHIEVEMENT_THRESHOLD && sampleSize >= 2;

    let trend = 'insufficient_data';
    if (sampleSize >= METHODOLOGY_RULES.MIN_TREND_OBSERVATIONS) {
      const first = data.scores[0];
      const last = data.scores[data.scores.length - 1];
      const diff = last - first;
      if (diff > 0.4) trend = 'improving';
      else if (diff < -0.4) trend = 'declining';
      else trend = 'stable';
    }

    return {
      principleName: pName,
      gamePhase: data.gamePhase,
      sessionsCount: data.count,
      classification,
      lastSessionDate: data.lastDate,
      avgAchievement,
      sampleSize,
      isLowAchievement,
      trend
    };
  });

  const trainedPrinciplesCount = principlesCoverage.filter(p => p.sessionsCount > 0).length;
  const neverTrainedPrinciplesCount = principlesCoverage.filter(p => p.sessionsCount === 0).length;
  const lowAchievementPrinciplesCount = principlesCoverage.filter(p => p.isLowAchievement).length;
  const modelCoveragePercentage = curriculumPrinciples.length > 0
    ? Math.round((trainedPrinciplesCount / curriculumPrinciples.length) * 100)
    : 0;

  // 2. EVOLUCIÓN DE COMPORTAMIENTOS
  const behaviourMap = {};

  sessions.forEach(s => {
    const sDate = s.date_time || '';
    const behavioursEval = s.session_evaluations?.[0]?.session_behaviour_evaluations || [];
    behavioursEval.forEach(b => {
      const desc = b.behaviour_description || b.description || 'Comportamiento';
      if (!behaviourMap[desc]) {
        behaviourMap[desc] = { scores: [], family: b.game_phase_or_family };
      }
      behaviourMap[desc].scores.push({
        date: sDate,
        sessionId: s.id,
        score: Number(b.score)
      });
    });
  });

  const behaviourEvolution = Object.entries(behaviourMap).map(([desc, bData]) => {
    const sampleSize = bData.scores.length;
    const firstScore = sampleSize > 0 ? bData.scores[0].score : 0;
    const lastScore = sampleSize > 0 ? bData.scores[sampleSize - 1].score : 0;
    const avgScore = sampleSize > 0
      ? Number((bData.scores.reduce((a, b) => a + b.score, 0) / sampleSize).toFixed(2))
      : 0;
    const absoluteVariation = Number((lastScore - firstScore).toFixed(2));
    const percentageVariation = sampleSize >= METHODOLOGY_RULES.MIN_TREND_OBSERVATIONS && firstScore > 0
      ? Number((((lastScore - firstScore) / firstScore) * 100).toFixed(1))
      : null;

    let trend = 'insufficient_data';
    if (sampleSize >= METHODOLOGY_RULES.MIN_TREND_OBSERVATIONS) {
      if (absoluteVariation > 0.4) trend = 'improving';
      else if (absoluteVariation < -0.4) trend = 'declining';
      else trend = 'stable';
    }

    return {
      behaviourDescription: desc,
      gamePhaseOrFamily: bData.family,
      evaluationsCount: sampleSize,
      sampleSize,
      firstScore,
      lastScore,
      avgScore,
      absoluteVariation,
      percentageVariation,
      trend,
      history: bData.scores
    };
  });

  const improvingBehavioursCount = behaviourEvolution.filter(b => b.trend === 'improving').length;
  const stableBehavioursCount = behaviourEvolution.filter(b => b.trend === 'stable').length;
  const decliningBehavioursCount = behaviourEvolution.filter(b => b.trend === 'declining').length;
  const insufficientDataBehavioursCount = behaviourEvolution.filter(b => b.trend === 'insufficient_data').length;

  // 3. EVOLUCIÓN DE CARGA
  const loadEvolution = sessions.map(s => {
    const evalData = s.session_evaluations?.[0];
    const plannedDur = Number(s.duration_minutes) || 90;
    const actualDur = evalData?.actual_duration_min !== undefined ? Number(evalData.actual_duration_min) : plannedDur;
    const actualRpe = evalData?.session_rpe !== undefined ? Number(evalData.session_rpe) : 6;
    const plannedLoad = Number(s.estimated_load) || 50;

    return {
      sessionId: s.id,
      date: s.date_time || '',
      microcycleDay: s.microcycle_day || 'MD-3',
      plannedDuration: plannedDur,
      actualDuration: actualDur,
      durationDeviation: actualDur - plannedDur,
      plannedLoad,
      actualRpe,
      objectiveAchievement: evalData?.objective_achievement
    };
  });

  // 4. PLANIFICADO VS CONSEGUIDO (OBJETIVOS)
  const objectivesProgress = teamObjectives.map(obj => {
    const descLower = (obj.description || '').toLowerCase();
    const relatedSessions = sessions.filter(s => {
      const sObj = (s.objective || '').toLowerCase();
      const sSec = (s.objectives_secondary || []).map(x => x.toLowerCase());
      return sObj.includes(descLower) || descLower.includes(sObj) || sSec.some(x => x.includes(descLower) || descLower.includes(x));
    });

    const plannedSessionsCount = relatedSessions.length;
    const completedRelated = relatedSessions.filter(s => s.is_completed !== false).length;
    const evaluatedRelated = relatedSessions.filter(s => s.session_evaluations && s.session_evaluations.length > 0);
    const evaluatedSessionsCount = evaluatedRelated.length;

    const scores = [];
    evaluatedRelated.forEach(s => {
      const sc = s.session_evaluations[0]?.objective_achievement;
      if (sc) scores.push(Number(sc));
    });

    const avgAchievement = scores.length > 0
      ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2))
      : 0;

    let status = 'insufficient_data';
    let statusReason = "Muestra insuficiente de evaluaciones (N < 3).";

    if (evaluatedSessionsCount >= 3) {
      if (avgAchievement >= 3.2) {
        status = 'achieved';
        statusReason = `Objetivo consolidado: Consecución media ${avgAchievement}/4 en ${evaluatedSessionsCount} sesiones.`;
      } else if (avgAchievement >= 2.3) {
        status = 'progressing';
        statusReason = `En progresión favorable: Consecución media ${avgAchievement}/4 en ${evaluatedSessionsCount} sesiones.`;
      } else {
        status = 'at_risk';
        statusReason = `Atención requerida: Consecución media ${avgAchievement}/4 por debajo del umbral de rendimiento.`;
      }
    }

    return {
      objectiveId: obj.id || `obj-${descLower.slice(0, 10)}`,
      description: obj.description,
      type: obj.objective_type || 'táctico',
      plannedSessionsCount,
      completedSessionsCount: completedRelated,
      evaluatedSessionsCount,
      avgAchievement,
      status,
      statusReason
    };
  });

  // 5. PRIORIDADES Y RESOLUCIÓN
  const resolvedPriorities = [];
  const recurrentPriorities = [];
  const openPriorities = [];

  behaviourEvolution.forEach(b => {
    if (b.sampleSize >= 3 && b.avgScore >= 3.0 && b.lastScore >= 3) {
      resolvedPriorities.push({
        title: `Conducta afianzada: ${b.behaviourDescription}`,
        resolutionEvidence: `Evolución positiva hacia nivel ${b.lastScore}/4 con media de ${b.avgScore}/4 a lo largo de ${b.sampleSize} sesiones evaluadas.`
      });
    } else if (b.sampleSize >= 3 && (b.trend === 'declining' || b.avgScore <= 2.2)) {
      recurrentPriorities.push({
        title: `Refuerzo continuado: ${b.behaviourDescription}`,
        occurrences: b.sampleSize,
        explanation: `Tendencia ${b.trend === 'declining' ? 'descendente' : 'irregular'} (Media ${b.avgScore}/4). Requiere continuidad pedagógica.`
      });
    }
  });

  principlesCoverage.forEach(p => {
    if (p.classification === 'nunca_trabajado') {
      openPriorities.push({
        title: `Principio no iniciado: ${p.principleName}`,
        reason: `0 sesiones registradas en el periodo para este principio del currículo oficial.`
      });
    }
  });

  // 6. CONCLUSIONES DETERMINISTAS
  const conclusions = [];

  if (modelCoveragePercentage >= 70) {
    conclusions.push({
      type: 'strength',
      title: 'Amplia Cobertura del Modelo de Juego',
      evidence: `Se ha trabajado el ${modelCoveragePercentage}% de los principios del currículo (${trainedPrinciplesCount} de ${curriculumPrinciples.length}).`,
      metrics: { modelCoveragePercentage, trainedPrinciplesCount }
    });
  }

  const bestPrinciple = [...principlesCoverage]
    .filter(p => p.sampleSize >= 3)
    .sort((a, b) => b.avgAchievement - a.avgAchievement)[0];

  if (bestPrinciple && bestPrinciple.avgAchievement >= 3.2) {
    conclusions.push({
      type: 'strength',
      title: `Dominio Táctico Destacado: ${bestPrinciple.principleName}`,
      evidence: `Consecución media de ${bestPrinciple.avgAchievement}/4 en ${bestPrinciple.sampleSize} sesiones evaluadas.`,
      metrics: { principle: bestPrinciple.principleName, avgAchievement: bestPrinciple.avgAchievement }
    });
  }

  if (neverTrainedPrinciplesCount > 0) {
    conclusions.push({
      type: 'gap',
      title: `${neverTrainedPrinciplesCount} Principios del Currículo Pendientes de Iniciar`,
      evidence: `Existen contenidos formativos previstos sin ninguna sesión dedicada en la temporada.`,
      metrics: { neverTrainedPrinciplesCount }
    });
  }

  const improvedBehaviour = behaviourEvolution.find(b => b.trend === 'improving' && b.sampleSize >= 3);
  if (improvedBehaviour) {
    conclusions.push({
      type: 'improvement',
      title: `Evolución Positiva: ${improvedBehaviour.behaviourDescription}`,
      evidence: `Crecimiento de ${improvedBehaviour.firstScore} a ${improvedBehaviour.lastScore} (${improvedBehaviour.percentageVariation ? `+${improvedBehaviour.percentageVariation}%` : 'mejora'}) en ${improvedBehaviour.sampleSize} sesiones.`,
      metrics: { behaviour: improvedBehaviour.behaviourDescription, sampleSize: improvedBehaviour.sampleSize }
    });
  }

  const highDeviationSessions = loadEvolution.filter(l => Math.abs(l.durationDeviation) >= 15);
  if (highDeviationSessions.length >= 3) {
    conclusions.push({
      type: 'risk',
      title: 'Patrón Recurrente de Desviación Temporal',
      evidence: `${highDeviationSessions.length} sesiones registraron un desvío superior a 15 minutos respecto a la duración planificada.`,
      metrics: { highDeviationSessionsCount: highDeviationSessions.length }
    });
  }

  // 7. CALIDAD DE DATOS
  const unevaluatedSessionsCount = totalSessions - evaluatedSessionsCount;
  const unevaluatedSessionsPercentage = totalSessions > 0 ? Math.round((unevaluatedSessionsCount / totalSessions) * 100) : 0;
  const notes = [];

  if (totalSessions === 0) {
    notes.push("No se registran sesiones de entrenamiento en el periodo seleccionado.");
  } else if (unevaluatedSessionsCount > 0) {
    notes.push(`${unevaluatedSessionsCount} de ${totalSessions} sesiones (${unevaluatedSessionsPercentage}%) no disponen de evaluación post-sesión.`);
  }
  if (insufficientDataBehavioursCount > 0) {
    notes.push(`${insufficientDataBehavioursCount} comportamientos observables cuentan con muestra insuficiente (N < 3) para establecer tendencia.`);
  }

  const dataQuality = {
    totalSessions,
    unevaluatedSessionsCount,
    unevaluatedSessionsPercentage,
    insufficientDataBehavioursCount,
    unassessedObjectivesCount: objectivesProgress.filter(o => o.status === 'insufficient_data').length,
    notes
  };

  const summary = {
    plannedSessions: totalSessions,
    completedSessions,
    evaluatedSessions: evaluatedSessionsCount,
    evaluationPercentage,
    totalPlannedDurationMin,
    totalActualDurationMin,
    durationDeviationMin,
    avgRpe,
    avgObjectiveAchievement,
    avgAttendanceRate,
    modelCoveragePercentage,
    trainedPrinciplesCount,
    neverTrainedPrinciplesCount,
    lowAchievementPrinciplesCount,
    improvingBehavioursCount,
    stableBehavioursCount,
    decliningBehavioursCount,
    insufficientDataBehavioursCount
  };

  return {
    team,
    season,
    summary,
    objectivesProgress,
    principlesCoverage,
    behaviourEvolution,
    loadEvolution,
    prioritiesAnalysis: {
      resolvedPriorities,
      recurrentPriorities,
      openPriorities
    },
    conclusions,
    dataQuality,
    generatedAt: new Date().toISOString()
  };
}

function getTeamsMethodologyComparisonFromData(teamsReports) {
  return teamsReports.map(report => ({
    teamId: report.team.id,
    teamName: report.team.name,
    category: report.team.category || 'General',
    totalSessions: report.summary.plannedSessions,
    evaluatedSessions: report.summary.evaluatedSessions,
    evaluationPercentage: report.summary.evaluationPercentage,
    modelCoveragePercentage: report.summary.modelCoveragePercentage,
    avgAchievement: report.summary.avgObjectiveAchievement,
    avgRpe: report.summary.avgRpe,
    avgAttendance: report.summary.avgAttendanceRate,
    topStrength: report.conclusions.find(c => c.type === 'strength')?.title,
    topRisk: report.conclusions.find(c => c.type === 'risk')?.title
  }));
}

module.exports = {
  buildSeasonMethodologyReportFromData,
  getTeamsMethodologyComparisonFromData
};
