"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { AlertTriangle, ArrowLeft, ArrowDown, ArrowUp, Activity, Filter, AlertCircle } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { DisciplineModal } from "@/components/features/matches/DisciplineModal"

interface DisciplineRow {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  avatar_url?: string;
  yellows: number;
  reds: number;
  cycleCards: number;
  playerData: any; // Para pasarlo al modal
  cardEvents: any[]; // Para pasarlo al modal
}

export default function DisciplinaPage() {
  const [data, setData] = useState<DisciplineRow[]>([])
  const [teams, setTeams] = useState<{id: string, name: string}[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string>("todos")
  const [loading, setLoading] = useState(true)
  const [sortCol, setSortCol] = useState<'yellows' | 'reds' | 'playerName' | 'teamName'>('yellows')
  const [sortDesc, setSortDesc] = useState(true)
  
  // States for Modal
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [allMatches, setAllMatches] = useState<any[]>([])
  const [allConvocatorias, setAllConvocatorias] = useState<any[]>([])

  const supabase = createClient()
  const router = useRouter()

  const fetchData = async () => {
    // 0. Get active season
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('profiles').select('club_id').eq('id', user.id).single()
    const { data: activeSeason } = await supabase.from('seasons').select('id').eq('club_id', profile?.club_id).eq('is_active', true).single()

    // 1. Fetch teams
    let teamsQuery = supabase.from('teams').select('id, name').eq('club_id', profile?.club_id)
    if (activeSeason?.id) teamsQuery = teamsQuery.eq('season_id', activeSeason.id)
    const { data: teamsData } = await teamsQuery
    
    const teamIds = (teamsData || []).map(t => t.id)
    if (teamsData) setTeams(teamsData)

    // 2. Fetch all matches
    let matchesQuery = supabase.from('partidos').select('*').eq('club_id', profile?.club_id).order('fecha_hora', { ascending: false })
    if (activeSeason?.id) matchesQuery = matchesQuery.eq('season_id', activeSeason.id)
    const { data: matches } = await matchesQuery
    
    const matchIds = (matches || []).map(m => m.id)
    if (matches) setAllMatches(matches)

    // 3. Fetch convocatorias with cards
    let convs: any[] = []
    if (matchIds.length > 0) {
      const { data } = await supabase.from('convocatorias').select('*').in('match_id', matchIds)
      convs = data || []
    }
    setAllConvocatorias(convs)

    // 4. Fetch players with team info
    let players: any[] = []
    if (teamIds.length > 0 && activeSeason?.id) {
      const { data } = await supabase
        .from('player_season_history')
        .select(`
          team_id,
          teams ( name ),
          players!inner (*)
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

    const playerMap = new Map<string, DisciplineRow>()

    players?.forEach((p: any) => {
      playerMap.set(p.id, {
        playerId: p.id,
        playerName: `${p.first_name} ${p.last_name || ''}`.trim(),
        teamId: p.team_id,
        teamName: p.teams?.name || 'Sin equipo',
        avatar_url: p.avatar_url,
        yellows: 0,
        reds: 0,
        cycleCards: 0,
        playerData: p,
        cardEvents: []
      })
    })

    convs?.forEach(conv => {
      const p = playerMap.get(conv.player_id)
      if (p) {
        if (conv.yellow_cards > 0 || conv.red_cards > 0) {
          p.yellows += (conv.yellow_cards || 0)
          p.reds += (conv.red_cards || 0)
          
          const match = matches?.find(m => m.id === conv.partido_id)
          if (match) {
            p.cardEvents.push({
              match,
              yellow: conv.yellow_cards || 0,
              red: conv.red_cards || 0
            })
          }
        }
      }
    })

    // Sort cardEvents by date desc and calculate cycles
    playerMap.forEach(p => {
      const chrono = [...p.cardEvents].sort((a, b) => new Date(a.match.fecha_hora).getTime() - new Date(b.match.fecha_hora).getTime());
      let cycleCards = 0;
      chrono.forEach(evt => {
        if (evt.yellow === 1) {
          cycleCards += 1;
          if (cycleCards === 5) cycleCards = 0;
        }
      });
      p.cycleCards = cycleCards;

      p.cardEvents.sort((a, b) => new Date(b.match.fecha_hora).getTime() - new Date(a.match.fecha_hora).getTime())
    })

    // Only show players with at least one card
    const filtered = Array.from(playerMap.values()).filter(p => p.yellows > 0 || p.reds > 0)
    
    setData(filtered)
    setLoading(false)
    router.refresh()
  }

  useEffect(() => {
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

  // Modal handlers
  const selectedRow = data.find(r => r.playerId === selectedPlayerId)
  
  const getRecentMatches = (teamId: string, cardEvents: any[]) => {
    // 1. Get matches for the current team
    const teamMatches = allMatches
      .filter(m => m.equipo_id === teamId && (m.estado === 'Finalizado' || new Date(m.fecha_hora) < new Date()))
      
    // 2. Add matches from cardEvents (in case the player got cards in a previous team)
    const eventMatches = cardEvents.map(ev => ev.match);
    
    // Merge and deduplicate
    const combinedMap = new Map();
    [...teamMatches, ...eventMatches].forEach(m => {
      combinedMap.set(m.id, m);
    });

    return Array.from(combinedMap.values())
      .sort((a, b) => new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime())
      .slice(0, 15)
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
          
          {/* BANNER APERCIBIDOS (GLOBAL) */}
          {sortedAndFilteredData.filter(d => d.cycleCards === 4).length > 0 && (
            <div className="bg-orange-50 border-b border-orange-200 px-5 py-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-orange-500 mt-0.5 shrink-0" size={20} />
                <div>
                  <h4 className="text-sm font-bold text-orange-800">Jugadores Apercibidos ({sortedAndFilteredData.filter(d => d.cycleCards === 4).length})</h4>
                  <p className="text-sm text-orange-700 mt-0.5 mb-2">
                    Los siguientes jugadores acumulan 4 tarjetas amarillas y serán suspendidos si reciben una tarjeta más:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {sortedAndFilteredData.filter(d => d.cycleCards === 4).map(a => (
                      <button 
                        key={a.playerId} 
                        onClick={() => setSelectedPlayerId(a.playerId)}
                        className="bg-white border border-orange-300 text-orange-800 text-xs font-bold px-3 py-1 rounded-full shadow-sm hover:bg-orange-100 transition-colors flex items-center gap-1.5"
                      >
                        <div className="w-2 h-3 bg-amber-400 rounded-sm"></div>
                        {a.playerName} <span className="font-normal opacity-70 ml-1">({a.teamName})</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

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
                  <tr 
                    key={row.playerId} 
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedPlayerId(row.playerId)}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {row.avatar_url ? (
                          <img src={row.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shadow-sm" />
                        ) : (
                          <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold text-xs">
                            {row.playerName.charAt(0)}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="font-semibold text-blue-600 group-hover:text-blue-800 transition-colors flex items-center gap-2">
                            {row.playerName}
                            {row.cycleCards === 4 && (
                              <span title="Apercibido (Próxima amarilla conlleva sanción)" className="flex items-center text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold">
                                <AlertCircle size={10} className="mr-1"/> Apercibido
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
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

      {selectedRow && (
        <DisciplineModal 
          player={selectedRow.playerData}
          cardEvents={selectedRow.cardEvents}
          recentMatches={getRecentMatches(selectedRow.teamId, selectedRow.cardEvents)}
          convocatorias={allConvocatorias}
          onClose={() => {
            setSelectedPlayerId(null)
          }}
          onCardsUpdated={(yellowDelta, redDelta) => {
            setData(prev => {
              const newData = prev.map(p => {
                if (p.playerId === selectedRow.playerId) {
                  return {
                    ...p,
                    yellows: p.yellows + yellowDelta,
                    reds: p.reds + redDelta
                  }
                }
                return p
              });
              // Sort them again
              return newData.sort((a, b) => {
                if (sortCol === 'yellows') return sortDesc ? b.yellows - a.yellows : a.yellows - b.yellows
                if (sortCol === 'reds') return sortDesc ? b.reds - a.reds : a.reds - b.reds
                if (sortCol === 'playerName') return sortDesc ? b.playerName.localeCompare(a.playerName) : a.playerName.localeCompare(b.playerName)
                if (sortCol === 'teamName') return sortDesc ? b.teamName.localeCompare(a.teamName) : a.teamName.localeCompare(b.teamName)
                return 0
              })
            })
          }}
        />
      )}
    </div>
  )
}
