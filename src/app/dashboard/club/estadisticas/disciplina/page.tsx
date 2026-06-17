"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { AlertTriangle, ArrowLeft, ArrowDown, ArrowUp, Activity, Filter } from "lucide-react"
import Link from "next/link"

interface DisciplineRow {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  yellows: number;
  reds: number;
}

export default function DisciplinaPage() {
  const [data, setData] = useState<DisciplineRow[]>([])
  const [teams, setTeams] = useState<{id: string, name: string}[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string>("todos")
  const [loading, setLoading] = useState(true)
  const [sortCol, setSortCol] = useState<'yellows' | 'reds' | 'playerName' | 'teamName'>('yellows')
  const [sortDesc, setSortDesc] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      // 1. Fetch metrics definitions
      const { data: metrics } = await supabase.from('club_metrics').select('id, name')
      const amaIds = metrics?.filter(m => m.name.toLowerCase() === 'tarjetas amarillas').map(m => m.id) || []
      const rojIds = metrics?.filter(m => m.name.toLowerCase() === 'tarjetas rojas').map(m => m.id) || []

      if (amaIds.length === 0 && rojIds.length === 0) {
        setLoading(false)
        return
      }

      // 2. Fetch teams
      const { data: teamsData } = await supabase.from('equipos').select('id, name')
      if (teamsData) setTeams(teamsData)

      // 3. Fetch players with team info
      const { data: players } = await supabase
        .from('players')
        .select(`
          id, 
          first_name, 
          last_name, 
          team_id,
          equipos ( name )
        `)
        .neq('status', 'inactive')

      // 4. Fetch performance data for cards
      const { data: perf } = await supabase
        .from('player_training_metrics')
        .select('metric_id, value_number, player_id')
        .in('metric_id', [...amaIds, ...rojIds])

      const playerMap = new Map<string, DisciplineRow>()

      players?.forEach((p: any) => {
        playerMap.set(p.id, {
          playerId: p.id,
          playerName: `${p.first_name} ${p.last_name || ''}`.trim(),
          teamId: p.team_id,
          teamName: p.equipos?.name || 'Sin equipo',
          yellows: 0,
          reds: 0
        })
      })

      perf?.forEach(row => {
        const p = playerMap.get(row.player_id)
        if (p) {
          if (amaIds.includes(row.metric_id)) p.yellows += (row.value_number || 0)
          if (rojIds.includes(row.metric_id)) p.reds += (row.value_number || 0)
        }
      })

      // Only show players with at least one card
      const filtered = Array.from(playerMap.values()).filter(p => p.yellows > 0 || p.reds > 0)
      
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
          <Link href="/dashboard/club/estadisticas" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft className="text-slate-500" size={24} />
          </Link>
          <div className="flex items-center gap-3">
            <div className="bg-red-50 p-2 rounded-lg text-red-600">
              <AlertTriangle size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Detalle de Disciplina</h1>
              <p className="text-slate-500">Ranking global de tarjetas por jugador y equipo.</p>
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
          <Activity className="animate-spin text-red-500" size={32} />
          <p className="text-slate-500">Cargando registros disciplinarios...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-gray-200">
          <p className="text-slate-500 font-medium">No hay registros de tarjetas en la temporada.</p>
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
                    onClick={() => handleSort('yellows')}
                    className="p-4 border-b border-gray-200 bg-yellow-50 text-center font-bold text-yellow-800 cursor-pointer hover:bg-yellow-100 transition-colors"
                  >
                    Amarillas <SortIcon col="yellows" />
                  </th>
                  <th 
                    onClick={() => handleSort('reds')}
                    className="p-4 border-b border-gray-200 bg-red-50 text-center font-bold text-red-800 cursor-pointer hover:bg-red-100 transition-colors"
                  >
                    Rojas <SortIcon col="reds" />
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
                    <td className="p-4 text-center">
                      {row.yellows > 0 ? (
                        <span className="inline-flex items-center justify-center w-6 h-8 bg-yellow-400 rounded-sm shadow-sm border border-yellow-500 font-bold text-yellow-900">
                          {row.yellows}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {row.reds > 0 ? (
                        <span className="inline-flex items-center justify-center w-6 h-8 bg-red-500 rounded-sm shadow-sm border border-red-600 font-bold text-white">
                          {row.reds}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {sortedAndFilteredData.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500">
                      Este equipo no tiene jugadores con tarjetas.
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
