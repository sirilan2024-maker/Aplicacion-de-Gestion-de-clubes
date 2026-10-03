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
  }, [filteredMatches, thisWeekendStart, thisWeekendEnd]);

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
              <div className="divide-y divide-slate-100">
                {displayedMatches.map((m) => {
                  const matchDate = new Date(m.fechaHora);
                  const dateStr = formatDateDMY(m.fechaHora);
                  const timeStr = matchDate.toLocaleTimeString("es-ES", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  const isLive = m.estado === "En curso" || m.estado === "live";
                  const isFinished = m.estado === "Finalizado";

                  return (
                    <div
                      key={m.id}
                      className="py-3 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-50/70 rounded-xl px-2 -mx-2 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-16 text-center shrink-0">
                          <div className="text-[10px] font-bold text-slate-500 uppercase">{dateStr}</div>
                          <div className="text-xs font-black text-slate-800 flex items-center justify-center gap-0.5">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {timeStr}
                          </div>
                        </div>

                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {m.esLocal ? m.teamName : m.rivalNombre}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold shrink-0">vs</span>
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {m.esLocal ? m.rivalNombre : m.teamName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 truncate">
                            <span
                              className="inline-block w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: m.teamColor || "#4F46E5" }}
                            />
                            <span className="font-medium truncate">{m.teamName}</span>
                            {m.teamCategory && (
                              <span className="text-slate-400 shrink-0">· {m.teamCategory}</span>
                            )}
                            {m.lugar && (
                              <span className="hidden md:inline text-slate-400 truncate">
                                · {m.lugar}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {isLive ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            EN DIRECTO {m.resultadoPropio ?? 0} - {m.resultadoRival ?? 0}
                          </span>
                        ) : isFinished ? (
                          <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">
                            {m.resultadoPropio ?? 0} - {m.resultadoRival ?? 0}
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg">
                            {m.esLocal ? "Local" : "Visitante"}
                          </span>
                        )}
                      </div>
                    </div>
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
              <div className="divide-y divide-slate-100">
                {displayedTrainings.map((t) => (
                  <div
                    key={t.id}
                    className="py-3 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-50/70 rounded-xl px-2 -mx-2 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-16 text-center shrink-0">
                        <div className="text-[10px] font-bold text-indigo-600 uppercase">{formatDateDMY(t.date)}</div>
                        <div className="text-xs font-black text-slate-800">{t.startTime || "18:00"}</div>
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{t.title}</p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {t.teamName} · {t.location || "Campo de fútbol"}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-lg self-end sm:self-center shrink-0">
                      {t.eventType}
                    </span>
                  </div>
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
