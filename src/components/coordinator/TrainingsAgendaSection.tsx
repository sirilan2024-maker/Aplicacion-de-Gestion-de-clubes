"use client";

import React, { useState } from "react";
import { Clock, Calendar, MapPin, User, ChevronRight, X, Shield, CalendarDays, CheckCircle2 } from "lucide-react";
import { TeamTrainingCard, UpcomingTrainingItem } from "@/types/coordinator";
import { formatDateDMY } from "@/lib/utils";

interface TrainingsAgendaSectionProps {
  teamsTrainings: TeamTrainingCard[];
  selectedTeamId?: string;
  onSelectTeam?: (teamId: string) => void;
}

export function TrainingsAgendaSection({
  teamsTrainings,
  selectedTeamId,
  onSelectTeam,
}: TrainingsAgendaSectionProps) {
  const [activeModalTeam, setActiveModalTeam] = useState<TeamTrainingCard | null>(null);
  const [modalViewRange, setModalViewRange] = useState<"mes" | "temporada">("mes");

  const todayDisplay = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-5">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              Agenda de Entrenamientos por Equipo
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Sesiones del día ({todayDisplay}) · Pulsa en cada ficha para consultar el mes o la temporada
            </p>
          </div>
        </div>

        <div className="text-[11px] font-semibold text-slate-400 self-start sm:self-auto">
          {teamsTrainings.length} Equipos del Club
        </div>
      </div>

      {/* Grid de Fichas de los 6 Equipos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {teamsTrainings.map((team) => {
          const hasToday = Boolean(team.todayTraining?.hasTraining);
          const isSelected = selectedTeamId && selectedTeamId === team.teamId;

          return (
            <div
              key={team.teamId}
              onClick={() => setActiveModalTeam(team)}
              className={`p-4 rounded-xl border transition-all cursor-pointer group flex flex-col justify-between gap-3 ${
                isSelected
                  ? "border-indigo-500 bg-indigo-50/30 ring-2 ring-indigo-500/20 shadow-xs"
                  : "border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-indigo-300 hover:shadow-xs"
              }`}
            >
              {/* Cabecera de la ficha */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                      {team.teamName}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium truncate">{team.teamCategory}</p>
                </div>

                {hasToday ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                    Hoy entrena
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                    Sin sesión hoy
                  </span>
                )}
              </div>

              {/* Información del Entrenamiento del Día */}
              <div className="p-2.5 rounded-lg bg-white border border-slate-200/80 space-y-1.5 shadow-2xs">
                {hasToday && team.todayTraining ? (
                  <>
                    <div className="flex items-center gap-2 text-xs font-black text-slate-800">
                      <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>
                        {team.todayTraining.startTime}
                        {team.todayTraining.endTime ? ` - ${team.todayTraining.endTime}` : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{team.todayTraining.location || "Polideportivo Municipal"}</span>
                    </div>
                  </>
                ) : (
                  <div className="py-1">
                    <p className="text-[11px] font-medium text-slate-500">
                      Próximo entrenamiento programado:
                    </p>
                    {team.upcomingTrainings.length > 0 ? (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mt-1">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>
                          {team.upcomingTrainings[0].date} · {team.upcomingTrainings[0].startTime}
                        </span>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 italic mt-0.5">Pendiente de convocatoria semanal</p>
                    )}
                  </div>
                )}
              </div>

              {/* Pie de ficha con Entrenador y Acción para ver mes o temporada */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[10px]">
                <div className="flex items-center gap-1 text-slate-500 truncate max-w-[150px]">
                  <User className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{team.coachName || "Cuerpo Técnico"}</span>
                </div>

                <span className="text-indigo-600 font-bold group-hover:underline inline-flex items-center gap-0.5 shrink-0">
                  <span>Ver mes/temporada</span>
                  <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal / Visor de Entrenamientos del Mes o Temporada del Equipo */}
      {activeModalTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[85vh] overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            {/* Cabecera del Modal */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                    Calendario de Entrenamientos · {activeModalTeam.teamName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {activeModalTeam.teamCategory} · {activeModalTeam.coachName ? `Entrenador: ${activeModalTeam.coachName}` : "Cuerpo Técnico"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveModalTeam(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Selector de Rango: Mes vs Temporada */}
            <div className="p-3 sm:px-5 border-b border-slate-100 flex items-center justify-between gap-3 bg-white">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setModalViewRange("mes")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    modalViewRange === "mes"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Este Mes ({activeModalTeam.upcomingTrainings.length})
                </button>
                <button
                  onClick={() => setModalViewRange("temporada")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    modalViewRange === "temporada"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Toda la Temporada ({activeModalTeam.seasonTrainingsCount})
                </button>
              </div>

              {onSelectTeam && (
                <button
                  onClick={() => {
                    onSelectTeam(activeModalTeam.teamId);
                    setActiveModalTeam(null);
                  }}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hidden sm:inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Abrir subpanel del equipo</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Listado de Entrenamientos */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-2.5 flex-1 divide-y divide-slate-100">
              {activeModalTeam.upcomingTrainings.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-8 h-8 text-slate-300" />
                  <p className="font-semibold text-slate-600">No hay más sesiones programadas en este rango</p>
                  <p className="text-[11px] text-slate-400">Las sesiones se sincronizan desde la agenda del cuerpo técnico</p>
                </div>
              ) : (
                activeModalTeam.upcomingTrainings.map((session) => (
                  <div
                    key={session.id}
                    className="pt-2.5 first:pt-0 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">
                          {formatDateDMY(session.date)}
                        </span>
                        <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {session.startTime} {session.endTime ? `- ${session.endTime}` : ""}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{session.location}</span>
                      </p>
                    </div>

                    <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                      Oficial Saladar
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Pie del modal */}
            <div className="p-3 sm:p-4 border-t border-slate-100 flex items-center justify-end bg-slate-50">
              <button
                onClick={() => setActiveModalTeam(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
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
