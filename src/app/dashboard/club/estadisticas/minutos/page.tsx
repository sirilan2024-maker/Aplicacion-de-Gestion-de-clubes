"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, ArrowDown, ArrowUp, Activity, Filter, Clock } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface MinutesRow {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  trainingMinutes: number;
  matchMinutes: number;
  totalMinutes: number;
}

export default function MinutosPage() {
  const router = useRouter()
  const [data, setData] = useState<MinutesRow[]>([])
  const [teams, setTeams] = useState<{id: string, name: string}[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string>("todos")
  const [loading, setLoading] = useState(true)
  const [sortCol, setSortCol] = useState<'trainingMinutes' | 'matchMinutes' | 'totalMinutes' | 'playerName' | 'teamName'>('totalMinutes')
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
      const { data: teamsData } = await teamsQuery
      
      const teamIds = (teamsData || []).map(t => t.id)
      if (teamsData) setTeams(teamsData)

      // 3. Fetch players with team info
      let players: any[] = []
      if (teamIds.length > 0) {
        const { data } = await supabase
          .from('players')
          .select(`
            id, 
            first_name, 
            last_name, 
            team_id,
            teams ( name )
          `)
          .neq('status', 'inactive')
          .in('team_id', teamIds)
        players = data || []
      }

      // 4. Fetch team events for active season to filter perf
      let events: any[] = []
      if (teamIds.length > 0) {
        const { data } = await supabase.from('team_events').select('id').in('team_id', teamIds)
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

      if (!perf || perf.length === 0) {
        setLoading(false)
        return
      }

      const perfEventIds = [...new Set(perf.map(p => p.event_id))]

      // 5. Fetch team_events to know if it's training or match
      const { data: perfEvents } = await supabase
        .from('team_events')
        .select('id, event_type')
        .in('id', perfEventIds)

      const eventTypeMap = new Map<string, string>()
      perfEvents?.forEach(e => eventTypeMap.set(e.id, e.event_type))

      const playerMap = new Map<string, MinutesRow>()

      players?.forEach((p: any) => {
        playerMap.set(p.id, {
          playerId: p.id,
          playerName: `${p.first_name} ${p.last_name || ''}`.trim(),
          teamId: p.team_id,
          teamName: p.teams?.name || 'Sin equipo',
          trainingMinutes: 0,
          matchMinutes: 0,
          totalMinutes: 0
        })
      })

      perf.forEach(row => {
        const p = playerMap.get(row.player_id)
        if (p) {
          const type = eventTypeMap.get(row.event_id)
          const mins = row.value_number || 0
          
          if (type === 'Entrenamiento') {
            p.trainingMinutes += mins
          } else if (type === 'Partido' || type?.toLowerCase().includes('partido')) {
            p.matchMinutes += mins
          } else {
            // fallback
            p.trainingMinutes += mins
          }
          p.totalMinutes += mins
        }
      })

      // Only show players with some minutes recorded
      const filtered = Array.from(playerMap.values()).filter(p => p.totalMinutes > 0)
      
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
      setSortDesc(true) // default to descending for new column
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
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft className="text-slate-500" size={24} />
          </button>
          <div className="flex items-center gap-3">
            <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
              <Clock size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Detalle de Minutos Jugados</h1>
              <p className="text-slate-500">Análisis del tiempo en pista por entrenamiento y partido.</p>
            </div>
          </div>
        </div>

        {/* Selector de Equipo */}
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
      </div>

      {loading ? (
        <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
          <Activity className="animate-spin text-indigo-500" size={32} />
          <p className="text-slate-500">Cargando registros de minutos...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-gray-200">
          <p className="text-slate-500 font-medium">No hay registros de minutos en la temporada.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
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
                    onClick={() => handleSort('trainingMinutes')}
                    className="p-4 border-b border-gray-200 bg-emerald-50 text-right font-bold text-emerald-800 cursor-pointer hover:bg-emerald-100 transition-colors"
                  >
                    Entrenamientos (min) <SortIcon col="trainingMinutes" />
                  </th>
                  <th 
                    onClick={() => handleSort('matchMinutes')}
                    className="p-4 border-b border-gray-200 bg-blue-50 text-right font-bold text-blue-800 cursor-pointer hover:bg-blue-100 transition-colors"
                  >
                    Partidos (min) <SortIcon col="matchMinutes" />
                  </th>
                  <th 
                    onClick={() => handleSort('totalMinutes')}
                    className="p-4 border-b border-gray-200 bg-indigo-50 text-right font-bold text-indigo-800 cursor-pointer hover:bg-indigo-100 transition-colors"
                  >
                    Total General <SortIcon col="totalMinutes" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedAndFilteredData.map((row) => (
                  <tr key={row.playerId} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-semibold text-blue-600 hover:text-blue-800 transition-colors">
                      <Link href={`/dashboard/equipos/${row.teamId}/jugador/${row.playerId}`}>
                        {row.playerName}
                      </Link>
                    </td>
                    <td className="p-4 text-slate-600 font-medium">
                      {row.teamName}
                    </td>
                    <td className="p-4 text-right text-emerald-700 font-medium">
                      {row.trainingMinutes}
                    </td>
                    <td className="p-4 text-right text-blue-700 font-medium">
                      {row.matchMinutes}
                    </td>
                    <td className="p-4 text-right font-black text-indigo-700">
                      {row.totalMinutes}
                    </td>
                  </tr>
                ))}
                {sortedAndFilteredData.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      Este equipo no tiene jugadores con minutos registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
