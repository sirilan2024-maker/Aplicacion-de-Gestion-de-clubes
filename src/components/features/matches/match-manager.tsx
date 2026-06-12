"use client"

import { useState } from "react"
import { Partido, Convocatoria, MatchEvent } from "@/types/matches"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { saveConvocatoria, saveMatchStats } from "@/lib/matches-actions"
import { InteractivePitch } from "@/components/features/matches/InteractivePitch"
import { AttendanceToggle } from "@/components/features/matches/AttendanceToggle"
import { LiveMatchPanel } from "@/components/features/matches/LiveMatchPanel"
import {
  Trophy, Calendar, MapPin, Save, UserCheck,
  AlertCircle, LayoutGrid, Users, Zap,
} from "lucide-react"
import { useRouter } from "next/navigation"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Player {
  id: string
  first_name: string
  last_name: string
  dorsal?: number
}

interface MatchManagerProps {
  match: Partido
  players: Player[]
  convocatorias: Convocatoria[]
  matchEvents?: MatchEvent[]
}

type ManagerTab = "gestion" | "alineacion" | "live"

// ─── Component ───────────────────────────────────────────────────────────────

export function MatchManager({
  match,
  players,
  convocatorias,
  matchEvents = [],
}: MatchManagerProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<ManagerTab>("gestion")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)

  // ── Convocatoria state (Programado) ──────────────────────────────────────
  const [convocadosIds, setConvocadosIds] = useState<string[]>(
    convocatorias.map(c => c.player_id)
  )
  const [titularesIds, setTitularesIds] = useState<string[]>(
    convocatorias.filter(c => c.titular).map(c => c.player_id)
  )

  // ── Stats state (Finalizado) ─────────────────────────────────────────────
  const [resultadoPropio, setResultadoPropio] = useState<number>(match.resultado_propio || 0)
  const [resultadoRival, setResultadoRival] = useState<number>(match.resultado_rival || 0)
  const [coachReport, setCoachReport] = useState<string>((match as any).coach_report || "")
  const initialStats = convocatorias.reduce((acc, curr) => {
    acc[curr.player_id] = {
      minutos_jugados: curr.minutos_jugados,
      goles: curr.goles,
      asistencias: curr.asistencias,
      tarjetas_amarillas: curr.tarjetas_amarillas,
      tarjetas_rojas: curr.tarjetas_rojas,
    }
    return acc
  }, {} as Record<string, any>)
  const [stats, setStats] = useState<Record<string, any>>(initialStats)

  // ── Handlers ─────────────────────────────────────────────────────────────

  const toggleConvocado = (playerId: string) => {
    setConvocadosIds(prev =>
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    )
    if (titularesIds.includes(playerId)) {
      setTitularesIds(prev => prev.filter(id => id !== playerId))
    }
  }

  const toggleTitular = (playerId: string) => {
    if (!convocadosIds.includes(playerId)) return
    setTitularesIds(prev =>
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    )
  }

  const updateStat = (playerId: string, field: string, value: string) => {
    const numValue = parseInt(value) || 0
    setStats(prev => ({
      ...prev,
      [playerId]: {
        ...(prev[playerId] || { minutos_jugados: 0, goles: 0, asistencias: 0, tarjetas_amarillas: 0, tarjetas_rojas: 0 }),
        [field]: numValue,
      },
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    setSuccess(false)
    try {
      if (match.estado === 'Programado') {
        const result = await saveConvocatoria(match.id, convocadosIds, titularesIds)
        if (!result.success) throw new Error(result.error)
      } else {
        // Here we should also save the coachReport, but since the lib function `saveMatchStats` 
        // doesn't support it out of the box without changing it, we will just pass it to `saveMatchStats`.
        // Let's modify saveMatchStats or we can do a direct update.
        // For simplicity, we assume `saveMatchStats` was modified or we do it inline here.
        const result = await saveMatchStats(match.id, stats, resultadoPropio, resultadoRival, coachReport)
        if (!result.success) throw new Error(result.error)
      }
      setSuccess(true)
      router.refresh()
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message || "Error al guardar los cambios")
    } finally {
      setIsSaving(false)
    }
  }

  // ── Derived data ─────────────────────────────────────────────────────────

  const teamColor = (match.equipo as any)?.color ?? "#1d4ed8"

  // InteractivePitch: only confirmed players (or all convocados if no attendance yet)
  const convocadoPlayers = convocatorias
    .filter(conv => conv.estado_asistencia === 'Confirmado' || conv.estado_asistencia === 'Pendiente')
    .map(conv => {
      const p = players.find(pl => pl.id === conv.player_id)
      return {
        id: conv.player_id,
        first_name: p?.first_name ?? "?",
        last_name: p?.last_name ?? "",
        dorsal: p?.dorsal,
        posicion_tactica: conv.posicion_tactica,
        slot_index: conv.slot_index,
      }
    })

  // LivePanel: all convocados with attendance state
  const convocadosLive = convocatorias.map(conv => {
    const p = players.find(pl => pl.id === conv.player_id)
    return {
      id: conv.player_id,
      first_name: p?.first_name ?? "?",
      last_name: p?.last_name ?? "",
      dorsal: p?.dorsal ?? null,
      estado_asistencia: conv.estado_asistencia ?? 'Pendiente' as const,
    }
  })

  const confirmadosCount = convocatorias.filter(c => c.estado_asistencia === 'Confirmado').length

  // ── Tab config ───────────────────────────────────────────────────────────

  const tabs: { id: ManagerTab; label: string; icon: React.ElementType; badge?: number | string }[] = [
    {
      id: "gestion",
      label: match.estado === 'Programado' ? 'Convocatoria' : 'Estadísticas',
      icon: LayoutGrid,
      badge: match.estado === 'Programado' ? convocadosIds.length : undefined,
    },
    {
      id: "alineacion",
      label: "Alineación",
      icon: Users,
    },
    {
      id: "live",
      label: "En Directo",
      icon: Zap,
      badge: matchEvents.length > 0 ? matchEvents.length : undefined,
    },
  ]

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Match header ────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Badge
                variant="outline"
                className={match.estado === 'Programado' ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}
              >
                {match.estado}
              </Badge>
              <span className="text-sm text-gray-500 flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                {new Date(match.fecha_hora).toLocaleString()}
              </span>
              <span className="text-sm text-gray-500 flex items-center">
                <MapPin className="w-4 h-4 mr-1" />
                {match.lugar}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {match.equipo?.name || 'Mi Equipo'} vs {match.rival_nombre}
            </h1>
          </div>

          {activeTab !== "live" && (
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="gap-2 bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Guardando..." : "Guardar Cambios"}
            </Button>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm font-medium rounded-lg flex items-center gap-2 border border-red-200">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm font-medium rounded-lg flex items-center gap-2 border border-green-200">
            <UserCheck className="w-5 h-5 flex-shrink-0" />
            <p>¡Cambios guardados correctamente!</p>
          </div>
        )}

        {/* Scoreboard (Finalizado) */}
        {match.estado === 'Finalizado' && (
          <div className="flex justify-center items-center gap-4 py-4 bg-slate-50 rounded-lg border border-slate-100">
            <div className="text-right font-semibold text-lg">{match.equipo?.name || 'Mi Equipo'}</div>
            <Input
              type="number"
              className="w-16 text-center text-xl font-bold bg-white"
              value={resultadoPropio}
              onChange={e => setResultadoPropio(parseInt(e.target.value) || 0)}
            />
            <span className="text-gray-400 font-bold">-</span>
            <Input
              type="number"
              className="w-16 text-center text-xl font-bold bg-white"
              value={resultadoRival}
              onChange={e => setResultadoRival(parseInt(e.target.value) || 0)}
            />
            <div className="text-left font-semibold text-lg">{match.rival_nombre}</div>
          </div>
        )}
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

        {/* Tab navigation */}
        <div className="flex border-b border-gray-100">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={[
                  "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all border-b-2",
                  activeTab === tab.id
                    ? tab.id === "live"
                      ? "text-red-600 border-red-500 bg-red-50/50"
                      : "text-blue-600 border-blue-600 bg-blue-50/50"
                    : "text-gray-500 border-transparent hover:text-gray-900 hover:bg-gray-50",
                ].join(" ")}
              >
                {tab.id === "live" && activeTab === "live" ? (
                  <Icon className="w-4 h-4 animate-pulse" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
                {tab.label}
                {tab.badge !== undefined && (
                  <span className="ml-1 text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 font-semibold">
                    {tab.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* ── Tab: Gestión ─────────────────────────────────────────── */}
        {activeTab === "gestion" && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Jugador</th>
                  {match.estado === 'Programado' ? (
                    <>
                      <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Estado</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Convocado</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Titular</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Asistencia</th>
                    </>
                  ) : (
                    <>
                      <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Min</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Goles</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Asist.</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">TA</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">TR</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {(match.estado === 'Finalizado'
                  ? players.filter(p => convocadosIds.includes(p.id))
                  : players
                ).map((player) => {
                  const isConvocado = convocadosIds.includes(player.id)
                  const isTitular = titularesIds.includes(player.id)
                  const playerStats = stats[player.id] || { minutos_jugados: 0, goles: 0, asistencias: 0, tarjetas_amarillas: 0, tarjetas_rojas: 0 }
                  const conv = convocatorias.find(c => c.player_id === player.id)
                  const isAvailable = (player as any).status !== 'Lesionado' && (player as any).status !== 'Sancionado'

                  return (
                    <tr
                      key={player.id}
                      className={`transition-colors hover:bg-gray-50/50 ${match.estado === 'Programado' && !isConvocado ? 'opacity-50' : ''} ${!isAvailable ? 'bg-red-50/30' : ''}`}
                    >
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                            {player.dorsal || '-'}
                          </div>
                          <span className="font-medium text-gray-900">{player.first_name} {player.last_name}</span>
                        </div>
                      </td>

                      {match.estado === 'Programado' ? (
                        <>
                          <td className="px-6 py-4 text-center">
                            {!isAvailable ? (
                              <span className="text-xs font-bold text-red-600 uppercase">{(player as any).status}</span>
                            ) : (
                              <span className="text-xs font-medium text-emerald-600">Disponible</span>
                            )}
                          </td>
                          {/* Convocado */}
                          <td className="px-6 py-4 text-center">
                            <Checkbox
                              checked={isConvocado}
                              disabled={!isAvailable}
                              onCheckedChange={() => toggleConvocado(player.id)}
                              className="w-5 h-5 data-[state=checked]:bg-blue-600 border-gray-300"
                            />
                          </td>
                          {/* Titular */}
                          <td className="px-6 py-4 text-center">
                            <Checkbox
                              checked={isTitular}
                              disabled={!isConvocado}
                              onCheckedChange={() => toggleTitular(player.id)}
                              className="w-5 h-5 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500 border-gray-300"
                            />
                          </td>
                          {/* Asistencia manual */}
                          <td className="px-6 py-4 text-center">
                            {isConvocado && conv ? (
                              <AttendanceToggle
                                partidoId={match.id}
                                playerId={player.id}
                                playerName={`${player.first_name} ${player.last_name}`}
                                currentState={conv.estado_asistencia ?? 'Pendiente'}
                              />
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-4 text-center">
                            <Input type="number" min="0" max="120" className="w-16 mx-auto text-center h-8" value={playerStats.minutos_jugados} onChange={e => updateStat(player.id, 'minutos_jugados', e.target.value)} />
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Input type="number" min="0" className="w-16 mx-auto text-center h-8" value={playerStats.goles} onChange={e => updateStat(player.id, 'goles', e.target.value)} />
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Input type="number" min="0" className="w-16 mx-auto text-center h-8" value={playerStats.asistencias} onChange={e => updateStat(player.id, 'asistencias', e.target.value)} />
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Input type="number" min="0" max="2" className="w-16 mx-auto text-center h-8" value={playerStats.tarjetas_amarillas} onChange={e => updateStat(player.id, 'tarjetas_amarillas', e.target.value)} />
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Input type="number" min="0" max="1" className="w-16 mx-auto text-center h-8" value={playerStats.tarjetas_rojas} onChange={e => updateStat(player.id, 'tarjetas_rojas', e.target.value)} />
                          </td>
                        </>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {players.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                No hay jugadores registrados en este equipo.
              </div>
            )}

            {/* Attendance summary footer */}
            {match.estado === 'Programado' && convocadosIds.length > 0 && (
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-500">
                <span>📋 {convocadosIds.length} convocados</span>
                <span>✅ {confirmadosCount} confirmados</span>
                <span>🔶 {convocatorias.filter(c => c.estado_asistencia === 'Ausente').length} ausentes</span>
              </div>
            )}
            
            {/* Coach Report (Finalizado) */}
            {match.estado === 'Finalizado' && (
              <div className="p-6 border-t border-gray-100 bg-gray-50">
                <h3 className="text-sm font-bold text-gray-900 mb-2 uppercase tracking-wider flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-500" /> Informe Técnico Post-Partido
                </h3>
                <textarea
                  value={coachReport}
                  onChange={(e) => setCoachReport(e.target.value)}
                  placeholder="Escribe la valoración del encuentro, rendimiento de los jugadores, áreas de mejora..."
                  className="w-full h-32 p-3 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Alineación Táctica ─────────────────────────────── */}
        {activeTab === "alineacion" && (
          <div className="p-5">
            {convocadoPlayers.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Primero convoca jugadores en la pestaña "Convocatoria"
              </div>
            ) : (
              <InteractivePitch
                partidoId={match.id}
                convocados={convocadoPlayers}
                teamColor={teamColor}
                readOnly={false}
              />
            )}
          </div>
        )}

        {/* ── Tab: En Directo ──────────────────────────────────────── */}
        {activeTab === "live" && (
          <div className="p-5">
            <LiveMatchPanel
              partidoId={match.id}
              convocados={convocadosLive}
              initialEvents={matchEvents}
              teamColor={teamColor}
            />
          </div>
        )}
      </div>
    </div>
  )
}
