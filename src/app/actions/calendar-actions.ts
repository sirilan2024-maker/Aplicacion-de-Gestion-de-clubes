'use server'

import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedContext, ADMIN_ROLES } from '@/lib/auth-helpers'

export interface GlobalCalendarEventDTO {
  id: string
  title: string
  type: 'Partido' | 'Entrenamiento' | 'Reunión' | 'Otro'
  date: string // yyyy-MM-dd
  startTime: string // HH:mm
  endTime?: string
  location?: string
  teamId: string
  teamName: string
  teamCategory: string
  isOfficialMatch?: boolean
  matchStatus?: string
  score?: string
  notes?: string
}

export interface CalendarMonthKPIs {
  totalEvents: number
  totalMatches: number
  totalTrainings: number
  totalOther: number
}

export interface GlobalCalendarResponse {
  success: boolean
  error?: string
  events?: GlobalCalendarEventDTO[]
  teams?: Array<{ id: string; name: string; category: string }>
  kpis?: CalendarMonthKPIs
}

export async function getGlobalCalendarAction(params?: {
  startDate?: string
  endDate?: string
  teamId?: string
}): Promise<GlobalCalendarResponse> {
  try {
    const { context, error: authError } = await getAuthenticatedContext()
    if (authError || !context) {
      return { success: false, error: 'No autorizado' }
    }

    const { profile } = context
    const clubId = profile.club_id
    const allowedRoles = [...ADMIN_ROLES, 'metodologo', 'entrenador']
    if (!allowedRoles.includes(profile.role)) {
      return { success: false, error: 'Permisos insuficientes para consultar el calendario global' }
    }

    const supabase = await createClient()

    // 1. Obtener los equipos del club
    const { data: teamsData, error: teamsError } = await supabase
      .from('teams')
      .select('id, name, category')
      .eq('club_id', clubId)

    if (teamsError) {
      return { success: false, error: teamsError.message }
    }

    const teams = teamsData || []
    const teamMap = new Map<string, { name: string; category: string }>()
    teams.forEach(t => teamMap.set(t.id, { name: t.name, category: t.category }))
    const allTeamIds = teams.map(t => t.id)

    if (allTeamIds.length === 0) {
      return {
        success: true,
        events: [],
        teams: [],
        kpis: { totalEvents: 0, totalMatches: 0, totalTrainings: 0, totalOther: 0 }
      }
    }

    // Filtrar por equipo si se solicita y pertenece al club
    const targetTeamIds = params?.teamId && params.teamId !== 'todos'
      ? allTeamIds.filter(id => id === params.teamId)
      : allTeamIds

    // 2. Consultar eventos de equipo (team_events)
    let eventsQuery = supabase
      .from('team_events')
      .select('id, team_id, event_type, date, start_time, end_time, location, title, notes')
      .in('team_id', targetTeamIds)

    if (params?.startDate) {
      eventsQuery = eventsQuery.gte('date', params.startDate)
    }
    if (params?.endDate) {
      eventsQuery = eventsQuery.lte('date', params.endDate)
    }

    const { data: teamEventsData, error: eventsError } = await eventsQuery
    if (eventsError) {
      return { success: false, error: eventsError.message }
    }

    // 3. Consultar partidos oficiales (partidos)
    let partidosQuery = supabase
      .from('partidos')
      .select('id, equipo_id, rival_nombre, fecha_hora, lugar, estado, resultado_propio, resultado_rival')
      .eq('club_id', clubId)
      .in('equipo_id', targetTeamIds)

    if (params?.startDate) {
      partidosQuery = partidosQuery.gte('fecha_hora', `${params.startDate}T00:00:00`)
    }
    if (params?.endDate) {
      partidosQuery = partidosQuery.lte('fecha_hora', `${params.endDate}T23:59:59`)
    }

    const { data: partidosData, error: partidosError } = await partidosQuery
    if (partidosError) {
      return { success: false, error: partidosError.message }
    }

    // 4. Unificar eventos y evitar duplicados de partidos existentes en ambas tablas
    const mergedEvents: GlobalCalendarEventDTO[] = []
    const seenMatchDatesByTeam = new Set<string>()

    // Procesar team_events
    ;(teamEventsData || []).forEach(ev => {
      const teamInfo = teamMap.get(ev.team_id)
      const evType = (ev.event_type || 'Entrenamiento') as GlobalCalendarEventDTO['type']

      if (evType === 'Partido') {
        seenMatchDatesByTeam.add(`${ev.team_id}_${ev.date}`)
      }

      mergedEvents.push({
        id: ev.id,
        title: ev.title || `${evType} - ${teamInfo?.name || 'Equipo'}`,
        type: evType,
        date: ev.date,
        startTime: ev.start_time ? ev.start_time.substring(0, 5) : '18:00',
        endTime: ev.end_time ? ev.end_time.substring(0, 5) : undefined,
        location: ev.location || undefined,
        teamId: ev.team_id,
        teamName: teamInfo?.name || 'Equipo',
        teamCategory: teamInfo?.category || '-',
        isOfficialMatch: evType === 'Partido',
        notes: ev.notes || undefined
      })
    })

    // Procesar partidos
    ;(partidosData || []).forEach(p => {
      if (!p.fecha_hora) return
      const dt = new Date(p.fecha_hora)
      const dateStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
      
      // Si ya está registrado en team_events para ese mismo equipo en esa fecha, evitar duplicarlo
      if (seenMatchDatesByTeam.has(`${p.equipo_id}_${dateStr}`)) return

      const timeStr = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`
      const teamInfo = teamMap.get(p.equipo_id)

      let scoreStr: string | undefined
      if (p.resultado_propio !== null && p.resultado_rival !== null) {
        scoreStr = `${p.resultado_propio} - ${p.resultado_rival}`
      }

      mergedEvents.push({
        id: p.id,
        title: `vs ${p.rival_nombre || 'Rival'}`,
        type: 'Partido',
        date: dateStr,
        startTime: timeStr,
        location: p.lugar || undefined,
        teamId: p.equipo_id,
        teamName: teamInfo?.name || 'Equipo',
        teamCategory: teamInfo?.category || '-',
        isOfficialMatch: true,
        matchStatus: p.estado || 'Pendiente',
        score: scoreStr,
        notes: p.estado ? `Estado: ${p.estado}` : undefined
      })
    })

    // Ordenar cronológicamente
    mergedEvents.sort((a, b) => {
      const dtA = new Date(`${a.date}T${a.startTime}:00`).getTime()
      const dtB = new Date(`${b.date}T${b.startTime}:00`).getTime()
      return dtA - dtB
    })

    // 5. KPIs del período consultado
    let totalMatches = 0
    let totalTrainings = 0
    let totalOther = 0

    mergedEvents.forEach(e => {
      if (e.type === 'Partido') totalMatches++
      else if (e.type === 'Entrenamiento') totalTrainings++
      else totalOther++
    })

    const kpis: CalendarMonthKPIs = {
      totalEvents: mergedEvents.length,
      totalMatches,
      totalTrainings,
      totalOther
    }

    return {
      success: true,
      events: mergedEvents,
      teams,
      kpis
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error al obtener el calendario global' }
  }
}
