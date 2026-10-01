"use client";

import React from "react";
import { Compass, RefreshCw, Share2, Filter, ChevronDown } from "lucide-react";
import { FfcvCategory } from "@/types/coordinator";

interface CoordinatorHeaderProps {
  userFirstName: string | null;
  seasonName: string;
  matchdayNumber?: number;
  selectedCategory: FfcvCategory;
  onSelectCategory: (category: FfcvCategory) => void;
  selectedTeamId: string;
  onSelectTeamId: (teamId: string) => void;
  teams: Array<{ id: string; name: string; category: string; color: string | null }>;
  isLoading: boolean;
  onRefresh: () => void;
  onShare: () => void;
}

const CATEGORIES: { id: FfcvCategory; label: string }[] = [
  { id: "todos", label: "Todos los equipos" },
  { id: "senior", label: "Senior" },
  { id: "juvenil", label: "Juvenil" },
  { id: "cadete", label: "Cadete" },
  { id: "infantil", label: "Infantil" },
];

export function CoordinatorHeader({
  userFirstName,
  seasonName,
  matchdayNumber,
  selectedCategory,
  onSelectCategory,
  selectedTeamId,
  onSelectTeamId,
  teams,
  isLoading,
  onRefresh,
  onShare,
}: CoordinatorHeaderProps) {
  const filteredTeams = selectedCategory === "todos"
    ? teams
    : teams.filter((t) => t.category.toLowerCase().includes(selectedCategory.toLowerCase()));

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

        {/* Fila Inferior: Filtros Rápidos de Categorías y Selector de Equipo */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
          {/* Píldoras de categoría */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-bold flex items-center gap-1 pr-1 shrink-0 text-[11px] uppercase tracking-wider">
              <Filter className="w-3 h-3" /> Categoría:
            </span>
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    onSelectCategory(cat.id);
                    onSelectTeamId("all");
                  }}
                  className={`px-2.5 py-1 rounded-full font-bold transition-all text-xs cursor-pointer ${
                    active
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Desplegable de Equipo Específico */}
          {filteredTeams.length > 0 && (
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
              <span className="text-xs text-slate-400 font-semibold shrink-0">Equipo:</span>
              <div className="relative flex-1 sm:flex-initial">
                <select
                  value={selectedTeamId}
                  onChange={(e) => onSelectTeamId(e.target.value)}
                  className="w-full sm:w-auto appearance-none bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg pl-3 pr-8 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
                >
                  <option value="all">
                    {selectedCategory === "todos" ? "Todos los equipos" : `Todos en ${selectedCategory}`}
                  </option>
                  {filteredTeams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name} ({team.category})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2 pointer-events-none" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
