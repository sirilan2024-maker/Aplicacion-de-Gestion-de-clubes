"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Building2, ChevronRight, Loader2, Trophy, Target, Activity, 
  AlertTriangle, ShieldAlert, CheckCircle2, TrendingUp, TrendingDown,
  ArrowUpDown, Filter, Printer, ExternalLink, Users, Calendar, BarChart3,
  Layers, Info, Sparkles, Check, Send, Bot, FileText, Lightbulb, AlertCircle,
  Eye, CheckCircle, Sliders, Play, ArrowRight, ShieldCheck, UserCheck,
  Scale, Compass, GitMerge, FileQuestion, HelpCircle, Briefcase, Network, RefreshCw, Zap, BookmarkCheck, CheckSquare
} from "lucide-react";
import Link from "next/link";
import {
  assessDataQuality,
  DataQualityAssessmentResult
} from "@/lib/methodology/methodologyDataQualityEngine";

export default function MethodologyQualityAssurancePage() {
  const supabase = createClient();

  const [isLoading, setIsLoading] = useState(true);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
  const [assessment, setAssessment] = useState<DataQualityAssessmentResult | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedSeasonId) {
      loadQualityData(selectedSeasonId);
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
      console.error("Error cargando temporadas en calidad:", err);
      setIsLoading(false);
    }
  };

  const loadQualityData = async (seasonId: string) => {
    setIsLoading(true);
    try {
      const { data: sessions } = await supabase.from("training_sessions").select("id, date_time, objective");
      const { data: evaluations } = await supabase.from("session_evaluations").select("id, objective_achievement, session_rpe");
      const { data: teams } = await supabase.from("teams").select("id");

      const result = assessDataQuality({
        sessions: sessions || [],
        evaluations: evaluations || [],
        teamCount: teams?.length || 0,
        clubId: "club-sporting-saladar"
      });

      setAssessment(result);
    } catch (err) {
      console.error("Error auditando calidad de datos:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        <p className="text-sm font-bold text-slate-500">Cargando Centro de Garantía y Control de Calidad...</p>
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
              Garantía de Calidad Metodológica & Auditoría de Datos
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <CheckSquare className="w-7 h-7 text-purple-600 shrink-0" />
            Centro de Garantía y Control de Calidad
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Calidad del Dato ≠ Calidad de la Decisión ≠ Calidad del Resultado (Auditoría determinista de procesos).
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
            href="/admin/metodologia/simulacion"
            className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition-all"
          >
            <Scale className="w-4 h-4" />
            Simulador de Escenarios
          </Link>
        </div>
      </div>

      {/* Tarjetas de Métricas de Calidad */}
      {assessment && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Completitud del Ciclo</span>
            <div className="text-2xl font-black text-purple-900">{assessment.metrics.completenessRate}%</div>
            <span className="text-[11px] text-purple-600 font-bold">{assessment.metrics.evaluatedSessions} de {assessment.metrics.totalSessions} sesiones</span>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Perfil de Calidad</span>
            <div className="text-2xl font-black text-emerald-600">{assessment.qualityProfile}</div>
            <span className="text-[11px] text-emerald-600 font-bold">Consistencia de datos</span>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Grado de Confianza</span>
            <div className="text-2xl font-black text-blue-900">{assessment.confidenceLevel.replace("CONFIANZA_", "")}</div>
            <span className="text-[11px] text-blue-600 font-bold">Sin sesgo predictivo</span>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Alertas de Calidad</span>
            <div className="text-2xl font-black text-rose-600">{assessment.alerts.length}</div>
            <span className="text-[11px] text-rose-500 font-bold">Señales auditadas</span>
          </div>
        </div>
      )}

      {/* Listado de Alertas de Calidad Metodológica */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Alertas de Calidad y Trazabilidad Metodológica
          </h3>
          <span className="text-xs font-bold text-slate-400">
            {assessment?.alerts.length || 0} registradas
          </span>
        </div>

        <div className="space-y-3">
          {assessment?.alerts.length === 0 ? (
            <p className="text-xs text-emerald-600 font-bold py-4 text-center">
              Auditoría superada: 100% de datos consistentes y trazables en el ciclo metodológico.
            </p>
          ) : (
            assessment?.alerts.map((alt) => (
              <div key={alt.alert_id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900">{alt.tipo}</span>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                    alt.severidad === "CRITICA" ? "bg-rose-100 text-rose-800" :
                    alt.severidad === "ALTA" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                  }`}>
                    {alt.severidad}
                  </span>
                </div>
                <p className="text-xs text-slate-600">{alt.descripcion}</p>
                <div className="pt-1 text-[11px] text-purple-950 font-medium">
                  <strong>Recomendación directiva:</strong> {alt.recomendacion}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
