"use client"

import React, { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Shield, Clock, MapPin, User, Activity, CheckCircle } from "lucide-react"

interface MatchdayCardProps {
  match: any;
  onClick?: (matchId: string) => void;
  clubLogoUrl?: string | null;
}

export function MatchdayCard({ match, onClick, clubLogoUrl }: MatchdayCardProps) {
  const supabase = createClient()
  const [events, setEvents] = useState<any[]>(match.match_events || [])
  const [showModal, setShowModal] = useState(false)
  const [elapsedString, setElapsedString] = useState("00:00")

  const isFinished = match.estado === 'Finalizado'
  const isDescanso = !isFinished && (match.estado === 'Descanso' || 
    (match.first_half_duration_seconds !== null && 
     match.first_half_duration_seconds > 0 &&
     match.live_timer_elapsed_seconds === match.first_half_duration_seconds && 
     !match.live_timer_started_at));
  const isLive = !isFinished && !isDescanso && (match.estado === 'En curso' || match.estado === 'En Curso' || match.live_timer_started_at !== null || (match.live_timer_elapsed_seconds && match.live_timer_elapsed_seconds > 0))
  const isLocal = !/\b(fuera|visitante)\b/i.test(match.lugar || '');

  // Cronómetro en vivo
  useEffect(() => {
    if (!isLive && !isDescanso) return
    let interval: NodeJS.Timeout

    const updateTimer = () => {
      const base = match.live_timer_elapsed_seconds || 0
      if (!match.live_timer_started_at) { 
        const m = Math.floor(base / 60)
        const s = base % 60
        setElapsedString(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`)
        return 
      }
      const started = new Date(match.live_timer_started_at).getTime()
      const total = base + Math.floor((Date.now() - started) / 1000)
      const m = Math.floor(total / 60)
      const s = total % 60
      setElapsedString(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`)
    }

    updateTimer()
    interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [isLive, isDescanso, match.live_timer_started_at, match.live_timer_elapsed_seconds])

  // Cargar y suscribir eventos en tiempo real
  useEffect(() => {
    const loadEvents = async () => {
      const { data } = await supabase
        .from('match_events')
        .select('*, player:players(first_name, last_name)')
        .eq('partido_id', match.id)
        .order('minuto', { ascending: true })
      if (data) setEvents(data)
    }

    // Carga inicial siempre
    loadEvents()

    // Polling cada 3s mientras el partido esté activo (live o descanso)
    let intervalId: NodeJS.Timeout | null = null;
    if (isLive || isDescanso) {
      intervalId = setInterval(loadEvents, 3000);
    }

    // Realtime: INSERT y DELETE de eventos para el partido
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
          const next = [...prev, { ...payload.new, player }];
          return next.sort((a, b) => (a.minuto || 0) - (b.minuto || 0));
        })
      })
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'match_events',
        filter: `partido_id=eq.${match.id}`
      }, (payload) => {
        setEvents(prev => prev.filter(e => e.id !== payload.old.id))
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      if (intervalId) clearInterval(intervalId);
    }
  }, [match.id, isLive, isDescanso])

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
  const liveLocalGoalsComputed = events.filter(e => {
    if (e.tipo_evento === 'Gol') return isLocal ? e.player_id : !e.player_id;
    if (e.tipo_evento === 'Gol en propia puerta' || e.tipo_evento === 'Gol en Propia') return isLocal ? !e.player_id : e.player_id;
    return false;
  }).length;
  
  const liveAwayGoalsComputed = events.filter(e => {
    if (e.tipo_evento === 'Gol') return !isLocal ? e.player_id : !e.player_id;
    if (e.tipo_evento === 'Gol en propia puerta' || e.tipo_evento === 'Gol en Propia') return !isLocal ? !e.player_id : e.player_id;
    return false;
  }).length;

  const liveLocalGoals = match.resultado_propio ?? liveLocalGoalsComputed;
  const liveAwayGoals = match.resultado_rival ?? liveAwayGoalsComputed;

  const ourName = match.equipo?.name || 'Sporting Saladar'
  const ourCleanName = ourName.replace(/Sporting Saladar\s*/i, '').trim() || 'Sporting Saladar';
  const theirName = match.rival_nombre || 'Rival'

  const getGoalsForTeam = (isHomeTeam: boolean) => {
    const isSporting = isHomeTeam === isLocal;
    const targetScore = isHomeTeam ? liveLocalGoals : liveAwayGoals;

    const goalEvents = events.filter(e => {
      const tipo = (e.tipo_evento || e.tipo || '').toLowerCase();
      const isGol = tipo.includes('gol') && !tipo.includes('propia');
      const isAutogol = tipo.includes('propia') || tipo.includes('pp');
      
      if (!isGol && !isAutogol) return false;

      // Determinar si el gol pertenece al equipo Local o al Visitante
      const notas = e.notas || '';
      let eventIsHome = false;
      if (notas.includes('[LOCAL]')) {
        eventIsHome = isGol ? true : false;
      } else if (notas.includes('[VISITANTE]')) {
        eventIsHome = isGol ? false : true;
      } else {
        const isSportingPoint = (isGol && e.player_id) || (isAutogol && !e.player_id);
        eventIsHome = isLocal ? isSportingPoint : !isSportingPoint;
      }

      return isHomeTeam === eventIsHome;
    }).sort((a, b) => (a.minuto || 0) - (b.minuto || 0));

    if ((targetScore === 0 || targetScore === null) && goalEvents.length === 0) return null;

    // Si faltan eventos de gol con respecto al marcador actual, generamos lineas sinteticas para completar el total
    const displayItems: any[] = [...goalEvents];
    const missingCount = Math.max(0, (targetScore || 0) - goalEvents.length);

    for (let k = 0; k < missingCount; k++) {
      displayItems.push({
        id: `synth-${k}`,
        tipo_evento: 'Gol',
        minuto: 0,
        isSynthetic: true
      });
    }

    return (
      <div className={`flex flex-col text-[11px] md:text-xs text-slate-700 mt-2.5 w-full space-y-1 ${isHomeTeam ? 'items-start text-left pl-2' : 'items-end text-right pr-2'}`}>
        {displayItems.map((g, i) => {
          if (g.isSynthetic) {
            return (
              <div key={`synth-${i}`} className="flex items-center gap-1.5 font-bold text-slate-700">
                {isHomeTeam && <span className="text-slate-400 text-[10px] shrink-0">⚽</span>}
                <span>{isSporting ? 'Gol' : 'Rival'}</span>
                {!isHomeTeam && <span className="text-slate-400 text-[10px] shrink-0">⚽</span>}
              </div>
            );
          }

          const tipo = (g.tipo_evento || g.tipo || '').toLowerCase();
          const isOwnGoal = tipo.includes('propia') || tipo.includes('pp');
          const rawMin = g.minuto || 0;
          const displayMin = rawMin > 90 ? Math.floor(rawMin / 60) : rawMin;
          
          let name = '';
          const getCleanNameFromNotas = (rawNotes: string) => {
            let clean = rawNotes.replace(/^\[(LOCAL|VISITANTE)\]\s*/i, '').trim();
            if (clean.includes(',')) {
              const parts = clean.split(',').map(p => p.trim());
              clean = `${parts[1]} ${parts[0]}`;
            }
            return clean.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
          };

          if (isSporting) {
            if (isOwnGoal) name = 'Rival (PP)';
            else name = g.player?.first_name ? g.player.first_name.trim() : (g.notas ? getCleanNameFromNotas(g.notas) : 'Jugador');
          } else {
            if (isOwnGoal) name = g.player?.first_name ? `${g.player.first_name} (PP)` : 'Sporting (PP)';
            else name = g.notas ? getCleanNameFromNotas(g.notas) : 'Rival';
          }
          
          const icon = (tipo.includes('penal') || tipo.includes('penalty')) ? '🎯' : '⚽';
          return (
            <div key={g.id || i} className="flex items-center gap-1.5 font-bold text-slate-800">
              {isHomeTeam && <span className="text-slate-400 text-[10px] shrink-0">{icon}</span>}
              <span>{name}</span> 
              {displayMin > 0 && <span className="text-slate-400 text-[10px] font-normal">({displayMin}')</span>}
              {!isHomeTeam && <span className="text-slate-400 text-[10px] shrink-0">{icon}</span>}
            </div>
          );
        })}
      </div>
    )
  }

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
              {isLocal && clubLogoUrl ? (
                <img src={clubLogoUrl} alt="Local" className="max-w-full max-h-full object-contain drop-shadow-sm scale-125" />
              ) : (
                <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-100 rounded-full flex items-center justify-center text-xl shadow-sm border border-slate-200">
                  {isLocal ? '🛡️' : '🏆'}
                </div>
              )}
            </div>
            <span className="text-[13px] md:text-sm font-bold text-slate-900 text-center leading-tight">
              {isLocal ? ourCleanName : theirName}
            </span>
          </div>

          {/* Time / Score */}
          <div className="flex flex-col items-center justify-center w-1/3 shrink-0 text-center mx-auto">
            {isLive || isDescanso || isFinished ? (
              <div className="flex items-center justify-center gap-2.5 w-full text-center">
                <span className={`text-3xl md:text-4xl font-black tabular-nums tracking-tighter ${isLive ? 'text-green-600' : isDescanso ? 'text-amber-600' : 'text-slate-800'}`}>
                  {liveLocalGoals}
                </span>

                {(isLive || isDescanso) ? (
                  <div className="flex flex-col items-center shrink-0">
                    <div className={`text-xs md:text-sm font-black tabular-nums tracking-tight px-2.5 py-1 rounded-xl border shadow-inner flex items-center gap-1.5 ${isLive ? 'bg-slate-900 text-white border-slate-800' : 'bg-amber-100 text-amber-900 border-amber-200'}`}>
                      {isLive && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>}
                      {elapsedString}
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded mt-1.5 ${isDescanso ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
                      {isDescanso ? 'DESCANSO' : (match.first_half_duration_seconds ? '2ª PARTE' : '1ª PARTE')}
                    </span>
                  </div>
                ) : (
                  <span className="text-xl md:text-2xl font-black text-slate-300">-</span>
                )}

                <span className={`text-3xl md:text-4xl font-black tabular-nums tracking-tighter ${isLive ? 'text-green-600' : isDescanso ? 'text-amber-600' : 'text-slate-800'}`}>
                  {liveAwayGoals}
                </span>
              </div>
            ) : (
              <div className="text-3xl md:text-4xl font-black tracking-tighter text-black tabular-nums text-center w-full">
                {matchTime}
              </div>
            )}
            
            {isFinished && (
              <div className="mt-1.5 flex flex-col items-center justify-center w-full text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded mx-auto text-center border border-slate-200">
                  FINALIZADO
                </span>
              </div>
            )}
            {!isLive && !isDescanso && !isFinished && (
              <div className="mt-1 flex flex-col items-center justify-center w-full text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mx-auto text-center">
                  CET
                </span>
              </div>
            )}
          </div>

          {/* Away Team */}
          <div className="flex flex-col items-center flex-1 w-1/3">
            <div className="w-12 h-12 md:w-14 md:h-14 mb-2 flex items-center justify-center">
              {!isLocal && clubLogoUrl ? (
                <img src={clubLogoUrl} alt="Visitante" className="max-w-full max-h-full object-contain drop-shadow-sm scale-125" />
              ) : (
                <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-100 rounded-full flex items-center justify-center text-xl shadow-sm border border-slate-200">
                  {!isLocal ? '🛡️' : '🏆'}
                </div>
              )}
            </div>
            <span className="text-[13px] md:text-sm font-bold text-slate-900 text-center leading-tight">
              {!isLocal ? ourCleanName : theirName}
            </span>
          </div>
          
        </div>

        {/* Goals List Row */}
        {(getGoalsForTeam(true) || getGoalsForTeam(false)) && (
          <div className="px-4 pb-4 flex justify-between items-start gap-4">
            <div className="flex-1 w-1/3 flex flex-col items-center">{getGoalsForTeam(true)}</div>
            <div className="w-1/3 shrink-0"></div>
            <div className="flex-1 w-1/3 flex flex-col items-center">{getGoalsForTeam(false)}</div>
          </div>
        )}

        {/* Date + kick-off time strip — always visible */}
        <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/70 flex items-center gap-2 text-[11px] font-semibold text-slate-500">
          <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span className="capitalize">{matchDate}</span>
          <span className="text-slate-300">•</span>
          <span className="font-bold text-slate-700">{matchTime} h</span>
          {match.lugar && (
            <>
              <span className="text-slate-300">•</span>
              <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="truncate max-w-[120px]">{match.lugar}</span>
            </>
          )}
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
