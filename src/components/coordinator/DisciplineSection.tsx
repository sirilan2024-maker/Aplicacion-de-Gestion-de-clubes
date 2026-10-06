"use client";

import React, { useState, useMemo } from "react";
import { AlertTriangle, ShieldAlert, CheckCircle2, Search, Bell, AlertCircle, Shield, ChevronDown, ChevronUp, Clock, Flame } from "lucide-react";
import { PlayerDisciplineRecord, DisciplineStatus, RecentMatchCardItem } from "@/types/coordinator";
import { sendDisciplineAlertAction } from "@/app/actions/chat-actions";

interface DisciplineSectionProps {
  records: PlayerDisciplineRecord[];
  recentCards?: RecentMatchCardItem[];
  onPlayerClick?: (playerId: string) => void;
}

export function DisciplineSection({ records, recentCards = [], onPlayerClick }: DisciplineSectionProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | DisciplineStatus>("ALL");
  const [alertingId, setAlertingId] = useState<string | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);

  const suspendedCount = useMemo(
    () => records.filter((r) => r.status === "Sancionado").length,
    [records]
  );

  const apercibidosCount = useMemo(
    () => records.filter((r) => r.status === "Apercibido").length,
    [records]
  );

  const totalYellows = useMemo(
    () => records.reduce((acc, r) => acc + r.yellowCardsTotal, 0),
    [records]
  );

  const totalReds = useMemo(
    () => records.reduce((acc, r) => acc + r.directRedsCount + r.doubleYellowsCount, 0),
    [records]
  );

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchSearch =
        r.playerName.toLowerCase().includes(search.toLowerCase()) ||
        r.teamName.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "ALL" || r.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [records, search, statusFilter]);

  const handleNotifyCoach = async (e: React.MouseEvent, record: PlayerDisciplineRecord) => {
    e.stopPropagation();
    setAlertingId(record.playerId);
    try {
      const res = await sendDisciplineAlertAction(
        record.playerId,
        record.teamId,
        record.playerName,
        record.teamName
      );
      if (res.success) {
        alert(`Aviso enviado con éxito al cuerpo técnico de ${record.teamName}.`);
      } else {
        alert("Error al enviar el aviso: " + res.error);
      }
    } catch {
      alert("Error al procesar el aviso disciplinario.");
    } finally {
      setAlertingId(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
      {/* Cabecera, Contadores y Desplegable para esconder el informe */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              Control Disciplinario y Tarjetas FFCV
            </h2>
            <p className="text-xs text-slate-500">
              Ciclo oficial de 5 amarillas · Doble amarilla no suma a ciclo y sanciona 1 jornada
            </p>
          </div>
        </div>

        {/* Badges de Contadores y Toggle para esconder el informe */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 self-start sm:self-auto w-full sm:w-auto">
          <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-red-50 border border-red-200/70 text-red-700 text-xs font-bold">
            <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
            <span>{suspendedCount} Sancionados</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200/70 text-amber-700 text-xs font-bold">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>{apercibidosCount} Apercibidos (4🟨)</span>
          </div>
          <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-xs font-semibold">
            <span>🟨 {totalYellows}</span>
            <span className="text-slate-300">|</span>
            <span>🟥 {totalReds}</span>
          </div>

          {/* Desplegable para esconder o mostrar el informe */}
          <button
            onClick={() => setIsReportOpen(!isReportOpen)}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
            title={isReportOpen ? "Esconder informe disciplinario" : "Mostrar informe disciplinario"}
          >
            {isReportOpen ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Esconder informe</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Mostrar informe</span>
              </>
            )}
          </button>
        </div>
      </div>

      {isReportOpen && (
        <>
          {/* Resumen de Últimas Tarjetas de la Jornada */}
          {recentCards.length > 0 && (
            <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/70 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                  <Flame className="w-4 h-4 text-amber-500" />
                  <span>Últimas Tarjetas de la Jornada</span>
                </div>
                <span className="text-[10px] text-slate-400 font-semibold">Actas oficiales FFCV</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {recentCards.slice(0, 6).map((card) => (
                  <div
                    key={card.id}
                    className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {card.playerName} {card.playerDorsal ? `(#${card.playerDorsal})` : ""}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {card.teamName} {card.rivalName ? `vs ${card.rivalName}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {card.yellowCards > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                          {card.yellowCards} 🟨
                        </span>
                      )}
                      {card.redCards > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-red-100 text-red-800 border border-red-300">
                          {card.redCards} 🟥
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Barra de Filtros y Búsqueda */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar jugador o equipo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto w-full sm:w-auto">
              {(["ALL", "Sancionado", "Apercibido", "OK"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    statusFilter === status
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {status === "ALL" ? "Todos" : status}
                </button>
              ))}
            </div>
          </div>

      {/* Tabla Rápida de Disciplina */}
      {filteredRecords.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-xs font-medium bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
          No hay jugadores en seguimiento disciplinario con los filtros seleccionados.
        </div>
      ) : (
        <>
          {/* Vista Escritorio (Tabla completa md+) */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200/80">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Jugador</th>
                  <th className="py-2.5 px-3">Equipo</th>
                  <th className="py-2.5 px-3 text-center">Tarjetas (🟨 / 🟥)</th>
                  <th className="py-2.5 px-3 text-center">Ciclo FFCV</th>
                  <th className="py-2.5 px-3">Estado</th>
                  <th className="py-2.5 px-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredRecords.map((r) => {
                  const isSuspended = r.status === "Sancionado";
                  const isApercibido = r.status === "Apercibido";

                  return (
                    <tr
                      key={r.playerId}
                      onClick={() => onPlayerClick?.(r.playerId)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          {r.playerDorsal && (
                            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-extrabold flex items-center justify-center shrink-0">
                              {r.playerDorsal}
                            </span>
                          )}
                          <span className="group-hover:text-indigo-600 transition-colors">
                            {r.playerName}
                          </span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: r.teamColor || "#6366f1" }}
                          />
                          <span className="font-semibold text-slate-800">{r.teamName}</span>
                          <span className="text-[10px] text-slate-400">({r.teamCategory})</span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-center font-bold">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[11px]">
                          🟨 {r.yellowCardsTotal}
                        </span>
                        {(r.directRedsCount > 0 || r.doubleYellowsCount > 0) && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-50 text-red-700 text-[11px] ml-1">
                            🟥 {r.directRedsCount + r.doubleYellowsCount}
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {[1, 2, 3, 4, 5].map((step) => {
                            const filled = r.currentCycleAccumulated >= step;
                            return (
                              <span
                                key={step}
                                className={`w-2 h-2 rounded-full ${
                                  filled
                                    ? step === 5
                                      ? "bg-red-500"
                                      : "bg-amber-400"
                                    : "bg-slate-200"
                                }`}
                                title={`Amarilla ${step} del ciclo`}
                              />
                            );
                          })}
                          <span className="text-[10px] text-slate-400 ml-1">
                            ({r.currentCycleAccumulated}/5)
                          </span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        {isSuspended ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-700 border border-red-200">
                            <ShieldAlert className="w-3 h-3 text-red-600" />
                            Sancionado
                          </span>
                        ) : isApercibido ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            Apercibido
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            OK
                          </span>
                        )}
                        <p className="text-[10px] text-slate-400 mt-0.5 max-w-[200px] truncate" title={r.statusReason}>
                          {r.statusReason}
                        </p>
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        {(isSuspended || isApercibido) && (
                          <button
                            onClick={(e) => handleNotifyCoach(e, r)}
                            disabled={alertingId === r.playerId}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            title="Enviar aviso preventivo al entrenador del equipo"
                          >
                            <Bell className={`w-3 h-3 ${alertingId === r.playerId ? "animate-spin" : ""}`} />
                            <span>{alertingId === r.playerId ? "Enviando..." : "Avisar"}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Vista Móvil Touch SIN SCROLL HORIZONTAL (Tarjetas individuales en bloque) */}
          <div className="block md:hidden space-y-2.5">
            {filteredRecords.map((r) => {
              const isSuspended = r.status === "Sancionado";
              const isApercibido = r.status === "Apercibido";

              return (
                <div
                  key={r.playerId}
                  onClick={() => onPlayerClick?.(r.playerId)}
                  className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-2.5 active:bg-slate-50 transition-colors"
                >
                  {/* Fila 1: Jugador, Dorsal y Estado */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {r.playerDorsal && (
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black flex items-center justify-center shrink-0">
                            {r.playerDorsal}
                          </span>
                        )}
                        <p className="text-xs font-black text-slate-900 truncate">
                          {r.playerName}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: r.teamColor || "#6366f1" }}
                        />
                        <span className="font-semibold">{r.teamName}</span>
                        <span className="text-[10px] text-slate-400">· {r.teamCategory}</span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isSuspended ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-700 border border-red-200">
                          <ShieldAlert className="w-3 h-3 text-red-600" />
                          Sancionado
                        </span>
                      ) : isApercibido ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          Apercibido
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          OK
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Fila 2: Tarjetas y Ciclo de 5 */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-amber-700">🟨 {r.yellowCardsTotal}</span>
                      {(r.directRedsCount > 0 || r.doubleYellowsCount > 0) && (
                        <span className="font-bold text-red-700">
                          🟥 {r.directRedsCount + r.doubleYellowsCount}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400 font-semibold mr-1">Ciclo:</span>
                      {[1, 2, 3, 4, 5].map((step) => {
                        const filled = r.currentCycleAccumulated >= step;
                        return (
                          <span
                            key={step}
                            className={`w-2 h-2 rounded-full ${
                              filled
                                ? step === 5
                                  ? "bg-red-500"
                                  : "bg-amber-400"
                                : "bg-slate-200"
                            }`}
                          />
                        );
                      })}
                      <span className="text-[10px] font-bold text-slate-500 ml-0.5">
                        {r.currentCycleAccumulated}/5
                      </span>
                    </div>
                  </div>

                  {/* Fila 3: Razón y Botón de Acción */}
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <p className="text-[10px] text-slate-500 leading-tight truncate flex-1" title={r.statusReason}>
                      {r.statusReason}
                    </p>

                    {(isSuspended || isApercibido) && (
                      <button
                        onClick={(e) => handleNotifyCoach(e, r)}
                        disabled={alertingId === r.playerId}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg shrink-0 disabled:opacity-50"
                      >
                        <Bell className={`w-3 h-3 ${alertingId === r.playerId ? "animate-spin" : ""}`} />
                        <span>{alertingId === r.playerId ? "..." : "Avisar"}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  )}
</div>
);
}
