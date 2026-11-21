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

export function LiveMatchPanel({
  match: initialMatch,
  clubLogoUrl,
  partidoId,
  convocados,
  initialEvents,
  teamColor
}: {
  match?: any;
  clubLogoUrl?: string;
  partidoId?: string;
  convocados?: any[];
  initialEvents?: any[];
  teamColor?: any;
}) {
  const [match, setMatch] = useState<any>(initialMatch || (partidoId ? { id: partidoId } : null));
  const [matchEvents, setMatchEvents] = useState<any[]>(initialEvents || []);
  const [loadingEvents, setLoadingEvents] = useState(!initialEvents);

  const supabase = createClient();
  const matchId = match?.id || partidoId;

  // Sync state if initialMatch changes (user clicked another match in carousel)
  useEffect(() => {
    if (initialMatch) {
      setMatch(initialMatch);
      setLoadingEvents(true);
    }
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

    let isPolling = false;
    let hadDisconnect = false;
    const syncAll = async () => {
      if (!mounted || isPolling || document.visibilityState !== 'visible') return;
      isPolling = true;
      try {
        await Promise.all([fetchEvents(), fetchMatch()]);
      } finally {
        isPolling = false;
      }
    };

    const channel = supabase.channel(`live-panel-${matchId}-${Math.random().toString(36).substring(7)}`);
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_events', filter: `partido_id=eq.${matchId}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          // Fetch player details if there's a player_id
          if (payload.new.player_id) {
            supabase.from('players').select('first_name, last_name, dorsal, avatar_url').eq('id', payload.new.player_id).single().then(({ data }) => {
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
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          hadDisconnect = true;
        } else if (status === 'SUBSCRIBED' && hadDisconnect) {
          hadDisconnect = false;
          syncAll();
        }
      });

    // Low-frequency fallback polling (90s) only when tab is visible
    const intervalId = setInterval(syncAll, 90_000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncAll();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
      
    return () => {
      mounted = false;
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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

  const parsedCoachReport = (() => {
    if (!match?.coach_report) return null;
    if (typeof match.coach_report === 'string') {
      try {
        return JSON.parse(match.coach_report);
      } catch {
        return null;
      }
    }
    return match.coach_report;
  })();

  const ligaBraveLive = parsedCoachReport?.liga_brave_live || null;
  const ffcvLive = parsedCoachReport?.ffcv_live || null;
  const officialLive = ligaBraveLive || ffcvLive;
  const isFfcvOfficialMatch = Boolean(
    ffcvLive ||
    match?.acta_oficial_url?.includes('ffcv.es') ||
    match?.acta_oficial_url?.includes('CodPartido') ||
    match?.ffcv_group_id ||
    (match?.equipo?.category && !match?.equipo?.category.toLowerCase().includes('brave'))
  );
  const isLigaBraveMatch = !isFfcvOfficialMatch && Boolean(
    ligaBraveLive ||
    match?.acta_oficial_url?.includes('apuntamelo.com') ||
    match?.equipo?.category?.toLowerCase().includes('brave')
  );

  const isEventHomeGoal = (e: any): boolean => {
    const notas = String(e.notas || '');
    const isOwnGoal = e.tipo_evento === 'Gol en propia puerta' || e.tipo_evento === 'Gol en Propia';
    if (notas.includes('[LOCAL]')) return !isOwnGoal;
    if (notas.includes('[VISITANTE]')) return isOwnGoal;
    return isOwnGoal ? (isLocal ? !e.player_id : !!e.player_id) : (isLocal ? !!e.player_id : !e.player_id);
  };

  // Goals calculations
  const localGoalsList = matchEvents.filter(e => {
    if (e.tipo_evento === 'Gol' || e.tipo_evento === 'Gol en propia puerta' || e.tipo_evento === 'Gol en Propia') {
      return isEventHomeGoal(e);
    }
    return false;
  });
  
  const awayGoalsList = matchEvents.filter(e => {
    if (e.tipo_evento === 'Gol' || e.tipo_evento === 'Gol en propia puerta' || e.tipo_evento === 'Gol en Propia') {
      return !isEventHomeGoal(e);
    }
    return false;
  });

  const localGoals = isLocal 
    ? (match?.resultado_propio ?? localGoalsList.length) 
    : (match?.resultado_rival ?? localGoalsList.length);
    
  const awayGoals = isLocal 
    ? (match?.resultado_rival ?? awayGoalsList.length) 
    : (match?.resultado_propio ?? awayGoalsList.length);

  const allGoals = [...matchEvents].filter(e => e.tipo_evento === 'Gol' || e.tipo_evento === 'Gol en propia puerta' || e.tipo_evento === 'Gol en Propia').sort((a, b) => a.minuto - b.minuto);
  let runningLocal = 0;
  let runningAway = 0;
  const goalTimeline = allGoals.map((goal) => {
    const isHomeGoal = isEventHomeGoal(goal);
    if (isHomeGoal) runningLocal++;
    else runningAway++;
    return {
      ...goal,
      isHomeGoal,
      score: `${runningLocal} - ${runningAway}`
    };
  });

  // Split Timeline Data: if there is an explicit 'Descanso' event, split strictly by whether the event happened before or after Descanso (by created_at or position)
  const descansoEvent = matchEvents.find(e => e.tipo_evento === 'Descanso');
  const descansoTimeMs = descansoEvent?.created_at ? new Date(descansoEvent.created_at).getTime() : null;
  const descansoIndex = matchEvents.findIndex(e => e.tipo_evento === 'Descanso');
  const firstHalfDurationMinutes = match?.first_half_duration_seconds ? Math.floor(match.first_half_duration_seconds / 60) : (ligaBraveLive?.minutosParte || 45);
  
  let firstHalfEvents: any[] = [];
  let secondHalfEvents: any[] = [];

  if (descansoEvent && descansoTimeMs) {
    const descansoMin = Number(descansoEvent.minuto || 35);
    const isFirstHalfEvent = (e: any) => {
      if (e.id === descansoEvent.id) return true;
      const eMin = Number(e.minuto || 0);
      const isPostMatchActaSync = /^\[(LOCAL|VISITANTE)\]/i.test(String(e.notas || ''));
      if (isPostMatchActaSync) {
        return eMin <= descansoMin;
      }
      if (eMin < descansoMin) return true;
      return Boolean(e.created_at && new Date(e.created_at).getTime() <= descansoTimeMs);
    };

    firstHalfEvents = matchEvents
      .filter(isFirstHalfEvent)
      .sort((a, b) => {
        if (a.tipo_evento === 'Descanso') return 1;
        if (b.tipo_evento === 'Descanso') return -1;
        return (a.minuto || 0) - (b.minuto || 0);
      });
    secondHalfEvents = matchEvents
      .filter(e => !isFirstHalfEvent(e))
      .sort((a, b) => (a.minuto || 0) - (b.minuto || 0));
  } else if (descansoIndex !== -1) {
    firstHalfEvents = matchEvents.slice(0, descansoIndex + 1);
    secondHalfEvents = matchEvents.slice(descansoIndex + 1);
  } else {
    // If no explicit 'Descanso' event yet, split by timer / minute threshold if 2nd half started
    const hasSecondHalfStarted = (match?.first_half_duration_seconds && match?.live_timer_started_at) || matchEvents.some(e => e.minuto > firstHalfDurationMinutes);
    if (hasSecondHalfStarted) {
      firstHalfEvents = matchEvents.filter(e => e.minuto <= firstHalfDurationMinutes);
      secondHalfEvents = matchEvents.filter(e => e.minuto > firstHalfDurationMinutes);
    } else {
      firstHalfEvents = matchEvents;
      secondHalfEvents = [];
    }
  }

  const cleanEventNotas = (raw?: string | null) => {
    if (!raw) return '';
    return raw
      .replace(/^\[(LOCAL|VISITANTE)\]\s*/i, '')
      .replace(/\[BRAVE:[^\]]+\]\s*/gi, '')
      .trim();
  };

  const renderEventRow = (event: any, idx: number) => {
    let icon = "⏱️";
    let bgColor = "bg-slate-50";
    let textColor = "text-slate-800";
    const rawNotas = String(event.notas || '');
    const cleanNotas = cleanEventNotas(rawNotas);
    // Solo marcar como Liga Brave si el partido pertenece formalmente a dicha competición
    const isBraveSynced = isLigaBraveMatch && (rawNotas.includes('[BRAVE:') || rawNotas.includes('apuntamelo'));
    const isComment = event.tipo_evento === 'Comentario del Entrenador' || (cleanNotas && (cleanNotas.includes('🎮') || cleanNotas.includes('⚡') || cleanNotas.includes('🛡️') || cleanNotas.includes('⚠️') || cleanNotas.includes('💬') || cleanNotas.includes('🔥') || cleanNotas.includes('⚖️') || cleanNotas.includes('🎙️') || cleanNotas.includes('📊') || cleanNotas.includes('📋')));

    const isRivalEvent = isLocal ? rawNotas.includes('[VISITANTE]') : rawNotas.includes('[LOCAL]');

    if (isComment && event.tipo_evento !== 'Descanso' && event.tipo_evento !== 'Fin de Partido') {
      icon = cleanNotas.includes('🔥') ? "🔥" : cleanNotas.includes('📊') ? "📊" : cleanNotas.includes('⚡') ? "⚡" : cleanNotas.includes('🎙️') ? "🎙️" : "💬";
      bgColor = isBraveSynced ? "bg-indigo-50/70 border-indigo-200/80" : "bg-indigo-50/80 border-indigo-100";
      textColor = "text-indigo-950";
    } else if (event.tipo_evento === 'Gol') { icon = "⚽"; bgColor = "bg-emerald-50 border-emerald-200"; textColor = "text-emerald-800"; }
    else if (event.tipo_evento === 'Gol en propia puerta') { icon = "🤦‍♂️"; bgColor = "bg-rose-50"; textColor = "text-rose-700"; }
    else if (event.tipo_evento === 'Tarjeta Amarilla') { icon = "🟨"; bgColor = "bg-amber-50 border-amber-200"; textColor = "text-amber-800"; }
    else if (event.tipo_evento === 'Tarjeta Roja') { icon = "🟥"; bgColor = "bg-red-50 border-red-200"; textColor = "text-red-800"; }
    else if (event.tipo_evento === 'Cambio') { icon = "🔄"; bgColor = "bg-blue-50"; textColor = "text-blue-700"; }
    else if (event.tipo_evento === 'Lesión') { icon = "🚑"; bgColor = "bg-rose-50"; textColor = "text-rose-700"; }
    else if (event.tipo_evento === 'Ocasión Peligrosa') { icon = "⚠️"; bgColor = "bg-amber-50"; textColor = "text-amber-700"; }
    else if (event.tipo_evento === 'Penalti') { icon = "🎯"; bgColor = "bg-purple-50"; textColor = "text-purple-700"; }
    else if (event.tipo_evento === 'Parada') { icon = "🧤"; bgColor = "bg-sky-50"; textColor = "text-sky-700"; }
    else if (event.tipo_evento === 'Descanso' || event.tipo_evento === 'Fin de Partido') { icon = event.tipo_evento === 'Descanso' ? "⏸️" : "🏁"; bgColor = "bg-slate-100/80 border-slate-200"; textColor = "text-slate-700"; }

    const isCommentRow = isComment && event.tipo_evento !== 'Descanso' && event.tipo_evento !== 'Fin de Partido';

    // Evitar duplicar el nombre del jugador si ya viene en event.player
    const isDuplicatePlayerName = Boolean(
      event.player && cleanNotas && (
        cleanNotas.toLowerCase().trim() === `${event.player.first_name || ''} ${event.player.last_name || ''}`.toLowerCase().trim() ||
        cleanNotas.toLowerCase().trim() === `${event.player.last_name || ''}, ${event.player.first_name || ''}`.toLowerCase().trim() ||
        (event.player.last_name && cleanNotas.toLowerCase().includes(event.player.last_name.toLowerCase()))
      )
    );

    return (
      <div key={event.id ? `${event.id}-${idx}` : idx} className={`flex items-start gap-3 p-2.5 rounded-xl border ${bgColor} transition-all`}>
        <div className="w-10 h-10 shrink-0 bg-white rounded-lg border border-slate-200 flex flex-col items-center justify-center shadow-sm">
          <span className="text-[11px] font-black text-slate-800 leading-none">{event.minuto}'</span>
        </div>
        
        <div className="flex-1 flex items-start gap-2.5 min-w-0">
          <div className="text-lg leading-none mt-0.5 shrink-0">{icon}</div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center flex-wrap gap-1.5">
              <p className={`text-xs font-bold leading-snug ${textColor}`}>
                {isCommentRow ? (cleanNotas || 'En vivo') : event.tipo_evento}
              </p>
              {isBraveSynced && (
                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 border border-indigo-200 shrink-0">
                  Liga Brave
                </span>
              )}
              {isRivalEvent && (
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-600 border border-slate-300/60 shrink-0 truncate max-w-[130px]">
                  {rivalName}
                </span>
              )}
            </div>
            {event.player ? (
              <div className="flex flex-col gap-1 mt-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {event.player.avatar_url ? (
                    <img src={event.player.avatar_url} alt={`${event.player.first_name} ${event.player.last_name}`} className="w-6 h-6 rounded-full object-cover border border-slate-200 shrink-0 shadow-2xs" />
                  ) : null}
                  {event.player.dorsal ? (
                    <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded text-[10px] font-black shrink-0">
                      #{event.player.dorsal}
                    </span>
                  ) : null}
                  <p className="text-xs font-bold text-slate-800 leading-snug break-words">
                    {event.player.first_name} {event.player.last_name}
                  </p>
                </div>
                {Array.isArray(event.goal_insights) && event.goal_insights.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1">
                    {event.goal_insights.map((ins: string, iIdx: number) => (
                      <span
                        key={iIdx}
                        className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border ${
                          ins.includes('rápido')
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {ins.includes('rápido') ? `⚡ ${ins}` : `⚽ ${ins}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
            {cleanNotas && !isCommentRow && !isDuplicatePlayerName && (
              <p className="text-[11px] text-slate-600 font-medium mt-0.5 leading-snug">
                {cleanNotas}
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
          <div className="flex items-center flex-wrap gap-2">
            <span className="uppercase">
              {isLigaBraveMatch
                ? 'Liga Brave · Seguimiento Oficial'
                : isFfcvOfficialMatch
                ? 'FFCV · Competición Oficial'
                : (match.competicion_nombre || 'Liga')}
            </span>
            {(isLigaBraveMatch || isFfcvOfficialMatch) && (
              <span className="bg-amber-400 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider">
                ⚡ Tiempo Real
              </span>
            )}
          </div>
          <div className="flex items-center flex-wrap gap-4 opacity-95 text-[11px]">
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {matchDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {officialLive?.campo || match?.lugar || 'Por definir'}</span>
            {match?.acta_oficial_url?.includes('apuntamelo.com') && (
              <a
                href={match.acta_oficial_url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/15 hover:bg-white/25 text-white px-2.5 py-1 rounded-lg border border-white/20 text-[10px] font-black uppercase tracking-wider transition-colors"
              >
                Acta Liga Brave ↗
              </a>
            )}
            {match?.acta_oficial_url?.includes('ffcv.es') && (
              <a
                href={match.acta_oficial_url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/15 hover:bg-white/25 text-white px-2.5 py-1 rounded-lg border border-white/20 text-[10px] font-black uppercase tracking-wider transition-colors"
              >
                Acta Oficial FFCV ↗
              </a>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
          {/* Local */}
          <div className="flex flex-row md:flex-row items-center justify-center md:justify-start gap-3 md:gap-4 flex-1 text-center md:text-left w-full">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-xl md:text-2xl shadow-sm shrink-0">
              {isLocal && clubLogoUrl ? (
                <img src={clubLogoUrl} alt="Local" className="max-w-full max-h-full object-contain drop-shadow-sm scale-125" />
              ) : (
                '🛡️'
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-base md:text-lg font-black text-slate-950 leading-tight truncate">{localName}</h2>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full inline-block mt-0.5">Local</span>
            </div>
          </div>

          {/* Score & Timer */}
          <div className="flex items-center justify-center gap-3 sm:gap-5 shrink-0 py-2 md:py-0 w-full md:w-auto">
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
                <span className={`text-4xl sm:text-5xl font-extrabold ${scoreColor} tabular-nums leading-none shrink-0`}>
                  {localGoals}
                </span>
              );
            })()}
            
            <div className="flex flex-col items-center justify-center px-2 sm:px-4">
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
                      <span className="text-[11px] sm:text-[13px] font-black tracking-[0.15em] uppercase px-3 py-1.5 rounded-xl border-2 text-slate-800 bg-slate-100 border-slate-200">
                        Finalizado
                      </span>
                    </div>
                  );
                }
                return (
                  <>
                    <span className="text-[9px] sm:text-[10px] font-black text-slate-400 mb-1 tracking-widest uppercase">
                      {isDescanso ? 'Estado' : 'Tiempo'}
                    </span>
                    <div className={`text-xl sm:text-2xl font-black tabular-nums tracking-tight px-3 py-1 sm:px-4 sm:py-1.5 rounded-xl border-2 shadow-inner flex items-center gap-1.5 ${match?.live_timer_started_at ? 'bg-slate-900 text-white border-slate-800' : isDescanso ? 'bg-amber-100 text-amber-950 border-amber-300' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                      {match?.live_timer_started_at && (
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                      )}
                      {formatTime(seconds)}
                    </div>
                    <span className={`text-[9px] sm:text-[10px] font-black mt-1.5 uppercase tracking-widest px-2.5 py-0.5 rounded-md border ${isDescanso ? 'bg-amber-500 text-white border-amber-600 shadow-sm animate-pulse' : (match?.live_timer_started_at != null || (match?.live_timer_elapsed_seconds && match.live_timer_elapsed_seconds > 0)) ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'text-slate-400 border-slate-200'}`}>
                      {isDescanso ? 'DESCANSO' : (match?.live_timer_started_at != null ? (match?.first_half_duration_seconds ? '2ª Parte' : '1ª Parte') : (match?.estado || 'Programado'))}
                    </span>
                    {match?.first_half_duration_seconds ? (
                      <span className="text-[9px] font-bold text-slate-500 mt-1 tabular-nums">
                        1ª Parte: {formatTime(match.first_half_duration_seconds)}
                      </span>
                    ) : null}
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
                <span className={`text-4xl sm:text-5xl font-extrabold ${scoreColor} tabular-nums leading-none shrink-0`}>
                  {awayGoals}
                </span>
              );
            })()}
          </div>

          {/* Away */}
          <div className="flex flex-row md:flex-row-reverse items-center justify-center md:justify-start gap-3 md:gap-4 flex-1 text-center md:text-right w-full">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-xl md:text-2xl shadow-sm shrink-0">
              {!isLocal && clubLogoUrl ? (
                <img src={clubLogoUrl} alt="Visitante" className="max-w-full max-h-full object-contain drop-shadow-sm scale-125" />
              ) : (
                '🏆'
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-base md:text-lg font-black text-slate-950 leading-tight truncate">{awayName}</h2>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full inline-block mt-0.5">Visitante</span>
            </div>
          </div>
        </div>

        {/* GOALS TIMELINE */}
        {goalTimeline.length > 0 && (
          <div className="bg-slate-50 border-t border-slate-200 p-3 sm:p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center mb-3">Goles del Partido</p>
            <div className="max-w-2xl mx-auto space-y-2">
              {goalTimeline.map((goal) => {
                const displayMinuto = goal.minuto > 120 ? Math.floor(goal.minuto / 60) : (goal.minuto || 0);
                const isPP = goal.tipo_evento === 'Gol en propia puerta' || goal.tipo_evento === 'Gol en Propia';
                const pFirstName = goal.player?.first_name || '';
                const pLastName = goal.player?.last_name || '';
                const fullPlayerName = `${pFirstName} ${pLastName}`.trim();
                const targetTeamName = goal.isHomeGoal ? localName : awayName;
                const ownGoalScorerTeamName = goal.isHomeGoal ? awayName : localName;

                const rawNotas = String(goal.notas || '');
                const assistMatch = rawNotas.match(/\(Asist:\s*([^)]+)\)/i);
                const assistName = assistMatch ? assistMatch[1].trim() : '';

                let extractedFromNotas = rawNotas
                  .replace(/\[LOCAL\]|\[VISITANTE\]|\[BRAVE:[^\]]+\]/gi, '')
                  .replace(/\(Asist:[^)]*\)/gi, '')
                  .replace(/⚽/g, '')
                  .trim();
                const golDeMatch = extractedFromNotas.match(/Gol(?:\s+en\s+propia\s+puerta)?\s+de\s+(?:#\d+\s+)?(.+)/i);
                if (golDeMatch && golDeMatch[1]) {
                  extractedFromNotas = golDeMatch[1].trim();
                } else if (/Gol del equipo rival/i.test(extractedFromNotas)) {
                  extractedFromNotas = '';
                }

                const baseScorerName = fullPlayerName || extractedFromNotas || targetTeamName;
                const playerName = isPP 
                  ? (fullPlayerName || extractedFromNotas ? `${fullPlayerName || extractedFromNotas} (p.p.)` : `${ownGoalScorerTeamName} (p.p.)`) 
                  : baseScorerName;
                const dorsalFromNotas = rawNotas.match(/#(\d+)/)?.[1] || null;
                const playerDorsal = goal.player?.dorsal ?? dorsalFromNotas;
                const avatarUrl = goal.player?.avatar_url || null;
                const goalInsights: string[] = Array.isArray((goal as any).goal_insights) ? (goal as any).goal_insights : [];

                return (
                  <div key={goal.id || Math.random()}>
                    {/* Vista Móvil: Tarjeta de ancho completo para que el nombre entero, dorsal, avatar y estadísticas nunca se corten */}
                    <div className="flex sm:hidden items-center justify-between gap-2.5 bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt={playerName} className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0 shadow-xs" />
                        ) : (
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 border ${goal.isHomeGoal ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                            {playerDorsal && !isPP ? `#${playerDorsal}` : '⚽'}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {playerDorsal && !isPP && (
                              <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded text-[10px] font-black shrink-0">
                                #{playerDorsal}
                              </span>
                            )}
                            <span className="text-slate-900 font-black text-xs leading-snug break-words">
                              {playerName}
                            </span>
                          </div>
                          {goalInsights.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1 mt-1">
                              {goalInsights.map((ins, iIdx) => (
                                <span
                                  key={iIdx}
                                  className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${
                                    ins.includes('rápido')
                                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  }`}
                                >
                                  {ins.includes('rápido') ? `⚡ ${ins}` : `⚽ ${ins}`}
                                </span>
                              ))}
                            </div>
                          )}
                          {assistName && (
                            <span className="block text-[10px] font-semibold text-slate-400 mt-0.5 break-words">
                              👟 Asist: {assistName}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="bg-slate-900 text-white py-0.5 px-2 rounded-md font-black text-[11px] tracking-wider whitespace-nowrap">
                          {goal.score}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-black tabular-nums border ${goal.isHomeGoal ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                          {displayMinuto}'
                        </span>
                      </div>
                    </div>

                    {/* Vista Escritorio / Tablet */}
                    <div className="hidden sm:grid sm:grid-cols-12 items-center gap-2 text-xs font-bold">
                      {/* Columna Goles Local */}
                      <div className="col-span-5 text-right flex items-center justify-end gap-2 pr-2 min-w-0">
                        {goal.isHomeGoal ? (
                          <>
                            <div className="min-w-0 flex flex-col items-end">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                {avatarUrl && (
                                  <img src={avatarUrl} alt={playerName} className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0 shadow-2xs" />
                                )}
                                {playerDorsal && !isPP && (
                                  <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded text-[10px] font-black shrink-0">
                                    #{playerDorsal}
                                  </span>
                                )}
                                <span className="text-slate-800 font-bold text-xs leading-tight break-words text-right">{playerName}</span>
                              </div>
                              {goalInsights.length > 0 && (
                                <div className="flex flex-wrap items-center justify-end gap-1 mt-1">
                                  {goalInsights.map((ins, iIdx) => (
                                    <span
                                      key={iIdx}
                                      className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${
                                        ins.includes('rápido')
                                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      }`}
                                    >
                                      {ins.includes('rápido') ? `⚡ ${ins}` : `⚽ ${ins}`}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {assistName && (
                                <span className="text-[10px] font-semibold text-slate-400 break-words max-w-full mt-0.5">
                                  👟 Asist: {assistName}
                                </span>
                              )}
                            </div>
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded text-[11px] font-black tabular-nums shrink-0">
                              {displayMinuto}'
                            </span>
                          </>
                        ) : null}
                      </div>

                      {/* Marcador Acumulado Central */}
                      <div className="col-span-2 text-center bg-white py-1 px-2 rounded-lg border border-slate-200 shadow-xs font-black text-slate-800 text-xs tracking-wider shrink-0 mx-auto whitespace-nowrap">
                        {goal.score}
                      </div>

                      {/* Columna Goles Visitante */}
                      <div className="col-span-5 text-left flex items-center justify-start gap-2 pl-2 min-w-0">
                        {!goal.isHomeGoal ? (
                          <>
                            <span className="bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded text-[11px] font-black tabular-nums shrink-0">
                              {displayMinuto}'
                            </span>
                            <div className="min-w-0 flex flex-col items-start">
                              <div className="flex items-center justify-start gap-1.5 flex-wrap">
                                {avatarUrl && (
                                  <img src={avatarUrl} alt={playerName} className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0 shadow-2xs" />
                                )}
                                {playerDorsal && !isPP && (
                                  <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded text-[10px] font-black shrink-0">
                                    #{playerDorsal}
                                  </span>
                                )}
                                <span className="text-slate-800 font-bold text-xs leading-tight break-words text-left">{playerName}</span>
                              </div>
                              {goalInsights.length > 0 && (
                                <div className="flex flex-wrap items-center justify-start gap-1 mt-1">
                                  {goalInsights.map((ins, iIdx) => (
                                    <span
                                      key={iIdx}
                                      className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${
                                        ins.includes('rápido')
                                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      }`}
                                    >
                                      {ins.includes('rápido') ? `⚡ ${ins}` : `⚽ ${ins}`}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {assistName && (
                                <span className="text-[10px] font-semibold text-slate-400 break-words max-w-full mt-0.5">
                                  👟 Asist: {assistName}
                                </span>
                              )}
                            </div>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ─── OFFICIAL LIVE LINEUPS & STATS (FFCV & LIGA BRAVE) ─── */}
      {officialLive && (Array.isArray(officialLive.ourPlayers) || Array.isArray(officialLive.rivalPlayers)) && (
        <div className="p-5 lg:p-8 bg-white border-t border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-orange-100 text-orange-600 text-xs">⚡</span>
              {isLigaBraveMatch
                ? 'Alineaciones, Estadísticas y Puntuaciones en Vivo (Liga Brave)'
                : 'Alineaciones Oficiales y Ficha del Partido (FFCV)'}
            </h3>
            <div className="flex items-center flex-wrap gap-2">
              {Array.isArray(officialLive.arbitros) && officialLive.arbitros.length > 0 && (
                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">
                  ⚖️ Árbitro: {officialLive.arbitros.join(' · ')}
                </span>
              )}
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {isLigaBraveMatch ? 'Titulares · Suplentes · Fantasy Rating' : 'Titulares · Suplentes · Esquema Oficial'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[
              {
                title: isLocal ? localName : awayName,
                badge: 'Sporting Saladar',
                accent: 'emerald',
                formation: officialLive.ourFormation,
                coach: officialLive.ourCoach,
                players: Array.isArray(officialLive.ourPlayers) ? officialLive.ourPlayers : [],
              },
              {
                title: isLocal ? awayName : localName,
                badge: 'Rival',
                accent: 'amber',
                formation: officialLive.rivalFormation,
                coach: officialLive.rivalCoach,
                players: Array.isArray(officialLive.rivalPlayers) ? officialLive.rivalPlayers : [],
              },
            ].map((side, idx) => {
              const starters = side.players.filter((p: any) => p.titular);
              const bench = side.players.filter((p: any) => !p.titular);
              const coachName = typeof side.coach === 'string' ? side.coach : side.coach?.name;
              const posMap: Record<number, string> = { 1: 'POR', 2: 'DEF', 3: 'MED', 4: 'DEL' };
              const renderPlayerItem = (p: any, pIdx: number) => {
                const pName = p.nombre || p.name || 'Jugador';
                const pPos = p.positionLabel || posMap[Number(p.posicion)] || '';
                const pGoals = p.goles ?? p.goals ?? 0;
                const pAssists = p.asistencias ?? p.assists ?? 0;
                const pYellows = p.amarillas ?? p.yellowCards ?? 0;
                const pReds = p.rojas ?? p.redCards ?? 0;
                const pRating = p.puntuacion ?? p.rating ?? 0;

                return (
                  <div
                    key={`${p.fkJugadorLiga || p.codjugador || p.apuntamelo_user_id || pIdx}`}
                    className="flex items-center justify-between gap-2 py-1.5 px-2.5 rounded-lg bg-slate-50/80 hover:bg-slate-100/80 border border-slate-100 text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-6 h-6 rounded-md bg-slate-900 text-white font-black text-[10px] flex items-center justify-center shrink-0 tabular-nums">
                        {p.dorsal ?? '-'}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 truncate flex items-center gap-1.5">
                          <span className="truncate">{pName}</span>
                          {p.capitan && (
                            <span className="px-1 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300 text-[9px] font-black uppercase shrink-0" title="Capitán">
                              C
                            </span>
                          )}
                          {p.mvp && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300 text-[9px] font-black uppercase shrink-0">
                              ⭐ MVP
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {pPos && <span className="text-[10px] font-semibold text-slate-400">{pPos}</span>}
                          {p.sustituidoMinuto && (
                            <span className="text-[9px] font-bold text-rose-600" title="Sustituido">
                              ▼ {p.sustituidoMinuto}'
                            </span>
                          )}
                          {p.entroMinuto && (
                            <span className="text-[9px] font-bold text-emerald-600" title="Entró al campo">
                              ▲ {p.entroMinuto}'
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {pGoals > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-black text-[10px]" title="Goles">
                          ⚽ {pGoals}
                        </span>
                      )}
                      {pAssists > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 font-black text-[10px]" title="Asistencias">
                          👟 {pAssists}
                        </span>
                      )}
                      {pYellows > 0 && (
                        <span className="w-3 h-4 rounded-xs bg-amber-400 border border-amber-500 inline-block" title="Tarjeta Amarilla" />
                      )}
                      {pReds > 0 && (
                        <span className="w-3 h-4 rounded-xs bg-rose-600 border border-rose-700 inline-block" title="Tarjeta Roja" />
                      )}
                      {typeof pRating === 'number' && pRating > 0 && (
                        <span
                          className={`px-1.5 py-0.5 rounded font-black text-[10px] tabular-nums border ${
                            pRating >= 80
                              ? 'bg-emerald-600 text-white border-emerald-700'
                              : pRating >= 65
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                          title="Puntuación Fantasy Liga Brave"
                        >
                          {pRating} pts
                        </span>
                      )}
                    </div>
                  </div>
                );
              };

              return (
                <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-slate-900 text-sm truncate">{side.title}</h4>
                        {side.formation && (
                          <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full shrink-0">
                            {side.formation}
                          </span>
                        )}
                      </div>
                      {coachName && (
                        <p className="text-[11px] font-semibold text-slate-500 truncate mt-0.5">
                          👔 Entrenador: <span className="text-slate-700 font-bold">{coachName}</span>
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">
                      {side.players.length} convocados
                    </span>
                  </div>

                  {starters.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700 mb-1.5">
                        Titulares ({starters.length})
                      </p>
                      <div className="space-y-1">{starters.map(renderPlayerItem)}</div>
                    </div>
                  )}

                  {bench.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                        Suplentes ({bench.length})
                      </p>
                      <div className="space-y-1">{bench.map(renderPlayerItem)}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

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
