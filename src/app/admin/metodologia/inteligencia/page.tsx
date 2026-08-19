"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Building2, ChevronRight, Loader2, Trophy, Target, Activity, 
  AlertTriangle, ShieldAlert, CheckCircle2, TrendingUp, TrendingDown,
  Calendar, Users, Clock, Sparkles, Bot, Check, ArrowRight, Play, FileText,
  Brain, BarChart3, LineChart, Shield
} from "lucide-react";
import Link from "next/link";
import { calculateLongitudinalMemory } from "@/lib/methodology/methodologyLongitudinalMemoryService";
import { detectLongitudinalPatterns } from "@/lib/methodology/methodologyPatternDetectionService";
import { generateAIWeeklyReview } from "@/lib/methodology/ai/methodologyAIWeeklyReviewService";

export default function MethodologyIntelligenceDashboardPage() {
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(true);
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [reviewData, setReviewData] = useState<any>(null);

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
        await analyzeTeam(teamsData[0].id, teamsData[0]);
      }
    } catch (err) {
      console.error("Error en panel de inteligencia:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeTeam = async (teamId: string, teamObj?: any) => {
    const currentTeam = teamObj || teams.find(t => t.id === teamId);
    if (!currentTeam) return;

    const { data: sessions } = await supabase
      .from("training_sessions")
      .select("*, session_evaluations(*, session_behaviour_evaluations(*))")
      .eq("team_id", teamId)
      .order("date_time", { ascending: true });

    const { data: principles } = await supabase
      .from("methodology_principles")
      .select("id, name, game_phase");

    const review = generateAIWeeklyReview({
      team: currentTeam,
      sessions: sessions || [],
      curriculumPrinciples: principles || []
    });

    setReviewData(review);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        <p className="text-sm font-bold text-slate-500">Cargando Centro de Inteligencia Metodológica...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-800">
              Inteligencia Longitudinal
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <Brain className="w-7 h-7 text-purple-600 shrink-0" />
            Centro de Inteligencia & Aprendizaje Metodológico
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Detección de patrones temporales, evolución de prioridades y diagnóstico continuo.
          </p>
        </div>

        <select
          value={selectedTeamId}
          onChange={(e) => {
            setSelectedTeamId(e.target.value);
            analyzeTeam(e.target.value);
          }}
          className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-purple-500"
        >
          {teams.map(t => (
            <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
          ))}
        </select>
      </div>

      {reviewData && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-purple-700/40 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/30 flex items-center gap-1 w-fit">
                  <Sparkles className="w-3 h-3 text-purple-300" />
                  Diagnóstico Longitudinal IA
                </span>
                <h3 className="text-xl font-black tracking-tight mt-1">
                  {reviewData.answer}
                </h3>
              </div>
              {reviewData.dataSufficiency?.notice && (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {reviewData.dataSufficiency.notice}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
                <span className="text-xs font-black uppercase text-blue-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Hechos Auditados
                </span>
                <ul className="space-y-1 text-xs text-slate-300">
                  {reviewData.facts.map((f: string, i: number) => (
                    <li key={i}>• {f}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
                <span className="text-xs font-black uppercase text-purple-300 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" />
                  Interpretación & Patrones
                </span>
                <ul className="space-y-1 text-xs text-slate-300">
                  {reviewData.interpretations.map((item: string, i: number) => (
                    <li key={i}>• {item}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
                <span className="text-xs font-black uppercase text-emerald-300 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" />
                  Recomendaciones Institucionales
                </span>
                <ul className="space-y-1 text-xs text-slate-300">
                  {reviewData.recommendations.map((r: string, i: number) => (
                    <li key={i}>• {r}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {reviewData.evolution?.patterns && reviewData.evolution.patterns.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <LineChart className="w-5 h-5 text-purple-600" />
                Patrones Metodológicos Confirmados
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {reviewData.evolution.patterns.map((p: any) => (
                  <div key={p.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{p.title}</span>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                        {p.type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{p.description}</p>
                    <div className="text-[10px] text-slate-400 font-bold pt-1">
                      Evidencia: {p.evidence.join(" • ")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
