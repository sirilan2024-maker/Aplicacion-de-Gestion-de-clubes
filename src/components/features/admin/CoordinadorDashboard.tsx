"use client"

import React, { useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Shield, Trophy, Users, AlertTriangle, Calendar, Activity,
  ChevronRight, RefreshCw, CheckCircle, Clock, Zap,
  TrendingUp, Heart, MessageSquare, ArrowRight, Compass,
  Target, AlertCircle
} from "lucide-react"
import { getCoordinatorDashboardAction, CoordinatorDashboardData } from "@/app/actions/coordinator-actions"
import { useSeason } from "@/components/providers/SeasonProvider"

type Props = {
  initialResult: { success: boolean; data?: CoordinatorDashboardData; error?: string }
  userFirstName: string | null
}

const SEVERITY_STYLES = {
  error: "bg-red-50 border-red-200 text-red-700",
  warning: "bg-amber-50 border-amber-200 text-amber-700",
  info: "bg-blue-50 border-blue-200 text-blue-700",
}

const SEVERITY_ICON = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: CheckCircle,
}

function formatMatchDate(fechaHora: string): string {
  try {
    const d = new Date(fechaHora)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const isSameDay = (a: Date, b: Date) =>
      a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()

    const timeStr = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })

    if (isSameDay(d, today)) return `Hoy ${timeStr}`
    if (isSameDay(d, tomorrow)) return `Mañana ${timeStr}`

    return d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" }) + " " + timeStr
  } catch {
    return fechaHora
  }
}

function getResultBadge(result: string | null) {
  if (!result) return null
  const styles: Record<string, string> = {
    V: "bg-green-100 text-green-700 border border-green-200",
    E: "bg-gray-100 text-gray-600 border border-gray-200",
    D: "bg-red-100 text-red-700 border border-red-200",
  }
  const labels: Record<string, string> = { V: "Victoria", E: "Empate", D: "Derrota" }
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${styles[result] || "bg-gray-100 text-gray-600"}`}>
      {labels[result] || result}
    </span>
  )
}

export function CoordinadorDashboard({ initialResult, userFirstName }: Props) {
  const { selectedSeason } = useSeason()
  const [result, setResult] = useState(initialResult)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const selectedSeasonId = selectedSeason?.id
  const activeSeasonId = result.data?.activeSeason?.id
  const isSeasonMismatch = Boolean(selectedSeasonId && activeSeasonId && selectedSeasonId !== activeSeasonId)

  // Referencia para evitar bucles infinitos de re-renderizado
  const lastLoadedSeasonRef = React.useRef<string | null>(initialResult.data?.activeSeason?.id || null)

  const refresh = useCallback(async (overrideSeasonId?: string) => {
    setLoading(true)
    try {
      const seasonToFetch = typeof overrideSeasonId === "string" ? overrideSeasonId : selectedSeason?.id
      const fresh = await getCoordinatorDashboardAction(seasonToFetch)
      if (fresh.success && fresh.data?.activeSeason?.id) {
        lastLoadedSeasonRef.current = fresh.data.activeSeason.id
      }
      setResult(fresh)
    } finally {
      setLoading(false)
    }
  }, [selectedSeason?.id])

  // Reacción automática e inmediata al cambio de temporada en el selector global SIN bucles
  React.useEffect(() => {
    if (selectedSeasonId && selectedSeasonId !== lastLoadedSeasonRef.current) {
      lastLoadedSeasonRef.current = selectedSeasonId
      refresh(selectedSeasonId)
    }
  }, [selectedSeasonId])

  const data = result.data

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 13) return "Buenos días"
    if (h < 20) return "Buenas tardes"
    return "Buenas noches"
  }

  if (isSeasonMismatch && loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 space-y-4">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-sm font-bold text-slate-600">Cargando datos de la temporada seleccionada...</p>
      </div>
    )
  }

  if (!result.success || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-gray-600 text-center">{result.error || "Error al cargar el panel"}</p>
        <button
          onClick={() => refresh()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    )
  }

  const { kpis, alerts, teams, upcomingMatches, todayEvents } = data

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                {greeting()}{userFirstName ? `, ${userFirstName}` : ""}
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                Panel del Coordinador · {data.activeSeason.name}
              </p>
            </div>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: "Equipos", value: kpis.totalTeams, icon: Shield, color: "text-indigo-600", bg: "bg-indigo-50" },
            { label: "Jugadores", value: kpis.totalPlayers, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Partidos próximos", value: kpis.upcomingMatchesCount, icon: Trophy, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Lesiones activas", value: kpis.activeInjuries, icon: Heart, color: "text-red-500", bg: "bg-red-50" },
            { label: "Apercibidos", value: kpis.apercibidosCount, icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-50" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm">
              <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-4.5 h-4.5 ${color}`} size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-extrabold text-gray-900 leading-none">{value}</p>
                <p className="text-[11px] text-gray-500 font-medium leading-tight mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Alertas ── */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                Alertas operativas ({alerts.length})
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {alerts.slice(0, 8).map((alert, i) => {
                const Icon = SEVERITY_ICON[alert.severity]
                return (
                  <div
                    key={i}
                    className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl border text-[13px] font-medium ${SEVERITY_STYLES[alert.severity]}`}
                  >
                    <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                    <span className="leading-snug">{alert.message}</span>
                    {alert.teamId && (
                      <Link
                        href={`/dashboard/equipos/${alert.teamId}/plantilla`}
                        className="ml-auto shrink-0 text-[11px] underline opacity-70 hover:opacity-100"
                      >
                        Ver
                      </Link>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Hoy ── */}
        {todayEvents.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-blue-500" />
              <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Hoy</h2>
              <span className="text-xs text-gray-400 font-medium">
                {new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {todayEvents.map(ev => (
                <div key={ev.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3 shadow-sm">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    {ev.eventType === "Partido" ? (
                      <Trophy className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Target className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{ev.title}</p>
                    <p className="text-[11px] text-gray-500">
                      {ev.teamName} · {ev.startTime}{ev.endTime ? `–${ev.endTime}` : ""}
                      {ev.location ? ` · ${ev.location}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Próximos Partidos ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-emerald-500" />
              <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Próximos partidos</h2>
            </div>
            <Link
              href="/admin/partidos"
              className="text-xs text-indigo-600 font-semibold flex items-center gap-1 hover:underline"
            >
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {upcomingMatches.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 px-4 py-8 text-center">
              <Trophy className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400 font-medium">Sin partidos en los próximos 7 días</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingMatches.map(m => (
                <div
                  key={m.id}
                  className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3 shadow-sm hover:border-indigo-200 transition-colors cursor-pointer"
                  onClick={() => router.push(`/admin/partidos`)}
                >
                  {/* Color dot del equipo */}
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: m.teamColor || "#6366f1" }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-gray-900 truncate">
                        {m.esLocal ? "🏠" : "✈️"} {m.teamName} vs {m.rivalNombre}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[11px] text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatMatchDate(m.fechaHora)}
                      </span>
                      {m.lugar && (
                        <span className="text-[11px] text-gray-400">· {m.lugar}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      m.convocadosCount >= 14 ? "bg-green-100 text-green-700" :
                      m.convocadosCount >= 7 ? "bg-amber-100 text-amber-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {m.convocadosCount} conv.
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium">{m.teamCategory}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Equipos ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-500" />
              <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Mis equipos</h2>
            </div>
            <Link
              href="/dashboard/equipos"
              className="text-xs text-indigo-600 font-semibold flex items-center gap-1 hover:underline"
            >
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {teams.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 px-4 py-8 text-center">
              <Shield className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400 font-medium">Sin equipos en esta temporada</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {teams.map(team => (
                <Link
                  key={team.teamId}
                  href={`/dashboard/equipos/${team.teamId}/plantilla`}
                  className="bg-white rounded-xl border border-gray-100 p-4 hover:border-indigo-200 hover:shadow-md transition-all group"
                >
                  {/* Header del equipo */}
                  <div className="flex items-center gap-2.5 mb-3">
                    <div
                      className="w-4 h-4 rounded-full shrink-0 border border-white shadow-sm"
                      style={{ backgroundColor: team.teamColor || "#6366f1" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                        {team.teamName}
                      </p>
                      <p className="text-[11px] text-gray-400">{team.teamCategory}</p>
                    </div>
                    {team.lastMatchResult && (
                      <div className="shrink-0">
                        {getResultBadge(team.lastMatchResult)}
                      </div>
                    )}
                  </div>

                  {/* Stats del equipo */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center">
                      <p className="text-base font-extrabold text-gray-900">{team.playersCount}</p>
                      <p className="text-[10px] text-gray-400 font-medium">Jugadores</p>
                    </div>
                    <div className="text-center">
                      <p className={`text-base font-extrabold ${team.injuredPlayersCount > 0 ? "text-red-500" : "text-gray-900"}`}>
                        {team.injuredPlayersCount}
                      </p>
                      <p className="text-[10px] text-gray-400 font-medium">Lesionados</p>
                    </div>
                    <div className="text-center">
                      <p className={`text-base font-extrabold ${!team.coachName ? "text-red-500" : "text-gray-900"}`}>
                        {team.coachName ? "✓" : "—"}
                      </p>
                      <p className="text-[10px] text-gray-400 font-medium">Entrenador</p>
                    </div>
                  </div>

                  {/* Entrenador */}
                  {team.coachName ? (
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                      <Users className="w-3 h-3 text-gray-400" />
                      <span className="truncate">{team.coachName}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[11px] text-red-500 font-medium">
                      <AlertCircle className="w-3 h-3" />
                      <span>Sin entrenador asignado</span>
                    </div>
                  )}

                  {/* Próximo partido */}
                  {team.nextMatchDate && (
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-1.5">
                      <Trophy className="w-3 h-3 text-gray-400" />
                      <span className="truncate">
                        {formatMatchDate(team.nextMatchDate)} vs {team.nextMatchRival}
                      </span>
                    </div>
                  )}

                  {/* Resultado último partido */}
                  {team.lastMatchScore && (
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-1">
                      <Activity className="w-3 h-3" />
                      <span>Último: {team.lastMatchScore}</span>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ── Accesos rápidos ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Accesos rápidos</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Calendario Global", href: "/admin/calendario", icon: Calendar, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Estadísticas", href: "/dashboard/club/estadisticas", icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
              { label: "Disciplina", href: "/dashboard/matches?view=disciplina", icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
              { label: "Mensajes", href: "/dashboard/mensajes", icon: MessageSquare, color: "text-indigo-600", bg: "bg-indigo-50" },
            ].map(({ label, href, icon: Icon, color, bg }) => (
              <Link
                key={label}
                href={href}
                className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col items-center gap-2 hover:border-indigo-200 hover:shadow-sm transition-all text-center"
              >
                <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
                  <Icon className={`w-4.5 h-4.5 ${color}`} size={18} />
                </div>
                <span className="text-xs font-semibold text-gray-700 leading-tight">{label}</span>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
