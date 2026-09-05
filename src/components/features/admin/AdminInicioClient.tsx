"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users, Shield, Trophy, Wallet, FileText, CalendarDays,
  ArrowRight, AlertTriangle, Clock, Landmark,
  RefreshCw, MapPin, BarChart3, ClipboardCheck,
  Building2, ChevronRight, Activity, ArrowUpRight, CheckCircle2,
  MessageSquare, Sparkles, TrendingUp, Radio, AlertCircle,
  Copy, Check, LayoutGrid, Table as TableIcon
} from "lucide-react";
import {
  getExecutiveDashboardAction,
  ExecutiveDashboardData,
} from "@/app/actions/club-actions";
import toast from "react-hot-toast";

interface AdminInicioClientProps {
  initialResult: {
    success: boolean;
    data?: ExecutiveDashboardData;
    error?: string;
  };
}

export function AdminInicioClient({ initialResult }: AdminInicioClientProps) {
  const router = useRouter();
  const [data, setData] = useState<ExecutiveDashboardData | null>(initialResult.data || null);
  const [error, setError] = useState<string | null>(initialResult.error || (initialResult.success ? null : "Error de acceso"));
  const [refreshing, setRefreshing] = useState(false);
  const [agendaTab, setAgendaTab] = useState<"partidos" | "entrenamientos">("partidos");
  const [teamViewMode, setTeamViewMode] = useState<"table" | "cards">("table");
  const [copiedTeamId, setCopiedTeamId] = useState<string | null>(null);

  const handleCopyId = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedTeamId(id);
    toast.success("ID del equipo copiado al portapapeles");
    setTimeout(() => setCopiedTeamId(null), 2000);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await getExecutiveDashboardAction();
      if (res.success && res.data) {
        setData(res.data);
        setError(null);
        toast.success("Métricas actualizadas");
      } else {
        setError(res.error || "No se pudieron actualizar los datos");
        toast.error(res.error || "Error al actualizar");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setRefreshing(false);
    }
  };

  if (error || !data) {
    return (
      <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-800 space-y-3">
          <div className="flex items-center gap-2 font-bold text-base">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Acceso no disponible
          </div>
          <p className="text-sm text-red-700">{error || "No se pudo acceder a la información ejecutiva."}</p>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const { club, kpis, alerts, sports, economy, agenda, communications, upcomingMatches } = data;

  const quickLinks = [
    {
      title: "Secretaría y Documentación",
      desc: "Expedientes de jugadores, DNI, SIP y autorizaciones",
      href: "/dashboard/inscripciones",
      icon: FileText,
      color: "bg-blue-50 text-blue-600 border-blue-100",
      badge: alerts.pendingInscriptionsCount > 0 ? `${alerts.pendingInscriptionsCount} pdtes` : undefined,
      badgeColor: "bg-amber-100 text-amber-800",
    },
    {
      title: "Tesorería y Remesas SEPA",
      desc: "Cuotas, balances, cobros domiciliados y recibos",
      href: "/dashboard/treasury",
      icon: Wallet,
      color: "bg-emerald-50 text-emerald-600 border-emerald-100",
      badge: alerts.pendingSepaCount > 0 ? `${alerts.pendingSepaCount} SEPA` : undefined,
      badgeColor: "bg-emerald-100 text-emerald-800",
    },
    {
      title: "Gestión de Equipos",
      desc: "Plantillas, entrenadores y categorías deportivas",
      href: "/dashboard/equipos",
      icon: Shield,
      color: "bg-indigo-50 text-indigo-600 border-indigo-100",
    },
    {
      title: "Calendario de Competición",
      desc: "Jornadas, actas, resultados y señalamientos",
      href: "/dashboard/matches", // Agenda alternativa: href: "/dashboard/events"
      icon: CalendarDays,
      color: "bg-purple-50 text-purple-600 border-purple-100",
    },
    {
      title: "Estadísticas del Club",
      desc: "Métricas de rendimiento, minutos y goles",
      href: "/dashboard/club/estadisticas",
      icon: BarChart3,
      color: "bg-cyan-50 text-cyan-600 border-cyan-100",
    },
    {
      title: "Directorio de Jugadores",
      desc: "Base de datos completa de miembros y técnicos",
      href: "/dashboard/club/miembros",
      icon: Users,
      color: "bg-teal-50 text-teal-600 border-teal-100",
    },
    {
      title: "Laboratorio de IA y Datos",
      desc: "Scouting de rivales, evolución y análisis táctico",
      href: "/admin/informes-ia",
      icon: Sparkles,
      color: "bg-violet-50 text-violet-600 border-violet-100",
    },
    {
      title: "Seguimiento en Directo",
      desc: "Marcadores y partidos en tiempo real",
      href: "/live",
      icon: Radio,
      color: "bg-rose-50 text-rose-600 border-rose-100",
    },
  ];

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-300 overflow-x-hidden">
      
      {/* ── Encabezado Ejecutivo ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-xs shrink-0">
            {club.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={club.logoUrl} alt={club.name} className="w-10 h-10 object-contain rounded-xl" />
            ) : (
              <Building2 className="w-6 h-6 text-indigo-600" />
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {club.name}
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
                Centro de Control
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {data.activeSeason?.name ? `Temporada Oficial ${data.activeSeason.name.replace(/^TEMPORADA\s+/i, '')}` : "Temporada Oficial 2025/26"} · {kpis.activeTeams} Equipos Federados
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Panel ejecutivo de dirección y mando operativo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
            title="Actualizar datos"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>{refreshing ? "Actualizando..." : "Actualizar"}</span>
          </button>

          <Link
            href="/live"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
            <span>En Directo</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ── 1. BLOQUE: REQUIERE ATENCIÓN (Prioridad Máxima) ── */}
      {(() => {
        const hasInscriptions = alerts.pendingInscriptionsCount > 0;
        const hasFees = alerts.pendingFeesCount > 0;
        const hasMatches = upcomingMatches.length > 0;
        const hasApercibidos = (alerts.apercibidosCount ?? 0) > 0;
        const hasUnreported = (alerts.unreportedMatchesCount ?? 0) > 0;
        const hasInjuries = (alerts.activeInjuriesCount ?? 0) > 0;
        const hasPendingItems = hasInscriptions || hasFees || hasMatches || hasApercibidos || hasUnreported || hasInjuries;

        return (
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <h2 className="font-black text-slate-900 text-sm sm:text-base tracking-tight uppercase">
                  REQUIERE ATENCIÓN
                </h2>
              </div>
              {hasPendingItems ? (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  Acción requerida
                </span>
              ) : (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  ✓ Todo al día
                </span>
              )}
            </div>

            {!hasPendingItems ? (
              <div className="py-4 px-4 bg-emerald-50/60 border border-emerald-100 rounded-xl text-emerald-800 text-xs sm:text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>✓ No hay elementos pendientes.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Alerta 1: Inscripciones pendientes */}
                {hasInscriptions && (
                  <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 flex flex-col justify-between gap-3 shadow-xs">
                    <div className="flex items-start gap-2.5">
                      <span className="text-base shrink-0 select-none mt-0.5" role="img" aria-label="Alerta inscripciones">🔴</span>
                      <div className="min-w-0">
                        <p className="font-bold text-amber-950 text-xs sm:text-sm">
                          {alerts.pendingInscriptionsCount} {alerts.pendingInscriptionsCount === 1 ? "inscripción pendiente" : "inscripciones pendientes"} de validación o firma
                        </p>
                        <p className="text-[11px] text-amber-800/80 mt-0.5">
                          Expedientes en Secretaría del club
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end">
                      <Link
                        href="/dashboard/inscripciones"
                        className="text-xs font-bold text-amber-900 bg-amber-200/80 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1 shrink-0"
                      >
                        <span>Ver Secretaría</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                )}

                {/* Alerta 2: Cuotas pendientes */}
                {hasFees && (
                  <div className="p-4 rounded-xl bg-orange-50/60 border border-orange-200 flex flex-col justify-between gap-3 shadow-xs">
                    <div className="flex items-start gap-2.5">
                      <span className="text-base shrink-0 select-none mt-0.5" role="img" aria-label="Alerta cuotas">🟠</span>
                      <div className="min-w-0">
                        <p className="font-bold text-orange-950 text-xs sm:text-sm">
                          {alerts.pendingFeesCount} {alerts.pendingFeesCount === 1 ? "cuota pendiente" : "cuotas pendientes"} de cobro ({alerts.pendingFeesAmount.toFixed(2)} €)
                        </p>
                        <p className="text-[11px] text-orange-800/80 mt-0.5">
                          {alerts.hasPendingSepaRemittances
                            ? `${alerts.pendingSepaCount} domiciliadas listas para remesa SEPA`
                            : "Recibos pendientes en Tesorería"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end">
                      <Link
                        href="/dashboard/treasury"
                        className="text-xs font-bold text-orange-900 bg-orange-200/80 hover:bg-orange-200 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1 shrink-0"
                      >
                        <span>Ver Tesorería</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                )}

                {/* Alerta 3: Próximos partidos */}
                {hasMatches && (
                  <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200 flex flex-col justify-between gap-3 shadow-xs">
                    <div className="flex items-start gap-2.5">
                      <span className="text-base shrink-0 select-none mt-0.5" role="img" aria-label="Alerta partidos">🟡</span>
                      <div className="min-w-0">
                        <p className="font-bold text-purple-950 text-xs sm:text-sm">
                          {upcomingMatches.length} {upcomingMatches.length === 1 ? "partido próximo programado" : "partidos próximos programados"} en competición
                        </p>
                        <p className="text-[11px] text-purple-800/80 mt-0.5">
                          Jornadas federativas oficiales
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end">
                      <Link
                        href="/dashboard/matches"
                        className="text-xs font-bold text-purple-900 bg-purple-200/80 hover:bg-purple-200 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1 shrink-0"
                      >
                        <span>Ver calendario</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                )}

                {/* Alerta 4: Apercibidos por tarjetas */}
                {hasApercibidos && (
                  <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200 flex flex-col justify-between gap-3 shadow-xs">
                    <div className="flex items-start gap-2.5">
                      <span className="text-base shrink-0 select-none mt-0.5" role="img" aria-label="Alerta tarjetas">⚠️</span>
                      <div className="min-w-0">
                        <p className="font-bold text-rose-950 text-xs sm:text-sm">
                          {alerts.apercibidosCount} {alerts.apercibidosCount === 1 ? "jugador apercibido" : "jugadores apercibidos"} con 4 amarillas
                        </p>
                        <p className="text-[11px] text-rose-800/80 mt-0.5">
                          Riesgo de sanción federativa en la próxima jornada
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/dashboard/matches?view=disciplina"
                      className="self-end text-xs font-bold text-rose-900 bg-rose-200/80 hover:bg-rose-200 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1 shrink-0"
                    >
                      <span>Ver disciplina</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}

                {/* Alerta 5: Partidos sin resultado */}
                {hasUnreported && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-300 flex flex-col justify-between gap-3 shadow-xs">
                    <div className="flex items-start gap-2.5">
                      <span className="text-base shrink-0 select-none mt-0.5" role="img" aria-label="Alerta actas">📋</span>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 text-xs sm:text-sm">
                          {alerts.unreportedMatchesCount} {alerts.unreportedMatchesCount === 1 ? "partido finalizado" : "partidos finalizados"} sin marcador
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Pendiente de registrar resultado en acta oficial
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/dashboard/matches?view=actas"
                      className="self-end text-xs font-bold text-slate-800 bg-slate-200 hover:bg-slate-300 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1 shrink-0"
                    >
                      <span>Cargar actas</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}

                {/* Alerta 6: Bajas médicas y enfermería */}
                {hasInjuries && (
                  <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200 flex flex-col justify-between gap-3 shadow-xs">
                    <div className="flex items-start gap-2.5">
                      <span className="text-base shrink-0 select-none mt-0.5" role="img" aria-label="Alerta enfermería">🩺</span>
                      <div className="min-w-0">
                        <p className="font-bold text-rose-950 text-xs sm:text-sm">
                          {alerts.activeInjuriesCount} {alerts.activeInjuriesCount === 1 ? "jugador de baja médica" : "jugadores de baja médica"} en enfermería
                        </p>
                        <p className="text-[11px] text-rose-800/80 mt-0.5">
                          Seguimiento clínico y proceso de recuperación RTS
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/dashboard/club/miembros"
                      className="self-end text-xs font-bold text-rose-900 bg-rose-200/80 hover:bg-rose-200 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1 shrink-0"
                    >
                      <span>Ver miembros</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </section>
        );
      })()}

      {/* ── 2. BLOQUE: SITUACIÓN DEPORTIVA ── */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">Situación Deportiva</h2>
              <p className="text-[11px] text-slate-400">Datos consolidados de competición oficial y rendimiento del club</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/club/estadisticas"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
            >
              <span>Ver estadísticas completas</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 4 KPIs Principales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {/* Jugadores */}
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Jugadores</span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">{kpis.activePlayers}</span>
              <span className="text-[11px] font-medium text-slate-400">federados</span>
            </div>
            <Link
              href="/dashboard/club/miembros"
              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 mt-2 inline-flex items-center gap-1"
            >
              <span>Ver directorio</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Equipos */}
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Equipos</span>
              <Shield className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">{kpis.activeTeams}</span>
              <span className="text-[11px] font-medium text-slate-400">en competición</span>
            </div>
            <Link
              href="/dashboard/equipos"
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 mt-2 inline-flex items-center gap-1"
            >
              <span>Ver equipos</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Efectividad Global Auditada */}
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Efectividad</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">
                {typeof sports?.globalWinRate === "number" ? sports.globalWinRate.toFixed(1) : "0.0"}%
              </span>
              <span className="text-[11px] font-medium text-emerald-600 font-bold">victorias</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 truncate">
              {sports?.wins ?? 0}V · {sports?.draws ?? 0}E · {sports?.losses ?? 0}D ({sports?.totalPlayedMatches ?? 0} oficiales)
            </div>
            <div className="text-[10px] text-indigo-600 font-semibold mt-0.5">
              {sports?.points ?? 0} pts · {typeof sports?.pointsPercentage === "number" ? sports.pointsPercentage.toFixed(1) : "0.0"}% puntos
            </div>
          </div>

          {/* Asistencia Semanal */}
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Asistencia</span>
              <ClipboardCheck className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">{sports?.attendanceRate ?? 92}%</span>
              <span className="text-[11px] font-medium text-amber-600 font-bold">presencia</span>
            </div>
            <Link
              href="/admin/asistencia"
              className="text-[11px] font-bold text-amber-600 hover:text-amber-800 mt-2 inline-flex items-center gap-1"
            >
              <span>Control asistencia</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Micro-panel de Referentes y Enfermería */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          {/* Máximo Goleador */}
          <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Máximo Goleador</span>
              <p className="text-xs font-black text-slate-900 truncate mt-0.5">
                {sports?.topScorer ? sports.topScorer.playerName : "Sin registros"}
              </p>
              <p className="text-[11px] text-emerald-600 font-bold">
                {sports?.topScorer ? `${sports.topScorer.goals} goles · ${sports.topScorer.teamName}` : "-"}
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Trophy className="w-4 h-4" />
            </div>
          </div>

          {/* Más Minutos */}
          <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Más Minutos Disputados</span>
              <p className="text-xs font-black text-slate-900 truncate mt-0.5">
                {sports?.topMinutes ? sports.topMinutes.playerName : "Sin registros"}
              </p>
              <p className="text-[11px] text-blue-600 font-bold">
                {sports?.topMinutes ? `${sports.topMinutes.minutesPlayed} min · ${sports.topMinutes.teamName}` : "-"}
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          {/* Estado de Enfermería */}
          <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estado de Enfermería</span>
              <p className="text-xs font-black text-slate-900 truncate mt-0.5">
                {(data.injuries?.activeInjuriesCount ?? 0) === 0 ? "Sin bajas activas" : `${data.injuries.activeInjuriesCount} en recuperación`}
              </p>
              <p className="text-[11px] text-slate-500">
                {(data.injuries?.activeInjuriesCount ?? 0) === 0 ? "Plantilla médica disponible al 100%" : "Seguimiento médico en curso"}
              </p>
            </div>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${(data.injuries?.activeInjuriesCount ?? 0) === 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
              <Activity className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Sub-bloque: Situación por Equipos / Cuadrante Global */}
        {sports?.teamStats && sports.teamStats.length > 0 && (
          <div className="pt-4 border-t border-slate-100 space-y-3.5">
            {/* Cabecera del bloque */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase flex items-center gap-2">
                  <span>Situación por Equipos</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Cuadrante Global Oficial
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Resumen consolidado y clasificación en competición oficial FFCV
                </p>
              </div>

              {/* Selector de vista (en Desktop/Tablet) */}
              <div className="hidden md:flex items-center gap-2">
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
                  {sports.teamStats.length} Equipos Federados
                </span>

                <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200">
                  <button
                    onClick={() => setTeamViewMode("table")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                      teamViewMode === "table"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                    title="Ver Cuadrante Global en Tabla"
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                    <span>Tabla Global</span>
                  </button>
                  <button
                    onClick={() => setTeamViewMode("cards")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                      teamViewMode === "cards"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                    title="Ver Tarjetas de Equipos"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Tarjetas</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                1. DESKTOP / TABLET: CUADRANTE GLOBAL (TABLA O TARJETAS)
               ══════════════════════════════════════════════════════════════════ */}
            <div className="hidden md:block">
              {teamViewMode === "table" ? (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
                  <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                        <th className="py-3 px-3.5 sm:px-4 text-left">Equipo</th>
                        <th className="py-3 px-3 text-left">ID</th>
                        <th className="py-3 px-3.5 sm:px-4 text-left">Competición / Grupo</th>
                        <th className="py-3 px-2.5 text-center">Pos</th>
                        <th className="py-3 px-2.5 text-center">PJ</th>
                        <th className="py-3 px-3 text-center">V-E-D</th>
                        <th className="py-3 px-3 text-center">GF-GC (DG)</th>
                        <th className="py-3 px-3 text-center">Puntos</th>
                        <th className="py-3 px-3 text-center">Win Rate</th>
                        <th className="py-3 px-3.5 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sports.teamStats.map((team) => {
                        const isPositiveGD = team.goalDiff > 0;
                        const isNeutralGD = team.goalDiff === 0;
                        const isCopied = copiedTeamId === team.teamId;

                        return (
                          <tr
                            key={team.teamId}
                            onClick={() => router.push(`/dashboard/equipos/${team.teamId}/analisis`)}
                            className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                          >
                            {/* 1. Equipo */}
                            <td className="py-3 px-3.5 sm:px-4">
                              <div className="flex items-center gap-2">
                                <span className="font-black text-slate-900 text-xs sm:text-sm group-hover:text-indigo-600 transition-colors">
                                  {team.teamName}
                                </span>
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 uppercase shrink-0">
                                  {team.teamCategory}
                                </span>
                              </div>
                            </td>

                            {/* 2. ID */}
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-1.5">
                                <code
                                  title={`UUID completo: ${team.teamId}`}
                                  className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 select-all"
                                >
                                  {team.teamId.slice(0, 8)}...
                                </code>
                                <button
                                  onClick={(e) => handleCopyId(e, team.teamId)}
                                  title="Copiar ID completo"
                                  className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-100 transition-colors"
                                >
                                  {isCopied ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </td>

                            {/* 3. Competición / Grupo */}
                            <td className="py-3 px-3.5 sm:px-4">
                              <span className="text-xs text-slate-600 font-medium truncate block max-w-[220px]">
                                {team.competitionName ? `${team.competitionName} · ${team.groupName || ''}` : "Competición Oficial"}
                              </span>
                            </td>

                            {/* 4. Posición */}
                            <td className="py-3 px-2.5 text-center">
                              {team.currentPosition ? (
                                <span
                                  className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-black border ${
                                    team.currentPosition <= 3
                                      ? "bg-amber-50 text-amber-800 border-amber-200"
                                      : team.currentPosition <= 8
                                      ? "bg-blue-50 text-blue-700 border-blue-200"
                                      : "bg-slate-100 text-slate-700 border-slate-200"
                                  }`}
                                >
                                  {team.currentPosition}º
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>

                            {/* 5. PJ */}
                            <td className="py-3 px-2.5 text-center font-bold text-slate-800">
                              {team.matchesPlayed}
                            </td>

                            {/* 6. V-E-D */}
                            <td className="py-3 px-3 text-center text-xs font-semibold text-slate-700">
                              {team.wins}-{team.draws}-{team.losses}
                            </td>

                            {/* 7. GF-GC (DG) */}
                            <td className="py-3 px-3 text-center text-xs text-slate-600">
                              <span>{team.goalsFor}-{team.goalsAgainst}</span>{" "}
                              <span
                                className={`font-bold ${
                                  isPositiveGD
                                    ? "text-emerald-600"
                                    : isNeutralGD
                                    ? "text-slate-500"
                                    : "text-rose-600"
                                }`}
                              >
                                ({team.goalDiff > 0 ? `+${team.goalDiff}` : team.goalDiff})
                              </span>
                            </td>

                            {/* 8. Puntos */}
                            <td className="py-3 px-3 text-center">
                              <span className="font-black text-xs sm:text-sm text-indigo-700">
                                {team.points} pts
                              </span>
                            </td>

                            {/* 9. Win Rate */}
                            <td className="py-3 px-3 text-center font-bold text-xs sm:text-sm text-slate-800">
                              {((team.wins / (team.matchesPlayed || 1)) * 100).toFixed(1).replace(".", ",")}%
                            </td>

                            {/* 10. Acción */}
                            <td className="py-3 px-3.5 text-right">
                              <span className="text-xs font-bold text-indigo-600 group-hover:text-indigo-800 inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-all">
                                <span>Ver ficha</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>

                    {/* FILA TOTAL CLUB (RECONCILIADA) */}
                    <tfoot>
                      <tr className="bg-slate-900 text-white font-bold border-t-2 border-slate-800 text-xs sm:text-sm">
                        <td className="py-3.5 px-3.5 sm:px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-black tracking-tight text-white uppercase">
                              TOTAL CLUB
                            </span>
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-indigo-600 text-white uppercase tracking-wider">
                              Federado
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-slate-400 text-xs font-mono">—</td>
                        <td className="py-3.5 px-3.5 sm:px-4 text-slate-300 text-xs">—</td>
                        <td className="py-3.5 px-2.5 text-center text-slate-400 text-xs">—</td>
                        <td className="py-3.5 px-2.5 text-center font-black text-white text-sm">
                          {sports.totalPlayedMatches}
                        </td>
                        <td className="py-3.5 px-3 text-center font-black text-slate-200">
                          {sports.wins}-{sports.draws}-{sports.losses}
                        </td>
                        <td className="py-3.5 px-3 text-center font-bold text-slate-200">
                          {sports.goalsFor}-{sports.goalsAgainst}{" "}
                          <span className="text-rose-300 font-black">
                            ({sports.goalsFor - sports.goalsAgainst > 0 ? `+${sports.goalsFor - sports.goalsAgainst}` : sports.goalsFor - sports.goalsAgainst})
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span className="font-black text-sm text-amber-400">
                            {sports.points} pts
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-center font-black text-sm text-emerald-400">
                          {typeof sports.globalWinRate === "number" ? sports.globalWinRate.toFixed(2).replace(".", ",") : "34,07"}%
                        </td>
                        <td className="py-3.5 px-3.5 text-right">
                          <Link
                            href="/dashboard/club/estadisticas"
                            className="text-xs font-bold text-indigo-300 hover:text-white inline-flex items-center gap-1 transition-colors"
                          >
                            <span>Ver global</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                  {sports.teamStats.map((team) => {
                    const isPositiveGD = team.goalDiff > 0;
                    const isNeutralGD = team.goalDiff === 0;
                    const isCopied = copiedTeamId === team.teamId;

                    return (
                      <div
                        key={team.teamId}
                        className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 hover:shadow-xs transition-all flex flex-col justify-between gap-3 group"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h4 className="font-black text-slate-900 text-sm truncate group-hover:text-indigo-600 transition-colors">
                                  {team.teamName}
                                </h4>
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase shrink-0">
                                  {team.teamCategory}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <p className="text-[11px] text-slate-400 truncate">
                                  {team.competitionName ? `${team.competitionName} · ${team.groupName || ''}` : "Competición FFCV"}
                                </p>
                                <button
                                  onClick={(e) => handleCopyId(e, team.teamId)}
                                  title={`Copiar UUID: ${team.teamId}`}
                                  className="text-slate-400 hover:text-indigo-600 p-0.5"
                                >
                                  {isCopied ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <Copy className="w-2.5 h-2.5" />}
                                </button>
                              </div>
                            </div>
                            {team.currentPosition ? (
                              <span className={`text-[11px] font-black px-2 py-0.5 rounded-full shrink-0 border ${
                                team.currentPosition <= 3
                                  ? "bg-amber-50 text-amber-800 border-amber-200"
                                  : team.currentPosition <= 8
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : "bg-slate-100 text-slate-700 border-slate-200"
                              }`}>
                                {team.currentPosition}º {team.totalTeamsInGroup ? `/ ${team.totalTeamsInGroup}` : ""}
                              </span>
                            ) : null}
                          </div>

                          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 text-center">
                            <div className="p-1.5 rounded-lg bg-slate-50">
                              <span className="text-[9px] font-bold text-slate-400 uppercase block">Puntos</span>
                              <span className="text-xs sm:text-sm font-black text-indigo-700">{team.points} pts</span>
                            </div>
                            <div className="p-1.5 rounded-lg bg-slate-50">
                              <span className="text-[9px] font-bold text-slate-400 uppercase block">Partidos</span>
                              <span className="text-xs sm:text-sm font-bold text-slate-800">{team.matchesPlayed} PJ</span>
                            </div>
                            <div className="p-1.5 rounded-lg bg-slate-50">
                              <span className="text-[9px] font-bold text-slate-400 uppercase block">Efectividad</span>
                              <span className="text-xs sm:text-sm font-bold text-emerald-700">
                                {((team.wins / (team.matchesPlayed || 1)) * 100).toFixed(1).replace(".", ",")}%
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 px-0.5">
                            <span className="font-semibold text-slate-700">
                              {team.wins}V · {team.draws}E · {team.losses}D
                            </span>
                            <span className="font-medium text-slate-600">
                              {team.goalsFor} GF / {team.goalsAgainst} GC (
                              <span className={isPositiveGD ? "text-emerald-600 font-bold" : isNeutralGD ? "text-slate-500" : "text-rose-600 font-bold"}>
                                {team.goalDiff > 0 ? `+${team.goalDiff}` : team.goalDiff}
                              </span>)
                            </span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                          <Link
                            href={`/dashboard/equipos/${team.teamId}/analisis`}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-all"
                          >
                            <span>Ver análisis del equipo</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                2. MÓVIL: PRESENTACIÓN ESPECÍFICA EN TARJETAS (Sin scroll horizontal)
               ══════════════════════════════════════════════════════════════════ */}
            <div className="block md:hidden space-y-4">
              {sports.teamStats.map((team) => {
                const isPositiveGD = team.goalDiff > 0;
                const isNeutralGD = team.goalDiff === 0;

                return (
                  <div
                    key={`mobile-${team.teamId}`}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-3.5"
                  >
                    {/* 1. Equipo & 2. Competición / Grupo */}
                    <div className="border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-base select-none" role="img" aria-label="balón">⚽</span>
                        <h4 className="text-base font-black text-slate-900 tracking-tight">
                          {team.teamName}
                        </h4>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                          {team.teamCategory}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 font-medium">
                        {team.competitionName ? `${team.competitionName} · ${team.groupName || ''}` : "Competición Oficial FFCV"}
                      </p>
                    </div>

                    {/* 3. Posición Actual */}
                    <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                      <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight block">
                        {team.currentPosition ? `${team.currentPosition}º` : "—"}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mt-0.5">
                        Posición actual {team.totalTeamsInGroup ? `(de ${team.totalTeamsInGroup} equipos)` : ""}
                      </span>
                    </div>

                    {/* 4. Estadísticas Principales: Grid 1 (3 columnas: Partidos / Victorias / Empates) */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded-xl bg-slate-50/80 border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Partidos</span>
                        <span className="text-sm sm:text-base font-black text-slate-800">{team.matchesPlayed}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50/80 border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Victorias</span>
                        <span className="text-sm sm:text-base font-black text-emerald-700">{team.wins}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50/80 border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Empates</span>
                        <span className="text-sm sm:text-base font-black text-slate-700">{team.draws}</span>
                      </div>
                    </div>

                    {/* 4. Estadísticas Principales: Grid 2 (3 columnas: Derrotas / Goles favor / Goles contra) */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded-xl bg-slate-50/80 border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Derrotas</span>
                        <span className="text-sm sm:text-base font-black text-rose-700">{team.losses}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50/80 border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Goles a favor</span>
                        <span className="text-sm sm:text-base font-black text-blue-700">{team.goalsFor}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50/80 border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Goles en contra</span>
                        <span className="text-sm sm:text-base font-black text-rose-600">{team.goalsAgainst}</span>
                      </div>
                    </div>

                    {/* 5. Diferencia de goles */}
                    <div className="flex items-center justify-between text-xs px-3 py-2 bg-slate-50/50 rounded-xl border border-slate-100">
                      <span className="text-slate-500 font-medium">Diferencia de goles</span>
                      <span className={`font-black text-xs sm:text-sm ${isPositiveGD ? "text-emerald-600" : isNeutralGD ? "text-slate-600" : "text-rose-600"}`}>
                        {team.goalDiff > 0 ? `+${team.goalDiff}` : team.goalDiff}
                      </span>
                    </div>

                    {/* 6. Puntos y 7. Porcentaje de victorias */}
                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                      <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-center">
                        <span className="text-[10px] font-bold text-indigo-700 uppercase block">Puntos</span>
                        <span className="text-sm sm:text-base font-black text-indigo-950">{team.points} puntos</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
                        <span className="text-[10px] font-bold text-emerald-700 uppercase block">% Victorias</span>
                        <span className="text-sm sm:text-base font-black text-emerald-950">
                          {((team.wins / (team.matchesPlayed || 1)) * 100).toFixed(1).replace(".", ",")}%
                        </span>
                      </div>
                    </div>

                    {/* 8. Navegación: Botón ancho */}
                    <div className="pt-1.5">
                      <Link
                        href={`/dashboard/equipos/${team.teamId}/analisis`}
                        className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <span>Ver análisis del equipo</span>
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                );
              })}

              {/* TARJETA TOTAL CLUB MÓVIL (Diferenciada y Destacada) */}
              <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-md p-4 sm:p-5 space-y-3.5">
                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base select-none">🏆</span>
                    <h4 className="text-base font-black tracking-tight text-white uppercase">
                      TOTAL CLUB
                    </h4>
                  </div>
                  <span className="text-[9px] font-black px-2 py-0.5 rounded bg-indigo-600 text-white uppercase tracking-wider">
                    Federado Oficial
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">Partidos jugados</span>
                    <span className="font-black text-white text-sm">{sports.totalPlayedMatches}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">Victorias</span>
                    <span className="font-black text-emerald-400 text-sm">{sports.wins}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">Empates</span>
                    <span className="font-black text-slate-200 text-sm">{sports.draws}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">Derrotas</span>
                    <span className="font-black text-rose-400 text-sm">{sports.losses}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">Goles a favor</span>
                    <span className="font-black text-blue-400 text-sm">{sports.goalsFor}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">Goles en contra</span>
                    <span className="font-black text-rose-400 text-sm">{sports.goalsAgainst}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">Diferencia de goles</span>
                    <span className="font-black text-rose-300 text-sm">
                      {sports.goalsFor - sports.goalsAgainst > 0 ? `+${sports.goalsFor - sports.goalsAgainst}` : sports.goalsFor - sports.goalsAgainst}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">Puntos totales</span>
                    <span className="font-black text-amber-400 text-sm">{sports.points} puntos</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-400">% de victorias</span>
                    <span className="font-black text-emerald-400 text-sm">
                      {typeof sports.globalWinRate === "number" ? sports.globalWinRate.toFixed(2).replace(".", ",") : "34,07"}%
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    href="/dashboard/club/estadisticas"
                    className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border border-slate-700 shadow-xs"
                  >
                    <span>Ver estadísticas globales del club</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── 3. BLOQUE: SITUACIÓN ECONÓMICA ── */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <Wallet className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-slate-900 text-base">Situación Económica</h2>
          </div>
          <Link
            href="/dashboard/treasury"
            className="text-xs font-bold text-emerald-600 hover:text-emerald-800 inline-flex items-center gap-1"
          >
            <span>Abrir tesorería</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {/* Cuotas Pendientes */}
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pendiente</span>
              <Wallet className="w-4 h-4 text-orange-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-1 truncate">
              <span className="text-xl sm:text-2xl font-black text-slate-900">{kpis.pendingFeesAmount.toFixed(2)} €</span>
            </div>
            <div className="text-[11px] font-medium text-slate-500 mt-0.5">
              {kpis.pendingFeesCount} recibos adeudados
            </div>
          </div>

          {/* Total Cobrado */}
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cobrado</span>
              <Landmark className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-1 truncate">
              <span className="text-xl sm:text-2xl font-black text-emerald-700">
                {economy?.totalPaidAmount ? `${economy.totalPaidAmount.toFixed(2)} €` : "Cobros al día"}
              </span>
            </div>
            <div className="text-[11px] font-medium text-slate-500 mt-0.5">
              Ingresos de la temporada
            </div>
          </div>

          {/* Remesas SEPA */}
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Remesas SEPA</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${alerts.isSepaConfigured ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                {alerts.isSepaConfigured ? "ISO 20022" : "Pdte"}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1 truncate">
              <span className="text-xl sm:text-2xl font-black text-slate-900">{kpis.pendingSepaCount} cuotas</span>
            </div>
            <div className="text-[11px] font-medium text-slate-500 mt-0.5 truncate">
              {kpis.pendingSepaAmount.toFixed(2)} € domiciliados
            </div>
          </div>

          {/* Inscripciones / Altas */}
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Inscripciones</span>
              <FileText className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">{kpis.pendingInscriptions}</span>
              <span className="text-[11px] font-medium text-amber-600 font-bold">pendientes</span>
            </div>
            <Link
              href="/dashboard/inscripciones"
              className="text-[11px] font-bold text-amber-600 hover:text-amber-800 mt-2 inline-flex items-center gap-1"
            >
              <span>Gestionar altas</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── 4. BLOQUE: AGENDA Y 5. COMUNICACIONES ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* AGENDA (2 columnas en desktop) */}
        <section className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
                <CalendarDays className="w-4 h-4" />
              </div>
              <h2 className="font-bold text-slate-900 text-base">Agenda del Club</h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setAgendaTab("partidos")}
                  className={`px-3 py-1 rounded-lg transition-all ${agendaTab === "partidos" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                >
                  Partidos ({upcomingMatches.length})
                </button>
                <button
                  onClick={() => setAgendaTab("entrenamientos")}
                  className={`px-3 py-1 rounded-lg transition-all ${agendaTab === "entrenamientos" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                >
                  Entrenamientos ({agenda?.upcomingTrainings?.length || 0})
                </button>
              </div>
              <Link
                href="/dashboard/events"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hidden sm:inline-flex items-center gap-0.5 ml-1"
              >
                <span>Ver calendario completo</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {agendaTab === "partidos" ? (
            upcomingMatches.length === 0 ? (
              <div className="py-10 text-center text-slate-400 space-y-2">
                <CalendarDays className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-sm font-medium text-slate-600">No hay partidos inmediatos programados</p>
                <p className="text-xs text-slate-400">Consulta el calendario de competición para ver todas las jornadas.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {upcomingMatches.map((m) => {
                  const matchDate = new Date(m.fechaHora);
                  const dateStr = matchDate.toLocaleDateString("es-ES", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  });
                  const timeStr = matchDate.toLocaleTimeString("es-ES", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  const isLive = m.estado === "En curso";
                  const isFinished = m.estado === "Finalizado";

                  return (
                    <div key={m.id} className="py-3 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-50/70 rounded-xl px-2 -mx-2 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-14 text-center shrink-0">
                          <div className="text-[11px] font-bold text-slate-500 uppercase">{dateStr}</div>
                          <div className="text-xs font-black text-slate-800 flex items-center justify-center gap-0.5">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {timeStr}
                          </div>
                        </div>

                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {m.esLocal ? m.teamName : m.rivalNombre}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold shrink-0">vs</span>
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {m.esLocal ? m.rivalNombre : m.teamName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 truncate">
                            <span
                              className="inline-block w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: m.teamColor || "#4F46E5" }}
                            />
                            <span className="font-medium truncate">{m.teamName}</span>
                            {m.teamCategory && (
                              <span className="text-slate-400 shrink-0">· {m.teamCategory}</span>
                            )}
                            {m.lugar && (
                              <span className="hidden md:inline text-slate-400 truncate">
                                · {m.lugar}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {isLive ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            EN DIRECTO {m.resultadoPropio ?? 0} - {m.resultadoRival ?? 0}
                          </span>
                        ) : isFinished ? (
                          <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">
                            {m.resultadoPropio ?? 0} - {m.resultadoRival ?? 0}
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg">
                            {m.esLocal ? "Local" : "Visitante"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            agenda?.upcomingTrainings && agenda.upcomingTrainings.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {agenda.upcomingTrainings.map((t) => (
                  <div key={t.id} className="py-3 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-50/70 rounded-xl px-2 -mx-2 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-14 text-center shrink-0">
                        <div className="text-[11px] font-bold text-indigo-600 uppercase">{t.date}</div>
                        <div className="text-xs font-black text-slate-800">{t.startTime || "18:00"}</div>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-slate-900">{t.title}</p>
                        <p className="text-[11px] text-slate-500">
                          {t.teamName} · {t.location || "Campo de fútbol"}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-lg self-end sm:self-center">
                      {t.eventType}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-slate-400 space-y-2">
                <ClipboardCheck className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-sm font-medium text-slate-600">No hay sesiones inmediatas en agenda</p>
                <p className="text-xs text-slate-400">Las sesiones de entrenamiento se planifican en el calendario oficial.</p>
              </div>
            )
          )}

          <div className="pt-2 border-t border-slate-100 sm:hidden">
            <Link
              href="/dashboard/events"
              className="w-full text-center py-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center justify-center gap-1"
            >
              <span>Ver calendario completo</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>

        {/* COMUNICACIONES (1 columna en desktop) */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-sky-50 text-sky-600 rounded-lg">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <h2 className="font-bold text-slate-900 text-base">Comunicaciones</h2>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 bg-sky-50 text-sky-700 rounded-full border border-sky-200">
                {communications?.activeChannelsCount ?? 9} canales
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Radio className="w-3.5 h-3.5 text-sky-600" />
                <span>Canal Oficial de Anuncios</span>
              </div>
              {communications?.latestAnnouncement ? (
                <div className="space-y-1">
                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    &ldquo;{communications.latestAnnouncement.content}&rdquo;
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {new Date(communications.latestAnnouncement.createdAt).toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-500 leading-relaxed">
                  Canales de equipo y anuncios institucionales operativos. Avisos automáticos por correo activos.
                </p>
              )}
            </div>
          </div>

          <Link
            href="/dashboard/mensajes"
            className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs mt-4"
          >
            <MessageSquare className="w-3.5 h-3.5 text-sky-300" />
            <span>Abrir Mensajería del Club</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </section>

      </div>

      {/* ── 6. BLOQUE: ACCESOS RÁPIDOS CANÓNICOS ── */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-base">Accesos Operativos</h2>
            <p className="text-xs text-slate-400">Accesos directos canónicos a los módulos de gestión del club</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {quickLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex flex-col justify-between p-3.5 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/20 transition-all shadow-2xs"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-xl border shrink-0 ${item.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    {item.badge && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                      {item.desc}
                    </p>
                  </div>
                </div>
                <div className="pt-2 mt-2 border-t border-slate-50 flex items-center justify-between text-[11px] font-semibold text-indigo-600 opacity-80 group-hover:opacity-100">
                  <span>Acceder</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

    </div>
  );
}
