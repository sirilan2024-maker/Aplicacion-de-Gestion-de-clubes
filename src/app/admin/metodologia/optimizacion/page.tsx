"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Building2, ChevronRight, Loader2, Trophy, Target, Activity, 
  AlertTriangle, ShieldAlert, CheckCircle2, TrendingUp, TrendingDown,
  ArrowUpDown, Filter, Printer, ExternalLink, Users, Calendar, BarChart3,
  Layers, Info, Sparkles, Check, Send, Bot, FileText, Lightbulb, AlertCircle,
  Eye, CheckCircle, Sliders, Play, ArrowRight, ShieldCheck, UserCheck,
  Scale, Compass, GitMerge, FileQuestion, HelpCircle, Briefcase, Network, RefreshCw, Zap, BookmarkCheck, CheckSquare, LayoutDashboard, History, Clock, LineChart
} from "lucide-react";
import Link from "next/link";
import {
  runInstitutionalOptimizationAnalysis,
  InstitutionalOptimizationAnalysisResult
} from "@/lib/methodology/methodologyInstitutionalOptimizationEngine";

export default function MethodologyOptimizationPage() {
  const supabase = createClient();

  const [isLoading, setIsLoading] = useState(true);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
  const [analysis, setAnalysis] = useState<InstitutionalOptimizationAnalysisResult | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedSeasonId) {
      loadOptimizationData(selectedSeasonId);
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
      console.error("Error cargando temporadas en optimización:", err);
      setIsLoading(false);
    }
  };

  const loadOptimizationData = async (seasonId: string) => {
    setIsLoading(true);
    try {
      const res = runInstitutionalOptimizationAnalysis({
        clubId: "club-sporting-saladar",
        teamMetrics: [
          { teamId: "t1", teamName: "Cadete A", clubId: "club-sporting-saladar", sampleSize: 12, avgAchievement: 3.5, coveragePercentage: 75, avgRpe: 7.0 },
          { teamId: "t2", teamName: "Infantil B", clubId: "club-sporting-saladar", sampleSize: 8, avgAchievement: 2.3, coveragePercentage: 45, avgRpe: 6.2 },
          { teamId: "t3", teamName: "Alevín A", clubId: "club-sporting-saladar", sampleSize: 2, avgAchievement: 3.0, coveragePercentage: 50, avgRpe: 6.0 } // N=2
        ],
        historicalBaseline: { avgAchievement: 3.0, coveragePercentage: 60 }
      });

      setAnalysis(res);
    } catch (err) {
      console.error("Error analizando optimización institucional:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        <p className="text-sm font-bold text-slate-500">Cargando Centro de Optimización y Benchmarking Interno...</p>
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
              Optimización Institucional & Benchmarking Interno
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <LineChart className="w-7 h-7 text-purple-600 shrink-0" />
            Centro de Optimización y Oportunidades
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Benchmarking interno comparable → Patrones longitudinales → Trade-offs → Detección de buenas prácticas.
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
            href="/admin/metodologia/centro-control"
            className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition-all"
          >
            <LayoutDashboard className="w-4 h-4" />
            Centro de Control 360º
          </Link>
        </div>
      </div>

      {/* Tabla de Benchmarking Interno de Equipos */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            Benchmarking Interno de Equipos (Muestras Auditadas)
          </h3>
          <span className="text-xs font-bold text-slate-400">
            {analysis?.benchmarking.length || 0} equipos
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-400 uppercase font-black border-b border-slate-200">
              <tr>
                <th className="p-3">Equipo</th>
                <th className="p-3">Muestra (N)</th>
                <th className="p-3">Comparabilidad</th>
                <th className="p-3">Consecución Media</th>
                <th className="p-3">Δ vs Baseline</th>
                <th className="p-3">Cobertura Curricular</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {analysis?.benchmarking.map((b) => (
                <tr key={b.teamId} className="hover:bg-slate-50/60">
                  <td className="p-3 font-bold text-slate-900">{b.teamName}</td>
                  <td className="p-3 font-semibold">{b.sampleSize} sesiones</td>
                  <td className="p-3">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                      b.comparability === "COMPARABLE_ROBUSTA" ? "bg-emerald-100 text-emerald-800" :
                      b.comparability === "EVIDENCIA_INSUFICIENTE" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"
                    }`}>
                      {b.comparability}
                    </span>
                  </td>
                  <td className="p-3 font-black text-slate-900">{b.avgAchievement}/4</td>
                  <td className="p-3 font-black">
                    <span className={b.deltaVsBaseline >= 0 ? "text-emerald-600" : "text-rose-600"}>
                      {b.deltaVsBaseline > 0 ? `+${b.deltaVsBaseline}` : b.deltaVsBaseline}
                    </span>
                  </td>
                  <td className="p-3 font-bold text-slate-700">{b.coveragePercentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grid: Oportunidades Metodológicas y Trade-offs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            Oportunidades de Mejora y Replicación
          </h3>
          <div className="space-y-3">
            {analysis?.opportunities.map((opp) => (
              <div key={opp.opportunity_id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900">{opp.tipo}</span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                    {opp.prioridad}
                  </span>
                </div>
                <p className="text-xs text-slate-600">{opp.descripcion}</p>
                <div className="pt-1 text-[11px] text-purple-950 font-medium">
                  <strong>Recomendación:</strong> {opp.recomendacion}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Scale className="w-5 h-5 text-rose-500" />
            Análisis de Trade-offs y Sobreoptimización
          </h3>
          <div className="space-y-3">
            {analysis?.tradeOffs.length === 0 ? (
              <p className="text-xs text-emerald-600 font-bold py-6 text-center">
                Equilibrio metodológico óptimo. Sin sobreoptimización ni trade-offs críticos.
              </p>
            ) : (
              analysis?.tradeOffs.map((t, idx) => (
                <div key={idx} className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-1 text-rose-900">
                  <span className="text-xs font-black block">{t.type}</span>
                  <p className="text-xs">{t.description}</p>
                  <p className="text-[11px] font-bold mt-1">Recomendación: {t.recommendation}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
