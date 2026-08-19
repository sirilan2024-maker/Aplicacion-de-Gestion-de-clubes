"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Building2, ChevronRight, Loader2, Trophy, Target, Activity, 
  AlertTriangle, ShieldAlert, CheckCircle2, TrendingUp, TrendingDown,
  ArrowUpDown, Filter, Printer, ExternalLink, Users, Calendar, BarChart3,
  Layers, Info, Sparkles, Check, Send, Bot, FileText, Lightbulb, AlertCircle,
  Eye, CheckCircle, Sliders, Play, ArrowRight, ShieldCheck, UserCheck,
  Scale, Compass, GitMerge, FileQuestion, HelpCircle
} from "lucide-react";
import Link from "next/link";
import { 
  buildSeasonMethodologyReportFromData,
  SeasonMethodologyReport 
} from "@/lib/methodology/seasonMethodologyReportService";
import {
  evaluateTeamMethodologyStatus,
  calculateClubGlobalKpis,
  buildClubTeamsMatrix,
  generateClubTransversalAlerts,
  compareSpecificTeams,
  calculateClubMonthlyEvolution,
  ClubGlobalKpis,
  TeamRowOverview,
  TransversalAlert,
  ClubMonthlyEvolutionPoint
} from "@/lib/methodology/sportsDirectionService";
import { simulateScenario } from "@/lib/methodology/methodologyScenarioSimulationService";
import { compareScenarios } from "@/lib/methodology/methodologyScenarioComparisonService";

export default function MethodologyDecisionCenterPage() {
  const supabase = createClient();

  const [isLoading, setIsLoading] = useState(true);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
  const [alerts, setAlerts] = useState<TransversalAlert[]>([]);
  const [teamsMatrix, setTeamsMatrix] = useState<TeamRowOverview[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<TransversalAlert | null>(null);

  // Simulación en memoria
  const [activeSimulation, setActiveSimulation] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedSeasonId) {
      loadSeasonAlerts(selectedSeasonId);
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
      console.error("Error cargando temporadas:", err);
      setIsLoading(false);
    }
  };

  const loadSeasonAlerts = async (seasonId: string) => {
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

      const generatedAlerts = generateClubTransversalAlerts(seasonReports);
      setAlerts(generatedAlerts);
      const matrix = buildClubTeamsMatrix(seasonReports);
      setTeamsMatrix(matrix);
      if (generatedAlerts.length > 0) {
        setSelectedAlert(generatedAlerts[0]);
      }
    } catch (err) {
      console.error("Error procesando alertas de decisión:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunSimulation = (alertItem: TransversalAlert) => {
    setIsSimulating(true);
    try {
      const basePlan = {
        team: { id: alertItem.teamId, name: alertItem.teamName, category: alertItem.category },
        sessions: [
          { microcycleDay: "MD-4", durationMinutes: 90, objective: "Salida de balón", intensityLoad: 4 },
          { microcycleDay: "MD-3", durationMinutes: 85, objective: "Presión alta", intensityLoad: 4 },
          { microcycleDay: "MD-2", durationMinutes: 75, objective: "Velocidad y ABP", intensityLoad: 3 },
          { microcycleDay: "MD-1", durationMinutes: 60, objective: "Activación pre-partido", intensityLoad: 2 }
        ]
      };

      const scenarioA = simulateScenario({
        scenarioId: "sc-a",
        scenarioName: "Escenario A: Modulación de Carga en MD-3",
        basePlan,
        modifications: { loadReductionPercentage: 20 }
      });

      const scenarioB = simulateScenario({
        scenarioId: "sc-b",
        scenarioName: "Escenario B: Ajuste Táctico y Reducción Duración",
        basePlan,
        modifications: { durationDeltaMin: -15, tacticalFocus: "Transiciones y ABP" }
      });

      const comparison = compareScenarios([scenarioA, scenarioB]);
      setActiveSimulation({ scenarioA, scenarioB, comparison });
    } catch (err) {
      console.error("Error al simular escenarios:", err);
    } finally {
      setIsSimulating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        <p className="text-sm font-bold text-slate-500">Cargando Centro de Decisión Metodológica...</p>
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
              Decisión Basada en Evidencia & Coordinación
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <Compass className="w-7 h-7 text-purple-600 shrink-0" />
            Centro de Decisión Deportiva
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Diagnóstico → Alerta → Simulación de Alternativas en Memoria → Revisión Humana Soberana.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/admin/metodologia/gobernanza"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
          >
            <ShieldCheck className="w-4 h-4" />
            Gobernanza
          </Link>
          <Link
            href="/admin/metodologia/simulador"
            className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition-all"
          >
            <Sliders className="w-4 h-4" />
            Simulador Avanzado
          </Link>
        </div>
      </div>

      {/* Grid: Bandeja de Alertas vs Panel de Decisión y Simulación */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Bandeja de Alertas de Dirección (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Bandeja de Señales y Alertas
            </h3>
            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {alerts.length} activas
            </span>
          </div>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {alerts.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">No existen alertas críticas activas.</p>
            ) : (
              alerts.map((a) => (
                <div
                  key={a.id}
                  onClick={() => {
                    setSelectedAlert(a);
                    handleRunSimulation(a);
                  }}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                    selectedAlert?.id === a.id
                      ? "border-purple-600 bg-purple-50/50 shadow-sm"
                      : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-slate-900">{a.teamName}</span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                      a.severity === 'high' ? 'bg-rose-100 text-rose-800' :
                      a.severity === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {a.severity}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-purple-950 mt-1">{a.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{a.description}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Panel de Análisis y Comparación de Alternativas (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          {selectedAlert ? (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                  Evidencia Registrada
                </span>
                <h2 className="text-lg font-black text-slate-900 mt-1">
                  {selectedAlert.teamName}: {selectedAlert.title}
                </h2>
                <p className="text-xs text-slate-600 mt-1">{selectedAlert.description}</p>
                <div className="mt-2 text-[11px] text-slate-400 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <strong>Regla Activada:</strong> {selectedAlert.ruleActivated} • <strong>Evidencia:</strong> {selectedAlert.evidence.details}
                </div>
              </div>

              {/* Botón de Simulación de Alternativas */}
              <div>
                <button
                  onClick={() => handleRunSimulation(selectedAlert)}
                  disabled={isSimulating}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                >
                  <Scale className="w-4 h-4" />
                  {isSimulating ? "Simulando Escenarios..." : "Simular y Comparar Alternativas en Memoria"}
                </button>
              </div>

              {/* Resultados de la Simulación Matricial */}
              {activeSimulation && (
                <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <span className="text-xs font-black uppercase text-purple-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      Comparativa de Escenarios Simulados
                    </span>
                    <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded">
                      0 escrituras en DB
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 space-y-2">
                      <h4 className="font-black text-purple-200">{activeSimulation.scenarioA.scenarioName}</h4>
                      <p className="text-[11px] text-slate-300">
                        Carga semanal estimada: <strong>{activeSimulation.scenarioA.simulatedMetrics.estimatedWeeklyLoad}</strong>
                      </p>
                      <p className="text-[11px] text-slate-300">
                        Volumen total: <strong>{activeSimulation.scenarioA.simulatedMetrics.totalMinutes} min</strong>
                      </p>
                    </div>

                    <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 space-y-2">
                      <h4 className="font-black text-indigo-200">{activeSimulation.scenarioB.scenarioName}</h4>
                      <p className="text-[11px] text-slate-300">
                        Carga semanal estimada: <strong>{activeSimulation.scenarioB.simulatedMetrics.estimatedWeeklyLoad}</strong>
                      </p>
                      <p className="text-[11px] text-slate-300">
                        Volumen total: <strong>{activeSimulation.scenarioB.simulatedMetrics.totalMinutes} min</strong>
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 text-[11px] text-slate-400 italic">
                    La Dirección Deportiva puede revisar estas alternativas y optar por aplicar los cambios en el constructor de sesiones.
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <Compass className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-bold">Selecciona una alerta para evaluar y simular alternativas de decisión.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
