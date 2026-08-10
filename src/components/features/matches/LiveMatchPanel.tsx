"use client";

import { useState, useEffect } from "react";
import { Clock, MapPin, Activity, Calendar, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLiveTimer } from "@/hooks/useLiveTimer";
import { getPublicMatchEvents } from "@/app/actions/match-actions";

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function LiveMatchPanel({ match: initialMatch, clubLogoUrl }: { match: any, clubLogoUrl?: string }) {
  const [match, setMatch] = useState<any>(initialMatch);
  const [matchEvents, setMatchEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  const supabase = createClient();
  const matchId = match?.id;

  // Sync state if initialMatch changes (user clicked another match in carousel)
  useEffect(() => {
    setMatch(initialMatch);
    setLoadingEvents(true);
  }, [initialMatch]);

  // Fetch initial events and subscribe
  useEffect(() => {
    if (!matchId) return;

    let mounted = true;

    async function fetchEvents() {
      const data = await getPublicMatchEvents(matchId);
      if (mounted && data) {
        setMatchEvents(data);
        setLoadingEvents(false);
      }
    }

    async function fetchMatch() {
      const { data } = await supabase
        .from('partidos')
        .select('*, equipo:teams(name, color)')
        .eq('id', matchId)
        .single();
      if (mounted && data) {
        setMatch((prev: any) => ({ ...prev, ...data }));
      }
    }

    fetchEvents();
    fetchMatch();

    const channel = supabase.channel(`live-panel-${matchId}-${Math.random().toString(36).substring(7)}`);
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_events', filter: `partido_id=eq.${matchId}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          // Fetch player details if there's a player_id
          if (payload.new.player_id) {
            supabase.from('players').select('first_name, last_name, dorsal').eq('id', payload.new.player_id).single().then(({ data }) => {
              setMatchEvents(prev => {
                if (prev.some(e => e.id === payload.new.id)) return prev;
                return [...prev, { ...payload.new, player: data }].sort((a, b) => a.minuto - b.minuto);
              });
            });
          } else {
            setMatchEvents(prev => {
              if (prev.some(e => e.id === payload.new.id)) return prev;
              return [...prev, payload.new].sort((a, b) => a.minuto - b.minuto);
            });
          }
        } else if (payload.eventType === 'DELETE') {
          setMatchEvents(prev => prev.filter(e => e.id !== payload.old.id));
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'partidos', filter: `id=eq.${matchId}` }, (payload) => {
        setMatch((prev: any) => ({ ...prev, ...payload.new }));
      })
      .subscribe();
      
    // Polling fallback: refresca eventos Y datos del partido cada 4s
    const intervalId = setInterval(() => {
      fetchEvents();
      fetchMatch();
    }, 4000);
      
    return () => {
      mounted = false;
      clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  // Live Timer
  const { seconds } = useLiveTimer(matchId, match?.live_timer_elapsed_seconds || 0, match?.live_timer_started_at || null);

  const isLocal = !/\b(fuera|visitante)\b/i.test(match?.lugar || ''); // Consider local unless explicitly marked as fuera/visitante
  const teamName = match?.equipo?.name || "Sporting Saladar";
  const rivalName = match?.rival_nombre || "Rival por definir";
  
  const localName = isLocal ? teamName : rivalName;
  const awayName = isLocal ? rivalName : teamName;
  
  const matchDate = match?.fecha_hora ? new Date(match.fecha_hora) : new Date();

  // Goals calculations
  const localGoalsList = matchEvents.filter(e => {
    if (e.tipo_evento === 'Gol') return isLocal ? e.player_id : !e.player_id;
    if (e.tipo_evento === 'Gol en propia puerta' || e.tipo_evento === 'Gol en Propia') return isLocal ? !e.player_id : e.player_id;
    return false;
  });
  
  const awayGoalsList = matchEvents.filter(e => {
    if (e.tipo_evento === 'Gol') return !isLocal ? e.player_id : !e.player_id;
    if (e.tipo_evento === 'Gol en propia puerta' || e.tipo_evento === 'Gol en Propia') return !isLocal ? !e.player_id : e.player_id;
    return false;
  });

  const localGoals = match?.resultado_propio ?? localGoalsList.length;
  const awayGoals = match?.resultado_rival ?? awayGoalsList.length;

  const allGoals = [...matchEvents].filter(e => e.tipo_evento === 'Gol' || e.tipo_evento === 'Gol en propia puerta').sort((a, b) => a.minuto - b.minuto);
  let runningLocal = 0;
  let runningAway = 0;
  const goalTimeline = allGoals.map((goal) => {
    let isHomeGoal = false;
    if (goal.tipo_evento === 'Gol') {
      isHomeGoal = isLocal ? !!goal.player_id : !goal.player_id;
    } else {
      isHomeGoal = isLocal ? !goal.player_id : !!goal.player_id;
    }
    
    if (isHomeGoal) runningLocal++;
    else runningAway++;
    return {
      ...goal,
      isHomeGoal,
      score: `${runningLocal} - ${runningAway}`
    };
  });

  // Split Timeline Data (by explicit event or by half duration / 45m threshold)
  const descansoIndex = matchEvents.findIndex(e => e.tipo_evento === 'Descanso');
  const firstHalfDurationMinutes = match?.first_half_duration_seconds ? Math.floor(match.first_half_duration_seconds / 60) : 45;
  
  let firstHalfEvents: any[] = [];
  let secondHalfEvents: any[] = [];

  if (descansoIndex !== -1) {
    firstHalfEvents = matchEvents.slice(0, descansoIndex + 1);
    secondHalfEvents = matchEvents.slice(descansoIndex + 1);
  } else {
    // If no explicit 'Descanso' event yet, split by timer / minute threshold if 2nd half started
    const hasSecondHalfStarted = match?.first_half_duration_seconds && match?.live_timer_started_at;
    if (hasSecondHalfStarted) {
      firstHalfEvents = matchEvents.filter(e => e.minuto <= firstHalfDurationMinutes);
      secondHalfEvents = matchEvents.filter(e => e.minuto > firstHalfDurationMinutes);
    } else {
      firstHalfEvents = matchEvents;
      secondHalfEvents = [];
    }
  }

  const renderEventRow = (event: any, idx: number) => {
    let icon = "⏱️";
    let bgColor = "bg-slate-50";
    let textColor = "text-slate-800";
    const isComment = event.tipo_evento === 'Comentario del Entrenador' || (event.notas && (event.notas.includes('🎮') || event.notas.includes('⚡') || event.notas.includes('🛡️') || event.notas.includes('⚠️') || event.notas.includes('💬') || event.notas.includes('🔥') || event.notas.includes('⚖️')));

    if (isComment) {
      icon = "💬";
      bgColor = "bg-indigo-50/80 border-indigo-100";
      textColor = "text-indigo-900";
    } else if (event.tipo_evento === 'Gol') { icon = "⚽"; bgColor = "bg-emerald-50"; textColor = "text-emerald-700"; }
    else if (event.tipo_evento === 'Gol en propia puerta') { icon = "🤦‍♂️"; bgColor = "bg-rose-50"; textColor = "text-rose-700"; }
    else if (event.tipo_evento === 'Tarjeta Amarilla') { icon = "🟨"; bgColor = "bg-amber-50"; textColor = "text-amber-700"; }
    else if (event.tipo_evento === 'Tarjeta Roja') { icon = "🟥"; bgColor = "bg-red-50"; textColor = "text-red-700"; }
    else if (event.tipo_evento === 'Cambio') { icon = "🔄"; bgColor = "bg-blue-50"; textColor = "text-blue-700"; }
    else if (event.tipo_evento === 'Lesión') { icon = "🚑"; bgColor = "bg-rose-50"; textColor = "text-rose-700"; }
    else if (event.tipo_evento === 'Ocasión Peligrosa') { icon = "⚠️"; bgColor = "bg-amber-50"; textColor = "text-amber-700"; }
    else if (event.tipo_evento === 'Penalti') { icon = "🎯"; bgColor = "bg-purple-50"; textColor = "text-purple-700"; }
    else if (event.tipo_evento === 'Parada') { icon = "🧤"; bgColor = "bg-sky-50"; textColor = "text-sky-700"; }
    else if (event.tipo_evento === 'Descanso' || event.tipo_evento === 'Fin de Partido') { icon = "📌"; bgColor = "bg-slate-100/50"; textColor = "text-slate-500"; }

    return (
      <div key={event.id ? `${event.id}-${idx}` : idx} className={`flex items-center gap-3 p-2.5 rounded-xl border ${bgColor} transition-all`}>
        <div className="w-10 h-10 shrink-0 bg-white rounded-lg border border-slate-200 flex flex-col items-center justify-center shadow-sm">
          <span className="text-[11px] font-black text-slate-800 leading-none">{event.minuto}'</span>
        </div>
        
        <div className="flex-1 flex items-center gap-3">
          <div className="text-lg">{icon}</div>
          <div>
            <p className={`text-xs font-bold ${textColor}`}>
              {isComment ? (event.notas || 'En vivo') : event.tipo_evento}
            </p>
            {event.player ? (
              <p className="text-[10px] font-semibold text-slate-600">
                {event.player.first_name} {event.player.last_name}
              </p>
            ) : null}
            {event.notas && !isComment && (
              <p className="text-[10px] text-slate-500 italic mt-0.5">
                {event.notas}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full bg-slate-50/50 rounded-2xl border border-slate-200 overflow-hidden shadow-sm animate-in fade-in zoom-in-95 duration-300">
      {/* ─── SCOREBOARD ─── */}
      <div className="bg-white">
        {/* Header */}
        <div className="bg-indigo-600 text-white px-6 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 text-xs font-bold tracking-wide">
          <span className="uppercase">{match.competicion_nombre || 'Liga'}</span>
          <div className="flex items-center gap-4 opacity-90 text-[11px]">
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {matchDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {match?.lugar || 'Por definir'}</span>
          </div>
        </div>

        {/* Body */}
        <div className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Local */}
          <div className="flex flex-col md:flex-row items-center gap-4 flex-1 text-center md:text-left">
            <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-2xl shadow-sm shrink-0">
              {isLocal && clubLogoUrl ? (
                <img src={clubLogoUrl} alt="Local" className="max-w-full max-h-full object-contain drop-shadow-sm scale-125" />
              ) : (
                '🛡️'
              )}
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-950 leading-tight">{localName}</h2>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full inline-block mt-1">Local</span>
            </div>
          </div>

          {/* Score & Timer */}
          <div className="flex items-center gap-5 shrink-0">
            {(() => {
              const isFinalizado = match?.estado === 'Finalizado';
              const isDescanso = match?.estado === 'Descanso' ||
                (match?.first_half_duration_seconds != null &&
                 match?.first_half_duration_seconds > 0 &&
                 match?.live_timer_elapsed_seconds === match?.first_half_duration_seconds &&
                 !match?.live_timer_started_at);
              const isLiveNow = !isFinalizado && !isDescanso && (match?.live_timer_started_at != null || (match?.live_timer_elapsed_seconds && match?.live_timer_elapsed_seconds > 0));
              const scoreColor = isLiveNow ? 'text-green-600' : isFinalizado ? 'text-red-600' : isDescanso ? 'text-amber-600' : 'text-black';
              
              return (
                <span className={`text-5xl font-extrabold ${scoreColor} tabular-nums leading-none`}>
                  {localGoals}
                </span>
              );
            })()}
            
            <div className="flex flex-col items-center justify-center px-4">
              {(() => {
                const isFinalizado = match?.estado === 'Finalizado';
                const isDescanso = match?.estado === 'Descanso' ||
                  (match?.first_half_duration_seconds != null &&
                   match?.first_half_duration_seconds > 0 &&
                   match?.live_timer_elapsed_seconds === match?.first_half_duration_seconds &&
                   !match?.live_timer_started_at);
                
                if (isFinalizado) {
                  return (
                    <div className="flex flex-col items-center">
                      <span className="text-[14px] font-black tracking-[0.2em] uppercase px-4 py-2 rounded-xl border-2 text-slate-800 bg-slate-100 border-slate-200">
                        Finalizado
                      </span>
                    </div>
                  );
                }
                return (
                  <>
                    <span className="text-[10px] font-black text-slate-400 mb-1 tracking-widest uppercase">
                      {isDescanso ? 'Estado del Partido' : 'Tiempo de Juego'}
                    </span>
                    <div className={`text-2xl font-black tabular-nums tracking-tight px-4 py-1.5 rounded-xl border-2 shadow-inner flex items-center gap-2 ${match?.live_timer_started_at ? 'bg-slate-900 text-white border-slate-800' : isDescanso ? 'bg-amber-100 text-amber-950 border-amber-300' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                      {match?.live_timer_started_at && (
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                      )}
                      {formatTime(seconds)}
                    </div>
                    <span className={`text-[10px] font-black mt-2 uppercase tracking-widest px-3 py-1 rounded-md border ${isDescanso ? 'bg-amber-500 text-white border-amber-600 shadow-sm animate-pulse' : (match?.live_timer_started_at != null || (match?.live_timer_elapsed_seconds && match.live_timer_elapsed_seconds > 0)) ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'text-slate-400 border-slate-200'}`}>
                      {isDescanso ? 'DESCANSO' : (match?.live_timer_started_at != null ? (match?.first_half_duration_seconds ? '2ª Parte' : '1ª Parte') : (match?.estado || 'Programado'))}
                    </span>
                  </>
                );
              })()}
            </div>

            {(() => {
              const isFinalizado = match?.estado === 'Finalizado';
              const isDescanso = match?.estado === 'Descanso' ||
                (match?.first_half_duration_seconds != null &&
                 match?.first_half_duration_seconds > 0 &&
                 match?.live_timer_elapsed_seconds === match?.first_half_duration_seconds &&
                 !match?.live_timer_started_at);
              const isLiveNow = !isFinalizado && !isDescanso && (match?.live_timer_started_at != null || (match?.live_timer_elapsed_seconds && match?.live_timer_elapsed_seconds > 0));
              const scoreColor = isLiveNow ? 'text-green-600' : isFinalizado ? 'text-red-600' : isDescanso ? 'text-amber-600' : 'text-black';
              
              return (
                <span className={`text-5xl font-extrabold ${scoreColor} tabular-nums leading-none`}>
                  {awayGoals}
                </span>
              );
            })()}
          </div>

          {/* Away */}
          <div className="flex flex-col md:flex-row-reverse items-center gap-4 flex-1 text-center md:text-right">
            <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-2xl shadow-sm shrink-0">
              {!isLocal && clubLogoUrl ? (
                <img src={clubLogoUrl} alt="Visitante" className="max-w-full max-h-full object-contain drop-shadow-sm scale-125" />
              ) : (
                '🏆'
              )}
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-950 leading-tight">{awayName}</h2>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full inline-block mt-1">Visitante</span>
            </div>
          </div>
        </div>

        {/* GOALS TIMELINE */}
        {goalTimeline.length > 0 && (
          <div className="bg-slate-50 border-t border-slate-200 p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center mb-3">Goles del Partido</p>
            <div className="max-w-2xl mx-auto space-y-2">
              {goalTimeline.map((goal) => {
                const displayMinuto = goal.minuto > 120 ? Math.floor(goal.minuto / 60) : (goal.minuto || 0);
                const isPP = goal.tipo_evento === 'Gol en propia puerta' || goal.tipo_evento === 'Gol en Propia';
                const pFirstName = goal.player?.first_name || '';
                const pLastName = goal.player?.last_name || '';
                const fullPlayerName = `${pFirstName} ${pLastName}`.trim();
                const playerName = isPP 
                  ? (goal.isHomeGoal ? 'Rival (p.p.)' : 'Sporting (p.p.)') 
                  : (fullPlayerName || (goal.isHomeGoal ? 'Sporting' : 'Rival'));

                return (
                  <div key={goal.id || Math.random()} className="grid grid-cols-12 items-center gap-2 text-xs font-bold">
                    {/* Columna Goles Local (Alineada a la Izquierda) */}
                    <div className="col-span-5 text-right flex items-center justify-end gap-2 pr-2">
                      {goal.isHomeGoal ? (
                        <>
                          <span className="text-slate-800 font-bold truncate max-w-[150px]">{playerName}</span>
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-black tabular-nums">
                            {displayMinuto}'
                          </span>
                        </>
                      ) : null}
                    </div>

                    {/* Marcador Acumulado Central */}
                    <div className="col-span-2 text-center bg-white py-1 px-2.5 rounded-lg border border-slate-200 shadow-sm font-black text-slate-800 text-xs tracking-wider shrink-0 mx-auto">
                      {goal.score}
                    </div>

                    {/* Columna Goles Visitante (Alineada a la Derecha) */}
                    <div className="col-span-5 text-left flex items-center justify-start gap-2 pl-2">
                      {!goal.isHomeGoal ? (
                        <>
                          <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[11px] font-black tabular-nums">
                            {displayMinuto}'
                          </span>
                          <span className="text-slate-800 font-bold truncate max-w-[150px]">{playerName}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ─── EVENTS TIMELINE ─── */}
      <div className="p-6 lg:p-8 bg-slate-50 border-t border-slate-200">


        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
          <Activity className="w-4 h-4 text-slate-400" />
          Cronología del Encuentro (Minuto a Minuto)
        </h3>
        
        {loadingEvents ? (
          <div className="flex justify-center p-8">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : matchEvents.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
            <Clock className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium text-sm">El partido no tiene eventos registrados aún.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* 1st Half */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Primera Parte</h4>
              </div>
              {firstHalfEvents.length > 0 ? (
                firstHalfEvents.map(renderEventRow)
              ) : (
                <p className="text-xs text-slate-400 italic bg-white p-4 rounded-xl border border-slate-100 text-center">No hay eventos</p>
              )}
            </div>
            
            {/* 2nd Half */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Segunda Parte</h4>
              </div>
              {secondHalfEvents.length > 0 ? (
                secondHalfEvents.map(renderEventRow)
              ) : (
                <p className="text-xs text-slate-400 italic bg-white p-4 rounded-xl border border-slate-100 text-center">No hay eventos</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
