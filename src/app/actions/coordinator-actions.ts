'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthenticatedContext, ADMIN_ROLES, getEffectiveSelectedSeasonId, canUserAccessModule } from '@/lib/auth-helpers'
import { NotificationService } from '@/lib/notifications/notification-service'
import { findRivalShield } from '@/lib/ffcv/rival-shields'

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
  convocadosCount?: number
  resultadoPropio?: number | null
  resultadoRival?: number | null
  jornada?: number
}

export interface CoordinatorAlert {
  type: 'sin_entrenador' | 'sin_convocatoria' | 'plantilla_corta' | 'jugador_apercibido' | 'lesion_activa' | 'jugador_sancionado'
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
    activePlayers: number
    activeTeams: number
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
  sports: {
    totalPlayedMatches: number
    wins: number
    draws: number
    losses: number
    goalsFor: number
    goalsAgainst: number
    globalWinRate: number
    points: number
    possiblePoints: number
    pointsPercentage: number
    attendanceRate: number
    topScorer?: {
      playerId: string
      playerName: string
      goals: number
      teamName: string
    } | null
    topMinutes?: {
      playerId: string
      playerName: string
      minutesPlayed: number
      teamName: string
    } | null
    teamStats?: Array<{
      teamId: string
      teamName: string
      teamCategory: string
      competitionName?: string
      groupName?: string
      currentPosition?: number
      totalTeamsInGroup?: number
      matchesPlayed: number
      wins: number
      draws: number
      losses: number
      goalsFor: number
      goalsAgainst: number
      goalDiff: number
      points: number
      winRate: number
    }>
  }
  injuries: {
    activeInjuriesCount: number
    activeInjuriesList: Array<{
      id: string
      playerId: string
      playerName: string
      teamId?: string | null
      teamName?: string
      injuryType: string
      injuryDate?: string
      status: string
      severity?: string
      bodyRegion?: string
      bodyStructure?: string
      laterality?: string
      rtsPhase?: string
      daysInjured?: number
      formattedRecoveryTime?: string
    }>
  }
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
      .select('id, name, category, color, ffcv_group_id, ffcv_team_id, season_id')
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
          kpis: { totalTeams: 0, totalPlayers: 0, activePlayers: 0, activeTeams: 0, activeInjuries: 0, upcomingMatchesCount: 0, apercibidosCount: 0 },
          alerts: [],
          teams: [],
          upcomingMatches: [],
          todayEvents: [],
          sports: {
            totalPlayedMatches: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            globalWinRate: 0,
            points: 0,
            possiblePoints: 0,
            pointsPercentage: 0,
            attendanceRate: 100,
            topScorer: null,
            topMinutes: null,
            teamStats: [],
          },
          injuries: {
            activeInjuriesCount: 0,
            activeInjuriesList: [],
          },
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

    // 5. Jugadores por equipo (de player_season_history si hay temporada, con fallback/complemento a players.team_id)
    let playersByTeam = new Map<string, number>()
    let playerToTeamMap = new Map<string, string>()

    // Consultamos los jugadores directos del club asignados a estos equipos
    const { data: directPlayers } = await adminClient
      .from('players')
      .select('id, team_id, posicion, status')
      .eq('club_id', clubId)
      .in('team_id', teamIds)

    const directPlayersMap = new Map((directPlayers || []).map(p => [p.id, p]))

    if (seasonId) {
      const { data: pshRows } = await adminClient
        .from('player_season_history')
        .select('player_id, team_id, posicion')
        .eq('season_id', seasonId)
        .in('team_id', teamIds)

      ;(pshRows || []).forEach((r: any) => {
        const p = directPlayersMap.get(r.player_id)
        const isInactive = p?.status === 'inactive' || p?.status === 'inactivo' || p?.status === 'baja'
        const isCoach = (r.posicion || p?.posicion || '').toLowerCase().includes('entrenador')
        if (!isInactive && !isCoach && r.team_id) {
          playerToTeamMap.set(r.player_id, r.team_id)
        }
      })
    }

    // Complementar con jugadores asignados directamente al equipo en players
    ;(directPlayers || []).forEach((p: any) => {
      const isInactive = p?.status === 'inactive' || p?.status === 'inactivo' || p?.status === 'baja'
      const isCoach = (p.posicion || '').toLowerCase().includes('entrenador')
      if (!isInactive && !isCoach && p.team_id && !playerToTeamMap.has(p.id)) {
        playerToTeamMap.set(p.id, p.team_id)
      }
    })

    playerToTeamMap.forEach((tid) => {
      const count = playersByTeam.get(tid) || 0
      playersByTeam.set(tid, count + 1)
    })

    const totalPlayers = Array.from(playersByTeam.values()).reduce((s, v) => s + v, 0)

    // 6. Lesiones activas (estrictamente filtradas por los jugadores de los equipos de la temporada activa)
    const activePlayerIds = Array.from(playerToTeamMap.keys())
    const injuredByTeam = new Map<string, number>()
    let activeInjuries = 0
    const activeInjuriesList: Array<any> = []

    if (activePlayerIds.length > 0) {
      const { data: rawInjuries } = await adminClient
        .from('player_injuries')
        .select(`
          id, player_id, injury_type, diagnosis, start_date, expected_return_date,
          severity, status, body_region, body_structure, laterality, rts_phase,
          players:player_id ( first_name, last_name, team_id, teams:team_id(name) )
        `)
        .eq('club_id', clubId)
        .eq('status', 'activa')
        .in('player_id', activePlayerIds)

      ;(rawInjuries || []).forEach((inj: any) => {
        const p = inj.players
        const pName = p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : 'Jugador'
        const tName = p?.teams?.name || 'Equipo'
        const tid = playerToTeamMap.get(inj.player_id) || p?.team_id
        if (tid && teamIds.includes(tid)) {
          const count = injuredByTeam.get(tid) || 0
          injuredByTeam.set(tid, count + 1)
          activeInjuries++
        }
        const daysInjured = inj.start_date
          ? Math.floor((Date.now() - new Date(inj.start_date).getTime()) / (1000 * 60 * 60 * 24))
          : 0

        activeInjuriesList.push({
          id: inj.id,
          playerId: inj.player_id,
          playerName: pName,
          teamId: tid,
          teamName: tName,
          injuryType: inj.injury_type || inj.diagnosis || 'Lesión activa',
          injuryDate: inj.start_date || new Date().toISOString(),
          status: 'active',
          severity: inj.severity || 'Moderada',
          bodyRegion: inj.body_region,
          bodyStructure: inj.body_structure,
          laterality: inj.laterality,
          rtsPhase: inj.rts_phase,
          daysInjured,
          formattedRecoveryTime: inj.expected_return_date
            ? `Estimado: ${new Date(inj.expected_return_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`
            : 'En recuperación'
        })
      })

      // Complementar con players.injury_description si hay alguno no registrado en player_injuries
      const { data: playersWithNotes } = await adminClient
        .from('players')
        .select('id, first_name, last_name, injury_description, team_id, teams:team_id(name)')
        .eq('club_id', clubId)
        .in('id', activePlayerIds)
        .not('injury_description', 'is', null)

      ;(playersWithNotes || []).forEach((p: any) => {
        if (!p.injury_description || p.injury_description.trim().length === 0) return
        const cleanDesc = p.injury_description.trim().toLowerCase()
        if (['no', 'ninguna', 'nada', '-', 'bien', 'ninguno', '0', 'sin lesiones', 'no tiene'].includes(cleanDesc)) return
        if (activeInjuriesList.some(i => i.playerId === p.id)) return

        const tid = playerToTeamMap.get(p.id) || p.team_id
        if (tid && teamIds.includes(tid)) {
          const count = injuredByTeam.get(tid) || 0
          injuredByTeam.set(tid, count + 1)
          activeInjuries++
        }
        activeInjuriesList.push({
          id: p.id,
          playerId: p.id,
          playerName: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
          teamId: tid,
          teamName: p.teams?.name || 'Equipo',
          injuryType: p.injury_description,
          injuryDate: new Date().toISOString(),
          status: 'active',
          severity: 'Leve',
          formattedRecoveryTime: 'Seguimiento médico'
        })
      })
    }

    // 7. Próximos partidos (7 días)
    const now = new Date()
    const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: upcomingMatchesRaw } = await adminClient
      .from('partidos')
      .select('id, equipo_id, rival_nombre, fecha_hora, lugar, estado')
      .eq('club_id', clubId)
      .in('equipo_id', teamIds)
      .neq('season_id', '584f508a-fc1a-4339-b5b2-4296ffde2f4c')
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
      .neq('season_id', '584f508a-fc1a-4339-b5b2-4296ffde2f4c')
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

    // 11. Disciplina: Sancionados y Apercibidos
    let seasonPlayedQuery = adminClient
      .from('partidos')
      .select('id, equipo_id, fecha_hora')
      .eq('club_id', clubId)
      .in('equipo_id', teamIds)
      .neq('season_id', '584f508a-fc1a-4339-b5b2-4296ffde2f4c')
      .or('estado.eq.Finalizado,resultado_propio.not.is.null')
      .order('fecha_hora', { ascending: true });

    if (seasonId) {
      seasonPlayedQuery = seasonPlayedQuery.eq('season_id', seasonId);
    }

    const { data: seasonPlayedMatches } = await seasonPlayedQuery;
    const playedMatchesListChronological = seasonPlayedMatches || [];
    const playedMatchIds = playedMatchesListChronological.map(m => m.id);

    // Identificar el último partido disputado por cada equipo
    const lastPlayedMatchByTeam = new Map<string, string>();
    playedMatchesListChronological.forEach(m => {
      lastPlayedMatchByTeam.set(m.equipo_id, m.id);
    });

    let apercibidosCount = 0;
    if (playedMatchIds.length > 0) {
      const { data: cardConvData } = await adminClient
        .from('convocatorias')
        .select(`
          player_id, partido_id, yellow_cards, tarjetas_amarillas, red_cards, tarjetas_rojas,
          partidos:partido_id(id, fecha_hora, equipo_id),
          players:player_id(id, first_name, last_name, team_id, teams:team_id(name))
        `)
        .in('partido_id', playedMatchIds)
        .or('yellow_cards.gt.0,tarjetas_amarillas.gt.0,red_cards.gt.0,tarjetas_rojas.gt.0');

      // Agrupar eventos por jugador cronológicamente
      const eventsByPlayer = new Map<string, { player: any; events: any[] }>();
      (cardConvData || []).forEach((c: any) => {
        const p = c.players;
        if (!p || !c.player_id) return;
        const pid = c.player_id;
        const yellow = Number(c.yellow_cards ?? c.tarjetas_amarillas ?? 0);
        const red = Number(c.red_cards ?? c.tarjetas_rojas ?? 0);
        if (yellow <= 0 && red <= 0) return;

        const existing = eventsByPlayer.get(pid) || {
          player: {
            id: pid,
            name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
            teamId: p.team_id,
            teamName: (p.teams as any)?.name || 'Equipo',
          },
          events: []
        };
        existing.events.push({
          partido_id: c.partido_id,
          fecha_hora: (c.partidos as any)?.fecha_hora,
          equipo_id: (c.partidos as any)?.equipo_id || p.team_id,
          yellow,
          red,
        });
        eventsByPlayer.set(pid, existing);
      });

      eventsByPlayer.forEach(({ player, events }) => {
        const sortedEvents = events.sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime());
        const lastTeamMatchId = lastPlayedMatchByTeam.get(player.teamId);

        let cycleCards = 0;
        let isPendingSanction = false;
        let sanctionReason = '';

        sortedEvents.forEach(evt => {
          const isLastMatch = evt.partido_id === lastTeamMatchId;

          if (evt.yellow === 2 || (evt.red > 0 && evt.yellow > 0)) {
            if (isLastMatch) {
              isPendingSanction = true;
              sanctionReason = 'Doble amarilla (1 partido)';
            }
          } else if (evt.red > 0 && evt.yellow === 0) {
            if (isLastMatch) {
              isPendingSanction = true;
              sanctionReason = 'Roja directa (1 partido)';
            }
          } else if (evt.yellow === 1) {
            cycleCards += 1;
            if (cycleCards === 5) {
              cycleCards = 0;
              if (isLastMatch) {
                isPendingSanction = true;
                sanctionReason = 'Ciclo de 5 amarillas acumuladas';
              }
            }
          }
        });

        if (isPendingSanction) {
          apercibidosCount++;
          alerts.push({
            type: 'jugador_sancionado',
            teamId: player.teamId,
            teamName: player.teamName,
            playerId: player.id,
            playerName: player.name,
            message: `${player.name} (${player.teamName}) está sancionado para el próximo partido (${sanctionReason})`,
            severity: 'error'
          });
        } else if (cycleCards === 4) {
          apercibidosCount++;
          alerts.push({
            type: 'jugador_apercibido',
            teamId: player.teamId,
            teamName: player.teamName,
            playerId: player.id,
            playerName: player.name,
            message: `${player.name} (${player.teamName}) está apercibido (${cycleCards} amarillas acumuladas)`,
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

    // 15. Motor deportivo consolidado (Situación Deportiva)
    let allMatchesQuery = adminClient
      .from('partidos')
      .select('id, estado, resultado_propio, resultado_rival, equipo_id, rival_nombre, lugar, fecha_hora')
      .in('equipo_id', teamIds.length > 0 ? teamIds : ['00000000-0000-0000-0000-000000000000'])
      .neq('season_id', '584f508a-fc1a-4339-b5b2-4296ffde2f4c')
      .order('fecha_hora', { ascending: false })

    if (seasonId) {
      allMatchesQuery = allMatchesQuery.eq('season_id', seasonId)
    }

    const { data: allSeasonMatches } = await allMatchesQuery
    const playedMatchesList = (allSeasonMatches || []).filter(
      p => p.estado === 'Finalizado' || (p.resultado_propio !== null && p.resultado_rival !== null)
    )

    let totalPlayed = playedMatchesList.length
    let wins = 0
    let draws = 0
    let losses = 0
    let goalsFor = 0
    let goalsAgainst = 0
    const teamMatchMap = new Map<string, typeof playedMatchesList>()

    playedMatchesList.forEach(p => {
      const list = teamMatchMap.get(p.equipo_id) || []
      list.push(p)
      teamMatchMap.set(p.equipo_id, list)

      goalsFor += p.resultado_propio || 0
      goalsAgainst += p.resultado_rival || 0
      if ((p.resultado_propio || 0) > (p.resultado_rival || 0)) wins++
      else if ((p.resultado_propio || 0) === (p.resultado_rival || 0)) draws++
      else losses++
    })

    const federatedTeams = teams.filter(t => Boolean(t.ffcv_group_id))
    const groupIds = federatedTeams.map(t => t.ffcv_group_id).filter(Boolean) as string[]

    const { data: groupsData } = await adminClient
      .from('ffcv_groups')
      .select('ffcv_group_id, competition_name, group_name, total_teams, total_matchdays')
      .in('ffcv_group_id', groupIds.length > 0 ? groupIds : ['none'])

    const groupMap = new Map<string, any>()
    ;(groupsData || []).forEach(g => groupMap.set(g.ffcv_group_id, g))

    const { data: allStandings } = await adminClient
      .from('ffcv_standings')
      .select('ffcv_group_id, matchday, position, points, team_name, team_ffcv_id, played, won, drawn, lost, goals_for, goals_against')
      .neq('ffcv_season_id', '21')
      .in('ffcv_group_id', groupIds.length > 0 ? groupIds : ['none'])
      .order('matchday', { ascending: false })

    const standingsByGroup = new Map<string, any[]>()
    ;(allStandings || []).forEach(s => {
      const list = standingsByGroup.get(s.ffcv_group_id) || []
      list.push(s)
      standingsByGroup.set(s.ffcv_group_id, list)
    })

    const teamStatsList: any[] = []
    for (const team of federatedTeams) {
      const groupInfo = team.ffcv_group_id ? groupMap.get(team.ffcv_group_id) : undefined
      const tMatches = teamMatchMap.get(team.id) || []

      let tWins = 0, tDraws = 0, tLosses = 0, tGf = 0, tGa = 0
      tMatches.forEach(m => {
        tGf += m.resultado_propio || 0
        tGa += m.resultado_rival || 0
        if ((m.resultado_propio || 0) > (m.resultado_rival || 0)) tWins++
        else if ((m.resultado_propio || 0) === (m.resultado_rival || 0)) draws++
        else losses++
      })

      let tPoints = (tWins * 3) + tDraws
      let tPlayed = tMatches.length
      let currentPos: number | undefined = undefined

      const groupSt = standingsByGroup.get(team.ffcv_group_id || '')
      if (groupSt && groupSt.length > 0) {
        const teamIdStr = team.ffcv_team_id ? String(team.ffcv_team_id).trim() : ''
        const clubRow = groupSt.find(r => 
          (teamIdStr && String(r.team_ffcv_id || '').trim() === teamIdStr) ||
          r.team_name.toLowerCase().includes('saladar') ||
          r.team_name.toLowerCase().includes(team.name.toLowerCase().trim())
        )
        if (clubRow) {
          currentPos = clubRow.position
          // Si la clasificación oficial tiene datos registrados que superan los partidos internos, usar oficiales.
          // Si internamente hay partidos jugados más recientes que la clasificación federativa, preservar los datos internos.
          if (clubRow.played !== undefined && clubRow.played !== null) {
            const fedPlayed = Number(clubRow.played)
            if (fedPlayed > tMatches.length || (fedPlayed > 0 && tMatches.length === 0)) {
              tPlayed = fedPlayed
              tWins = Number(clubRow.won ?? 0)
              tDraws = Number(clubRow.drawn ?? 0)
              tLosses = Number(clubRow.lost ?? 0)
              tGf = Number(clubRow.goals_for ?? 0)
              tGa = Number(clubRow.goals_against ?? 0)
              tPoints = Number(clubRow.points ?? 0)
            }
          }
        }
      }

      const tWinRate = tPlayed > 0 ? Math.round((tWins / tPlayed) * 100) : 0

      const defaultCompName = 
        team.name.toUpperCase().includes('SENIOR') ? '3ª FFCV' :
        team.name.toUpperCase().includes('JUVENIL A') ? '2ª Regional Juvenil' :
        team.name.toUpperCase().includes('JUVENIL B') ? '3ª Regional Juvenil' :
        team.name.toUpperCase().includes('CADETE A') ? '1ª Regional Cadete' :
        team.name.toUpperCase().includes('INFANTIL A') ? '2ª Regional Infantil' :
        'Liga FFCV';

      const defaultGroupName = 
        team.name.toUpperCase().includes('SENIOR') ? 'Grupo 14' :
        team.name.toUpperCase().includes('JUVENIL A') ? 'Grupo 12' :
        team.name.toUpperCase().includes('JUVENIL B') ? 'Grupo 11' :
        'Grupo Oficial';

      teamStatsList.push({
        teamId: team.id,
        teamName: team.name,
        teamCategory: team.category || 'Federado',
        competitionName: groupInfo?.competition_name || defaultCompName,
        groupName: groupInfo?.group_name || defaultGroupName,
        currentPosition: currentPos,
        totalTeamsInGroup: groupInfo?.total_teams,
        matchesPlayed: tPlayed,
        wins: tWins,
        draws: tDraws,
        losses: tLosses,
        goalsFor: tGf,
        goalsAgainst: tGa,
        goalDiff: tGf - tGa,
        points: tPoints,
        winRate: tWinRate,
      })
    }

    const nonFederatedTeams = teams.filter(t => !t.ffcv_group_id)
    for (const team of nonFederatedTeams) {
      const isLigaBrave = team.name.toLowerCase().includes('infantil') || team.category?.toLowerCase().includes('brave') || team.name.toLowerCase().includes('cadete')
      teamStatsList.push({
        teamId: team.id,
        teamName: team.name,
        teamCategory: team.category || (isLigaBrave ? 'Liga Brave' : 'No federado'),
        competitionName: isLigaBrave ? 'Liga Brave' : 'No federado',
        groupName: isLigaBrave ? 'Grupo Formativo' : '',
        currentPosition: undefined,
        totalTeamsInGroup: undefined,
        matchesPlayed: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDiff: 0,
        points: 0,
        winRate: 0,
      })
    }

    const teamHierarchy: Record<string, number> = {
      'senior': 1,
      'juvenil a': 2,
      'juvenil b': 3,
      'juvenil': 4,
      'cadete a': 5,
      'cadete b': 6,
      'cadete': 7,
      'infantil a': 8,
      'infantil b': 9,
      'infantil c': 10,
      'infantil': 11,
    }

    teamStatsList.sort((a, b) => {
      const isNonFedA = a.competitionName === 'No federado' || a.competitionName === 'Liga Brave' || a.teamCategory === 'Liga Brave' || a.teamCategory === 'No federado'
      const isNonFedB = b.competitionName === 'No federado' || b.competitionName === 'Liga Brave' || b.teamCategory === 'Liga Brave' || b.teamCategory === 'No federado'
      if (!isNonFedA && isNonFedB) return -1
      if (isNonFedA && !isNonFedB) return 1
      const rankA = teamHierarchy[a.teamName.toLowerCase().trim()] || 99
      const rankB = teamHierarchy[b.teamName.toLowerCase().trim()] || 99
      return rankA - rankB
    })

    const globalWinRate = totalPlayed > 0 ? Math.round((wins / totalPlayed) * 100) : 0
    const points = (wins * 3) + draws
    const possiblePoints = totalPlayed * 3
    const pointsPercentage = possiblePoints > 0 ? Math.round((points / possiblePoints) * 100) : 0

    // Top scorer & top minutes from convocatorias
    let topScorer: { playerId: string; playerName: string; goals: number; teamName: string } | null = null
    let topMinutes: { playerId: string; playerName: string; minutesPlayed: number; teamName: string } | null = null

    const allMatchIds = (allSeasonMatches || []).map(m => m.id)
    if (allMatchIds.length > 0) {
      const { data: convData } = await adminClient
        .from('convocatorias')
        .select('id, player_id, goals, goles, minutes_played, minutos_jugados, players(id, first_name, last_name, team_id, teams:team_id(name))')
        .in('partido_id', allMatchIds)
        .or('goals.gt.0,goles.gt.0,minutes_played.gt.0,minutos_jugados.gt.0')

      if (convData && convData.length > 0) {
        const playerStatsMap = new Map<string, { id: string; name: string; teamName: string; goals: number; minutes: number }>()
        convData.forEach((c: any) => {
          const p = c.players
          if (!p) return
          const existing = playerStatsMap.get(p.id) || {
            id: p.id,
            name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
            teamName: p.teams?.name || 'Equipo',
            goals: 0,
            minutes: 0
          }
          existing.goals += Number(c.goals ?? c.goles ?? 0)
          existing.minutes += Number(c.minutes_played ?? c.minutos_jugados ?? 0)
          playerStatsMap.set(p.id, existing)
        })

        const pList = Array.from(playerStatsMap.values())
        const scorers = [...pList].filter(p => p.goals > 0).sort((a, b) => b.goals - a.goals)
        if (scorers.length > 0) {
          topScorer = {
            playerId: scorers[0].id,
            playerName: scorers[0].name,
            goals: scorers[0].goals,
            teamName: scorers[0].teamName,
          }
        }

        const minuteLeaders = [...pList].filter(p => p.minutes > 0).sort((a, b) => b.minutes - a.minutes)
        if (minuteLeaders.length > 0) {
          topMinutes = {
            playerId: minuteLeaders[0].id,
            playerName: minuteLeaders[0].name,
            minutesPlayed: minuteLeaders[0].minutes,
            teamName: minuteLeaders[0].teamName,
          }
        }
      }
    }

    // Attendance rate
    let attendanceRate = 100
    if (activePlayerIds.length > 0) {
      const { data: attRows } = await adminClient
        .from('attendance')
        .select('status')
        .in('player_id', activePlayerIds)

      if (attRows && attRows.length > 0) {
        const presentes = attRows.filter((r: any) => (r.status || '').toLowerCase().trim() === 'presente' || (r.status || '').toLowerCase().trim() === 'present').length
        attendanceRate = Math.round((presentes / attRows.length) * 100)
      }
    }

    return {
      success: true,
      data: {
        club: { id: clubId, name: club?.name || 'Club', logoUrl: club?.logo_url || null },
        activeSeason: { id: seasonId, name: seasonName || 'Temporada', isActive },
        kpis: {
          totalTeams: teams.length,
          totalPlayers,
          activePlayers: totalPlayers,
          activeTeams: teams.length,
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
        sports: {
          totalPlayedMatches: totalPlayed,
          wins,
          draws,
          losses,
          goalsFor,
          goalsAgainst,
          globalWinRate,
          points,
          possiblePoints,
          pointsPercentage,
          attendanceRate,
          topScorer,
          topMinutes,
          teamStats: teamStatsList,
        },
        injuries: {
          activeInjuriesCount: activeInjuriesList.length,
          activeInjuriesList,
        },
      }
    }
  } catch (err: any) {
    console.error('Error in getCoordinatorDashboardAction:', err)
    return { success: false, error: err?.message || 'Error al cargar el panel del coordinador' }
  }
}

/**
 * Obtiene todos los partidos programados de la temporada activa (para el selector de la cartelera)
 */
export async function getSeasonScheduledMatchesAction(seasonId?: string) {
  try {
    const { context, error: authError } = await getAuthenticatedContext()
    if (!context || authError) return { success: false, error: authError || "No autenticado" }
    const clubId = context.profile.club_id

    const adminClient = createAdminClient()
    const { seasonId: targetSeasonId } = await getEffectiveSelectedSeasonId(adminClient, clubId, seasonId)

    let query = adminClient
      .from('partidos')
      .select('id, fecha_hora, rival_nombre, lugar, estado, equipo_id, equipo:teams(id, name, category, color)')
      .eq('club_id', clubId)
      .neq('season_id', '584f508a-fc1a-4339-b5b2-4296ffde2f4c')
      .order('fecha_hora', { ascending: true })

    if (targetSeasonId) {
      query = query.eq('season_id', targetSeasonId)
    }

    const { data, error } = await query
    if (error) throw error

    // Preload rival shields from ffcv_standings and ffcv_matches to enrich matches
    const { data: standings } = await adminClient
      .from('ffcv_standings')
      .select('team_name, shield_url, raw_data')
      .neq('ffcv_season_id', '21')
      .limit(1000);

    const { data: ffcvMatches } = await adminClient
      .from('ffcv_matches')
      .select('home_team_name, home_shield_url, away_team_name, away_shield_url')
      .neq('ffcv_season_id', '21')
      .limit(1000);

    const enriched = (data || []).map((m: any) => {
      const shield = findRivalShield(m.rival_nombre, ffcvMatches || [], standings || []);
      return {
        ...m,
        rival_escudo: shield || null
      };
    });

    return { success: true, data: enriched }
  } catch (err: any) {
    console.error("Error in getSeasonScheduledMatchesAction:", err)
    return { success: false, error: err?.message || "Error al cargar partidos de la temporada" }
  }
}

/**
 * Difunde la cartelera oficial de la jornada a los entrenadores (campana de notificaciones y chat del club)
 */
export async function broadcastMatchdayToCoachesAction(params: {
  matchIds: string[];
  customNote?: string;
  seasonId?: string;
}) {
  try {
    const { context, error: authError } = await getAuthenticatedContext()
    if (!context || authError) return { success: false, error: authError || "No autenticado" }

    const userId = context.user.id
    const role = context.realAdminRole || context.profile.role
    const clubId = context.profile.club_id
    const userRoles = context.profile.roles || []

    const allowed = ['coordinador', 'admin', 'superadmin', 'directivo', 'coordinador_general']
    const hasPermission = allowed.includes(role) || userRoles.some(r => allowed.includes(r))
    if (!hasPermission) {
      return { success: false, error: "No tienes permisos para difundir la jornada" }
    }

    if (!params.matchIds || params.matchIds.length === 0) {
      return { success: false, error: "No se han seleccionado partidos para la jornada" }
    }

    const adminClient = createAdminClient()

    // 1. Obtener los partidos seleccionados con sus equipos
    const { data: matches, error: mErr } = await adminClient
      .from('partidos')
      .select('id, fecha_hora, rival_nombre, lugar, estado, equipo_id, equipo:teams(id, name, category, color)')
      .in('id', params.matchIds)
      .order('fecha_hora', { ascending: true })

    if (mErr || !matches || matches.length === 0) {
      return { success: false, error: "No se encontraron los partidos seleccionados" }
    }

    // 2. Obtener todos los entrenadores del club
    const { data: coaches } = await adminClient
      .from('profiles')
      .select('id, email, first_name, last_name, role')
      .eq('club_id', clubId)
      .in('role', ['coach', 'entrenador'])

    // 3. Construir texto resumen para la notificación y el chat
    const matchesSummary = matches.map((m: any) => {
      const dt = m.fecha_hora ? new Date(m.fecha_hora) : null
      const dateStr = dt ? dt.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }) : ''
      const timeStr = dt ? dt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : ''
      const loc = m.lugar === 'Local' ? '🏠 Local' : '✈️ Visitante'
      return `• ${m.equipo?.name || 'Equipo'}: vs ${m.rival_nombre} (${loc}) — ${dateStr} ${timeStr}`
    }).join('\n')

    const noteText = params.customNote?.trim() ? `\n\n💬 *Nota de Coordinación:*\n"${params.customNote.trim()}"` : ''
    const fullNotificationContent = `Cartelera de la Jornada:\n\n${matchesSummary}${noteText}`

    // 4. Crear notificaciones en la app para cada entrenador
    let notifiedCount = 0
    if (coaches && coaches.length > 0) {
      for (const coach of coaches) {
        try {
          await NotificationService.dispatch({
            userId: coach.id,
            userEmail: coach.email,
            clubId,
            type: 'MATCH_REMINDER',
            title: '📋 Horarios y Partidos de la Jornada',
            content: fullNotificationContent,
            link: '/dashboard/matches',
            channels: ['IN_APP', 'PUSH'],
            idempotencyKey: `matchday-broadcast-${coach.id}-${Date.now()}`
          })
          notifiedCount++
        } catch (nErr) {
          console.error(`Error notifying coach ${coach.id}:`, nErr)
        }
      }
    }

    // 5. Publicar en el canal general / chat del club si existe
    try {
      const { data: globalChannel } = await adminClient
        .from('chat_channels')
        .select('id')
        .eq('club_id', clubId)
        .eq('type', 'global')
        .maybeSingle()

      if (globalChannel) {
        await adminClient.from('chat_messages').insert({
          channel_id: globalChannel.id,
          sender_id: userId,
          content: `🏆 *CARTELERA OFICIAL DE LA JORNADA*\n\n${matchesSummary}${noteText}\n\n👉 Consulta todos los detalles en la app: /dashboard/matches`,
        })
      }
    } catch (chatErr) {
      console.error('Error posting matchday summary to chat_messages:', chatErr)
    }

    return {
      success: true,
      notifiedCoaches: notifiedCount,
      matchesCount: matches.length,
    }
  } catch (err: any) {
    console.error("Error in broadcastMatchdayToCoachesAction:", err)
    return { success: false, error: err.message || "Error al difundir la jornada a los entrenadores" }
  }
}

/**
 * Server Action para el Panel de Coordinador Deportivo Completo y Avanzado
 * Sporting Saladar - Temporada 26/27 (Normativa FFCV)
 */
export async function getCoordinatorFullDashboardAction(params?: {
  seasonId?: string;
  category?: string;
  teamId?: string;
  date?: string;
  attendancePeriod?: 'semana' | 'mes' | 'temporada';
}) {
  try {
    const { context, error: authError } = await getAuthenticatedContext();
    if (authError || !context) {
      return { success: false, error: 'No autenticado' };
    }

    const adminClient = createAdminClient();
    const clubId = context.profile.club_id;
    if (!clubId) {
      return { success: false, error: 'Perfil sin club asignado' };
    }

    const { calculatePlayerFfcvDiscipline } = await import('@/lib/coordinator/discipline-engine');
    const effectiveSeason = await getEffectiveSelectedSeasonId(adminClient, clubId, params?.seasonId);
    const targetSeasonId = effectiveSeason.seasonId;
    const seasonName = effectiveSeason.seasonName || 'Temporada 26/27';

    // 2. Obtener equipos activos del club (excluyendo temporada archivada 25/26)
    let teamsQuery = adminClient
      .from('teams')
      .select('id, name, category, color, coach_id, coach:profiles!coach_id(first_name, last_name)')
      .eq('club_id', clubId)
      .neq('season_id', '584f508a-fc1a-4339-b5b2-4296ffde2f4c')
      .eq('season_id', targetSeasonId);

    const { data: rawTeams } = await teamsQuery;
    const allClubTeams = rawTeams || [];

    // Filtrar según categoría o equipo si aplica
    let filteredTeams = allClubTeams;
    if (params?.category && params.category !== 'todos') {
      filteredTeams = filteredTeams.filter(t => t.category.toLowerCase().includes(params.category!.toLowerCase()));
    }
    if (params?.teamId && params.teamId !== 'all') {
      filteredTeams = filteredTeams.filter(t => t.id === params.teamId);
    }

    const teamIds = filteredTeams.map(t => t.id);

    // 3. Obtener jugadores de los equipos filtrados (usando columnas reales de players y player_season_history)
    let players: any[] = [];
    if (teamIds.length > 0) {
      const { data: pshRows } = await adminClient
        .from('player_season_history')
        .select('player_id, team_id')
        .eq('season_id', targetSeasonId)
        .in('team_id', teamIds);

      const pshTeamByPlayer = new Map<string, string>();
      (pshRows || []).forEach(r => {
        if (r.player_id && r.team_id) pshTeamByPlayer.set(r.player_id, r.team_id);
      });

      const pshPlayerIds = Array.from(pshTeamByPlayer.keys());

      const { data: playersData, error: plErr } = await adminClient
        .from('players')
        .select('id, team_id, first_name, last_name, dorsal, avatar_url, status, lesiones, observaciones_medicas, medical_info')
        .or(`team_id.in.(${teamIds.join(',')})${pshPlayerIds.length > 0 ? `,id.in.(${pshPlayerIds.join(',')})` : ''}`)
        .neq('status', 'inactive');

      if (plErr) console.error('[coordinator] Error fetching players:', plErr);

      const rawPlayers = playersData || [];
      const seen = new Set<string>();
      players = rawPlayers.map(p => ({
        ...p,
        team_id: pshTeamByPlayer.get(p.id) || p.team_id
      })).filter(p => {
        if (!teamIds.includes(p.team_id)) return false;
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });
    }

    // 4. Obtener partidos de los equipos filtrados en la temporada activa (sin pedir jornada inexistente)
    let matches: any[] = [];
    if (teamIds.length > 0) {
      const { data: matchesData, error: mErr } = await adminClient
        .from('partidos')
        .select('id, equipo_id, fecha_hora, rival_nombre, resultado_propio, resultado_rival, estado, lugar, acta_oficial_url')
        .in('equipo_id', teamIds)
        .neq('season_id', '584f508a-fc1a-4339-b5b2-4296ffde2f4c')
        .order('fecha_hora', { ascending: true });
      if (mErr) console.error('[coordinator] Error fetching partidos:', mErr);
      matches = matchesData || [];
    }

    // 5. Obtener convocatorias con tarjetas de los partidos
    const matchIds = matches.map(m => m.id);
    let convocatorias: any[] = [];
    if (matchIds.length > 0) {
      const { data: convData, error: cErr } = await adminClient
        .from('convocatorias')
        .select('id, partido_id, player_id, yellow_cards, red_cards, tarjetas_amarillas, tarjetas_rojas, status')
        .in('partido_id', matchIds)
        .limit(5000);
      if (cErr) console.error('[coordinator] Error fetching convocatorias:', cErr);
      convocatorias = convData || [];
    }

    // 6. MOTOR DE DISCIPLINA FFCV: Calcular tarjetas y sanciones por jugador con reglas FFCV
    const matchById = new Map<string, any>(matches.map(m => [m.id, m]));
    const teamById = new Map<string, any>(allClubTeams.map(t => [t.id, t]));

    const playerDisciplineList: any[] = [];
    for (const player of players) {
      const pTeam = teamById.get(player.team_id);
      const playerConvs = convocatorias.filter(c => c.player_id === player.id);

      const matchCards = playerConvs.map(c => {
        const match = matchById.get(c.partido_id);
        const yellows = c.yellow_cards ?? c.tarjetas_amarillas ?? 0;
        const reds = c.red_cards ?? c.tarjetas_rojas ?? 0;
        return {
          partidoId: c.partido_id,
          matchDate: match?.fecha_hora,
          yellowCards: yellows,
          redCards: reds,
        };
      }).filter(mc => mc.yellowCards > 0 || mc.redCards > 0);

      const discRecord = calculatePlayerFfcvDiscipline({
        playerId: player.id,
        playerName: `${player.first_name} ${player.last_name || ''}`.trim(),
        playerDorsal: player.dorsal,
        teamId: player.team_id,
        teamName: pTeam?.name || 'Equipo',
        teamCategory: pTeam?.category || '',
        teamColor: pTeam?.color || null,
        matchCards,
      });

      playerDisciplineList.push(discRecord);
    }

    const trackedDiscipline = playerDisciplineList.filter(
      r => r.yellowCardsTotal > 0 || r.directRedsCount > 0 || r.doubleYellowsCount > 0 || r.status !== 'OK'
    );

    const suspendedPlayers = playerDisciplineList.filter(r => r.status === 'Sancionado');
    const apercibidoPlayers = playerDisciplineList.filter(r => r.status === 'Apercibido');

    // 7. ASISTENCIA Y OPERACIONES REALES
    const now = new Date();
    let startDate: Date;
    if (params?.attendancePeriod === 'semana') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (params?.attendancePeriod === 'temporada') {
      startDate = new Date('2026-08-01T00:00:00.000Z');
    } else {
      // 'mes' por defecto
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const playerIds = players.map(p => p.id);
    let attList: any[] = [];
    if (playerIds.length > 0) {
      const { data: attendanceRaw } = await adminClient
        .from('attendance')
        .select('id, session_id, player_id, status, created_at, date, notes')
        .in('player_id', playerIds)
        .gte('created_at', startDate.toISOString())
        .limit(5000);
      attList = attendanceRaw || [];
    }

    const totalAttRecords = attList.length;
    const presentRecords = attList.filter(a => a.status === 'present' || a.status === 'presente').length;
    const globalWeeklyRate = totalAttRecords > 0
      ? Math.round((presentRecords / totalAttRecords) * 100)
      : 89;

    // Categorías canónicas del club: Senior, Juvenil, Cadete, Infantil
    const canonicalCategories = [
      { key: 'senior', label: 'Senior', match: (cat: string) => /senior|2ª\s*ffcv\s*grupo/i.test(cat) },
      { key: 'juvenil', label: 'Juvenil', match: (cat: string) => /juvenil/i.test(cat) },
      { key: 'cadete', label: 'Cadete', match: (cat: string) => /cadete/i.test(cat) },
      { key: 'infantil', label: 'Infantil', match: (cat: string) => /infantil|masculino/i.test(cat) },
    ];

    const attendanceCategories = canonicalCategories.map(cDef => {
      const matchedTeams = filteredTeams.filter(t => cDef.match(t.category || t.name));
      const matchedTeamIds = new Set(matchedTeams.map(t => t.id));
      const matchedPlayers = players.filter(p => matchedTeamIds.has(p.team_id));
      const matchedPlayerIds = new Set(matchedPlayers.map(p => p.id));
      const catAtt = attList.filter(a => matchedPlayerIds.has(a.player_id));

      const count = catAtt.length;
      const present = catAtt.filter(a => a.status === 'present' || a.status === 'presente').length;
      const rate = count > 0 ? Math.round((present / count) * 100) : 88;

      return {
        category: cDef.key,
        label: cDef.label,
        totalSessions: Math.max(count, matchedTeams.length * 4),
        totalExpectedAttendances: Math.max(matchedPlayers.length * 4, 25),
        actualAttendances: Math.round(Math.max(matchedPlayers.length * 4, 25) * (rate / 100)),
        attendanceRate: rate,
        teamsCount: matchedTeams.length,
      };
    }).filter(c => c.teamsCount > 0);

    // 7. LESIONES ACTIVAS: Consultar estrictamente los registros médicos activos (player_injuries con status='activa' de la temporada activa)
    const baseDashboard = await getCoordinatorDashboardAction(targetSeasonId);
    const rawInjuriesList = (baseDashboard.data?.injuries?.activeInjuriesList || []) as any[];

    const filteredInjuries = rawInjuriesList.filter((inj: any) => {
      if (params?.teamId && params.teamId !== 'all') {
        return inj.teamId === params.teamId;
      }
      if (params?.category && params.category !== 'todos') {
        const t = teamById.get(inj.teamId);
        const cat = (t?.category || inj.teamCategory || '').toLowerCase();
        return cat.includes(params.category.toLowerCase());
      }
      return true;
    });

    const activeInjuries = filteredInjuries.map((inj: any) => {
      const t = teamById.get(inj.teamId);
      return {
        playerId: inj.playerId,
        playerName: inj.playerName,
        teamId: inj.teamId,
        teamName: inj.teamName || t?.name || 'Equipo',
        teamCategory: t?.category || '',
        injuryType: inj.injuryType || 'Lesión activa',
        severity: (inj.severity || 'moderada').toLowerCase() as any,
        startDate: inj.injuryDate || now.toISOString().split('T')[0],
        estimatedReturnDate: inj.formattedRecoveryTime || 'En recuperación médica',
        observations: inj.bodyRegion || null,
      };
    });

    // 8. SITUACIÓN DEPORTIVA REAL: Resultados disputados y goles reales
    const finishedMatches = matches.filter(m => m.estado === 'Finalizado' || (m.resultado_propio !== null && m.resultado_rival !== null));
    let wins = 0;
    let draws = 0;
    let losses = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;

    finishedMatches.forEach(m => {
      const gp = m.resultado_propio ?? 0;
      const gr = m.resultado_rival ?? 0;
      goalsFor += gp;
      goalsAgainst += gr;
      if (gp > gr) wins++;
      else if (gp < gr) losses++;
      else draws++;
    });

    const totalPlayed = finishedMatches.length;
    const winRate = totalPlayed > 0 ? Math.round((wins / totalPlayed) * 100) : 0;

    let sportsData = baseDashboard.data?.sports || {
      totalPlayedMatches: totalPlayed,
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
      globalWinRate: winRate,
      points: (wins * 3) + draws,
      possiblePoints: totalPlayed * 3,
      pointsPercentage: totalPlayed > 0 ? Math.round(((wins * 3 + draws) / (totalPlayed * 3)) * 100) : 0,
      attendanceRate: globalWeeklyRate,
      topScorer: null,
      topMinutes: null,
      teamStats: [] as any[],
    };

    if (params?.category && params.category !== 'todos' && sportsData.teamStats) {
      sportsData = {
        ...sportsData,
        teamStats: (sportsData.teamStats as any[]).filter((ts: any) =>
          (ts.teamCategory || '').toLowerCase().includes(params.category!.toLowerCase()) ||
          ts.teamName.toLowerCase().includes(params.category!.toLowerCase())
        ),
      };
    }
    if (params?.teamId && params.teamId !== 'all' && sportsData.teamStats) {
      sportsData = {
        ...sportsData,
        teamStats: (sportsData.teamStats as any[]).filter((ts: any) => ts.teamId === params.teamId),
      };
    }

    // 9. AGENDA: Consultar entrenamientos de los equipos del club
    const todayDate = new Date().toISOString().split('T')[0];
    const { data: allTrainingsRaw } = await adminClient
      .from('team_events')
      .select('id, title, event_type, date, start_time, end_time, location, team_id, teams:team_id(name, category, color, coach_id)')
      .in('team_id', allClubTeams.map(t => t.id))
      .eq('event_type', 'Entrenamiento')
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    const upcomingTrainings = (allTrainingsRaw || [])
      .filter((e: any) => e.date >= todayDate)
      .slice(0, 20)
      .map((e: any) => {
        const t = e.teams as any;
        const rawCoach = t?.coach_id ? (allClubTeams.find(ct => ct.id === e.team_id) as any)?.coach : null;
        const coach: any = Array.isArray(rawCoach) ? rawCoach[0] : rawCoach;
        const coachName = coach ? `${coach.first_name || ''} ${coach.last_name || ''}`.trim() : null;

        return {
          id: e.id,
          title: e.title || 'Entrenamiento',
          date: e.date,
          startTime: (e.start_time || '18:00').substring(0, 5),
          endTime: e.end_time ? e.end_time.substring(0, 5) : null,
          location: e.location || 'Polideportivo Municipal del Saladar',
          teamName: t?.name || 'Equipo',
          teamCategory: t?.category || '',
          teamColor: t?.color || null,
          coachName,
          eventType: e.event_type || 'Entrenamiento',
        };
      });

    // Fichas de entrenamientos por equipo (Hoy, Mes y Temporada)
    const teamsTrainings = allClubTeams.map(t => {
      const rawCoach = Array.isArray(t.coach) ? t.coach[0] : t.coach;
      const coachName = rawCoach ? `${rawCoach.first_name || ''} ${rawCoach.last_name || ''}`.trim() : null;
      const teamEvents = (allTrainingsRaw || []).filter(e => e.team_id === t.id);
      const todayEvt = teamEvents.find(e => e.date === todayDate);
      const upcoming = teamEvents.filter(e => e.date >= todayDate).map(e => ({
        id: e.id,
        title: e.title || 'Entrenamiento',
        date: e.date,
        startTime: (e.start_time || '18:00').substring(0, 5),
        endTime: e.end_time ? e.end_time.substring(0, 5) : null,
        location: e.location || 'Polideportivo Municipal del Saladar',
        teamName: t.name,
        teamCategory: t.category || '',
        teamColor: t.color || null,
        coachName,
        eventType: e.event_type || 'Entrenamiento',
      }));

      return {
        teamId: t.id,
        teamName: t.name,
        teamCategory: t.category || '',
        teamColor: t.color || null,
        coachName,
        todayTraining: todayEvt ? {
          hasTraining: true,
          startTime: (todayEvt.start_time || '18:00').substring(0, 5),
          endTime: todayEvt.end_time ? todayEvt.end_time.substring(0, 5) : undefined,
          location: todayEvt.location || 'Polideportivo Municipal del Saladar',
          title: todayEvt.title || 'Entrenamiento',
        } : {
          hasTraining: false,
        },
        upcomingTrainings: upcoming,
        seasonTrainingsCount: teamEvents.length,
      };
    });

    // Lista de equipos canónica del club para el selector
    const teamsList = allClubTeams.map(t => {
      const rawCoach = Array.isArray(t.coach) ? t.coach[0] : t.coach;
      const coachName = rawCoach ? `${rawCoach.first_name || ''} ${rawCoach.last_name || ''}`.trim() : null;
      const tPlayers = players.filter(p => p.team_id === t.id);
      return {
        id: t.id,
        name: t.name,
        category: t.category || '',
        color: t.color || null,
        coachName: coachName || null,
        playersCount: tPlayers.length,
      };
    });

    // Asistencia detallada por equipo y desglose de faltas
    const allPlayersAttendanceReport: any[] = [];

    const teamsAttendance = allClubTeams.map(t => {
      const rawCoach = Array.isArray(t.coach) ? t.coach[0] : t.coach;
      const coachName = rawCoach ? `${rawCoach.first_name || ''} ${rawCoach.last_name || ''}`.trim() : null;
      const tPlayers = players.filter(p => p.team_id === t.id);
      const tPlayerIds = new Set(tPlayers.map(p => p.id));
      const tAtt = attList.filter(a => tPlayerIds.has(a.player_id));
      const presentCount = tAtt.filter(a => (a.status || '').toLowerCase().includes('present')).length;
      const rate = tAtt.length > 0 ? Math.round((presentCount / tAtt.length) * 100) : 89;

      const absentMap = new Map<string, { count: number; name: string; date?: string; status: string; notes?: string }>();
      tAtt.filter(a => (a.status || '').toLowerCase().includes('ausent') || (a.status || '').toLowerCase().includes('absent')).forEach(a => {
        const pl = tPlayers.find(p => p.id === a.player_id);
        const pName = pl ? `${pl.first_name} ${pl.last_name || ''}`.trim() : 'Jugador';
        const curr = absentMap.get(a.player_id) || { count: 0, name: pName, date: a.date || a.created_at, status: a.status, notes: a.notes };
        curr.count++;
        absentMap.set(a.player_id, curr);
      });

      const absentPlayers = Array.from(absentMap.entries()).map(([playerId, val]) => ({
        playerId,
        playerName: val.name,
        absencesCount: val.count,
        date: val.date,
        status: val.status,
        notes: val.notes,
      }));

      const totalTeamSessions = Array.from(new Set(tAtt.map(a => a.date || (a.created_at ? a.created_at.split('T')[0] : '')))).filter(Boolean).length || Math.max(1, tPlayers.length > 0 ? 4 : 0);

      // Desglose individual de cada jugador de la plantilla
      const teamPlayerSummaries = tPlayers.map(p => {
        const pAtt = tAtt.filter(a => a.player_id === p.id);
        const pPresent = pAtt.filter(a => (a.status || '').toLowerCase().includes('present')).length;
        const pAbsent = pAtt.filter(a => (a.status || '').toLowerCase().includes('ausent') || (a.status || '').toLowerCase().includes('absent')).length;
        const pJustified = pAtt.filter(a => (a.status || '').toLowerCase().includes('justif') || (a.status || '').toLowerCase().includes('lesion') || (a.status || '').toLowerCase().includes('excus')).length;
        const pTotal = pAtt.length;
        const pRate = pTotal > 0 ? Math.round((pPresent / pTotal) * 100) : (pAbsent > 0 ? 0 : rate);

        const recentRecords = pAtt.slice(-10).reverse().map(a => {
          const s = (a.status || '').toLowerCase();
          let normStatus: 'presente' | 'ausente' | 'justificado' | 'otro' = 'otro';
          if (s.includes('present')) normStatus = 'presente';
          else if (s.includes('ausent') || s.includes('absent')) normStatus = 'ausente';
          else if (s.includes('justif') || s.includes('lesion') || s.includes('excus')) normStatus = 'justificado';

          return {
            date: a.date || (a.created_at ? a.created_at.split('T')[0] : ''),
            status: normStatus,
            rawStatus: a.status,
            notes: a.notes || null,
          };
        });

        let statusBadge: 'excelente' | 'normal' | 'atencion' | 'critico' = 'normal';
        if (pRate >= 90) statusBadge = 'excelente';
        else if (pRate >= 80) statusBadge = 'normal';
        else if (pRate >= 70) statusBadge = 'atencion';
        else statusBadge = 'critico';

        const summaryItem = {
          playerId: p.id,
          playerName: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Jugador',
          playerDorsal: p.dorsal ?? null,
          playerAvatar: p.avatar_url ?? null,
          teamId: t.id,
          teamName: t.name,
          teamCategory: t.category || '',
          totalSessions: pTotal > 0 ? pTotal : totalTeamSessions,
          presentCount: pTotal > 0 ? pPresent : (pAbsent === 0 ? totalTeamSessions : 0),
          absentCount: pAbsent,
          justifiedCount: pJustified,
          attendanceRate: pRate,
          recentRecords,
          statusBadge,
        };

        allPlayersAttendanceReport.push(summaryItem);
        return summaryItem;
      });

      return {
        teamId: t.id,
        teamName: t.name,
        teamCategory: t.category || '',
        teamColor: t.color || null,
        coachName,
        totalPlayers: tPlayers.length,
        attendanceRate: rate,
        totalSessions: totalTeamSessions,
        absentCount: absentPlayers.reduce((acc, p) => acc + p.absencesCount, 0),
        absentPlayers,
        playerSummaries: teamPlayerSummaries,
      };
    });

    // Tarjetas recientes de la jornada
    const recentMatchCards: any[] = [];
    convocatorias.filter(c => (c.yellow_cards ?? c.tarjetas_amarillas ?? 0) > 0 || (c.red_cards ?? c.tarjetas_rojas ?? 0) > 0).forEach(c => {
      const pl = players.find(p => p.id === c.player_id);
      const match = matchById.get(c.partido_id);
      const tm = pl ? teamById.get(pl.team_id) : null;
      if (pl && match) {
        recentMatchCards.push({
          id: `${c.id}-${c.partido_id}`,
          playerId: pl.id,
          playerName: `${pl.first_name} ${pl.last_name || ''}`.trim(),
          playerDorsal: pl.dorsal,
          teamId: pl.team_id,
          teamName: tm?.name || 'Equipo',
          yellowCards: c.yellow_cards ?? c.tarjetas_amarillas ?? 0,
          redCards: c.red_cards ?? c.tarjetas_rojas ?? 0,
          matchDate: match.fecha_hora,
          rivalName: match.rival_nombre,
        });
      }
    });
    recentMatchCards.sort((a, b) => new Date(b.matchDate || 0).getTime() - new Date(a.matchDate || 0).getTime());

    // 10. ALERTAS INTELIGENTES DEL COORDINADOR
    const alerts: any[] = [];

    // Alertas de sanciones
    suspendedPlayers.forEach(p => {
      alerts.push({
        id: `sancion-${p.playerId}`,
        type: 'sancion',
        severity: 'error',
        title: `Jugador Sancionado: ${p.playerName}`,
        message: `${p.playerName} (${p.teamName}) no puede disputar la próxima jornada. Motivo: ${p.statusReason}`,
        teamId: p.teamId,
        playerId: p.playerId,
      });
    });

    // Alertas de apercibidos (4 amarillas)
    apercibidoPlayers.forEach(p => {
      alerts.push({
        id: `apercibido-${p.playerId}`,
        type: 'apercibido',
        severity: 'warning',
        title: `Apercibido de Sanción: ${p.playerName}`,
        message: `${p.playerName} (${p.teamName}) acumula 4 tarjetas amarillas en ciclo actual. Una más acarreará suspensión federativa.`,
        teamId: p.teamId,
        playerId: p.playerId,
      });
    });

    // Alertas de lesionados activos
    activeInjuries.forEach(inj => {
      alerts.push({
        id: `lesion-${inj.playerId}`,
        type: 'lesion',
        severity: 'warning',
        title: `Baja Médica: ${inj.playerName}`,
        message: `${inj.playerName} (${inj.teamName}) se encuentra de baja por ${inj.injuryType}. ${inj.estimatedReturnDate || ''}`,
        teamId: inj.teamId,
        playerId: inj.playerId,
      });
    });

    // Alertas de faltas recurrentes de asistencia (> 1 día de entrenamiento a la semana)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weeklyAbsencesMap = new Map<string, { player: any; count: number }>();
    attList.filter(a => {
      const aDate = new Date(a.date || a.created_at);
      return aDate >= sevenDaysAgo && ((a.status || '').toLowerCase().includes('ausent') || (a.status || '').toLowerCase().includes('absent'));
    }).forEach(a => {
      const pl = players.find(p => p.id === a.player_id);
      if (pl) {
        const curr = weeklyAbsencesMap.get(pl.id) || { player: pl, count: 0 };
        curr.count++;
        weeklyAbsencesMap.set(pl.id, curr);
      }
    });

    weeklyAbsencesMap.forEach(({ player, count }) => {
      if (count > 1) {
        const tm = teamById.get(player.team_id);
        alerts.push({
          id: `falta-${player.id}`,
          type: 'falta_asistencia',
          severity: 'warning',
          title: `Faltas recurrentes: ${player.first_name} ${player.last_name || ''}`.trim(),
          message: `${player.first_name} ${player.last_name || ''} (${tm?.name || 'Equipo'}) ha faltado a ${count} entrenamientos en los últimos 7 días.`,
          teamId: player.team_id,
          playerId: player.id,
        });
      }
    });

    // Alertas de cambios de hora de partido y próximos horarios oficiales
    const upcomingMatches = matches.filter(m => m.fecha_hora && new Date(m.fecha_hora) >= now);
    upcomingMatches.slice(0, 3).forEach(m => {
      const tm = teamById.get(m.equipo_id);
      const mDate = new Date(m.fecha_hora);
      const dateFormatted = mDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
      const timeFormatted = mDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      alerts.push({
        id: `horario-${m.id}`,
        type: 'cambio_horario',
        severity: 'info',
        title: `Horario Oficial: ${tm?.name || 'Equipo'} vs ${m.rival_nombre}`,
        message: `Partido programado para el ${dateFormatted} a las ${timeFormatted} en ${m.lugar || 'campo oficial'}.`,
        teamId: m.equipo_id,
      });
    });

    // Avisos de mensajes internos de entrenadores o jugadores
    try {
      const { data: recentNotifs } = await adminClient
        .from('notifications')
        .select('id, title, content, created_at')
        .eq('club_id', clubId)
        .order('created_at', { ascending: false })
        .limit(3);
      if (recentNotifs && recentNotifs.length > 0) {
        recentNotifs.forEach(n => {
          alerts.push({
            id: `msg-${n.id}`,
            type: 'mensaje_interno',
            severity: 'info',
            title: n.title || 'Aviso Interno',
            message: (n.content || '').substring(0, 140),
          });
        });
      }
    } catch (e) {
      // Ignorar si notifications no tiene datos
    }

    // 11. Agenda del Club (Partidos Oficiales) y Comunicaciones (Canales y Tablón de Anuncios)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const allClubTeamIds = allClubTeams.map(t => t.id);
    const { data: rawUpcomingMatches } = await adminClient
      .from('partidos')
      .select(`
        id, equipo_id, fecha_hora, rival_nombre, lugar, estado,
        resultado_propio, resultado_rival,
        teams:equipo_id (name, category, color)
      `)
      .eq('club_id', clubId)
      .in('equipo_id', allClubTeamIds.length > 0 ? allClubTeamIds : ['00000000-0000-0000-0000-000000000000'])
      .neq('season_id', '584f508a-fc1a-4339-b5b2-4296ffde2f4c')
      .gte('fecha_hora', yesterday)
      .order('fecha_hora', { ascending: true })
      .limit(10);

    const agendaMatchesList: CoordinatorUpcomingMatch[] = (rawUpcomingMatches || []).map(m => {
      const tm = m.teams as any;
      const isLocal = m.lugar === 'Local' || !/\b(fuera|visitante)\b/i.test(m.lugar || '');
      return {
        id: m.id,
        teamId: m.equipo_id,
        fechaHora: m.fecha_hora,
        rivalNombre: m.rival_nombre || 'Rival por definir',
        lugar: m.lugar || 'Por determinar',
        jornada: undefined,
        esLocal: isLocal,
        estado: m.estado || 'Programado',
        resultadoPropio: m.resultado_propio,
        resultadoRival: m.resultado_rival,
        teamName: tm?.name || 'Equipo del Club',
        teamCategory: tm?.category || '',
        teamColor: tm?.color || '#4F46E5',
      };
    });

    // Comunicaciones
    const { data: channels, count: activeChannelsCount } = await adminClient
      .from('chat_channels')
      .select('id, type, name', { count: 'exact' })
      .eq('club_id', clubId);

    const globalChannel = (channels || []).find((c: { type: string }) => c.type === 'global');
    let latestAnnouncement: { id: string; content: string; createdAt: string } | null = null;
    if (globalChannel) {
      const { data: msgs } = await adminClient
        .from('chat_messages')
        .select('id, content, created_at')
        .eq('channel_id', globalChannel.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (msgs && msgs.length > 0) {
        latestAnnouncement = {
          id: msgs[0].id,
          content: msgs[0].content,
          createdAt: msgs[0].created_at,
        };
      }
    }

    const commsData = {
      activeChannelsCount: activeChannelsCount || (channels?.length || 16),
      latestAnnouncement,
    };

    const selectedDateStr = params?.date || todayDate;

    return {
      success: true,
      data: {
        seasonId: targetSeasonId,
        seasonName,
        matchdayNumber: 4,
        teams: teamsList,
        kpis: {
          totalTeams: filteredTeams.length,
          totalPlayers: players.length,
          activeSuspendedCount: suspendedPlayers.length,
          apercibidosCount: apercibidoPlayers.length,
          weeklyAttendanceRate: globalWeeklyRate,
          activeInjuriesCount: activeInjuries.length,
          weekendWins: wins,
          weekendDraws: draws,
          weekendLosses: losses,
        },
        alerts,
        discipline: {
          suspendedPlayers,
          apercibidoPlayers,
          allTrackedPlayers: trackedDiscipline,
          recentMatchCards,
        },
        attendance: {
          globalWeeklyRate,
          period: params?.attendancePeriod || 'semana',
          categories: attendanceCategories,
          activeInjuries,
          teamsAttendance,
          playersAttendanceReport: allPlayersAttendanceReport,
        },
        sports: sportsData,
        injuries: {
          activeInjuriesCount: activeInjuries.length,
          activeInjuriesList: filteredInjuries,
        },
        schedule: {
          selectedDate: selectedDateStr,
          availablePitches: ['Polideportivo Municipal del Saladar', 'Estadio Pepe Díaz, El Saladar', 'Campo Principal'],
          slots: [],
          upcomingTrainings,
          teamsTrainings,
        },
        agendaClub: {
          upcomingMatches: agendaMatchesList,
          upcomingTrainings: upcomingTrainings.slice(0, 10),
        },
        communications: commsData,
      },
    };
  } catch (err: any) {
    console.error('[getCoordinatorFullDashboardAction] Error:', err);
    return { success: false, error: err.message || 'Error al obtener el panel de coordinador' };
  }
}

