"use client"

import { useState, useEffect } from "react"
import { AlertCircle, X, Edit3, Loader2 } from "lucide-react"
import { updatePlayerCardsInMatch } from "@/app/actions/match-actions"
import { useRouter } from "next/navigation"

interface DisciplineModalProps {
  player: any
  cardEvents: any[]
  recentMatches: any[]
  convocatorias: any[]
  onClose: () => void
  onCardsUpdated?: (yellowDelta: number, redDelta: number, matchId: string, yellows: number, reds: number) => void
}

export function DisciplineModal({ player, cardEvents, recentMatches, convocatorias, onClose, onCardsUpdated }: DisciplineModalProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [savingCards, setSavingCards] = useState<string | null>(null)
  const [localConvs, setLocalConvs] = useState<any[]>(convocatorias)

  // Sincronizar estado local si las props cambian
  useEffect(() => {
    setLocalConvs(convocatorias)
  }, [convocatorias])

  const handleUpdateCard = async (matchId: string, yellows: number, reds: number) => {
    setSavingCards(matchId)
    
    let yellowDelta = 0;
    let redDelta = 0;

    // Optimistic Update
    setLocalConvs(prev => {
      const existingIdx = prev.findIndex(c => c.partido_id === matchId && c.player_id === player.id)
      if (existingIdx >= 0) {
        yellowDelta = yellows - (prev[existingIdx].yellow_cards || 0);
        redDelta = reds - (prev[existingIdx].red_cards || 0);

        const next = [...prev]
        next[existingIdx] = { ...next[existingIdx], yellow_cards: yellows, red_cards: reds }
        return next
      } else {
        yellowDelta = yellows;
        redDelta = reds;
        return [...prev, { partido_id: matchId, player_id: player.id, yellow_cards: yellows, red_cards: reds }]
      }
    })

    await updatePlayerCardsInMatch(matchId, player.id, yellows, reds)
    
    if (onCardsUpdated) {
      onCardsUpdated(yellowDelta, redDelta, matchId, yellows, reds)
    } else {
      router.refresh()
    }
    setTimeout(() => setSavingCards(null), 500)
  }

  // Calculate cycle status based on chronological events
  const chronologicalEvents = [...cardEvents].sort((a, b) => new Date(a.match.fecha_hora).getTime() - new Date(b.match.fecha_hora).getTime());
  let cycleCards = 0;
  let cyclesCompleted = 0;
  chronologicalEvents.forEach(evt => {
    if (evt.yellow === 1) {
      cycleCards += 1;
      if (cycleCards === 5) {
        cyclesCompleted += 1;
        cycleCards = 0;
      }
    }
  });

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-3">
            {player.avatar_url ? (
              <img src={player.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover shadow-sm" />
            ) : (
              <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold text-sm">
                {player.first_name?.charAt(0)}{player.last_name?.charAt(0)}
              </div>
            )}
            <div>
              <h3 className="text-lg font-bold text-slate-900">{player.first_name} {player.last_name}</h3>
              <div className="text-sm font-medium text-slate-500">
                {isEditing ? 'Gestionar Tarjetas en Partidos' : 'Historial de Tarjetas'}
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 text-slate-500 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-0 overflow-y-auto flex-1">
          {!isEditing && (
            <div className="bg-white border-b border-slate-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-slate-700 uppercase">Estado del Ciclo Actual</span>
                {cycleCards === 4 && <span className="text-xs font-bold text-orange-600 bg-orange-100 border border-orange-200 px-2 py-0.5 rounded uppercase flex items-center gap-1"><AlertCircle size={12}/> Apercibido</span>}
              </div>
              <div className="flex gap-1.5 mb-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className={`h-2.5 flex-1 rounded-sm ${i <= cycleCards ? (cycleCards === 4 ? 'bg-orange-400' : 'bg-amber-400') : 'bg-slate-100'}`}></div>
                ))}
              </div>
              <div className="flex justify-between text-xs text-slate-500 font-medium">
                <span>{cycleCards} / 5 Tarjetas</span>
                <span>{cyclesCompleted} {cyclesCompleted === 1 ? 'Sanción cumplida' : 'Sanciones cumplidas'}</span>
              </div>
            </div>
          )}

          {!isEditing ? (
            // MODO VISTA
            cardEvents.length === 0 ? (
              <div className="p-12 text-center">
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
                  {cardEvents.map((ev: any, idx: number) => (
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
            )
          ) : (
            // MODO EDICIÓN
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase font-bold text-slate-500 sticky top-0">
                <tr>
                  <th className="px-6 py-3">Fecha</th>
                  <th className="px-6 py-3">Partido</th>
                  <th className="px-6 py-3 text-center">Amarillas</th>
                  <th className="px-6 py-3 text-center">Rojas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentMatches.map(m => {
                  const conv = localConvs.find(c => c.partido_id === m.id && c.player_id === player.id)
                  const currentYellow = conv?.yellow_cards || 0
                  const currentRed = conv?.red_cards || 0
                  const isSaving = savingCards === m.id

                  return (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">
                        {new Date(m.fecha_hora).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900 truncate max-w-[150px] sm:max-w-xs">{m.rival_nombre}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center items-center gap-2">
                          <button 
                            onClick={() => handleUpdateCard(m.id, Math.max(0, currentYellow - 1), currentRed)}
                            disabled={currentYellow === 0 || isSaving}
                            className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 disabled:opacity-50 transition-colors font-bold"
                          >
                            -
                          </button>
                          <div className="w-6 text-center font-black text-amber-500 flex items-center justify-center gap-1">
                            {isSaving ? <Loader2 size={14} className="animate-spin text-blue-500" /> : currentYellow}
                          </div>
                          <button 
                            onClick={() => handleUpdateCard(m.id, currentYellow + 1, currentRed)}
                            disabled={isSaving}
                            className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-amber-100 hover:text-amber-600 disabled:opacity-50 transition-colors font-bold"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center items-center gap-2">
                          <button 
                            onClick={() => handleUpdateCard(m.id, currentYellow, Math.max(0, currentRed - 1))}
                            disabled={currentRed === 0 || isSaving}
                            className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 disabled:opacity-50 transition-colors font-bold"
                          >
                            -
                          </button>
                          <div className="w-6 text-center font-black text-red-500 flex items-center justify-center gap-1">
                            {isSaving ? <Loader2 size={14} className="animate-spin text-blue-500" /> : currentRed}
                          </div>
                          <button 
                            onClick={() => handleUpdateCard(m.id, currentYellow, currentRed + 1)}
                            disabled={isSaving}
                            className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-red-100 hover:text-red-600 disabled:opacity-50 transition-colors font-bold"
                          >
                            +
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {recentMatches.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500">
                      No hay partidos registrados para este equipo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center gap-4">
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all text-sm ${
              isEditing 
                ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' 
                : 'bg-white border border-slate-200 text-blue-600 hover:border-blue-200 hover:bg-blue-50 shadow-sm'
            }`}
          >
            {isEditing ? (
              <>Ver Historial</>
            ) : (
              <><Edit3 size={16} /> Gestionar Tarjetas</>
            )}
          </button>
          
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all text-sm"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}
