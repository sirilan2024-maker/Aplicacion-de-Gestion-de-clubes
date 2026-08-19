/**
 * Servicio de Memoria Metodológica Longitudinal Determinista v1.0 (JS & TS)
 * Antigravity Methodology OS - Fase 5.5
 */

const { calculateMethodologyPriorities } = require("./methodologyPriorityEngine");

function calculateLongitudinalMemory(params) {
  const { team, season, sessions = [], curriculumPrinciples = [] } = params;

  if (!team || !team.id) {
    throw new Error("Parámetros obligatorios incompletos: se requiere el equipo.");
  }

  // Ordenar cronológicamente de forma determinista
  const sortedSessions = [...sessions].sort((a, b) => 
    new Date(a.date_time || a.dateTime).getTime() - new Date(b.date_time || b.dateTime).getTime()
  );

  const evaluatedSessions = sortedSessions.filter(s => 
    s.session_evaluations && s.session_evaluations.length > 0 && typeof s.session_evaluations[0].objective_achievement === 'number'
  );

  const sampleSize = evaluatedSessions.length;
  const isInsufficient = sampleSize < 3;

  // 1. Evolución de Consecución, RPE y Duración
  const sessionTrajectory = evaluatedSessions.map(s => {
    const ev = s.session_evaluations[0];
    const plannedDur = s.duration_minutes || s.plannedDurationMin || 90;
    const actualDur = ev.actual_duration_min || ev.actualDurationMin || plannedDur;
    return {
      sessionId: s.id,
      dateStr: s.date_time || s.dateTime,
      microcycleDay: s.microcycle_day || s.microcycleDay || 'MD-3',
      objective: s.objective || 'Sin objetivo',
      achievement: Number(ev.objective_achievement || ev.objectiveAchievement || 0),
      rpe: Number(ev.session_rpe || ev.sessionRpe || 0),
      plannedDurationMin: plannedDur,
      actualDurationMin: actualDur,
      durationDevMin: actualDur - plannedDur
    };
  });

  const avgAchievement = sampleSize > 0 
    ? Number((sessionTrajectory.reduce((sum, s) => sum + s.achievement, 0) / sampleSize).toFixed(2))
    : 0;

  const avgRpe = sampleSize > 0 
    ? Number((sessionTrajectory.reduce((sum, s) => sum + s.rpe, 0) / sampleSize).toFixed(1))
    : 0;

  // 2. Evolución y Persistencia de Prioridades
  // Segmentar en ventanas temporales (primera mitad vs segunda mitad de temporada)
  const midpoint = Math.floor(sortedSessions.length / 2);
  const earlySessions = sortedSessions.slice(0, midpoint > 0 ? midpoint : 1);
  const recentSessions = sortedSessions;

  const earlyPriorities = calculateMethodologyPriorities({
    curriculumPrinciples,
    recentSessions: earlySessions
  });

  const currentPriorities = calculateMethodologyPriorities({
    curriculumPrinciples,
    recentSessions: recentSessions
  });

  const earlyMap = new Map(earlyPriorities.map(p => [p.id, p]));
  const currentMap = new Map(currentPriorities.map(p => [p.id, p]));

  const persistentPriorities = [];
  const resolvedPriorities = [];
  const newPriorities = [];
  const aggravatedPriorities = [];

  currentPriorities.forEach(curr => {
    const prev = earlyMap.get(curr.id);
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

  earlyPriorities.forEach(prev => {
    if (!currentMap.has(prev.id)) {
      resolvedPriorities.push(prev);
    }
  });

  // 3. Principios con Déficit Persistente (No trabajados en > 21 días)
  const workedPrinciplesLastDate = {};
  sortedSessions.forEach(s => {
    const sDate = new Date(s.date_time || s.dateTime);
    const pList = [s.objective, ...(s.objectives_secondary || [])].filter(Boolean);
    pList.forEach(p => {
      if (!workedPrinciplesLastDate[p] || sDate > workedPrinciplesLastDate[p]) {
        workedPrinciplesLastDate[p] = sDate;
      }
    });
  });

  const now = new Date();
  const persistentDeficitPrinciples = curriculumPrinciples.filter(cp => {
    const lastDate = workedPrinciplesLastDate[cp.name];
    if (!lastDate) return true; // Nunca trabajado
    const diffDays = Math.round((now.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
    return diffDays > 21;
  }).map(cp => cp.name);

  // 4. Cobertura del Currículo
  const uniqueWorked = Object.keys(workedPrinciplesLastDate).length;
  const modelCoveragePercentage = curriculumPrinciples.length > 0
    ? Math.min(100, Math.round((uniqueWorked / curriculumPrinciples.length) * 100))
    : (sampleSize > 0 ? 75 : 0);

  return {
    teamId: team.id,
    teamName: team.name,
    category: team.category,
    sampleSize,
    dataSufficiency: {
      sufficient: !isInsufficient,
      sampleSize,
      notice: isInsufficient ? "N < 3: Muestra estadística reducida para deducciones longitudinales." : undefined
    },
    metrics: {
      avgAchievement,
      avgRpe,
      modelCoveragePercentage,
      totalSessions: sortedSessions.length,
      evaluatedSessions: sampleSize,
      evaluationRate: sortedSessions.length > 0 ? Math.round((sampleSize / sortedSessions.length) * 100) : 0
    },
    trajectory: sessionTrajectory,
    prioritiesEvolution: {
      currentPriorities,
      persistentPriorities,
      resolvedPriorities,
      newPriorities,
      aggravatedPriorities,
      persistentDeficitPrinciples
    }
  };
}

module.exports = {
  calculateLongitudinalMemory
};
