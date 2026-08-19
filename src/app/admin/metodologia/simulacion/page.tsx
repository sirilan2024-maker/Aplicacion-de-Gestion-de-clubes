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
import { MethodologyNavHeader } from "@/components/methodology/MethodologyNavHeader";
import {
  runMethodologyScenarioSimulation,
  ScenarioSimulationResult
} from "@/lib/methodology/methodologyScenarioSimulationEngine";

export default function MethodologyScenarioSimulationPage() {
  const supabase = createClient();

  const [isLoading, setIsLoading] = useState(false);
  const [coverageDelta, setCoverageDelta] = useState<number>(15);
  const [tacticalLoadDelta, setTacticalLoadDelta] = useState<number>(0);
  const [durationDelta, setDurationDelta] = useState<number>(0);
  const [simulationResult, setSimulationResult] = useState<ScenarioSimulationResult | null>(null);

  useEffect(() => {
    handleRunSimulation();
  }, [coverageDelta, tacticalLoadDelta, durationDelta]);

  const handleRunSimulation = () => {
    setIsLoading(true);
    try {
      const res = runMethodologyScenarioSimulation({
        scenarioId: "sc-live-sim",
        name: "Escenario de Modulación Táctica y Cobertura",
        baseline: { coveragePercentage: 55, avgAchievement: 3.1, avgRpe: 6.8 },
        variables: {
          coverageDeltaPercentage: coverageDelta,
          tacticalLoadDeltaPercentage: tacticalLoadDelta,
          durationDeltaMin: durationDelta
        },
        sampleSize: 8,
        clubId: "club-sporting-saladar"
      });
      setSimulationResult(res);
    } catch (err) {
      console.error("Error al ejecutar simulación:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-800">
              Simulación Metodológica & Anticipación Institucional
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <Scale className="w-7 h-7 text-purple-600 shrink-0" />
            Centro de Simulación de Escenarios
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Modelado prospectivo condicionado a supuestos (Simulación ≠ Predicción Garantizada).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <MethodologyNavHeader />

          <Link
            href="/admin/metodologia/gobierno"
            className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition-all"
          >
            <BookmarkCheck className="w-4 h-4" />
            Gobierno Metodológico
          </Link>
        </div>
      </div>

      {/* Aviso Ineludible de Naturaleza Hipotética */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 space-y-0.5">
          <p className="font-black uppercase tracking-wider text-[10px]">Aviso Metodológico de Simulación Prospectiva</p>
          <p>
            Este resultado representa un <strong>escenario hipotético</strong> condicionado a los datos y supuestos seleccionados.
            <strong> No constituye una predicción garantizada</strong> ni ejecuta cambios automáticos sobre los planes de entrenamiento.
          </p>
        </div>
      </div>

      {/* Grid: Controles de Variables vs Resultados del Escenario */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Panel de Modulación de Variables (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-purple-600" />
            Variables de Simulación
          </h3>

          <div className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between font-bold text-slate-700">
                <span>Δ Cobertura de Currículo</span>
                <span className="text-purple-600 font-black">{coverageDelta > 0 ? `+${coverageDelta}` : coverageDelta}%</span>
              </div>
              <input
                type="range"
                min="-30"
                max="30"
                value={coverageDelta}
                onChange={(e) => setCoverageDelta(Number(e.target.value))}
                className="w-full accent-purple-600"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between font-bold text-slate-700">
                <span>Δ Carga Táctica Estimada</span>
                <span className="text-purple-600 font-black">{tacticalLoadDelta > 0 ? `+${tacticalLoadDelta}` : tacticalLoadDelta}%</span>
              </div>
              <input
                type="range"
                min="-20"
                max="20"
                value={tacticalLoadDelta}
                onChange={(e) => setTacticalLoadDelta(Number(e.target.value))}
                className="w-full accent-purple-600"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between font-bold text-slate-700">
                <span>Δ Duración Media Sesión (min)</span>
                <span className="text-purple-600 font-black">{durationDelta > 0 ? `+${durationDelta}` : durationDelta} min</span>
              </div>
              <input
                type="range"
                min="-20"
                max="20"
                value={durationDelta}
                onChange={(e) => setDurationDelta(Number(e.target.value))}
                className="w-full accent-purple-600"
              />
            </div>
          </div>
        </div>

        {/* Panel de Resultados y Evaluación de Riesgos (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Impacto y Métricas Simuladas
            </h3>
            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              Evidencia {simulationResult?.evidenceLevel}
            </span>
          </div>

          {simulationResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Cobertura</span>
                  <div className="text-lg font-black text-slate-900">{simulationResult.simulated.coveragePercentage}%</div>
                  <span className={`text-[10px] font-bold ${simulationResult.deltas.coverage >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    Δ {simulationResult.deltas.coverage > 0 ? `+${simulationResult.deltas.coverage}` : simulationResult.deltas.coverage}%
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Consecución</span>
                  <div className="text-lg font-black text-slate-900">{simulationResult.simulated.avgAchievement}/4</div>
                  <span className={`text-[10px] font-bold ${simulationResult.deltas.achievement >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    Δ {simulationResult.deltas.achievement > 0 ? `+${simulationResult.deltas.achievement}` : simulationResult.deltas.achievement}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">RPE Estimado</span>
                  <div className="text-lg font-black text-slate-900">{simulationResult.simulated.avgRpe}/10</div>
                  <span className="text-[10px] font-bold text-slate-500">
                    Δ {simulationResult.deltas.rpe > 0 ? `+${simulationResult.deltas.rpe}` : simulationResult.deltas.rpe}
                  </span>
                </div>
              </div>

              {/* Evaluación de Riesgos */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-black text-slate-900 block">Riesgos Metodológicos Identificados:</span>
                {simulationResult.risks.length === 0 ? (
                  <p className="text-xs text-emerald-600 font-bold">Sin riesgos críticos detectados en los rangos actuales.</p>
                ) : (
                  simulationResult.risks.map((r, i) => (
                    <div key={i} className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-0.5">
                      <span className="font-bold">{r.type}: </span>
                      <span>{r.description}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
