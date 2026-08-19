"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Building2, ChevronRight, Loader2, Trophy, Target, Activity, 
  AlertTriangle, ShieldAlert, CheckCircle2, TrendingUp, TrendingDown,
  ArrowUpDown, Filter, Printer, ExternalLink, Users, Calendar, BarChart3,
  Layers, Info, Sparkles, Check, Send, Bot, FileText, Lightbulb, AlertCircle,
  Eye, CheckCircle, Sliders, Play, ArrowRight, ShieldCheck, UserCheck,
  Scale, Compass, GitMerge, FileQuestion, HelpCircle, Briefcase, Network, RefreshCw, Zap
} from "lucide-react";
import Link from "next/link";
import { MethodologyNavHeader } from "@/components/methodology/MethodologyNavHeader";
import { 
  buildSeasonMethodologyReportFromData,
  SeasonMethodologyReport 
} from "@/lib/methodology/seasonMethodologyReportService";
import {
  analyzeAdaptiveEvolution,
  AdaptiveEvolutionAnalysisResult
} from "@/lib/methodology/methodologyAdaptiveEvolutionEngine";

export default function MethodologyAdaptiveEvolutionPage() {
  const supabase = createClient();

  const [isLoading, setIsLoading] = useState(true);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
  const [analysis, setAnalysis] = useState<AdaptiveEvolutionAnalysisResult | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedSeasonId) {
      loadEvolutionData(selectedSeasonId);
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
      console.error("Error cargando temporadas en evolución:", err);
      setIsLoading(false);
    }
  };

  const loadEvolutionData = async (seasonId: string) => {
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

      const result = analyzeAdaptiveEvolution({ teamReports: seasonReports });
      setAnalysis(result);
    } catch (err) {
      console.error("Error analizando evolución adaptativa:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        <p className="text-sm font-bold text-slate-500">Cargando Centro de Evolución Metodológica...</p>
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
              Evolución Metodológica & Inteligencia Adaptativa
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <Zap className="w-7 h-7 text-purple-600 shrink-0" />
            Centro de Evolución Metodológica
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Observación → Interpretación → Propuesta Adaptativa → Decisión Humana Soberana (0 escrituras automáticas).
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
            href="/admin/metodologia/ejecutiva"
            className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition-all"
          >
            <Briefcase className="w-4 h-4" />
            Inteligencia Ejecutiva
          </Link>
        </div>
      </div>

      {/* Tarjetas de Resumen de Evolución */}
      {analysis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tendencias Detectadas</span>
            <div className="text-2xl font-black text-slate-900">{analysis.trends.length}</div>
            <span className="text-[11px] text-purple-600 font-bold">Con muestra validada</span>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Desviaciones Plan/Ejec</span>
            <div className="text-2xl font-black text-amber-600">{analysis.deviations.length}</div>
            <span className="text-[11px] text-amber-600 font-bold">Identificadas en ciclo</span>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Patrones Recurrentes</span>
            <div className="text-2xl font-black text-blue-900">{analysis.recurrentPatterns.length}</div>
            <span className="text-[11px] text-blue-600 font-bold">Señales longitudinales</span>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Propuestas Adaptativas</span>
            <div className="text-2xl font-black text-emerald-600">{analysis.proposals.length}</div>
            <span className="text-[11px] text-emerald-600 font-bold">Pendientes de revisión humana</span>
          </div>
        </div>
      )}

      {/* Listado de Propuestas Metodológicas Adaptativas */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Propuestas Metodológicas Adaptativas
          </h3>
          <span className="text-xs font-bold text-slate-400">
            {analysis?.proposals.length || 0} formuladas
          </span>
        </div>

        <div className="space-y-3">
          {analysis?.proposals.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">No hay propuestas adaptativas pendientes de revisión.</p>
          ) : (
            analysis?.proposals.map((prop) => (
              <div key={prop.proposal_id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-900">{prop.equipoNombre}: {prop.titulo}</span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                      Impacto {prop.impacto_potencial}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400">Prioridad #{prop.prioridad}</span>
                </div>
                <p className="text-xs text-slate-600"><strong>Observación:</strong> {prop.observacion}</p>
                <p className="text-xs text-slate-600"><strong>Interpretación:</strong> {prop.interpretacion}</p>
                <div className="pt-2 flex items-center justify-between border-t border-slate-200/60 text-[11px]">
                  <span className="text-slate-500"><strong>Evidencia:</strong> {prop.evidencia}</span>
                  <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Pendiente de confirmación humana
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
