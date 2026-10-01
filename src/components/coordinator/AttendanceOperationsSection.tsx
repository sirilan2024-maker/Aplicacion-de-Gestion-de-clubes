"use client";

import React, { useState } from "react";
import { Users, HeartPulse, CheckCircle2, AlertCircle, ArrowUpRight, Target } from "lucide-react";
import { AttendanceCategoryStats, ActiveInjuryItem } from "@/types/coordinator";
import { InjuryDetailsModal } from "./InjuryDetailsModal";

interface AttendanceOperationsSectionProps {
  globalWeeklyRate: number;
  categories: AttendanceCategoryStats[];
  injuries: ActiveInjuryItem[];
  currentPeriod: "semana" | "mes" | "temporada";
  onPeriodChange?: (period: "semana" | "mes" | "temporada") => void;
}

export function AttendanceOperationsSection({
  globalWeeklyRate,
  categories,
  injuries,
  currentPeriod = "semana",
  onPeriodChange,
}: AttendanceOperationsSectionProps) {
  const [selectedInjury, setSelectedInjury] = useState<ActiveInjuryItem | null>(null);
  const targetRate = 85; // Objetivo de asistencia del club

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-5">
      {/* Cabecera del Bloque */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              Asistencia a Entrenamientos y Control Operativo
            </h2>
            <p className="text-xs text-slate-500">
              Seguimiento por categorías vs objetivo del club ({targetRate}%) y parte médico activo
            </p>
          </div>
        </div>

        {/* Selector de Período */}
        {onPeriodChange && (
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Lado Izquierdo: Barras comparativas por categoría (7 columnas) */}
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

          {/* Barras de Asistencia por Categoría */}
          <div className="space-y-3">
            {categories.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4">No hay registros de asistencia en el período seleccionado.</p>
            ) : (
              categories.map((cat) => {
                const isAboveTarget = cat.attendanceRate >= targetRate;
                const isCritical = cat.attendanceRate < 75;

                return (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-700">{cat.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400 font-medium">
                          {cat.teamsCount} equipo{cat.teamsCount !== 1 ? "s" : ""}
                        </span>
                        <span
                          className={`text-xs ${
                            isAboveTarget
                              ? "text-emerald-600"
                              : isCritical
                              ? "text-red-500"
                              : "text-amber-600"
                          }`}
                        >
                          {cat.attendanceRate}%
                        </span>
                      </div>
                    </div>

                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden relative">
                      {/* Línea de objetivo al 85% */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-indigo-400 z-10 opacity-70"
                        style={{ left: `${targetRate}%` }}
                        title={`Objetivo: ${targetRate}%`}
                      />
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isAboveTarget
                            ? "bg-emerald-500"
                            : isCritical
                            ? "bg-red-500"
                            : "bg-amber-400"
                        }`}
                        style={{ width: `${Math.min(cat.attendanceRate, 100)}%` }}
                      />
                    </div>
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
    </div>
  );
}
