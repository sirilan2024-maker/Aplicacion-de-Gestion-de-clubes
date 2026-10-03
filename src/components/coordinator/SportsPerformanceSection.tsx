"use client";

import React from "react";
import Link from "next/link";
import { Trophy, ArrowRight, Shield, Activity, Target, BarChart3 } from "lucide-react";
import { SportsWeekendSummary } from "@/types/coordinator";

interface SportsPerformanceSectionProps {
  weekend: SportsWeekendSummary;
  teamStandings: Array<{
    teamId: string;
    teamName: string;
    category: string;
    competitionName?: string;
    position: number;
    played: number;
    points: number;
    goalsFor: number;
    goalsAgainst: number;
    statusBadge?: string;
  }>;
}

export function SportsPerformanceSection({ weekend, teamStandings }: SportsPerformanceSectionProps) {
  const goalDiff = weekend.goalsFor - weekend.goalsAgainst;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              Situación Deportiva y Resultados
            </h2>
            <p className="text-xs text-slate-500">
              Balance competitivo global y mini-clasificaciones federativas del club
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/matches?view=clasificacion"
          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 self-start sm:self-auto hover:underline"
        >
          <span>Ver Clasificaciones Completas</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Tarjetas de Resumen Competitivo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Balance V - E - D */}
        <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/60 flex flex-col justify-between">
          <p className="text-[11px] font-bold uppercase text-slate-400">Balance Fin de Semana</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-xl font-black text-emerald-600">{weekend.wins}V</span>
            <span className="text-lg font-bold text-slate-400">-</span>
            <span className="text-xl font-black text-slate-600">{weekend.draws}E</span>
            <span className="text-lg font-bold text-slate-400">-</span>
            <span className="text-xl font-black text-red-500">{weekend.losses}D</span>
          </div>
          <p className="text-[10px] text-slate-500 font-medium mt-1">
            {weekend.playedMatches} partidos disputados
          </p>
        </div>

        {/* Efectividad / Ratio de Victorias */}
        <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/60 flex flex-col justify-between">
          <p className="text-[11px] font-bold uppercase text-slate-400">% Victorias</p>
          <p className="text-2xl font-black text-slate-900 mt-2">{weekend.winRate}%</p>
          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1">
            <div
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: `${weekend.winRate}%` }}
            />
          </div>
        </div>

        {/* Goles a Favor */}
        <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/60 flex flex-col justify-between">
          <p className="text-[11px] font-bold uppercase text-slate-400">Goles a Favor</p>
          <p className="text-2xl font-black text-emerald-600 mt-2">+{weekend.goalsFor}</p>
          <p className="text-[10px] text-slate-500 font-medium mt-1">Producción ofensiva</p>
        </div>

        {/* Goles en Contra y Diferencial */}
        <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/60 flex flex-col justify-between">
          <p className="text-[11px] font-bold uppercase text-slate-400">Goles en Contra</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-slate-800">{weekend.goalsAgainst}</span>
            <span className={`text-xs font-bold ${goalDiff >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              ({goalDiff >= 0 ? `+${goalDiff}` : goalDiff})
            </span>
          </div>
          <p className="text-[10px] text-slate-500 font-medium mt-1">Diferencial de goles</p>
        </div>
      </div>

      {/* Mini-Clasificaciones de Equipos */}
      {teamStandings && teamStandings.length > 0 && (
        <div className="space-y-2 pt-1">
          <p className="text-xs font-black uppercase text-slate-400 tracking-wider">
            Posición de Equipos en Competición FFCV
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {teamStandings.map((st) => {
              const isTop = st.position <= 3;
              const isDanger = st.position >= 12;

              return (
                <Link
                  key={st.teamId}
                  href={`/dashboard/equipos/${st.teamId}/partidos?view=clasificacion`}
                  className="p-3 rounded-xl border border-slate-200/70 hover:border-indigo-300 hover:shadow-xs transition-all bg-white flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                      isTop
                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                        : isDanger
                        ? "bg-red-100 text-red-800"
                        : "bg-slate-100 text-slate-700"
                    }`}>
                      {st.position}º
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                        {st.teamName}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {st.category}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-right shrink-0">
                    <div>
                      <p className="text-xs font-black text-slate-900">{st.points} pts</p>
                      <p className="text-[10px] text-slate-400">{st.played} PJ</p>
                    </div>
                    <Link
                      href={`/dashboard/equipos/${st.teamId}/analisis`}
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors"
                      title="Ver análisis de rendimiento"
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                    </Link>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
