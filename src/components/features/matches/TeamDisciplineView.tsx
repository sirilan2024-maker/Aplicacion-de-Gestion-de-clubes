"use client"

import { useState, useEffect } from "react"
import { AlertCircle, ArrowLeft, Search, Bell } from "lucide-react"
import { useRouter } from "next/navigation"
import { DisciplineModal } from "./DisciplineModal"
import { sendDisciplineAlertAction } from "@/app/actions/chat-actions"
import { createClient } from "@/lib/supabase/client"

interface TeamDisciplineViewProps {
  matches: any[]
  players: any[]
  convocatorias: any[]
  teamId: string
}

export function TeamDisciplineView({ matches, players, convocatorias, teamId }: TeamDisciplineViewProps) {
  const router = useRouter()
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [localConvocatorias, setLocalConvocatorias] = useState<any[]>(convocatorias)
  const [canSendAlerts, setCanSendAlerts] = useState(false)
  const [alertingId, setAlertingId] = useState<string | null>(null)

  useEffect(() => {
    setLocalConvocatorias(convocatorias)
  }, [convocatorias])

  useEffect(() => {
    const checkRole = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role, roles').eq('id', user.id).single()
        if (profile) {
          const hasAccess = ['admin', 'superadmin', 'coordinador'].includes(profile.role) || (profile.roles && profile.roles.some((r: string) => ['admin', 'superadmin', 'coordinador'].includes(r)))
          setCanSendAlerts(hasAccess)
        }
      }
    }
    checkRole()
  }, [])

  const handleAvisarEntrenador = async (e: React.MouseEvent, player: any) => {
    e.stopPropagation()
    const pTeamId = player.team_id || teamId
    if (pTeamId === 'all') {
      alert("No se puede determinar el equipo del jugador.")
      return
    }
    
    setAlertingId(player.id)
    try {
      const res = await sendDisciplineAlertAction(
        player.id, 
        pTeamId, 
        `${player.first_name} ${player.last_name}`, 
        player.teams?.name || "Equipo"
      )
      
      if (res.success) {
        alert("Aviso enviado correctamente al entrenador.")
      } else {
        alert("Error al enviar el aviso: " + res.error)
      }
    } catch (err) {
      alert("Error inesperado.")
    } finally {
      setAlertingId(null)
    }
  }

  // Filtrar jugadores válidos (del equipo actual y sin cuerpo técnico)
  const validPlayers = players.filter(p => {
    const pos = (p.posicion || '').toLowerCase()
    const isTeamMatch = teamId === 'all' || p.team_id === teamId
    return isTeamMatch && !pos.includes('entrenador') && !pos.includes('delegado') && !pos.includes('cuerpo técnico')
  })

  // Calcular totales por jugador
  const disciplineData = validPlayers.map(player => {
    const playerConvs = localConvocatorias.filter(c => c.player_id === player.id)
    let totalYellow = 0
    let totalRed = 0
    
    const rawEvents: any[] = []

    playerConvs.forEach(conv => {
      const match = matches.find(m => m.id === conv.partido_id)
      if (match && (conv.yellow_cards > 0 || conv.red_cards > 0)) {
        totalYellow += (conv.yellow_cards || 0)
        totalRed += (conv.red_cards || 0)
        rawEvents.push({
          match,
          yellow: conv.yellow_cards || 0,
          red: conv.red_cards || 0
        })
      }
    })

    // Ordenar cronológicamente para calcular ciclos
    const chronologicalEvents = [...rawEvents].sort((a, b) => new Date(a.match.fecha_hora).getTime() - new Date(b.match.fecha_hora).getTime());
    let cycleCards = 0;
    let cyclesCompleted = 0;

    chronologicalEvents.forEach(evt => {
      if (evt.yellow === 2) {
        // Doble amarilla = Roja. No suma al ciclo.
      } else if (evt.yellow === 1) {
        cycleCards += 1;
        if (cycleCards === 5) {
          cyclesCompleted += 1;
          cycleCards = 0;
        }
      }
    });

    return {
      player,
      totalYellow,
      totalRed,
      cycleCards,
      cyclesCompleted,
      cardEvents: rawEvents.sort((a, b) => new Date(b.match.fecha_hora).getTime() - new Date(a.match.fecha_hora).getTime())
    }
  })

  // Ordenar por apercibidos primero, luego rojas, luego amarillas
  disciplineData.sort((a, b) => {
    const aApercibido = a.cycleCards === 4 ? 1 : 0
    const bApercibido = b.cycleCards === 4 ? 1 : 0
    if (aApercibido !== bApercibido) return bApercibido - aApercibido
    if (b.totalRed !== a.totalRed) return b.totalRed - a.totalRed
    if (b.totalYellow !== a.totalYellow) return b.totalYellow - a.totalYellow
    return a.player.first_name.localeCompare(b.player.first_name)
  })

  // Filtrar por buscador
  const filteredData = disciplineData.filter(d => {
    const name = `${d.player.first_name} ${d.player.last_name}`.toLowerCase()
    return name.includes(searchQuery.toLowerCase())
  })

  const selectedPlayer = disciplineData.find(d => d.player.id === selectedPlayerId)

  const handleOpenModal = (playerId: string) => {
    setSelectedPlayerId(playerId)
  }

  const handleCloseModal = () => {
    setSelectedPlayerId(null)
    router.refresh()
  }

  // Partidos recientes para el modo edición
  const recentMatches = [...matches]
    .filter(m => m.estado === 'Finalizado' || new Date(m.fecha_hora) < new Date())
    .sort((a, b) => new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime())
    .slice(0, 15) // Últimos 15 partidos

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-5 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="text-red-500" />
          <h3 className="text-lg font-bold text-slate-900">Historial Disciplinario</h3>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar jugador..." 
            className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* BANNER APERCIBIDOS */}
      {disciplineData.filter(d => d.cycleCards === 4).length > 0 && (
        <div className="bg-orange-50 border-b border-orange-200 px-5 py-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-orange-500 mt-0.5 shrink-0" size={20} />
            <div>
              <h4 className="text-sm font-bold text-orange-800">Jugadores Apercibidos ({disciplineData.filter(d => d.cycleCards === 4).length})</h4>
              <p className="text-sm text-orange-700 mt-0.5 mb-2">
                Los siguientes jugadores acumulan 4 tarjetas amarillas y serán suspendidos si reciben una tarjeta más:
              </p>
              <div className="flex flex-wrap gap-2">
                {disciplineData.filter(d => d.cycleCards === 4).map(a => (
                  <div key={a.player.id} className="flex items-center gap-0">
                    <button 
                      onClick={() => handleOpenModal(a.player.id)}
                      className="bg-white border border-orange-300 text-orange-800 text-xs font-bold px-3 py-1 rounded-full shadow-sm hover:bg-orange-100 transition-colors flex items-center gap-1.5"
                    >
                      <div className="w-2 h-3 bg-amber-400 rounded-sm"></div>
                      {a.player.first_name} {a.player.last_name}
                    </button>
                    {canSendAlerts && (
                      <button
                        onClick={(e) => handleAvisarEntrenador(e, a.player)}
                        disabled={alertingId === a.player.id}
                        className="bg-white border border-slate-200 text-slate-600 hover:text-blue-600 text-xs px-2 py-1 rounded-full shadow-sm hover:bg-slate-50 transition-colors flex items-center gap-1 -ml-1 disabled:opacity-50 z-10"
                        title="Avisar al entrenador"
                      >
                        <Bell size={12} className={alertingId === a.player.id ? "animate-pulse" : ""} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-0">
        {/* Vista Desktop (Tabla) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap min-w-[500px]">
            <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase font-bold text-slate-500">
              <tr>
                <th className="px-6 py-4">Jugador</th>
                <th className="px-6 py-4 text-center w-32">
                  <div className="flex justify-center items-center gap-1">
                    <div className="w-3 h-4 bg-amber-400 rounded-sm"></div>
                    <span>Amarillas</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-center w-32">
                  <div className="flex justify-center items-center gap-1">
                    <div className="w-3 h-4 bg-red-500 rounded-sm"></div>
                    <span>Rojas</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-right">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.map(d => (
                <tr 
                  key={d.player.id} 
                  onClick={() => handleOpenModal(d.player.id)}
                  className={`transition-colors cursor-pointer group ${d.cycleCards === 4 ? 'bg-orange-50 hover:bg-orange-100' : 'hover:bg-slate-50'}`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {d.player.avatar_url ? (
                        <img src={d.player.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shadow-sm" />
                      ) : (
                        <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold text-xs">
                          {d.player.first_name.charAt(0)}{d.player.last_name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          {d.player.first_name} {d.player.last_name}
                          {d.cycleCards === 4 && (
                            <span title="Apercibido (Próxima amarilla conlleva sanción)" className="flex items-center text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded text-[10px] uppercase">
                              <AlertCircle size={10} className="mr-1"/> Apercibido
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 capitalize">{d.player.posicion || 'Sin posición'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-slate-700">
                    {d.totalYellow > 0 ? d.totalYellow : '-'}
                    {d.cyclesCompleted > 0 && (
                      <div className="text-[10px] text-slate-400 font-normal mt-0.5" title="Sanciones cumplidas (Ciclos de 5)">
                        ({d.cyclesCompleted} ciclos)
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`font-black ${d.totalRed > 0 ? 'text-red-500' : 'text-slate-300'}`}>
                      {d.totalRed}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {canSendAlerts && d.cycleCards === 4 && (
                        <button
                          onClick={(e) => handleAvisarEntrenador(e, d.player)}
                          disabled={alertingId === d.player.id}
                          className="text-slate-400 hover:text-blue-600 transition-colors disabled:opacity-50 p-1.5 hover:bg-blue-50 rounded-full"
                          title="Avisar al entrenador"
                        >
                          <Bell size={16} className={alertingId === d.player.id ? "animate-pulse" : ""} />
                        </button>
                      )}
                      <span className="text-blue-600 font-bold text-xs uppercase opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end gap-1">
                        Ver <ArrowLeft size={14} className="rotate-180" />
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    No se encontraron jugadores.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Vista Móvil (Tarjetas) */}
        <div className="block md:hidden space-y-3 p-3 bg-slate-50/50">
          {filteredData.map(d => (
            <div 
              key={d.player.id} 
              onClick={() => handleOpenModal(d.player.id)}
              className={`p-4 rounded-xl shadow-sm border transition-colors cursor-pointer group ${d.cycleCards === 4 ? 'bg-orange-50 hover:bg-orange-100 border-orange-200' : 'bg-white hover:bg-slate-50 border-slate-200'}`}
            >
              <div className="flex items-center gap-3 mb-3">
                {d.player.avatar_url ? (
                  <img src={d.player.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover shadow-sm" />
                ) : (
                  <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold text-sm">
                    {d.player.first_name.charAt(0)}{d.player.last_name.charAt(0)}
                  </div>
                )}
                <div className="flex-1">
                  <div className="font-bold text-slate-900 flex flex-wrap items-center gap-2">
                    {d.player.first_name} {d.player.last_name}
                    {d.cycleCards === 4 && (
                      <span title="Apercibido (Próxima amarilla conlleva sanción)" className="flex items-center text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded text-[10px] uppercase">
                        <AlertCircle size={10} className="mr-1"/> Apercibido
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 capitalize">{d.player.posicion || 'Sin posición'}</div>
                </div>
                {canSendAlerts && d.cycleCards === 4 && (
                  <button
                    onClick={(e) => handleAvisarEntrenador(e, d.player)}
                    disabled={alertingId === d.player.id}
                    className="text-slate-400 hover:text-blue-600 transition-colors disabled:opacity-50 p-1.5 hover:bg-blue-50 rounded-full"
                    title="Avisar al entrenador"
                  >
                    <Bell size={16} className={alertingId === d.player.id ? "animate-pulse" : ""} />
                  </button>
                )}
              </div>
              <div className="flex gap-4">
                <div className="bg-white p-2 rounded-lg flex-1 text-center border border-slate-200 flex flex-col items-center justify-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <div className="w-2.5 h-3.5 bg-amber-400 rounded-sm"></div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Amarillas</span>
                  </div>
                  <div className="font-bold text-slate-700">
                    {d.totalYellow > 0 ? d.totalYellow : '-'}
                  </div>
                  {d.cyclesCompleted > 0 && (
                    <div className="text-[10px] text-slate-400 font-normal">
                      ({d.cyclesCompleted} ciclos)
                    </div>
                  )}
                </div>
                <div className="bg-white p-2 rounded-lg flex-1 text-center border border-slate-200 flex flex-col items-center justify-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <div className="w-2.5 h-3.5 bg-red-500 rounded-sm"></div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Rojas</span>
                  </div>
                  <div className={`font-black ${d.totalRed > 0 ? 'text-red-500' : 'text-slate-300'}`}>
                    {d.totalRed}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filteredData.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              No se encontraron jugadores.
            </div>
          )}
        </div>
      </div>

      {selectedPlayer && (
        <DisciplineModal 
          player={selectedPlayer.player}
          cardEvents={selectedPlayer.cardEvents}
          recentMatches={recentMatches}
          convocatorias={localConvocatorias}
          onClose={handleCloseModal}
          onCardsUpdated={(yellowDelta, redDelta, matchId, yellows, reds) => {
            setLocalConvocatorias(prev => {
              const existingIdx = prev.findIndex(c => c.partido_id === matchId && c.player_id === selectedPlayer.player.id)
              if (existingIdx >= 0) {
                const next = [...prev]
                next[existingIdx] = { ...next[existingIdx], yellow_cards: yellows, red_cards: reds }
                return next
              } else {
                return [...prev, { partido_id: matchId, player_id: selectedPlayer.player.id, yellow_cards: yellows, red_cards: reds }]
              }
            })
          }}
        />
      )}
    </div>
  )
}
