"use client";

import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  X,
  Users,
  Search,
  CheckCircle2,
  AlertTriangle,
  UserX,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Printer,
  Calendar,
  Filter,
  ArrowUpDown,
  ShieldAlert,
  ClipboardList,
  Clock,
} from "lucide-react";
import { PlayerAttendanceReportItem } from "@/types/coordinator";
import { formatDateDMY } from "@/lib/utils";

interface PlayerAttendanceReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: PlayerAttendanceReportItem[];
  teams: Array<{ id: string; name: string; category?: string }>;
  initialTeamId?: string;
  currentPeriod: "semana" | "mes" | "temporada";
  onPeriodChange?: (period: "semana" | "mes" | "temporada") => void;
}

const CANONICAL_MODAL_ORDER = [
  { key: "senior", label: "Senior" },
  { key: "infantil a", label: "Infantil A" },
  { key: "infantil b", label: "Infantil B" },
  { key: "cadete a", label: "Cadete A" },
  { key: "cadete b", label: "Cadete B" },
  { key: "juvenil a", label: "Juvenil A" },
  { key: "juvenil b", label: "Juvenil B" },
];

export function PlayerAttendanceReportModal({
  isOpen,
  onClose,
  players = [],
  teams = [],
  initialTeamId = "all",
  currentPeriod,
  onPeriodChange,
}: PlayerAttendanceReportModalProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>(initialTeamId || "all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | "con_faltas" | "en_riesgo" | "cumple_objetivo" | "con_retrasos">("todos");
  const [sortBy, setSortBy] = useState<"riesgo" | "faltas" | "retrasos" | "asistencia_desc" | "nombre">("riesgo");
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sincronizar filtro cuando cambia initialTeamId o al abrir el modal
  useEffect(() => {
    if (isOpen) {
      setSelectedTeamFilter(initialTeamId || "all");
    }
  }, [initialTeamId, isOpen]);

  const orderedTeams = useMemo(() => {
    const list: Array<{ id: string; label: string }> = [];
    const usedIds = new Set<string>();

    CANONICAL_MODAL_ORDER.forEach((target) => {
      const match = (teams || []).find((t) => {
        const n = (t?.name || "").trim().toLowerCase();
        return n === target.key || n.startsWith(target.key);
      });
      if (match && !usedIds.has(match.id)) {
        usedIds.add(match.id);
        list.push({ id: match.id, label: target.label || match.name });
      }
    });

    // Añadir cualquier equipo restante no contemplado en el orden canónico
    (teams || []).forEach((t) => {
      if (t?.id && !usedIds.has(t.id)) {
        usedIds.add(t.id);
        list.push({ id: t.id, label: t.name || "Equipo" });
      }
    });

    return list;
  }, [teams]);

  // Filtrado de jugadores
  const filteredPlayers = useMemo(() => {
    return (players || []).filter((p) => {
      // Filtro de equipo
      if (selectedTeamFilter !== "all" && p.teamId !== selectedTeamFilter) {
        return false;
      }

      // Filtro de búsqueda por texto
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = (p.playerName || "").toLowerCase().includes(query);
        const matchesDorsal = p.playerDorsal != null ? p.playerDorsal.toString() === query : false;
        const matchesTeam = (p.teamName || "").toLowerCase().includes(query);
        if (!matchesName && !matchesDorsal && !matchesTeam) {
          return false;
        }
      }

      // Filtro de estado
      if (statusFilter === "con_faltas" && (p.absentCount || 0) <= 0) {
        return false;
      }
      if (statusFilter === "con_retrasos" && (p.lateCount || 0) <= 0) {
        return false;
      }
      if (statusFilter === "en_riesgo" && (p.attendanceRate || 0) >= 75 && (p.absentCount || 0) <= 1) {
        return false;
      }
      if (statusFilter === "cumple_objetivo" && (p.attendanceRate || 0) < 85) {
        return false;
      }

      return true;
    });
  }, [players, selectedTeamFilter, searchQuery, statusFilter]);

  // Ordenación de jugadores
  const sortedPlayers = useMemo(() => {
    const list = [...filteredPlayers];
    if (sortBy === "riesgo") {
      return list.sort((a, b) => (a.attendanceRate || 0) - (b.attendanceRate || 0) || (b.absentCount || 0) - (a.absentCount || 0));
    }
    if (sortBy === "faltas") {
      return list.sort((a, b) => (b.absentCount || 0) - (a.absentCount || 0) || (a.attendanceRate || 0) - (b.attendanceRate || 0));
    }
    if (sortBy === "retrasos") {
      return list.sort((a, b) => (b.lateCount || 0) - (a.lateCount || 0) || (a.attendanceRate || 0) - (b.attendanceRate || 0));
    }
    if (sortBy === "asistencia_desc") {
      return list.sort((a, b) => (b.attendanceRate || 0) - (a.attendanceRate || 0));
    }
    if (sortBy === "nombre") {
      return list.sort((a, b) => (a.playerName || "").localeCompare(b.playerName || ""));
    }
    return list;
  }, [filteredPlayers, sortBy]);

  // Estadísticas globales del conjunto filtrado/actual
  const totalEvaluated = sortedPlayers.length;
  const avgAttendance = totalEvaluated > 0
    ? Math.round(sortedPlayers.reduce((acc, p) => acc + p.attendanceRate, 0) / totalEvaluated)
    : 0;
  const compliantCount = sortedPlayers.filter((p) => p.attendanceRate >= 85).length;
  const atRiskCount = sortedPlayers.filter((p) => p.attendanceRate < 75 || p.absentCount > 1).length;
  const totalLates = sortedPlayers.reduce((acc, p) => acc + (p.lateCount || 0), 0);
  const totalAbsences = sortedPlayers.reduce((acc, p) => acc + p.absentCount, 0);

  const toggleExpand = (playerId: string) => {
    setExpandedPlayerId(expandedPlayerId === playerId ? null : playerId);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col sm:items-center sm:justify-center sm:p-4 md:p-6 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-5xl bg-white sm:rounded-2xl shadow-2xl sm:border border-slate-200 flex flex-col h-[100dvh] sm:h-auto sm:max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300 shrink-0">
              <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-lg font-black tracking-tight text-white truncate">
                  Informe de Asistencia
                </h2>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold uppercase bg-blue-500/30 text-blue-200 border border-blue-400/30 shrink-0">
                  Control Operativo
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300 hidden sm:block">
                Auditoría individual de asistencia, ausencias y justificaciones por plantilla
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={handlePrint}
              title="Imprimir informe"
              className="p-1.5 sm:p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Resumen KPIs del informe (en móvil: tira horizontal scrolleable compacta) */}
        <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 sm:px-6 sm:py-3.5 shrink-0 overflow-x-auto no-scrollbar">
          <div className="flex sm:grid sm:grid-cols-6 gap-2 sm:gap-3 min-w-max sm:min-w-0">
            <div className="bg-white p-2 sm:p-2.5 rounded-xl border border-slate-200 shadow-2xs min-w-[95px] sm:min-w-0">
              <p className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase">Evaluados</p>
              <p className="text-base sm:text-xl font-black text-slate-900 mt-0.5">{totalEvaluated}</p>
              <p className="text-[9px] sm:text-[10px] text-slate-500">Jugadores</p>
            </div>

            <div className="bg-white p-2 sm:p-2.5 rounded-xl border border-slate-200 shadow-2xs min-w-[100px] sm:min-w-0">
              <p className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase">Media Asist.</p>
              <p className={`text-base sm:text-xl font-black mt-0.5 ${avgAttendance >= 85 ? "text-emerald-600" : "text-amber-600"}`}>
                {avgAttendance}%
              </p>
              <p className="text-[9px] sm:text-[10px] text-slate-500">Obj: 85%</p>
            </div>

            <div className="bg-white p-2 sm:p-2.5 rounded-xl border border-slate-200 shadow-2xs min-w-[105px] sm:min-w-0">
              <p className="text-[9px] sm:text-[10px] font-extrabold text-emerald-600 uppercase">≥85% Asist.</p>
              <p className="text-base sm:text-xl font-black text-emerald-600 mt-0.5">{compliantCount}</p>
              <p className="text-[9px] sm:text-[10px] text-slate-500">Cumplen objetivo</p>
            </div>

            <div className="bg-white p-2 sm:p-2.5 rounded-xl border border-slate-200 shadow-2xs min-w-[95px] sm:min-w-0">
              <p className="text-[9px] sm:text-[10px] font-extrabold text-red-500 uppercase">En Riesgo</p>
              <p className={`text-base sm:text-xl font-black mt-0.5 ${atRiskCount > 0 ? "text-red-600" : "text-slate-900"}`}>
                {atRiskCount}
              </p>
              <p className="text-[9px] sm:text-[10px] text-slate-500">&lt;75% o &gt;1 falta</p>
            </div>

            <div className="bg-white p-2 sm:p-2.5 rounded-xl border border-slate-200 shadow-2xs min-w-[105px] sm:min-w-0">
              <p className="text-[9px] sm:text-[10px] font-extrabold text-amber-600 uppercase">Total Faltas</p>
              <p className="text-base sm:text-xl font-black text-amber-700 mt-0.5">{totalAbsences}</p>
              <p className="text-[9px] sm:text-[10px] text-slate-500">{currentPeriod}</p>
            </div>

            <div className="bg-white p-2 sm:p-2.5 rounded-xl border border-slate-200 shadow-2xs min-w-[100px] sm:min-w-0">
              <p className="text-[9px] sm:text-[10px] font-extrabold text-orange-600 uppercase">Retrasos</p>
              <p className="text-base sm:text-xl font-black text-orange-700 mt-0.5">{totalLates}</p>
              <p className="text-[9px] sm:text-[10px] text-slate-500">{currentPeriod}</p>
            </div>
          </div>
        </div>

        {/* Barra de Filtros y Controles */}
        <div className="p-3 sm:p-4 bg-white border-b border-slate-100 flex flex-col md:flex-row gap-2.5 sm:gap-3 items-stretch md:items-center justify-between shrink-0">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-2.5 flex-1 min-w-0">
            {/* Buscador de jugadores */}
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por jugador, dorsal o equipo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 sm:py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Selectores agrupados */}
            <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-2.5">
              {/* Selector de Equipo */}
              <select
                value={selectedTeamFilter}
                onChange={(e) => setSelectedTeamFilter(e.target.value)}
                className="w-full sm:w-auto px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer truncate"
              >
                <option value="all">Todos los equipos</option>
                {orderedTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>

              {/* Filtro de Estado */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full sm:w-auto px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer truncate"
              >
                <option value="todos">Todos Estados</option>
                <option value="con_faltas">⚠️ Con Faltas</option>
                <option value="con_retrasos">⏰ Con Retrasos</option>
                <option value="en_riesgo">🚨 En Riesgo (&lt;75%)</option>
                <option value="cumple_objetivo">✅ Objetivo (≥85%)</option>
              </select>
            </div>
          </div>

          {/* Orden y Período */}
          <div className="flex items-center justify-between sm:justify-end gap-2 pt-1 sm:pt-0">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 flex-1 sm:flex-initial">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full sm:w-auto px-2 py-1.5 sm:py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none cursor-pointer truncate"
              >
                <option value="riesgo">Menor % (Riesgo)</option>
                <option value="faltas">Más Faltas</option>
                <option value="retrasos">Más Retrasos</option>
                <option value="asistencia_desc">Mayor %</option>
                <option value="nombre">Nombre A-Z</option>
              </select>
            </div>

            {onPeriodChange && (
              <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-100 p-0.5 rounded-lg shrink-0">
                {(["semana", "mes", "temporada"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => onPeriodChange(p)}
                    className={`px-2 sm:px-2.5 py-1 rounded-md text-[10px] sm:text-[11px] font-bold capitalize transition-all cursor-pointer ${
                      currentPeriod === p
                        ? "bg-white text-slate-900 shadow-2xs"
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

        {/* Lista de Jugadores */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-6 space-y-2.5 divide-y divide-slate-100 pb-8">
          {sortedPlayers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <UserX className="w-10 h-10 text-slate-300" />
              <p className="text-sm font-bold text-slate-600">No se encontraron jugadores con los filtros seleccionados</p>
              <p className="text-xs text-slate-400">Prueba a restablecer el buscador o seleccionar otro equipo</p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedTeamFilter("all");
                  setStatusFilter("todos");
                }}
                className="mt-2 px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
              >
                Restablecer Filtros
              </button>
            </div>
          ) : (
            sortedPlayers.map((player) => {
              const isExpanded = expandedPlayerId === player.playerId;
              const isAboveTarget = player.attendanceRate >= 85;
              const isCritical = player.attendanceRate < 75 || player.absentCount > 2;

              return (
                <div
                  key={player.playerId}
                  className={`pt-2.5 rounded-xl p-3 transition-colors ${
                    isExpanded ? "bg-blue-50/40 border border-blue-200" : "hover:bg-slate-50/80"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Ficha Jugador */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs shrink-0 overflow-hidden border border-slate-300 shadow-2xs">
                        {player.playerAvatar ? (
                          <img
                            src={player.playerAvatar}
                            alt={player.playerName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>
                            {player.playerDorsal ? `#${player.playerDorsal}` : player.playerName.substring(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 truncate">
                            {player.playerName}
                          </span>
                          {player.playerDorsal && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-slate-100 text-slate-600 border border-slate-200">
                              #{player.playerDorsal}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="font-semibold text-slate-700">{player.teamName}</span>
                          {player.teamCategory && (
                            <>
                              <span>·</span>
                              <span className="text-slate-400">{player.teamCategory}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Métricas y Estado */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                      {/* Desglose de presencias y faltas */}
                      <div className="flex items-center gap-2 text-xs">
                        <div className="text-center px-2 py-1 bg-emerald-50 rounded-lg border border-emerald-100">
                          <span className="block text-[10px] font-bold text-emerald-600 uppercase">Presencias</span>
                          <span className="font-black text-emerald-800">{player.presentCount}</span>
                        </div>
                        <div className="text-center px-2 py-1 bg-amber-50 rounded-lg border border-amber-100">
                          <span className="block text-[10px] font-bold text-amber-600 uppercase">Faltas</span>
                          <span className={`font-black ${player.absentCount > 0 ? "text-amber-800" : "text-slate-500"}`}>
                            {player.absentCount}
                          </span>
                        </div>
                        {(player.lateCount ?? 0) > 0 && (
                          <div className="text-center px-2 py-1 bg-orange-50 rounded-lg border border-orange-100">
                            <span className="block text-[10px] font-bold text-orange-600 uppercase">Retrasos</span>
                            <span className="font-black text-orange-800">{player.lateCount}</span>
                          </div>
                        )}
                        {player.justifiedCount > 0 && (
                          <div className="text-center px-2 py-1 bg-blue-50 rounded-lg border border-blue-100">
                            <span className="block text-[10px] font-bold text-blue-600 uppercase">Justif.</span>
                            <span className="font-black text-blue-800">{player.justifiedCount}</span>
                          </div>
                        )}
                      </div>

                      {/* Porcentaje y barra */}
                      <div className="w-24 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span
                            className={`text-sm font-black ${
                              isAboveTarget
                                ? "text-emerald-600"
                                : isCritical
                                ? "text-red-600"
                                : "text-amber-600"
                            }`}
                          >
                            {player.attendanceRate}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isAboveTarget
                                ? "bg-emerald-500"
                                : isCritical
                                ? "bg-red-500"
                                : "bg-amber-500"
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, player.attendanceRate))}%` }}
                          />
                        </div>
                      </div>

                      {/* Botón de detalle */}
                      <button
                        onClick={() => toggleExpand(player.playerId)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                        title={isExpanded ? "Ocultar historial" : "Ver historial de sesiones"}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Detalle desplegable de historial del jugador */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-2.5 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                          Últimas Sesiones Registradas ({player.recentRecords.length}):
                        </span>

                        <div className="flex items-center gap-2">
                          <Link
                            href={`/dashboard/equipos/${player.teamId}/jugador/${player.playerId}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            <span>Ficha del Jugador</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                          <span>·</span>
                          <Link
                            href={`/dashboard/equipos/${player.teamId}/asistencia`}
                            target="_blank"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-800 transition-colors"
                          >
                            <span>Pasar Lista del Equipo</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>

                      {player.recentRecords.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">
                          No hay sesiones individuales registradas en este período. El porcentaje toma la tasa colectiva del equipo.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {player.recentRecords.map((rec, idx) => {
                            let badgeBg = "bg-emerald-50 text-emerald-700 border-emerald-200";
                            let icon = <CheckCircle2 className="w-3 h-3 text-emerald-600" />;
                            let label = "Presente";

                            if (rec.status === "ausente") {
                              badgeBg = "bg-red-50 text-red-700 border-red-200";
                              icon = <UserX className="w-3 h-3 text-red-600" />;
                              label = "Ausente (Falta)";
                            } else if (rec.status === "justificado") {
                              badgeBg = "bg-amber-50 text-amber-700 border-amber-200";
                              icon = <AlertTriangle className="w-3 h-3 text-amber-600" />;
                              label = "Justificado / Lesión";
                            } else if (rec.status === "retraso") {
                              badgeBg = "bg-orange-50 text-orange-700 border-orange-200";
                              icon = <Clock className="w-3 h-3 text-orange-600" />;
                              label = "Retraso";
                            }

                            return (
                              <div
                                key={idx}
                                className={`p-2 rounded-lg border text-xs flex items-center justify-between gap-1 shadow-2xs ${badgeBg}`}
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1 font-bold">
                                    {icon}
                                    <span className="truncate">{label}</span>
                                  </div>
                                  <span className="text-[10px] opacity-80 block mt-0.5">
                                    {rec.date ? `Fecha: ${formatDateDMY(rec.date)}` : "Sesión ordinaria"}
                                  </span>
                                  {rec.notes && (
                                    <span className="text-[10px] italic block truncate text-slate-600" title={rec.notes}>
                                      Nota: {rec.notes}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Pie del Modal */}
        <div className="px-3.5 py-2.5 sm:px-6 sm:py-3 bg-slate-50 border-t border-slate-200 flex flex-row items-center justify-between gap-2 shrink-0 text-xs text-slate-500 pb-[max(0.65rem,env(safe-area-inset-bottom))]">
          <span className="text-[11px] sm:text-xs truncate">
            Mostrando <strong className="text-slate-800">{sortedPlayers.length}</strong> de{" "}
            <strong className="text-slate-800">{players.length}</strong>
            <span className="hidden sm:inline"> jugadores</span>
          </span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors cursor-pointer shrink-0 shadow-xs active:scale-95"
          >
            Cerrar Informe
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
