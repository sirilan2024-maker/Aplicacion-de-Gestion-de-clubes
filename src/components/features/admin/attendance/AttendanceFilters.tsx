"use client"

import React, { useState } from "react"
import { Search, Filter, Calendar as CalendarIcon, X, SlidersHorizontal } from "lucide-react"

export type PeriodType = "hoy" | "semana" | "mes" | "mes_anterior" | "temporada" | "personalizado"

interface AttendanceFiltersProps {
  teams: Array<{ id: string; name: string; category: string }>
  period: PeriodType
  setPeriod: (p: PeriodType) => void
  startDate: string
  setStartDate: (d: string) => void
  endDate: string
  setEndDate: (d: string) => void
  selectedTeam: string
  setSelectedTeam: (t: string) => void
  activityType: string
  setActivityType: (a: string) => void
  selectedStatus: string
  setSelectedStatus: (s: string) => void
  searchTerm: string
  setSearchTerm: (q: string) => void
  onReset: () => void
  activeFiltersCount: number
}

export function AttendanceFilters({
  teams,
  period,
  setPeriod,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  selectedTeam,
  setSelectedTeam,
  activityType,
  setActivityType,
  selectedStatus,
  setSelectedStatus,
  searchTerm,
  setSearchTerm,
  onReset,
  activeFiltersCount,
}: AttendanceFiltersProps) {
  const [mobileModalOpen, setMobileModalOpen] = useState(false)

  const quickPeriods: Array<{ id: PeriodType; label: string }> = [
    { id: "hoy", label: "Hoy" },
    { id: "semana", label: "Esta semana" },
    { id: "mes", label: "Este mes" },
    { id: "mes_anterior", label: "Mes anterior" },
    { id: "temporada", label: "Temporada" },
    { id: "personalizado", label: "Personalizado" },
  ]

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
      {/* Selector de Período Rápido */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
          <CalendarIcon className="w-4 h-4 text-blue-600" />
          <span>Período</span>
        </div>

        {/* Botones de período */}
        <div className="flex overflow-x-auto gap-1 sm:gap-1.5 p-1 bg-slate-100/80 rounded-xl scrollbar-none max-w-full">
          {quickPeriods.map((qp) => (
            <button
              key={qp.id}
              onClick={() => setPeriod(qp.id)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                period === qp.id
                  ? "bg-white text-blue-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {qp.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rango de Fechas Personalizado (si está activo) */}
      {period === "personalizado" && (
        <div className="flex items-center gap-3 flex-wrap p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
          <span className="text-xs font-bold text-blue-900">Desde:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <span className="text-xs font-bold text-blue-900">Hasta:</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      )}

      {/* Móvil: Botón compacto de Filtros */}
      <div className="flex sm:hidden items-center justify-between gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar jugador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => setMobileModalOpen(true)}
          className={`px-3 py-2 border rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 ${
            activeFiltersCount > 0
              ? "border-blue-500 text-blue-600 bg-blue-50"
              : "border-slate-200 text-slate-700 bg-white"
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Filtros</span>
          {activeFiltersCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-blue-600 text-[10px] font-black text-white">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* Modal / Sheet móvil de Filtros */}
      {mobileModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-end sm:hidden">
          <div className="w-full bg-white rounded-t-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-sm text-slate-900">Filtros de Asistencia</span>
              </div>
              <button
                onClick={() => setMobileModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Equipo móvil */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Equipo</label>
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="todos">Todos los equipos ({teams.length})</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.category ? `(${t.category})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Tipo de Actividad móvil */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Tipo de Actividad</label>
              <select
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="todos">Todas las actividades</option>
                <option value="Entrenamiento">Entrenamientos</option>
                <option value="Partido">Partidos</option>
              </select>
            </div>

            {/* Estado móvil */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Estado</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="todos">Todos los estados</option>
                <option value="presente">Presente</option>
                <option value="ausente">Ausente</option>
                <option value="justificado">Justificado</option>
                <option value="retraso">Retraso</option>
                <option value="lesionado">Lesionado</option>
              </select>
            </div>

            <div className="pt-3 flex gap-2">
              <button
                onClick={onReset}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Restablecer
              </button>
              <button
                onClick={() => setMobileModalOpen(false)}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-blue-700"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Escritorio: Barra completa de filtros */}
      <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Buscador de Jugador */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por jugador o evento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>

        {/* Selector de Equipo */}
        <div>
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          >
            <option value="todos">Todos los equipos ({teams.length})</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} {t.category ? `(${t.category})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Tipo de Actividad */}
        <div>
          <select
            value={activityType}
            onChange={(e) => setActivityType(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          >
            <option value="todos">Todas las actividades</option>
            <option value="Entrenamiento">Entrenamientos</option>
            <option value="Partido">Partidos</option>
          </select>
        </div>

        {/* Selector de Estado */}
        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          >
            <option value="todos">Todos los estados</option>
            <option value="presente">Presente</option>
            <option value="ausente">Ausente</option>
            <option value="justificado">Justificado</option>
            <option value="retraso">Retraso</option>
            <option value="lesionado">Lesionado</option>
          </select>
        </div>
      </div>

      {/* Resumen de Filtros Activos & Reset */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <span>Filtros activos: <b>{activeFiltersCount}</b></span>
          {selectedTeam !== "todos" && (
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-medium text-slate-700">
              {teams.find((t) => t.id === selectedTeam)?.name || "Equipo"}
            </span>
          )}
          {activityType !== "todos" && (
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-blue-50 text-[10px] font-medium text-blue-700">
              {activityType}
            </span>
          )}
          {selectedStatus !== "todos" && (
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-medium text-slate-700 capitalize">
              {selectedStatus}
            </span>
          )}
        </div>

        {activeFiltersCount > 0 && (
          <button
            onClick={onReset}
            className="text-blue-600 hover:text-blue-800 font-bold text-xs cursor-pointer inline-flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            <span>Limpiar filtros</span>
          </button>
        )}
      </div>
    </div>
  )
}
