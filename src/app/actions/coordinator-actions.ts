'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthenticatedContext, ADMIN_ROLES, getEffectiveSelectedSeasonId, canUserAccessModule } from '@/lib/auth-helpers'

export interface CoordinatorTeamSummary {
  teamId: string
  teamName: string
  teamCategory: string
  teamColor: string | null
  coachName: string | null
  playersCount: number
  injuredPlayersCount: number
  nextMatchDate: string | null
  nextMatchRival: string | null
  lastMatchResult: string | null
  lastMatchScore: string | null
}

export interface CoordinatorUpcomingMatch {
  id: string
  fechaHora: string
  rivalNombre: string
  lugar: string | null
  esLocal: boolean
  estado: string
  teamId: string
  teamName: string
  teamCategory: string
  teamColor: string | null
  convocadosCount: number
}

export interface CoordinatorAlert {
  type: 'sin_entrenador' | 'sin_convocatoria' | 'plantilla_corta' | 'jugador_apercibido' | 'lesion_activa'
  teamId?: string
  teamName?: string
  playerId?: string
  playerName?: string
  message: string
  severity: 'warning' | 'error' | 'info'
}

export interface CoordinatorDashboardData {
  club: { id: string; name: string; logoUrl: string | null }
  activeSeason: { id: string; name: string; isActive: boolean }
  kpis: {
    totalTeams: number
    totalPlayers: number
    activeInjuries: number
    upcomingMatchesCount: number
    apercibidosCount: number
  }
  alerts: CoordinatorAlert[]
  teams: CoordinatorTeamSummary[]
  upcomingMatches: CoordinatorUpcomingMatch[]
  todayEvents: Array<{
    id: string
    title: string
    date: string
    startTime: string
    endTime: string | null
    location: string | null
    teamName: string
    eventType: string
  }>
}

/**
 * Obtiene todos los datos necesarios para el Panel del Coordinador.
 * Solo lectura. Estrictamente aislado por club_id de sesión.
 */
export async function getCoordinatorDashboardAction(overrideSeasonId?: string): Promise<{
  success: boolean
  data?: CoordinatorDashboardData
  error?: string
}> {
  try {
    const { context, error: authError } = await getAuthenticatedContext()
    if (!context || authError) {
      return { success: false, error: authError || 'No autenticado' }
    }

    const effectiveRole = context.realAdminRole || context.profile.role
    const userRoles = context.profile.roles || []
    const hasCoordRole = effectiveRole === 'coordinador' || userRoles.includes('coordinador')
    const isAdmin = effectiveRole === 'admin' || effectiveRole === 'superadmin' || userRoles.includes('admin') || userRoles.includes('superadmin')

    if (!hasCoordRole && !isAdmin) {
      return { success: false, error: 'No tienes permisos para acceder al panel de coordinador' }
    }

    const adminClient = createAdminClient()
    const access = await canUserAccessModule(adminClient, context, 'panel_coordinador')
    if (!access.allowed) {
      return { success: false, error: access.reason || 'No tienes permisos configurados para este módulo' }
    }

    const clubId = context.profile.club_id

    // 1. Club info
    const { data: club } = await adminClient
      .from('clubs')
      .select('id, name, logo_url')
      .eq('id', clubId)
      .single()

    // 2. Temporada efectiva
    const { seasonId, seasonName, isActive } = await getEffectiveSelectedSeasonId(
      adminClient,
      clubId,
      overrideSeasonId
    )

    // 3. Equipos del club en la temporada
    let teamsQuery = adminClient
      .from('teams')
      .select('id, name, category, color')
      .eq('club_id', clubId)

    if (seasonId) {
      teamsQuery = teamsQuery.eq('season_id', seasonId)
    }

    const { data: teamsData } = await teamsQuery.order('name')
    const teams = teamsData || []
    const teamIds = teams.map(t => t.id)

    if (teamIds.length === 0) {
      return {
        success: true,
        data: {
          club: { id: clubId, name: club?.name || 'Club', logoUrl: club?.logo_url || null },
          activeSeason: { id: seasonId, name: seasonName || 'Temporada', isActive },
          kpis: { totalTeams: 0, totalPlayers: 0, activeInjuries: 0, upcomingMatchesCount: 0, apercibidosCount: 0 },
          alerts: [],
          teams: [],
          upcomingMatches: [],
          todayEvents: [],
        }
      }
    }

    // 4. Entrenadores asignados a cada equipo
    const { data: coachAssignments } = await adminClient
      .from('team_coaches')
      .select('team_id, profiles:profile_id(first_name, last_name)')
      .in('team_id', teamIds)

    const coachByTeam = new Map<string, string>()
    ;(coachAssignments || []).forEach((ca: any) => {
      if (!coachByTeam.has(ca.team_id) && ca.profiles) {
        coachByTeam.set(
          ca.team_id,
          `${ca.profiles.first_name || ''} ${ca.profiles.last_name || ''}`.trim()
        )
      }
    })

    // 5. Jugadores por equipo (de player_season_history si hay temporada, sino de players.team_id)
    let playersByTeam = new Map<string, number>()
    if (seasonId) {
      const { data: pshRows } = await adminClient
        .from('player_season_history')
        .select('player_id, team_id')
        .eq('season_id', seasonId)
        .in('team_id', teamIds)

      ;(pshRows || []).forEach((r: any) => {
        const count = playersByTeam.get(r.team_id) || 0
        playersByTeam.set(r.team_id, count + 1)
      })
    } else {
      const { data: playersData } = await adminClient
        .from('players')
        .select('team_id')
        .eq('club_id', clubId)
        .in('team_id', teamIds)
        .neq('status', 'inactive')

      ;(playersData || []).forEach((p: any) => {
        if (!p.team_id) return
        const count = playersByTeam.get(p.team_id) || 0
        playersByTeam.set(p.team_id, count + 1)
      })
    }

    const totalPlayers = Array.from(playersByTeam.values()).reduce((s, v) => s + v, 0)

    // 6. Lesiones activas
    const { data: injuriesData } = await adminClient
      .from('player_injuries')
      .select('player_id, players:player_id(team_id)')
      .eq('club_id', clubId)
      .eq('status', 'activa')

    const injuredByTeam = new Map<string, number>()
    ;(injuriesData || []).forEach((inj: any) => {
      const tid = (inj.players as any)?.team_id
      if (tid && teamIds.includes(tid)) {
        const count = injuredByTeam.get(tid) || 0
        injuredByTeam.set(tid, count + 1)
      }
    })
    const activeInjuries = (injuriesData || []).length

    // 7. Próximos partidos (7 días)
    const now = new Date()
    const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: upcomingMatchesRaw } = await adminClient
      .from('partidos')
      .select('id, equipo_id, rival_nombre, fecha_hora, lugar, estado')
      .eq('club_id', clubId)
      .in('equipo_id', teamIds)
      .gte('fecha_hora', yesterday)
      .lte('fecha_hora', sevenDaysLater)
      .order('fecha_hora', { ascending: true })
      .limit(20)

    // 8. Convocados por partido
    const upcomingMatchIds = (upcomingMatchesRaw || []).map(m => m.id)
    let convocadosByMatch = new Map<string, number>()
    if (upcomingMatchIds.length > 0) {
      const { data: convData } = await adminClient
        .from('convocatorias')
        .select('partido_id')
        .in('partido_id', upcomingMatchIds)
        .neq('status', 'no_convocado')

      ;(convData || []).forEach((c: any) => {
        const count = convocadosByMatch.get(c.partido_id) || 0
        convocadosByMatch.set(c.partido_id, count + 1)
      })
    }

    // 9. Último partido por equipo
    const { data: lastMatchesRaw } = await adminClient
      .from('partidos')
      .select('id, equipo_id, rival_nombre, resultado_propio, resultado_rival, fecha_hora')
      .eq('club_id', clubId)
      .in('equipo_id', teamIds)
      .not('resultado_propio', 'is', null)
      .order('fecha_hora', { ascending: false })
      .limit(teamIds.length * 2)

    const lastMatchByTeam = new Map<string, { rival: string; score: string; result: string }>()
    ;(lastMatchesRaw || []).forEach((m: any) => {
      if (!lastMatchByTeam.has(m.equipo_id) && m.resultado_propio !== null && m.resultado_rival !== null) {
        const gf = m.resultado_propio
        const ga = m.resultado_rival
        const result = gf > ga ? 'V' : gf === ga ? 'E' : 'D'
        lastMatchByTeam.set(m.equipo_id, {
          rival: m.rival_nombre || 'Rival',
          score: `${gf}-${ga}`,
          result
        })
      }
    })

    // 10. Alertas operativas
    const alerts: CoordinatorAlert[] = []

    // Equipo sin entrenador
    teams.forEach(t => {
      if (!coachByTeam.has(t.id)) {
        alerts.push({
          type: 'sin_entrenador',
          teamId: t.id,
          teamName: t.name,
          message: `${t.name} no tiene entrenador asignado`,
          severity: 'error'
        })
      }
    })

    // Partido próximo sin convocatoria (menos de 5 convocados)
    ;(upcomingMatchesRaw || []).forEach(m => {
      const conv = convocadosByMatch.get(m.id) || 0
      if (conv < 5) {
        const team = teams.find(t => t.id === m.equipo_id)
        const fecha = m.fecha_hora ? new Date(m.fecha_hora).toLocaleDateString('es-ES', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Próximamente'
        alerts.push({
          type: 'sin_convocatoria',
          teamId: m.equipo_id,
          teamName: team?.name || 'Equipo',
          message: `${team?.name || 'Equipo'} tiene un partido el ${fecha} con solo ${conv} convocados`,
          severity: conv === 0 ? 'error' : 'warning'
        })
      }
    })

    // Equipo con plantilla corta (<10 jugadores)
    teams.forEach(t => {
      const count = playersByTeam.get(t.id) || 0
      if (count < 10 && count > 0) {
        alerts.push({
          type: 'plantilla_corta',
          teamId: t.id,
          teamName: t.name,
          message: `${t.name} tiene solo ${count} jugadores en plantilla`,
          severity: 'warning'
        })
      }
    })

    // 11. Apercibidos (con 4 amarillas acumuladas en la temporada disputada)
    // Se consultan todos los partidos finalizados/disputados de la temporada para los equipos del club
    const { data: seasonPlayedMatches } = await adminClient
      .from('partidos')
      .select('id')
      .eq('club_id', clubId)
      .in('equipo_id', teamIds)
      .or('estado.eq.Finalizado,resultado_propio.not.is.null');

    const playedMatchIds = (seasonPlayedMatches || []).map(m => m.id);

    let apercibidosCount = 0;
    if (playedMatchIds.length > 0) {
      const { data: yellConvData } = await adminClient
        .from('convocatorias')
        .select('player_id, yellow_cards, tarjetas_amarillas, players:player_id(id, first_name, last_name, team_id, teams:team_id(name))')
        .in('partido_id', playedMatchIds)
        .or('yellow_cards.gt.0,tarjetas_amarillas.gt.0');

      const yellowsByPlayer = new Map<string, { id: string; name: string; teamName: string; yellows: number }>();
      (yellConvData || []).forEach((c: any) => {
        const p = c.players;
        if (!p || !c.player_id) return;
        const pid = c.player_id;
        const yellows = Number(c.yellow_cards ?? c.tarjetas_amarillas ?? 0);
        if (yellows <= 0) return;

        const existing = yellowsByPlayer.get(pid) || {
          id: pid,
          name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
          teamName: (p.teams as any)?.name || 'Equipo',
          yellows: 0
        };
        existing.yellows += yellows;
        yellowsByPlayer.set(pid, existing);
      });

      yellowsByPlayer.forEach((p) => {
        if (p.yellows > 0 && p.yellows % 5 === 4) {
          apercibidosCount++;
          alerts.push({
            type: 'jugador_apercibido',
            playerId: p.id,
            playerName: p.name,
            teamName: p.teamName,
            message: `${p.name} (${p.teamName}) está apercibido (${p.yellows} amarillas acumuladas)`,
            severity: 'warning'
          });
        }
      });
    }

    // 12. Eventos de hoy
    const todayStr = now.toISOString().split('T')[0]
    const { data: todayEventsRaw } = await adminClient
      .from('team_events')
      .select('id, title, event_type, date, start_time, end_time, location, team_id, teams:team_id(name)')
      .in('team_id', teamIds)
      .eq('date', todayStr)
      .order('start_time', { ascending: true })

    const todayEvents = (todayEventsRaw || []).map((e: any) => ({
      id: e.id,
      title: e.title || e.event_type || 'Evento',
      date: e.date,
      startTime: (e.start_time || '').substring(0, 5),
      endTime: e.end_time ? e.end_time.substring(0, 5) : null,
      location: e.location || null,
      teamName: e.teams?.name || 'Equipo',
      eventType: e.event_type || 'Entrenamiento'
    }))

    // 13. Construir resúmenes de equipo
    const nextMatchByTeam = new Map<string, { date: string; rival: string }>()
    ;(upcomingMatchesRaw || []).forEach(m => {
      if (!nextMatchByTeam.has(m.equipo_id)) {
        nextMatchByTeam.set(m.equipo_id, {
          date: m.fecha_hora,
          rival: m.rival_nombre || 'Rival'
        })
      }
    })

    const teamSummaries: CoordinatorTeamSummary[] = teams.map(t => {
      const lastMatch = lastMatchByTeam.get(t.id)
      const nextMatch = nextMatchByTeam.get(t.id)
      return {
        teamId: t.id,
        teamName: t.name,
        teamCategory: t.category || '',
        teamColor: t.color || null,
        coachName: coachByTeam.get(t.id) || null,
        playersCount: playersByTeam.get(t.id) || 0,
        injuredPlayersCount: injuredByTeam.get(t.id) || 0,
        nextMatchDate: nextMatch?.date || null,
        nextMatchRival: nextMatch?.rival || null,
        lastMatchResult: lastMatch?.result || null,
        lastMatchScore: lastMatch?.score || null,
      }
    })

    // 14. Upcoming matches con datos de equipo
    const upcomingMatchesMapped: CoordinatorUpcomingMatch[] = (upcomingMatchesRaw || []).map(m => {
      const team = teams.find(t => t.id === m.equipo_id)
      const esLocal = m.lugar === 'Local' || !/\b(fuera|visitante)\b/i.test(m.lugar || '')
      return {
        id: m.id,
        fechaHora: m.fecha_hora,
        rivalNombre: m.rival_nombre || 'Rival por definir',
        lugar: m.lugar || null,
        esLocal,
        estado: m.estado || 'Programado',
        teamId: m.equipo_id,
        teamName: team?.name || 'Equipo',
        teamCategory: team?.category || '',
        teamColor: team?.color || null,
        convocadosCount: convocadosByMatch.get(m.id) || 0,
      }
    })

    return {
      success: true,
      data: {
        club: { id: clubId, name: club?.name || 'Club', logoUrl: club?.logo_url || null },
        activeSeason: { id: seasonId, name: seasonName || 'Temporada', isActive },
        kpis: {
          totalTeams: teams.length,
          totalPlayers,
          activeInjuries,
          upcomingMatchesCount: upcomingMatchesMapped.length,
          apercibidosCount,
        },
        alerts: alerts.sort((a, b) => {
          const order = { error: 0, warning: 1, info: 2 }
          return order[a.severity] - order[b.severity]
        }),
        teams: teamSummaries,
        upcomingMatches: upcomingMatchesMapped,
        todayEvents,
      }
    }
  } catch (err: any) {
    console.error('Error in getCoordinatorDashboardAction:', err)
    return { success: false, error: err?.message || 'Error al cargar el panel del coordinador' }
  }
}
