"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Building2, ChevronRight, Loader2, Trophy, Target, Activity, 
  AlertTriangle, ShieldAlert, CheckCircle2, TrendingUp, TrendingDown,
  Calendar, Users, Clock, Sparkles, Bot, Check, ArrowRight, Play, FileText,
  Sliders, Copy, RefreshCw, Layers, ShieldCheck
} from "lucide-react";
import { simulateScenario } from "@/lib/methodology/methodologyScenarioSimulationService";
import { compareScenarios } from "@/lib/methodology/methodologyScenarioComparisonService";
import { generateAIScenarioReview } from "@/lib/methodology/ai/methodologyAIScenarioReviewService";

export default function MethodologySimulatorPage() {
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(true);
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [basePlan, setBasePlan] = useState<any>({
    objective: "Salida de balón y progresión",
    durationMinutes: 90,
    intensityLoad: "Media-Alta",
    microcycleDay: "MD-3"
  });

  const [scenarios, setScenarios] = useState<any[]>([]);
  const [comparisonResult, setComparisonResult] = useState<any>(null);
  const [aiReview, setAiReview] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const { data: teamsData } = await supabase.from("teams").select("*").order("name");
      if (teamsData && teamsData.length > 0) {
        setTeams(teamsData);
        setSelectedTeamId(teamsData[0].id);
        initScenarios(teamsData[0]);
      }
    } catch (err) {
      console.error("Error cargando simulador:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const initScenarios = (teamObj: any) => {
    const scA = simulateScenario({
      scenarioId: "sc-A",
      label: "Escenario A (Plan Base)",
      basePlan,
      team: teamObj
    });

    const scB = simulateScenario({
      scenarioId: "sc-B",
      label: "Escenario B (Carga Reducida)",
      basePlan,
      modifications: { durationMinutes: 70, intensityLoad: "Baja", microcycleDay: "MD-3" },
      team: teamObj
    });

    const scList = [scA, scB];
    setScenarios(scList);

    const comp = compareScenarios(scList);
    setComparisonResult(comp);

    const rev = generateAIScenarioReview({
      scenarios: scList,
      team: teamObj,
      sampleSize: 4
    });
    setAiReview(rev);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        <p className="text-sm font-bold text-slate-500">Cargando Simulador Metodológico...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-800">
              Simulación & Decisión Asistida
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <Sliders className="w-7 h-7 text-purple-600 shrink-0" />
            Simulador de Escenarios Metodológicos
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Compare alternativas de planificación en memoria antes de trasladarlas al constructor de sesiones.
          </p>
        </div>

        <select
          value={selectedTeamId}
          onChange={(e) => {
            setSelectedTeamId(e.target.value);
            const t = teams.find(team => team.id === e.target.value);
            if (t) initScenarios(t);
          }}
          className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-purple-500"
        >
          {teams.map(t => (
            <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
          ))}
        </select>
      </div>

      {aiReview && (
        <div className="bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-purple-700/40 pb-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/30 flex items-center gap-1 w-fit">
                <Sparkles className="w-3 h-3 text-purple-300" />
                Explicación Consultiva IA
              </span>
              <h3 className="text-xl font-black tracking-tight mt-1">
                {aiReview.answer}
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
              <span className="text-xs font-black uppercase text-blue-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Hechos Comparados
              </span>
              <ul className="space-y-1 text-xs text-slate-300">
                {aiReview.facts.map((f: string, i: number) => (
                  <li key={i}>• {f}</li>
                ))}
              </ul>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
              <span className="text-xs font-black uppercase text-purple-300 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                Evaluación de Riesgos
              </span>
              <ul className="space-y-1 text-xs text-slate-300">
                {aiReview.interpretations.map((item: string, i: number) => (
                  <li key={i}>• {item}</li>
                ))}
              </ul>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
              <span className="text-xs font-black uppercase text-emerald-300 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                Recomendaciones
              </span>
              <ul className="space-y-1 text-xs text-slate-300">
                {aiReview.recommendations.map((r: string, i: number) => (
                  <li key={i}>• {r}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {scenarios.map((sc) => (
          <div key={sc.scenarioId} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-base font-black text-slate-900">{sc.label}</span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                {sc.simulated.targetLoad}
              </span>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <div><strong>Duración:</strong> {sc.simulated.durationMin} min (Δ={sc.deviations.durationDiffMin} min)</div>
              <div><strong>Objetivo:</strong> {sc.simulated.objective}</div>
              <div><strong>Idoneidad:</strong> <span className="font-bold text-purple-700">{sc.methodologyImpact.suitabilityScore}</span></div>
            </div>

            {sc.risks.length > 0 && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold">
                ⚠️ {sc.risks.join(' ')}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
