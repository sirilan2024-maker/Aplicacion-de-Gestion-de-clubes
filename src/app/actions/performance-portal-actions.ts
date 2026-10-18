'use server';

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedContext, canUserAccessPlayer } from "@/lib/auth-helpers";
import {
  aggregatePlayerMultiTeamWorkload,
  calculateTrainingLoad,
  isConfirmedAttendanceStatus,
  isTrainingSessionEligible,
  resolveOfficialMatchMinutes,
  SessionWorkloadEntryInput
} from "@/lib/performance/minutes-service";

export interface PersonalPerformanceData {
  player: {
    id: string;
    first_name: string;
    last_name: string;
    dorsal: number | null;
    avatar_url: string | null;
    posicion: string | null;
    team_id: string | null;
    team_name?: string;
    team_category?: string;
  };
  summary: {
    totalTrainingSessions: number;
    trainingAttendancePct: number;
    totalTrainingMinutes: number;
    avgRpe: number | null;
    acwrRatio: number | null;
    totalMatchesPlayed: number;
    totalMatchMinutes: number;
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
  };
  recentSessions: {
    eventId: string;
    date: string;
    title: string;
    attendanceStatus: string;
    attendanceNotes?: string;
    rpe: number | null;
    minutes: number | null;
    load: number | null;
  }[];
  recentMatches: {
    matchId: string;
    date: string;
    rivalName: string;
    isStarter: boolean;
    minutes: number | null;
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
  }[];
}

/**
 * Obtiene de forma segura y autorizada los datos de rendimiento personal para el propio jugador
 * o para su tutor legal vinculado, asegurando aislamiento de temporadas y de otros jugadores.
 */
export async function getPersonalPerformanceAction(
  targetPlayerId: string
): Promise<{ success: boolean; data?: PersonalPerformanceData; error?: string }> {
  try {
    if (!targetPlayerId || typeof targetPlayerId !== 'string' || targetPlayerId.trim() === '') {
      return { success: false, error: 'Identificador de jugador no válido' };
    }

    const { context, error: authError } = await getAuthenticatedContext();
    if (!context || authError) {
      return { success: false, error: authError || 'No autenticado' };
    }

    const adminClient = createAdminClient();

    // Verificación estricta de autorización mediante canUserAccessPlayer
    const access = await canUserAccessPlayer(adminClient, context, targetPlayerId);
    if (!access.allowed || !access.player || access.player.club_id !== context.profile.club_id) {
      return { 
        success: false, 
        error: access.reason || 'No estás autorizado para consultar el rendimiento de este jugador' 
      };
    }

    const playerRecord = access.player;
    const clubId = playerRecord.club_id;
    const teamId = playerRecord.team_id;

    // 1. Obtener detalles básicos del jugador y su equipo
    const { data: fullPlayer, error: pError } = await adminClient
      .from('players')
      .select('id, first_name, last_name, dorsal, avatar_url, posicion, team_id, teams(name, category)')
      .eq('id', targetPlayerId)
      .single();

    if (pError || !fullPlayer) {
      return { success: false, error: 'No se pudo cargar la información del jugador' };
    }

    // 2. Determinar la temporada activa del club para garantizar aislamiento
    const { data: activeSeason } = await adminClient
      .from('seasons')
      .select('id')
      .eq('club_id', clubId)
      .eq('is_active', true)
      .maybeSingle();

    const activeSeasonId = activeSeason?.id || null;

    // 3. Consultar convocatorias y partidos oficiales (estricta exclusión de temporada archivada 25/26)
    let convsQuery = adminClient
      .from('convocatorias')
      .select(`
        id, partido_id, minutos_jugados, minutes_played, goles, goals, asistencias, assists,
        tarjetas_amarillas, yellow_cards, tarjetas_rojas, red_cards, status, titular,
        partidos!inner(id, rival_nombre, fecha_hora, estado, season_id, equipo_id)
      `)
      .eq('player_id', targetPlayerId);

    if (activeSeasonId) {
      convsQuery = convsQuery.eq('partidos.season_id', activeSeasonId);
    } else {
      convsQuery = convsQuery.neq('partidos.season_id', '584f508a-fc1a-4339-b5b2-4296ffde2f4c');
    }

    const { data: officialConvs } = await convsQuery.order('partidos(fecha_hora)', { ascending: false });

    let totalMatchesPlayed = 0;
    let totalMatchMinutes = 0;
    let totalGoals = 0;
    let totalAssists = 0;
    let totalYellows = 0;
    let totalReds = 0;

    const recentMatches = (officialConvs || []).map((c: any) => {
      const match = c.partidos;
      const isFinished = match?.estado?.toLowerCase() === 'finalizado';
      const mins = resolveOfficialMatchMinutes({
        matchStatus: match?.estado,
        minutosJugados: c.minutos_jugados,
        minutesPlayed: c.minutes_played,
        isStarter: c.titular
      });
      const g = isFinished ? Number(c.goles ?? c.goals ?? 0) : 0;
      const a = isFinished ? Number(c.asistencias ?? c.assists ?? 0) : 0;
      const y = isFinished ? Number(c.tarjetas_amarillas ?? c.yellow_cards ?? 0) : 0;
      const r = isFinished ? Number(c.tarjetas_rojas ?? c.red_cards ?? 0) : 0;

      if (isFinished && ((mins !== null && mins > 0) || c.titular)) {
        totalMatchesPlayed++;
        if (mins !== null) {
          totalMatchMinutes += mins;
        }
        totalGoals += g;
        totalAssists += a;
        totalYellows += y;
        totalReds += r;
      }

      return {
        matchId: match?.id || c.partido_id,
        date: match?.fecha_hora || '',
        rivalName: match?.rival_nombre || 'Rival oficial',
        isStarter: Boolean(c.titular),
        minutes: mins,
        goals: g,
        assists: a,
        yellowCards: y,
        redCards: r
      };
    });

    // 4. Consultar eventos de entrenamiento del equipo del jugador
    let rawTeamEvents: any[] = [];
    if (teamId) {
      const { data: evData } = await adminClient
        .from('team_events')
        .select('id, team_id, date, start_time, end_time, event_type, title')
        .eq('team_id', teamId)
        .eq('event_type', 'Entrenamiento')
        .order('date', { ascending: false });
      if (evData) rawTeamEvents = evData;
    }

    // 5. Consultar todas las métricas y asistencias del jugador en el club (para ACWR multi-equipo sin duplicar eventos)
    const { data: allPlayerAtt } = await adminClient
      .from('attendance')
      .select('event_id, status, notes, event:team_events(id, team_id, date, start_time, end_time, event_type, title, teams(club_id))')
      .eq('player_id', targetPlayerId);

    const { data: allPlayerMetrics } = await adminClient
      .from('player_training_metrics')
      .select('event_id, metric_id, value_number, club_metrics(name), event:team_events(id, team_id, date, start_time, end_time, event_type, title, teams(club_id))')
      .eq('player_id', targetPlayerId);

    const attendanceMap: Record<string, { status: string; notes?: string }> = {};
    const extraClubEventsMap = new Map<string, any>();

    (allPlayerAtt || []).forEach((a: any) => {
      if (a.event_id) {
        attendanceMap[a.event_id] = { status: a.status, notes: a.notes || undefined };
      }
      const ev = a.event;
      const evClubId = (ev?.teams as any)?.club_id;
      if (ev && ev.id && ev.event_type === 'Entrenamiento' && (!evClubId || evClubId === clubId)) {
        extraClubEventsMap.set(ev.id, ev);
      }
    });

    const metricsByEvent = new Map<string, { rpe: number | null; minutes: number | null }>();
    (allPlayerMetrics || []).forEach((m: any) => {
      const evId = m.event_id;
      if (!evId) return;
      if (!metricsByEvent.has(evId)) {
        metricsByEvent.set(evId, { rpe: null, minutes: null });
      }
      const entry = metricsByEvent.get(evId)!;
      const metricName = (m.club_metrics?.name || '').toLowerCase();
      const val = m.value_number;
      if (metricName.includes('rpe') && typeof val === 'number' && !isNaN(val) && val >= 0 && val <= 10) {
        entry.rpe = val;
      } else if (metricName.includes('minut') && typeof val === 'number' && !isNaN(val) && val >= 0 && val <= 300) {
        entry.minutes = val;
      }

      const ev = m.event;
      const evClubId = (ev?.teams as any)?.club_id;
      if (ev && ev.id && ev.event_type === 'Entrenamiento' && (!evClubId || evClubId === clubId)) {
        extraClubEventsMap.set(ev.id, ev);
      }
    });

    const now = new Date();

    // Filtrar sesiones del equipo elegibles (excluyendo futuras y sesiones de hoy aún no iniciadas ni con lista pasada)
    const eligibleTeamEvents = rawTeamEvents.filter(ev => {
      const att = attendanceMap[ev.id];
      const met = metricsByEvent.get(ev.id);
      const hasMetrics = (met?.rpe !== null && met?.rpe !== undefined) || (met?.minutes !== null && met?.minutes !== undefined);
      return isTrainingSessionEligible({
        event: ev,
        now,
        attendanceStatuses: att ? [att.status] : [],
        hasRecordedMetrics: hasMetrics
      });
    });

    let presentTrainings = 0;
    let sumRpe = 0;
    let rpeCount = 0;

    const recentSessions = eligibleTeamEvents.map(ev => {
      const att = attendanceMap[ev.id];
      if (att && isConfirmedAttendanceStatus(att.status)) {
        presentTrainings++;
      }

      const met = metricsByEvent.get(ev.id);
      const rpe = met?.rpe ?? null;
      const min = met?.minutes ?? null;

      if (rpe !== null) {
        sumRpe += rpe;
        rpeCount++;
      }

      const loadRes = calculateTrainingLoad(rpe, min);

      return {
        eventId: ev.id,
        date: ev.date || '',
        title: ev.title || 'Entrenamiento',
        attendanceStatus: att?.status || 'No registrada',
        attendanceNotes: att?.notes,
        rpe,
        minutes: min,
        load: loadRes.load
      };
    });

    // Construir lista combinada de sesiones del jugador en el club (equipo propio + otros equipos del club) sin duplicar eventId
    const combinedEventsMap = new Map<string, any>();
    rawTeamEvents.forEach(ev => {
      if (ev.id) combinedEventsMap.set(ev.id, ev);
    });
    extraClubEventsMap.forEach((ev, evId) => {
      if (!combinedEventsMap.has(evId)) combinedEventsMap.set(evId, ev);
    });

    const workloadSessions: SessionWorkloadEntryInput[] = Array.from(combinedEventsMap.values()).map(ev => {
      const att = attendanceMap[ev.id];
      const met = metricsByEvent.get(ev.id);
      return {
        eventId: ev.id,
        date: ev.date || '',
        teamId: ev.team_id,
        start_time: ev.start_time,
        event_type: ev.event_type || 'Entrenamiento',
        status: ev.status,
        estado: ev.estado,
        is_cancelled: ev.is_cancelled,
        rpe: met?.rpe ?? null,
        minutes: met?.minutes ?? null,
        attendanceStatuses: att ? [att.status] : []
      };
    });

    const multiTeamWorkload = aggregatePlayerMultiTeamWorkload({
      sessions: workloadSessions,
      contextTeamId: teamId,
      now
    });

    const avgRpe = rpeCount > 0 ? Math.round((sumRpe / rpeCount) * 10) / 10 : null;
    const trainingAttendancePct = eligibleTeamEvents.length > 0
      ? Math.round((presentTrainings / eligibleTeamEvents.length) * 100)
      : 0;

    const payload: PersonalPerformanceData = {
      player: {
        id: fullPlayer.id,
        first_name: fullPlayer.first_name,
        last_name: fullPlayer.last_name,
        dorsal: fullPlayer.dorsal,
        avatar_url: fullPlayer.avatar_url,
        posicion: fullPlayer.posicion,
        team_id: fullPlayer.team_id,
        team_name: (fullPlayer.teams as any)?.name,
        team_category: (fullPlayer.teams as any)?.category,
      },
      summary: {
        totalTrainingSessions: eligibleTeamEvents.length,
        trainingAttendancePct,
        totalTrainingMinutes: multiTeamWorkload.contextTeamTrainingMinutes,
        avgRpe,
        acwrRatio: multiTeamWorkload.acwr,
        totalMatchesPlayed,
        totalMatchMinutes,
        goals: totalGoals,
        assists: totalAssists,
        yellowCards: totalYellows,
        redCards: totalReds,
      },
      recentSessions,
      recentMatches
    };

    return { success: true, data: payload };

  } catch (err: any) {
    console.error("Error en getPersonalPerformanceAction:", err);
    return { success: false, error: err.message || "Error al obtener el rendimiento personal" };
  }
}
