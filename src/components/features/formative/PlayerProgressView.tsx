"use client";

import React, { useEffect, useState } from "react";
import { PlayerProgressReport } from "@/types/formative-evaluation";
import { getPlayerProgressReport } from "@/app/actions/formative-actions";
import { 
  ResponsiveContainer, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend 
} from "recharts";
import { 
  BrainCircuit, 
  TrendingUp, 
  Sparkles, 
  Target, 
  Flame, 
  Compass, 
  Activity, 
  HeartHandshake, 
  Loader2, 
  Calendar, 
  Award,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

interface PlayerProgressViewProps {
  playerId: string;
  playerName: string;
}

export function PlayerProgressView({ playerId, playerName }: PlayerProgressViewProps) {
  const [report, setReport] = useState<PlayerProgressReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, [playerId]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const data = await getPlayerProgressReport(playerId);
      setReport(data);
    } catch (err) {
      console.error("Error al cargar informe:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-slate-200">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-slate-600 text-sm font-semibold">Generando informe de aprendizaje y evolución...</p>
      </div>
    );
  }

  if (!report || !report.latest_evaluation) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
        <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
          <BrainCircuit size={28} />
        </div>
        <h3 className="font-black text-slate-900 text-base">Sin evaluaciones formativas todavía</h3>
        <p className="text-slate-500 text-xs max-w-sm mx-auto">
          Aún no se han registrado rúbricas de aprendizaje para {playerName}. Completa la primera evaluación en la pestaña de entrenamiento.
        </p>
      </div>
    );
  }

  const latest = report.latest_evaluation;

  // Analítico vs Global
  const tecnicoSummary = report.module_summaries.find(m => m.module_code === "tecnico_analitico");
  const tacticoSummary = report.module_summaries.find(m => m.module_code === "tactico_global");
  const fisicoSummary = report.module_summaries.find(m => m.module_code === "fisico_coordinativo");
  const socioSummary = report.module_summaries.find(m => m.module_code === "socio_afectivo");

  return (
    <div className="space-y-6">
      {/* ─── 1. Tarjetas Resumen por Módulos ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-5 rounded-3xl text-white shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-100">Técnico-Analítico</span>
            <Flame size={18} className="text-amber-200" />
          </div>
          <div className="text-3xl font-black">{tecnicoSummary?.average_score || "-"} <span className="text-base font-bold text-amber-200">/ 5</span></div>
          <div className="text-[11px] text-amber-100 mt-1 font-medium">{tecnicoSummary?.evaluated_concepts} conceptos evaluados</div>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-5 rounded-3xl text-white shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-100">Táctico-Global</span>
            <Compass size={18} className="text-blue-200" />
          </div>
          <div className="text-3xl font-black">{tacticoSummary?.average_score || "-"} <span className="text-base font-bold text-blue-200">/ 5</span></div>
          <div className="text-[11px] text-blue-100 mt-1 font-medium">{tacticoSummary?.evaluated_concepts} conceptos evaluados</div>
        </div>

        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-5 rounded-3xl text-white shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-100">Físico-Motriz</span>
            <Activity size={18} className="text-emerald-200" />
          </div>
          <div className="text-3xl font-black">{fisicoSummary?.average_score || "-"} <span className="text-base font-bold text-emerald-200">/ 5</span></div>
          <div className="text-[11px] text-emerald-100 mt-1 font-medium">{fisicoSummary?.evaluated_concepts} conceptos evaluados</div>
        </div>

        <div className="bg-gradient-to-br from-rose-500 to-pink-600 p-5 rounded-3xl text-white shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-100">Socio-Afectivo</span>
            <HeartHandshake size={18} className="text-rose-200" />
          </div>
          <div className="text-3xl font-black">{socioSummary?.average_score || "-"} <span className="text-base font-bold text-rose-200">/ 5</span></div>
          <div className="text-[11px] text-rose-100 mt-1 font-medium">{socioSummary?.evaluated_concepts} conceptos evaluados</div>
        </div>
      </div>

      {/* ─── 2. Gráficos: Radar de Competencias y Evolución Temporal ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar de Competencias */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-2">
            <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Award className="text-amber-500" size={18} />
              Perfil de Competencias (Radar 1-5)
            </h4>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              Última Evaluación
            </span>
          </div>

          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={report.radar_data}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="concept_name" tick={{ fill: "#475569", fontSize: 10, fontWeight: 700 }} />
                <PolarRadiusAxis angle={30} domain={[0, 5]} stroke="#cbd5e1" />
                <Radar name="Puntuación" dataKey="score" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.4} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Evolución Temporal Líneas */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <TrendingUp className="text-blue-600" size={18} />
              Evolución Temporal del Aprendizaje
            </h4>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              Histórico
            </span>
          </div>

          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={report.historical_evolution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="evaluation_period" tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }} />
                <YAxis domain={[0, 5]} tick={{ fill: "#64748b", fontSize: 11 }} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: "#0f172a", borderRadius: "1rem", color: "#fff", border: "none" }}
                />
                <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                <Line type="monotone" dataKey="overall_average" name="Promedio Global" stroke="#0f172a" strokeWidth={3} dot={{ r: 5 }} />
                <Line type="monotone" dataKey="module_scores.tecnico_analitico" name="Técnico" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="module_scores.tactico_global" name="Táctico" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ─── 3. Tarjeta de Feedback Cualitativo: Fortalezas y Áreas de Mejora ─── */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <Sparkles className="text-emerald-500" size={18} />
            Evaluación Cualitativa del Cuerpo Técnico
          </h4>
          <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
            <Calendar size={13} /> {latest.evaluation_date ? new Date(latest.evaluation_date).toLocaleDateString("es-ES") : ""}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl">
            <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-xs uppercase tracking-wider mb-1.5">
              <CheckCircle2 size={16} />
              <span>Fortalezas Destacadas</span>
            </div>
            <p className="text-slate-800 text-xs leading-relaxed font-medium">
              {latest.strengths || "No se han especificado fortalezas para este periodo."}
            </p>
          </div>

          <div className="p-4 bg-rose-50/70 border border-rose-200/80 rounded-2xl">
            <div className="flex items-center gap-2 text-rose-800 font-extrabold text-xs uppercase tracking-wider mb-1.5">
              <Target size={16} />
              <span>Áreas de Mejora Prioritarias</span>
            </div>
            <p className="text-slate-800 text-xs leading-relaxed font-medium">
              {latest.areas_for_improvement || "No se han registrado áreas de mejora específicas."}
            </p>
          </div>
        </div>

        {latest.general_feedback && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="flex items-center gap-2 text-slate-700 font-extrabold text-xs uppercase tracking-wider mb-1">
              <span>Orientaciones y Mensaje para la Familia / Jugador</span>
            </div>
            <p className="text-slate-700 text-xs leading-relaxed italic">
              &ldquo;{latest.general_feedback}&rdquo;
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
