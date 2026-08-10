"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Clock, MapPin, Activity, CheckCircle2, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLiveTimer } from "@/hooks/useLiveTimer";

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function FamilyMatchView({ match: initialMatch, playerId, matchEvents: initialMatchEvents, convocatorias }: { 
  match: any; 
  playerId: string; 
  matchEvents: any[]; 
  convocatorias: any[] 
}) {
  const router = useRouter();
  const [match, setMatch] = useState<any>(initialMatch);
  const [matchEvents, setMatchEvents] = useState<any[]>(initialMatchEvents);

  const supabase = createClient();
  const matchId = match?.id;

  // Real-time subscriptions
  useEffect(() => {
    if (!matchId) return;
    const channel = supabase.channel(`family-match-${matchId}-live-${Math.random().toString(36).substring(7)}`);
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
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, supabase]);

  // Live Timer
  const { seconds } = useLiveTimer(matchId, match?.live_timer_elapsed_seconds || 0, match?.live_timer_started_at || null);

  const isLocal = match?.lugar === 'Local' || !/\b(fuera|visitante)\b/i.test(match?.lugar || '');
  const teamName = match?.equipo?.name || "Sporting Saladar";
  const rivalName = match?.rival_nombre || "Rival por definir";
  
  const localName = isLocal ? teamName : rivalName;
  const awayName = isLocal ? rivalName : teamName;
  
  const matchDate = match?.fecha_hora ? new Date(match.fecha_hora) : new Date();
  
  // Player specific
  const playerConv = convocatorias.find(c => c.player_id === playerId);
  const playerEvents = matchEvents.filter(e => e.player_id === playerId);

  // Goals calculations
  const localGoalsList = matchEvents.filter(e => {
    if (e.tipo_evento === 'Gol') return isLocal ? e.player_id : !e.player_id;
    if (e.tipo_evento === 'Gol en propia puerta') return isLocal ? !e.player_id : e.player_id;
    return false;
  });
  
  const awayGoalsList = matchEvents.filter(e => {
    if (e.tipo_evento === 'Gol') return !isLocal ? e.player_id : !e.player_id;
    if (e.tipo_evento === 'Gol en propia puerta') return !isLocal ? !e.player_id : e.player_id;
    return false;
  });

  const displayLocalGoals = isLocal ? (match?.resultado_propio ?? localGoalsList.length) : (match?.resultado_rival ?? awayGoalsList.length);
  const displayAwayGoals = isLocal ? (match?.resultado_rival ?? awayGoalsList.length) : (match?.resultado_propio ?? localGoalsList.length);

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

  // Split Timeline Data
  const descansoIndex = matchEvents.findIndex(e => e.tipo_evento === 'Descanso');
  const firstHalfEvents = descansoIndex !== -1 ? matchEvents.slice(0, descansoIndex + 1) : matchEvents;
  const secondHalfEvents = descansoIndex !== -1 ? matchEvents.slice(descansoIndex + 1) : [];

  const renderEventRow = (event: any) => {
    let icon = "⏱️";
    let bgColor = "bg-slate-50";
    let textColor = "text-slate-800";
    
    if (event.tipo_evento === 'Gol') { icon = "⚽"; bgColor = "bg-emerald-50"; textColor = "text-emerald-700"; }
    else if (event.tipo_evento === 'Gol en propia puerta') { icon = "🤦‍♂️"; bgColor = "bg-rose-50"; textColor = "text-rose-700"; }
    else if (event.tipo_evento === 'Tarjeta Amarilla') { icon = "🟨"; bgColor = "bg-amber-50"; textColor = "text-amber-700"; }
    else if (event.tipo_evento === 'Tarjeta Roja') { icon = "🟥"; bgColor = "bg-red-50"; textColor = "text-red-700"; }
    else if (event.tipo_evento === 'Cambio') { icon = "🔄"; bgColor = "bg-blue-50"; textColor = "text-blue-700"; }
    else if (event.tipo_evento === 'Lesión') { icon = "🚑"; bgColor = "bg-rose-50"; textColor = "text-rose-700"; }
    else if (event.tipo_evento === 'Descanso' || event.tipo_evento === 'Fin de Partido') { icon = "📌"; bgColor = "bg-slate-100/50"; textColor = "text-slate-500"; }

    const isComment = event.tipo_evento === 'Comentario del Entrenador' || event.tipo_evento === 'Comentario';
    if (isComment) { icon = "💬"; bgColor = "bg-indigo-50/70"; textColor = "text-indigo-800"; }

    return (
      <div key={event.id} className={`flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 ${bgColor} transition-all`}>
        <div className="w-10 h-10 shrink-0 bg-white rounded-lg border border-slate-200 flex flex-col items-center justify-center shadow-sm">
          <span className="text-[11px] font-black text-slate-800 leading-none">{event.minuto}'</span>
        </div>
        
        <div className="flex-1 flex items-center gap-3">
          <div className="text-lg">{icon}</div>
          <div>
            <p className={`text-xs font-bold ${textColor}`}>
              {isComment ? (event.notas || 'Comentario') : event.tipo_evento}
            </p>
            {event.player ? (
              <p className="text-[10px] font-semibold text-slate-600">
                {event.player.first_name} {event.player.last_name}
              </p>
            ) : null}
            {event.notas && !isComment && (
              <p className="text-[9px] text-slate-500 mt-0.5 italic">{event.notas}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-full bg-slate-50/50 pb-12 w-full">
      <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
        
        {/* Back Link */}
        <div className="flex items-center justify-between mb-4">
          <Link
            href={playerId ? `/dashboard/family/e/${playerId}/partidos` : `/dashboard/matches`}
            className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-slate-900 uppercase tracking-wider transition-colors"
          >
            <ChevronLeft className="w-4 h-4 mr-1 stroke-[2.5]" />
            Volver a Partidos
          </Link>

          <div className="bg-emerald-50 text-emerald-700 flex items-center gap-1.5 text-[10px] font-black px-3 py-1 rounded-full border border-emerald-200 uppercase tracking-widest">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            EN DIRECTO
          </div>
        </div>

        {/* ─── ASISTENCIA CONVOCATORIA ─── */}
        {playerConv && playerConv.status === 'convocado' && playerConv.asistencia_confirmada_familia === null && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-blue-900 font-bold text-lg">Has sido convocado</h3>
              <p className="text-blue-700 text-sm mt-1">
                El entrenador ha convocado al jugador para este partido. Por favor, confirma si podrá asistir.
              </p>
            </div>
            
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0">
                <button 
                  onClick={async () => {
                    if (playerConv.asistencia_confirmada_familia === true) return;
                    const res = await fetch(`/api/matches/${matchId}/attendance`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ playerId, status: true })
                    });
                    if (res.ok) router.refresh();
                  }}
                  className={`flex-1 sm:flex-none font-bold py-2.5 px-6 rounded-lg shadow-sm transition-colors text-sm flex items-center justify-center gap-2
                    ${playerConv.asistencia_confirmada_familia === true 
                      ? 'bg-emerald-600 text-white cursor-default' 
                      : 'bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50'
                    }`}
                >
                  {playerConv.asistencia_confirmada_familia === true && <CheckCircle2 className="w-5 h-5" />}
                  Sí, asistiré
                </button>
                <button 
                  onClick={async () => {
                    if (playerConv.asistencia_confirmada_familia === false) return;
                    const res = await fetch(`/api/matches/${matchId}/attendance`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ playerId, status: false })
                    });
                    if (res.ok) router.refresh();
                  }}
                  className={`flex-1 sm:flex-none font-bold py-2.5 px-6 rounded-lg shadow-sm transition-colors text-sm flex items-center justify-center gap-2
                    ${playerConv.asistencia_confirmada_familia === false
                      ? 'bg-rose-600 text-white cursor-default'
                      : 'bg-white text-rose-600 border border-rose-200 hover:bg-rose-50'
                    }`}
                >
                  {playerConv.asistencia_confirmada_familia === false && <span className="text-lg leading-none">❌</span>}
                  No podré
                </button>
              </div>
          </div>
        )}

        {/* ─── SCOREBOARD (Like PremiumMatchManager) ─── */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-150 overflow-hidden">
          {/* Header */}
          <div className="bg-indigo-600 text-white px-6 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 text-xs font-bold tracking-wide">
            <span className="uppercase">{match.competicion_nombre || 'Liga'}</span>
            <div className="flex items-center gap-4 opacity-90 text-[11px]">
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {matchDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {match?.lugar || 'Por definir'}</span>
            </div>
          </div>

          {/* Body */}
          <div className="p-8 flex flex-col md:flex-row items-center justify-between gap-6 bg-white">
            {/* Local */}
            <div className="flex flex-col md:flex-row items-center gap-4 flex-1 text-center md:text-left">
              <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-2xl shadow-sm shrink-0">
                🛡️
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-950 leading-tight">{localName}</h2>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full inline-block mt-1">Local</span>
              </div>
            </div>

            {/* Score & Timer */}
            <div className="flex items-center gap-5 shrink-0">
              <span className="text-5xl font-extrabold text-slate-800 tabular-nums leading-none">
                {displayLocalGoals}
              </span>
              
              <div className="flex flex-col items-center justify-center px-4">
                {(() => {
                  const isFinalizado = match?.estado?.trim().toLowerCase() === 'finalizado';
                  const isDescanso = match?.estado === 'Descanso' || 
                                     (match?.first_half_duration_seconds !== null &&
                                      match?.live_timer_elapsed_seconds === match?.first_half_duration_seconds &&
                                      !match?.live_timer_started_at);
                  
                  if (isFinalizado || isDescanso) {
                    return (
                      <div className="flex flex-col items-center">
                        <span className={`text-[14px] font-black tracking-[0.2em] uppercase px-4 py-2 rounded-xl border-2 ${isFinalizado ? 'text-slate-800 bg-slate-100 border-slate-200' : 'text-amber-800 bg-amber-100 border-amber-200'}`}>
                          {isFinalizado ? 'Finalizado' : 'Descanso'}
                        </span>
                      </div>
                    );
                  }
                  return (
                    <>
                      <span className="text-[10px] font-black text-slate-400 mb-1 tracking-widest uppercase">
                        Tiempo de Juego
                      </span>
                      <div className={`text-2xl font-black tabular-nums tracking-tight px-4 py-1.5 rounded-xl border-2 shadow-inner flex items-center gap-2 ${match?.live_timer_started_at ? 'bg-slate-900 text-white border-slate-800' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                        {match?.live_timer_started_at && (
                          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                        )}
                        {formatTime(seconds)}
                      </div>
                      <span className={`text-[10px] font-bold mt-2 uppercase tracking-widest px-2 py-0.5 rounded ${(match?.live_timer_started_at !== null || (match?.live_timer_elapsed_seconds && match.live_timer_elapsed_seconds > 0)) ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400'}`}>
                        {match?.live_timer_started_at !== null ? (match?.first_half_duration_seconds ? '2ª Parte' : '1ª Parte') : (match?.estado || 'Programado')}
                      </span>
                    </>
                  );
                })()}
              </div>

              <span className="text-5xl font-extrabold text-slate-800 tabular-nums leading-none">
                {displayAwayGoals}
              </span>
            </div>

            {/* Away */}
            <div className="flex flex-col md:flex-row-reverse items-center gap-4 flex-1 text-center md:text-right">
              <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-2xl shadow-sm shrink-0">
                🏆
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-950 leading-tight">{awayName}</h2>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full inline-block mt-1">Visitante</span>
              </div>
            </div>
          </div>

          {/* Chronological Goals Footer */}
          {goalTimeline.length > 0 && (
            <div className="bg-slate-50/80 px-6 py-5 border-t border-slate-100 flex flex-col items-center gap-2.5">
              {goalTimeline.map((goal, idx) => {
                const displayMinuto = goal.minuto > 120 ? Math.floor(goal.minuto / 60) : (goal.minuto || 0);
                const isOwnGoal = goal.tipo_evento === 'Gol en propia puerta';
                const nameSuffix = isOwnGoal ? ' (p.p.)' : '';
                return (
                  <div key={idx} className="flex items-center w-full max-w-md text-[13px] font-bold">
                    {/* Home Side */}
                    <div className="flex-1 text-right pr-4 text-slate-700">
                      {goal.isHomeGoal && (
                        <span>
                          {goal.player?.first_name ? `${goal.player.first_name} ${goal.player.last_name || ''}${nameSuffix}` : `Local${nameSuffix}`} 
                          <span className="text-slate-400 font-medium ml-1">({displayMinuto}')</span>
                        </span>
                      )}
                    </div>
                    
                    {/* Score Center */}
                    <div className="w-16 text-center text-amber-600 font-black text-[15px] tracking-[0.2em] shrink-0">
                      {goal.score}
                    </div>
                    
                    {/* Away Side */}
                    <div className="flex-1 text-left pl-4 text-slate-700">
                      {!goal.isHomeGoal && (
                        <span>
                          <span className="text-slate-400 font-medium mr-1">({displayMinuto}')</span> 
                          {goal.player?.first_name ? `${goal.player.first_name} ${goal.player.last_name || ''}${nameSuffix}` : `Visitante${nameSuffix}`}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── TIMELINE ─── */}
        <div className="pt-4 max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm min-h-[300px]">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-6 flex items-center justify-center gap-2 border-b border-slate-100 pb-4">
              <Clock className="w-4 h-4 text-slate-500" /> Cronología del Encuentro
            </h3>
            
            {!matchEvents.length ? (
              <div className="text-center py-12 text-slate-500">
                <Trophy className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p>Aún no hay eventos registrados en este partido.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* 1ª Parte */}
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">1ª Parte</h4>
                  <div className="space-y-2">
                    {firstHalfEvents.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Sin eventos</p>
                    ) : (
                      firstHalfEvents.map(renderEventRow)
                    )}
                  </div>
                </div>

                {/* 2ª Parte */}
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">2ª Parte</h4>
                  <div className="space-y-2">
                    {secondHalfEvents.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Esperando inicio...</p>
                    ) : (
                      secondHalfEvents.map(renderEventRow)
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
