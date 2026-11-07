'use server';

import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedContext, ADMIN_ROLES } from '@/lib/auth-helpers';
import {
  generateTeamAttendancePdf,
  generatePlayerAttendancePdf,
  TeamAttendancePdfData,
  PlayerAttendancePdfData,
  PlayerAttendanceSummaryItem,
  AttendanceEventItem,
} from '@/lib/pdf/attendance-pdf-generator';

const ACTIVE_SEASON_ID = '663ed6ef-1dab-4350-9489-ed50f9e9ac15'; // Temporada 26/27
const ARCHIVED_SEASON_ID = '584f508a-fc1a-4339-b5b2-4296ffde2f4c'; // Temporada 25/26 (Cerrada)

interface ExportTeamAttendancePdfParams {
  teamId: string;
  filterType?: 'todos' | 'entrenamientos' | 'partidos';
  dateRange?: 'temporada' | 'mes';
}

interface ExportPlayerAttendancePdfParams {
  teamId: string;
  playerId: string;
  filterType?: 'todos' | 'entrenamientos' | 'partidos';
  dateRange?: 'temporada' | 'mes';
}

/**
 * Normaliza el estado de asistencia a categorías estándar.
 */
function isPresentStatus(status?: string | null): boolean {
  const s = (status || '').toLowerCase().trim();
  return s === 'present' || s === 'presente';
}

function isLateStatus(status?: string | null): boolean {
  const s = (status || '').toLowerCase().trim();
  return s === 'retraso' || s === 'late';
}

function isAbsentStatus(status?: string | null): boolean {
  const s = (status || '').toLowerCase().trim();
  return s === 'absent' || s === 'ausente';
}

function isExcusedStatus(status?: string | null): boolean {
  const s = (status || '').toLowerCase().trim();
  return ['excused', 'justificado', 'justificada', 'justified', 'lesionado', 'permiso', 'enfermedad'].includes(s);
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCIÓN: EXPORTAR INFORME DE ASISTENCIA DEL EQUIPO EN PDF
// ─────────────────────────────────────────────────────────────────────────────

export async function exportTeamAttendancePdfAction(params: ExportTeamAttendancePdfParams) {
  try {
    const { context, error: authError } = await getAuthenticatedContext();
    if (authError || !context) {
      return { success: false, error: 'No autorizado' };
    }

    const supabase = await createClient();
    const { teamId, filterType = 'todos', dateRange = 'temporada' } = params;

    // 1. Obtener detalles del equipo
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, name, category, season_id, club_id')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      return { success: false, error: 'Equipo no encontrado' };
    }

    // Temporada activa garantizada (Regla de Oro: aislamiento estricto)
    const targetSeasonId = (team.season_id && team.season_id !== ARCHIVED_SEASON_ID)
      ? team.season_id
      : ACTIVE_SEASON_ID;

    // Calcular límites de fecha si el rango es del último mes
    const today = new Date().toISOString().split('T')[0];
    let startDate: string | undefined = undefined;
    if (dateRange === 'mes') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      startDate = d.toISOString().split('T')[0];
    }

    // 2. Obtener plantilla de jugadores activos del equipo
    const { data: pshRows, error: pshError } = await supabase
      .from('player_season_history')
      .select(`
        player_id,
        status,
        players (
          id, first_name, last_name, dorsal, status
        )
      `)
      .eq('team_id', teamId)
      .eq('season_id', targetSeasonId);

    if (pshError) {
      return { success: false, error: pshError.message };
    }

    const activePlayers = (pshRows || [])
      .filter((history: any) => {
        const hStatus = history.status?.toLowerCase();
        const pStatus = history.players?.status?.toLowerCase();
        const isHistoryActive = !hStatus || hStatus === 'active' || hStatus === 'activo';
        const isPlayerActive = pStatus === 'active' || pStatus === 'activo';
        return isHistoryActive && isPlayerActive && history.players;
      })
      .map((h: any) => ({
        id: h.players.id,
        firstName: h.players.first_name || '',
        lastName: h.players.last_name || '',
        dorsal: h.players.dorsal || null,
      }))
      .sort((a, b) => a.lastName.localeCompare(b.lastName, 'es'));

    // 3. Obtener eventos de entrenamientos (team_events)
    let eventsQuery = supabase
      .from('team_events')
      .select('id, title, date, event_type')
      .eq('team_id', teamId)
      .neq('event_type', 'Partido')
      .neq('season_id', ARCHIVED_SEASON_ID)
      .lte('date', today)
      .order('date', { ascending: true });

    if (targetSeasonId) {
      eventsQuery = eventsQuery.eq('season_id', targetSeasonId);
    }
    if (startDate) {
      eventsQuery = eventsQuery.gte('date', startDate);
    }

    const { data: teamEvents } = await eventsQuery;

    // 4. Obtener partidos oficiales (partidos)
    let matchesQuery = supabase
      .from('partidos')
      .select('id, rival_nombre, fecha_hora')
      .eq('equipo_id', teamId)
      .neq('season_id', ARCHIVED_SEASON_ID)
      .lte('fecha_hora', `${today}T23:59:59`)
      .order('fecha_hora', { ascending: true });

    if (targetSeasonId) {
      matchesQuery = matchesQuery.eq('season_id', targetSeasonId);
    }
    if (startDate) {
      matchesQuery = matchesQuery.gte('fecha_hora', `${startDate}T00:00:00`);
    }

    const { data: matches } = await matchesQuery;

    // Unificar eventos
    interface UnifiedEvent {
      id: string;
      title: string;
      date: string;
      eventType: 'Entrenamiento' | 'Partido';
    }

    const allEvents: UnifiedEvent[] = [];

    (teamEvents || []).forEach(e => {
      allEvents.push({
        id: e.id,
        title: e.title || 'Entrenamiento',
        date: e.date,
        eventType: 'Entrenamiento',
      });
    });

    (matches || []).forEach(m => {
      allEvents.push({
        id: m.id,
        title: `vs ${m.rival_nombre || 'Rival'}`,
        date: m.fecha_hora ? m.fecha_hora.split('T')[0] : today,
        eventType: 'Partido',
      });
    });

    // Filtrar según filterType
    const filteredEvents = allEvents.filter(e => {
      if (filterType === 'entrenamientos') return e.eventType === 'Entrenamiento';
      if (filterType === 'partidos') return e.eventType === 'Partido';
      return true;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const eventIds = filteredEvents.map(e => e.id);

    // 5. Cargar registros de attendance
    const { data: attendanceRows } = await supabase
      .from('attendance')
      .select('player_id, event_id, date, status, notes')
      .in('event_id', eventIds.length > 0 ? eventIds : ['none']);

    // 6. Cargar actas / convocatorias de partidos
    const matchIds = filteredEvents.filter(e => e.eventType === 'Partido').map(e => e.id);
    const convocatoriasMap = new Map<string, string>(); // `${playerId}_${partidoId}` -> status

    if (matchIds.length > 0) {
      const { data: matchConvs } = await supabase
        .from('convocatorias')
        .select('partido_id, player_id, titular, minutes_played, minutos_jugados, estado_asistencia, status')
        .in('partido_id', matchIds);

      (matchConvs || []).forEach((c: any) => {
        const minPlayed = Number(c.minutes_played || c.minutos_jugados || 0);
        const isConfirmed = c.estado_asistencia === 'Confirmado' || c.estado_asistencia === 'Presente';
        const isInjured = c.status === 'lesionado' || c.estado_asistencia === 'Justificado' || c.estado_asistencia === 'Justificada';
        const isAbsent = c.estado_asistencia === 'Ausente' || c.status === 'ausente';
        const isNotCalled = c.status === 'no_convocado' || c.status === 'desconvocado';

        let s: string | null = null;
        if (isNotCalled) s = 'not_called';
        else if (isAbsent) s = 'absent';
        else if (isInjured) s = 'excused';
        else if (minPlayed > 0 || c.titular || isConfirmed || c.status === 'convocado') s = 'present';

        if (s) {
          convocatoriasMap.set(`${c.player_id}_${c.partido_id}`, s);
        }
      });
    }

    // Mapa rápido de asistencia combinada
    const attendanceMap = new Map<string, { status: string; notes?: string | null }>();
    convocatoriasMap.forEach((status, key) => {
      attendanceMap.set(key, { status });
    });
    (attendanceRows || []).forEach(a => {
      attendanceMap.set(`${a.player_id}_${a.event_id}`, { status: a.status, notes: a.notes });
    });

    // 7. Calcular estadísticas para cada jugador
    const totalTrainings = filteredEvents.filter(e => e.eventType === 'Entrenamiento').length;
    const totalMatches = filteredEvents.filter(e => e.eventType === 'Partido').length;

    const playerSummaries: PlayerAttendanceSummaryItem[] = activePlayers.map(p => {
      let trPresent = 0;
      let trTotal = totalTrainings;
      let mPresent = 0;
      let mTotal = 0;
      let absences = 0;
      let excused = 0;
      let late = 0;

      filteredEvents.forEach(ev => {
        const attKey = `${p.id}_${ev.id}`;
        const record = attendanceMap.get(attKey);
        const status = record?.status;

        if (ev.eventType === 'Partido') {
          // Si el jugador no fue convocado al partido, no penaliza en el total
          if (status === 'not_called') return;
          if (!status) return; // Si no hay acta ni registro para este partido, no contabiliza
          mTotal++;
          if (isPresentStatus(status)) mPresent++;
          else if (isLateStatus(status)) { mPresent++; late++; }
          else if (isExcusedStatus(status)) excused++;
          else if (isAbsentStatus(status)) absences++;
        } else {
          // Entrenamiento
          if (isPresentStatus(status)) trPresent++;
          else if (isLateStatus(status)) { trPresent++; late++; }
          else if (isExcusedStatus(status)) excused++;
          else if (isAbsentStatus(status)) absences++;
        }
      });

      const totalApplicable = trTotal + mTotal;
      const percentage = totalApplicable > 0
        ? Math.round(((trPresent + mPresent + excused) / totalApplicable) * 100)
        : 100;

      return {
        playerId: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        dorsal: p.dorsal,
        trainingsPresent: trPresent,
        trainingsTotal: trTotal,
        matchesPresent: mPresent,
        matchesTotal: mTotal,
        absences,
        excused,
        late,
        percentage,
      };
    });

    const averageAttendancePct = playerSummaries.length > 0
      ? Math.round(playerSummaries.reduce((acc, p) => acc + p.percentage, 0) / playerSummaries.length)
      : 100;

    const filterAppliedLabel = filterType === 'entrenamientos'
      ? `Solo Entrenamientos (${dateRange === 'mes' ? 'Ultimos 30 dias' : 'Temporada 26/27'})`
      : filterType === 'partidos'
        ? `Solo Partidos (${dateRange === 'mes' ? 'Ultimos 30 dias' : 'Temporada 26/27'})`
        : `Todos los Eventos (${dateRange === 'mes' ? 'Ultimos 30 dias' : 'Temporada 26/27'})`;

    const nowSpainStr = new Intl.DateTimeFormat('es-ES', {
      timeZone: 'Europe/Madrid',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date());

    const pdfData: TeamAttendancePdfData = {
      clubName: 'SPORTING SALADAR',
      teamName: team.name,
      category: team.category,
      seasonName: 'Temporada 2026/2027',
      generatedDate: nowSpainStr,
      filterApplied: filterAppliedLabel,
      totalSessions: filteredEvents.length,
      totalTrainings,
      totalMatches,
      averageAttendancePct,
      players: playerSummaries,
    };

    const base64 = await generateTeamAttendancePdf(pdfData);
    const safeTeamName = team.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `Informe_Asistencia_${safeTeamName}_${dateRange === 'mes' ? 'Mes' : '26-27'}.pdf`;

    return {
      success: true,
      base64,
      fileName,
    };
  } catch (err: any) {
    console.error('Error generating team attendance PDF:', err);
    return { success: false, error: err?.message || 'Error al generar el informe de asistencia' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCIÓN: EXPORTAR INFORME INDIVIDUAL DE JUGADOR EN PDF
// ─────────────────────────────────────────────────────────────────────────────

export async function exportPlayerAttendancePdfAction(params: ExportPlayerAttendancePdfParams) {
  try {
    const { context, error: authError } = await getAuthenticatedContext();
    if (authError || !context) {
      return { success: false, error: 'No autorizado' };
    }

    const supabase = await createClient();
    const { teamId, playerId, filterType = 'todos', dateRange = 'temporada' } = params;

    // 1. Obtener detalles del equipo y jugador
    const { data: team } = await supabase
      .from('teams')
      .select('id, name, category, season_id')
      .eq('id', teamId)
      .single();

    const { data: player } = await supabase
      .from('players')
      .select('id, first_name, last_name, dorsal')
      .eq('id', playerId)
      .single();

    if (!team || !player) {
      return { success: false, error: 'Equipo o jugador no encontrado' };
    }

    const targetSeasonId = (team.season_id && team.season_id !== ARCHIVED_SEASON_ID)
      ? team.season_id
      : ACTIVE_SEASON_ID;

    const today = new Date().toISOString().split('T')[0];
    let startDate: string | undefined = undefined;
    if (dateRange === 'mes') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      startDate = d.toISOString().split('T')[0];
    }

    // 2. Obtener eventos
    let eventsQuery = supabase
      .from('team_events')
      .select('id, title, date, event_type')
      .eq('team_id', teamId)
      .neq('event_type', 'Partido')
      .neq('season_id', ARCHIVED_SEASON_ID)
      .lte('date', today)
      .order('date', { ascending: false });

    if (targetSeasonId) eventsQuery = eventsQuery.eq('season_id', targetSeasonId);
    if (startDate) eventsQuery = eventsQuery.gte('date', startDate);

    const { data: teamEvents } = await eventsQuery;

    let matchesQuery = supabase
      .from('partidos')
      .select('id, rival_nombre, fecha_hora')
      .eq('equipo_id', teamId)
      .neq('season_id', ARCHIVED_SEASON_ID)
      .lte('fecha_hora', `${today}T23:59:59`)
      .order('fecha_hora', { ascending: false });

    if (targetSeasonId) matchesQuery = matchesQuery.eq('season_id', targetSeasonId);
    if (startDate) matchesQuery = matchesQuery.gte('fecha_hora', `${startDate}T00:00:00`);

    const { data: matches } = await matchesQuery;

    interface UnifiedEvent {
      id: string;
      title: string;
      date: string;
      eventType: 'Entrenamiento' | 'Partido';
    }

    const allEvents: UnifiedEvent[] = [];
    (teamEvents || []).forEach(e => {
      allEvents.push({ id: e.id, title: e.title || 'Entrenamiento', date: e.date, eventType: 'Entrenamiento' });
    });
    (matches || []).forEach(m => {
      allEvents.push({ id: m.id, title: `vs ${m.rival_nombre || 'Rival'}`, date: m.fecha_hora ? m.fecha_hora.split('T')[0] : today, eventType: 'Partido' });
    });

    const filteredEvents = allEvents.filter(e => {
      if (filterType === 'entrenamientos') return e.eventType === 'Entrenamiento';
      if (filterType === 'partidos') return e.eventType === 'Partido';
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Del más reciente al más antiguo

    const eventIds = filteredEvents.map(e => e.id);

    // 3. Asistencia registrada
    const { data: attendanceRows } = await supabase
      .from('attendance')
      .select('event_id, date, status, notes')
      .eq('player_id', playerId)
      .in('event_id', eventIds.length > 0 ? eventIds : ['none']);

    // 4. Convocatorias de partidos
    const matchIds = filteredEvents.filter(e => e.eventType === 'Partido').map(e => e.id);
    const convocatoriasMap = new Map<string, string>();

    if (matchIds.length > 0) {
      const { data: matchConvs } = await supabase
        .from('convocatorias')
        .select('partido_id, titular, minutes_played, minutos_jugados, estado_asistencia, status')
        .eq('player_id', playerId)
        .in('partido_id', matchIds);

      (matchConvs || []).forEach((c: any) => {
        const minPlayed = Number(c.minutes_played || c.minutos_jugados || 0);
        const isConfirmed = c.estado_asistencia === 'Confirmado' || c.estado_asistencia === 'Presente';
        const isInjured = c.status === 'lesionado' || c.estado_asistencia === 'Justificado' || c.estado_asistencia === 'Justificada';
        const isAbsent = c.estado_asistencia === 'Ausente' || c.status === 'ausente';
        const isNotCalled = c.status === 'no_convocado' || c.status === 'desconvocado';

        let s: string | null = null;
        if (isNotCalled) s = 'not_called';
        else if (isAbsent) s = 'absent';
        else if (isInjured) s = 'excused';
        else if (minPlayed > 0 || c.titular || isConfirmed || c.status === 'convocado') s = 'present';

        if (s) convocatoriasMap.set(c.partido_id, s);
      });
    }

    const attendanceMap = new Map<string, { status: string; notes?: string | null }>();
    convocatoriasMap.forEach((status, partidoId) => {
      attendanceMap.set(partidoId, { status });
    });
    (attendanceRows || []).forEach(a => {
      if (a.event_id) {
        attendanceMap.set(a.event_id, { status: a.status, notes: a.notes });
      }
    });

    // 5. Construir historial y métricas del jugador
    let trainingsAttended = 0;
    let trainingsTotal = 0;
    let matchesAttended = 0;
    let matchesTotal = 0;
    let absences = 0;
    let excused = 0;
    let late = 0;

    const eventItems: AttendanceEventItem[] = [];

    filteredEvents.forEach(ev => {
      const att = attendanceMap.get(ev.id);
      const status = att?.status;

      if (ev.eventType === 'Partido') {
        if (status === 'not_called') return; // Si no fue convocado, omitir de la ficha
        if (!status) return; // Si no hay datos de acta, omitir
        matchesTotal++;
        if (isPresentStatus(status)) matchesAttended++;
        else if (isLateStatus(status)) { matchesAttended++; late++; }
        else if (isExcusedStatus(status)) excused++;
        else if (isAbsentStatus(status)) absences++;
      } else {
        trainingsTotal++;
        if (isPresentStatus(status)) trainingsAttended++;
        else if (isLateStatus(status)) { trainingsAttended++; late++; }
        else if (isExcusedStatus(status)) excused++;
        else if (isAbsentStatus(status)) absences++;
      }

      eventItems.push({
        id: ev.id,
        date: ev.date,
        eventType: ev.eventType,
        title: ev.title,
        status: status || 'Sin registrar',
        notes: att?.notes || null,
      });
    });

    const totalEvents = trainingsTotal + matchesTotal;
    const percentage = totalEvents > 0
      ? Math.round(((trainingsAttended + matchesAttended + excused) / totalEvents) * 100)
      : 100;

    const nowSpainStr = new Intl.DateTimeFormat('es-ES', {
      timeZone: 'Europe/Madrid',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date());

    const filterLabel = filterType === 'entrenamientos'
      ? `Solo Entrenamientos (${dateRange === 'mes' ? 'Ultimos 30 dias' : 'Temporada 26/27'})`
      : filterType === 'partidos'
        ? `Solo Partidos (${dateRange === 'mes' ? 'Ultimos 30 dias' : 'Temporada 26/27'})`
        : `Todos los Eventos (${dateRange === 'mes' ? 'Ultimos 30 dias' : 'Temporada 26/27'})`;

    const pdfData: PlayerAttendancePdfData = {
      clubName: 'SPORTING SALADAR',
      teamName: team.name,
      category: team.category,
      seasonName: 'Temporada 2026/2027',
      generatedDate: nowSpainStr,
      filterApplied: filterLabel,
      player: {
        id: player.id,
        firstName: player.first_name || '',
        lastName: player.last_name || '',
        dorsal: player.dorsal,
      },
      summary: {
        totalEvents,
        trainingsAttended,
        trainingsTotal,
        matchesAttended,
        matchesTotal,
        absences,
        excused,
        late,
        percentage,
      },
      events: eventItems,
    };

    const base64 = await generatePlayerAttendancePdf(pdfData);
    const safePlayerName = `${player.first_name}_${player.last_name}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `Informe_Asistencia_${safePlayerName}.pdf`;

    return {
      success: true,
      base64,
      fileName,
    };
  } catch (err: any) {
    console.error('Error generating player attendance PDF:', err);
    return { success: false, error: err?.message || 'Error al generar el informe del jugador' };
  }
}
