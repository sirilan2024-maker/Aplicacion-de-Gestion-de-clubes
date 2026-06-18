"use client"

import { useState } from "react"
import { AlertCircle, X, Search } from "lucide-react"

interface TeamDisciplineViewProps {
  matches: any[]
  players: any[]
  convocatorias: any[]
  teamId: string
}

export function TeamDisciplineView({ matches, players, convocatorias, teamId }: TeamDisciplineViewProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  // Filtrar jugadores válidos (del equipo actual y sin cuerpo técnico)
  const validPlayers = players.filter(p => {
    const pos = (p.posicion || '').toLowerCase()
    return p.team_id === teamId && !pos.includes('entrenador') && !pos.includes('delegado') && !pos.includes('cuerpo técnico')
  })

  // Calcular totales por jugador
  const disciplineData = validPlayers.map(player => {
    const playerConvs = convocatorias.filter(c => c.player_id === player.id)
    let totalYellow = 0
    let totalRed = 0
    
    const cardEvents: any[] = []

    playerConvs.forEach(conv => {
      const match = matches.find(m => m.id === conv.partido_id)
      if (match && (conv.yellow_cards > 0 || conv.red_cards > 0)) {
        totalYellow += (conv.yellow_cards || 0)
        totalRed += (conv.red_cards || 0)
        cardEvents.push({
          match,
          yellow: conv.yellow_cards || 0,
          red: conv.red_cards || 0
        })
      }
    })

    return {
      player,
      totalYellow,
      totalRed,
      cardEvents: cardEvents.sort((a, b) => new Date(b.match.fecha_hora).getTime() - new Date(a.match.fecha_hora).getTime())
    }
  })

  // Ordenar por rojas primero, luego amarillas, luego nombre
  disciplineData.sort((a, b) => {
    if (b.totalRed !== a.totalRed) return b.totalRed - a.totalRed
    if (b.totalYellow !== a.totalYellow) return b.totalYellow - a.totalYellow
    return a.player.first_name.localeCompare(b.player.first_name)
  })

  // Filtrar por buscador
  const filteredData = disciplineData.filter(d => {
    const name = `${d.player.first_name} ${d.player.last_name}`.toLowerCase()
    return name.includes(searchQuery.toLowerCase())
  })

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

      <div className="p-0 overflow-x-auto">
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
                onClick={() => setSelectedPlayer(d)}
                className="hover:bg-slate-50 transition-colors cursor-pointer group"
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
                      <div className="font-bold text-slate-900">{d.player.first_name} {d.player.last_name}</div>
                      <div className="text-xs text-slate-500 capitalize">{d.player.posicion || 'Sin posición'}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`font-black ${d.totalYellow > 0 ? 'text-amber-500' : 'text-slate-300'}`}>
                    {d.totalYellow}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`font-black ${d.totalRed > 0 ? 'text-red-500' : 'text-slate-300'}`}>
                    {d.totalRed}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="text-blue-600 font-bold text-xs uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                    Ver Partidos
                  </span>
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

      {/* Modal Detalles Jugador */}
      {selectedPlayer && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                {selectedPlayer.player.avatar_url ? (
                  <img src={selectedPlayer.player.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover shadow-sm" />
                ) : (
                  <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold text-sm">
                    {selectedPlayer.player.first_name.charAt(0)}{selectedPlayer.player.last_name.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{selectedPlayer.player.first_name} {selectedPlayer.player.last_name}</h3>
                  <div className="text-sm font-medium text-slate-500">Historial de Tarjetas</div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedPlayer(null)}
                className="p-2 hover:bg-slate-200 text-slate-500 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-0 overflow-y-auto flex-1">
              {selectedPlayer.cardEvents.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="text-emerald-500" size={32} />
                  </div>
                  <h4 className="text-slate-900 font-bold text-lg mb-1">¡Historial Limpio!</h4>
                  <p className="text-slate-500 text-sm">Este jugador no ha recibido ninguna tarjeta en los partidos registrados.</p>
                </div>
              ) : (
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase font-bold text-slate-500 sticky top-0">
                    <tr>
                      <th className="px-6 py-3">Fecha</th>
                      <th className="px-6 py-3">Partido</th>
                      <th className="px-6 py-3 text-center">Tarjetas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedPlayer.cardEvents.map((ev: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">
                          {new Date(ev.match.fecha_hora).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">{ev.match.rival_nombre}</div>
                          <div className="text-xs text-slate-500 capitalize">{ev.match.lugar || 'Visitante'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center items-center gap-2">
                            {ev.yellow > 0 && (
                              <div className="flex items-center gap-1 font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                <div className="w-2.5 h-3.5 bg-amber-400 rounded-sm"></div> {ev.yellow}
                              </div>
                            )}
                            {ev.red > 0 && (
                              <div className="flex items-center gap-1 font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                                <div className="w-2.5 h-3.5 bg-red-500 rounded-sm"></div> {ev.red}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button 
                onClick={() => setSelectedPlayer(null)}
                className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all text-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
