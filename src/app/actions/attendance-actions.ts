'use server'

import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedContext, ADMIN_ROLES } from '@/lib/auth-helpers'

export interface GetGlobalAttendanceParams {
  seasonId?: string
  teamId?: string
  playerId?: string
  startDate?: string
  endDate?: string
  activityType?: string
  limit?: number
}

export interface AttendanceRecordDTO {
  id: string
  playerId: string
  playerName: string
  playerDorsal: number | null
  playerAvatar: string | null
  teamId: string | null
  teamName: string
  teamCategory: string
  date: string
  status: 'presente' | 'ausente' | 'justificado' | 'lesionado' | 'retraso' | 'otro'
  rawStatus: string
  eventName: string
  activityType?: string
  notes: string | null
}

export interface AttendanceKPIs {
  totalRecords: number
  uniquePlayers: number
  totalTeams: number
  presentes: number
  ausentes: number
  justificados: number
  lesionados: number
  retrasos: number
  attendanceRate: number
}

export interface GlobalAttendanceResponse {
  success: boolean
  error?: string
  records?: AttendanceRecordDTO[]
  kpis?: AttendanceKPIs
  teams?: Array<{ id: string; name: string; category: string }>
  isTruncated?: boolean
  totalMatched?: number
}

function normalizeStatus(status: string): 'presente' | 'ausente' | 'justificado' | 'lesionado' | 'retraso' | 'otro' {
  const s = (status || '').toLowerCase().trim()
  if (s === 'presente' || s === 'present') return 'presente'
  if (s === 'ausente' || s === 'absent') return 'ausente'
  if (s === 'justificado' || s === 'justified') return 'justificado'
  if (s === 'lesionado' || s === 'injured') return 'lesionado'
  if (s === 'retraso' || s === 'late') return 'retraso'
  return 'otro'
}

export async function getGlobalAttendanceAction(
  params?: GetGlobalAttendanceParams
): Promise<GlobalAttendanceResponse> {
  try {
    const { context, error: authError } = await getAuthenticatedContext()
    if (authError || !context) {
      return { success: false, error: 'No autorizado' }
    }

    const { profile } = context
    const clubId = profile.club_id
    const allowedRoles = [...ADMIN_ROLES, 'metodologo', 'entrenador']
    if (!allowedRoles.includes(profile.role)) {
      return { success: false, error: 'Permisos insuficientes para consultar la asistencia global' }
    }

    const supabase = await createClient()

    // 1. Obtener equipos del club (con filtro opcional por seasonId)
    let teamsQuery = supabase
      .from('teams')
      .select('id, name, category, season_id')
      .eq('club_id', clubId)
      .order('name', { ascending: true })

    if (params?.seasonId) {
      teamsQuery = teamsQuery.eq('season_id', params.seasonId)
    }

    const { data: teamsData, error: teamsError } = await teamsQuery

    if (teamsError) {
      return { success: false, error: teamsError.message }
    }

    const teams = (teamsData || []).map(t => ({
      id: t.id,
      name: t.name,
      category: t.category,
    }))
    const teamMap = new Map<string, { name: string; category: string }>()
    teams.forEach(t => teamMap.set(t.id, { name: t.name, category: t.category }))

    // 2. Obtener jugadores del club
    const { data: playersData, error: playersError } = await supabase
      .from('players')
      .select('id, first_name, last_name, dorsal, avatar_url, team_id')
      .eq('club_id', clubId)

    if (playersError) {
      return { success: false, error: playersError.message }
    }

    const players = playersData || []
    if (players.length === 0) {
      return {
        success: true,
        records: [],
        teams,
        kpis: {
          totalRecords: 0,
          uniquePlayers: 0,
          totalTeams: teams.length,
          presentes: 0,
          ausentes: 0,
          justificados: 0,
          lesionados: 0,
          retrasos: 0,
          attendanceRate: 0,
        },
        isTruncated: false,
        totalMatched: 0,
      }
    }

    const playerMap = new Map<string, { name: string; dorsal: number | null; avatar: string | null; teamId: string | null }>()
    players.forEach(p => {
      const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Jugador sin nombre'
      playerMap.set(p.id, {
        name: fullName,
        dorsal: p.dorsal,
        avatar: p.avatar_url,
        teamId: p.team_id,
      })
    })

    // Si se especificó playerId o teamId, acotamos los playerIds objetivo para optimizar la consulta
    let targetPlayerIds = players.map(p => p.id)
    if (params?.playerId) {
      targetPlayerIds = [params.playerId]
    } else if (params?.teamId) {
      const teamPlayers = players.filter(p => p.team_id === params.teamId).map(p => p.id)
      if (teamPlayers.length > 0) {
        targetPlayerIds = teamPlayers
      }
    }

    // 3. Obtener registros de asistencia para los jugadores del club
    const clubTeamIds = teams.map(t => t.id)
    const effectiveLimit = params?.limit
      ? Math.min(Math.max(params.limit, 1), 10000)
      : (params?.startDate || params?.endDate || params?.teamId ? 5000 : 2500)

    let rawAttendanceRows: any[] = []
    let totalCount = 0

    // Si se especifica rango de fechas o tipo de actividad, filtramos primero por team_events
    // ya que en el modelo de datos la fecha y el equipo de la sesión residen en team_events
    if (params?.startDate || params?.endDate || (params?.activityType && params.activityType.toLowerCase() !== 'todos')) {
      let eventQuery = supabase
        .from('team_events')
        .select('id, title, event_type, date, team_id')
        .in('team_id', params?.teamId ? [params.teamId] : clubTeamIds)

      if (params?.startDate) {
        eventQuery = eventQuery.gte('date', params.startDate)
      }
      if (params?.endDate) {
        eventQuery = eventQuery.lte('date', params.endDate)
      }
      if (params?.activityType && params.activityType.toLowerCase() !== 'todos') {
        eventQuery = eventQuery.ilike('event_type', `%${params.activityType}%`)
      }

      const { data: eventsData, error: evError } = await eventQuery
      if (evError) {
        return { success: false, error: evError.message }
      }

      const matchingEvents = eventsData || []
      const eventMap = new Map(matchingEvents.map(e => [e.id, e]))
      const eventIds = matchingEvents.map(e => e.id)

      if (eventIds.length > 0) {
        // Consultar attendance por lotes de 150 IDs de evento para respetar los límites de query
        for (let i = 0; i < eventIds.length; i += 150) {
          const chunk = eventIds.slice(i, i + 150)
          const { data: attChunk, error: attChunkErr } = await supabase
            .from('attendance')
            .select(`
              id,
              player_id,
              event_id,
              team_id,
              date,
              status,
              notes,
              created_at
            `)
            .in('player_id', targetPlayerIds)
            .in('event_id', chunk)

          if (attChunkErr) {
            return { success: false, error: attChunkErr.message }
          }

          if (attChunk) {
            attChunk.forEach(r => {
              (r as any).team_events = eventMap.get(r.event_id)
              rawAttendanceRows.push(r)
            })
          }
        }
      }
      totalCount = rawAttendanceRows.length
    } else {
      // Sin rango de fechas específico (ej. temporada completa): paginar para evitar el límite por defecto de 1000 filas de PostgREST
      const pageSize = 1000
      let from = 0

      while (rawAttendanceRows.length < effectiveLimit) {
        let attPageQuery = supabase
          .from('attendance')
          .select(`
            id,
            player_id,
            event_id,
            team_id,
            date,
            status,
            notes,
            created_at,
            team_events (
              id,
              title,
              event_type,
              date,
              team_id
            )
          `, { count: 'exact' })
          .in('player_id', targetPlayerIds)
          .order('created_at', { ascending: false })
          .range(from, from + pageSize - 1)

        const { data: attChunk, error: attPageErr, count: pageTotalCount } = await attPageQuery

        if (attPageErr) {
          return { success: false, error: attPageErr.message }
        }

        if (typeof pageTotalCount === 'number') {
          totalCount = pageTotalCount
        }

        if (!attChunk || attChunk.length === 0) break
        rawAttendanceRows.push(...attChunk)
        if (attChunk.length < pageSize) break
        from += pageSize
      }
    }

    const attendanceData = rawAttendanceRows

    // 4. Mapear, filtrar en memoria y normalizar registros
    const uniquePlayersSet = new Set<string>()
    let presentes = 0
    let ausentes = 0
    let justificados = 0
    let lesionados = 0
    let retrasos = 0

    const records: AttendanceRecordDTO[] = []

    for (const rawRow of (attendanceData || [])) {
      const row = rawRow as any
      const playerInfo = playerMap.get(row.player_id)
      const teamEvent = Array.isArray(row.team_events) ? row.team_events[0] : row.team_events
      const effectiveTeamId = teamEvent?.team_id || row.team_id || playerInfo?.teamId
      const teamInfo = effectiveTeamId ? teamMap.get(effectiveTeamId) : null

      // Validación adicional de equipo
      if (params?.teamId && effectiveTeamId !== params.teamId) {
        continue
      }

      const effectiveDate = (teamEvent?.date ? teamEvent.date.split('T')[0] : null) || (row.date ? row.date.split('T')[0] : null) || (row.created_at ? row.created_at.split('T')[0] : '')

      // Validación adicional de fechas en memoria
      if (params?.startDate && effectiveDate && effectiveDate < params.startDate) {
        continue
      }
      if (params?.endDate && effectiveDate && effectiveDate > params.endDate) {
        continue
      }

      const eventTitle = teamEvent?.title || (teamEvent?.event_type ? `${teamEvent.event_type}` : 'Sesión general')
      const evType = teamEvent?.event_type || 'Otro'

      // Filtro por tipo de actividad (Entrenamiento, Partido, etc.)
      if (params?.activityType && params.activityType.toLowerCase() !== 'todos') {
        if (evType.toLowerCase() !== params.activityType.toLowerCase()) {
          continue
        }
      }

      const normStatus = normalizeStatus(row.status)
      if (normStatus === 'presente') presentes++
      else if (normStatus === 'ausente') ausentes++
      else if (normStatus === 'justificado') justificados++
      else if (normStatus === 'lesionado') lesionados++
      else if (normStatus === 'retraso') retrasos++

      uniquePlayersSet.add(row.player_id)

      records.push({
        id: row.id,
        playerId: row.player_id,
        playerName: playerInfo?.name || 'Desconocido',
        playerDorsal: playerInfo?.dorsal ?? null,
        playerAvatar: playerInfo?.avatar ?? null,
        teamId: effectiveTeamId || null,
        teamName: teamInfo?.name || 'Sin equipo asignado',
        teamCategory: teamInfo?.category || '-',
        date: effectiveDate,
        status: normStatus,
        rawStatus: row.status,
        eventName: eventTitle,
        activityType: evType,
        notes: row.notes || null,
      })
    }

    const totalRecords = records.length
    const attendanceRate = totalRecords > 0 ? Math.round((presentes / totalRecords) * 100) : 0

    const kpis: AttendanceKPIs = {
      totalRecords,
      uniquePlayers: uniquePlayersSet.size,
      totalTeams: teams.length,
      presentes,
      ausentes,
      justificados,
      lesionados,
      retrasos,
      attendanceRate,
    }

    const isTruncated = typeof totalCount === 'number' ? totalCount > records.length : false

    return {
      success: true,
      records,
      teams,
      kpis,
      isTruncated,
      totalMatched: typeof totalCount === 'number' ? totalCount : totalRecords,
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error al obtener asistencia global' }
  }
}
