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

  const matchTime = new Date(match.fecha_hora).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  const matchDate = new Date(match.fecha_hora).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <>
      <div 
        onClick={() => onClick ? onClick(match.id) : setShowModal(true)}
        className={`rounded-2xl overflow-hidden border transition-all hover:shadow-lg ${onClick ? 'cursor-pointer hover:border-blue-300' : 'cursor-pointer'} ${
        isLive
          ? 'bg-gradient-to-br from-slate-900 to-slate-800 border-red-500/30 shadow-lg shadow-red-500/10'
          : isFinished
          ? 'bg-white border-slate-200 shadow-sm'
          : 'bg-white border-slate-200 shadow-sm'
      }`}>

        {/* Header banda de estado */}
        <div className={`px-5 py-2.5 flex justify-between items-center ${
          isLive ? 'bg-red-500/10 border-b border-red-500/20' :
          isFinished ? 'bg-emerald-50 border-b border-emerald-100' :
          'bg-blue-50 border-b border-blue-100'
        }`}>
          <div className="flex items-center gap-2">
            {isLive && (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
            )}
            {isFinished && <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
            {!isLive && !isFinished && <Clock className="w-3.5 h-3.5 text-blue-500" />}
            <span className={`text-xs font-bold uppercase tracking-widest ${
              isLive ? 'text-red-400' : isFinished ? 'text-emerald-700' : 'text-blue-700'
            }`}>
              {isLive ? `En Directo · ${elapsedString}` : isFinished ? 'Finalizado' : 'Programado'}
            </span>
          </div>
          <div className={`text-xs font-semibold ${isLive ? 'text-slate-400' : 'text-slate-500'}`}>
            {matchDate} · {matchTime}
          </div>
        </div>

        {/* Categoría */}
        <div className={`px-5 pt-4 pb-1 text-center`}>
          <span className={`text-[11px] font-bold uppercase tracking-widest ${
            isLive ? 'text-slate-400' : 'text-slate-400'
          }`}>
            {match.equipo?.category || 'General'} · {match.equipo?.name}
          </span>
        </div>

        {/* MARCADOR */}
        <div className="px-5 py-4 flex items-center justify-between gap-2">
          {/* Local */}
          <div className="flex flex-col items-center flex-1 min-w-0">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-2.5 border-2 ${
              isLive ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'
            }`}>
              <Shield className={`w-7 h-7 ${isLive ? 'text-slate-400' : 'text-slate-400'}`} />
            </div>
            <span className={`text-sm font-bold text-center leading-tight line-clamp-2 ${
              isLive ? 'text-white' : 'text-slate-900'
            }`}>
              {ourName}
            </span>
            <span className={`text-[10px] font-medium mt-0.5 ${isLive ? 'text-slate-500' : 'text-slate-400'}`}>
              {isLocal ? 'Local' : 'Visitante'}
            </span>
          </div>

          {/* Marcador */}
          <div className="flex flex-col items-center justify-center px-4 shrink-0">
            {isFinished || isLive ? (
              <div className="flex items-center gap-3">
                <span className={`text-5xl font-black tabular-nums leading-none ${
                  isLive ? 'text-white' :
                  ourScore > theirScore ? 'text-emerald-600' : ourScore < theirScore ? 'text-red-500' : 'text-slate-700'
                }`}>{ourScore}</span>
                <span className={`text-2xl font-light ${isLive ? 'text-slate-600' : 'text-slate-300'}`}>—</span>
                <span className={`text-5xl font-black tabular-nums leading-none ${
                  isLive ? 'text-white' :
                  theirScore > ourScore ? 'text-emerald-600' : theirScore < ourScore ? 'text-red-500' : 'text-slate-700'
                }`}>{theirScore}</span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <span className={`text-3xl font-black italic ${isLive ? 'text-slate-500' : 'text-slate-300'}`}>VS</span>
                <span className={`text-xs font-semibold mt-1 ${isLive ? 'text-slate-500' : 'text-slate-400'}`}>{matchTime}</span>
              </div>
            )}
          </div>

          {/* Visitante */}
          <div className="flex flex-col items-center flex-1 min-w-0">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-2.5 border-2 ${
              isLive ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'
            }`}>
              <Shield className={`w-7 h-7 ${isLive ? 'text-slate-500' : 'text-slate-300'}`} />
            </div>
            <span className={`text-sm font-bold text-center leading-tight line-clamp-2 ${
              isLive ? 'text-white' : 'text-slate-900'
            }`}>
              {theirName}
            </span>
            <span className={`text-[10px] font-medium mt-0.5 ${isLive ? 'text-slate-500' : 'text-slate-400'}`}>
              {isLocal ? 'Visitante' : 'Local'}
            </span>
          </div>
        </div>

        {/* Lugar */}
        {match.lugar && (
          <div className={`flex items-center gap-1.5 px-5 pb-3 ${isLive ? 'text-slate-500' : 'text-slate-400'}`}>
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="text-xs truncate">{match.lugar}</span>
          </div>
        )}

        {/* Footer de eventos (solo en directo o finalizado con eventos) */}
        {(isLive || (isFinished && events.length > 0)) && (
          <div className={`border-t px-4 py-3 flex items-center justify-between ${
            isLive ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50'
          }`}>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Activity className={`w-4 h-4 shrink-0 ${isLive ? 'text-red-400' : 'text-slate-400'}`} />
              {events.length > 0 ? (
                <span className={`text-sm truncate ${isLive ? 'text-slate-300' : 'text-slate-600'}`}>
                  <span className="font-bold">{events[0].minuto}'</span> {getEventIcon(events[0].tipo_evento)} {events[0].tipo_evento}
                  {events[0].player && ` · ${events[0].player.first_name} ${events[0].player.last_name}`}
                </span>
              ) : (
                <span className={`text-sm italic ${isLive ? 'text-slate-500' : 'text-slate-400'}`}>
                  Sin eventos registrados aún
                </span>
              )}
            </div>
            <button
              onClick={() => setShowModal(true)}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shrink-0 ml-2 ${
                isLive
                  ? 'bg-white/10 hover:bg-white/20 text-white'
                  : 'bg-blue-50 hover:bg-blue-100 text-blue-600'
              }`}
            >
              Ver todo
            </button>
          </div>
        )}
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
