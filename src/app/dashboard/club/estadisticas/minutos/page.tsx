// src/app/dashboard/club/estadisticas/minutos/page.tsx
"use client"

import { useEffect, useState, useMemo, Suspense } from "react"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, ArrowDown, ArrowUp, Activity, Filter, Clock } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

interface MinutesRow {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  matchMinutes: number;
}

export default function MinutosPage() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-7xl mx-auto p-12 text-center flex flex-col items-center justify-center gap-2 h-64">
        <Activity className="animate-spin text-indigo-500" size={32} />
        <p className="text-slate-500">Cargando registros de minutos...</p>
      </div>
    }>
      <MinutosPageContent />
    </Suspense>
  )
}

function MinutosPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryTeamId = searchParams.get('teamId')

  const [data, setData] = useState<MinutesRow[]>([])
  const [teams, setTeams] = useState<{id: string, name: string}[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string>(queryTeamId || "todos")
  const [loading, setLoading] = useState(true)
  const [sortCol, setSortCol] = useState<'matchMinutes' | 'playerName' | 'teamName'>('matchMinutes')
  const [sortDesc, setSortDesc] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      // 0. Get active season
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('club_id').eq('id', user.id).single()
      const { data: activeSeason } = await supabase.from('seasons').select('id').eq('club_id', profile?.club_id).eq('is_active', true).single()

      // 1. Fetch metrics definitions
      const { data: metrics } = await supabase.from('club_metrics').select('id, name')
      const minIds = metrics?.filter(m => m.name.toLowerCase().includes('minutos')).map(m => m.id) || []

      if (minIds.length === 0) {
        setLoading(false)
        return
      }

      // 2. Fetch teams
      let teamsQuery = supabase.from('teams').select('id, name').eq('club_id', profile?.club_id)
      if (activeSeason?.id) teamsQuery = teamsQuery.eq('season_id', activeSeason.id)

      const { data: profileRoleData } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (profileRoleData?.role === 'coach' || profileRoleData?.role === 'entrenador' || profileRoleData?.role === 'delegado') {
        const { data: coachTeams } = await supabase.from('team_coaches').select('team_id').eq('profile_id', user.id);
        const teamIds = coachTeams?.map(ct => ct.team_id) || [];
        if (teamIds.length > 0) {
          teamsQuery = teamsQuery.or(`coach_id.eq.${user.id},id.in.(${teamIds.join(',')})`);
        } else {
          teamsQuery = teamsQuery.eq('coach_id', user.id);
        }
      }

      const { data: teamsData } = await teamsQuery
      
      const teamIds = (teamsData || []).map(t => t.id)
      if (teamsData) setTeams(teamsData)

      // 3. Fetch players with team info
      let players: any[] = []
      if (teamIds.length > 0 && activeSeason?.id) {
        const { data } = await supabase
          .from('player_season_history')
          .select(`
            team_id,
            teams ( name ),
            players!inner (id, first_name, last_name, status)
          `)
          .in('team_id', teamIds)
          .eq('season_id', activeSeason.id)
          .neq('status', 'inactive')
          
        if (data) {
          players = data.map((h: any) => ({
            ...h.players,
            team_id: h.team_id,
            teams: h.teams
          }))
        }
      }

      // 4. Fetch team events for active season to filter perf
      let events: any[] = []
      if (teamIds.length > 0) {
        const { data } = await supabase.from('team_events').select('id, event_type').in('team_id', teamIds)
        events = data || []
      }
      const eventIds = (events || []).map(e => e.id)

      // 5. Fetch performance data for minutes
      let perf: any[] = []
      if (eventIds.length > 0) {
        const { data } = await supabase
          .from('player_training_metrics')
          .select('event_id, value_number, player_id')
          .in('metric_id', minIds)
          .in('event_id', eventIds)
        perf = data || []
      }

      if ((!perf || perf.length === 0) && teamIds.length === 0) {
        setLoading(false)
        return
      }

      const perfEventIds = [...new Set(perf.map(p => p.event_id))]

      // 5b. Fetch match minutes from convocatorias
      let matchMinutes: any[] = []
      if (teamIds.length > 0) {
        const { data: convs } = await supabase
          .from('convocatorias')
          .select('player_id, minutes_played, partidos!inner(equipo_id, estado)')
          .in('partidos.equipo_id', teamIds)
          .eq('partidos.estado', 'Finalizado');
        if (convs) matchMinutes = convs;
      }

      // 5c. Fetch team_events to know event types
      const eventTypeMap = new Map<string, string>()
      events.forEach(e => eventTypeMap.set(e.id, e.event_type))

      const playerMap = new Map<string, MinutesRow>()

      players?.forEach((p: any) => {
        playerMap.set(p.id, {
          playerId: p.id,
          playerName: `${p.first_name} ${p.last_name || ''}`.trim(),
          teamId: p.team_id,
          teamName: p.teams?.name || 'Sin equipo',
          matchMinutes: 0
        })
      })

      // Sum minutes from events that are Matches
      perf.forEach(row => {
        const p = playerMap.get(row.player_id)
        if (p) {
          const type = eventTypeMap.get(row.event_id)
          const mins = row.value_number || 0
          
          if (type === 'Partido' || type?.toLowerCase().includes('partido')) {
            p.matchMinutes += mins
          }
        }
      })

      // Sum minutes from match convocatorias
      matchMinutes.forEach(row => {
        const p = playerMap.get(row.player_id)
        if (p) {
          const mins = row.minutes_played || 0
          p.matchMinutes += mins
        }
      })

      // Only show players with some match minutes recorded
      const filtered = Array.from(playerMap.values()).filter(p => p.matchMinutes > 0)
      
      setData(filtered)
      setLoading(false)
    }

    fetchData()
  }, [])

  const sortedAndFilteredData = useMemo(() => {
    // 1. Filter by team
    const filtered = data.filter(row => {
      if (selectedTeamId === "todos") return true;
      return row.teamId === selectedTeamId;
    });

    // 2. Sort
    return [...filtered].sort((a, b) => {
      let valA = a[sortCol];
      let valB = b[sortCol];

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDesc ? valB.localeCompare(valA) : valA.localeCompare(valB)
      }
      
      // Numbers
      if (valA < valB) return sortDesc ? 1 : -1
      if (valA > valB) return sortDesc ? -1 : 1
      return 0
    })
  }, [data, sortCol, sortDesc, selectedTeamId])

  const handleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDesc(!sortDesc)
    else {
      setSortCol(col)
      setSortDesc(true)
    }
  }

  const SortIcon = ({ col }: { col: typeof sortCol }) => {
    if (sortCol !== col) return null
    return sortDesc ? <ArrowDown size={14} className="inline ml-1" /> : <ArrowUp size={14} className="inline ml-1" />
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => queryTeamId ? router.push(`/dashboard/equipos/${queryTeamId}/estadisticas`) : router.back()} 
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowLeft className="text-slate-500" size={24} />
          </button>
          <div className="flex items-center gap-3">
            <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
              <Clock size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Detalle de Minutos Jugados</h1>
              <p className="text-slate-500">Análisis del tiempo de juego en partidos oficiales.</p>
            </div>
          </div>
        </div>

        {/* Selector de Equipo */}
        {!queryTeamId && (
          <div className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-xl shadow-sm">
            <Filter size={18} className="text-gray-400" />
            <select 
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="bg-transparent border-none outline-none font-bold text-slate-700 cursor-pointer"
            >
              <option value="todos">Todos los Equipos</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
          <Activity className="animate-spin text-indigo-500" size={32} />
          <p className="text-slate-500">Cargando registros de minutos...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-gray-200">
          <p className="text-slate-500 font-medium">No hay registros de minutos de partidos en la temporada.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          {/* Vista Desktop (Tabla) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th 
                    onClick={() => handleSort('playerName')}
                    className="p-4 border-b border-gray-200 bg-gray-50 font-bold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    Jugador <SortIcon col="playerName" />
                  </th>
                  <th 
                    onClick={() => handleSort('teamName')}
                    className="p-4 border-b border-gray-200 bg-gray-50 font-bold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    Equipo <SortIcon col="teamName" />
                  </th>
                  <th 
                    onClick={() => handleSort('matchMinutes')}
                    className="p-4 border-b border-gray-200 bg-indigo-50 text-right font-bold text-indigo-800 cursor-pointer hover:bg-indigo-100 transition-colors"
                  >
                    Minutos Jugados (min) <SortIcon col="matchMinutes" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedAndFilteredData.map((row) => (
                  <tr key={row.playerId} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-semibold text-slate-800">
                      {row.playerName}
                    </td>
                    <td className="p-4 text-slate-600 font-medium">
                      {row.teamName}
                    </td>
                    <td className="p-4 text-right font-black text-indigo-700">
                      {row.matchMinutes}
                    </td>
                  </tr>
                ))}
                {sortedAndFilteredData.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-slate-500">
                      Este equipo no tiene jugadores con minutos de partidos registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Vista Móvil (Tarjetas) */}
          <div className="block md:hidden space-y-3 p-3 bg-slate-50/50">
            {sortedAndFilteredData.map((row) => (
              <div key={row.playerId} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-900 text-base block">
                      {row.playerName}
                    </span>
                    <div className="text-xs text-slate-500 mt-1">
                      {row.teamName}
                    </div>
                  </div>
                  <div className="bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100 text-center flex flex-col items-center justify-center min-w-[70px]">
                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-0.5">Minutos</span>
                    <span className="font-black text-indigo-700 text-lg">{row.matchMinutes}</span>
                  </div>
                </div>
              </div>
            ))}
            {sortedAndFilteredData.length === 0 && (
              <div className="p-8 text-center text-slate-500">
                Este equipo no tiene jugadores con minutos de partidos registrados.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
