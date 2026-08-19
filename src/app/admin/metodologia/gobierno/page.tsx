"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Building2, ChevronRight, Loader2, Trophy, Target, Activity, 
  AlertTriangle, ShieldAlert, CheckCircle2, TrendingUp, TrendingDown,
  ArrowUpDown, Filter, Printer, ExternalLink, Users, Calendar, BarChart3,
  Layers, Info, Sparkles, Check, Send, Bot, FileText, Lightbulb, AlertCircle,
  Eye, CheckCircle, Sliders, Play, ArrowRight, ShieldCheck, UserCheck,
  Scale, Compass, GitMerge, FileQuestion, HelpCircle, Briefcase, Network, RefreshCw, Zap, BookmarkCheck
} from "lucide-react";
import Link from "next/link";
import { 
  buildSeasonMethodologyReportFromData,
  SeasonMethodologyReport 
} from "@/lib/methodology/seasonMethodologyReportService";
import {
  analyzeAdaptiveEvolution,
  AdaptiveEvolutionAnalysisResult
} from "@/lib/methodology/methodologyAdaptiveEvolutionEngine";

export default function MethodologyInstitutionalGovernancePage() {
  const supabase = createClient();

  const [isLoading, setIsLoading] = useState(true);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
  const [analysis, setAnalysis] = useState<AdaptiveEvolutionAnalysisResult | null>(null);

  // Registro de decisiones en memoria (0 escrituras automáticas)
  const [decisions, setDecisions] = useState<any[]>([
    {
      decision_id: "dec-demo-1",
      titulo: "Planificar principios de transición para Cadete A",
      decision: "APROBADA",
      decided_by: "Director Metodológico",
      decided_at: "2026-08-18",
      scope: "EQUIPO",
      status: "EN_SEGUIMIENTO",
      justificacion: "Se constató baja cobertura curricular (40%) y se acordó modular carga."
    }
  ]);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedSeasonId) {
      loadGovernanceData(selectedSeasonId);
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
      console.error("Error cargando temporadas en gobierno:", err);
      setIsLoading(false);
    }
  };

  const loadGovernanceData = async (seasonId: string) => {
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
      console.error("Error analizando gobierno metodológico:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecide = (proposal: any, decisionType: string) => {
    const newDec = {
      decision_id: `dec-${proposal.proposal_id}-${Date.now()}`,
      titulo: proposal.titulo,
      decision: decisionType,
      decided_by: "Director Metodológico (Sesión Actual)",
      decided_at: new Date().toISOString().split("T")[0],
      scope: proposal.alcance || "EQUIPO",
      status: decisionType === "APROBADA" ? "EN_SEGUIMIENTO" : "CERRADA",
      justificacion: `Decisión registrada soberanamente sobre la propuesta ${proposal.proposal_id}.`
    };

    setDecisions([newDec, ...decisions]);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        <p className="text-sm font-bold text-slate-500">Cargando Centro de Gobierno Metodológico...</p>
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
              Gobierno Metodológico & Aprendizaje Institucional
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <BookmarkCheck className="w-7 h-7 text-purple-600 shrink-0" />
            Centro de Gobierno Metodológico
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Propuestas → Validación Humana → Registro de Decisiones → Seguimiento de Resultados → Aprendizaje Institucional.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
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
            href="/admin/metodologia/evolucion"
            className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition-all"
          >
            <Zap className="w-4 h-4" />
            Evolución Adaptativa
          </Link>
        </div>
      </div>

      {/* Grid: Propuestas Pendientes vs Registro de Decisiones y Seguimiento */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Propuestas Pendientes de Decisión Humana (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Propuestas Metodológicas en Revisión
            </h3>
            <span className="text-xs font-bold text-slate-400">
              {analysis?.proposals.length || 0} pendientes
            </span>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {analysis?.proposals.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">No hay propuestas pendientes de validación.</p>
            ) : (
              analysis?.proposals.map((p) => (
                <div key={p.proposal_id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div>
                    <span className="text-xs font-black text-slate-900 block">{p.equipoNombre}: {p.titulo}</span>
                    <p className="text-[11px] text-slate-500 mt-1">{p.observacion}</p>
                    <p className="text-[11px] text-purple-950 font-medium mt-0.5"><strong>Interpretación:</strong> {p.interpretacion}</p>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleDecide(p, "APROBADA")}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-all"
                    >
                      Aprobar
                    </button>
                    <button
                      onClick={() => handleDecide(p, "RECHAZADA")}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg transition-all"
                    >
                      Rechazar
                    </button>
                    <button
                      onClick={() => handleDecide(p, "DEVUELTA")}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg transition-all"
                    >
                      Devolver
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Registro y Seguimiento de Decisiones Institucionales (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <BookmarkCheck className="w-5 h-5 text-emerald-600" />
              Historial de Decisiones & Seguimiento
            </h3>
            <span className="text-xs font-bold text-slate-400">
              {decisions.length} registradas
            </span>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {decisions.map((d) => (
              <div key={d.decision_id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900">{d.titulo}</span>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                    d.decision === "APROBADA" ? "bg-emerald-100 text-emerald-800" :
                    d.decision === "RECHAZADA" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
                  }`}>
                    {d.decision}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">{d.justificacion}</p>
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-400 font-bold">
                  <span>Decidido por: {d.decided_by} ({d.decided_at})</span>
                  <span className="text-purple-600">Estado: {d.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
