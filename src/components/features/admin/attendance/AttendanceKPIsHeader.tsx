"use client"

import React from "react"
import { CheckCircle2, XCircle, AlertCircle, Clock, HelpCircle, Users, TrendingUp } from "lucide-react"

interface AttendanceKPIsHeaderProps {
  kpis: {
    totalRecords: number
    uniquePlayers: number
    totalTeams: number
    presentes: number
    ausentes: number
    justificados: number
    lesionados: number
    retrasos: number
    attendanceRate: number
  }
}

export function AttendanceKPIsHeader({ kpis }: AttendanceKPIsHeaderProps) {
  return (
    <div className="w-full">
      {/* Móvil: Carrusel horizontal táctil snap (máximo 2 tarjetas visibles simultáneamente) */}
      <div className="flex sm:hidden overflow-x-auto gap-2.5 pb-2 snap-x snap-mandatory scrollbar-none -mx-1 px-1">
        {/* Ratio Asistencia */}
        <div className="min-w-[155px] max-w-[190px] flex-1 snap-start bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-3.5 text-white shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-100 text-[10px] font-bold uppercase tracking-wider">
            <span>Ratio Global</span>
            <TrendingUp className="w-3.5 h-3.5 text-blue-200" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black">
              {kpis.totalRecords > 0 ? `${kpis.attendanceRate}%` : "Sin datos"}
            </span>
            {kpis.totalRecords > 0 && <span className="text-[10px] text-blue-200">promedio</span>}
          </div>
          <div className="mt-2 w-full bg-blue-900/40 rounded-full h-1.5 overflow-hidden">
            <div className="bg-emerald-400 h-full rounded-full transition-all duration-500" style={{ width: `${kpis.totalRecords > 0 ? Math.min(kpis.attendanceRate, 100) : 0}%` }} />
          </div>
        </div>

        {/* Presentes */}
        <div className="min-w-[140px] snap-start bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-600 text-[10px] font-bold uppercase tracking-wider">
            <span>Presentes</span>
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{kpis.presentes}</div>
          <div className="text-[10px] text-slate-400">sesiones</div>
        </div>

        {/* Ausentes */}
        <div className="min-w-[140px] snap-start bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-600 text-[10px] font-bold uppercase tracking-wider">
            <span>Ausentes</span>
            <XCircle className="w-3.5 h-3.5" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{kpis.ausentes}</div>
          <div className="text-[10px] text-slate-400">sin justificar</div>
        </div>

        {/* Justificados */}
        <div className="min-w-[140px] snap-start bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-600 text-[10px] font-bold uppercase tracking-wider">
            <span>Justificados</span>
            <AlertCircle className="w-3.5 h-3.5" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{kpis.justificados}</div>
          <div className="text-[10px] text-slate-400">con aviso</div>
        </div>

        {/* Retrasos */}
        <div className="min-w-[140px] snap-start bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-sky-600 text-[10px] font-bold uppercase tracking-wider">
            <span>Retrasos</span>
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{kpis.retrasos}</div>
          <div className="text-[10px] text-slate-400">parciales</div>
        </div>

        {/* Lesionados */}
        <div className="min-w-[140px] snap-start bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-purple-600 text-[10px] font-bold uppercase tracking-wider">
            <span>Lesionados</span>
            <HelpCircle className="w-3.5 h-3.5" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{kpis.lesionados}</div>
          <div className="text-[10px] text-slate-400">bajas</div>
        </div>

        {/* Evaluados */}
        <div className="min-w-[140px] snap-start bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-wider">
            <span>Evaluados</span>
            <Users className="w-3.5 h-3.5" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{kpis.uniquePlayers}</div>
          <div className="text-[10px] text-slate-400">en {kpis.totalTeams} equipos</div>
        </div>
      </div>

      {/* Escritorio: Grid limpio de 7 tarjetas */}
      <div className="hidden sm:grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3.5">
        {/* Ratio Asistencia */}
        <div className="col-span-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-4 sm:p-5 text-white shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-100 text-xs font-bold uppercase tracking-wider">
            <span>Ratio Asistencia Global</span>
            <TrendingUp className="w-4 h-4 text-blue-200" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black tracking-tight">
              {kpis.totalRecords > 0 ? `${kpis.attendanceRate}%` : "Sin datos"}
            </span>
            {kpis.totalRecords > 0 && <span className="text-xs text-blue-100">asistencia promedio</span>}
          </div>
          <div className="mt-2.5 w-full bg-blue-900/40 rounded-full h-2 overflow-hidden">
            <div className="bg-emerald-400 h-full rounded-full transition-all duration-500" style={{ width: `${kpis.totalRecords > 0 ? Math.min(kpis.attendanceRate, 100) : 0}%` }} />
          </div>
        </div>

        {/* Presentes */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Presentes</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900">{kpis.presentes}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">sesiones</div>
        </div>

        {/* Ausentes */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-600 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Ausentes</span>
            <XCircle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900">{kpis.ausentes}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">sin justificar</div>
        </div>

        {/* Justificados */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-600 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Justificados</span>
            <AlertCircle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900">{kpis.justificados}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">con aviso previo</div>
        </div>

        {/* Retrasos */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-sky-600 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Retrasos</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900">{kpis.retrasos}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">a tiempo parcial</div>
        </div>

        {/* Lesionados */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-purple-600 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Lesionados</span>
            <HelpCircle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900">{kpis.lesionados}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">{kpis.uniquePlayers} jug. / {kpis.totalTeams} eq.</div>
        </div>
      </div>
    </div>
  )
}
