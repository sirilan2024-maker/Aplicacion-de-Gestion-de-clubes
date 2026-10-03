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
} from "lucide-react";
import {
  CoordinatorUpcomingMatch,
  UpcomingTrainingItem,
  CoordinatorCommunications,
} from "@/types/coordinator";

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

  // Filtrar si hay un equipo seleccionado en el subpanel
  const filteredMatches = useMemo(() => {
    if (!selectedTeamId || selectedTeamId === "all") return upcomingMatches;
    return upcomingMatches.filter((m) => m.teamId === selectedTeamId);
  }, [upcomingMatches, selectedTeamId]);

  const filteredTrainings = useMemo(() => {
    if (!selectedTeamId || selectedTeamId === "all") return upcomingTrainings;
    return upcomingTrainings.filter((t) => (t as any).teamId === selectedTeamId);
  }, [upcomingTrainings, selectedTeamId]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ── 1. AGENDA DEL CLUB (2 columnas en desktop) ── */}
      <section className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
              <CalendarDays className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-slate-900 text-base">Agenda del Club</h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setAgendaTab("partidos")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  agendaTab === "partidos"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Partidos ({filteredMatches.length})
              </button>
              <button
                onClick={() => setAgendaTab("entrenamientos")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  agendaTab === "entrenamientos"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Entrenamientos ({filteredTrainings.length})
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

        {agendaTab === "partidos" ? (
          filteredMatches.length === 0 ? (
            <div className="py-10 text-center text-slate-400 space-y-2">
              <CalendarDays className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-sm font-medium text-slate-600">No hay partidos inmediatos programados</p>
              <p className="text-xs text-slate-400">Consulta el calendario de competición para ver todas las jornadas.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredMatches.map((m) => {
                const matchDate = new Date(m.fechaHora);
                const dateStr = matchDate.toLocaleDateString("es-ES", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                });
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
                      <div className="w-14 text-center shrink-0">
                        <div className="text-[11px] font-bold text-slate-500 uppercase">{dateStr}</div>
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
          )
        ) : (
          filteredTrainings.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {filteredTrainings.map((t) => (
                <div
                  key={t.id}
                  className="py-3 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-50/70 rounded-xl px-2 -mx-2 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-14 text-center shrink-0">
                      <div className="text-[11px] font-bold text-indigo-600 uppercase">{t.date}</div>
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
          ) : (
            <div className="py-10 text-center text-slate-400 space-y-2">
              <ClipboardCheck className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-sm font-medium text-slate-600">No hay sesiones inmediatas en agenda</p>
              <p className="text-xs text-slate-400">Las sesiones de entrenamiento se planifican en el calendario oficial.</p>
            </div>
          )
        )}

        <div className="pt-2 border-t border-slate-100 sm:hidden">
          <Link
            href="/dashboard/events"
            className="w-full text-center py-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center justify-center gap-1"
          >
            <span>Ver calendario completo</span>
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
                  {new Date(communications.latestAnnouncement.createdAt).toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "short",
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
