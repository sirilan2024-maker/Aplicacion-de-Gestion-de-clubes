"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Clock,
  ChevronRight,
  ClipboardCheck,
  MessageSquare,
  Radio,
  ArrowRight,
  ExternalLink,
  Calendar,
  MapPin,
} from "lucide-react";
import {
  CoordinatorUpcomingMatch,
  UpcomingTrainingItem,
  CoordinatorCommunications,
} from "@/types/coordinator";
import { formatDateDMY } from "@/lib/utils";

interface ClubAgendaCommsSectionProps {
  upcomingMatches: CoordinatorUpcomingMatch[];
  upcomingTrainings: UpcomingTrainingItem[];
  communications?: CoordinatorCommunications;
  selectedTeamId?: string;
}

export function ClubAgendaCommsSection({
  upcomingMatches = [],
  upcomingTrainings = [],
  communications,
  selectedTeamId = "all",
}: ClubAgendaCommsSectionProps) {
  const [agendaTab, setAgendaTab] = useState<"partidos" | "entrenamientos">("partidos");
  const [matchScope, setMatchScope] = useState<"fin_de_semana" | "todos">("fin_de_semana");
  const [trainingScope, setTrainingScope] = useState<"hoy" | "todos">("hoy");

  // Filtrar si hay un equipo seleccionado en el subpanel
  const filteredMatches = useMemo(() => {
    if (!selectedTeamId || selectedTeamId === "all") return upcomingMatches;
    return upcomingMatches.filter((m) => m.teamId === selectedTeamId);
  }, [upcomingMatches, selectedTeamId]);

  // Cálculo del fin de semana (Viernes a Domingo/Lunes)
  const { start: thisWeekendStart, end: thisWeekendEnd } = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    let daysToFriday = 0;
    if (day >= 1 && day <= 4) {
      daysToFriday = 5 - day;
    } else if (day === 5) {
      daysToFriday = 0;
    } else if (day === 6) {
      daysToFriday = -1;
    } else if (day === 0) {
      daysToFriday = -2;
    }

    const friday = new Date(now);
    friday.setDate(now.getDate() + daysToFriday);
    friday.setHours(0, 0, 0, 0);

    const monday = new Date(friday);
    monday.setDate(friday.getDate() + 3);
    monday.setHours(23, 59, 59, 999);

    return { start: friday, end: monday };
  }, []);

  const weekendMatches = useMemo(() => {
    // Si selectedTeamId === 'all' o no está seleccionado, asegurar los 7 partidos de los 7 equipos del club para la jornada / fin de semana
    if (!selectedTeamId || selectedTeamId === "all") {
      const teamMatchMap = new Map<string, typeof filteredMatches[0]>();
      for (const m of filteredMatches) {
        const tKey = m.teamName?.toLowerCase().trim() || m.id;
        if (tKey && !teamMatchMap.has(tKey)) {
          teamMatchMap.set(tKey, m);
        }
      }
      const roundMatches = Array.from(teamMatchMap.values()).sort((a, b) => {
        const dateA = a.fechaHora ? new Date(a.fechaHora).getTime() : 0;
        const dateB = b.fechaHora ? new Date(b.fechaHora).getTime() : 0;
        return dateA - dateB;
      });
      if (roundMatches.length > 0) return roundMatches;
    }

    // 1. Partidos del fin de semana inmediato
    const immediate = filteredMatches.filter((m) => {
      const d = new Date(m.fechaHora);
      return d >= thisWeekendStart && d <= thisWeekendEnd;
    });
    if (immediate.length > 0) return immediate;

    // 2. Si este fin de semana no hay partidos fijados (descanso de liga), tomar el fin de semana del próximo partido
    if (filteredMatches.length === 0) return [];
    const firstDate = new Date(filteredMatches[0].fechaHora);
    const day = firstDate.getDay();
    let daysToFriday = 0;
    if (day >= 1 && day <= 4) daysToFriday = 5 - day;
    else if (day === 5) daysToFriday = 0;
    else if (day === 6) daysToFriday = -1;
    else if (day === 0) daysToFriday = -2;

    const targetFri = new Date(firstDate);
    targetFri.setDate(firstDate.getDate() + daysToFriday);
    targetFri.setHours(0, 0, 0, 0);

    const targetMon = new Date(targetFri);
    targetMon.setDate(targetFri.getDate() + 3);
    targetMon.setHours(23, 59, 59, 999);

    return filteredMatches.filter((m) => {
      const d = new Date(m.fechaHora);
      return d >= targetFri && d <= targetMon;
    });
  }, [filteredMatches, thisWeekendStart, thisWeekendEnd, selectedTeamId]);

  const displayedMatches = useMemo(() => {
    if (matchScope === "fin_de_semana") {
      return weekendMatches;
    }
    return filteredMatches;
  }, [matchScope, weekendMatches, filteredMatches]);

  const filteredTrainings = useMemo(() => {
    if (!selectedTeamId || selectedTeamId === "all") return upcomingTrainings;
    return upcomingTrainings.filter((t) => (t as any).teamId === selectedTeamId);
  }, [upcomingTrainings, selectedTeamId]);

  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const todayTrainings = useMemo(() => {
    return filteredTrainings.filter((t) => t.date === todayStr);
  }, [filteredTrainings, todayStr]);

  const displayedTrainings = useMemo(() => {
    if (trainingScope === "hoy") {
      return todayTrainings;
    }
    return filteredTrainings;
  }, [trainingScope, todayTrainings, filteredTrainings]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ── 1. AGENDA DEL CLUB (2 columnas en desktop) ── */}
      <section className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4">
        {/* Cabecera Principal */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">Agenda del Club</h2>
              <p className="text-[11px] text-slate-400">Competiciones oficiales y entrenamientos de los equipos</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Pestañas Principales */}
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200">
              <button
                type="button"
                onClick={() => setAgendaTab("partidos")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  agendaTab === "partidos"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Partidos ({matchScope === "fin_de_semana" ? weekendMatches.length : filteredMatches.length})
              </button>
              <button
                type="button"
                onClick={() => setAgendaTab("entrenamientos")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  agendaTab === "entrenamientos"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Entrenamientos ({trainingScope === "hoy" ? todayTrainings.length : filteredTrainings.length})
              </button>
            </div>

            <Link
              href="/dashboard/events"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hidden sm:inline-flex items-center gap-0.5 ml-1"
            >
              <span>Ver calendario completo</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Barra de Sub-Filtros y Acciones por Pestaña */}
        {agendaTab === "partidos" ? (
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50/70 p-2 rounded-xl border border-slate-100">
            <div className="flex items-center gap-1.5 bg-white p-0.5 rounded-lg border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setMatchScope("fin_de_semana")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  matchScope === "fin_de_semana"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Próximo Fin de Semana ({weekendMatches.length})
              </button>
              <button
                type="button"
                onClick={() => setMatchScope("todos")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  matchScope === "todos"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Todos los Partidos ({filteredMatches.length})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/matches"
                className="text-xs font-bold text-slate-700 hover:text-indigo-600 inline-flex items-center gap-1 bg-white hover:bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs transition-colors"
              >
                <span>Ver Partidos y Actas</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </Link>
              <Link
                href="/dashboard/events"
                className="text-xs font-bold text-slate-700 hover:text-indigo-600 inline-flex items-center gap-1 bg-white hover:bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs transition-colors"
              >
                <span>Calendario de Eventos</span>
                <Calendar className="w-3 h-3 text-slate-400" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50/70 p-2 rounded-xl border border-slate-100">
            <div className="flex items-center gap-1.5 bg-white p-0.5 rounded-lg border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setTrainingScope("hoy")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  trainingScope === "hoy"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Entrenamientos de Hoy ({todayTrainings.length})
              </button>
              <button
                type="button"
                onClick={() => setTrainingScope("todos")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  trainingScope === "todos"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Resto de Entrenamientos ({filteredTrainings.length})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/events"
                className="text-xs font-bold text-slate-700 hover:text-indigo-600 inline-flex items-center gap-1 bg-white hover:bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs transition-colors"
              >
                <span>Calendario de Eventos</span>
                <Calendar className="w-3 h-3 text-slate-400" />
              </Link>
            </div>
          </div>
        )}

        {/* Listado de Contenido */}
        {agendaTab === "partidos" ? (
          displayedMatches.length === 0 ? (
            <div className="py-10 text-center text-slate-400 space-y-3">
              <CalendarDays className="w-8 h-8 mx-auto text-slate-300" />
              <div>
                <p className="text-sm font-bold text-slate-700">
                  {matchScope === "fin_de_semana"
                    ? "No hay partidos programados para este fin de semana"
                    : "No hay partidos inmediatos en la agenda"}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {matchScope === "fin_de_semana"
                    ? "Puede deberse a un descanso o parón en las competiciones federativas."
                    : "Revisa el calendario oficial de competición FFCV."}
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-1">
                {matchScope === "fin_de_semana" && filteredMatches.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setMatchScope("todos")}
                    className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Ver el resto de partidos ({filteredMatches.length})
                  </button>
                )}
                <Link
                  href="/dashboard/events"
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                >
                  Calendario completo
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2.5 sm:space-y-0 sm:divide-y sm:divide-slate-100">
                {displayedMatches.map((m) => {
                  const matchDate = new Date(m.fechaHora);
                  const dateStr = formatDateDMY(m.fechaHora);
                  const timeStr = matchDate.toLocaleTimeString("es-ES", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const dayName = matchDate.toLocaleDateString("es-ES", { weekday: "short" });
                  const dayCapitalized = dayName ? dayName.charAt(0).toUpperCase() + dayName.slice(1).replace(".", "") : "";

                  const isLive = m.estado === "En curso" || m.estado === "live";
                  const isFinished = m.estado === "Finalizado";
                  const isSuspended = m.estado?.toLowerCase() === "suspendido";
                  const isPostponed = m.estado?.toLowerCase() === "aplazado";
                  const homeScore = m.esLocal ? (m.resultadoPropio ?? 0) : (m.resultadoRival ?? 0);
                  const awayScore = m.esLocal ? (m.resultadoRival ?? 0) : (m.resultadoPropio ?? 0);

                  return (
                    <React.Fragment key={m.id}>
                      {/* ── Vista Móvil (< sm): Centrado, legible y con nombres completos ── */}
                      <div className="sm:hidden p-3.5 bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2.5 text-center transition-all shadow-2xs">
                        {/* Fila superior centrada: Fecha/Hora y Badges */}
                        <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs">
                          <span className="inline-flex items-center gap-1.5 font-bold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                            <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span className="uppercase text-[11px] font-black">{dayCapitalized ? `${dayCapitalized}, ` : ""}{dateStr}</span>
                            <span className="text-slate-300">·</span>
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-black text-slate-900 text-xs">{timeStr}</span>
                          </span>

                          {(m as any).tipoPartido === 'amistoso' && (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-lg bg-purple-100 text-purple-700 border border-purple-200">
                              Amistoso
                            </span>
                          )}

                          {isLive ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-full animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              EN DIRECTO {homeScore} - {awayScore}
                            </span>
                          ) : isFinished ? (
                            <span className="text-[11px] font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded-lg">
                              Finalizado {homeScore} - {awayScore}
                            </span>
                          ) : isSuspended ? (
                            <span className="text-[11px] font-black text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg uppercase">
                              Suspendido
                            </span>
                          ) : isPostponed ? (
                            <span className="text-[11px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg uppercase">
                              Aplazado
                            </span>
                          ) : (
                            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${
                              m.esLocal
                                ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                                : "text-amber-700 bg-amber-50 border-amber-200"
                            }`}>
                              {m.esLocal ? "Local" : "Visitante"}
                            </span>
                          )}
                        </div>

                        {/* Enfrentamiento centrado con nombres completos sin recortar */}
                        <div className="py-1 px-1 space-y-1.5">
                          {/* Equipo Local */}
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {m.esLocal && (
                              <span
                                className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: m.teamColor || "#4F46E5" }}
                                title={m.teamName}
                              />
                            )}
                            <span className={`text-sm font-extrabold leading-snug break-words ${m.esLocal ? "text-indigo-950 font-black" : "text-slate-800"}`}>
                              {m.esLocal ? m.teamName : m.rivalNombre}
                            </span>
                            {m.homePosition && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200/70 shadow-2xs">
                                {m.homePosition}º
                              </span>
                            )}
                          </div>

                          {/* Divisor central con VS o Marcador */}
                          <div className="flex items-center justify-center gap-2 py-0.5">
                            <div className="h-px bg-slate-200 w-10" />
                            {isLive || isFinished ? (
                              <span className="text-sm font-black px-3 py-0.5 bg-slate-900 text-white rounded-lg shadow-2xs tracking-wide">
                                {homeScore} - {awayScore}
                              </span>
                            ) : isSuspended ? (
                              <span className="text-xs font-black px-2.5 py-0.5 bg-rose-100 text-rose-800 rounded-lg border border-rose-200 uppercase">
                                Suspendido
                              </span>
                            ) : isPostponed ? (
                              <span className="text-xs font-black px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-lg border border-amber-200 uppercase">
                                Aplazado
                              </span>
                            ) : (
                              <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100 tracking-wider">
                                VS
                              </span>
                            )}
                            <div className="h-px bg-slate-200 w-10" />
                          </div>

                          {/* Equipo Visitante */}
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {!m.esLocal && (
                              <span
                                className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: m.teamColor || "#4F46E5" }}
                                title={m.teamName}
                              />
                            )}
                            <span className={`text-sm font-extrabold leading-snug break-words ${!m.esLocal ? "text-indigo-950 font-black" : "text-slate-800"}`}>
                              {m.esLocal ? m.rivalNombre : m.teamName}
                            </span>
                            {m.awayPosition && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200/70 shadow-2xs">
                                {m.awayPosition}º
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Pie de detalles centrados: Categoría y Campo/Lugar */}
                        {(m.teamCategory || (m.lugar && !['local', 'visitante'].includes(m.lugar.toLowerCase()))) && (
                          <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] text-slate-500 font-medium">
                            {m.teamCategory && (
                              <span className="text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded-md font-semibold text-[10px]">
                                {m.teamCategory}
                              </span>
                            )}
                            {m.lugar && !['local', 'visitante'].includes(m.lugar.toLowerCase()) && (
                              <span className="inline-flex items-center gap-1 text-slate-500 text-[10px]">
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="break-words">{m.lugar}</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* ── Vista Desktop (sm: en adelante): Formato fila horizontal ── */}
                      <div className="hidden sm:flex py-3 first:pt-1 last:pb-1 sm:items-center justify-between gap-3 hover:bg-slate-50/70 rounded-xl px-2.5 -mx-2 transition-colors">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-24 min-w-[90px] text-center shrink-0">
                            <div className="text-[11px] font-bold text-slate-500 uppercase whitespace-nowrap">
                              {dayCapitalized ? `${dayCapitalized} ` : ""}{dateStr}
                            </div>
                            <div className="text-xs font-black text-slate-800 flex items-center justify-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {timeStr}
                            </div>
                          </div>

                          <div className="space-y-0.5 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="inline-flex items-center gap-1.5">
                                <span className={`text-xs font-extrabold ${m.esLocal ? "text-indigo-950 font-black" : "text-slate-800"}`}>
                                  {m.esLocal ? m.teamName : m.rivalNombre}
                                </span>
                                {m.homePosition && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200/70 shadow-2xs">
                                    {m.homePosition}º
                                  </span>
                                )}
                              </span>
                              <span className="text-[10px] text-slate-400 font-bold shrink-0">vs</span>
                              <span className="inline-flex items-center gap-1.5">
                                <span className={`text-xs font-extrabold ${!m.esLocal ? "text-indigo-950 font-black" : "text-slate-800"}`}>
                                  {m.esLocal ? m.rivalNombre : m.teamName}
                                </span>
                                {m.awayPosition && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200/70 shadow-2xs">
                                    {m.awayPosition}º
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                              <span
                                className="inline-block w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: m.teamColor || "#4F46E5" }}
                              />
                              <span className="font-semibold text-slate-700">{m.teamName}</span>
                              {m.teamCategory && (
                                <span className="text-slate-400 shrink-0">· {m.teamCategory}</span>
                              )}
                              {m.lugar && !['local', 'visitante'].includes(m.lugar.toLowerCase()) && (
                                <span className="inline-flex items-center gap-0.5 text-slate-400">
                                  · <MapPin className="w-2.5 h-2.5 text-slate-400 inline shrink-0" /> {m.lugar}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isLive ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-full animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              EN DIRECTO {homeScore} - {awayScore}
                            </span>
                          ) : isFinished ? (
                            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                              {homeScore} - {awayScore}
                            </span>
                          ) : isSuspended ? (
                            <span className="text-[11px] font-black text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg uppercase">
                              Suspendido
                            </span>
                          ) : isPostponed ? (
                            <span className="text-[11px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg uppercase">
                              Aplazado
                            </span>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              {(m as any).tipoPartido === 'amistoso' && (
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-lg bg-purple-100 text-purple-700 border border-purple-200">
                                  Amistoso
                                </span>
                              )}
                              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${
                                m.esLocal
                                  ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                                  : "text-amber-700 bg-amber-50 border-amber-200"
                              }`}>
                                {m.esLocal ? "Local" : "Visitante"}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Pie con botón para ver el resto de partidos o calendario */}
              <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                {matchScope === "fin_de_semana" && filteredMatches.length > weekendMatches.length ? (
                  <button
                    type="button"
                    onClick={() => setMatchScope("todos")}
                    className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Ver resto de partidos ({filteredMatches.length - weekendMatches.length} más)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : matchScope === "todos" ? (
                  <button
                    type="button"
                    onClick={() => setMatchScope("fin_de_semana")}
                    className="text-slate-500 hover:text-slate-800 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>← Ver solo partidos del fin de semana</span>
                  </button>
                ) : (
                  <span className="text-slate-400">Todos los partidos del fin de semana mostrados</span>
                )}

                <Link
                  href="/dashboard/events"
                  className="text-slate-600 hover:text-indigo-600 font-bold flex items-center gap-1 hover:underline"
                >
                  <span>Calendario completo de eventos</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )
        ) : (
          displayedTrainings.length > 0 ? (
            <div className="space-y-3">
              <div className="space-y-2.5 sm:space-y-0 sm:divide-y sm:divide-slate-100">
                {displayedTrainings.map((t) => (
                  <React.Fragment key={t.id}>
                    {/* Vista Móvil Entrenamientos */}
                    <div className="sm:hidden p-3.5 bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2 text-center transition-all shadow-2xs">
                      <div className="flex items-center justify-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1.5 font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                          <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="text-[11px] uppercase font-bold">{formatDateDMY(t.date)}</span>
                          <span className="text-indigo-300">·</span>
                          <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="text-xs font-black">{(t.startTime || "18:00").slice(0, 5)}</span>
                        </span>
                        <span className="text-[11px] font-bold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                          {t.eventType}
                        </span>
                      </div>
                      <div className="py-0.5">
                        <p className="text-sm font-extrabold text-slate-900 leading-snug">{t.title}</p>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          {t.teamName} · {t.location || "Campo de fútbol"}
                        </p>
                      </div>
                    </div>

                    {/* Vista Desktop Entrenamientos */}
                    <div className="hidden sm:flex py-3 first:pt-1 last:pb-1 sm:items-center justify-between gap-3 hover:bg-slate-50/70 rounded-xl px-2.5 -mx-2 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-24 min-w-[90px] text-center shrink-0">
                          <div className="text-[11px] font-bold text-indigo-600 uppercase whitespace-nowrap">{formatDateDMY(t.date)}</div>
                          <div className="text-xs font-black text-slate-800 flex items-center justify-center gap-1">
                            <Clock className="w-3 h-3 text-indigo-400" />
                            {(t.startTime || "18:00").slice(0, 5)}
                          </div>
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <p className="text-xs font-bold text-slate-900">{t.title}</p>
                          <p className="text-[11px] text-slate-500">
                            {t.teamName} · {t.location || "Campo de fútbol"}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-lg shrink-0">
                        {t.eventType}
                      </span>
                    </div>
                  </React.Fragment>
                ))}
              </div>

              {/* Pie con botón para ver resto de entrenamientos o calendario */}
              <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                {trainingScope === "hoy" && filteredTrainings.length > todayTrainings.length ? (
                  <button
                    type="button"
                    onClick={() => setTrainingScope("todos")}
                    className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Ver resto de entrenamientos ({filteredTrainings.length - todayTrainings.length} más)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : trainingScope === "todos" ? (
                  <button
                    type="button"
                    onClick={() => setTrainingScope("hoy")}
                    className="text-slate-500 hover:text-slate-800 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>← Ver solo entrenamientos de hoy</span>
                  </button>
                ) : (
                  <span className="text-slate-400">Todos los entrenamientos de hoy mostrados</span>
                )}

                <Link
                  href="/dashboard/events"
                  className="text-slate-600 hover:text-indigo-600 font-bold flex items-center gap-1 hover:underline"
                >
                  <span>Calendario completo de eventos</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center text-slate-400 space-y-3">
              <ClipboardCheck className="w-8 h-8 mx-auto text-slate-300" />
              <div>
                <p className="text-sm font-bold text-slate-700">
                  {trainingScope === "hoy"
                    ? "No hay entrenamientos programados para hoy"
                    : "No hay sesiones inmediatas en agenda"}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {trainingScope === "hoy"
                    ? "Día sin sesiones de campo registradas en los equipos del club."
                    : "Las sesiones de entrenamiento se planifican en el calendario oficial."}
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-1">
                {trainingScope === "hoy" && filteredTrainings.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setTrainingScope("todos")}
                    className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Ver resto de entrenamientos ({filteredTrainings.length})
                  </button>
                )}
                <Link
                  href="/dashboard/events"
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                >
                  Calendario de eventos
                </Link>
              </div>
            </div>
          )
        )}

        <div className="pt-2 border-t border-slate-100 sm:hidden">
          <Link
            href="/dashboard/events"
            className="w-full text-center py-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center justify-center gap-1"
          >
            <span>Ver calendario completo de eventos</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* ── 2. COMUNICACIONES (1 columna en desktop) ── */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-4 flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-sky-50 text-sky-600 rounded-lg">
                <MessageSquare className="w-4 h-4" />
              </div>
              <h2 className="font-bold text-slate-900 text-base">Comunicaciones</h2>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 bg-sky-50 text-sky-700 rounded-full border border-sky-200">
              {communications?.activeChannelsCount ?? 16} canales
            </span>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Radio className="w-3.5 h-3.5 text-sky-600" />
              <span>Canal Oficial de Anuncios</span>
            </div>
            {communications?.latestAnnouncement ? (
              <div className="space-y-1">
                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed whitespace-pre-line">
                  &ldquo;{communications.latestAnnouncement.content}&rdquo;
                </p>
                <p className="text-[10px] text-slate-400">
                  {formatDateDMY(communications.latestAnnouncement.createdAt)}{" "}
                  {new Date(communications.latestAnnouncement.createdAt).toLocaleTimeString("es-ES", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-500 leading-relaxed">
                Canales de equipo y anuncios institucionales operativos. Avisos automáticos por correo activos.
              </p>
            )}
          </div>
        </div>

        <Link
          href="/dashboard/mensajes"
          className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs mt-4 cursor-pointer"
        >
          <MessageSquare className="w-3.5 h-3.5 text-sky-300" />
          <span>Abrir Mensajería del Club</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </section>
    </div>
  );
}
