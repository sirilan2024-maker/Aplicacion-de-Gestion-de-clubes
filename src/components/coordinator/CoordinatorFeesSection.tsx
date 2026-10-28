"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Wallet,
  Search,
  CheckCircle2,
  AlertTriangle,
  Download,
  Users,
  Shield,
  ChevronDown,
  Filter,
  AlertCircle
} from "lucide-react";
import {
  CoordinatorPaymentsData,
  CoordinatorPlayerPaymentRecord,
  CoordinatorPlayerFeeItem
} from "@/types/coordinator";

interface CoordinatorFeesSectionProps {
  data?: CoordinatorPaymentsData;
  selectedTeamId?: string;
  selectedTeamName?: string;
  teams?: Array<{ id: string; name: string; category?: string }>;
  onSelectTeamId?: (teamId: string) => void;
}

export function CoordinatorFeesSection({
  data,
  selectedTeamId = "all",
  selectedTeamName,
  teams,
  onSelectTeamId
}: CoordinatorFeesSectionProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"TODOS" | "CON_DEUDA" | "AL_DIA">("TODOS");
  const [internalTeamId, setInternalTeamId] = useState<string>(selectedTeamId || "all");

  useEffect(() => {
    if (selectedTeamId !== undefined) {
      setInternalTeamId(selectedTeamId);
    }
  }, [selectedTeamId]);

  const effectiveTeamId = internalTeamId;

  const handleTeamChange = (teamId: string) => {
    setInternalTeamId(teamId);
    if (onSelectTeamId) {
      onSelectTeamId(teamId);
    }
  };

  const allPlayers = useMemo(() => data?.players || [], [data?.players]);

  // Lista canónica de equipos disponibles para el desplegable
  const availableTeams = useMemo(() => {
    if (teams && teams.length > 0) return teams;
    const map = new Map<string, string>();
    allPlayers.forEach((p) => {
      if (p.teamId && p.teamId !== "all" && p.teamId !== "none") {
        map.set(p.teamId, p.teamName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [teams, allPlayers]);

  // Filtrado según equipo seleccionado en el desplegable
  const teamPlayers = useMemo(() => {
    if (!effectiveTeamId || effectiveTeamId === "all") return allPlayers;
    return allPlayers.filter((p) => p.teamId === effectiveTeamId);
  }, [allPlayers, effectiveTeamId]);

  // Nombre del equipo activo
  const activeTeamName = useMemo(() => {
    if (effectiveTeamId === "all") return "Todos los Equipos";
    const found = availableTeams.find((t) => t.id === effectiveTeamId);
    return found?.name || selectedTeamName || "Equipo seleccionado";
  }, [effectiveTeamId, availableTeams, selectedTeamName]);

  // Recálculo reactivo de métricas operativas (SIN exponer dinero global ni ingresos)
  const summary = useMemo(() => {
    const total = teamPlayers.length;
    const alDia = teamPlayers.filter((p) => p.status === "al_dia").length;
    const conDeuda = teamPlayers.filter((p) => p.status === "con_deuda").length;
    const sinCuotas = teamPlayers.filter((p) => p.status === "sin_cuotas").length;
    const conCuotasAsignadas = total - sinCuotas;
    const rate = conCuotasAsignadas > 0 ? Math.round((alDia / conCuotasAsignadas) * 100) : 100;

    const totalFeesCount = teamPlayers.reduce((acc, p) => acc + (p.totalFeesCount || 0), 0);
    const totalPaidFeesCount = teamPlayers.reduce((acc, p) => acc + (p.paidFeesCount || 0), 0);
    const totalPendingFeesCount = teamPlayers.reduce((acc, p) => acc + (p.pendingFeesCount || 0), 0);

    return {
      total,
      alDia,
      conDeuda,
      sinCuotas,
      rate,
      totalFeesCount,
      totalPaidFeesCount,
      totalPendingFeesCount
    };
  }, [teamPlayers]);

  // Filtrado interactivo por texto y selector de estado
  const displayedPlayers = useMemo(() => {
    return teamPlayers.filter((p) => {
      const matchSearch =
        search.trim() === "" ||
        p.playerName.toLowerCase().includes(search.toLowerCase()) ||
        p.teamName.toLowerCase().includes(search.toLowerCase()) ||
        (p.playerDorsal !== null && p.playerDorsal !== undefined && String(p.playerDorsal).includes(search));

      const matchStatus =
        statusFilter === "TODOS" ||
        (statusFilter === "CON_DEUDA" && p.status === "con_deuda") ||
        (statusFilter === "AL_DIA" && p.status === "al_dia");

      return matchSearch && matchStatus;
    });
  }, [teamPlayers, search, statusFilter]);

  // Exportación directa a CSV con formato UTF-8 compatible con Microsoft Excel
  const handleExportCSV = () => {
    if (displayedPlayers.length === 0) return;

    const headers = [
      "Jugador",
      "Dorsal",
      "Equipo",
      "Categoría",
      "Total Cuotas",
      "Cuotas Pagadas",
      "Cuotas Pendientes",
      "Estado General",
      "Total Adeudado (€)",
      "Detalle de Cuotas Pendientes"
    ];

    const rows = displayedPlayers.map((p) => {
      const statusLabel =
        p.status === "al_dia"
          ? "Al día"
          : p.status === "con_deuda"
          ? "Con pagos pendientes"
          : "Sin cuotas asignadas";

      const totalPendingEur = (p.totalPendingCents / 100).toFixed(2).replace(".", ",");

      const pendingDetail = p.pendingFees
        .map((f) => `${f.concept} (${(f.pendingCents / 100).toFixed(2)} €)`)
        .join(" | ");

      return [
        `"${p.playerName.replace(/"/g, '""')}"`,
        `"${p.playerDorsal !== null && p.playerDorsal !== undefined ? p.playerDorsal : ""}"`,
        `"${p.teamName.replace(/"/g, '""')}"`,
        `"${p.teamCategory.replace(/"/g, '""')}"`,
        `"${p.totalFeesCount}"`,
        `"${p.paidFeesCount}"`,
        `"${p.pendingFeesCount}"`,
        `"${statusLabel}"`,
        `"${totalPendingEur}"`,
        `"${pendingDetail.replace(/"/g, '""')}"`
      ].join(";");
    });

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const teamSlug = effectiveTeamId !== "all" ? activeTeamName.toLowerCase().replace(/\s+/g, "-") : "club-completo";
    const dateStr = new Date().toISOString().split("T")[0];

    link.setAttribute("href", url);
    link.setAttribute("download", `cuotas-jugadores-${teamSlug}-${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatEuro = (cents: number) => {
    return (cents / 100).toLocaleString("es-ES", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + " €";
  };

  return (
    <div id="seccion-cuotas" className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden scroll-mt-20">
      {/* 1. Cabecera de la Sección */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gradient-to-r from-slate-50/60 to-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                Control de Cuotas y Pagos
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                Solo Lectura
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Estado de pagos y regularidad de cuotas · <strong className="text-slate-700 font-extrabold">{activeTeamName}</strong>
            </p>
          </div>
        </div>

        {/* Botón de exportar a Excel / CSV */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={displayedPlayers.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-bold transition-colors cursor-pointer border border-slate-200 shadow-2xs"
            title="Descargar listado en formato CSV para Excel"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Contadores Rápidos Operativos (KPIs de Jugadores, SIN importes globales) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 border-b border-slate-100 bg-slate-50/40">
        <div className="p-3.5 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-between text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Total Jugadores</span>
            <Users className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
            {summary.total}
          </p>
          <p className="text-[10px] text-slate-400">{summary.totalFeesCount} cuotas asignadas</p>
        </div>

        <div className="p-3.5 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-between text-emerald-600">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Jugadores Al Día</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 hidden sm:block" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-600 mt-0.5">
            {summary.alDia}
          </p>
          <p className="text-[10px] text-emerald-700 font-semibold">{summary.totalPaidFeesCount} cuotas pagadas</p>
        </div>

        <div className="p-3.5 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-between text-rose-600">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Con Pendientes</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500 hidden sm:block" />
          </div>
          <p className={`text-xl sm:text-2xl font-black mt-0.5 ${summary.conDeuda > 0 ? "text-rose-600" : "text-slate-900"}`}>
            {summary.conDeuda}
          </p>
          <p className="text-[10px] text-rose-600 font-bold">{summary.totalPendingFeesCount} cuotas por regularizar</p>
        </div>

        <div className="p-3.5 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-between text-indigo-600">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Regularidad</span>
            <Shield className="w-3.5 h-3.5 text-indigo-600 hidden sm:block" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-indigo-600 mt-0.5">
            {summary.rate}%
          </p>
          <p className="text-[10px] text-slate-400">Ratio de cumplimiento</p>
        </div>
      </div>

      {/* 3. Filtros, Desplegable de Equipos y Buscador */}
      <div className="p-3.5 sm:p-4 bg-slate-50/70 border-b border-slate-100 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        
        {/* Desplegable de Selección por Equipos */}
        <div className="flex items-center gap-2">
          <label htmlFor="team-select" className="text-xs font-black text-slate-700 whitespace-nowrap flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-indigo-600" />
            <span>Equipo:</span>
          </label>
          <div className="relative flex-1 sm:w-60">
            <select
              id="team-select"
              value={effectiveTeamId}
              onChange={(e) => handleTeamChange(e.target.value)}
              className="w-full appearance-none bg-white border border-slate-300 text-slate-900 text-xs font-extrabold rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-xs transition-all"
            >
              <option value="all">Todos los Equipos ({allPlayers.length})</option>
              {availableTeams.map((t) => {
                const count = allPlayers.filter((p) => p.teamId === t.id).length;
                return (
                  <option key={t.id} value={t.id}>
                    {t.name} {count > 0 ? `(${count})` : ""}
                  </option>
                );
              })}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Buscador de Jugadores */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por jugador o dorsal..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-800"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Selector de Estado */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setStatusFilter("TODOS")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
              statusFilter === "TODOS"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            Todos ({teamPlayers.length})
          </button>
          <button
            onClick={() => setStatusFilter("CON_DEUDA")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
              statusFilter === "CON_DEUDA"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-white text-rose-700 hover:bg-rose-50 border border-rose-200"
            }`}
          >
            Con Pendientes ({summary.conDeuda})
          </button>
          <button
            onClick={() => setStatusFilter("AL_DIA")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
              statusFilter === "AL_DIA"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200"
            }`}
          >
            Al Día ({summary.alDia})
          </button>
        </div>
      </div>

      {/* 4. Lista Directa de Jugadores y Cuotas (Sin modales ni desplegables) */}
      <div className="divide-y divide-slate-100 max-h-[580px] overflow-y-auto">
        {displayedPlayers.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
            <Users className="w-8 h-8 text-slate-300" />
            <p className="font-semibold text-slate-600">No se encontraron jugadores</p>
            <p className="text-[11px] text-slate-400">
              Prueba a cambiar el equipo o el filtro de búsqueda.
            </p>
          </div>
        ) : (
          displayedPlayers.map((player) => {
            const hasDebt = player.status === "con_deuda";
            const isAlDia = player.status === "al_dia";
            const feesList = (player.allFees && player.allFees.length > 0)
              ? player.allFees
              : player.pendingFees;

            return (
              <div
                key={player.playerId}
                className={`p-3.5 sm:p-4 transition-colors ${
                  hasDebt ? "bg-rose-50/20 hover:bg-rose-50/40" : "hover:bg-slate-50/70"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  {/* Identificación del Jugador */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                        hasDebt
                          ? "bg-rose-100 text-rose-700 border border-rose-200"
                          : isAlDia
                          ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                    >
                      {player.playerDorsal !== null && player.playerDorsal !== undefined ? (
                        `#${player.playerDorsal}`
                      ) : (
                        player.playerName.charAt(0).toUpperCase()
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-extrabold text-slate-900 truncate">
                          {player.playerName}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200/80">
                          {player.teamName} {player.teamCategory ? `· ${player.teamCategory}` : ""}
                        </span>
                      </div>

                      {/* Métricas Clarísimas: Cuotas X | Pagadas Y | Pendientes Z */}
                      {player.status === "sin_cuotas" ? (
                        <div className="mt-1.5">
                          <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            Sin cuotas asignadas en la temporada
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 sm:gap-2 mt-2 flex-wrap">
                          {/* Cuotas Totales */}
                          <div className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-bold">
                            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold">Cuotas:</span>
                            <span className="text-xs font-black text-slate-900">{player.totalFeesCount}</span>
                          </div>

                          {/* Cuotas Pagadas */}
                          <div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-200 text-xs font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="text-[10px] uppercase tracking-wider text-emerald-700 font-extrabold">Pagada{player.paidFeesCount === 1 ? "" : "s"}:</span>
                            <span className="text-xs font-black text-emerald-900">{player.paidFeesCount}</span>
                          </div>

                          {/* Cuotas Pendientes */}
                          <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-bold ${
                            player.pendingFeesCount > 0
                              ? "bg-rose-50 text-rose-800 border-rose-200"
                              : "bg-emerald-50/60 text-emerald-700 border-emerald-200"
                          }`}>
                            {player.pendingFeesCount > 0 ? (
                              <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            )}
                            <span className={`text-[10px] uppercase tracking-wider font-extrabold ${
                              player.pendingFeesCount > 0 ? "text-rose-700" : "text-emerald-700"
                            }`}>
                              Pendiente{player.pendingFeesCount === 1 ? "" : "s"}:
                            </span>
                            <span className={`text-xs font-black ${
                              player.pendingFeesCount > 0 ? "text-rose-900" : "text-emerald-800"
                            }`}>
                              {player.pendingFeesCount}
                            </span>
                          </div>

                          {/* Badge de Estado Global */}
                          {isAlDia && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Al día
                            </span>
                          )}
                          {hasDebt && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                              Pendiente de cobro
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Resumen de importe individual adeudado (para informar a familias) */}
                  {hasDebt && (
                    <div className="sm:text-right shrink-0 bg-white sm:bg-transparent p-2 sm:p-0 rounded-lg border sm:border-0 border-rose-100">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-500 block">
                        Total Adeudado
                      </span>
                      <span className="text-base font-black text-rose-600 tracking-tight">
                        {formatEuro(player.totalPendingCents)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Desglose visual directo de todas las cuotas (pagadas y pendientes) */}
                {feesList && feesList.length > 0 && (
                  <div className="mt-3 pl-0 sm:pl-13">
                    <div className="bg-white border border-slate-200/90 rounded-xl p-2.5 sm:p-3 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                          Desglose de cuotas del jugador:
                        </p>
                        {hasDebt && (
                          <span className="text-[11px] font-black text-rose-600">
                            Debe: {formatEuro(player.totalPendingCents)}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {feesList.map((fee) => {
                          const isFeePaid = fee.status === "pagado";

                          return (
                            <div
                              key={fee.id}
                              className={`flex items-center justify-between gap-2 p-2.5 rounded-lg border text-xs transition-colors ${
                                isFeePaid
                                  ? "bg-emerald-50/40 border-emerald-200 text-emerald-900"
                                  : "bg-rose-50/60 border-rose-200 text-rose-900"
                              }`}
                            >
                              <div className="min-w-0 flex items-center gap-1.5">
                                {isFeePaid ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                ) : (
                                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                )}
                                <div className="truncate">
                                  <p className="font-bold text-slate-900 truncate">{fee.concept}</p>
                                  {fee.creadoEn && (
                                    <p className="text-[10px] text-slate-400">
                                      {new Date(fee.creadoEn).toLocaleDateString("es-ES")}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span className={`font-black ${isFeePaid ? "text-emerald-700" : "text-rose-600"}`}>
                                  {isFeePaid ? formatEuro(fee.amountCents) : formatEuro(fee.pendingCents)}
                                </span>
                                <span className={`block text-[10px] font-extrabold ${isFeePaid ? "text-emerald-600" : "text-rose-600"}`}>
                                  {isFeePaid ? "Pagada" : "Pendiente"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 5. Pie de Sección Informativo */}
      <div className="p-3 bg-slate-50 border-t border-slate-100 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
        <span>
          Mostrando {displayedPlayers.length} de {teamPlayers.length} jugadores · Temporada activa 26/27
        </span>
        <span className="text-slate-400 font-medium">
          Acceso de coordinación en solo lectura
        </span>
      </div>
    </div>
  );
}
