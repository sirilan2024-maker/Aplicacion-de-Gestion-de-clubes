'use server'

import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedContext, ADMIN_ROLES } from '@/lib/auth-helpers'

export interface TeamStatDTO {
  teamId: string
  teamName: string
  teamCategory: string
  matchesPlayed: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  winRate: number
}

export interface PlayerStatDTO {
  playerId: string
  playerName: string
  playerDorsal: number | null
  teamId: string | null
  teamName: string
  matchesPlayed: number
  minutesPlayed: number
  goals: number
  yellowCards: number
  redCards: number
}

export interface GlobalStatsKPIs {
  totalPlayers: number
  totalTeams: number
  totalMatches: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  yellowCards: number
  redCards: number
  totalMinutes: number
  winRate: number
}

export interface GlobalStatsResponse {
  success: boolean
  error?: string
  kpis?: GlobalStatsKPIs
  teamStats?: TeamStatDTO[]
  playerStats?: PlayerStatDTO[]
  teams?: Array<{ id: string; name: string; category: string }>
  seasons?: Array<{ id: string; name: string; isActive: boolean }>
}

export async function getGlobalStatsAction(seasonFilterId?: string): Promise<GlobalStatsResponse> {
  try {
    const { context, error: authError } = await getAuthenticatedContext()
    if (authError || !context) {
      return { success: false, error: 'No autorizado' }
    }

    const { profile } = context
    const clubId = profile.club_id
    const allowedRoles = [...ADMIN_ROLES, 'metodologo', 'entrenador']
    if (!allowedRoles.includes(profile.role)) {
      return { success: false, error: 'Permisos insuficientes para consultar estadísticas globales' }
    }

    const supabase = await createClient()

    // 1. Obtener temporadas del club
    const { data: seasonsData } = await supabase
      .from('seasons')
      .select('id, name, is_active')
      .eq('club_id', clubId)
      .order('is_active', { ascending: false })

    const seasons = (seasonsData || []).map(s => ({
      id: s.id,
      name: s.name,
      isActive: !!s.is_active
    }))

    // 2. Obtener equipos del club
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
    const teamIds = teams.map(t => t.id)

    // 3. Obtener jugadores del club
    const { data: playersData, error: playersError } = await supabase
      .from('players')
      .select('id, first_name, last_name, dorsal, team_id')
      .eq('club_id', clubId)

    if (playersError) {
      return { success: false, error: playersError.message }
    }

    const players = playersData || []
    const playerMap = new Map<string, { name: string; dorsal: number | null; teamId: string | null }>()
    players.forEach(p => {
      const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Jugador'
      playerMap.set(p.id, { name: fullName, dorsal: p.dorsal, teamId: p.team_id })
    })

    // 4. Obtener partidos del club
    let matchQuery = supabase
      .from('partidos')
      .select('id, equipo_id, resultado_propio, resultado_rival, estado, season_id')
      .eq('club_id', clubId)

    if (seasonFilterId && seasonFilterId !== 'todas') {
      matchQuery = matchQuery.eq('season_id', seasonFilterId)
    }

    const { data: matchesData, error: matchError } = await matchQuery
    if (matchError) {
      return { success: false, error: matchError.message }
    }

    const matches = matchesData || []
    const matchIds = matches.map(m => m.id)

    // Calcular estadísticas por equipo y KPIs globales de partidos
    const teamStatsMap = new Map<string, TeamStatDTO>()
    teams.forEach(t => {
      teamStatsMap.set(t.id, {
        teamId: t.id,
        teamName: t.name,
        teamCategory: t.category || '-',
        matchesPlayed: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDiff: 0,
        winRate: 0
      })
    })

    let totalMatches = 0
    let wins = 0
    let draws = 0
    let losses = 0
    let goalsFor = 0
    let goalsAgainst = 0

    matches.forEach(m => {
      // Solo contar partidos que tengan resultado registrado
      if (m.resultado_propio !== null && m.resultado_rival !== null) {
        totalMatches++
        const gf = m.resultado_propio || 0
        const ga = m.resultado_rival || 0
        goalsFor += gf
        goalsAgainst += ga

        const isWin = gf > ga
        const isDraw = gf === ga
        const isLoss = gf < ga

        if (isWin) wins++
        else if (isDraw) draws++
        else if (isLoss) losses++

        const tStat = teamStatsMap.get(m.equipo_id)
        if (tStat) {
          tStat.matchesPlayed++
          tStat.goalsFor += gf
          tStat.goalsAgainst += ga
          tStat.goalDiff = tStat.goalsFor - tStat.goalsAgainst
          if (isWin) tStat.wins++
          else if (isDraw) tStat.draws++
          else if (isLoss) tStat.losses++
          tStat.winRate = tStat.matchesPlayed > 0 ? Math.round((tStat.wins / tStat.matchesPlayed) * 100) : 0
        }
      }
    })

    const teamStats = Array.from(teamStatsMap.values()).sort((a, b) => b.matchesPlayed - a.matchesPlayed)

    // 5. Obtener convocatorias para estadísticas de jugadores
    let convocatorias: any[] = []
    if (matchIds.length > 0) {
      const { data: convData } = await supabase
        .from('convocatorias')
        .select('player_id, partido_id, goals, yellow_cards, red_cards, minutes_played')
        .in('partido_id', matchIds)
      
      convocatorias = convData || []
    }

    const playerAggMap = new Map<string, PlayerStatDTO>()
    players.forEach(p => {
      const teamInfo = p.team_id ? teamMap.get(p.team_id) : null
      playerAggMap.set(p.id, {
        playerId: p.id,
        playerName: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Jugador',
        playerDorsal: p.dorsal,
        teamId: p.team_id,
        teamName: teamInfo?.name || 'Sin equipo',
        matchesPlayed: 0,
        minutesPlayed: 0,
        goals: 0,
        yellowCards: 0,
        redCards: 0
      })
    })

    let totalYellow = 0
    let totalRed = 0
    let totalMinutes = 0

    convocatorias.forEach(c => {
      const pStat = playerAggMap.get(c.player_id)
      if (pStat) {
        pStat.matchesPlayed++
        const g = c.goals || 0
        const y = c.yellow_cards || 0
        const r = c.red_cards || 0
        const min = c.minutes_played || 0

        pStat.goals += g
        pStat.yellowCards += y
        pStat.redCards += r
        pStat.minutesPlayed += min

        totalYellow += y
        totalRed += r
        totalMinutes += min
      }
    })

    const playerStats = Array.from(playerAggMap.values())
      .filter(p => p.matchesPlayed > 0 || p.minutesPlayed > 0 || p.goals > 0)
      .sort((a, b) => b.goals - a.goals || b.minutesPlayed - a.minutesPlayed)

    const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0

    const kpis: GlobalStatsKPIs = {
      totalPlayers: players.length,
      totalTeams: teams.length,
      totalMatches,
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
      yellowCards: totalYellow,
      redCards: totalRed,
      totalMinutes,
      winRate
    }

    return {
      success: true,
      kpis,
      teamStats,
      playerStats,
      teams,
      seasons
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error al obtener estadísticas globales' }
  }
}
