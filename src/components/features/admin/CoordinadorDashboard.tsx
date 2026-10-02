"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Shield, Trophy, Users, AlertTriangle, Calendar, Activity,
  ChevronRight, RefreshCw, CheckCircle, Clock, Zap,
  TrendingUp, Heart, MessageSquare, ArrowRight, Compass,
  Target, AlertCircle, Share2, ShieldAlert, ArrowLeft, ArrowUpRight
} from "lucide-react";
import { useSeason } from "@/components/providers/SeasonProvider";
import { MatchdayShareModal } from "./MatchdayShareModal";
import { getCoordinatorFullDashboardAction } from "@/app/actions/coordinator-actions";
import { CoordinatorHeader } from "@/components/coordinator/CoordinatorHeader";
import { CriticalAlertsBanner } from "@/components/coordinator/CriticalAlertsBanner";
import { DisciplineSection } from "@/components/coordinator/DisciplineSection";
import { AttendanceOperationsSection } from "@/components/coordinator/AttendanceOperationsSection";
import { SituacionDeportivaSection } from "@/components/features/admin/SituacionDeportivaSection";
import { TrainingsAgendaSection } from "@/components/coordinator/TrainingsAgendaSection";
import { CoordinatorDashboardFullData, CoordinatorTeamItem } from "@/types/coordinator";

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

  // Selector de equipo: "all" por defecto al iniciar el panel
  const [selectedTeamId, setSelectedTeamId] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [attendancePeriod, setAttendancePeriod] = useState<"semana" | "mes" | "temporada">("semana");

  const isFirstMountRef = React.useRef(true);
  const prevSeasonIdRef = React.useRef(selectedSeason?.id);

  const refreshData = useCallback(
    async (overrideParams?: {
      seasonId?: string;
      teamId?: string;
      date?: string;
      attendancePeriod?: "semana" | "mes" | "temporada";
    }) => {
      setLoading(true);
      try {
        const fresh = await getCoordinatorFullDashboardAction({
          seasonId: overrideParams?.seasonId || selectedSeason?.id,
          teamId: "all", // Mantener siempre la carga completa del club para navegación instantánea
          date: overrideParams?.date ?? selectedDate,
          attendancePeriod: overrideParams?.attendancePeriod ?? attendancePeriod,
        });
        if (fresh && fresh.success) {
          setResult(fresh);
        } else if (fresh && !fresh.success) {
          console.warn("[CoordinatorDashboard] refreshData warning:", fresh.error);
        }
      } catch (err: any) {
        console.error("[CoordinatorDashboard] Error al actualizar:", err);
      } finally {
        setLoading(false);
      }
    },
    [selectedSeason?.id, selectedDate, attendancePeriod]
  );

  // Recarga ÚNICAMENTE cuando el usuario cambia deliberadamente la temporada en el selector superior
  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      if (selectedSeason?.id) {
        prevSeasonIdRef.current = selectedSeason.id;
      }
      return;
    }

    if (selectedSeason?.id && prevSeasonIdRef.current && selectedSeason.id !== prevSeasonIdRef.current) {
      prevSeasonIdRef.current = selectedSeason.id;
      refreshData({ seasonId: selectedSeason.id });
    } else if (selectedSeason?.id && !prevSeasonIdRef.current) {
      prevSeasonIdRef.current = selectedSeason.id;
    }
  }, [selectedSeason?.id]);

  const handleSelectTeamId = (teamId: string) => {
    setSelectedTeamId(teamId);
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

  // Lista canónica de equipos del club
  const teamsList: CoordinatorTeamItem[] = data.teams && data.teams.length > 0
    ? data.teams
    : (((data.sports as any)?.teamStats || []) as any[]).map((t: any) => ({
        id: t.teamId,
        name: t.teamName,
        category: t.teamCategory || t.category || '',
        color: null,
        coachName: null,
        playersCount: 0,
      }));

  const { kpis, alerts, discipline, attendance, sports, schedule } = data;

  // Filtrado reactivo e instantáneo según si es visión global ("all") o subpanel de equipo
  const isGlobalView = selectedTeamId === "all";
  const currentTeam = teamsList.find((t) => t.id === selectedTeamId);

  // Alertas
  const displayedAlerts = isGlobalView
    ? alerts
    : alerts.filter((a) => !a.teamId || a.teamId === selectedTeamId);

  // Disciplina
  const displayedDisciplineRecords = isGlobalView
    ? discipline.allTrackedPlayers
    : discipline.allTrackedPlayers.filter((p) => p.teamId === selectedTeamId);

  const displayedRecentCards = isGlobalView
    ? discipline.recentMatchCards || []
    : (discipline.recentMatchCards || []).filter((c) => c.teamId === selectedTeamId);

  // Asistencia y parte médico
  const displayedTeamsAttendance = isGlobalView
    ? attendance.teamsAttendance || []
    : (attendance.teamsAttendance || []).filter((t) => t.teamId === selectedTeamId);

  const displayedInjuries = isGlobalView
    ? attendance.activeInjuries
    : attendance.activeInjuries.filter((i) => i.teamId === selectedTeamId);

  // Situación deportiva
  const displayedSportsData = useMemo(() => {
    if (isGlobalView) return sports;
    const teamStats = (sports.teamStats || []).filter((t: any) => t.teamId === selectedTeamId);
    return {
      ...sports,
      teamStats,
    };
  }, [sports, isGlobalView, selectedTeamId]);

  // Entrenamientos
  const displayedTeamsTrainings = isGlobalView
    ? schedule.teamsTrainings || []
    : (schedule.teamsTrainings || []).filter((t) => t.teamId === selectedTeamId);

  // KPIs del equipo específico
  const currentTeamAttSummary = (attendance.teamsAttendance || []).find((t) => t.teamId === selectedTeamId);
  const currentTeamSportsStats = (sports.teamStats || []).find((t: any) => t.teamId === selectedTeamId);
  const currentTeamSuspended = displayedDisciplineRecords.filter((r) => r.status === "Sancionado").length;
  const currentTeamApercibidos = displayedDisciplineRecords.filter((r) => r.status === "Apercibido").length;

  return (
    <div className="min-h-screen bg-slate-50 pb-16 overflow-x-hidden">
      {/* 1. Cabecera con Selector Desplegable Único (por defecto en Todos los equipos) */}
      <CoordinatorHeader
        userFirstName={userFirstName}
        seasonName={data.seasonName}
        matchdayNumber={data.matchdayNumber}
        selectedTeamId={selectedTeamId}
        onSelectTeamId={handleSelectTeamId}
        teams={teamsList}
        isLoading={loading}
        onRefresh={() => refreshData()}
        onShare={() => setShowMatchdayModal(true)}
      />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5 sm:space-y-6">
        {/* Banner de contexto cuando se selecciona un subpanel de equipo */}
        {!isGlobalView && currentTeam && (
          <div className="p-4 bg-gradient-to-r from-indigo-900 to-blue-900 text-white rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black tracking-tight">{currentTeam.name}</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/40 text-indigo-100 border border-indigo-400/40">
                    Subpanel de Equipo
                  </span>
                </div>
                <p className="text-xs text-indigo-200">
                  {currentTeam.category} · {currentTeam.coachName ? `Entrenador: ${currentTeam.coachName}` : "Cuerpo Técnico"} · {currentTeam.playersCount ? `${currentTeam.playersCount} jugadores` : "Plantilla federada"}
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelectedTeamId("all")}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white text-indigo-950 hover:bg-slate-100 rounded-xl text-xs font-extrabold shadow-sm transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver a Todos los Equipos</span>
            </button>
          </div>
        )}

        {/* 2. Banner de Alertas Inteligentes (disciplina, lesiones, absentismo >1 día/semana, horario, mensajes) */}
        <CriticalAlertsBanner alerts={displayedAlerts} />

        {/* 3. Métricas Rápidas de un Solo Vistazo (KPIs) */}
        {isGlobalView ? (
          /* KPIs Globales (Todos los Equipos) */
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
        ) : (
          /* KPIs Específicos del Equipo Seleccionado */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-extrabold uppercase">Plantilla</span>
                <Users className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {currentTeamAttSummary?.totalPlayers || currentTeam?.playersCount || "—"}
              </p>
              <p className="text-[10px] text-slate-400">Fichas activas</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-extrabold uppercase">Sancionados</span>
                <ShieldAlert className="w-4 h-4 text-red-600" />
              </div>
              <p className={`text-2xl font-black mt-1 ${currentTeamSuspended > 0 ? "text-red-600" : "text-slate-900"}`}>
                {currentTeamSuspended}
              </p>
              <p className="text-[10px] text-slate-400">Bajas disciplinarias</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-extrabold uppercase">Apercibidos</span>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <p className={`text-2xl font-black mt-1 ${currentTeamApercibidos > 0 ? "text-amber-600" : "text-slate-900"}`}>
                {currentTeamApercibidos}
              </p>
              <p className="text-[10px] text-slate-400">A 1 tarjeta (4🟨)</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-extrabold uppercase">Asistencia</span>
                <Activity className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-emerald-600 mt-1">
                {currentTeamAttSummary?.attendanceRate ?? 89}%
              </p>
              <p className="text-[10px] text-slate-400">Objetivo: 85%</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-extrabold uppercase">Lesiones</span>
                <Heart className="w-4 h-4 text-rose-500" />
              </div>
              <p className={`text-2xl font-black mt-1 ${displayedInjuries.length > 0 ? "text-rose-600" : "text-slate-900"}`}>
                {displayedInjuries.length}
              </p>
              <p className="text-[10px] text-slate-400">Bajas médicas</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-extrabold uppercase">Posición</span>
                <Trophy className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {currentTeamSportsStats?.currentPosition ? `${currentTeamSportsStats.currentPosition}º` : "—"}
              </p>
              <p className="text-[10px] text-slate-400">{currentTeamSportsStats?.points ?? 0} puntos en liga</p>
            </div>
          </div>
        )}

        {/* 4. Bloque de Control Disciplinario y Tarjetas FFCV (con últimas tarjetas y desplegable para esconder informe) */}
        <DisciplineSection
          records={displayedDisciplineRecords}
          recentCards={displayedRecentCards}
          onPlayerClick={(playerId) => router.push(`/dashboard/matches?view=disciplina`)}
        />

        {/* 5. Bloque de Asistencia por Equipo y Parte Médico (lado a lado, con aviso y visor de ausentes) */}
        <AttendanceOperationsSection
          globalWeeklyRate={attendance.globalWeeklyRate}
          categories={attendance.categories}
          injuries={displayedInjuries}
          teamsAttendance={displayedTeamsAttendance}
          currentPeriod={attendancePeriod}
          onPeriodChange={handleAttendancePeriodChange}
        />

        {/* 6. Situación Deportiva (con modal interactivo de detalles por equipo al pulsar) */}
        <SituacionDeportivaSection
          sports={displayedSportsData as any}
          kpis={{
            activePlayers: isGlobalView ? kpis.totalPlayers : (currentTeamAttSummary?.totalPlayers || currentTeam?.playersCount || 0),
            activeTeams: isGlobalView ? kpis.totalTeams : 1,
          }}
          injuries={{
            activeInjuriesCount: displayedInjuries.length,
            activeInjuriesList: (isGlobalView
              ? (data.injuries?.activeInjuriesList || [])
              : (data.injuries?.activeInjuriesList || []).filter((i: any) => i.teamId === selectedTeamId)
            ) as any,
          }}
        />

        {/* 7. Agenda de Entrenamientos por Equipo (SOLO ENTRENAMIENTOS, NO INSTALACIONES) */}
        <TrainingsAgendaSection
          teamsTrainings={displayedTeamsTrainings}
          selectedTeamId={selectedTeamId}
          onSelectTeam={handleSelectTeamId}
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
