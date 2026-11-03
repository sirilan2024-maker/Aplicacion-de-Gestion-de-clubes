"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Trophy, Clock, MapPin, ChevronDown, ChevronUp, X, 
  ExternalLink, Shield, Radio, Calendar, FileText, Sparkles, ChevronRight
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { 
  getClubMatchdayMatchesAction, 
  getPublicMatchEvents 
} from "@/app/actions/match-actions";

interface FamilyMatchdayListProps {
  playerTeamId?: string;
  clubLogoUrl?: string | null;
}

export function FamilyMatchdayList({ playerTeamId, clubLogoUrl = "/logo.png" }: FamilyMatchdayListProps) {
  const router = useRouter();
  const supabase = createClient();

  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);

  // Desplegable: permite abrir y cerrar los partidos de la jornada (abierto por defecto)
  const [isExpanded, setIsExpanded] = useState(true);

  // Estados de la Ficha: SOLO GOLES (ningún detalle más)
  const [matchGoals, setMatchGoals] = useState<any[]>([]);
  const [loadingGoals, setLoadingGoals] = useState(false);

  // Cargar los 7 partidos oficiales de la jornada
  const loadMatches = async () => {
    try {
      const data = await getClubMatchdayMatchesAction(playerTeamId);
      setMatches(data || []);
    } catch (err) {
      console.error("[FamilyMatchdayList] Error loading matches:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();

    const interval = setInterval(async () => {
      try {
        const fresh = await getClubMatchdayMatchesAction(playerTeamId);
        if (fresh && fresh.length > 0) {
          setMatches(prev => {
            let changed = false;
            const updated = fresh.map(f => {
              const p = prev.find(x => x.id === f.id);
              if (!p || p.estado !== f.estado || p.resultado_propio !== f.resultado_propio || 
                  p.resultado_rival !== f.resultado_rival || p.live_timer_elapsed_seconds !== f.live_timer_elapsed_seconds) {
                changed = true;
              }
              return f;
            });
            return changed ? updated : prev;
          });
        }
      } catch {}
    }, 10000);

    const channel = supabase
      .channel(`family-matchday-list-${Math.random().toString(36).substring(7)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "partidos" }, () => {
        loadMatches();
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [playerTeamId]);

  // Cargar EXCLUSIVAMENTE los goles DEL SPORTING SALADAR al abrir la Ficha del Partido
  useEffect(() => {
    if (!selectedMatch?.id) {
      setMatchGoals([]);
      return;
    }

    let isMounted = true;
    setLoadingGoals(true);

    async function loadOnlyGoals() {
      try {
        const events = await getPublicMatchEvents(selectedMatch.id);
        if (isMounted) {
          // Filtrar estrictamente solo goles de jugadores del Sporting Saladar (player_id !== null)
          const onlySportingGoals = (events || []).filter((e: any) => 
            (e.tipo_evento === 'Gol' || e.tipo_evento === 'Penalti') && !!e.player_id
          );
          setMatchGoals(onlySportingGoals);
        }
      } catch (err) {
        console.error("[FamilyMatchdayList] Error loading goals:", err);
      } finally {
        if (isMounted) setLoadingGoals(false);
      }
    }

    loadOnlyGoals();

    const eventChannel = supabase
      .channel(`match-goals-${selectedMatch.id}-${Math.random().toString(36).substring(7)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "match_events", filter: `partido_id=eq.${selectedMatch.id}` }, async () => {
        const freshEvents = await getPublicMatchEvents(selectedMatch.id);
        if (isMounted) {
          const onlySportingGoals = (freshEvents || []).filter((e: any) => 
            (e.tipo_evento === 'Gol' || e.tipo_evento === 'Penalti') && !!e.player_id
          );
          setMatchGoals(onlySportingGoals);
        }
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(eventChannel);
    };
  }, [selectedMatch?.id]);

  const hasLiveMatches = matches.some(m => 
    m.estado === "En curso" || m.estado === "En Curso" || m.estado === "Descanso" ||
    m.live_timer_started_at !== null || (m.live_timer_elapsed_seconds && m.live_timer_elapsed_seconds > 0)
  );

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3 animate-pulse">
        <div className="h-5 bg-slate-100 rounded-md w-52 mb-2" />
        <div className="h-16 bg-slate-50 rounded-2xl w-full" />
      </div>
    );
  }

  if (matches.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-3xl border-2 border-slate-200/90 shadow-sm overflow-hidden transition-all">
      {/* ─── CABECERA DEL DESPLEGABLE: Partidos de la Jornada - Resultados ─── */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 sm:p-5 cursor-pointer bg-gradient-to-r from-slate-50/90 via-white to-blue-50/30 hover:bg-slate-50/80 transition-all select-none border-b border-slate-100 flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            <Trophy size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Partidos de la Jornada - Resultados
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100/80 border border-blue-200 text-blue-800 text-[11px] font-black tracking-wide">
                {matches.length} partidos
              </span>
              {hasLiveMatches && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-600 text-[10px] font-black uppercase tracking-wider animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-rose-500" /> En Directo
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
              {isExpanded ? "Pulsa para plegar" : "Pulsa para ver los resultados y marcadores oficiales"}
            </p>
          </div>
        </div>

        {/* Botón interactivo para desplegar / plegar */}
        <div className="flex items-center gap-2 shrink-0">
          <div className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-2xs ${
            isExpanded 
              ? "bg-slate-200 text-slate-700 hover:bg-slate-300" 
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}>
            <span>{isExpanded ? "Ocultar" : "Ver Partidos"}</span>
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </div>

      {/* ─── CONTENIDO DESPLEGABLE: FICHAS CENTRADAS Y DESTACADAS PARA MÓVIL ─── */}
      {isExpanded && (
        <div className="p-3.5 sm:p-5 space-y-3.5 bg-slate-50/50 animate-in fade-in slide-in-from-top-2 duration-200">
          {matches.map((m) => {
            const isPlayerTeam = playerTeamId && m.equipo_id === playerTeamId;
            const isLocal = !/\b(fuera|visitante)\b/i.test(m.lugar || "");
            const isFinished = m.estado === "Finalizado" && m.resultado_propio !== null && m.resultado_rival !== null;
            const isSuspended = m.estado === "Suspendido";
            const isPostponed = m.estado === "Aplazado";
            const isDescanso = m.estado === "Descanso";
            const isLive = !isFinished && !isDescanso && !isSuspended && !isPostponed && (
              m.estado === "En curso" || m.estado === "En Curso" || 
              m.live_timer_started_at !== null || 
              (m.live_timer_elapsed_seconds && m.live_timer_elapsed_seconds > 0)
            );

            const homeTeamName = isLocal ? (m.equipo?.name || "Sporting Saladar") : (m.rival_nombre || "Rival");
            const awayTeamName = isLocal ? (m.rival_nombre || "Rival") : (m.equipo?.name || "Sporting Saladar");
            const homeScore = isLocal ? m.resultado_propio : m.resultado_rival;
            const awayScore = isLocal ? m.resultado_rival : m.resultado_propio;
            const homeShield = isLocal ? clubLogoUrl : m.rival_escudo;
            const awayShield = isLocal ? m.rival_escudo : clubLogoUrl;

            // Fecha y hora formateadas
            let dateStr = "";
            let timeStr = "";
            try {
              const d = new Date(m.fecha_hora);
              dateStr = d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Madrid" });
              timeStr = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
            } catch {}

            return (
              <div
                key={m.id}
                onClick={() => setSelectedMatch(m)}
                className={`rounded-2xl sm:rounded-3xl p-4 sm:p-5 transition-all cursor-pointer shadow-sm hover:shadow-md border-2 group ${
                  isPlayerTeam
                    ? "bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/30 border-blue-500 shadow-blue-500/10"
                    : "bg-white border-slate-200/90 hover:border-blue-300"
                }`}
              >
                {/* Etiqueta superior centrada: Equipo y Categoría */}
                <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    {isPlayerTeam ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-blue-600 text-white font-black text-[10px] uppercase tracking-wider shadow-2xs">
                        <Sparkles size={11} className="text-amber-300" />
                        Tu Equipo · {m.equipo?.name || "Sporting Saladar"}
                      </span>
                    ) : (
                      <span className="text-xs sm:text-sm font-black text-slate-900 truncate">
                        {m.equipo?.name || "Sporting Saladar"}
                      </span>
                    )}

                    {m.equipo?.category && (
                      <span className="text-[11px] font-semibold text-slate-500 truncate">
                        · {m.equipo.category}
                      </span>
                    )}
                  </div>

                  {/* Estado del Partido */}
                  <div>
                    {isLive ? (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-rose-700 bg-rose-100/90 border border-rose-300 px-2.5 py-0.5 rounded-full animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                        EN DIRECTO
                      </span>
                    ) : isDescanso ? (
                      <span className="text-[10px] font-black text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
                        Descanso
                      </span>
                    ) : isFinished ? (
                      <span className="text-[10px] font-black text-slate-700 bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded-full">
                        Finalizado
                      </span>
                    ) : isSuspended ? (
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                        Suspendido
                      </span>
                    ) : isPostponed ? (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        Aplazado
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Clock size={11} className="text-slate-400" /> {timeStr}
                      </span>
                    )}
                  </div>
                </div>

                {/* ─── ENFRENTAMIENTO 100% CENTRADO Y SIMÉTRICO PARA MÓVIL ─── */}
                <div className="flex items-center justify-between gap-2 py-2 px-1">
                  {/* Equipo Local (Centrado) */}
                  <div className="flex-1 flex flex-col items-center text-center min-w-0">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white border border-slate-200 p-1.5 flex items-center justify-center shadow-xs mb-1.5 overflow-hidden shrink-0">
                      {homeShield ? (
                        <img src={homeShield} alt={homeTeamName} className="w-full h-full object-contain" />
                      ) : (
                        <Shield size={22} className="text-slate-400" />
                      )}
                    </div>
                    <p className={`text-xs sm:text-sm font-black leading-tight line-clamp-2 max-w-[120px] sm:max-w-[160px] ${
                      isLocal ? "text-blue-900" : "text-slate-800"
                    }`}>
                      {homeTeamName}
                    </p>
                    <span className="text-[9px] font-bold text-emerald-600 uppercase bg-emerald-50 px-1.5 py-0.5 rounded mt-1">
                      Local
                    </span>
                  </div>

                  {/* Marcador Central (Soberbio, centrado y alineado) */}
                  <div className="shrink-0 px-2 sm:px-4 flex flex-col items-center justify-center">
                    {isLive || isFinished || isDescanso ? (
                      <div className={`px-4 py-2 rounded-2xl font-black text-lg sm:text-2xl tracking-wider shadow-sm border ${
                        isLive 
                          ? "bg-rose-500 text-white border-rose-600 animate-pulse" 
                          : "bg-slate-900 text-white border-slate-800"
                      }`}>
                        {homeScore ?? 0} - {awayScore ?? 0}
                      </div>
                    ) : (
                      <div className="px-3.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 font-black text-xs uppercase shadow-2xs">
                        VS
                      </div>
                    )}
                    <span className="text-[10px] font-semibold text-slate-400 mt-1 capitalize">
                      {dateStr}
                    </span>
                  </div>

                  {/* Equipo Visitante (Centrado) */}
                  <div className="flex-1 flex flex-col items-center text-center min-w-0">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white border border-slate-200 p-1.5 flex items-center justify-center shadow-xs mb-1.5 overflow-hidden shrink-0">
                      {awayShield ? (
                        <img src={awayShield} alt={awayTeamName} className="w-full h-full object-contain" />
                      ) : (
                        <Shield size={22} className="text-slate-400" />
                      )}
                    </div>
                    <p className={`text-xs sm:text-sm font-black leading-tight line-clamp-2 max-w-[120px] sm:max-w-[160px] ${
                      !isLocal ? "text-blue-900" : "text-slate-800"
                    }`}>
                      {awayTeamName}
                    </p>
                    <span className="text-[9px] font-bold text-indigo-600 uppercase bg-indigo-50 px-1.5 py-0.5 rounded mt-1">
                      Visitante
                    </span>
                  </div>
                </div>

                {/* Botón Destacado: Ver Ficha Oficial (Solo Goles) */}
                <div className="mt-3 pt-2.5 border-t border-slate-100">
                  <div className="w-full py-2 px-3 rounded-xl bg-blue-50 group-hover:bg-blue-600 group-hover:text-white text-blue-700 text-xs font-black transition-all flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <FileText size={14} />
                      <span>Ver Ficha del Partido</span>
                    </span>
                    <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── MODAL: FICHA OFICIAL DEL PARTIDO (SOLO GOLES) ─── */}
      {selectedMatch && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setSelectedMatch(null)}
        >
          <div 
            className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-200 my-auto flex flex-col max-h-[90vh] text-slate-900 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera de la Ficha */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 via-white to-blue-50/50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                  <FileText size={20} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-100/70 border border-blue-200 px-2 py-0.5 rounded-full inline-block mb-0.5">
                    Ficha Oficial
                  </span>
                  <h3 className="text-base font-black text-slate-900 leading-tight">
                    {selectedMatch.equipo?.name || "Sporting Saladar"}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMatch(null)}
                className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors border border-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scoreboard Centrado del Modal */}
            {(() => {
              const isLocal = !/\b(fuera|visitante)\b/i.test(selectedMatch.lugar || "");
              const isFinished = selectedMatch.estado === "Finalizado" && selectedMatch.resultado_propio !== null && selectedMatch.resultado_rival !== null;
              const isDescanso = selectedMatch.estado === "Descanso";
              const isLive = !isFinished && !isDescanso && (
                selectedMatch.estado === "En curso" || selectedMatch.estado === "En Curso" || 
                selectedMatch.live_timer_started_at !== null || 
                (selectedMatch.live_timer_elapsed_seconds && selectedMatch.live_timer_elapsed_seconds > 0)
              );

              const homeName = isLocal ? (selectedMatch.equipo?.name || "Sporting Saladar") : (selectedMatch.rival_nombre || "Rival");
              const awayName = isLocal ? (selectedMatch.rival_nombre || "Rival") : (selectedMatch.equipo?.name || "Sporting Saladar");
              const homeScore = isLocal ? selectedMatch.resultado_propio : selectedMatch.resultado_rival;
              const awayScore = isLocal ? selectedMatch.resultado_rival : selectedMatch.resultado_propio;
              const homeShield = isLocal ? clubLogoUrl : selectedMatch.rival_escudo;
              const awayShield = isLocal ? selectedMatch.rival_escudo : clubLogoUrl;

              let fullDateStr = "";
              try {
                const d = new Date(selectedMatch.fecha_hora);
                fullDateStr = d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
              } catch {}

              return (
                <div className="p-5 sm:p-6 bg-gradient-to-b from-slate-50/70 to-white border-b border-slate-200">
                  <div className="flex items-center justify-between gap-3">
                    {/* Local */}
                    <div className="flex-1 flex flex-col items-center text-center min-w-0">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white border-2 border-slate-200 p-2 shadow-xs flex items-center justify-center mb-1.5 overflow-hidden shrink-0">
                        {homeShield ? (
                          <img src={homeShield} alt={homeName} className="w-full h-full object-contain" />
                        ) : (
                          <Shield size={28} className="text-slate-400" />
                        )}
                      </div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 leading-tight line-clamp-2">
                        {homeName}
                      </h4>
                      <span className="text-[10px] font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded-full mt-1">
                        Local
                      </span>
                    </div>

                    {/* Marcador Central */}
                    <div className="shrink-0 px-3 flex flex-col items-center justify-center">
                      {isLive || isFinished || isDescanso ? (
                        <div className="flex items-center gap-1.5 font-black text-2xl sm:text-3xl text-slate-950 tabular-nums">
                          <span>{homeScore ?? 0}</span>
                          <span className="text-slate-300">-</span>
                          <span>{awayScore ?? 0}</span>
                        </div>
                      ) : (
                        <span className="text-sm font-black text-slate-400 uppercase bg-slate-100 border border-slate-200 px-3 py-1 rounded-xl">
                          VS
                        </span>
                      )}

                      <div className="mt-2">
                        {isLive ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider animate-pulse flex items-center gap-1 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-white" /> En Directo
                          </span>
                        ) : isDescanso ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-black uppercase">
                            Descanso
                          </span>
                        ) : isFinished ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider">
                            Finalizado
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            Por Disputar
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Visitante */}
                    <div className="flex-1 flex flex-col items-center text-center min-w-0">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white border-2 border-slate-200 p-2 shadow-xs flex items-center justify-center mb-1.5 overflow-hidden shrink-0">
                        {awayShield ? (
                          <img src={awayShield} alt={awayName} className="w-full h-full object-contain" />
                        ) : (
                          <Shield size={28} className="text-slate-400" />
                        )}
                      </div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 leading-tight line-clamp-2">
                        {awayName}
                      </h4>
                      <span className="text-[10px] font-bold text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded-full mt-1">
                        Visitante
                      </span>
                    </div>
                  </div>

                  {/* Lugar y Fecha */}
                  <div className="mt-4 pt-3 border-t border-slate-200/80 flex flex-col items-center text-center gap-1 text-xs text-slate-600">
                    <span className="capitalize font-medium flex items-center gap-1">
                      <Calendar size={13} className="text-slate-400" />
                      {fullDateStr}
                    </span>
                    {selectedMatch.lugar && (
                      <span className="text-slate-500 flex items-center gap-1 text-[11px]">
                        <MapPin size={11} className="text-slate-400" />
                        {selectedMatch.lugar}
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* ─── SECCIÓN: EXCLUSIVAMENTE LOS GOLES DEL SPORTING SALADAR ─── */}
            <div className="p-4 sm:p-5 bg-slate-50/60 overflow-y-auto min-h-[140px] max-h-[320px] space-y-3">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <span className="text-base">⚽</span> Goles del Sporting Saladar ({matchGoals.length})
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">Goleadores</span>
              </div>

              {loadingGoals ? (
                <div className="p-6 text-center text-slate-400 space-y-2 animate-pulse">
                  <div className="w-6 h-6 rounded-full bg-slate-200 mx-auto" />
                  <p className="text-xs font-semibold">Cargando goles...</p>
                </div>
              ) : matchGoals.length > 0 ? (
                <div className="space-y-2">
                  {matchGoals.map((g, idx) => (
                    <div 
                      key={g.id || idx} 
                      className="p-3 rounded-2xl bg-white border border-slate-200/90 flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-black text-xs flex items-center justify-center shrink-0">
                          {g.minuto}'
                        </span>
                        <span className="text-lg shrink-0">⚽</span>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-black text-slate-900 truncate">
                            {g.player ? `${g.player.first_name} ${g.player.last_name}` : "Goleador del Sporting"}
                          </p>
                          <p className="text-[10px] font-semibold text-emerald-600">
                            {g.tipo_evento === 'Penalti' ? 'Gol de Penalti' : 'Gol Sporting Saladar'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-slate-500 bg-white rounded-2xl border border-slate-200/80 space-y-1.5">
                  <span className="text-2xl block">⚽</span>
                  <p className="text-xs font-bold text-slate-700">Sin goles del Sporting</p>
                  <p className="text-[11px] text-slate-400">
                    No se han registrado goles del Sporting Saladar en este encuentro.
                  </p>
                </div>
              )}
            </div>

            {/* Pie de la Ficha */}
            <div className="p-3.5 bg-white border-t border-slate-200 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => router.push("/live")}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all"
              >
                <Radio size={13} />
                <span>Ir al LIVE</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedMatch(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
