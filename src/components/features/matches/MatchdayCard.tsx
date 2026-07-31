"use client"

import React, { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Shield, Clock, MapPin, User, Activity, CheckCircle } from "lucide-react"

interface MatchdayCardProps {
  match: any;
  onClick?: (matchId: string) => void;
}

export function MatchdayCard({ match, onClick }: MatchdayCardProps) {
  const supabase = createClient()
  const [events, setEvents] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [elapsedString, setElapsedString] = useState("00:00")

  const isFinished = match.estado === 'Finalizado'
  const isLive = !isFinished && (match.live_timer_started_at !== null || (match.live_timer_elapsed_seconds && match.live_timer_elapsed_seconds > 0))
  const isLocal = !match.lugar?.toLowerCase().includes('fuera') && !match.lugar?.toLowerCase().includes('visitante')

  // Cronómetro en vivo
  useEffect(() => {
    if (!isLive) return
    let interval: NodeJS.Timeout

    const updateTimer = () => {
      if (!match.live_timer_started_at) { setElapsedString("00:00"); return }
      const started = new Date(match.live_timer_started_at).getTime()
      const base = match.live_timer_elapsed_seconds || 0
      const total = base + Math.floor((Date.now() - started) / 1000)
      const m = Math.floor(total / 60)
      const s = total % 60
      setElapsedString(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`)
    }

    updateTimer()
    interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [isLive, match.live_timer_started_at, match.live_timer_elapsed_seconds])

  // Cargar y suscribir eventos si está en directo o finalizado con eventos
  useEffect(() => {
    if (!isLive && !isFinished) return

    const loadEvents = async () => {
      const { data } = await supabase
        .from('match_events')
        .select('*, player:players(first_name, last_name)')
        .eq('partido_id', match.id)
        .order('minuto', { ascending: false })
        .limit(20)
      if (data) setEvents(data)
    }
    
    // Carga inicial
    loadEvents()

    let intervalId: NodeJS.Timeout | null = null;
    
    // Si está en directo, configuramos un polling de seguridad por si falla el Realtime
    if (isLive) {
      intervalId = setInterval(() => {
        loadEvents();
      }, 5000);
    }

    if (!isLive) return

    const channel = supabase
      .channel(`matchday-events-${match.id}-${Math.random().toString(36).substring(7)}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'match_events',
        filter: `partido_id=eq.${match.id}`
      }, async (payload) => {
        let player = null
        if (payload.new.player_id) {
          const { data: p } = await supabase
            .from('players').select('first_name, last_name')
            .eq('id', payload.new.player_id).single()
          player = p
        }
        setEvents(prev => {
          if (prev.some(e => e.id === payload.new.id)) return prev;
          return [{ ...payload.new, player }, ...prev];
        })
      })
      .subscribe()

    return () => { 
      supabase.removeChannel(channel)
      if (intervalId) clearInterval(intervalId);
    }
  }, [match.id, isLive, isFinished, supabase])

  const getEventIcon = (tipo: string) => {
    switch (tipo) {
      case 'Gol': case 'Penalty': case 'Penalti': return '⚽'
      case 'Gol en Propia': case 'Gol en propia puerta': return '⚽'
      case 'Tarjeta Amarilla': case 'Amarilla': return '🟨'
      case 'Tarjeta Roja': return '🟥'
      case 'Cambio Entra': case 'Cambio Sale': case 'Cambio': return '🔄'
      case 'Lesión': return '🩹'
      default: return '📍'
    }
  }

  // Calculate live scores from events
  const liveLocalGoals = events.filter(e => {
    if (e.tipo_evento === 'Gol') return isLocal ? e.player_id : !e.player_id;
    if (e.tipo_evento === 'Gol en propia puerta') return isLocal ? !e.player_id : e.player_id;
    return false;
  }).length;
  
  const liveAwayGoals = events.filter(e => {
    if (e.tipo_evento === 'Gol') return !isLocal ? e.player_id : !e.player_id;
    if (e.tipo_evento === 'Gol en propia puerta') return !isLocal ? !e.player_id : e.player_id;
    return false;
  }).length;

  const ourScore = isLive ? liveLocalGoals : (isLocal ? (match.resultado_propio ?? liveLocalGoals) : (match.resultado_rival ?? liveAwayGoals))
  const theirScore = isLive ? liveAwayGoals : (isLocal ? (match.resultado_rival ?? liveAwayGoals) : (match.resultado_propio ?? liveLocalGoals))
  
  const ourName = match.equipo?.name || 'Sporting Saladar'
  const theirName = match.rival_nombre || 'Rival'

  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const matchTime = isMounted ? new Date(match.fecha_hora).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '--:--'
  const matchDate = isMounted ? new Date(match.fecha_hora).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }) : '...'

  return (
    <>
      <div 
        onClick={() => onClick ? onClick(match.id) : setShowModal(true)}
        className={`w-full overflow-hidden transition-all ${onClick ? 'cursor-pointer hover:bg-slate-50' : 'cursor-pointer'} ${
        isLive
          ? 'bg-white border-b border-slate-200'
          : 'bg-white border-b border-slate-100'
      }`}>

        <div className="px-4 py-6 flex items-center justify-between gap-4 relative">
          
          {/* Local Team */}
          <div className="flex flex-col items-center flex-1 w-1/3">
            <div className="w-12 h-12 md:w-14 md:h-14 mb-2 flex items-center justify-center">
              {isLocal && match.equipo?.logo_url ? (
                <img src={match.equipo.logo_url} alt="Local" className="max-w-full max-h-full object-contain" />
              ) : (
                <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-100 rounded-full flex items-center justify-center text-xl shadow-sm border border-slate-200">
                  {isLocal ? '🛡️' : '🏆'}
                </div>
              )}
            </div>
            <span className="text-[13px] md:text-sm font-bold text-slate-900 text-center leading-tight">
              {isLocal ? (match.equipo?.category || ourName) : theirName}
            </span>
          </div>

          {/* Time / Score */}
          <div className="flex flex-col items-center justify-center w-1/3 shrink-0">
            {isLive || isFinished ? (
              <div className="flex items-center justify-center gap-3">
                <span className={`text-3xl md:text-4xl font-black tabular-nums tracking-tighter ${isLive ? 'text-red-600' : 'text-slate-900'}`}>
                  {isLocal ? liveLocalGoals : liveAwayGoals}
                </span>
                <span className="text-xl md:text-2xl font-black text-slate-300">-</span>
                <span className={`text-3xl md:text-4xl font-black tabular-nums tracking-tighter ${isLive ? 'text-red-600' : 'text-slate-900'}`}>
                  {isLocal ? liveAwayGoals : liveLocalGoals}
                </span>
              </div>
            ) : (
              <div className="text-3xl md:text-4xl font-black tracking-tighter text-slate-900 tabular-nums">
                {matchTime}
              </div>
            )}
            
            <div className="mt-1 flex flex-col items-center">
              {isLive ? (
                <div className="flex items-center gap-1.5 bg-red-100 px-2 py-0.5 rounded text-[10px] font-bold text-red-700 uppercase tracking-wider animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                  {elapsedString}
                </div>
              ) : isFinished ? (
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded">
                  FIN
                </span>
              ) : (
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  CET
                </span>
              )}
            </div>
          </div>

          {/* Away Team */}
          <div className="flex flex-col items-center flex-1 w-1/3">
            <div className="w-12 h-12 md:w-14 md:h-14 mb-2 flex items-center justify-center">
              {!isLocal && match.equipo?.logo_url ? (
                <img src={match.equipo.logo_url} alt="Visitante" className="max-w-full max-h-full object-contain" />
              ) : (
                <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-100 rounded-full flex items-center justify-center text-xl shadow-sm border border-slate-200">
                  {!isLocal ? '🛡️' : '🏆'}
                </div>
              )}
            </div>
            <span className="text-[13px] md:text-sm font-bold text-slate-900 text-center leading-tight">
              {!isLocal ? (match.equipo?.category || ourName) : theirName}
            </span>
          </div>
          
        </div>
      </div>

      {/* Modal Minuto a Minuto */}
      {showModal && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex justify-between items-start rounded-t-2xl bg-slate-50">
              <div>
                <h3 className="font-black text-slate-900">Minuto a Minuto</h3>
                <p className="text-xs text-slate-500 mt-0.5">{ourName} vs {theirName}</p>
                {isLive && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                    <span className="text-xs font-bold text-red-600">En directo · {elapsedString}</span>
                  </div>
                )}
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {events.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No hay eventos registrados aún.</p>
                </div>
              ) : (
                <div className="relative border-l-2 border-slate-100 ml-5 pl-6 space-y-5">
                  {events.map((ev, i) => (
                    <div key={ev.id || i} className="relative">
                      <div className="absolute -left-[37px] top-1 w-7 h-7 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center text-[10px] font-black text-slate-600 shadow-sm">
                        {ev.minuto}'
                      </div>
                      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-xl leading-none">{getEventIcon(ev.tipo_evento)}</span>
                          <span className="font-bold text-sm text-slate-900">{ev.tipo_evento}</span>
                        </div>
                        {ev.player && (
                          <div className="flex items-center gap-1.5 text-slate-600 text-sm mt-2">
                            <User className="w-3.5 h-3.5" />
                            {ev.player.first_name} {ev.player.last_name}
                          </div>
                        )}
                        {ev.notas && (
                          <p className="text-xs text-slate-400 italic mt-2 bg-slate-50 p-2 rounded-lg">"{ev.notas}"</p>
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
