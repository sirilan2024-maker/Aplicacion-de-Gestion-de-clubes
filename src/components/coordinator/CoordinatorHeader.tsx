"use client";

import React from "react";
import { Compass, RefreshCw, Share2, Filter, ChevronDown } from "lucide-react";
import { FfcvCategory } from "@/types/coordinator";

interface CoordinatorHeaderProps {
  userFirstName: string | null;
  seasonName: string;
  matchdayNumber?: number;
  selectedCategory?: FfcvCategory;
  onSelectCategory?: (category: FfcvCategory) => void;
  selectedTeamId: string;
  onSelectTeamId: (teamId: string) => void;
  teams: Array<{ id: string; name: string; category: string; color: string | null }>;
  isLoading: boolean;
  onRefresh: () => void;
  onShare: () => void;
}

export function CoordinatorHeader({
  userFirstName,
  seasonName,
  matchdayNumber,
  selectedTeamId,
  onSelectTeamId,
  teams,
  isLoading,
  onRefresh,
  onShare,
}: CoordinatorHeaderProps) {

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 13) return "Buenos días";
    if (h < 20) return "Buenas tardes";
    return "Buenas noches";
  };

  return (
    <div className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-4">
        {/* Fila Superior: Título, Temporada y Acciones Principales */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center shadow-sm shrink-0">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  {greeting()}{userFirstName ? `, ${userFirstName}` : ""}
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                  {seasonName}
                </span>
                {matchdayNumber && (
                  <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    Jornada {matchdayNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Panel de Coordinación Deportiva · Supervisión de disciplina, asistencia, rendimiento y agenda
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={onShare}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Cartelera Jornada</span>
            </button>

            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-indigo-600" : ""}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
          </div>
        </div>

        {/* Fila Inferior: Selector Único Desplegable de Equipos */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 shrink-0">
              <Filter className="w-3.5 h-3.5 text-indigo-600" />
              <span>Vista del Panel:</span>
            </span>
            <div className="relative flex-1 sm:w-80">
              <select
                value={selectedTeamId}
                onChange={(e) => onSelectTeamId(e.target.value)}
                className="w-full appearance-none bg-slate-50 border border-slate-300 hover:border-indigo-400 text-slate-800 text-xs font-bold rounded-xl pl-3.5 pr-9 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer shadow-2xs transition-colors"
              >
                <option value="all">
                  🌐 Todos los equipos (Resumen General)
                </option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    ⚽ {team.name} ({team.category})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>

            {selectedTeamId !== "all" && (
              <button
                onClick={() => onSelectTeamId("all")}
                className="px-2.5 py-1.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer shrink-0"
                title="Volver a la visión global de todos los equipos"
              >
                Ver todos
              </button>
            )}
          </div>

          <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5 self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            <span>
              {selectedTeamId === "all"
                ? `Supervisión activa de ${teams.length} equipos`
                : `Subpanel específico: ${teams.find((t) => t.id === selectedTeamId)?.name || "Equipo"}`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
