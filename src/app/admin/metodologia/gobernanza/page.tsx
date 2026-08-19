"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Building2, ChevronRight, Loader2, Trophy, Target, Activity, 
  AlertTriangle, ShieldAlert, CheckCircle2, TrendingUp, TrendingDown,
  ArrowUpDown, Filter, Printer, ExternalLink, Users, Calendar, BarChart3,
  Layers, Info, Sparkles, Check, Send, Bot, FileText, Lightbulb, AlertCircle,
  Eye, CheckCircle, Sliders, Play, ArrowRight, ShieldCheck, UserCheck
} from "lucide-react";
import Link from "next/link";
import { MethodologyNavHeader } from "@/components/methodology/MethodologyNavHeader";
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

export default function MethodologyGovernancePage() {
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
      console.error("Error cargando gobernanza:", err);
      setIsLoading(false);
    }
  };

  const loadSeasonData = async (seasonId: string) => {
    setIsLoading(true);
    try {
      const { data: teams } = await supabase
        .from("teams")
        .select("*")
        .order("name", { ascending: true });

      const { data: curriculumPrinciples } = await supabase
        .from("methodology_principles")
        .select("id, name, game_phase");

      const { data: allSessions } = await supabase
        .from("training_sessions")
        .select(`
          id,
          team_id,
          date_time,
          duration_minutes,
          objective,
          session_evaluations (
            id,
            actual_duration_min,
            session_rpe,
            objective_achievement,
            session_behaviour_evaluations (
              behaviour_description,
              achievement_score
            )
          ),
          session_drills (
            id,
            drill_id,
            phase,
            duration_min,
            banco_ejercicios (
              id,
              nombre,
              game_phase
            )
          )
        `)
        .order("date_time", { ascending: true });

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

      setReports(seasonReports);
      const calculatedKpis = calculateClubGlobalKpis(seasonReports);
      setKpis(calculatedKpis);
      const matrix = buildClubTeamsMatrix(seasonReports);
      setTeamsMatrix(matrix);
      const generatedAlerts = generateClubTransversalAlerts(seasonReports);
      setAlerts(generatedAlerts);
      const evolution = calculateClubMonthlyEvolution(allSessions || [], teams?.length || 0);
      setMonthlyEvolution(evolution);

    } catch (err) {
      console.error("Error al procesar datos de gobernanza:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        <p className="text-sm font-bold text-slate-500">Cargando Centro de Gobernanza Metodológica...</p>
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
              Gobernanza del Club & Supervisión Multiequipo
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-purple-600 shrink-0" />
            Centro de Gobernanza Metodológica
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Supervisión transversal: Club → Temporada → Equipos → Entrenadores → Cumplimiento Metodológico.
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
        </div>
      </div>

      {/* KPI Cards Globales */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Equipos Auditados</span>
            <div className="text-2xl font-black text-slate-900">{kpis.activeTeamsCount}</div>
            <span className="text-[11px] text-emerald-600 font-bold">{kpis.teamsSolidCount} sólidos • {kpis.teamsAttentionCount} en atención</span>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Cobertura de Modelo</span>
            <div className="text-2xl font-black text-purple-900">{kpis.globalModelCoverage}%</div>
            <span className="text-[11px] text-purple-600 font-bold">Media global del club</span>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Consecución Media</span>
            <div className="text-2xl font-black text-blue-900">{kpis.globalAvgAchievement}/4</div>
            <span className="text-[11px] text-blue-600 font-bold">{kpis.totalEvaluatedSessions} sesiones evaluadas</span>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Alertas Activas</span>
            <div className="text-2xl font-black text-rose-600">{alerts.length}</div>
            <span className="text-[11px] text-rose-500 font-bold">Requieren revisión técnica</span>
          </div>
        </div>
      )}

      {/* Matriz Multiequipo con Drill-Down */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            Supervisión y Estado Metodológico por Equipo
          </h3>
          <span className="text-xs font-bold text-slate-400">
            {teamsMatrix.length} equipos registrados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-2.5">Equipo</th>
                <th className="py-2.5">Categoría</th>
                <th className="py-2.5">Estado Metodológico</th>
                <th className="py-2.5">Sesiones (Eval / Plan)</th>
                <th className="py-2.5">Consecución</th>
                <th className="py-2.5">Cobertura</th>
                <th className="py-2.5 text-right">Acción Drill-Down</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {teamsMatrix.map((t) => (
                <tr key={t.teamId} className="hover:bg-slate-50">
                  <td className="py-3 font-bold text-slate-900">{t.teamName}</td>
                  <td className="py-3 capitalize">{t.category}</td>
                  <td className="py-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      t.statusDetail.status === 'solido' ? 'bg-emerald-100 text-emerald-800' :
                      t.statusDetail.status === 'atencion' ? 'bg-rose-100 text-rose-800' :
                      t.statusDetail.status === 'en_seguimiento' ? 'bg-amber-100 text-amber-800' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {t.statusDetail.statusLabel}
                    </span>
                  </td>
                  <td className="py-3 font-bold">{t.evaluatedSessions} / {t.plannedSessions}</td>
                  <td className="py-3 font-bold">{t.avgAchievement}/4</td>
                  <td className="py-3 font-bold">{t.modelCoveragePercentage}%</td>
                  <td className="py-3 text-right">
                    <Link
                      href={`/admin/metodologia/equipos/${t.teamId}`}
                      className="inline-flex items-center gap-1 text-purple-600 font-bold hover:underline"
                    >
                      <Eye className="w-3.5 h-3.5" /> Ver Detalle
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
