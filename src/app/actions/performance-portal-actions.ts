'use server';

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedContext, canUserAccessPlayer, canUserManageTeam } from "@/lib/auth-helpers";
import {
  aggregatePlayerMultiTeamWorkload,
  AuthorizedPlayerWorkloadSummary,
  calculateTrainingLoad,
  CLOSED_SEASON_ID_25_26,
  computeAuthorizedTeamSquadWorkloads,
  isConfirmedAttendanceStatus,
  isTrainingSessionEligible,
  RawTrainingAttendanceSource,
  RawTrainingEventSource,
  RawTrainingMetricSource,
  reconcilePlayerClubTrainingHistory,
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
      .select('id, first_name, last_name, dorsal, avatar_url, posicion, team_id, teams(name, category, season_id)')
      .eq('id', targetPlayerId)
      .single();

    if (pError || !fullPlayer) {
      return { success: false, error: 'No se pudo cargar la información del jugador' };
    }

    // 2. Determinar la temporada activa del club para garantizar aislamiento
    const { data: activeSeason } = await adminClient
      .from('seasons')
      .select('id, start_date')
      .eq('club_id', clubId)
      .eq('is_active', true)
      .neq('id', CLOSED_SEASON_ID_25_26)
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
      .eq('player_id', targetPlayerId)
      .neq('partidos.season_id', CLOSED_SEASON_ID_25_26);

    if (activeSeasonId) {
      convsQuery = convsQuery.eq('partidos.season_id', activeSeasonId);
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

    // 4. Consultar eventos de entrenamiento del equipo del jugador (solo si el equipo pertenece a temporada activa)
    const primaryTeamSeasonId = (fullPlayer.teams as any)?.season_id || null;
    const isPrimaryTeamActiveSeason =
      Boolean(teamId) &&
      primaryTeamSeasonId !== CLOSED_SEASON_ID_25_26 &&
      (!activeSeasonId || primaryTeamSeasonId === activeSeasonId);

    const verifiedContextTeamId = isPrimaryTeamActiveSeason ? teamId : null;

    let rawTeamEvents: any[] = [];
    if (verifiedContextTeamId) {
      let evQuery = adminClient
        .from('team_events')
        .select('id, team_id, date, start_time, end_time, event_type, title')
        .eq('team_id', verifiedContextTeamId)
        .eq('event_type', 'Entrenamiento')
        .order('date', { ascending: false });

      if (activeSeason?.start_date) {
        evQuery = evQuery.gte('date', activeSeason.start_date);
      }

      const { data: evData } = await evQuery;
      if (evData) rawTeamEvents = evData;
    }

    // 5. Consultar todas las métricas y asistencias del jugador en el club (para ACWR multi-equipo sin duplicar eventos)
    const { data: allPlayerAtt } = await adminClient
      .from('attendance')
      .select('event_id, status, notes, event:team_events(id, team_id, date, start_time, end_time, event_type, title, teams(club_id, season_id))')
      .eq('player_id', targetPlayerId);

    const { data: allPlayerMetrics } = await adminClient
      .from('player_training_metrics')
      .select('event_id, metric_id, value_number, club_metrics(name), event:team_events(id, team_id, date, start_time, end_time, event_type, title, teams(club_id, season_id))')
      .eq('player_id', targetPlayerId);

    const isEventInActiveClubSeason = (ev: any): boolean => {
      if (!ev || !ev.id || ev.event_type !== 'Entrenamiento') return false;
      const evTeam = ev.teams as any;
      const evClubId = evTeam?.club_id;
      const evSeasonId = evTeam?.season_id;
      if (evClubId && evClubId !== clubId) return false;
      if (evSeasonId === CLOSED_SEASON_ID_25_26) return false;
      if (activeSeasonId && evSeasonId && evSeasonId !== activeSeasonId) return false;
      if (activeSeason?.start_date && ev.date && String(ev.date).slice(0, 10) < String(activeSeason.start_date).slice(0, 10)) {
        return false;
      }
      return true;
    };

    const activeSeasonTeamIds = new Set<string>();
    if (verifiedContextTeamId) {
      activeSeasonTeamIds.add(verifiedContextTeamId);
    }

    const rawTeamEventSources: RawTrainingEventSource[] = rawTeamEvents.map(ev => ({
      id: ev.id,
      team_id: ev.team_id || verifiedContextTeamId,
      season_id: primaryTeamSeasonId,
      date: ev.date,
      start_time: ev.start_time,
      end_time: ev.end_time,
      event_type: ev.event_type,
      title: ev.title,
      status: ev.status,
      estado: ev.estado,
      is_cancelled: ev.is_cancelled,
      cancelled: ev.cancelled,
    }));

    const rawAttendanceSources: RawTrainingAttendanceSource[] = [];
    for (const a of allPlayerAtt || []) {
      const ev = a.event as any;
      if (ev && !isEventInActiveClubSeason(ev)) continue;
      if (ev?.team_id && isEventInActiveClubSeason(ev)) {
        activeSeasonTeamIds.add(ev.team_id);
      }
      rawAttendanceSources.push({
        event_id: a.event_id || ev?.id,
        player_id: targetPlayerId,
        status: a.status,
        notes: a.notes || undefined,
        event: ev
          ? {
              id: ev.id,
              team_id: ev.team_id,
              season_id: (ev.teams as any)?.season_id ?? null,
              date: ev.date,
              start_time: ev.start_time,
              end_time: ev.end_time,
              event_type: ev.event_type,
              title: ev.title,
              status: ev.status,
              estado: ev.estado,
              is_cancelled: ev.is_cancelled,
              cancelled: ev.cancelled,
            }
          : null,
      });
    }

    const rawMetricSources: RawTrainingMetricSource[] = [];
    for (const m of allPlayerMetrics || []) {
      const ev = m.event as any;
      if (ev && !isEventInActiveClubSeason(ev)) continue;
      if (ev?.team_id && isEventInActiveClubSeason(ev)) {
        activeSeasonTeamIds.add(ev.team_id);
      }
      rawMetricSources.push({
        event_id: m.event_id || ev?.id,
        player_id: targetPlayerId,
        metric_name: (m.club_metrics as any)?.name ?? null,
        value: m.value_number,
        event: ev
          ? {
              id: ev.id,
              team_id: ev.team_id,
              season_id: (ev.teams as any)?.season_id ?? null,
              date: ev.date,
              start_time: ev.start_time,
              end_time: ev.end_time,
              event_type: ev.event_type,
              title: ev.title,
              status: ev.status,
              estado: ev.estado,
              is_cancelled: ev.is_cancelled,
              cancelled: ev.cancelled,
            }
          : null,
      });
    }

    const now = new Date();

    const reconciled = reconcilePlayerClubTrainingHistory({
      contextTeamId: verifiedContextTeamId,
      activeSeasonTeamIds,
      seasonStartDate: activeSeason?.start_date || null,
      teamEvents: rawTeamEventSources,
      attendanceEntries: rawAttendanceSources,
      metricEntries: rawMetricSources,
      now,
    });

    let sumRpe = 0;
    let rpeCount = 0;

    const recentSessions = reconciled.contextTeamHistory.map(item => {
      if (item.rpe !== null) {
        sumRpe += item.rpe;
        rpeCount++;
      }

      return {
        eventId: item.id,
        date: item.date || '',
        title: item.title || 'Entrenamiento',
        attendanceStatus: item.rawAttendanceStatus || 'No registrada',
        attendanceNotes: item.attendanceNotes,
        rpe: item.rpe,
        minutes: item.minutes,
        load: item.load,
      };
    });

    const avgRpe = rpeCount > 0 ? Math.round((sumRpe / rpeCount) * 10) / 10 : null;
    const trainingAttendancePct = reconciled.contextAttendance.attendancePct;

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
        totalTrainingSessions: reconciled.contextAttendance.totalTrainings,
        trainingAttendancePct,
        totalTrainingMinutes: reconciled.workload.contextTeamTrainingMinutes,
        avgRpe,
        acwrRatio: reconciled.workload.acwr,
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

/**
 * Obtiene los agregados de carga y ACWR multi-equipo (sin exponer eventos ni métricas crudas
 * de otros equipos) para los jugadores autorizados de `teamId` en la temporada activa.
 * Usado por la vista colectiva `/dashboard/equipos/[teamId]/rendimiento` y `PlayerPerformanceDrawer`.
 */
export async function getAuthorizedTeamWorkloadSummariesAction(
  teamId: string,
  requestedSeasonId?: string | null,
  filterPlayerIds?: string[]
): Promise<{
  success: boolean;
  data?: Record<string, AuthorizedPlayerWorkloadSummary>;
  rejectedPlayerIds?: string[];
  error?: string;
}> {
  try {
    if (!teamId || typeof teamId !== 'string' || teamId.trim() === '') {
      return { success: false, error: 'Identificador de equipo no válido' };
    }

    const { context, error: authError } = await getAuthenticatedContext();
    if (!context || authError) {
      return { success: false, error: authError || 'No autenticado' };
    }

    const adminClient = createAdminClient();
    const isAuthorized = await canUserManageTeam(adminClient, context, teamId);
    if (!isAuthorized) {
      return {
        success: false,
        error: 'No tienes permisos para consultar las métricas de rendimiento de este equipo.',
      };
    }

    const clubId = context.profile.club_id;

    // 1. Verificar equipo consultado y aislar temporada activa
    const { data: targetTeam } = await adminClient
      .from('teams')
      .select('id, club_id, season_id')
      .eq('id', teamId)
      .neq('season_id', CLOSED_SEASON_ID_25_26)
      .maybeSingle();

    if (!targetTeam || targetTeam.club_id !== clubId) {
      return {
        success: false,
        error: 'El equipo solicitado no pertenece al club activo o corresponde a una temporada archivada.',
      };
    }

    const candidateSeasonId =
      requestedSeasonId && requestedSeasonId !== CLOSED_SEASON_ID_25_26
        ? requestedSeasonId
        : targetTeam.season_id && targetTeam.season_id !== CLOSED_SEASON_ID_25_26
        ? targetTeam.season_id
        : null;

    let seasonRow: { id: string; start_date: string | null } | null = null;
    if (candidateSeasonId) {
      const { data: sData } = await adminClient
        .from('seasons')
        .select('id, start_date')
        .eq('club_id', clubId)
        .eq('id', candidateSeasonId)
        .neq('id', CLOSED_SEASON_ID_25_26)
        .maybeSingle();
      if (sData) seasonRow = sData;
    }

    if (!seasonRow) {
      const { data: activeSeasonData } = await adminClient
        .from('seasons')
        .select('id, start_date')
        .eq('club_id', clubId)
        .eq('is_active', true)
        .neq('id', CLOSED_SEASON_ID_25_26)
        .maybeSingle();
      if (activeSeasonData) seasonRow = activeSeasonData;
    }

    const effectiveSeasonId = seasonRow?.id || null;
    const seasonStartDate = seasonRow?.start_date || null;

    // 2. Obtener todos los equipos del club en la temporada activa (excluyendo siempre 25/26)
    let clubTeamsQuery = adminClient
      .from('teams')
      .select('id, season_id')
      .eq('club_id', clubId)
      .neq('season_id', CLOSED_SEASON_ID_25_26);

    if (effectiveSeasonId) {
      clubTeamsQuery = clubTeamsQuery.eq('season_id', effectiveSeasonId);
    }

    const { data: clubTeams } = await clubTeamsQuery;
    const activeSeasonTeamIds = new Set<string>((clubTeams || []).map((t: any) => t.id));
    activeSeasonTeamIds.add(teamId);

    // 3. Resolver la plantilla autorizada del equipo (player_season_history activa + players actuales del equipo)
    const [{ data: historyRows }, { data: directPlayers }] = await Promise.all([
      adminClient
        .from('player_season_history')
        .select('player_id, season_id, status')
        .eq('team_id', teamId)
        .neq('status', 'inactive')
        .neq('season_id', CLOSED_SEASON_ID_25_26),
      adminClient
        .from('players')
        .select('id')
        .eq('club_id', clubId)
        .eq('team_id', teamId),
    ]);

    const authorizedSquadPlayerIds = new Set<string>();
    for (const h of historyRows || []) {
      if (effectiveSeasonId && h.season_id && h.season_id !== effectiveSeasonId) continue;
      if (h.player_id) authorizedSquadPlayerIds.add(h.player_id);
    }
    for (const p of directPlayers || []) {
      if (p.id) authorizedSquadPlayerIds.add(p.id);
    }

    const targetPlayerIds =
      filterPlayerIds && filterPlayerIds.length > 0
        ? filterPlayerIds.filter(pid => authorizedSquadPlayerIds.has(pid))
        : Array.from(authorizedSquadPlayerIds);

    if (targetPlayerIds.length === 0) {
      const emptyCheck = computeAuthorizedTeamSquadWorkloads({
        isAuthorizedForTeam: true,
        contextTeamId: teamId,
        activeSeasonTeamIds,
        authorizedSquadPlayerIds,
        requestedPlayerIds: filterPlayerIds || null,
        seasonStartDate,
        contextTeamEvents: [],
        attendanceEntries: [],
        metricEntries: [],
      });
      return {
        success: true,
        data: emptyCheck.summaries,
        rejectedPlayerIds: emptyCheck.rejectedPlayerIds,
      };
    }

    // 4. Consultar eventos de entrenamiento del equipo contextual + asistencias y métricas de los jugadores autorizados en todos los equipos activos del club
    let contextEventsQuery = adminClient
      .from('team_events')
      .select('id, team_id, date, start_time, end_time, event_type, title')
      .eq('team_id', teamId);

    if (seasonStartDate) {
      contextEventsQuery = contextEventsQuery.gte('date', seasonStartDate);
    }

    const [
      { data: rawContextEvents },
      { data: rawAttendance },
      { data: rawMetrics },
    ] = await Promise.all([
      contextEventsQuery,
      adminClient
        .from('attendance')
        .select('event_id, player_id, status, event:team_events(id, team_id, date, start_time, end_time, event_type, title, teams(club_id, season_id))')
        .in('player_id', targetPlayerIds),
      adminClient
        .from('player_training_metrics')
        .select('event_id, player_id, value_number, club_metrics(name), event:team_events(id, team_id, date, start_time, end_time, event_type, title, teams(club_id, season_id))')
        .in('player_id', targetPlayerIds),
    ]);

    const contextTeamEvents: RawTrainingEventSource[] = (rawContextEvents || []).map((ev: any) => ({
      id: ev.id,
      team_id: ev.team_id,
      season_id: effectiveSeasonId,
      date: ev.date,
      start_time: ev.start_time,
      end_time: ev.end_time,
      event_type: ev.event_type,
      title: ev.title,
    }));

    const attendanceEntries: RawTrainingAttendanceSource[] = [];
    for (const a of rawAttendance || []) {
      const ev = a.event as any;
      const evTeam = ev?.teams as any;
      if (evTeam?.club_id && evTeam.club_id !== clubId) continue;
      if (evTeam?.season_id === CLOSED_SEASON_ID_25_26) continue;
      attendanceEntries.push({
        event_id: a.event_id,
        player_id: a.player_id,
        status: a.status,
        event: ev
          ? {
              id: ev.id,
              team_id: ev.team_id,
              season_id: evTeam?.season_id ?? null,
              date: ev.date,
              start_time: ev.start_time,
              end_time: ev.end_time,
              event_type: ev.event_type,
              title: ev.title,
            }
          : null,
      });
    }

    const metricEntries: RawTrainingMetricSource[] = [];
    for (const m of rawMetrics || []) {
      const ev = m.event as any;
      const evTeam = ev?.teams as any;
      if (evTeam?.club_id && evTeam.club_id !== clubId) continue;
      if (evTeam?.season_id === CLOSED_SEASON_ID_25_26) continue;
      metricEntries.push({
        event_id: m.event_id,
        player_id: m.player_id,
        metric_name: (m.club_metrics as any)?.name ?? null,
        value: m.value_number,
        event: ev
          ? {
              id: ev.id,
              team_id: ev.team_id,
              season_id: evTeam?.season_id ?? null,
              date: ev.date,
              start_time: ev.start_time,
              end_time: ev.end_time,
              event_type: ev.event_type,
              title: ev.title,
            }
          : null,
      });
    }

    const result = computeAuthorizedTeamSquadWorkloads({
      isAuthorizedForTeam: true,
      contextTeamId: teamId,
      activeSeasonTeamIds,
      authorizedSquadPlayerIds,
      requestedPlayerIds: filterPlayerIds || null,
      seasonStartDate,
      contextTeamEvents,
      attendanceEntries,
      metricEntries,
    });

    return {
      success: true,
      data: result.summaries,
      rejectedPlayerIds: result.rejectedPlayerIds,
    };
  } catch (err: any) {
    console.error('Error en getAuthorizedTeamWorkloadSummariesAction:', err);
    return {
      success: false,
      error: err.message || 'Error al calcular los agregados de carga del equipo',
    };
  }
}

