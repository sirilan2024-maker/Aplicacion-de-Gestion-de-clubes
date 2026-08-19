"use client";

import { useState, useEffect, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  ArrowLeft, Users, Activity, Target, Shield, Calendar, 
  TrendingUp, TrendingDown, Minus, AlertTriangle, AlertCircle, 
  CheckCircle2, Clock, Filter, Layers, BarChart3, Trophy, ChevronRight
} from "lucide-react";
import Link from "next/link";
import { 
  getTeamMethodologySummary, 
  TeamMethodologySummary,
  AnalyticsFilters 
} from "@/lib/methodology/methodologyService";

export default function TeamMethodologyProfilePage({ params }: { params: Promise<{ teamId: string }> }) {
  const resolvedParams = use(params);
  const teamId = resolvedParams.teamId;
  const supabase = createClient();

  const [team, setTeam] = useState<any>(null);
  const [summary, setSummary] = useState<TeamMethodologySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters State
  const [filters, setFilters] = useState<AnalyticsFilters>({
    startDate: "",
    endDate: "",
    microcycleDay: ""
  });

  useEffect(() => {
    loadTeamData();
  }, [teamId, filters]);

  const loadTeamData = async () => {
    setIsLoading(true);
    try {
      const [teamRes, summaryData] = await Promise.all([
        supabase.from("teams").select("*, clubs(name)").eq("id", teamId).single(),
        getTeamMethodologySummary(teamId, filters)
      ]);

      if (teamRes.data) setTeam(teamRes.data);
      setSummary(summaryData);
    } catch (error) {
      console.error("Error loading team methodology summary:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTrendBadge = (trend: string, sampleSize: number) => {
    if (sampleSize < 3 || trend === 'insufficient_data') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">
          <Minus className="w-3 h-3" /> Muestra ({sampleSize}/3)
        </span>
      );
    }
    if (trend === 'improving') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
          <TrendingUp className="w-3 h-3" /> En Progreso (+{sampleSize} obs)
        </span>
      );
    }
    if (trend === 'declining') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-black bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md">
          <TrendingDown className="w-3 h-3" /> Foco de Alerta ({sampleSize} obs)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md">
        <Minus className="w-3 h-3" /> Consistente ({sampleSize} obs)
      </span>
    );
  };

  if (isLoading && !summary) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/admin/metodologia" className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800">
                Perfil Metodológico del Equipo
              </span>
              <span className="text-xs font-bold text-slate-400">
                • Categoría: {team?.category || "General"}
              </span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-1">
              {team?.name || "Equipo Metodológico"}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/admin/metodologia/equipos/${teamId}/temporada/${team?.season_id || 'actual'}`}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Memoria de Temporada
          </Link>
          <Link
            href="/admin/metodologia/sesiones/nueva"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
          >
            + Nueva Sesión para este Equipo
          </Link>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-wrap items-center gap-3 text-xs font-bold">
        <div className="flex items-center gap-2 text-slate-400">
          <Filter className="w-4 h-4" />
          <span>Filtros Históricos:</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-medium">Desde:</span>
          <input 
            type="date"
            value={filters.startDate || ""}
            onChange={e => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-700"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-medium">Hasta:</span>
          <input 
            type="date"
            value={filters.endDate || ""}
            onChange={e => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-700"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-medium">Día Microciclo:</span>
          <select
            value={filters.microcycleDay || ""}
            onChange={e => setFilters(prev => ({ ...prev, microcycleDay: e.target.value }))}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-700 font-bold"
          >
            <option value="">Todos</option>
            <option value="MD+1">MD+1</option>
            <option value="MD-4">MD-4</option>
            <option value="MD-3">MD-3</option>
            <option value="MD-2">MD-2</option>
            <option value="MD-1">MD-1</option>
            <option value="MD">MD</option>
          </select>
        </div>

        {(filters.startDate || filters.endDate || filters.microcycleDay) && (
          <button
            onClick={() => setFilters({ startDate: "", endDate: "", microcycleDay: "" })}
            className="text-blue-600 hover:underline text-xs font-bold ml-auto"
          >
            Limpiar Filtros
          </button>
        )}
      </div>

      {/* KPI METRICS OVERVIEW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-slate-400 text-xs font-bold uppercase">
            <span>Sesiones / Evaluación</span>
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">
            {summary?.evaluatedSessions} <span className="text-sm font-bold text-slate-400">/ {summary?.totalSessions}</span>
          </div>
          <p className="text-xs font-bold text-blue-600">{summary?.evaluationRate}% evaluadas</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-slate-400 text-xs font-bold uppercase">
            <span>Consecución Media</span>
            <Trophy className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-3xl font-black text-purple-900">
            {summary?.avgObjectiveAchievement} <span className="text-sm font-bold text-purple-400">/ 4</span>
          </div>
          <p className="text-xs font-bold text-purple-600">Escala formativa (1-4)</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-slate-400 text-xs font-bold uppercase">
            <span>RPE Medio Real</span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-emerald-900">
            {summary?.avgRpe} <span className="text-sm font-bold text-emerald-400">/ 10</span>
          </div>
          <p className="text-xs font-bold text-emerald-600">Carga percibida Foster</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-slate-400 text-xs font-bold uppercase">
            <span>Cobertura del Modelo</span>
            <Shield className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-3xl font-black text-amber-900">
            {summary?.principleCoverage.coveragePercentage}%
          </div>
          <p className="text-xs font-bold text-amber-600">
            {summary?.principleCoverage.trainedPrinciplesCount} de {summary?.principleCoverage.totalCurriculumPrinciples} principios
          </p>
        </div>
      </div>

      {/* PATTERNS DETECTED (IF ANY) */}
      {summary && summary.patternsDetected.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-900 font-black text-sm uppercase tracking-wider">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Patrones y Diagnósticos Metodológicos Automáticos
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-medium text-amber-800">
            {summary.patternsDetected.map((pat, i) => (
              <div key={i} className="flex items-center gap-2 bg-white/70 p-2.5 rounded-xl border border-amber-200/60">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                <span>{pat}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MAIN TWO-COLUMN SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* EVOLUCIÓN DE COMPORTAMIENTOS (8 COLS) */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Evolución de Comportamientos Observables
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Seguimiento longitudinal de conductas del modelo de juego
              </p>
            </div>
            <span className="text-xs font-bold bg-slate-50 text-slate-600 px-2.5 py-1 rounded-lg">
              Regla N ≥ 3 para tendencias
            </span>
          </div>

          {summary?.behaviourEvolution.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-6 text-center">
              No hay evaluaciones registradas con comportamientos para este equipo en el periodo seleccionado.
            </p>
          ) : (
            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {summary?.behaviourEvolution.map((b, idx) => (
                <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                        {b.gamePhaseOrFamily || "Fase de Juego"}
                      </span>
                      <h4 className="text-xs font-black text-slate-900 mt-1">
                        {b.behaviourDescription}
                      </h4>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {getTrendBadge(b.trend, b.sampleSize)}
                      <div className="text-right">
                        <span className="text-sm font-black text-slate-900 block">
                          {b.avgScore} <span className="text-[10px] text-slate-400 font-bold">/ 4</span>
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {b.firstScore} → {b.lastScore} ({b.absoluteVariation > 0 ? `+${b.absoluteVariation}` : b.absoluteVariation})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* MINI HISTORY DOTS */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Histórico:</span>
                    {b.history.map((h, i) => (
                      <span 
                        key={i} 
                        title={`Sesión ${h.date}: Puntuación ${h.score}/4`}
                        className={`text-[10px] font-black w-5 h-5 rounded flex items-center justify-center ${
                          h.score >= 3 ? 'bg-emerald-100 text-emerald-800' : (h.score === 2 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800')
                        }`}
                      >
                        {h.score}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* COBERTURA DE PRINCIPIOS & DESVIACIONES (4 COLS) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* PRINCIPIOS NO TRABAJADOS / DEFICIT */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              Principios Sin Trabajar en el Periodo
            </h3>

            {summary?.principleCoverage.neverTrained.length === 0 ? (
              <p className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Cobertura completa del modelo
              </p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {summary?.principleCoverage.neverTrained.map((p, idx) => (
                  <div key={idx} className="p-2.5 bg-amber-50/60 border border-amber-200/80 rounded-xl text-xs flex justify-between items-center">
                    <span className="font-bold text-slate-800 truncate">{p.principle}</span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-white text-amber-800 shrink-0">
                      {p.gamePhase}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PRINCIPIOS CON BAJA CONSECUCIÓN */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
              <BarChart3 className="w-4 h-4 text-rose-600" />
              Foco: Baja Consecución Media
            </h3>

            {summary?.principleCoverage.lowAchievementPrinciples.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No hay principios con alertas de baja consecución.</p>
            ) : (
              <div className="space-y-2">
                {summary?.principleCoverage.lowAchievementPrinciples.map((p, idx) => (
                  <div key={idx} className="p-2.5 bg-rose-50/60 border border-rose-200/80 rounded-xl text-xs flex justify-between items-center">
                    <span className="font-bold text-slate-800 truncate">{p.principle}</span>
                    <span className="font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded text-[11px] shrink-0">
                      {p.avgScore} / 4 ({p.count} ses)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* RECENT SESSIONS TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-base font-black text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
          <Clock className="w-5 h-5 text-blue-600" />
          Histórico de Sesiones Recientes del Equipo
        </h2>

        {summary?.recentSessions.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-4 text-center">No hay sesiones registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase text-slate-400 font-bold tracking-wider">
                  <th className="px-4 py-3">Fecha y Microciclo</th>
                  <th className="px-4 py-3">Objetivo Principal</th>
                  <th className="px-4 py-3">Duración (Plan / Real)</th>
                  <th className="px-4 py-3">Carga / RPE</th>
                  <th className="px-4 py-3">Consecución</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary?.recentSessions.map(s => {
                  const ev = s.session_evaluations?.[0];
                  return (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-800">
                        {s.date_time ? s.date_time.split("T")[0] : "Sin fecha"}
                        <span className="ml-2 bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded font-black text-[10px] uppercase">
                          {s.microcycle_day}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700 max-w-xs truncate">
                        {s.objective || "Sin objetivo"}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-600">
                        {s.duration_minutes}&apos; {ev ? `→ ${ev.actual_duration_min}'` : ""}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-600">
                        {s.estimated_load}% {ev ? `• RPE ${ev.session_rpe}/10` : ""}
                      </td>
                      <td className="px-4 py-3">
                        {ev ? (
                          <span className={`px-2 py-0.5 rounded font-black text-[10px] ${
                            ev.objective_achievement >= 3 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            Nivel {ev.objective_achievement}/4
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Sin evaluar</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/metodologia/sesiones/${s.id}`}
                          className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg inline-flex items-center gap-1 font-bold text-[11px]"
                        >
                          Ver Ficha <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
