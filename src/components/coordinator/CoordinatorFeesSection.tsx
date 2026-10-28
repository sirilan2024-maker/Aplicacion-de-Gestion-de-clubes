"use client";

import React, { useState, useMemo } from "react";
import {
  Wallet,
  Search,
  CheckCircle2,
  AlertTriangle,
  Download,
  Users,
  Shield,
  Clock,
  HelpCircle,
  FileSpreadsheet,
  AlertCircle
} from "lucide-react";
import {
  CoordinatorPaymentsData,
  CoordinatorPlayerPaymentRecord,
  CoordinatorPlayerFeeItem
} from "@/types/coordinator";

interface CoordinatorFeesSectionProps {
  data?: CoordinatorPaymentsData;
  selectedTeamId: string;
  selectedTeamName?: string;
}

export function CoordinatorFeesSection({
  data,
  selectedTeamId,
  selectedTeamName
}: CoordinatorFeesSectionProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"TODOS" | "CON_DEUDA" | "AL_DIA">("TODOS");

  const allPlayers = useMemo(() => data?.players || [], [data?.players]);

  // Filtrado según equipo seleccionado en la cabecera del coordinador
  const teamPlayers = useMemo(() => {
    if (!selectedTeamId || selectedTeamId === "all") return allPlayers;
    return allPlayers.filter((p) => p.teamId === selectedTeamId);
  }, [allPlayers, selectedTeamId]);

  // Recálculo reactivo de métricas operativas (SIN exponer dinero global ni ingresos)
  const summary = useMemo(() => {
    const total = teamPlayers.length;
    const alDia = teamPlayers.filter((p) => p.status === "al_dia").length;
    const conDeuda = teamPlayers.filter((p) => p.status === "con_deuda").length;
    const sinCuotas = teamPlayers.filter((p) => p.status === "sin_cuotas").length;
    const conCuotasAsignadas = total - sinCuotas;
    const rate = conCuotasAsignadas > 0 ? Math.round((alDia / conCuotasAsignadas) * 100) : 100;

    return {
      total,
      alDia,
      conDeuda,
      sinCuotas,
      rate
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
      "Estado Cuotas",
      "Nº Cuotas Pendientes",
      "Total Pendiente (€)",
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
        `"${statusLabel}"`,
        `"${p.pendingFeesCount}"`,
        `"${totalPendingEur}"`,
        `"${pendingDetail.replace(/"/g, '""')}"`
      ].join(";");
    });

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const teamSlug = selectedTeamId !== "all" && selectedTeamName ? selectedTeamName.toLowerCase().replace(/\s+/g, "-") : "club-completo";
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
              Estado de pagos y cuotas por jugador {selectedTeamName && selectedTeamId !== "all" ? `· ${selectedTeamName}` : "· Todos los Equipos"}
            </p>
          </div>
        </div>

        {/* Botón de exportar a Excel / CSV */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={displayedPlayers.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-bold transition-colors cursor-pointer border border-slate-200"
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
          <p className="text-[10px] text-slate-400">En plantilla federada</p>
        </div>

        <div className="p-3.5 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-between text-emerald-600">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Al Día</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 hidden sm:block" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-600 mt-0.5">
            {summary.alDia}
          </p>
          <p className="text-[10px] text-slate-400">Sin cuotas pendientes</p>
        </div>

        <div className="p-3.5 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-between text-rose-600">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Con Pendientes</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500 hidden sm:block" />
          </div>
          <p className={`text-xl sm:text-2xl font-black mt-0.5 ${summary.conDeuda > 0 ? "text-rose-600" : "text-slate-900"}`}>
            {summary.conDeuda}
          </p>
          <p className="text-[10px] text-slate-400">Con pagos por regularizar</p>
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

      {/* 3. Filtros y Buscador */}
      <div className="p-3.5 sm:p-4 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por jugador, dorsal o equipo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-800"
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
      <div className="divide-y divide-slate-100 max-h-[560px] overflow-y-auto">
        {displayedPlayers.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
            <Users className="w-8 h-8 text-slate-300" />
            <p className="font-semibold text-slate-600">No se encontraron jugadores</p>
            <p className="text-[11px] text-slate-400">
              Prueba a cambiar el filtro o el término de búsqueda.
            </p>
          </div>
        ) : (
          displayedPlayers.map((player) => {
            const hasDebt = player.status === "con_deuda";
            const isAlDia = player.status === "al_dia";

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
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
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

                      {/* Estado sintético de cuotas */}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {isAlDia && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Al día ({player.paidFeesCount}/{player.totalFeesCount} cuotas pagadas)
                          </span>
                        )}

                        {hasDebt && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                            {player.pendingFeesCount} {player.pendingFeesCount === 1 ? "cuota pendiente" : "cuotas pendientes"}
                          </span>
                        )}

                        {player.status === "sin_cuotas" && (
                          <span className="text-[11px] font-semibold text-slate-400">
                            Sin cuotas asignadas en la temporada
                          </span>
                        )}
                      </div>
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

                {/* Desglose directo de cuotas pendientes con importe individual */}
                {hasDebt && player.pendingFees.length > 0 && (
                  <div className="mt-3 pl-0 sm:pl-12">
                    <div className="bg-white border border-rose-150 rounded-xl p-2.5 sm:p-3 shadow-2xs space-y-1.5">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        Detalle de cuotas pendientes de este jugador:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {player.pendingFees.map((fee) => (
                          <div
                            key={fee.id}
                            className="flex items-center justify-between gap-2 p-2 rounded-lg bg-rose-50/50 border border-rose-100 text-xs"
                          >
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 truncate">
                                {fee.concept}
                              </p>
                              {fee.creadoEn && (
                                <p className="text-[10px] text-slate-400">
                                  Emitida: {new Date(fee.creadoEn).toLocaleDateString("es-ES")}
                                </p>
                              )}
                            </div>
                            <span className="font-black text-rose-600 shrink-0">
                              {formatEuro(fee.pendingCents)}
                            </span>
                          </div>
                        ))}
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
