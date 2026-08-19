"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Building2, ChevronRight, Loader2, Trophy, Target, Activity, 
  AlertTriangle, ShieldAlert, CheckCircle2, TrendingUp, TrendingDown,
  ArrowUpDown, Filter, Printer, ExternalLink, Users, Calendar, BarChart3,
  Layers, Info, Sparkles, Check, Send, Bot, FileText, Lightbulb, AlertCircle
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
import { buildClubDirectionAIContext } from "@/lib/methodology/ai/methodologyAIContextBuilder";
import { MethodologyAIResponse } from "@/lib/methodology/ai/types";

const SUGGESTED_AI_QUESTIONS = [
  "¿Cómo está el club metodológicamente?",
  "¿Qué equipos requieren mayor atención y por qué?",
  "¿Qué principios del modelo de juego están menos trabajados?",
  "¿Qué alertas transversales existen actualmente?",
  "¿Qué prioridades deberían considerarse en el próximo microciclo?"
];

export default function SportsDirectionDashboardPage() {
  const supabase = createClient();

  const [isLoading, setIsLoading] = useState(true);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [clubId, setClubId] = useState<string>("");
  const [clubName, setClubName] = useState<string>("Sporting Saladar");
  
  // Datos procesados
  const [reports, setReports] = useState<SeasonMethodologyReport[]>([]);
  const [kpis, setKpis] = useState<ClubGlobalKpis | null>(null);
  const [teamsMatrix, setTeamsMatrix] = useState<TeamRowOverview[]>([]);
  const [alerts, setAlerts] = useState<TransversalAlert[]>([]);
  const [monthlyEvolution, setMonthlyEvolution] = useState<ClubMonthlyEvolutionPoint[]>([]);

  // Asistente IA Metodológico
  const [aiPrompt, setAiPrompt] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiResponse, setAiResponse] = useState<MethodologyAIResponse | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Ordenamiento de tabla
  const [sortField, setSortField] = useState<keyof TeamRowOverview>("teamName");
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Comparador de equipos
  const [selectedTeamIdsForComparison, setSelectedTeamIdsForComparison] = useState<string[]>([]);
  const [showComparisonModal, setShowComparisonModal] = useState<boolean>(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedSeasonId) {
      loadSeasonData(selectedSeasonId);
    }
  }, [selectedSeasonId]);

  const loadInitialData = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userClubId = userData.user?.user_metadata?.club_id;

      if (userClubId) {
        setClubId(userClubId);
        const { data: clubData } = await supabase.from("clubs").select("name").eq("id", userClubId).single();
        if (clubData?.name) setClubName(clubData.name);
      }

      // Cargar Temporadas
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

  const handleAskAI = async (queryText?: string) => {
    const question = (queryText || aiPrompt).trim();
    if (!question) return;

    setIsAiLoading(true);
    setAiError(null);

    try {
      const currentSeason = seasons.find(s => s.id === selectedSeasonId) || { id: selectedSeasonId, name: "Temporada Actual" };
      const context = buildClubDirectionAIContext({
        club: { id: clubId || "default-club", name: clubName },
        season: { id: currentSeason.id, name: currentSeason.name },
        reports,
        globalKpis: kpis,
        transversalAlerts: alerts
      });

      const res = await fetch("/api/methodology/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: question, context })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${res.status} al consultar el asistente`);
      }

      const data: MethodologyAIResponse = await res.json();
      setAiResponse(data);
    } catch (err: any) {
      console.error("Error en Asistente IA:", err);
      setAiError(err.message || "Error al procesar la consulta.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const loadSeasonData = async (seasonId: string) => {
    setIsLoading(true);
    try {
      // 1. Cargar equipos del club
      const { data: teamsData } = await supabase.from("teams").select("*").order("name");
      const teams = teamsData || [];

      // 2. Cargar principios del currículo
      const { data: principlesData } = await supabase.from("methodology_principles").select("id, name, game_phase").order("sort_order");
      const curriculumPrinciples = principlesData || [];

      // 3. Cargar todas las sesiones de la temporada con evaluaciones
      const { data: sessionsData } = await supabase
        .from("training_sessions")
        .select("*, session_evaluations(*, session_behaviour_evaluations(*))")
        .order("date_time", { ascending: true });

      const allSessions = sessionsData || [];

      // 4. Cargar objetivos de equipos
      const { data: teamObjectivesData } = await supabase.from("team_objectives").select("*");
      const allTeamObjectives = teamObjectivesData || [];

      const currentSeason = seasons.find(s => s.id === seasonId) || { id: seasonId, name: "Temporada Actual" };

      // 5. Construir informes de temporada por cada equipo
      const teamReports: SeasonMethodologyReport[] = teams.map(team => {
        const teamSessions = allSessions.filter(s => s.team_id === team.id);
        const teamObjs = allTeamObjectives.filter(o => o.team_id === team.id);

        return buildSeasonMethodologyReportFromData({
          team: { id: team.id, name: team.name, category: team.category },
          season: { id: currentSeason.id, name: currentSeason.name },
          sessions: teamSessions,
          curriculumPrinciples,
          teamObjectives: teamObjs
        });
      });

      setReports(teamReports);

      // 6. Calcular métricas transversales
      const globalKpis = calculateClubGlobalKpis(teamReports);
      const matrix = buildClubTeamsMatrix(teamReports);
      const transversalAlerts = generateClubTransversalAlerts(teamReports);
      const monthly = calculateClubMonthlyEvolution(allSessions);

      setKpis(globalKpis);
      setTeamsMatrix(matrix);
      setAlerts(transversalAlerts);
      setMonthlyEvolution(monthly);
    } catch (err) {
      console.error("Error procesando Dirección Deportiva:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrado de equipos por categoría
  const filteredMatrix = teamsMatrix.filter(row => {
    if (selectedCategory === "ALL") return true;
    return (row.category || "").toLowerCase() === selectedCategory.toLowerCase();
  });

  // Ordenamiento determinista de la tabla
  const sortedMatrix = [...filteredMatrix].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (typeof valA === "string" && typeof valB === "string") {
      const cmp = valA.localeCompare(valB);
      return sortAsc ? cmp : -cmp;
    }
    if (typeof valA === "number" && typeof valB === "number") {
      const cmp = valA - valB;
      return sortAsc ? cmp : -cmp;
    }
    return a.teamName.localeCompare(b.teamName);
  });

  const handleSort = (field: keyof TeamRowOverview) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const toggleSelectTeamForComparison = (teamId: string) => {
    if (selectedTeamIdsForComparison.includes(teamId)) {
      setSelectedTeamIdsForComparison(selectedTeamIdsForComparison.filter(id => id !== teamId));
    } else {
      if (selectedTeamIdsForComparison.length >= 4) {
        alert("Puedes comparar hasta un máximo de 4 equipos simultáneamente.");
        return;
      }
      setSelectedTeamIdsForComparison([...selectedTeamIdsForComparison, teamId]);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        <p className="text-sm font-bold text-slate-500">Cargando Centro de Dirección Deportiva...</p>
      </div>
    );
  }

  const comparisonData = showComparisonModal ? compareSpecificTeams(reports, selectedTeamIdsForComparison) : [];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* 1. CABECERA & CONTROLES */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm print:border-none print:shadow-none print:p-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-800">
              Dirección Deportiva
            </span>
            <span className="text-xs font-bold text-slate-400">
              • {clubName}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <Building2 className="w-7 h-7 text-purple-600 shrink-0" />
            Centro de Inteligencia Metodológica Transversal
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Supervisión longitudinal, comparativa multi-equipo y seguimiento de estándares formativos.
          </p>
        </div>

        {/* Filtros y Exportación */}
        <div className="flex flex-wrap items-center gap-2.5 print:hidden">
          <select
            value={selectedSeasonId}
            onChange={(e) => setSelectedSeasonId(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-purple-500 outline-none"
          >
            {seasons.map(s => (
              <option key={s.id} value={s.id}>{s.name} {s.is_active ? "(Activa)" : ""}</option>
            ))}
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-purple-500 outline-none"
          >
            <option value="ALL">Todas las Categorías</option>
            <option value="querubin">Querubín (U6)</option>
            <option value="prebenjamin">Prebenjamín (U8)</option>
            <option value="benjamin">Benjamín (U10)</option>
            <option value="alevin">Alevín (U12)</option>
            <option value="infantil">Infantil (U14)</option>
            <option value="cadete">Cadete (U16)</option>
            <option value="juvenil">Juvenil (U19)</option>
            <option value="senior">Amateur / Senior</option>
          </select>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Exportar A4
          </button>
        </div>
      </div>

      {/* BLOQUE: ASISTENTE METODOLÓGICO IA (FASE 5.1) */}
      <div className="bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-purple-800/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Bot className="w-48 h-48" />
        </div>

        <div className="relative z-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-purple-700/40 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-300" />
                  Asistente IA Metodológico v1.0
                </span>
                <span className="text-xs text-purple-300">• Explicabilidad & Evidencia</span>
              </div>
              <h2 className="text-xl md:text-2xl font-black tracking-tight mt-1">
                Consultoría Táctica y Dirección Asistida
              </h2>
            </div>
            <p className="text-xs text-purple-200 max-w-md">
              Interpreta objetivamente los datos de la temporada basándose en los motores deterministas. No sustituye la decisión del cuerpo técnico.
            </p>
          </div>

          {/* Sugerencias Rápidas */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider block">
              Consultas recomendadas:
            </span>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_AI_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setAiPrompt(q);
                    handleAskAI(q);
                  }}
                  disabled={isAiLoading}
                  className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-purple-100 transition-all text-left disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Barra de Entrada */}
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative flex-1 w-full">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAskAI();
                }}
                placeholder="Escribe tu consulta metodológica (ej. ¿Por qué el Cadete A está en rojo?)..."
                disabled={isAiLoading}
                className="w-full bg-slate-950/60 border border-purple-400/30 rounded-2xl px-4 py-3 text-sm text-white placeholder-purple-300/60 focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-50"
              />
            </div>
            <button
              onClick={() => handleAskAI()}
              disabled={isAiLoading || !aiPrompt.trim()}
              className="w-full sm:w-auto px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800/50 text-white text-sm font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              {isAiLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analizando...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Preguntar</span>
                </>
              )}
            </button>
          </div>

          {/* Mensaje de Error */}
          {aiError && (
            <div className="p-4 bg-rose-500/20 border border-rose-500/40 rounded-2xl text-xs text-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{aiError}</span>
            </div>
          )}

          {/* Panel de Respuesta Estructurada */}
          {aiResponse && (
            <div className="bg-slate-950/70 border border-purple-500/30 rounded-2xl p-6 space-y-6 animate-in fade-in duration-200">
              
              {/* Resumen Principal */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                    <Bot className="w-4 h-4 text-purple-400" />
                    Diagnóstico Asistido
                  </span>
                  {aiResponse.dataSufficiency?.notice && (
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {aiResponse.dataSufficiency.notice}
                    </span>
                  )}
                </div>
                <p className="text-base font-semibold text-white leading-relaxed">
                  {aiResponse.answer}
                </p>
              </div>

              {/* Grid 3 Columnas: Hechos / Interpretaciones / Propuestas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-purple-800/40">
                
                {/* Hechos Objetivos */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
                  <span className="text-xs font-black uppercase text-blue-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    Hechos Objetivos
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {aiResponse.facts?.map((fact, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-blue-400">•</span>
                        <span>{fact}</span>
                      </li>
                    ))}
                    {(!aiResponse.facts || aiResponse.facts.length === 0) && (
                      <li className="text-slate-500 italic">Sin hechos registrados.</li>
                    )}
                  </ul>
                </div>

                {/* Interpretación */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
                  <span className="text-xs font-black uppercase text-purple-300 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" />
                    Interpretación Metodológica
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {aiResponse.interpretations?.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-purple-400">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                    {(!aiResponse.interpretations || aiResponse.interpretations.length === 0) && (
                      <li className="text-slate-500 italic">Sin interpretaciones adicionales.</li>
                    )}
                  </ul>
                </div>

                {/* Propuesta / Recomendación */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
                  <span className="text-xs font-black uppercase text-emerald-300 flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5" />
                    Propuestas (Confirmación Humana)
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {aiResponse.recommendations?.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-emerald-400">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                    {(!aiResponse.recommendations || aiResponse.recommendations.length === 0) && (
                      <li className="text-slate-500 italic">Sin propuestas específicas.</li>
                    )}
                  </ul>
                </div>

              </div>

              {/* Propuestas de Actuación Operativa (Fase 5.2) */}
              {aiResponse.actionProposals && aiResponse.actionProposals.length > 0 && (
                <div className="pt-4 border-t border-purple-800/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-amber-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      Propuestas de Actuación Operativa (Copiloto)
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Requiere Confirmación Humana
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {aiResponse.actionProposals.map((act) => (
                      <div key={act.id} className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-bold text-amber-200">{act.title}</h4>
                          <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                            {act.type}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300">{act.rationale}</p>
                        
                        {act.proposedChanges?.modificationsSummary && act.proposedChanges.modificationsSummary.length > 0 && (
                          <div className="bg-black/30 rounded-lg p-2 space-y-1">
                            <span className="text-[10px] font-bold text-purple-300 uppercase block">Modificaciones sugeridas:</span>
                            {act.proposedChanges.modificationsSummary.map((m, mIdx) => (
                              <div key={mIdx} className="text-[11px] text-slate-300 flex items-center gap-1">
                                <span className="text-amber-400">→</span>
                                <span>{m}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                          <span className="text-[10px] text-slate-400">
                            Confianza IA: {Math.round(act.confidence * 100)}%
                          </span>
                          <div className="flex items-center gap-1.5">
                            {act.target.teamId && (
                              <Link
                                href={`/admin/metodologia/equipos/${act.target.teamId}/temporada/${selectedSeasonId}`}
                                className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] rounded-lg transition-colors inline-flex items-center gap-1"
                              >
                                <span>Revisar Equipo</span>
                                <ChevronRight className="w-3 h-3" />
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Evidencia Trazable */}
              {aiResponse.evidence && aiResponse.evidence.length > 0 && (
                <div className="pt-4 border-t border-purple-800/40 space-y-2">
                  <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider block">
                    Evidencia y métricas de soporte:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {aiResponse.evidence.map((ev, idx) => (
                      <div key={idx} className="bg-purple-950/40 border border-purple-800/40 px-3 py-2 rounded-xl text-xs flex justify-between items-center">
                        <span className="text-slate-300">{ev.reference}:</span>
                        <span className="font-bold text-purple-200">{ev.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      </div>

      {/* 2. KPIS GLOBALES DEL CLUB */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
            <span className="text-[10px] font-black uppercase text-slate-400 block">Equipos Supervisados</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">{kpis.activeTeamsCount}</span>
            <span className="text-[10px] text-slate-500 font-medium">Activos en el club</span>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
            <span className="text-[10px] font-black uppercase text-slate-400 block">Sesiones Planificadas</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">{kpis.totalPlannedSessions}</span>
            <span className="text-[10px] text-purple-600 font-bold">{kpis.totalEvaluatedSessions} evaluadas ({kpis.globalEvaluationPercentage}%)</span>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
            <span className="text-[10px] font-black uppercase text-slate-400 block">Consecución Táctica</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">{kpis.globalAvgAchievement} <span className="text-xs font-bold text-slate-400">/ 4.0</span></span>
            <span className="text-[10px] text-slate-500 font-medium">Media global club</span>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
            <span className="text-[10px] font-black uppercase text-slate-400 block">Cobertura de Currículo</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">{kpis.globalModelCoverage}%</span>
            <span className="text-[10px] text-slate-500 font-medium">Principios trabajados</span>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
            <span className="text-[10px] font-black uppercase text-slate-400 block">RPE / Carga Media</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">{kpis.globalAvgRpe} <span className="text-xs font-bold text-slate-400">/ 10</span></span>
            <span className="text-[10px] text-slate-500 font-medium">Intensidad subjetiva</span>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
            <span className="text-[10px] font-black uppercase text-slate-400 block">Estado de Equipos</span>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded" title="Sólidos">{kpis.teamsSolidCount} 🟢</span>
              <span className="text-xs font-black text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded" title="En Seguimiento">{kpis.teamsMonitoringCount} 🟡</span>
              <span className="text-xs font-black text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded" title="Atención">{kpis.teamsAttentionCount} 🔴</span>
              <span className="text-xs font-black text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded" title="Datos Insuficientes">{kpis.teamsInsufficientDataCount} ⚪</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium mt-1 block">Diagnóstico objetivo</span>
          </div>
        </div>
      )}

      {/* 3. ALERTAS TRANSVERSALES DE ATENCIÓN */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
            <h2 className="text-base font-black text-slate-900 tracking-tight">
              Atención Dirección Deportiva • Eventos Metodológicos Detectados ({alerts.length})
            </h2>
          </div>
          <span className="text-xs font-bold text-slate-400">
            Reglas deterministas sin sesgo
          </span>
        </div>

        {alerts.length === 0 ? (
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2.5 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Excelente: No se han detectado brechas críticas ni comportamientos en declive persistente en los equipos analizados.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {alerts.slice(0, 6).map(alert => (
              <div 
                key={alert.id}
                className={`p-3.5 rounded-xl border flex flex-col justify-between ${
                  alert.severity === 'high' ? 'bg-rose-50/70 border-rose-200' : 'bg-amber-50/70 border-amber-200'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900">{alert.teamName}</span>
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${
                      alert.severity === 'high' ? 'bg-rose-200 text-rose-900' : 'bg-amber-200 text-amber-900'
                    }`}>
                      {alert.category}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-800">{alert.title}</p>
                  <p className="text-[11px] text-slate-600 leading-tight">{alert.description}</p>
                  <div className="text-[10px] font-mono bg-white/80 p-1.5 rounded border border-slate-200 text-slate-600 mt-2">
                    Evidencia: {alert.evidence.details}
                  </div>
                </div>

                <div className="pt-2.5 mt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400">{alert.ruleActivated}</span>
                  <Link
                    href={alert.actionUrl}
                    className="text-[11px] font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1"
                  >
                    Ver Memoria
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. MATRIZ COMPARATIVA DE EQUIPOS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-600" />
              Matriz Comparativa de Equipos ({filteredMatrix.length})
            </h2>
            <p className="text-xs text-slate-500">Selecciona hasta 4 equipos para contrastar su evolución en detalle.</p>
          </div>

          <div className="flex items-center gap-2">
            {selectedTeamIdsForComparison.length > 0 && (
              <button
                onClick={() => setShowComparisonModal(true)}
                className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Comparar {selectedTeamIdsForComparison.length} equipos
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                <th className="py-2.5 px-3 w-8">Comp.</th>
                <th className="py-2.5 px-3 cursor-pointer hover:text-slate-600" onClick={() => handleSort("teamName")}>
                  Equipo <ArrowUpDown className="w-3 h-3 inline" />
                </th>
                <th className="py-2.5 px-3 cursor-pointer hover:text-slate-600" onClick={() => handleSort("category")}>
                  Categoría <ArrowUpDown className="w-3 h-3 inline" />
                </th>
                <th className="py-2.5 px-3 cursor-pointer hover:text-slate-600 text-center" onClick={() => handleSort("plannedSessions")}>
                  Sesiones <ArrowUpDown className="w-3 h-3 inline" />
                </th>
                <th className="py-2.5 px-3 cursor-pointer hover:text-slate-600 text-center" onClick={() => handleSort("evaluationPercentage")}>
                  Evaluadas % <ArrowUpDown className="w-3 h-3 inline" />
                </th>
                <th className="py-2.5 px-3 cursor-pointer hover:text-slate-600 text-center" onClick={() => handleSort("avgAchievement")}>
                  Consecución <ArrowUpDown className="w-3 h-3 inline" />
                </th>
                <th className="py-2.5 px-3 cursor-pointer hover:text-slate-600 text-center" onClick={() => handleSort("avgRpe")}>
                  RPE <ArrowUpDown className="w-3 h-3 inline" />
                </th>
                <th className="py-2.5 px-3 cursor-pointer hover:text-slate-600 text-center" onClick={() => handleSort("modelCoveragePercentage")}>
                  Cobertura % <ArrowUpDown className="w-3 h-3 inline" />
                </th>
                <th className="py-2.5 px-3 text-center">Estado Metodológico</th>
                <th className="py-2.5 px-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedMatrix.map(row => {
                const isSelected = selectedTeamIdsForComparison.includes(row.teamId);
                return (
                  <tr key={row.teamId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectTeamForComparison(row.teamId)}
                        className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      {row.teamName}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                        {row.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-slate-700">
                      {row.plannedSessions} <span className="text-[10px] text-slate-400">({row.completedSessions})</span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold">
                      <span className={`${
                        row.evaluationPercentage >= 70 ? 'text-emerald-600' :
                        row.evaluationPercentage >= 50 ? 'text-amber-600' :
                        'text-rose-600'
                      }`}>
                        {row.evaluationPercentage}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold">
                      {row.evaluatedSessions >= 3 ? (
                        <span className={`${
                          row.avgAchievement >= 2.8 ? 'text-emerald-600' :
                          row.avgAchievement >= 2.3 ? 'text-amber-600' :
                          'text-rose-600'
                        }`}>
                          {row.avgAchievement.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">N&lt;3</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-700">
                      {row.evaluatedSessions >= 3 ? row.avgRpe.toFixed(1) : <span className="text-slate-400 italic">-</span>}
                    </td>
                    <td className="py-3 px-3 text-center font-bold">
                      <span className={`${
                        row.modelCoveragePercentage >= 60 ? 'text-emerald-600' :
                        row.modelCoveragePercentage >= 40 ? 'text-amber-600' :
                        'text-rose-600'
                      }`}>
                        {row.modelCoveragePercentage}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span 
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full inline-block ${
                          row.statusDetail.status === 'solido' ? 'bg-emerald-100 text-emerald-800' :
                          row.statusDetail.status === 'en_seguimiento' ? 'bg-amber-100 text-amber-800' :
                          row.statusDetail.status === 'atencion' ? 'bg-rose-100 text-rose-800' :
                          'bg-slate-100 text-slate-600'
                        }`}
                        title={row.statusDetail.reason}
                      >
                        {row.statusDetail.statusLabel}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        href={`/admin/metodologia/equipos/${row.teamId}/temporada/${selectedSeasonId}`}
                        className="p-1.5 text-purple-600 hover:text-purple-800 font-bold inline-flex items-center gap-1 rounded-lg hover:bg-purple-50"
                        title="Ver Memoria de Temporada Completa"
                      >
                        Memoria
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. EVOLUCIÓN TEMPORAL MES A MES DEL CLUB */}
      {monthlyEvolution.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            <h2 className="text-base font-black text-slate-900 tracking-tight">
              Evolución Metodológica Cronológica Mes a Mes
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {monthlyEvolution.map(point => (
              <div key={point.monthKey} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="text-xs font-black text-slate-900 block">{point.monthLabel}</span>
                <div className="grid grid-cols-2 gap-2 text-xs font-medium">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Sesiones</span>
                    <span className="font-bold text-slate-800">{point.sessionsCount} ({point.evaluationPercentage}%)</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Consecución</span>
                    <span className="font-bold text-purple-700">{point.avgAchievement > 0 ? point.avgAchievement + '/4' : '-'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">RPE Medio</span>
                    <span className="font-bold text-slate-800">{point.avgRpe > 0 ? point.avgRpe + '/10' : '-'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Equipos</span>
                    <span className="font-bold text-slate-800">{point.activeTeamsCount}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL DE COMPARACIÓN DE EQUIPOS SELECCIONADOS */}
      {showComparisonModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[11px] font-black uppercase text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                  Comparativa de Equipos
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  Contraste Metodológico Objetivo
                </h3>
              </div>
              <button
                onClick={() => setShowComparisonModal(false)}
                className="text-xs font-bold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
              >
                Cerrar
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {comparisonData.map(item => (
                <div key={item.teamId} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="border-b border-slate-200 pb-2">
                    <span className="text-xs font-black text-slate-900 block">{item.teamName}</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">{item.category}</span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Sesiones:</span>
                      <span className="font-bold">{item.summary.plannedSessions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Evaluadas:</span>
                      <span className="font-bold">{item.summary.evaluationPercentage}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Consecución:</span>
                      <span className="font-bold">{item.summary.avgObjectiveAchievement}/4</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Cobertura:</span>
                      <span className="font-bold">{item.summary.modelCoveragePercentage}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">RPE Medio:</span>
                      <span className="font-bold">{item.summary.avgRpe}/10</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Estado:</span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full inline-block ${
                      item.statusDetail.status === 'solido' ? 'bg-emerald-100 text-emerald-800' :
                      item.statusDetail.status === 'en_seguimiento' ? 'bg-amber-100 text-amber-800' :
                      item.statusDetail.status === 'atencion' ? 'bg-rose-100 text-rose-800' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {item.statusDetail.statusLabel}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-1 leading-tight">{item.statusDetail.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
