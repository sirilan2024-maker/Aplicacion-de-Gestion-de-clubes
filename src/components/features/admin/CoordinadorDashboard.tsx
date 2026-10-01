"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Shield, Trophy, Users, AlertTriangle, Calendar, Activity,
  ChevronRight, RefreshCw, CheckCircle, Clock, Zap,
  TrendingUp, Heart, MessageSquare, ArrowRight, Compass,
  Target, AlertCircle, Share2, ShieldAlert
} from "lucide-react";
import { useSeason } from "@/components/providers/SeasonProvider";
import { MatchdayShareModal } from "./MatchdayShareModal";
import { getCoordinatorFullDashboardAction } from "@/app/actions/coordinator-actions";
import { CoordinatorHeader } from "@/components/coordinator/CoordinatorHeader";
import { CriticalAlertsBanner } from "@/components/coordinator/CriticalAlertsBanner";
import { DisciplineSection } from "@/components/coordinator/DisciplineSection";
import { AttendanceOperationsSection } from "@/components/coordinator/AttendanceOperationsSection";
import { SportsPerformanceSection } from "@/components/coordinator/SportsPerformanceSection";
import { PitchesTimelineSection } from "@/components/coordinator/PitchesTimelineSection";
import { FfcvCategory, CoordinatorDashboardFullData } from "@/types/coordinator";

type Props = {
  initialResult: { success: boolean; data?: any; error?: string };
  userFirstName: string | null;
};

export function CoordinadorDashboard({ initialResult, userFirstName }: Props) {
  const { selectedSeason } = useSeason();
  const router = useRouter();

  const [result, setResult] = useState(initialResult);
  const [loading, setLoading] = useState(false);
  const [showMatchdayModal, setShowMatchdayModal] = useState(false);

  // Filtros dinámicos del panel
  const [selectedCategory, setSelectedCategory] = useState<FfcvCategory>("todos");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [attendancePeriod, setAttendancePeriod] = useState<"semana" | "mes" | "temporada">("semana");

  const activeSeasonId = result.data?.seasonId;
  const selectedSeasonId = selectedSeason?.id;

  const refreshData = useCallback(
    async (overrideParams?: {
      seasonId?: string;
      category?: string;
      teamId?: string;
      date?: string;
      attendancePeriod?: "semana" | "mes" | "temporada";
    }) => {
      setLoading(true);
      try {
        const fresh = await getCoordinatorFullDashboardAction({
          seasonId: overrideParams?.seasonId || selectedSeason?.id,
          category: overrideParams?.category ?? selectedCategory,
          teamId: overrideParams?.teamId ?? selectedTeamId,
          date: overrideParams?.date ?? selectedDate,
          attendancePeriod: overrideParams?.attendancePeriod ?? attendancePeriod,
        });
        setResult(fresh);
      } catch (err: any) {
        setResult({
          success: false,
          error: err?.message || "Error al actualizar el panel de coordinación",
        });
      } finally {
        setLoading(false);
      }
    },
    [selectedSeason?.id, selectedCategory, selectedTeamId, selectedDate, attendancePeriod]
  );

  // Recarga al cambiar la temporada activa en el selector superior
  useEffect(() => {
    if (selectedSeasonId && activeSeasonId && selectedSeasonId !== activeSeasonId) {
      refreshData({ seasonId: selectedSeasonId });
    }
  }, [selectedSeasonId, activeSeasonId, refreshData]);

  // Recarga al cambiar de categoría o equipo
  const handleSelectCategory = (cat: FfcvCategory) => {
    setSelectedCategory(cat);
    setSelectedTeamId("all");
    refreshData({ category: cat, teamId: "all" });
  };

  const handleSelectTeamId = (teamId: string) => {
    setSelectedTeamId(teamId);
    refreshData({ teamId });
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    refreshData({ date });
  };

  const handleAttendancePeriodChange = (p: "semana" | "mes" | "temporada") => {
    setAttendancePeriod(p);
    refreshData({ attendancePeriod: p });
  };

  const data: CoordinatorDashboardFullData | undefined = result.data;

  if (!result.success || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-slate-700 font-semibold text-center">
          {result.error || "Error al cargar el panel de coordinación deportiva"}
        </p>
        <button
          onClick={() => refreshData()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
        >
          Reintentar
        </button>
      </div>
    );
  }

  // Lista de equipos para el selector de cabecera
  const teamsList = (data.sports.teamStandings || []).map((t) => ({
    id: t.teamId,
    name: t.teamName,
    category: t.category,
    color: null,
  }));

  const { kpis, alerts, discipline, attendance, sports, schedule } = data;

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* 1. Cabecera con Filtros Globales y Acciones */}
      <CoordinatorHeader
        userFirstName={userFirstName}
        seasonName={data.seasonName}
        matchdayNumber={data.matchdayNumber}
        selectedCategory={selectedCategory}
        onSelectCategory={handleSelectCategory}
        selectedTeamId={selectedTeamId}
        onSelectTeamId={handleSelectTeamId}
        teams={teamsList}
        isLoading={loading}
        onRefresh={() => refreshData()}
        onShare={() => setShowMatchdayModal(true)}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* 2. Banner de Alertas Críticas (Sancionados, Apercibidos, Bajas) */}
        <CriticalAlertsBanner alerts={alerts} />

        {/* 3. Métricas Rápidas de un Solo Vistazo (KPIs) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-extrabold uppercase">Equipos</span>
              <Shield className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-2xl font-black text-slate-900 mt-1">{kpis.totalTeams}</p>
            <p className="text-[10px] text-slate-400">En competición</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-extrabold uppercase">Jugadores</span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-black text-slate-900 mt-1">{kpis.totalPlayers}</p>
            <p className="text-[10px] text-slate-400">Fichas activas</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-extrabold uppercase">Sancionados</span>
              <ShieldAlert className="w-4 h-4 text-red-600" />
            </div>
            <p className={`text-2xl font-black mt-1 ${kpis.activeSuspendedCount > 0 ? "text-red-600" : "text-slate-900"}`}>
              {kpis.activeSuspendedCount}
            </p>
            <p className="text-[10px] text-slate-400">Bajas disciplinarias</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-extrabold uppercase">Apercibidos</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <p className={`text-2xl font-black mt-1 ${kpis.apercibidosCount > 0 ? "text-amber-600" : "text-slate-900"}`}>
              {kpis.apercibidosCount}
            </p>
            <p className="text-[10px] text-slate-400">A 1 tarjeta (4🟨)</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-extrabold uppercase">Asistencia</span>
              <Activity className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-emerald-600 mt-1">
              {kpis.weeklyAttendanceRate}%
            </p>
            <p className="text-[10px] text-slate-400">Objetivo: 85%</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-extrabold uppercase">Lesiones</span>
              <Heart className="w-4 h-4 text-rose-500" />
            </div>
            <p className={`text-2xl font-black mt-1 ${kpis.activeInjuriesCount > 0 ? "text-rose-600" : "text-slate-900"}`}>
              {kpis.activeInjuriesCount}
            </p>
            <p className="text-[10px] text-slate-400">Bajas médicas</p>
          </div>
        </div>

        {/* 4. Bloque de Disciplina y Tarjetas FFCV */}
        <DisciplineSection
          records={discipline.allTrackedPlayers}
          onPlayerClick={(playerId) => router.push(`/dashboard/matches?view=disciplina`)}
        />

        {/* 5. Bloque de Asistencia y Control Operativo */}
        <AttendanceOperationsSection
          globalWeeklyRate={attendance.globalWeeklyRate}
          categories={attendance.categories}
          injuries={attendance.activeInjuries}
          currentPeriod={attendancePeriod}
          onPeriodChange={handleAttendancePeriodChange}
        />

        {/* 6. Situación Deportiva (Resultados del fin de semana y clasificaciones) */}
        <SportsPerformanceSection
          weekend={sports.weekend}
          teamStandings={sports.teamStandings}
        />

        {/* 7. Agenda de Entrenamientos y Distribución de Campos */}
        <PitchesTimelineSection
          slots={schedule.slots}
          availablePitches={schedule.availablePitches}
          selectedDate={selectedDate}
          onDateChange={handleDateChange}
        />
      </div>

      {/* Modal de Cartelera de la Jornada para Difusión */}
      <MatchdayShareModal
        isOpen={showMatchdayModal}
        onClose={() => setShowMatchdayModal(false)}
        seasonId={data.seasonId}
        seasonName={data.seasonName}
        clubName="Sporting Saladar"
      />
    </div>
  );
}
