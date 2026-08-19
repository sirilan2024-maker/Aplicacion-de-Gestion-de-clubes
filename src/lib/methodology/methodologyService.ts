/**
 * Servicio de Planificación, Ejecución, Evaluación e Inteligencia Metodológica v1.0
 * Antigravity Methodology OS
 * Cierre del ciclo completo: Planificar -> Ejecutar -> Evaluar -> Inteligencia Histórica
 */
import { createClient } from "@/lib/supabase/client";

export interface SessionSavePayload {
  id?: string;
  teamId: string;
  seasonId?: string;
  microcycleId?: string;
  dateTime: string;
  durationMinutes: number;
  location?: string;
  ageCategory: string;
  microcycleDay: string;
  intensityLoad: number;
  objective: string;
  objectivesSecondary?: string[];
  numPlayers: number;
  numGoalkeepers?: number;
  availableSpace?: string;
  availableMaterial?: string[];
  estimatedLoad?: number;
  isCompleted?: boolean;
  coachNotes?: string;
  blocks: Record<string, any[]>;
}

export interface BehaviourEvaluationItem {
  id?: string;
  behaviourId?: string;
  behaviourDescription: string;
  gamePhaseOrFamily?: string;
  score: number; // 1-4
  coachNotes?: string;
}

export interface SessionEvaluationPayload {
  sessionId: string;
  clubId?: string;
  actualDurationMin: number;
  sessionRpe: number; // 1-10
  objectiveAchievement: number; // 1-4 (1=No conseguido, 2=Parcial, 3=Conseguido, 4=Superado/Automatizado)
  playersPresentCount: number;
  coachObservations?: string;
  incidentsNotes?: string;
  attendance: { playerId: string; status: 'present' | 'absent' | 'excused' }[];
  behaviours: BehaviourEvaluationItem[];
}

export interface PlannedVsActualComparison {
  sessionId: string;
  plannedDurationMin: number;
  actualDurationMin: number;
  durationDiffMin: number;
  plannedPlayers: number;
  actualPlayers: number;
  playersDiff: number;
  plannedLoad: number; // 1-100
  actualRpe: number; // 1-10
  objective: string;
  objectiveAchievement: number; // 1-4
  behavioursEvaluated: BehaviourEvaluationItem[];
  avgBehaviourScore: number; // 1-4
  coachObservations?: string;
  incidentsNotes?: string;
  deviations: string[];
}

export interface AnalyticsFilters {
  startDate?: string;
  endDate?: string;
  microcycleId?: string;
  mesocycleId?: string;
  principle?: string;
  behaviour?: string;
  microcycleDay?: string;
}

export interface BehaviourEvolutionRecord {
  behaviourDescription: string;
  gamePhaseOrFamily?: string;
  evaluationsCount: number;
  sampleSize: number;
  firstScore: number;
  lastScore: number;
  avgScore: number;
  absoluteVariation: number;
  percentageVariation: number | null; // null si sampleSize < 3
  trend: 'improving' | 'stable' | 'declining' | 'insufficient_data';
  history: { date: string; sessionId: string; score: number }[];
}

export interface PrincipleCoverageSummary {
  mostTrained: { principle: string; count: number; percentage: number; sessions: string[] }[];
  leastTrained: { principle: string; count: number; percentage: number; sessions: string[] }[];
  neverTrained: { principle: string; gamePhase: string }[];
  totalCurriculumPrinciples: number;
  trainedPrinciplesCount: number;
  coveragePercentage: number;
  lowAchievementPrinciples: { principle: string; avgScore: number; count: number }[];
}

export interface SessionLoadEvolutionRecord {
  sessionId: string;
  date: string;
  microcycleDay: string;
  plannedDurationMin: number;
  actualDurationMin: number;
  durationDiffMin: number;
  plannedLoad: number; // 1-100
  actualRpe: number; // 1-10
  rpeEquivalentLoad: number; // 1-100 (actualRpe * 10)
  loadDiff: number;
  isHighFatigueWarning: boolean;
}

export interface TeamMethodologySummary {
  teamId: string;
  totalSessions: number;
  evaluatedSessions: number;
  evaluationRate: number; // %
  avgObjectiveAchievement: number; // 1-4
  avgRpe: number; // 1-10
  avgPlannedDuration: number;
  avgActualDuration: number;
  avgDurationDeviation: number;
  patternsDetected: string[];
  behaviourEvolution: BehaviourEvolutionRecord[];
  principleCoverage: PrincipleCoverageSummary;
  loadEvolution: SessionLoadEvolutionRecord[];
  recentSessions: any[];
}

/**
 * Obtiene los IDs de los ejercicios utilizados en las últimas N sesiones del equipo
 */
export async function getRecentTeamExerciseIds(teamId: string, limitSessions: number = 4): Promise<string[]> {
  if (!teamId) return [];
  const supabase = createClient();

  try {
    const { data: recentSessions } = await supabase
      .from("training_sessions")
      .select("id")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false })
      .limit(limitSessions);

    if (!recentSessions || recentSessions.length === 0) return [];

    const sessionIds = recentSessions.map(s => s.id);
    const { data: drills } = await supabase
      .from("session_drills")
      .select("drill_id")
      .in("session_id", sessionIds);

    if (!drills) return [];
    return drills.map(d => d.drill_id).filter(Boolean);
  } catch (error) {
    console.error("Error fetching recent team exercises:", error);
    return [];
  }
}

/**
 * Guarda una sesión completa con sus bloques y ejercicios en session_drills
 */
export async function saveMethodologySession(payload: SessionSavePayload) {
  const supabase = createClient();

  const { data: sessionData, error: sessionError } = await supabase
    .from("training_sessions")
    .insert({
      team_id: payload.teamId || null,
      season_id: payload.seasonId || null,
      microcycle_id: payload.microcycleId || null,
      date_time: payload.dateTime || null,
      duration_minutes: payload.durationMinutes,
      location: payload.location || null,
      age_category: payload.ageCategory,
      microcycle_day: payload.microcycleDay,
      intensity_load: payload.intensityLoad,
      objective: payload.objective,
      objectives_secondary: payload.objectivesSecondary || [],
      num_players: payload.numPlayers,
      num_goalkeepers: payload.numGoalkeepers || 0,
      available_space: payload.availableSpace || null,
      available_material: payload.availableMaterial || [],
      estimated_load: payload.estimatedLoad || 50,
      is_completed: payload.isCompleted || false,
      coach_notes: payload.coachNotes || payload.objective,
    })
    .select()
    .single();

  if (sessionError) throw sessionError;

  const drillsToInsert: any[] = [];
  let globalOrder = 0;

  Object.keys(payload.blocks).forEach(blockId => {
    payload.blocks[blockId].forEach((ex) => {
      drillsToInsert.push({
        session_id: sessionData.id,
        drill_id: ex.id || ex.drill_id,
        phase: blockId,
        order_index: globalOrder++,
        duration_min: ex.duration_min || 15,
      });
    });
  });

  if (drillsToInsert.length > 0) {
    const { error: drillsError } = await supabase.from("session_drills").insert(drillsToInsert);
    if (drillsError) throw drillsError;
  }

  return sessionData;
}

/**
 * Actualiza una sesión existente y sus session_drills
 */
export async function updateMethodologySession(sessionId: string, payload: SessionSavePayload) {
  const supabase = createClient();

  const { data: sessionData, error: sessionError } = await supabase
    .from("training_sessions")
    .update({
      team_id: payload.teamId || null,
      season_id: payload.seasonId || null,
      microcycle_id: payload.microcycleId || null,
      date_time: payload.dateTime || null,
      duration_minutes: payload.durationMinutes,
      location: payload.location || null,
      age_category: payload.ageCategory,
      microcycle_day: payload.microcycleDay,
      intensity_load: payload.intensityLoad,
      objective: payload.objective,
      objectives_secondary: payload.objectivesSecondary || [],
      num_players: payload.numPlayers,
      num_goalkeepers: payload.numGoalkeepers || 0,
      available_space: payload.availableSpace || null,
      available_material: payload.availableMaterial || [],
      estimated_load: payload.estimatedLoad || 50,
      is_completed: payload.isCompleted || false,
      coach_notes: payload.coachNotes || payload.objective,
    })
    .eq("id", sessionId)
    .select()
    .single();

  if (sessionError) throw sessionError;

  await supabase.from("session_drills").delete().eq("session_id", sessionId);

  const drillsToInsert: any[] = [];
  let globalOrder = 0;

  Object.keys(payload.blocks).forEach(blockId => {
    payload.blocks[blockId].forEach((ex) => {
      drillsToInsert.push({
        session_id: sessionId,
        drill_id: ex.id || ex.drill_id,
        phase: blockId,
        order_index: globalOrder++,
        duration_min: ex.duration_min || 15,
      });
    });
  });

  if (drillsToInsert.length > 0) {
    const { error: drillsError } = await supabase.from("session_drills").insert(drillsToInsert);
    if (drillsError) throw drillsError;
  }

  return sessionData;
}

/**
 * Recupera una sesión completa con sus bloques y ejercicios preservando orden y duración
 */
export async function getMethodologySessionById(sessionId: string) {
  const supabase = createClient();

  const { data: session, error: sessionError } = await supabase
    .from("training_sessions")
    .select(`
      *,
      teams ( id, name, category ),
      session_drills (
        id,
        drill_id,
        phase,
        order_index,
        duration_min,
        banco_ejercicios (
          id,
          nombre,
          tipo,
          familia,
          fuente,
          descripcion,
          organizacion,
          distribucion_inicial,
          desarrollo,
          rotaciones,
          puntuacion,
          intervenciones,
          correcciones,
          objetivo_tecnico,
          objetivo_tactico,
          categoria_edad,
          age_category,
          dificultad,
          duracion_recomendada,
          min_players,
          max_players,
          material,
          variantes,
          tags,
          bloque_sesion,
          carga_fisica,
          carga_cognitiva,
          oposicion,
          representatividad,
          intensity_level,
          game_phase,
          drill_structure,
          espacio,
          criterios_exito,
          progresion_descripcion,
          regresion_descripcion
        )
      )
    `)
    .eq("id", sessionId)
    .single();

  if (sessionError) throw sessionError;
  if (!session) return null;

  const blocks: Record<string, any[]> = {
    activacion: [],
    principal_1: [],
    principal_2: [],
    global: [],
    vuelta_calma: []
  };

  const phaseMap: Record<string, string> = {
    warmup: "activacion",
    main_1: "principal_1",
    main_2: "principal_2",
    cooldown: "vuelta_calma",
    activacion: "activacion",
    principal_1: "principal_1",
    principal_2: "principal_2",
    global: "global",
    vuelta_calma: "vuelta_calma"
  };

  const drills = (session.session_drills || []).sort((a: any, b: any) => a.order_index - b.order_index);

  drills.forEach((drill: any) => {
    const rawPhase = drill.phase || "principal_1";
    const targetBlock = phaseMap[rawPhase] || "principal_1";
    
    if (drill.banco_ejercicios) {
      blocks[targetBlock].push({
        ...drill.banco_ejercicios,
        unique_id: `${drill.id}-${drill.drill_id}`,
        drill_id: drill.drill_id,
        duration_min: drill.duration_min || drill.banco_ejercicios.duracion_recomendada || 15,
        order_index: drill.order_index
      });
    }
  });

  return {
    ...session,
    blocks
  };
}

/**
 * Guarda la evaluación de una sesión (asistencia, RPE, consecución y comportamientos)
 */
export async function saveSessionEvaluation(payload: SessionEvaluationPayload) {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();

  let clubId = payload.clubId;
  if (!clubId && userData.user) {
    const { data: profile } = await supabase.from("profiles").select("club_id").eq("id", userData.user.id).single();
    clubId = profile?.club_id;
  }

  // 1. Upsert session_evaluations
  const { data: evalData, error: evalError } = await supabase
    .from("session_evaluations")
    .upsert({
      session_id: payload.sessionId,
      club_id: clubId,
      evaluator_id: userData.user?.id || null,
      actual_duration_min: payload.actualDurationMin,
      session_rpe: payload.sessionRpe,
      objective_achievement: payload.objectiveAchievement,
      players_present_count: payload.playersPresentCount,
      coach_observations: payload.coachObservations || null,
      incidents_notes: payload.incidentsNotes || null,
      updated_at: new Date().toISOString()
    }, { onConflict: "session_id" })
    .select()
    .single();

  if (evalError) throw evalError;

  // 2. Guardar comportamientos valorados
  if (payload.behaviours && payload.behaviours.length > 0) {
    await supabase.from("session_behaviour_evaluations").delete().eq("session_evaluation_id", evalData.id);
    
    const behavsToInsert = payload.behaviours.map(b => ({
      session_evaluation_id: evalData.id,
      behaviour_id: b.behaviourId || null,
      behaviour_description: b.behaviourDescription,
      game_phase_or_family: b.gamePhaseOrFamily || null,
      score: b.score,
      coach_notes: b.coachNotes || null
    }));

    const { error: behavError } = await supabase.from("session_behaviour_evaluations").insert(behavsToInsert);
    if (behavError) throw behavError;
  }

  // 3. Guardar o actualizar asistencia
  if (payload.attendance && payload.attendance.length > 0) {
    const attendanceRecords = payload.attendance.map(a => ({
      session_id: payload.sessionId,
      player_id: a.playerId,
      status: a.status
    }));

    await supabase.from("attendance").upsert(attendanceRecords, { onConflict: "session_id,player_id" });
  }

  // 4. Marcar sesión como completada
  await supabase.from("training_sessions").update({ is_completed: true }).eq("id", payload.sessionId);

  return evalData;
}

/**
 * Recupera la evaluación de una sesión
 */
export async function getSessionEvaluation(sessionId: string) {
  const supabase = createClient();

  const [evalRes, attendanceRes] = await Promise.all([
    supabase
      .from("session_evaluations")
      .select(`
        *,
        session_behaviour_evaluations (*)
      `)
      .eq("session_id", sessionId)
      .maybeSingle(),

    supabase
      .from("attendance")
      .select("*, players(id, first_name, last_name, dorsal, position)")
      .eq("session_id", sessionId)
  ]);

  if (evalRes.error) throw evalRes.error;

  return {
    evaluation: evalRes.data || null,
    attendance: attendanceRes.data || []
  };
}

/**
 * Genera la comparativa Planificado vs Ejecutado
 */
export function buildPlannedVsActualComparison(session: any, evaluation: any): PlannedVsActualComparison {
  const plannedDuration = session?.duration_minutes || 90;
  const actualDuration = evaluation?.actual_duration_min || plannedDuration;
  const durationDiff = actualDuration - plannedDuration;

  const plannedPlayers = session?.num_players || 16;
  const actualPlayers = evaluation?.players_present_count || plannedPlayers;
  const playersDiff = actualPlayers - plannedPlayers;

  const plannedLoad = session?.estimated_load || 50;
  const actualRpe = evaluation?.session_rpe || 6;

  const objective = session?.objective || session?.coach_notes || "Objetivo de sesión";
  const objectiveAchievement = evaluation?.objective_achievement || 3;

  const rawBehaviours: any[] = evaluation?.session_behaviour_evaluations || [];
  const behavioursEvaluated: BehaviourEvaluationItem[] = rawBehaviours.map(b => ({
    id: b.id,
    behaviourId: b.behaviour_id,
    behaviourDescription: b.behaviour_description,
    gamePhaseOrFamily: b.game_phase_or_family,
    score: b.score,
    coachNotes: b.coach_notes
  }));

  const avgBehaviourScore = behavioursEvaluated.length > 0
    ? Number((behavioursEvaluated.reduce((sum, b) => sum + b.score, 0) / behavioursEvaluated.length).toFixed(1))
    : objectiveAchievement;

  const deviations: string[] = [];
  if (Math.abs(durationDiff) > 10) {
    deviations.push(`Desviación de tiempo: ${durationDiff > 0 ? `+${durationDiff}` : durationDiff} min sobre lo planificado.`);
  }
  if (Math.abs(playersDiff) >= 3) {
    deviations.push(`Desviación de asistencia: ${playersDiff > 0 ? `+${playersDiff}` : playersDiff} jugadores presentes.`);
  }
  if (actualRpe >= 8 && session?.microcycle_day === 'MD-1') {
    deviations.push("Alerta de carga: RPE elevado (fatiga) en día previo a partido (MD-1).");
  }
  if (objectiveAchievement <= 2) {
    deviations.push("Alerta metodológica: Objetivo principal conseguido parcialmente o no alcanzado.");
  }

  return {
    sessionId: session?.id,
    plannedDurationMin: plannedDuration,
    actualDurationMin: actualDuration,
    durationDiffMin: durationDiff,
    plannedPlayers,
    actualPlayers,
    playersDiff,
    plannedLoad,
    actualRpe,
    objective,
    objectiveAchievement,
    behavioursEvaluated,
    avgBehaviourScore,
    coachObservations: evaluation?.coach_observations,
    incidentsNotes: evaluation?.incidents_notes,
    deviations
  };
}

/**
 * Consulta el histórico metodológico completo de un equipo aplicando filtros
 */
export async function getTeamMethodologyHistory(teamId: string, filters: AnalyticsFilters = {}) {
  const supabase = createClient();

  let query = supabase
    .from("training_sessions")
    .select(`
      id,
      team_id,
      season_id,
      microcycle_id,
      date_time,
      duration_minutes,
      age_category,
      microcycle_day,
      intensity_load,
      objective,
      objectives_secondary,
      num_players,
      estimated_load,
      is_completed,
      session_drills (
        id,
        drill_id,
        phase,
        order_index,
        duration_min,
        banco_ejercicios (
          id,
          nombre,
          familia,
          game_phase,
          objetivo_tactico,
          objetivo_tecnico
        )
      ),
      session_evaluations (
        id,
        actual_duration_min,
        session_rpe,
        objective_achievement,
        players_present_count,
        coach_observations,
        incidents_notes,
        created_at,
        session_behaviour_evaluations (
          id,
          behaviour_id,
          behaviour_description,
          game_phase_or_family,
          score,
          coach_notes
        )
      )
    `)
    .eq("team_id", teamId)
    .order("date_time", { ascending: true });

  if (filters.startDate) {
    query = query.gte("date_time", filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte("date_time", filters.endDate);
  }
  if (filters.microcycleId) {
    query = query.eq("microcycle_id", filters.microcycleId);
  }
  if (filters.microcycleDay) {
    query = query.eq("microcycle_day", filters.microcycleDay);
  }

  const { data: rawSessions, error } = await query.limit(200);
  if (error) {
    console.error("Error fetching team methodology history:", error);
    return [];
  }

  let filtered = rawSessions || [];

  if (filters.principle) {
    const pTarget = filters.principle.toLowerCase();
    filtered = filtered.filter(s => {
      const mainObj = (s.objective || "").toLowerCase();
      const secObj = (s.objectives_secondary || []).map((so: string) => so.toLowerCase());
      const drillObjs = (s.session_drills || []).flatMap((d: any) => d.banco_ejercicios?.objetivo_tactico || []).map((to: string) => to.toLowerCase());
      return mainObj.includes(pTarget) || secObj.some((so: string) => so.includes(pTarget)) || drillObjs.some((to: string) => to.includes(pTarget));
    });
  }

  if (filters.behaviour) {
    const bTarget = filters.behaviour.toLowerCase();
    filtered = filtered.filter(s => {
      const se = s.session_evaluations?.[0];
      const behavs = (se?.session_behaviour_evaluations || []).map((b: any) => (b.behaviour_description || "").toLowerCase());
      return behavs.some((b: string) => b.includes(bTarget));
    });
  }

  return filtered;
}

/**
 * Calcula la evolución temporal y tendencias estadísticas de los comportamientos observables
 */
export async function getBehaviourEvolution(teamId: string, filters: AnalyticsFilters = {}): Promise<BehaviourEvolutionRecord[]> {
  const sessions = await getTeamMethodologyHistory(teamId, filters);
  const behaviourMap: Record<string, {
    family?: string;
    history: { date: string; sessionId: string; score: number }[];
  }> = {};

  sessions.forEach(s => {
    const evaluation = s.session_evaluations?.[0];
    if (evaluation && evaluation.session_behaviour_evaluations) {
      const sessionDate = s.date_time ? s.date_time.split("T")[0] : "Fecha desconocida";
      evaluation.session_behaviour_evaluations.forEach((b: any) => {
        const desc = b.behaviour_description;
        if (desc) {
          if (!behaviourMap[desc]) {
            behaviourMap[desc] = {
              family: b.game_phase_or_family,
              history: []
            };
          }
          behaviourMap[desc].history.push({
            date: sessionDate,
            sessionId: s.id,
            score: b.score
          });
        }
      });
    }
  });

  const records: BehaviourEvolutionRecord[] = Object.entries(behaviourMap).map(([desc, data]) => {
    const N = data.history.length;
    const scores = data.history.map(h => h.score);
    const avgScore = N > 0 ? Number((scores.reduce((a, b) => a + b, 0) / N).toFixed(2)) : 0;
    const firstScore = N > 0 ? scores[0] : 0;
    const lastScore = N > 0 ? scores[N - 1] : 0;
    const absoluteVariation = Number((lastScore - firstScore).toFixed(2));

    let trend: 'improving' | 'stable' | 'declining' | 'insufficient_data' = 'insufficient_data';
    let percentageVariation: number | null = null;

    // Regla estadística: solo calcular tendencia y % si N >= 3
    if (N >= 3) {
      if (firstScore > 0) {
        percentageVariation = Number((((lastScore - firstScore) / firstScore) * 100).toFixed(1));
      }
      if (absoluteVariation >= 0.4) {
        trend = 'improving';
      } else if (absoluteVariation <= -0.4) {
        trend = 'declining';
      } else {
        trend = 'stable';
      }
    }

    return {
      behaviourDescription: desc,
      gamePhaseOrFamily: data.family,
      evaluationsCount: N,
      sampleSize: N,
      firstScore,
      lastScore,
      avgScore,
      absoluteVariation,
      percentageVariation,
      trend,
      history: data.history
    };
  });

  return records.sort((a, b) => b.evaluationsCount - a.evaluationsCount);
}

/**
 * Diagnóstico de cobertura metodológica (Principios trabajados, no trabajados y baja consecución)
 */
export async function getPrincipleCoverage(teamId: string, filters: AnalyticsFilters = {}): Promise<PrincipleCoverageSummary> {
  const supabase = createClient();
  const sessions = await getTeamMethodologyHistory(teamId, filters);

  // Obtener la categoría del equipo y el currículo de principios
  const { data: team } = await supabase.from("teams").select("id, club_id, category").eq("id", teamId).single();
  
  let curriculumPrinciples: any[] = [];
  if (team?.club_id) {
    const { data: principlesData } = await supabase
      .from("methodology_principles")
      .select("id, name, game_phase")
      .eq("club_id", team.club_id);
    curriculumPrinciples = principlesData || [];
  }

  const principleUsage: Record<string, { count: number; sessions: string[]; scores: number[] }> = {};

  sessions.forEach(s => {
    const sessionObj = s.objective;
    const evalScore = s.session_evaluations?.[0]?.objective_achievement;

    if (sessionObj) {
      if (!principleUsage[sessionObj]) {
        principleUsage[sessionObj] = { count: 0, sessions: [], scores: [] };
      }
      principleUsage[sessionObj].count += 1;
      principleUsage[sessionObj].sessions.push(s.id);
      if (evalScore) principleUsage[sessionObj].scores.push(evalScore);
    }

    (s.objectives_secondary || []).forEach((sec: string) => {
      if (!principleUsage[sec]) {
        principleUsage[sec] = { count: 0, sessions: [], scores: [] };
      }
      principleUsage[sec].count += 1;
      principleUsage[sec].sessions.push(s.id);
      if (evalScore) principleUsage[sec].scores.push(evalScore);
    });
  });

  const totalSessionsCount = Math.max(1, sessions.length);

  const usageEntries = Object.entries(principleUsage).map(([name, data]) => ({
    principle: name,
    count: data.count,
    percentage: Number(((data.count / totalSessionsCount) * 100).toFixed(1)),
    sessions: data.sessions,
    avgScore: data.scores.length > 0 ? Number((data.scores.reduce((a, b) => a + b, 0) / data.scores.length).toFixed(1)) : 3
  }));

  usageEntries.sort((a, b) => b.count - a.count);

  const mostTrained = usageEntries.slice(0, 5);
  const leastTrained = usageEntries.slice(-5).reverse();

  // Detectar principios del modelo NUNCA trabajados en el periodo
  const trainedNamesSet = new Set(Object.keys(principleUsage).map(k => k.toLowerCase()));
  const neverTrained: { principle: string; gamePhase: string }[] = [];

  curriculumPrinciples.forEach(p => {
    if (!trainedNamesSet.has(p.name.toLowerCase())) {
      neverTrained.push({
        principle: p.name,
        gamePhase: p.game_phase || "Modelo General"
      });
    }
  });

  // Detectar principios trabajados con BAJA CONSECUCIÓN (avgScore <= 2)
  const lowAchievementPrinciples = usageEntries
    .filter(u => u.count >= 1 && u.avgScore <= 2.2)
    .map(u => ({ principle: u.principle, avgScore: u.avgScore, count: u.count }));

  const totalCurr = curriculumPrinciples.length || Math.max(usageEntries.length, 1);
  const trainedCount = usageEntries.length;
  const coveragePercentage = Number(((trainedCount / totalCurr) * 100).toFixed(1));

  return {
    mostTrained,
    leastTrained,
    neverTrained,
    totalCurriculumPrinciples: totalCurr,
    trainedPrinciplesCount: trainedCount,
    coveragePercentage,
    lowAchievementPrinciples
  };
}

/**
 * Evolución temporal de Carga Metodológica Planificada vs RPE Real
 */
export async function getSessionLoadEvolution(teamId: string, filters: AnalyticsFilters = {}): Promise<SessionLoadEvolutionRecord[]> {
  const sessions = await getTeamMethodologyHistory(teamId, filters);

  return sessions.map(s => {
    const evaluation = s.session_evaluations?.[0];
    const plannedDuration = s.duration_minutes || 90;
    const actualDuration = evaluation?.actual_duration_min || plannedDuration;
    const durationDiff = actualDuration - plannedDuration;

    const plannedLoad = s.estimated_load || 50;
    const actualRpe = evaluation?.session_rpe || 6;
    const rpeEquivalentLoad = actualRpe * 10; // Escala 1-10 a 1-100
    const loadDiff = rpeEquivalentLoad - plannedLoad;

    const isHighFatigueWarning = (actualRpe >= 8 && s.microcycle_day === 'MD-1') || (actualRpe >= 9);

    return {
      sessionId: s.id,
      date: s.date_time ? s.date_time.split("T")[0] : "Sin fecha",
      microcycleDay: s.microcycle_day || "MD-3",
      plannedDurationMin: plannedDuration,
      actualDurationMin: actualDuration,
      durationDiffMin: durationDiff,
      plannedLoad,
      actualRpe,
      rpeEquivalentLoad,
      loadDiff,
      isHighFatigueWarning
    };
  });
}

/**
 * Resumen consolidado de inteligencia metodológica para el perfil del equipo
 */
export async function getTeamMethodologySummary(teamId: string, filters: AnalyticsFilters = {}): Promise<TeamMethodologySummary> {
  const [sessions, behaviourEvolution, principleCoverage, loadEvolution] = await Promise.all([
    getTeamMethodologyHistory(teamId, filters),
    getBehaviourEvolution(teamId, filters),
    getPrincipleCoverage(teamId, filters),
    getSessionLoadEvolution(teamId, filters)
  ]);

  const totalSessions = sessions.length;
  const evaluatedSessionsList = sessions.filter(s => s.session_evaluations && s.session_evaluations.length > 0);
  const evaluatedSessions = evaluatedSessionsList.length;
  const evaluationRate = totalSessions > 0 ? Number(((evaluatedSessions / totalSessions) * 100).toFixed(1)) : 0;

  let sumObj = 0;
  let sumRpe = 0;
  let sumPlannedDur = 0;
  let sumActualDur = 0;

  sessions.forEach(s => {
    sumPlannedDur += (s.duration_minutes || 90);
    const ev = s.session_evaluations?.[0];
    if (ev) {
      sumObj += (ev.objective_achievement || 3);
      sumRpe += (ev.session_rpe || 6);
      sumActualDur += (ev.actual_duration_min || s.duration_minutes || 90);
    } else {
      sumActualDur += (s.duration_minutes || 90);
    }
  });

  const avgObjectiveAchievement = evaluatedSessions > 0 ? Number((sumObj / evaluatedSessions).toFixed(1)) : 3.0;
  const avgRpe = evaluatedSessions > 0 ? Number((sumRpe / evaluatedSessions).toFixed(1)) : 6.0;
  const avgPlannedDuration = totalSessions > 0 ? Math.round(sumPlannedDur / totalSessions) : 90;
  const avgActualDuration = totalSessions > 0 ? Math.round(sumActualDur / totalSessions) : 90;
  const avgDurationDeviation = avgActualDuration - avgPlannedDuration;

  // Detección determinista de patrones
  const patternsDetected: string[] = [];

  const highRpeSessions = loadEvolution.filter(l => l.isHighFatigueWarning).length;
  if (highRpeSessions >= 2) {
    patternsDetected.push(`Alerta de Fatiga: ${highRpeSessions} sesiones con RPE crítico o fatiga en víspera de partido.`);
  }

  const durationDeviationsCount = loadEvolution.filter(l => Math.abs(l.durationDiffMin) >= 15).length;
  if (totalSessions > 0 && (durationDeviationsCount / totalSessions) >= 0.3) {
    patternsDetected.push(`Desviación Recurrente de Tiempo: el ${Math.round((durationDeviationsCount / totalSessions) * 100)}% de las sesiones desvía más de 15 min.`);
  }

  if (principleCoverage.neverTrained.length >= 3) {
    patternsDetected.push(`Déficit de Cobertura: ${principleCoverage.neverTrained.length} principios del modelo aún no han sido planificados.`);
  }

  if (principleCoverage.lowAchievementPrinciples.length > 0) {
    patternsDetected.push(`Foco Metodológico: ${principleCoverage.lowAchievementPrinciples.length} principios presentan baja consecución media.`);
  }

  return {
    teamId,
    totalSessions,
    evaluatedSessions,
    evaluationRate,
    avgObjectiveAchievement,
    avgRpe,
    avgPlannedDuration,
    avgActualDuration,
    avgDurationDeviation,
    patternsDetected,
    behaviourEvolution,
    principleCoverage,
    loadEvolution,
    recentSessions: sessions.slice(-6).reverse()
  };
}

/**
 * Consulta métricas metodológicas agregadas de un jugador (asistencia y minutos)
 */
export async function getPlayerMethodologyMetrics(playerId: string) {
  const supabase = createClient();

  const [attRes, objRes] = await Promise.all([
    supabase
      .from("attendance")
      .select(`
        id,
        status,
        session_id,
        training_sessions (
          duration_minutes,
          date_time
        )
      `)
      .eq("player_id", playerId),

    supabase
      .from("player_objectives")
      .select("id, status, objective_type, description")
      .eq("player_id", playerId)
  ]);

  const attendances = attRes.data || [];
  const totalSessions = attendances.length;
  const presentSessions = attendances.filter(a => a.status === 'present').length;
  const attendanceRate = totalSessions > 0 ? Number(((presentSessions / totalSessions) * 100).toFixed(1)) : 100;

  const totalMinutes = attendances
    .filter(a => a.status === 'present')
    .reduce((sum: number, a: any) => sum + (a.training_sessions?.duration_minutes || 90), 0);

  const objectives = objRes.data || [];
  const completedObjectives = objectives.filter(o => o.status === 'conseguido').length;

  return {
    totalSessions,
    presentSessions,
    attendanceRate,
    totalMinutes,
    totalObjectives: objectives.length,
    completedObjectives
  };
}

/**
 * Obtiene analíticas metodológicas globales y KPIs de evaluación para el Dashboard
 */
export async function getMethodologyAnalytics(clubId: string) {
  const supabase = createClient();

  try {
    const [sessionsRes, evaluationsRes] = await Promise.all([
      supabase
        .from("training_sessions")
        .select(`
          id,
          date_time,
          objective,
          objectives_secondary,
          age_category,
          estimated_load,
          session_drills (
            duration_min,
            banco_ejercicios (
              id,
              nombre,
              familia,
              objetivo_tactico,
              objetivo_tecnico,
              carga_fisica,
              carga_cognitiva
            )
          )
        `)
        .order("created_at", { ascending: false })
        .limit(30),

      supabase
        .from("session_evaluations")
        .select(`
          id,
          session_id,
          actual_duration_min,
          session_rpe,
          objective_achievement,
          players_present_count,
          created_at,
          session_behaviour_evaluations (
            behaviour_description,
            game_phase_or_family,
            score
          )
        `)
        .order("created_at", { ascending: false })
        .limit(30)
    ]);

    const sessions = sessionsRes.data || [];
    const evaluations = evaluationsRes.data || [];

    const principlesCount: Record<string, number> = {};
    const exercisesUsage: Record<string, { count: number; name: string }> = {};

    sessions.forEach(s => {
      if (s.objective) {
        principlesCount[s.objective] = (principlesCount[s.objective] || 0) + 2;
      }
      (s.objectives_secondary || []).forEach((sec: string) => {
        principlesCount[sec] = (principlesCount[sec] || 0) + 1;
      });

      (s.session_drills || []).forEach((sd: any) => {
        const ex = sd.banco_ejercicios;
        if (ex) {
          exercisesUsage[ex.id] = {
            count: (exercisesUsage[ex.id]?.count || 0) + 1,
            name: ex.nombre
          };
          (ex.objetivo_tactico || []).forEach((t: string) => {
            principlesCount[t] = (principlesCount[t] || 0) + 1;
          });
        }
      });
    });

    let avgObjectiveAchievement = 0;
    let avgRpe = 0;
    const behaviourScores: Record<string, { sum: number; count: number }> = {};

    if (evaluations.length > 0) {
      const sumAch = evaluations.reduce((sum, e) => sum + (e.objective_achievement || 3), 0);
      const sumRpe = evaluations.reduce((sum, e) => sum + (e.session_rpe || 6), 0);
      avgObjectiveAchievement = Number((sumAch / evaluations.length).toFixed(1));
      avgRpe = Number((sumRpe / evaluations.length).toFixed(1));

      evaluations.forEach(e => {
        (e.session_behaviour_evaluations || []).forEach((be: any) => {
          if (be.behaviour_description) {
            if (!behaviourScores[be.behaviour_description]) {
              behaviourScores[be.behaviour_description] = { sum: 0, count: 0 };
            }
            behaviourScores[be.behaviour_description].sum += be.score;
            behaviourScores[be.behaviour_description].count += 1;
          }
        });
      });
    }

    const behaviourAverages = Object.entries(behaviourScores).map(([desc, stat]) => ({
      description: desc,
      avgScore: Number((stat.sum / stat.count).toFixed(1)),
      count: stat.count
    }));

    behaviourAverages.sort((a, b) => b.avgScore - a.avgScore);
    const topBehaviours = behaviourAverages.slice(0, 5);
    const lowBehaviours = behaviourAverages.slice(-5).reverse();

    const sortedPrinciples = Object.entries(principlesCount).sort((a, b) => b[1] - a[1]);

    return {
      totalSessionsAnalyzed: sessions.length,
      totalEvaluations: evaluations.length,
      avgObjectiveAchievement,
      avgRpe,
      topBehaviours,
      lowBehaviours,
      topPrinciples: sortedPrinciples.slice(0, 5),
      lowPrinciples: sortedPrinciples.slice(-5).reverse(),
      mostUsedExercises: Object.values(exercisesUsage).sort((a, b) => b.count - a.count).slice(0, 5)
    };
  } catch (error) {
    console.error("Error calculating methodology analytics:", error);
    return null;
  }
}
