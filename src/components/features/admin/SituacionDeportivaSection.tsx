"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Trophy, ChevronRight, Users, ArrowRight, Shield, TrendingUp,
  ClipboardCheck, Clock, Activity, Table as TableIcon, LayoutGrid,
  ExternalLink, Calendar, HeartPulse, CheckCircle2, X
} from "lucide-react";

export interface SituacionDeportivaProps {
  sports: {
    totalPlayedMatches: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    globalWinRate: number;
    points: number;
    possiblePoints: number;
    pointsPercentage: number;
    attendanceRate: number;
    topScorer?: {
      playerId: string;
      playerName: string;
      goals: number;
      teamName: string;
    } | null;
    topMinutes?: {
      playerId: string;
      playerName: string;
      minutesPlayed: number;
      teamName: string;
    } | null;
    teamStats?: Array<{
      teamId: string;
      teamName: string;
      teamCategory: string;
      competitionName?: string;
      groupName?: string;
      currentPosition?: number;
      totalTeamsInGroup?: number;
      matchesPlayed: number;
      wins: number;
      draws: number;
      losses: number;
      goalsFor: number;
      goalsAgainst: number;
      goalDiff: number;
      points: number;
      winRate: number;
    }>;
  };
  kpis: {
    activePlayers: number;
    activeTeams: number;
  };
  injuries: {
    activeInjuriesCount: number;
    activeInjuriesList?: Array<{
      id: string;
      playerId: string;
      playerName: string;
      teamId?: string | null;
      teamName?: string;
      injuryType: string;
      injuryDate?: string;
      status: string;
      severity?: string;
      bodyRegion?: string;
      bodyStructure?: string;
      laterality?: string;
      rtsPhase?: string;
      daysInjured?: number;
      formattedRecoveryTime?: string;
    }>;
  };
}

export function SituacionDeportivaSection({ sports, kpis, injuries }: SituacionDeportivaProps) {
  const router = useRouter();
  const [teamViewMode, setTeamViewMode] = useState<"table" | "cards">("table");
  const [showInjuriesModal, setShowInjuriesModal] = useState(false);
  const [selectedTeamDetail, setSelectedTeamDetail] = useState<any | null>(null);

  const teamStats = sports?.teamStats || [];
  const ffcvCount = teamStats.filter(
    (t) => t.competitionName && t.competitionName !== "No federado" && t.competitionName !== "Liga Brave"
  ).length;
  const braveCount = teamStats.filter(
    (t) => t.competitionName === "Liga Brave" || t.teamCategory === "Liga Brave"
  ).length;

  const renderTeamCard = (team: any) => {
    return (
      <div
        key={team.teamId}
        className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 shadow-2xs hover:shadow-xs transition-all space-y-3.5"
      >
        {/* Cabecera del Equipo */}
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-black text-slate-900 text-base">{team.teamName}</h4>
            <p className="text-xs text-slate-500 font-medium">
              {team.competitionName || "Competición oficial FFCV"}
              {team.groupName ? ` · ${team.groupName}` : ""}
            </p>
          </div>
          {team.currentPosition && (
            <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-black text-xs border border-indigo-200">
              {team.currentPosition}º
            </span>
          )}
        </div>

        {/* Posición en Liga y Puntos Conseguidos */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 text-center">
            <span className="text-[10px] font-extrabold uppercase text-indigo-700 tracking-wider block">
              Posición en Liga
            </span>
            <p className="text-2xl font-black text-indigo-950 mt-0.5">
              {team.currentPosition ? `${team.currentPosition}º` : "—"}
            </p>
            <p className="text-[10px] text-indigo-600 font-medium mt-0.5">
              {team.totalTeamsInGroup ? `de ${team.totalTeamsInGroup} equipos` : "Clasificación oficial"}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block">
              Puntos Conseguidos
            </span>
            <p className="text-2xl font-black text-slate-900 mt-0.5">
              {team.points} <span className="text-xs font-semibold text-slate-400">pts</span>
            </p>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">
              {typeof team.winRate === "number" ? team.winRate.toFixed(1) : "0.0"}% victorias
            </p>
          </div>
        </div>

        {/* Balance de Competición */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
            Balance de Competición
          </span>
          <div className="grid grid-cols-4 gap-1.5 text-center">
            <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-400 block font-semibold">Jugados</span>
              <span className="text-sm font-black text-slate-900">{team.matchesPlayed}</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-emerald-200 shadow-2xs">
              <span className="text-[10px] text-emerald-600 block font-semibold">Ganados</span>
              <span className="text-sm font-black text-emerald-700">{team.wins}</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-500 block font-semibold">Empatados</span>
              <span className="text-sm font-black text-slate-700">{team.draws}</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-rose-200 shadow-2xs">
              <span className="text-[10px] text-rose-600 block font-semibold">Perdidos</span>
              <span className="text-sm font-black text-rose-700">{team.losses}</span>
            </div>
          </div>
        </div>

        {/* Registro de Goles */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
            Registro de Goles
          </span>
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="bg-white p-2 rounded-lg border border-blue-200 shadow-2xs">
              <span className="text-[10px] text-blue-600 block font-semibold">Goles Favor</span>
              <span className="text-sm font-black text-blue-700">+{team.goalsFor}</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-rose-200 shadow-2xs">
              <span className="text-[10px] text-rose-500 block font-semibold">Goles Contra</span>
              <span className="text-sm font-black text-rose-700">-{team.goalsAgainst}</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-500 block font-semibold">Diferencia</span>
              <span className={`text-sm font-black ${team.goalDiff >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {team.goalDiff > 0 ? `+${team.goalDiff}` : team.goalDiff}
              </span>
            </div>
          </div>
        </div>

        {/* Botones de Navegación Rápida */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Link
            href={`/dashboard/equipos/${team.teamId}/plantilla`}
            className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors text-center shadow-2xs active:scale-95"
          >
            <Users className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <span>Ver Plantilla</span>
          </Link>
          <Link
            href={`/dashboard/equipos/${team.teamId}/partidos`}
            className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors text-center shadow-xs active:scale-95"
          >
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>Ver Partidos y Acta</span>
          </Link>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-4 sm:p-6 shadow-sm space-y-5">
      {/* ── Cabecera de Situación Deportiva ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-900 text-base sm:text-lg">Situación Deportiva</h2>
            <p className="text-xs text-slate-500">Datos consolidados de competición oficial y rendimiento del club</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/club/estadisticas"
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 transition-colors"
          >
            <span>Ver estadísticas completas</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ── 4 KPIs Principales ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Jugadores */}
        <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Jugadores</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">{kpis.activePlayers}</span>
            <span className="text-xs font-medium text-slate-400">federados</span>
          </div>
          <Link
            href="/dashboard/club/miembros"
            className="text-[11px] font-bold text-blue-600 hover:text-blue-800 mt-2 inline-flex items-center gap-1"
          >
            <span>Ver directorio</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Equipos */}
        <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Equipos</span>
            <Shield className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">{kpis.activeTeams}</span>
            <span className="text-xs font-medium text-slate-400">en competición</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5 font-medium truncate">
            {ffcvCount} FFCV Oficiales · {braveCount} Liga Brave
          </p>
          <Link
            href="/dashboard/equipos"
            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 mt-2 inline-flex items-center gap-1"
          >
            <span>Ver equipos</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Efectividad Global */}
        <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Efectividad</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">
              {typeof sports?.globalWinRate === "number" ? sports.globalWinRate.toFixed(1) : "0.0"}%
            </span>
            <span className="text-xs font-bold text-emerald-600">victorias</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 truncate">
            {sports?.wins ?? 0}V · {sports?.draws ?? 0}E · {sports?.losses ?? 0}D ({sports?.totalPlayedMatches ?? 0} oficiales)
          </div>
          <div className="text-[10px] text-indigo-600 font-bold mt-0.5">
            {sports?.points ?? 0} pts · {typeof sports?.pointsPercentage === "number" ? sports.pointsPercentage.toFixed(1) : "0.0"}% puntos
          </div>
        </div>

        {/* Asistencia */}
        <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Asistencia</span>
            <ClipboardCheck className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">{sports?.attendanceRate ?? 100}%</span>
            <span className="text-xs font-bold text-amber-600">presencia</span>
          </div>
          <Link
            href="/admin/asistencia"
            className="text-[11px] font-bold text-amber-600 hover:text-amber-800 mt-2 inline-flex items-center gap-1"
          >
            <span>Control asistencia</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* ── Micro-panel de Referentes y Enfermería ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
        {/* Máximo Goleador */}
        <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Máximo Goleador</span>
            <p className="text-xs font-black text-slate-900 truncate mt-0.5">
              {sports?.topScorer ? sports.topScorer.playerName : "Sin registros"}
            </p>
            <p className="text-[11px] text-emerald-600 font-bold">
              {sports?.topScorer ? `${sports.topScorer.goals} goles · ${sports.topScorer.teamName}` : "-"}
            </p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <Trophy className="w-4 h-4" />
          </div>
        </div>

        {/* Más Minutos */}
        <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Más Minutos Disputados</span>
            <p className="text-xs font-black text-slate-900 truncate mt-0.5">
              {sports?.topMinutes ? sports.topMinutes.playerName : "Sin registros"}
            </p>
            <p className="text-[11px] text-blue-600 font-bold">
              {sports?.topMinutes ? `${sports.topMinutes.minutesPlayed} min · ${sports.topMinutes.teamName}` : "-"}
            </p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        {/* Estado de Enfermería */}
        <button
          type="button"
          onClick={() => setShowInjuriesModal(true)}
          className="p-3 bg-slate-50/70 hover:bg-rose-50/40 border border-slate-100 hover:border-rose-200 rounded-xl flex items-center justify-between gap-3 text-left transition-all group cursor-pointer active:scale-[0.99]"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estado de Enfermería</span>
              <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-100 opacity-0 group-hover:opacity-100 transition-opacity">
                Ver bajas →
              </span>
            </div>
            <p className="text-xs font-black text-slate-900 truncate mt-0.5 group-hover:text-rose-700 transition-colors">
              {(injuries?.activeInjuriesCount ?? 0) === 0 ? "Sin bajas activas" : `${injuries.activeInjuriesCount} en recuperación`}
            </p>
            <p className="text-[11px] text-slate-500">
              {(injuries?.activeInjuriesCount ?? 0) === 0 ? "Plantilla médica disponible al 100%" : "Seguimiento médico en curso · Clic para ver"}
            </p>
          </div>
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
              (injuries?.activeInjuriesCount ?? 0) === 0
                ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                : "bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white border border-rose-100"
            }`}
          >
            <Activity className="w-4 h-4" />
          </div>
        </button>
      </div>

      {/* ── Sub-bloque: Situación por Equipos / Cuadrante Global ── */}
      {teamStats.length > 0 && (
        <div className="pt-4 border-t border-slate-100 space-y-3.5">
          {/* Cabecera */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase flex items-center gap-2">
                <span>Situación por Equipos</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Cuadrante Global Oficial
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Resumen consolidado y clasificación en competición oficial FFCV
              </p>
            </div>

            {/* Controles de vista */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
                {teamStats.length} Equipos ({ffcvCount} FFCV · {braveCount} Liga Brave)
              </span>

              <div className="hidden sm:flex bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200">
                <button
                  type="button"
                  onClick={() => setTeamViewMode("table")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    teamViewMode === "table" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                  title="Ver Cuadrante Global en Tabla"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>Tabla Global</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTeamViewMode("cards")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    teamViewMode === "cards" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                  title="Ver Tarjetas de Equipos"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Tarjetas</span>
                </button>
              </div>
            </div>
          </div>

          {/* 1. Vista Móvil (tarjetas detalladas individuales para cada equipo) */}
          <div className="block sm:hidden space-y-3.5">
            {teamStats.map((team) => renderTeamCard(team))}
          </div>

          {/* 2. Vista Desktop (Tabla Global o Tarjetas según selección) */}
          <div className="hidden sm:block">
            {teamViewMode === "table" ? (
              <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 text-[10px] lg:text-[11px] font-bold uppercase tracking-wider">
                      <th className="py-3 px-3 text-left">Equipo</th>
                      <th className="py-3 px-2 text-left">Competición / Grupo</th>
                      <th className="py-3 px-1.5 text-center">Pos.</th>
                      <th className="py-3 px-1.5 text-center">PJ</th>
                      <th className="py-3 px-1.5 text-center text-emerald-800">V</th>
                      <th className="py-3 px-1.5 text-center">E</th>
                      <th className="py-3 px-1.5 text-center text-rose-800">D</th>
                      <th className="py-3 px-1.5 text-center text-blue-800">GF</th>
                      <th className="py-3 px-1.5 text-center text-rose-700">GC</th>
                      <th className="py-3 px-1.5 text-center">Dif.</th>
                      <th className="py-3 px-2 text-center text-indigo-900">Pts</th>
                      <th className="py-3 px-2 text-center">% Vic.</th>
                      <th className="py-3 px-3 text-right">Ver</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {teamStats.map((team) => {
                      const isPositiveGD = team.goalDiff > 0;
                      const isNeutralGD = team.goalDiff === 0;

                      return (
                        <tr
                          key={team.teamId}
                          onClick={() => setSelectedTeamDetail(team)}
                          className="hover:bg-indigo-50/50 transition-colors cursor-pointer group text-xs"
                        >
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                              {team.teamName}
                            </span>
                          </td>
                          <td className="py-2.5 px-2">
                            <div className="truncate max-w-[200px]">
                              <span className="font-medium text-slate-700 block truncate">{team.competitionName}</span>
                              {team.groupName && <span className="text-[10px] text-slate-400 block truncate">{team.groupName}</span>}
                            </div>
                          </td>
                          <td className="py-2.5 px-1.5 text-center font-black">
                            {team.currentPosition ? (
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[11px]">
                                {team.currentPosition}º
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-1.5 text-center font-bold text-slate-700">{team.matchesPlayed}</td>
                          <td className="py-2.5 px-1.5 text-center font-bold text-emerald-600">{team.wins}</td>
                          <td className="py-2.5 px-1.5 text-center font-bold text-slate-600">{team.draws}</td>
                          <td className="py-2.5 px-1.5 text-center font-bold text-rose-600">{team.losses}</td>
                          <td className="py-2.5 px-1.5 text-center font-bold text-blue-600">{team.goalsFor}</td>
                          <td className="py-2.5 px-1.5 text-center font-bold text-rose-500">{team.goalsAgainst}</td>
                          <td className="py-2.5 px-1.5 text-center font-black">
                            <span className={isPositiveGD ? "text-emerald-600" : isNeutralGD ? "text-slate-500" : "text-rose-600"}>
                              {isPositiveGD ? `+${team.goalDiff}` : team.goalDiff}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-center font-black text-slate-900 text-sm">{team.points}</td>
                          <td className="py-2.5 px-2 text-center font-semibold text-slate-600">
                            {typeof team.winRate === "number" ? team.winRate.toFixed(1) : "0.0"}%
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="text-xs font-bold text-indigo-600 group-hover:underline">Detalles</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {teamStats.map((team) => renderTeamCard(team))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal de Estado de Enfermería ── */}
      {showInjuriesModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            {/* Header del Modal */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0 shadow-2xs">
                  <HeartPulse className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <span>Estado de Enfermería</span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                      {injuries?.activeInjuriesCount || 0} Bajas Activas
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Seguimiento clínico, tiempo de recuperación y evolución médica por jugador
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInjuriesModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Cerrar modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Listado de Jugadores Lesionados */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 divide-y divide-slate-100">
              {!injuries?.activeInjuriesList || injuries.activeInjuriesList.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">¡Plantilla 100% disponible!</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    No hay jugadores con bajas médicas o lesiones activas registradas en el club en este momento.
                  </p>
                </div>
              ) : (
                injuries.activeInjuriesList.map((inj) => {
                  const sev = (inj.severity || "").toLowerCase();
                  const sevBadge = sev.includes("grave")
                    ? { label: "Grave", cls: "bg-rose-50 text-rose-700 border-rose-200" }
                    : sev.includes("modera")
                    ? { label: "Moderada", cls: "bg-amber-50 text-amber-700 border-amber-200" }
                    : { label: "Leve", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };

                  return (
                    <div key={inj.id} className="pt-4 first:pt-0 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <Link
                            href={`/dashboard/club/jugador/${inj.playerId}#seccion-lesiones`}
                            className="font-black text-sm sm:text-base text-slate-900 hover:text-indigo-600 transition-colors flex items-center gap-1.5"
                          >
                            <span>{inj.playerName}</span>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                          </Link>
                          {inj.teamName && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                              {inj.teamName}
                            </span>
                          )}
                        </div>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${sevBadge.cls}`}>
                          {sevBadge.label}
                        </span>
                      </div>

                      <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-2 text-xs">
                        <div className="text-slate-800 font-semibold">
                          <span className="text-slate-500 font-normal">Diagnóstico: </span>
                          <span className="font-bold text-slate-900">{inj.injuryType}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          {inj.injuryDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>Fecha: {new Date(inj.injuryDate).toLocaleDateString("es-ES")}</span>
                            </span>
                          )}
                          {inj.formattedRecoveryTime && (
                            <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                              {inj.formattedRecoveryTime}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer del Modal */}
            <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowInjuriesModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de Detalle Exhaustivo del Equipo ── */}
      {selectedTeamDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[85vh] overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            {/* Header del Modal */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                    {selectedTeamDetail.teamName}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {selectedTeamDetail.competitionName || "Competición oficial FFCV"}
                    {selectedTeamDetail.groupName ? ` · ${selectedTeamDetail.groupName}` : ""}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTeamDetail(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
              {/* Posición y Puntos */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100 text-center">
                  <span className="text-[10px] font-extrabold uppercase text-indigo-700 tracking-wider">
                    Posición en Liga
                  </span>
                  <p className="text-2xl font-black text-indigo-950 mt-0.5">
                    {selectedTeamDetail.currentPosition ? `${selectedTeamDetail.currentPosition}º` : "—"}
                  </p>
                  <p className="text-[10px] text-indigo-600 font-medium">
                    {selectedTeamDetail.totalTeamsInGroup ? `de ${selectedTeamDetail.totalTeamsInGroup} equipos` : "Clasificación oficial"}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                    Puntos Conseguidos
                  </span>
                  <p className="text-2xl font-black text-slate-900 mt-0.5">
                    {selectedTeamDetail.points} <span className="text-xs font-semibold text-slate-400">pts</span>
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {typeof selectedTeamDetail.winRate === "number" ? selectedTeamDetail.winRate.toFixed(1) : "0"}% victorias
                  </p>
                </div>
              </div>

              {/* Estadísticas de Partidos */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                  Balance de Competición
                </span>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-[10px] text-slate-400 block font-semibold">Jugados</span>
                    <span className="text-sm font-black text-slate-900">{selectedTeamDetail.matchesPlayed}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-emerald-200 shadow-2xs">
                    <span className="text-[10px] text-emerald-600 block font-semibold">Ganados</span>
                    <span className="text-sm font-black text-emerald-700">{selectedTeamDetail.wins}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block font-semibold">Empatados</span>
                    <span className="text-sm font-black text-slate-700">{selectedTeamDetail.draws}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-rose-200 shadow-2xs">
                    <span className="text-[10px] text-rose-600 block font-semibold">Perdidos</span>
                    <span className="text-sm font-black text-rose-700">{selectedTeamDetail.losses}</span>
                  </div>
                </div>
              </div>

              {/* Balance de Goles */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                  Registro de Goles
                </span>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white p-2 rounded-lg border border-blue-200 shadow-2xs">
                    <span className="text-[10px] text-blue-600 block font-semibold">Goles Favor</span>
                    <span className="text-sm font-black text-blue-700">+{selectedTeamDetail.goalsFor}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-rose-200 shadow-2xs">
                    <span className="text-[10px] text-rose-500 block font-semibold">Goles Contra</span>
                    <span className="text-sm font-black text-rose-700">-{selectedTeamDetail.goalsAgainst}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block font-semibold">Diferencia</span>
                    <span className={`text-sm font-black ${selectedTeamDetail.goalDiff >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {selectedTeamDetail.goalDiff > 0 ? `+${selectedTeamDetail.goalDiff}` : selectedTeamDetail.goalDiff}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botones de Navegación Rápida */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => router.push(`/dashboard/equipos/${selectedTeamDetail.teamId}/plantilla`)}
                  className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 text-slate-600" />
                  <span>Ver Plantilla</span>
                </button>
                <button
                  type="button"
                  onClick={() => router.push(`/dashboard/equipos/${selectedTeamDetail.teamId}/partidos`)}
                  className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Ver Partidos y Actas</span>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedTeamDetail(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
