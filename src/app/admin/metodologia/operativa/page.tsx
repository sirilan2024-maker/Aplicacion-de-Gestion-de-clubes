"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Building2, ChevronRight, Loader2, Trophy, Target, Activity, 
  AlertTriangle, ShieldAlert, CheckCircle2, TrendingUp, TrendingDown,
  Calendar, Users, Clock, Sparkles, Bot, Check, ArrowRight, Play, FileText,
  Sliders, Plus, CheckCircle, HelpCircle, ThumbsUp, ThumbsDown
} from "lucide-react";
import Link from "next/link";
import { calculatePlannedVsExecutedFeedback } from "@/lib/methodology/sessionExecutionFeedbackService";
import { generatePostSessionFeedback } from "@/lib/methodology/ai/methodologyAIPostSessionService";

export default function MethodologyOperativeDashboardPage() {
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(true);
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [selectedSessionFeedback, setSelectedSessionFeedback] = useState<any>(null);
  const [feedbackSent, setFeedbackSent] = useState<boolean>(false);

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
        await loadTeamSessions(teamsData[0].id);
      }
    } catch (err) {
      console.error("Error cargando panel operativo:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTeamSessions = async (teamId: string) => {
    const { data: sessions } = await supabase
      .from("training_sessions")
      .select("*, session_evaluations(*, session_behaviour_evaluations(*))")
      .eq("team_id", teamId)
      .order("date_time", { ascending: false })
      .limit(5);

    setRecentSessions(sessions || []);
    if (sessions && sessions.length > 0) {
      const latest = sessions[0];
      const fb = generatePostSessionFeedback({
        session: latest,
        evaluation: latest.session_evaluations?.[0],
        history: sessions.slice(1)
      });
      setSelectedSessionFeedback(fb);
    } else {
      setSelectedSessionFeedback(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        <p className="text-sm font-bold text-slate-500">Cargando Centro Operativo Metodológico...</p>
      </div>
    );
  }

  const latestSession = recentSessions.length > 0 ? recentSessions[0] : null;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header con Accesos Directos Operativos */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-800">
              Operativa & Ciclo Metodológico
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <Activity className="w-7 h-7 text-purple-600 shrink-0" />
            Centro Operativo del Entrenador
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Flujo diario: Planificación → Ejecución → Evaluación → Diagnóstico IA → Replanificación.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedTeamId}
            onChange={(e) => {
              setSelectedTeamId(e.target.value);
              loadTeamSessions(e.target.value);
            }}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-purple-500"
          >
            {teams.map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
            ))}
          </select>

          <Link
            href="/admin/metodologia/sesiones/nueva"
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Nueva Sesión
          </Link>

          <Link
            href="/admin/metodologia/simulador"
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
          >
            <Sliders className="w-4 h-4" />
            Simulador
          </Link>
        </div>
      </div>

      {/* Widget Rápido: Foco de la Jornada Actual / Última */}
      {latestSession && (
        <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-purple-500/30 text-purple-300">
                Última Jornada Registrada: {latestSession.microcycle_day || "MD-3"}
              </span>
              <span className="text-xs text-slate-400">
                {new Date(latestSession.date_time).toLocaleDateString()}
              </span>
            </div>
            <h4 className="text-base font-black text-white">
              {latestSession.objective || "Entrenamiento táctico general"}
            </h4>
          </div>

          <div className="flex items-center gap-3">
            {latestSession.session_evaluations?.length > 0 ? (
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
                Evaluada ({latestSession.session_evaluations[0].objective_achievement}/4)
              </span>
            ) : (
              <Link
                href={`/admin/metodologia/sesiones/${latestSession.id}/evaluacion`}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all"
              >
                Completar Evaluación Ahora
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Feedback Post-Sesión IA Estructurado */}
      {selectedSessionFeedback && (
        <div className="bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-purple-700/40 pb-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/30 flex items-center gap-1 w-fit">
                <Sparkles className="w-3 h-3 text-purple-300" />
                Diagnóstico & Feedback IA
              </span>
              <h3 className="text-xl font-black tracking-tight mt-1">
                {selectedSessionFeedback.answer}
              </h3>
            </div>
            {selectedSessionFeedback.dataSufficiency?.notice && (
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {selectedSessionFeedback.dataSufficiency.notice}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
              <span className="text-xs font-black uppercase text-blue-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Hechos Observables
              </span>
              <ul className="space-y-1 text-xs text-slate-300">
                {selectedSessionFeedback.facts.map((f: string, i: number) => (
                  <li key={i}>• {f}</li>
                ))}
              </ul>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
              <span className="text-xs font-black uppercase text-purple-300 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                Interpretación Metodológica
              </span>
              <ul className="space-y-1 text-xs text-slate-300">
                {selectedSessionFeedback.interpretations.map((item: string, i: number) => (
                  <li key={i}>• {item}</li>
                ))}
              </ul>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
              <span className="text-xs font-black uppercase text-emerald-300 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                Recomendación Siguiente Jornada
              </span>
              <ul className="space-y-1 text-xs text-slate-300">
                {selectedSessionFeedback.recommendations.map((r: string, i: number) => (
                  <li key={i}>• {r}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Feedback Humano Rápido */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
            <span>¿Te resulta útil este diagnóstico consultivo?</span>
            <div className="flex items-center gap-2">
              {feedbackSent ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Gracias por tu feedback
                </span>
              ) : (
                <>
                  <button
                    onClick={() => setFeedbackSent(true)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg transition-all text-[11px] font-bold"
                  >
                    <ThumbsUp className="w-3 h-3" /> Útil
                  </button>
                  <button
                    onClick={() => setFeedbackSent(true)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg transition-all text-[11px] font-bold"
                  >
                    <ThumbsDown className="w-3 h-3" /> Parcial
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Historial de Sesiones */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            Historial de Sesiones del Equipo
          </h3>
          <Link
            href="/admin/metodologia/sesiones"
            className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1"
          >
            Ver todas <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        
        <div className="divide-y divide-slate-100">
          {recentSessions.map((s) => {
            const hasEval = s.session_evaluations && s.session_evaluations.length > 0;
            const evalData = hasEval ? s.session_evaluations[0] : null;

            return (
              <div key={s.id} className="py-3.5 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{s.objective || "Sin objetivo"}</span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {s.microcycle_day || "MD"}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    {new Date(s.date_time).toLocaleDateString()} • {s.duration_minutes} min planificados
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {hasEval ? (
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                      Evaluada ({evalData.objective_achievement}/4)
                    </span>
                  ) : (
                    <Link
                      href={`/admin/metodologia/sesiones/${s.id}/evaluacion`}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition-all"
                    >
                      Evaluar Sesión
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
