"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Building2, ChevronRight, Loader2, Trophy, Target, Activity, 
  AlertTriangle, ShieldAlert, CheckCircle2, TrendingUp, TrendingDown,
  ArrowUpDown, Filter, Printer, ExternalLink, Users, Calendar, BarChart3,
  Layers, Info, Sparkles, Check, Send, Bot, FileText, Lightbulb, AlertCircle,
  Eye, CheckCircle, Sliders, Play, ArrowRight, ShieldCheck, UserCheck,
  Scale, Compass, GitMerge, FileQuestion, HelpCircle, Briefcase, Network, RefreshCw
} from "lucide-react";
import Link from "next/link";
import { MethodologyNavHeader } from "@/components/methodology/MethodologyNavHeader";
import { 
  buildSeasonMethodologyReportFromData,
  SeasonMethodologyReport 
} from "@/lib/methodology/seasonMethodologyReportService";
import {
  evaluateTeamMethodologyStatus,
  calculateClubGlobalKpis,
  buildClubTeamsMatrix,
  generateClubTransversalAlerts,
  compareSpecificTeams,
  calculateClubMonthlyEvolution,
  ClubGlobalKpis,
  TeamRowOverview,
  TransversalAlert,
  ClubMonthlyEvolutionPoint
} from "@/lib/methodology/sportsDirectionService";

export default function MethodologyExecutiveIntelligencePage() {
  const supabase = createClient();

  const [isLoading, setIsLoading] = useState(true);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
  const [reports, setReports] = useState<SeasonMethodologyReport[]>([]);
  const [kpis, setKpis] = useState<ClubGlobalKpis | null>(null);
  const [alerts, setAlerts] = useState<TransversalAlert[]>([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedSeasonId) {
      loadExecutiveData(selectedSeasonId);
    }
  }, [selectedSeasonId]);

  const loadInitialData = async () => {
    try {
      const { data: seasonList } = await supabase
        .from("seasons")
        .select("*")
        .order("start_date", { ascending: false });

      if (seasonList && seasonList.length > 0) {
        setSeasons(seasonList);
        const active = seasonList.find(s => s.is_active) || seasonList[0];
        setSelectedSeasonId(active.id);
      } else {
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Error cargando temporadas ejecutivas:", err);
      setIsLoading(false);
    }
  };

  const loadExecutiveData = async (seasonId: string) => {
    setIsLoading(true);
    try {
      const { data: teams } = await supabase.from("teams").select("*").order("name");
      const { data: curriculumPrinciples } = await supabase.from("methodology_principles").select("id, name, game_phase");
      const { data: allSessions } = await supabase.from("training_sessions").select(`
        id, team_id, date_time, duration_minutes, objective,
        session_evaluations ( id, actual_duration_min, session_rpe, objective_achievement, session_behaviour_evaluations ( behaviour_description, achievement_score ) ),
        session_drills ( id, drill_id, phase, duration_min, banco_ejercicios ( id, nombre, game_phase ) )
      `);

      const seasonReports: SeasonMethodologyReport[] = [];
      if (teams && teams.length > 0) {
        for (const team of teams) {
          const teamSessions = (allSessions || []).filter(s => s.team_id === team.id);
          const report = buildSeasonMethodologyReportFromData({
            team,
            curriculumPrinciples: curriculumPrinciples || [],
            sessions: teamSessions,
            seasonStartDate: "2026-08-01",
            seasonEndDate: "2027-06-30"
          });
          seasonReports.push(report);
        }
      }

      setReports(seasonReports);
      const calculatedKpis = calculateClubGlobalKpis(seasonReports);
      setKpis(calculatedKpis);
      const generatedAlerts = generateClubTransversalAlerts(seasonReports);
      setAlerts(generatedAlerts);
    } catch (err) {
      console.error("Error procesando inteligencia ejecutiva:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        <p className="text-sm font-bold text-slate-500">Cargando Centro de Inteligencia Ejecutiva...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-800">
              Inteligencia Ejecutiva & Planificación Institucional
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <Briefcase className="w-7 h-7 text-purple-600 shrink-0" />
            Centro de Inteligencia Ejecutiva
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Marco institucional: Objetivos → Mapa de Prioridades → Control de Ciclo → Gobernanza.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <MethodologyNavHeader />

          <select
            value={selectedSeasonId}
            onChange={(e) => setSelectedSeasonId(e.target.value)}
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-purple-500"
          >
            {seasons.map(s => (
              <option key={s.id} value={s.id}>{s.name} {s.is_active ? "(Activa)" : ""}</option>
            ))}
          </select>
          <Link
            href="/admin/metodologia/decision"
            className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition-all"
          >
            <Compass className="w-4 h-4" />
            Centro de Decisión
          </Link>
        </div>
      </div>

      {/* KPIs Ejecutivos Globales */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Equipos Auditados</span>
            <div className="text-2xl font-black text-slate-900">{kpis.activeTeamsCount}</div>
            <span className="text-[11px] text-emerald-600 font-bold">{kpis.teamsSolidCount} consistentes</span>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Cumplimiento del Ciclo</span>
            <div className="text-2xl font-black text-purple-900">{kpis.globalEvaluationPercentage}%</div>
            <span className="text-[11px] text-purple-600 font-bold">{kpis.totalEvaluatedSessions} de {kpis.totalPlannedSessions} sesiones</span>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Cobertura Institucional</span>
            <div className="text-2xl font-black text-blue-900">{kpis.globalModelCoverage}%</div>
            <span className="text-[11px] text-blue-600 font-bold">Media de adherencia al modelo</span>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Alertas y Focos</span>
            <div className="text-2xl font-black text-rose-600">{alerts.length}</div>
            <span className="text-[11px] text-rose-500 font-bold">{kpis.teamsAttentionCount} equipos en atención</span>
          </div>
        </div>
      )}

      {/* Mapa Institucional de Prioridades y Ciclo Metodológico */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mapa Institucional de Prioridades */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-600" />
              Mapa Institucional de Prioridades
            </h3>
            <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-lg">
              Temporada 2026-27
            </span>
          </div>
          
          <div className="space-y-3 text-xs">
            <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-black text-slate-900">Salida de Balón y Progresión</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">Institucional</span>
              </div>
              <p className="text-[11px] text-slate-500">Prioridad transversal priorizada en Fútbol 8 y Fútbol 11 (Fases de Inicio y Desarrollo).</p>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-black text-slate-900">Presión Tras Pérdida en Bloque Medio/Alto</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800">Compartida</span>
              </div>
              <p className="text-[11px] text-slate-500">Identificada como foco de refuerzo táctico en 4 equipos de categorías Cadete y Juvenil.</p>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-black text-slate-900">Vigilancias Defensivas en ABP</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800">Área de Oportunidad</span>
              </div>
              <p className="text-[11px] text-slate-500">Principio con menor volumen de minutos acumulados en el último mesociclo.</p>
            </div>
          </div>
        </div>

        {/* Control del Ciclo Metodológico Transversal */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-purple-600" />
              Control del Ciclo Metodológico
            </h3>
            <span className="text-xs font-bold text-slate-400">
              Auditoría de Cierre
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 bg-emerald-50/50 border border-emerald-100 rounded-xl flex items-center justify-between">
              <div>
                <span className="font-bold text-emerald-950 block">Planificación & Estructura de Microciclo</span>
                <span className="text-[11px] text-emerald-700">100% de equipos con microciclos asignados</span>
              </div>
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            </div>

            <div className="p-3.5 bg-purple-50/50 border border-purple-100 rounded-xl flex items-center justify-between">
              <div>
                <span className="font-bold text-purple-950 block">Evaluación Cuantitativa y RPE Post-Sesión</span>
                <span className="text-[11px] text-purple-700">Cumplimiento sostenido del 75%+</span>
              </div>
              <Activity className="w-5 h-5 text-purple-600 shrink-0" />
            </div>

            <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl flex items-center justify-between">
              <div>
                <span className="font-bold text-blue-950 block">Diagnóstico Consultivo y Evolución de Prioridades</span>
                <span className="text-[11px] text-blue-700">Ciclo cerrado sin escrituras automáticas de IA</span>
              </div>
              <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
