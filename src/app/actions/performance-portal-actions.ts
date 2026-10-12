'use server';

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedContext, canUserAccessPlayer } from "@/lib/auth-helpers";

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
    minutes: number;
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
      const rawMins = c.minutos_jugados ?? c.minutes_played;
      const mins = isFinished ? (rawMins !== null && rawMins !== undefined ? Number(rawMins) : (c.titular ? 90 : 0)) : 0;
      const g = isFinished ? Number(c.goles ?? c.goals ?? 0) : 0;
      const a = isFinished ? Number(c.asistencias ?? c.assists ?? 0) : 0;
      const y = isFinished ? Number(c.tarjetas_amarillas ?? c.yellow_cards ?? 0) : 0;
      const r = isFinished ? Number(c.tarjetas_rojas ?? c.red_cards ?? 0) : 0;

      if (isFinished && (mins > 0 || c.titular)) {
        totalMatchesPlayed++;
        totalMatchMinutes += mins;
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

    // 4. Consultar eventos de entrenamiento del equipo
    let teamEvents: any[] = [];
    if (teamId) {
      const { data: evData } = await adminClient
        .from('team_events')
        .select('id, date, event_type, title')
        .eq('team_id', teamId)
        .eq('event_type', 'Entrenamiento')
        .order('date', { ascending: false });
      if (evData) teamEvents = evData;
    }

    const eventIds = teamEvents.map(e => e.id);

    // 5. Asistencia del jugador
    let attendanceMap: Record<string, { status: string; notes?: string }> = {};
    let presentTrainings = 0;

    if (eventIds.length > 0) {
      const { data: attData } = await adminClient
        .from('attendance')
        .select('event_id, status, notes')
        .eq('player_id', targetPlayerId)
        .in('event_id', eventIds);

      if (attData) {
        attData.forEach(a => {
          attendanceMap[a.event_id] = { status: a.status, notes: a.notes || undefined };
          if (['presente', 'present', 'retraso', 'late'].includes((a.status || '').toLowerCase())) {
            presentTrainings++;
          }
        });
      }
    }

    // 6. Métricas de entrenamiento autorizadas (RPE y Minutos)
    let metricsData: any[] = [];
    if (eventIds.length > 0) {
      const { data: pt } = await adminClient
        .from('player_training_metrics')
        .select('event_id, metric_id, value_number, club_metrics(name)')
        .eq('player_id', targetPlayerId)
        .in('event_id', eventIds);
      if (pt) metricsData = pt;
    }

    let sumRpe = 0;
    let rpeCount = 0;
    let totalTrainingMinutes = 0;
    const dailyLoads: Record<string, number> = {};

    const recentSessions = teamEvents.map(ev => {
      const att = attendanceMap[ev.id];
      const mList = metricsData.filter(m => m.event_id === ev.id);
      const rpe = mList.find(m => m.club_metrics?.name?.toLowerCase().includes('rpe'))?.value_number;
      const min = mList.find(m => m.club_metrics?.name?.toLowerCase().includes('minutos'))?.value_number;

      if (typeof min === 'number') {
        totalTrainingMinutes += min;
      }
      if (typeof rpe === 'number') {
        sumRpe += rpe;
        rpeCount++;
      }

      const hasMin = typeof min === 'number';
      const hasRpe = typeof rpe === 'number';
      const load = (hasMin && hasRpe) ? (min * rpe) : null;

      if (load !== null && ev.date) {
        dailyLoads[ev.date] = (dailyLoads[ev.date] || 0) + load;
      }

      return {
        eventId: ev.id,
        date: ev.date || '',
        title: ev.title || 'Entrenamiento',
        attendanceStatus: att?.status || 'No registrada',
        attendanceNotes: att?.notes,
        rpe: typeof rpe === 'number' ? rpe : null,
        minutes: typeof min === 'number' ? min : null,
        load
      };
    });

    const avgRpe = rpeCount > 0 ? Math.round((sumRpe / rpeCount) * 10) / 10 : null;
    const trainingAttendancePct = teamEvents.length > 0 ? Math.round((presentTrainings / teamEvents.length) * 100) : 0;

    // 7. Cálculo defensivo de ACWR si hay histórico
    let acwrRatio: number | null = null;
    const dateKeys = Object.keys(dailyLoads);
    if (dateKeys.length > 0) {
      const timestamps = dateKeys.map(d => new Date(d).getTime());
      const maxTime = Math.max(...timestamps);
      const referenceDate = new Date(maxTime);

      let acuteSum = 0;
      let chronicSum = 0;

      Object.entries(dailyLoads).forEach(([dStr, load]) => {
        const diffDays = Math.abs((referenceDate.getTime() - new Date(dStr).getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 7) acuteSum += load;
        if (diffDays <= 28) chronicSum += load;
      });

      const acuteLoad = acuteSum / 7;
      const chronicLoad = chronicSum / 28;
      if (chronicLoad > 0) {
        acwrRatio = Math.round((acuteLoad / chronicLoad) * 100) / 100;
      }
    }

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
        totalTrainingSessions: teamEvents.length,
        trainingAttendancePct,
        totalTrainingMinutes,
        avgRpe,
        acwrRatio,
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
