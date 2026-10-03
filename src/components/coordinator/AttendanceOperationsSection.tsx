"use client";

import React, { useState, useMemo } from "react";
import { Users, HeartPulse, CheckCircle2, AlertCircle, ArrowUpRight, Target, ChevronDown, ChevronUp, UserX, ClipboardList } from "lucide-react";
import { AttendanceCategoryStats, ActiveInjuryItem, TeamAttendanceSummary, PlayerAttendanceReportItem } from "@/types/coordinator";
import { InjuryDetailsModal } from "./InjuryDetailsModal";
import { PlayerAttendanceReportModal } from "./PlayerAttendanceReportModal";

interface AttendanceOperationsSectionProps {
  globalWeeklyRate: number;
  categories: AttendanceCategoryStats[];
  injuries: ActiveInjuryItem[];
  teamsAttendance?: TeamAttendanceSummary[];
  playersAttendanceReport?: PlayerAttendanceReportItem[];
  teams?: Array<{ id: string; name: string; category?: string }>;
  selectedTeamId?: string;
  currentPeriod: "semana" | "mes" | "temporada";
  onPeriodChange?: (period: "semana" | "mes" | "temporada") => void;
}

export function AttendanceOperationsSection({
  globalWeeklyRate,
  categories,
  injuries,
  teamsAttendance = [],
  playersAttendanceReport = [],
  teams = [],
  selectedTeamId = "all",
  currentPeriod = "semana",
  onPeriodChange,
}: AttendanceOperationsSectionProps) {
  const [selectedInjury, setSelectedInjury] = useState<ActiveInjuryItem | null>(null);
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [showPlayerReportModal, setShowPlayerReportModal] = useState(false);
  const [reportInitialTeamId, setReportInitialTeamId] = useState<string>("all");
  const targetRate = 85; // Objetivo de asistencia del club

  const toggleTeamAbsences = (teamId: string) => {
    setExpandedTeamId(expandedTeamId === teamId ? null : teamId);
  };

  const openPlayerReport = (teamId: string = "all") => {
    setReportInitialTeamId(teamId);
    setShowPlayerReportModal(true);
  };

  // Preparar lista de jugadores combinada si no vino a nivel raíz
  const effectivePlayersReport = useMemo(() => {
    if (playersAttendanceReport && playersAttendanceReport.length > 0) {
      return playersAttendanceReport;
    }
    const combined: PlayerAttendanceReportItem[] = [];
    teamsAttendance.forEach((t) => {
      if (t.playerSummaries) {
        combined.push(...t.playerSummaries);
      }
    });
    return combined;
  }, [playersAttendanceReport, teamsAttendance]);

  // Lista de equipos para el selector del modal
  const effectiveTeams = useMemo(() => {
    if (teams && teams.length > 0) return teams;
    return teamsAttendance.map((t) => ({
      id: t.teamId,
      name: t.teamName,
      category: t.teamCategory,
    }));
  }, [teams, teamsAttendance]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-5">
      {/* Cabecera del Bloque */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-2xs">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              Asistencia a Entrenamientos y Control Operativo
            </h2>
            <p className="text-xs text-slate-500">
              Seguimiento por equipos vs objetivo ({targetRate}%), faltas y parte médico
            </p>
          </div>
        </div>

        {/* Botón de acceso directo Informe General y selector de período */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              openPlayerReport(selectedTeamId || "all");
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Informe General</span>
          </button>

          {onPeriodChange && (
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              {(["semana", "mes", "temporada"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => onPeriodChange(p)}
                  className={`px-3 py-1 rounded-md text-xs font-bold capitalize transition-all cursor-pointer ${
                    currentPeriod === p
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Lado Izquierdo: Asistencia por Equipos y Control de Faltas (7 columnas) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-slate-900">
                {globalWeeklyRate}%
              </span>
              <span className="text-xs font-semibold text-slate-400">
                Media Global ({currentPeriod})
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <Target className="w-3.5 h-3.5 text-indigo-500" />
              <span>Objetivo club: {targetRate}%</span>
            </div>
          </div>

          {/* Listado de Asistencia por Equipos con Desplegable de Ausentes */}
          <div className="space-y-3">
            {teamsAttendance.length === 0 ? (
              <div className="space-y-2">
                {categories.map((cat) => (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-700">{cat.label}</span>
                      <span className={cat.attendanceRate >= targetRate ? "text-emerald-600" : "text-amber-600"}>
                        {cat.attendanceRate}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          cat.attendanceRate >= targetRate ? "bg-emerald-500" : "bg-amber-500"
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, cat.attendanceRate))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              teamsAttendance.map((tm) => {
                const isAboveTarget = tm.attendanceRate >= targetRate;
                const isExpanded = expandedTeamId === tm.teamId;

                return (
                  <div
                    key={tm.teamId}
                    className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/60 space-y-2 transition-colors hover:border-slate-300"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{tm.teamName}</span>
                          <span className="text-[10px] text-slate-400 font-medium">{tm.teamCategory}</span>
                        </div>
                        <p className="text-[10px] text-slate-500">
                          {tm.coachName ? `Entrenador: ${tm.coachName}` : "Plantilla federada"} · {tm.totalPlayers} jugadores
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <span
                            className={`text-sm font-black ${
                              isAboveTarget ? "text-emerald-600" : "text-amber-600"
                            }`}
                          >
                            {tm.attendanceRate}%
                          </span>
                          <p className="text-[9px] text-slate-400 font-medium">Asistencia</p>
                        </div>

                        {/* Botón para abrir informe individual de este equipo */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openPlayerReport(tm.teamId);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer border border-blue-200 shadow-2xs"
                          title={`Ver informe completo de jugadores de ${tm.teamName}`}
                        >
                          <ClipboardList className="w-3 h-3 text-blue-600" />
                          <span>Informe</span>
                        </button>

                        {tm.absentCount > 0 ? (
                          <button
                            onClick={() => toggleTeamAbsences(tm.teamId)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors cursor-pointer"
                          >
                            <UserX className="w-3 h-3" />
                            <span>{tm.absentCount} falta{tm.absentCount !== 1 ? "s" : ""}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Sin faltas</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Barra de progreso */}
                    <div className="w-full h-2 bg-slate-200/70 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isAboveTarget ? "bg-emerald-500" : "bg-amber-500"
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, tm.attendanceRate))}%` }}
                      />
                    </div>

                    {/* Desplegable de Jugadores que Han Faltado */}
                    {isExpanded && tm.absentPlayers.length > 0 && (
                      <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                        <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                          Jugadores con faltas registradas ({tm.absentPlayers.length}):
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {tm.absentPlayers.map((p) => (
                            <div
                              key={p.playerId}
                              className="p-1.5 bg-white rounded-lg border border-amber-200 text-xs flex items-center justify-between gap-1 shadow-2xs"
                            >
                              <div className="min-w-0">
                                <span className="font-bold text-slate-800 block truncate">{p.playerName}</span>
                                {p.date && (
                                  <span className="text-[10px] text-slate-400 block truncate">
                                    Fecha: {p.date}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 shrink-0 border border-amber-200">
                                {p.absencesCount} falta{p.absencesCount !== 1 ? "s" : ""}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Lado Derecho: Parte de Lesiones Activo (5 columnas) */}
        <div className="lg:col-span-5 bg-slate-50/80 rounded-xl border border-slate-200/70 p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
            <div className="flex items-center gap-1.5">
              <HeartPulse className="w-4 h-4 text-red-500" />
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Parte Médico ({injuries.length})
              </h3>
            </div>
            <span className="text-[10px] font-bold text-slate-400">En recuperación</span>
          </div>

          {injuries.length === 0 ? (
            <div className="py-6 text-center text-slate-400 text-xs flex flex-col items-center gap-1.5">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              <p className="font-semibold text-slate-600">¡Plantilla completa sin lesiones activas!</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {injuries.map((inj) => (
                <div
                  key={inj.playerId}
                  onClick={() => setSelectedInjury(inj)}
                  className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs hover:border-red-200 transition-colors cursor-pointer group flex items-start justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 group-hover:text-red-600 transition-colors truncate">
                      {inj.playerName}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {inj.teamName} · <span className="font-semibold text-slate-700">{inj.injuryType}</span>
                    </p>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-sm ${
                      inj.severity === "grave"
                        ? "bg-red-100 text-red-700"
                        : inj.severity === "moderada"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-blue-100 text-blue-700"
                    }`}>
                      {inj.severity}
                    </span>
                    {inj.estimatedReturnDate && (
                      <span className="text-[10px] text-slate-400 mt-1">
                        Est: {inj.estimatedReturnDate}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Detalle de Lesión */}
      <InjuryDetailsModal
        injury={selectedInjury}
        onClose={() => setSelectedInjury(null)}
      />

      {/* Modal de Informe Completo de Asistencia por Jugador */}
      <PlayerAttendanceReportModal
        isOpen={showPlayerReportModal}
        onClose={() => setShowPlayerReportModal(false)}
        players={effectivePlayersReport}
        teams={effectiveTeams}
        initialTeamId={reportInitialTeamId}
        currentPeriod={currentPeriod}
        onPeriodChange={onPeriodChange}
      />
    </div>
  );
}
