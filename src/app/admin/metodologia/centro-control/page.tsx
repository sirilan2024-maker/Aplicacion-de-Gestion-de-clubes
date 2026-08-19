"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Building2, ChevronRight, Loader2, Trophy, Target, Activity, 
  AlertTriangle, ShieldAlert, CheckCircle2, TrendingUp, TrendingDown,
  ArrowUpDown, Filter, Printer, ExternalLink, Users, Calendar, BarChart3,
  Layers, Info, Sparkles, Check, Send, Bot, FileText, Lightbulb, AlertCircle,
  Eye, CheckCircle, Sliders, Play, ArrowRight, ShieldCheck, UserCheck,
  Scale, Compass, GitMerge, FileQuestion, HelpCircle, Briefcase, Network, RefreshCw, Zap, BookmarkCheck, CheckSquare, LayoutDashboard
} from "lucide-react";
import Link from "next/link";
import { MethodologyNavHeader } from "@/components/methodology/MethodologyNavHeader";
import {
  buildInstitutional360View,
  Institutional360ViewResult
} from "@/lib/methodology/methodologyInstitutionalOrchestrationEngine";

export default function MethodologyControlCenter360Page() {
  const supabase = createClient();

  const [isLoading, setIsLoading] = useState(true);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
  const [view360, setView360] = useState<Institutional360ViewResult | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedSeasonId) {
      load360Data(selectedSeasonId);
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
      console.error("Error cargando temporadas en centro de control:", err);
      setIsLoading(false);
    }
  };

  const load360Data = async (seasonId: string) => {
    setIsLoading(true);
    try {
      const res = buildInstitutional360View({
        clubId: "club-sporting-saladar",
        executiveKpis: { activeTeamsCount: 6, globalEvaluationPercentage: 82.5 },
        qualityAssessment: {
          qualityProfile: "ALTA",
          confidenceLevel: "CONFIANZA_ALTA",
          metrics: { completenessRate: 82.5 },
          alerts: []
        },
        adaptiveAnalysis: {
          proposals: [{ proposal_id: "p1", titulo: "Ajuste de Carga en Cadete A" }]
        },
        governanceDecisions: [
          { proposal_id: "p0", decision: "APROBADA", status: "EN_SEGUIMIENTO" }
        ],
        simulationResults: [],
        institutionalLearnings: [{ learning_id: "l1" }]
      });

      setView360(res);
    } catch (err) {
      console.error("Error cargando visión 360:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        <p className="text-sm font-bold text-slate-500">Cargando Centro de Control Metodológico 360º...</p>
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
              Centro de Control Metodológico 360º & Orquestación Institucional
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <LayoutDashboard className="w-7 h-7 text-purple-600 shrink-0" />
            Centro de Control Metodológico 360º
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Orquestación integral: Calidad → Inteligencia → Decisiones → Simulación → Resultados → Aprendizaje.
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
            href="/admin/metodologia/calidad"
            className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition-all"
          >
            <CheckSquare className="w-4 h-4" />
            Auditoría de Calidad
          </Link>
        </div>
      </div>

      {/* Tarjetas del Perfil de Salud Metodológica 360º */}
      {view360 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Equipos Auditados</span>
            <div className="text-2xl font-black text-slate-900">{view360.healthProfile.activeTeams}</div>
            <span className="text-[11px] text-purple-600 font-bold">Visión transversal club</span>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Calidad y Confianza</span>
            <div className="text-2xl font-black text-emerald-600">{view360.healthProfile.quality}</div>
            <span className="text-[11px] text-emerald-600 font-bold">{view360.healthProfile.confidence.replace("CONFIANZA_", "")}</span>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Ciclo Completo</span>
            <div className="text-2xl font-black text-blue-900">{view360.healthProfile.cycleCompleteness}%</div>
            <span className="text-[11px] text-blue-600 font-bold">Evaluaciones registradas</span>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Decisiones en Curso</span>
            <div className="text-2xl font-black text-purple-900">{view360.healthProfile.activeDecisionsCount}</div>
            <span className="text-[11px] text-purple-600 font-bold">{view360.healthProfile.openProposalsCount} propuestas abiertas</span>
          </div>
        </div>
      )}

      {/* Grid: Trazabilidad y Grafo de Relaciones Metodológicas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-purple-600" />
            Grafo de Trazabilidad Metodológica
          </h3>
          <div className="space-y-2.5 text-xs text-slate-600">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <span>Propuestas pendientes de decisión directiva:</span>
              <span className="font-black text-slate-900">{view360?.traceabilityGraph.proposalsWithoutDecision}</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <span>Decisiones aprobadas sin seguimiento pendiente:</span>
              <span className="font-black text-slate-900">{view360?.traceabilityGraph.decisionsWithoutFollowUp}</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <span>Simulaciones prospectivas contrastadas:</span>
              <span className="font-black text-slate-900">{view360?.traceabilityGraph.simulationsEvaluated}</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Conflictos y Alertas Transversales
          </h3>
          <div className="space-y-2.5 text-xs">
            {view360?.conflicts.length === 0 && view360?.consolidatedAlerts.length === 0 ? (
              <p className="text-emerald-600 font-bold py-6 text-center">Sin conflictos metodológicos ni alertas críticas abiertas.</p>
            ) : (
              view360?.conflicts.map((c, idx) => (
                <div key={idx} className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-amber-900">
                  <span className="font-black block">{c.type}</span>
                  <p>{c.description}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
