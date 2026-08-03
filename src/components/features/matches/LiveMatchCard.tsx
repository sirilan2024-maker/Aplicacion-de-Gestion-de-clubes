"use client"

import React, { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Shield, Clock, Info, Activity, User } from "lucide-react"

interface LiveMatchCardProps {
  match: any;
}

export function LiveMatchCard({ match }: LiveMatchCardProps) {
  const supabase = createClient()
  const [events, setEvents] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [elapsedString, setElapsedString] = useState("00:00")

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout

    const updateTimer = () => {
      if (!match.live_timer_started_at) {
        setElapsedString("00:00")
        return
      }
      const startedAt = new Date(match.live_timer_started_at).getTime()
      const now = Date.now()
      const baseSeconds = match.live_timer_elapsed_seconds || 0
      
      const totalSeconds = baseSeconds + Math.floor((now - startedAt) / 1000)
      const m = Math.floor(totalSeconds / 60)
      const s = totalSeconds % 60
      setElapsedString(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`)
    }

    if (match.estado === 'En Curso') {
      updateTimer()
      interval = setInterval(updateTimer, 1000)
    }

    return () => clearInterval(interval)
  }, [match.live_timer_started_at, match.live_timer_elapsed_seconds, match.estado])

  // Events logic
  useEffect(() => {
    // Cargar eventos iniciales
    const loadEvents = async () => {
      const { data } = await supabase
        .from('match_events')
        .select('*, player:players(first_name, last_name)')
        .eq('partido_id', match.id)
        .order('created_at', { ascending: false })
      
      if (data) setEvents(data)
    }
    loadEvents()

    const channel = supabase
      .channel(`public:match_events:${match.id}-${Math.random().toString(36).substring(7)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_events',
          filter: `partido_id=eq.${match.id}`
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // Fetch player details if needed
            let player = null
            if (payload.new.player_id) {
              const { data: p } = await supabase.from('players').select('first_name, last_name').eq('id', payload.new.player_id).single()
              player = p
            }
            setEvents(prev => [{ ...payload.new, player }, ...prev])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [match.id, supabase])

  const isLocal = !/\b(fuera|visitante)\b/i.test(match.lugar || '');

  const getEventIcon = (tipo: string) => {
    switch(tipo) {
      case 'Gol': case 'Penalty': return '⚽'
      case 'Gol en Propia': return '⚽ (PP)'
      case 'Tarjeta Amarilla': return '🟨'
      case 'Tarjeta Roja': return '🟥'
      case 'Cambio Entra': return '⬆️'
      case 'Cambio Sale': return '⬇️'
      default: return '📍'
    }
  }

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col relative transition-all hover:shadow-md">
        
        {/* En Curso Badge */}
        <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-bold ring-1 ring-red-100">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          <span className="tabular-nums">{elapsedString}</span>
        </div>

        <div className="p-6 pt-10">
          <div className="text-center mb-6">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-100 px-2 py-1 rounded-md">
              {match.equipo?.category || 'General'} • {match.equipo?.name}
            </span>
          </div>

          {/* Marcador */}
          <div className="flex items-center justify-between px-4 sm:px-8 relative">
            {/* Equipo Local */}
            <div className="flex flex-col items-center flex-1">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center border-2 border-slate-100 mb-3 shadow-sm">
                <Shield className="w-8 h-8 text-slate-400" />
              </div>
              <span className="text-sm font-bold text-slate-800 text-center line-clamp-2">
                {isLocal ? match.equipo?.name : match.rival_nombre}
              </span>
            </div>

            {/* Goles */}
            <div className="flex items-center gap-4 px-6 shrink-0">
              <span className="text-5xl font-black text-slate-900 tabular-nums tracking-tighter">
                {isLocal ? (match.resultado_propio ?? 0) : (match.resultado_rival ?? 0)}
              </span>
              <span className="text-2xl text-slate-300 font-light">-</span>
              <span className="text-5xl font-black text-slate-900 tabular-nums tracking-tighter">
                {isLocal ? (match.resultado_rival ?? 0) : (match.resultado_propio ?? 0)}
              </span>
            </div>

            {/* Equipo Visitante */}
            <div className="flex flex-col items-center flex-1">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center border-2 border-slate-100 mb-3 shadow-sm">
                <Shield className="w-8 h-8 text-slate-400" />
              </div>
              <span className="text-sm font-bold text-slate-800 text-center line-clamp-2">
                {isLocal ? match.rival_nombre : match.equipo?.name}
              </span>
            </div>
          </div>
        </div>

        {/* Último Evento */}
        <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Activity className="w-4 h-4 text-blue-500 shrink-0" />
            {events.length > 0 ? (
              <span className="text-sm text-slate-600 truncate">
                <span className="font-bold">{events[0].minuto}'</span> {getEventIcon(events[0].tipo_evento)} {events[0].tipo_evento} - {events[0].player ? `${events[0].player.first_name} ${events[0].player.last_name}` : 'Equipo'}
              </span>
            ) : (
              <span className="text-sm text-slate-400 italic">Esperando eventos del partido...</span>
            )}
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors shrink-0 ml-2"
          >
            Ver Todo
          </button>
        </div>
      </div>

      {/* Modal Minuto a Minuto */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
              <div>
                <h3 className="font-bold text-slate-900">Minuto a Minuto</h3>
                <p className="text-xs text-slate-500">{match.equipo?.name} vs {match.rival_nombre}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-2">
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              {events.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No hay eventos registrados aún.</p>
                </div>
              ) : (
                <div className="relative border-l-2 border-slate-100 ml-4 pl-6 space-y-6">
                  {events.map((ev, i) => (
                    <div key={ev.id || i} className="relative">
                      <div className="absolute -left-[35px] top-0 w-6 h-6 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-500 shadow-sm">
                        {ev.minuto}'
                      </div>
                      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg leading-none">{getEventIcon(ev.tipo_evento)}</span>
                          <span className="font-bold text-sm text-slate-900">{ev.tipo_evento}</span>
                        </div>
                        {ev.player && (
                          <div className="flex items-center gap-1.5 text-slate-600 text-sm mt-2">
                            <User className="w-3.5 h-3.5" />
                            {ev.player.first_name} {ev.player.last_name}
                          </div>
                        )}
                        {ev.notas && (
                          <p className="text-xs text-slate-500 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100 italic">
                            "{ev.notas}"
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
