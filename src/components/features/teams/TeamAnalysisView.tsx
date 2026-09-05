"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Trophy,
  TrendingUp,
  ArrowLeft,
  Calendar,
  Shield,
  Target,
  Flame,
  Award,
  ChevronRight,
  Filter,
  CheckCircle2,
  XCircle,
  MinusCircle,
  HelpCircle,
  Layers,
  History,
  Home,
  Plane,
  ExternalLink,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { TeamAnalysisData } from "@/app/actions/team-actions";

interface TeamAnalysisViewProps {
  initialData: TeamAnalysisData;
}

export function TeamAnalysisView({ initialData }: TeamAnalysisViewProps) {
  const [data] = useState<TeamAnalysisData>(initialData);
  const [activeChartTab, setActiveChartTab] = useState<"posicion" | "puntos" | "goles">("posicion");
  const [matchFilter, setMatchFilter] = useState<"all" | "V" | "E" | "D" | "home" | "away">("all");

  const { team, club, competition, summary, standings, matches, evolution, historicalSeasons } = data;

  // Filtrado de partidos
  const filteredMatches = matches.filter((m) => {
    if (matchFilter === "all") return true;
    if (matchFilter === "V") return m.resultOutcome === "V";
    if (matchFilter === "E") return m.resultOutcome === "E";
    if (matchFilter === "D") return m.resultOutcome === "D";
    if (matchFilter === "home") return m.isHome;
    if (matchFilter === "away") return !m.isHome;
    return true;
  });

  // Totales para filtros
  const winsCount = matches.filter((m) => m.resultOutcome === "V").length;
  const drawsCount = matches.filter((m) => m.resultOutcome === "E").length;
  const lossesCount = matches.filter((m) => m.resultOutcome === "D").length;
  const homeCount = matches.filter((m) => m.isHome).length;
  const awayCount = matches.filter((m) => !m.isHome).length;

  const totalTeams = competition?.totalTeams || standings.length || 16;
  const maxMatchday = competition?.totalMatchdays || 30;

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300">
      
      {/* ── 1. ENCABEZADO Y CONTEXTO DEL EQUIPO ── */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-sm shrink-0">
            {team.name.charAt(0)}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {team.name}
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
                {team.category}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {competition?.seasonName ? `Temporada ${competition.seasonName}` : "Temporada 2025/26"}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-indigo-600" />
              <span>{competition ? `${competition.competitionName} · ${competition.groupName}` : "Competición Oficial FFCV"}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
          <Link
            href="/admin/inicio"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Centro de Control</span>
          </Link>
          <Link
            href={`/dashboard/equipos/${team.id}/partidos`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors border border-indigo-100"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Ver Partidos y Actas</span>
          </Link>
        </div>
      </div>

      {/* ── 2. RESUMEN EJECUTIVO (KPIs PRINCIPALES) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Posición Oficial */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Clasificación
            </span>
            <Trophy className="w-4 h-4 text-amber-500" />
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">
                {summary.currentPosition > 0 ? `${summary.currentPosition}º` : "-"}
              </span>
              <span className="text-xs text-slate-400 font-semibold">
                / {summary.totalTeams} equipos
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {competition?.groupName || "Grupo Oficial"}
            </p>
          </div>
          <div className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md inline-block self-start">
            FFCV Oficial
          </div>
        </div>

        {/* Puntos y % */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Puntos
            </span>
            <Award className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-indigo-700">
                {summary.points}
              </span>
              <span className="text-xs text-slate-400 font-semibold">
                pts
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {summary.pointsPercentage}% de puntos posibles
            </p>
          </div>
          <div className="text-[10px] font-medium text-slate-500">
            Máx: {summary.possiblePoints} pts
          </div>
        </div>

        {/* Partidos y Efectividad */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Partidos (PJ)
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">
                {summary.matchesPlayed}
              </span>
              <span className="text-xs text-emerald-600 font-bold">
                {summary.winRate}% V
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5 font-semibold">
              {summary.wins}V · {summary.draws}E · {summary.losses}D
            </p>
          </div>
          <div className="text-[10px] text-slate-400 font-medium">
            Temporada regular
          </div>
        </div>

        {/* Goles a Favor / En Contra */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Goles (GF / GC)
            </span>
            <Target className="w-4 h-4 text-blue-600" />
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">
                {summary.goalsFor}
              </span>
              <span className="text-xs text-slate-400">/ {summary.goalsAgainst}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              DG:{" "}
              <span
                className={`font-bold ${
                  summary.goalDiff > 0
                    ? "text-emerald-600"
                    : summary.goalDiff === 0
                    ? "text-slate-600"
                    : "text-rose-600"
                }`}
              >
                {summary.goalDiff > 0 ? `+${summary.goalDiff}` : summary.goalDiff}
              </span>
            </p>
          </div>
          <div className="text-[10px] text-slate-400 font-medium">
            {summary.matchesPlayed > 0 ? (summary.goalsFor / summary.matchesPlayed).toFixed(2) : "0"} GF / partido
          </div>
        </div>

        {/* Rendimiento Racha */}
        <div className="col-span-2 lg:col-span-1 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Forma Reciente
            </span>
            <Flame className="w-4 h-4 text-orange-500" />
          </div>
          <div className="my-2 flex items-center gap-1.5">
            {matches.slice(-5).map((m, idx) => (
              <span
                key={idx}
                title={`J${m.matchday}: ${m.resultOutcome} vs ${m.rivalName} (${m.sportingScore ?? "-"}-${m.rivalScore ?? "-"})`}
                className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center ${
                  m.resultOutcome === "V"
                    ? "bg-emerald-500 text-white"
                    : m.resultOutcome === "E"
                    ? "bg-slate-400 text-white"
                    : m.resultOutcome === "D"
                    ? "bg-rose-500 text-white"
                    : "bg-slate-100 text-slate-400 border border-dashed border-slate-300"
                }`}
              >
                {m.resultOutcome === "PDTE" ? "-" : m.resultOutcome}
              </span>
            ))}
          </div>
          <div className="text-[10px] text-slate-400 font-medium">
            Últimos 5 encuentros
          </div>
        </div>
      </div>

      {/* ── 3. BALANCE LOCAL VS VISITANTE ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Rendimiento en Casa */}
        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Rendimiento en Casa
              </span>
              <p className="text-sm font-black text-slate-900 mt-0.5">
                {summary.homeRecord.wins}V · {summary.homeRecord.draws}E · {summary.homeRecord.losses}D ({summary.homeRecord.played} PJ)
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {summary.homeRecord.gf} goles a favor · {summary.homeRecord.ga} en contra (DG {summary.homeRecord.gf - summary.homeRecord.ga > 0 ? `+${summary.homeRecord.gf - summary.homeRecord.ga}` : summary.homeRecord.gf - summary.homeRecord.ga})
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-lg font-black text-indigo-600 block">{summary.homeRecord.points} pts</span>
            <span className="text-[10px] font-bold text-emerald-600">
              {summary.homeRecord.played > 0 ? Math.round((summary.homeRecord.wins / summary.homeRecord.played) * 100) : 0}% victorias
            </span>
          </div>
        </div>

        {/* Rendimiento Fuera */}
        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Plane className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Rendimiento Fuera
              </span>
              <p className="text-sm font-black text-slate-900 mt-0.5">
                {summary.awayRecord.wins}V · {summary.awayRecord.draws}E · {summary.awayRecord.losses}D ({summary.awayRecord.played} PJ)
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {summary.awayRecord.gf} goles a favor · {summary.awayRecord.ga} en contra (DG {summary.awayRecord.gf - summary.awayRecord.ga > 0 ? `+${summary.awayRecord.gf - summary.awayRecord.ga}` : summary.awayRecord.gf - summary.awayRecord.ga})
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-lg font-black text-indigo-600 block">{summary.awayRecord.points} pts</span>
            <span className="text-[10px] font-bold text-emerald-600">
              {summary.awayRecord.played > 0 ? Math.round((summary.awayRecord.wins / summary.awayRecord.played) * 100) : 0}% victorias
            </span>
          </div>
        </div>
      </div>

      {/* ── 4. TIMELINE COMPLETO DE RESULTADOS POR JORNADA ── */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="font-bold text-slate-900 text-base">Timeline de Resultados</h2>
            <p className="text-[11px] text-slate-400">
              Secuencia cronológica de todos los partidos disputados en la temporada
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" /> Victoria
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-slate-400 inline-block" /> Empate
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-rose-500 inline-block" /> Derrota
            </span>
          </div>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="flex items-center gap-1.5 min-w-max py-1">
            {matches.map((m) => {
              const bg =
                m.resultOutcome === "V"
                  ? "bg-emerald-500 text-white border-emerald-600"
                  : m.resultOutcome === "E"
                  ? "bg-slate-400 text-white border-slate-500"
                  : m.resultOutcome === "D"
                  ? "bg-rose-500 text-white border-rose-600"
                  : "bg-slate-100 text-slate-400 border-dashed border-slate-300";

              return (
                <div
                  key={m.id}
                  className="group relative flex flex-col items-center cursor-pointer"
                >
                  <div
                    className={`w-7 h-8 sm:w-8 sm:h-9 rounded-lg border flex flex-col items-center justify-center font-bold text-[10px] sm:text-xs transition-transform group-hover:scale-110 shadow-2xs ${bg}`}
                  >
                    <span className="text-[8px] sm:text-[9px] opacity-80 leading-none">J{m.matchday}</span>
                    <span className="leading-none mt-0.5">{m.resultOutcome === "PDTE" ? "-" : m.resultOutcome}</span>
                  </div>

                  {/* Tooltip flotante al hacer hover */}
                  <div className="hidden group-hover:block absolute bottom-full mb-2 z-20 w-48 p-2.5 bg-slate-900 text-white text-[11px] rounded-xl shadow-lg pointer-events-none">
                    <p className="font-bold text-indigo-300">Jornada {m.matchday} {m.date ? `· ${m.date}` : ""}</p>
                    <p className="text-slate-200 mt-0.5">
                      {m.isHome ? "Casa" : "Fuera"} vs {m.rivalName}
                    </p>
                    <p className="font-black text-white text-xs mt-1">
                      {m.sportingScore !== null ? `Resultado: ${m.sportingScore} - ${m.rivalScore}` : "Pendiente"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 5. GRÁFICOS DE EVOLUCIÓN HISTÓRICA ── */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">Evolución de la Temporada</h2>
              <p className="text-[11px] text-slate-400">
                Seguimiento jornada a jornada de posición, puntos y balance de goles
              </p>
            </div>
          </div>

          {/* Selector de tipo de gráfico */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold self-start sm:self-auto">
            <button
              onClick={() => setActiveChartTab("posicion")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeChartTab === "posicion"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Posición (1º arriba)
            </button>
            <button
              onClick={() => setActiveChartTab("puntos")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeChartTab === "puntos"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Puntos Acumulados
            </button>
            <button
              onClick={() => setActiveChartTab("goles")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeChartTab === "goles"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Diferencia de Goles
            </button>
          </div>
        </div>

        {/* 5.1 Gráfico 1: Evolución de Posición (EJE Y INVERTIDO: 1º en el TOP) */}
        {activeChartTab === "posicion" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span>Trayectoria en la tabla clasificatoria</span>
              <span className="font-bold text-indigo-600">
                1º posición = Liderato (parte superior)
              </span>
            </div>
            <div className="h-64 sm:h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="matchday"
                    tickLine={false}
                    axisLine={{ stroke: "#CBD5E1" }}
                    tick={{ fill: "#64748B", fontSize: 11 }}
                    tickFormatter={(val) => `J${val}`}
                  />
                  {/* IMPORTANTE: reversed={true} para que 1º esté en la parte superior */}
                  <YAxis
                    reversed={true}
                    domain={[1, totalTeams]}
                    tickCount={totalTeams}
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={{ stroke: "#CBD5E1" }}
                    tick={{ fill: "#64748B", fontSize: 11 }}
                    tickFormatter={(val) => `${val}º`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload as (typeof evolution)[0];
                        return (
                          <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs shadow-lg space-y-1">
                            <p className="font-bold text-indigo-300">Jornada {d.matchday}</p>
                            <p className="font-black text-base text-amber-400">{d.position}º clasificado</p>
                            <p className="text-slate-300">Puntos acumulados: <span className="font-bold text-white">{d.points} pts</span></p>
                            <p className="text-slate-300">Balance: {d.won}V · {d.drawn}E · {d.lost}D</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="position"
                    stroke="#4F46E5"
                    strokeWidth={3}
                    dot={{ fill: "#4F46E5", r: 4, strokeWidth: 2, stroke: "#FFFFFF" }}
                    activeDot={{ r: 6, fill: "#F59E0B", stroke: "#FFFFFF", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 5.2 Gráfico 2: Puntos Acumulados */}
        {activeChartTab === "puntos" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span>Progresión de puntos obtenidos</span>
              <span className="font-bold text-emerald-600">
                Total acumulado: {summary.points} pts
              </span>
            </div>
            <div className="h-64 sm:h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="pointsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="matchday"
                    tickLine={false}
                    axisLine={{ stroke: "#CBD5E1" }}
                    tick={{ fill: "#64748B", fontSize: 11 }}
                    tickFormatter={(val) => `J${val}`}
                  />
                  <YAxis
                    domain={[0, "auto"]}
                    tickLine={false}
                    axisLine={{ stroke: "#CBD5E1" }}
                    tick={{ fill: "#64748B", fontSize: 11 }}
                    tickFormatter={(val) => `${val} pts`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload as (typeof evolution)[0];
                        return (
                          <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs shadow-lg space-y-1">
                            <p className="font-bold text-emerald-400">Jornada {d.matchday}</p>
                            <p className="font-black text-base text-white">{d.points} puntos acumulados</p>
                            <p className="text-slate-300">Posición en la tabla: {d.position}º</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="points"
                    stroke="#10B981"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#pointsGradient)"
                    dot={{ fill: "#10B981", r: 3, strokeWidth: 2, stroke: "#FFFFFF" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 5.3 Gráfico 3: Diferencia de Goles Acumulada */}
        {activeChartTab === "goles" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span>Balance neto entre goles a favor y goles en contra</span>
              <span className="font-bold text-indigo-600">
                DG Actual: {summary.goalDiff > 0 ? `+${summary.goalDiff}` : summary.goalDiff}
              </span>
            </div>
            <div className="h-64 sm:h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="matchday"
                    tickLine={false}
                    axisLine={{ stroke: "#CBD5E1" }}
                    tick={{ fill: "#64748B", fontSize: 11 }}
                    tickFormatter={(val) => `J${val}`}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={{ stroke: "#CBD5E1" }}
                    tick={{ fill: "#64748B", fontSize: 11 }}
                  />
                  <ReferenceLine y={0} stroke="#94A3B8" strokeDasharray="4 4" strokeWidth={1.5} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload as (typeof evolution)[0];
                        return (
                          <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs shadow-lg space-y-1">
                            <p className="font-bold text-indigo-300">Jornada {d.matchday}</p>
                            <p className="font-black text-base text-white">
                              DG: {d.goalDifference > 0 ? `+${d.goalDifference}` : d.goalDifference}
                            </p>
                            <p className="text-slate-300">
                              {d.goalsFor} GF / {d.goalsAgainst} GC
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="goalDifference"
                    stroke="#3B82F6"
                    strokeWidth={2.5}
                    dot={{ fill: "#3B82F6", r: 3, strokeWidth: 2, stroke: "#FFFFFF" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </section>

      {/* ── 6. CLASIFICACIÓN OFICIAL FFCV COMPLETA DEL GRUPO ── */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">Clasificación Oficial FFCV</h2>
              <p className="text-[11px] text-slate-400">
                {competition ? `${competition.competitionName} · ${competition.groupName}` : "Tabla del grupo"}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 self-start sm:self-auto">
            {standings.length} Equipos
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 text-[10px] sm:text-[11px] font-bold uppercase">
                <th className="py-2.5 px-3">Pos</th>
                <th className="py-2.5 px-3">Equipo</th>
                <th className="py-2.5 px-3 text-center">Pts</th>
                <th className="py-2.5 px-3 text-center">PJ</th>
                <th className="py-2.5 px-3 text-center">V</th>
                <th className="py-2.5 px-3 text-center">E</th>
                <th className="py-2.5 px-3 text-center">D</th>
                <th className="py-2.5 px-3 text-center">GF</th>
                <th className="py-2.5 px-3 text-center">GC</th>
                <th className="py-2.5 px-3 text-center">DG</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {standings.map((row) => {
                const isSaladar = row.isSportingSaladar;
                const isPositiveGD = row.goalDifference > 0;
                const isNeutralGD = row.goalDifference === 0;

                return (
                  <tr
                    key={row.position}
                    className={`transition-colors ${
                      isSaladar
                        ? "bg-indigo-50/80 font-bold text-indigo-950 hover:bg-indigo-100/70"
                        : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black ${
                          row.position <= 3
                            ? "bg-amber-100 text-amber-800"
                            : isSaladar
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {row.position}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className={`truncate ${isSaladar ? "font-black text-indigo-900" : ""}`}>
                          {row.teamName}
                        </span>
                        {isSaladar && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-indigo-600 text-white uppercase tracking-wider shrink-0">
                            Nuestro Club
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center font-black text-indigo-700">
                      {row.points}
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-slate-600">{row.played}</td>
                    <td className="py-3 px-3 text-center text-slate-600">{row.won}</td>
                    <td className="py-3 px-3 text-center text-slate-600">{row.drawn}</td>
                    <td className="py-3 px-3 text-center text-slate-600">{row.lost}</td>
                    <td className="py-3 px-3 text-center text-slate-600">{row.goalsFor}</td>
                    <td className="py-3 px-3 text-center text-slate-600">{row.goalsAgainst}</td>
                    <td
                      className={`py-3 px-3 text-center font-bold ${
                        isPositiveGD ? "text-emerald-600" : isNeutralGD ? "text-slate-500" : "text-rose-600"
                      }`}
                    >
                      {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 7. RESULTADOS OFICIALES FFCV (CALENDARIO) ── */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">Resultados de Competición</h2>
              <p className="text-[11px] text-slate-400">
                Todos los encuentros oficiales disputados con actas FFCV
              </p>
            </div>
          </div>

          {/* Filtros de partidos */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setMatchFilter("all")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                matchFilter === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Todos ({matches.length})
            </button>
            <button
              onClick={() => setMatchFilter("V")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                matchFilter === "V" ? "bg-emerald-600 text-white shadow-xs" : "text-emerald-700 hover:bg-emerald-100/50"
              }`}
            >
              Victorias ({winsCount})
            </button>
            <button
              onClick={() => setMatchFilter("E")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                matchFilter === "E" ? "bg-slate-600 text-white shadow-xs" : "text-slate-700 hover:bg-slate-200"
              }`}
            >
              Empates ({drawsCount})
            </button>
            <button
              onClick={() => setMatchFilter("D")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                matchFilter === "D" ? "bg-rose-600 text-white shadow-xs" : "text-rose-700 hover:bg-rose-100/50"
              }`}
            >
              Derrotas ({lossesCount})
            </button>
            <button
              onClick={() => setMatchFilter("home")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                matchFilter === "home" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Casa ({homeCount})
            </button>
            <button
              onClick={() => setMatchFilter("away")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                matchFilter === "away" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Fuera ({awayCount})
            </button>
          </div>
        </div>

        {/* Lista de partidos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredMatches.map((m) => {
            const isV = m.resultOutcome === "V";
            const isE = m.resultOutcome === "E";
            const isD = m.resultOutcome === "D";

            return (
              <div
                key={m.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex items-center gap-3">
                  <span
                    className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center shrink-0 ${
                      isV
                        ? "bg-emerald-500 text-white"
                        : isE
                        ? "bg-slate-400 text-white"
                        : isD
                        ? "bg-rose-500 text-white"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {m.resultOutcome === "PDTE" ? "-" : m.resultOutcome}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-700 uppercase">
                        J{m.matchday}
                      </span>
                      <span className="text-[11px] text-slate-400 truncate">
                        {m.date || "Fecha a confirmar"}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-900 truncate mt-1">
                      {m.isHome ? (
                        <span>
                          <span className="font-black text-indigo-700">{m.homeTeamName}</span> vs {m.awayTeamName}
                        </span>
                      ) : (
                        <span>
                          {m.homeTeamName} vs <span className="font-black text-indigo-700">{m.awayTeamName}</span>
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0 flex items-center gap-2">
                  <div className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-black text-xs sm:text-sm text-slate-900 shadow-2xs">
                    {m.sportingScore !== null ? `${m.homeScore} - ${m.awayScore}` : "Aplazado"}
                  </div>
                  {m.codActa && (
                    <Link
                      href={`/dashboard/equipos/${team.id}/partidos?view=actas&codacta=${m.codActa}&matchId=${m.codActa}`}
                      className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                      title="Ver Acta Oficial FFCV"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 8. HISTÓRICO DE TEMPORADAS ── */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-slate-100 text-slate-700 rounded-lg">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">Histórico de Temporadas</h2>
              <p className="text-[11px] text-slate-400">
                Registro de competiciones del Sporting Saladar en base de datos
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {historicalSeasons.map((s) => (
            <div
              key={s.id}
              className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                s.isActive
                  ? "bg-indigo-50/60 border-indigo-200 text-indigo-950"
                  : "bg-slate-50 border-slate-200 text-slate-600"
              }`}
            >
              <div>
                <span className="font-black text-xs block">{s.name}</span>
                <span className="text-[10px] text-slate-400">
                  {s.isActive ? "Temporada Activa · Cobertura Oficial FFCV" : "Histórico registrado"}
                </span>
              </div>
              {s.isActive && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                  ACTUAL
                </span>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
