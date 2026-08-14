"use client"

import React, { useState, useEffect } from "react"
import { X, RefreshCw, Zap, Save, CheckCircle2, AlertTriangle, FileText, ZoomIn, ZoomOut, ExternalLink } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { reconcileMatchStatsAction } from "@/app/actions/match-actions"

interface ActaConciliationModalProps {
  match: any;
  players: any[];
  convocatorias: any[];
  onClose: () => void;
  onSaveSuccess?: () => void;
}

export function ActaConciliationModal({ match, players, convocatorias, onClose, onSaveSuccess }: ActaConciliationModalProps) {
  const supabase = createClient()
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [urlLoading, setUrlLoading] = useState(true)
  const [urlError, setUrlError] = useState<string | null>(null)
  const [zoomLevel, setZoomLevel] = useState<number>(100)

  const [saving, setSaving] = useState(false)
  const [loadingLive, setLoadingLive] = useState(false)
  const [mobileTab, setMobileTab] = useState<'pdf' | 'stats'>('stats')

  // Estado del formulario de convocados
  const [statsMap, setStatsMap] = useState<Record<string, {
    player_id: string;
    first_name: string;
    last_name: string;
    dorsal?: string | number;
    goals: number;
    assists: number;
    yellow_cards: number;
    red_cards: number;
    minutes_played: number;
    estado_asistencia: string;
    is_convocado: boolean;
  }>>({})

  // Inicializar estado del mapa de jugadores
  useEffect(() => {
    const initialMap: Record<string, any> = {}
    
    players.forEach((p) => {
      const existingConv = convocatorias.find((c) => c.player_id === p.id)
      initialMap[p.id] = {
        player_id: p.id,
        first_name: p.first_name || '',
        last_name: p.last_name || '',
        dorsal: p.dorsal || '',
        goals: existingConv?.goals ?? 0,
        assists: existingConv?.assists ?? 0,
        yellow_cards: existingConv?.yellow_cards ?? 0,
        red_cards: existingConv?.red_cards ?? 0,
        minutes_played: existingConv?.minutes_played ?? (existingConv?.status === 'convocado' ? 90 : 0),
        estado_asistencia: existingConv?.estado_asistencia || (existingConv?.status === 'convocado' ? 'Presente' : 'Pendiente'),
        is_convocado: existingConv ? existingConv.status === 'convocado' : true
      }
    })

    setStatsMap(initialMap)
  }, [players, convocatorias])

  // Cargar Signed URL del acta
  const fetchSignedUrl = async () => {
    setUrlLoading(true)
    setUrlError(null)
    try {
      const res = await fetch(`/api/partidos/get-acta-url?partidoId=${match.id}`)
      const data = await res.json()
      if (data.success && data.signedUrl) {
        setSignedUrl(data.signedUrl)
      } else {
        setUrlError(data.error || "No se pudo cargar el acta del partido")
      }
    } catch (err: any) {
      setUrlError("Error de conexión al obtener el acta")
    } finally {
      setUrlLoading(false)
    }
  }

  useEffect(() => {
    if (match?.id) {
      fetchSignedUrl()
    }
  }, [match?.id])

  // Pre-cargar desde En Directo (match_events)
  const handlePreloadFromLive = async () => {
    setLoadingLive(true)
    try {
      const { data: events, error } = await supabase
        .from("match_events")
        .select("*")
        .eq("partido_id", match.id)

      if (error) {
        alert("Error al cargar los eventos en vivo: " + error.message)
        return
      }

      if (!events || events.length === 0) {
        alert("No se encontraron eventos registrados en vivo para este partido.")
        return
      }

      // Agregación de eventos por jugador
      const aggregated: Record<string, { goals: number; assists: number; yellows: number; reds: number }> = {}

      events.forEach((evt) => {
        const pId = evt.player_id
        if (!pId) return
        if (!aggregated[pId]) {
          aggregated[pId] = { goals: 0, assists: 0, yellows: 0, reds: 0 }
        }

        const type = (evt.tipo_evento || '').toLowerCase()
        if (type.includes('gol') && !type.includes('contra')) {
          aggregated[pId].goals += 1
        } else if (type.includes('asistenci')) {
          aggregated[pId].assists += 1
        } else if (type.includes('amarilla')) {
          aggregated[pId].yellows += 1
        } else if (type.includes('roja')) {
          aggregated[pId].reds += 1
        }
      })

      // Actualizar el estado del formulario con la precarga
      setStatsMap((prev) => {
        const next = { ...prev }
        Object.keys(next).forEach((pId) => {
          if (aggregated[pId]) {
            next[pId] = {
              ...next[pId],
              goals: aggregated[pId].goals,
              assists: aggregated[pId].assists,
              yellow_cards: aggregated[pId].yellows,
              red_cards: aggregated[pId].reds,
              is_convocado: true
            }
          }
        })
        return next
      })

      alert("✨ Datos pre-cargados con éxito a partir de los eventos grabados en directo.")
    } catch (err: any) {
      console.error(err)
      alert("Ocurrió un error al procesar la pre-carga")
    } finally {
      setLoadingLive(false)
    }
  }

  // Guardar la conciliación de forma atómica
  const handleSaveConciliation = async () => {
    setSaving(true)
    try {
      const statsArray = Object.values(statsMap)
        .filter((item) => item.is_convocado)
        .map((item) => ({
          player_id: item.player_id,
          goals: item.goals,
          assists: item.assists,
          yellow_cards: item.yellow_cards,
          red_cards: item.red_cards,
          minutes_played: item.minutes_played,
          estado_asistencia: item.estado_asistencia
        }))

      const result = await reconcileMatchStatsAction(match.id, statsArray)

      if (result.success) {
        alert("🟢 Conciliación guardada exitosamente. El partido ha sido marcado como Finalizado.")
        if (onSaveSuccess) onSaveSuccess()
        onClose()
      } else {
        alert("🔴 Error al guardar conciliación: " + (result.error || "Desconocido"))
      }
    } catch (err: any) {
      console.error(err)
      alert("Error al intentar guardar la conciliación")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-sm p-3 sm:p-6 overflow-hidden animate-in fade-in">
      <div className="bg-white w-full max-w-7xl h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600/30 p-2 rounded-xl border border-blue-500/30 text-blue-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">Conciliación de Estadísticas con Acta Oficial</h3>
                <span className="bg-blue-600/20 text-blue-300 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-blue-500/30">
                  {match.equipo?.name || "Equipo"} vs {match.rival_nombre}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Verifica las actas oficiales de la federación e ingresa o ajusta las estadísticas definitivas de la plantilla.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Tab Switcher */}
        <div className="flex md:hidden bg-slate-800 p-1 border-b border-slate-700">
          <button
            onClick={() => setMobileTab('stats')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              mobileTab === 'stats'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" /> 1. Datos y Estadísticas
          </button>
          <button
            onClick={() => setMobileTab('pdf')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              mobileTab === 'pdf'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> 2. Ver Acta (PDF)
          </button>
        </div>

        {/* Modal Body: Split Screen 50/50 en PC, Pestañas en Móvil */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden divide-y md:divide-y-0 md:divide-x divide-slate-200 bg-slate-100">
          
          {/* Panel Izquierdo: Visor de PDF */}
          <div className={`w-full md:w-1/2 flex flex-col bg-slate-900 relative ${mobileTab === 'pdf' ? 'flex h-[calc(100vh-180px)] sm:h-auto' : 'hidden md:flex'}`}>
            <div className="bg-slate-900 border-b border-slate-800 px-3 py-2 flex items-center justify-between text-slate-300 text-xs font-bold shrink-0 z-20">
              <span className="text-slate-400 text-[11px]">Zoom: <strong className="text-blue-400">{zoomLevel}%</strong></span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(z - 25, 75))}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-mono text-xs shadow-xs"
                  title="Alejar"
                >
                  🔍 -
                </button>
                <button
                  onClick={() => setZoomLevel(100)}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-mono text-[10px]"
                  title="Restablecer"
                >
                  100%
                </button>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(z + 25, 200))}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-mono text-xs shadow-xs"
                  title="Acercar"
                >
                  🔍 +
                </button>
                {signedUrl && (
                  <a
                    href={signedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm"
                  >
                    Abrir <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            {/* Scrollable Viewport encajado al PDF con scroll nativo táctil desbloqueado */}
            <div 
              className="flex-1 w-full h-full bg-white overflow-y-auto overflow-x-hidden p-0 relative hide-scrollbar"
              style={{ 
                touchAction: 'pan-y pan-x', 
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
            >
              <style jsx>{`
                div::-webkit-scrollbar, iframe::-webkit-scrollbar, object::-webkit-scrollbar {
                  display: none !important;
                  width: 0px !important;
                  height: 0px !important;
                }
              `}</style>
              {urlLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                  <p className="text-sm font-medium">Obteniendo URL firmada del acta...</p>
                </div>
              ) : urlError ? (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center max-w-sm mx-auto">
                  <AlertTriangle className="w-10 h-10 text-amber-500 mb-2" />
                  <h4 className="font-bold text-slate-800">Acta No Disponible</h4>
                  <p className="text-xs text-slate-500">{urlError}</p>
                  <button
                    onClick={fetchSignedUrl}
                    className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Reintentar Carga
                  </button>
                </div>
              ) : signedUrl ? (
                <div 
                  className="w-full bg-white transition-transform duration-200 origin-top-center overflow-hidden"
                  style={{ 
                    transform: `scale(${zoomLevel / 100})`,
                    transformOrigin: "top center",
                    width: "100%",
                    height: `${1850 * (zoomLevel / 100)}px`
                  }}
                >
                  <iframe
                    src={`${signedUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                    className="w-[calc(100%+24px)] h-full border-0 bg-white -mr-6"
                    style={{ overflow: 'hidden', scrollbarWidth: 'none' }}
                    title="Visor Acta Oficial Conciliación"
                  />
                </div>
              ) : null}
            </div>

          </div>

          {/* Panel Derecho: Formulario de Conciliación */}
          <div className={`w-full md:w-1/2 flex flex-col bg-white overflow-hidden ${mobileTab === 'stats' ? 'flex h-[calc(100vh-180px)] sm:h-auto' : 'hidden md:flex'}`}>
            {/* Action Toolbar Header */}
            <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div>
                <h4 className="font-extrabold text-slate-800 text-xs sm:text-sm">Registro Definitivo de Jugadores</h4>
                <p className="text-[10px] sm:text-xs text-slate-500">Machaca borradores anteriores al guardar</p>
              </div>
              <button
                onClick={handlePreloadFromLive}
                disabled={loadingLive}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5 fill-slate-950" />
                {loadingLive ? "Cargando..." : "Pre-cargar En Directo"}
              </button>
            </div>

            {/* Table Area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-1 sm:p-4 hide-scrollbar">
              <table className="w-full text-left border-collapse table-fixed">
                <thead className="bg-slate-100 border-b border-slate-200 text-[9px] sm:text-[10px] uppercase font-bold text-slate-600 tracking-tighter">
                  <tr>
                    <th className="py-2 px-1 w-[38%] bg-slate-100">Jugador</th>
                    <th className="py-2 px-0.5 text-center w-[12%] bg-slate-100">Gol</th>
                    <th className="py-2 px-0.5 text-center w-[12%] bg-slate-100">Asis</th>
                    <th className="py-2 px-0.5 text-center w-[12%] bg-slate-100">🟨</th>
                    <th className="py-2 px-0.5 text-center w-[12%] bg-slate-100">🟥</th>
                    <th className="py-2 px-0.5 text-center w-[14%] bg-slate-100">Min</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {Object.values(statsMap).map((row) => (
                    <tr key={row.player_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={row.is_convocado}
                            onChange={(e) => {
                              const checked = e.target.checked
                              setStatsMap((prev) => ({
                                ...prev,
                                [row.player_id]: { ...prev[row.player_id], is_convocado: checked }
                              }))
                            }}
                            className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-slate-800 text-[11px] sm:text-xs block truncate leading-tight">
                              {row.first_name} {row.last_name}
                            </span>
                            {row.dorsal && (
                              <span className="text-[9px] text-slate-400 font-mono block">#{row.dorsal}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-0.5 text-center">
                        <input
                          type="number"
                          min={0}
                          value={row.goals}
                          disabled={!row.is_convocado}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0
                            setStatsMap((prev) => ({
                              ...prev,
                              [row.player_id]: { ...prev[row.player_id], goals: val }
                            }))
                          }}
                          className="w-8 sm:w-10 text-center border border-slate-200 rounded py-0.5 text-[11px] font-bold text-slate-800 focus:ring-1 focus:ring-blue-500 disabled:opacity-40 bg-white"
                        />
                      </td>
                      <td className="py-2 px-0.5 text-center">
                        <input
                          type="number"
                          min={0}
                          value={row.assists}
                          disabled={!row.is_convocado}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0
                            setStatsMap((prev) => ({
                              ...prev,
                              [row.player_id]: { ...prev[row.player_id], assists: val }
                            }))
                          }}
                          className="w-8 sm:w-10 text-center border border-slate-200 rounded py-0.5 text-[11px] font-bold text-slate-800 focus:ring-1 focus:ring-blue-500 disabled:opacity-40 bg-white"
                        />
                      </td>
                      <td className="py-2 px-0.5 text-center">
                        <input
                          type="number"
                          min={0}
                          max={2}
                          value={row.yellow_cards}
                          disabled={!row.is_convocado}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0
                            setStatsMap((prev) => ({
                              ...prev,
                              [row.player_id]: { ...prev[row.player_id], yellow_cards: val }
                            }))
                          }}
                          className="w-8 sm:w-10 text-center border border-slate-200 rounded py-0.5 text-[11px] font-bold text-amber-700 bg-amber-50/50 focus:ring-1 focus:ring-amber-500 disabled:opacity-40"
                        />
                      </td>
                      <td className="py-2 px-0.5 text-center">
                        <input
                          type="number"
                          min={0}
                          max={1}
                          value={row.red_cards}
                          disabled={!row.is_convocado}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0
                            setStatsMap((prev) => ({
                              ...prev,
                              [row.player_id]: { ...prev[row.player_id], red_cards: val }
                            }))
                          }}
                          className="w-8 sm:w-10 text-center border border-slate-200 rounded py-0.5 text-[11px] font-bold text-rose-700 bg-rose-50/50 focus:ring-1 focus:ring-rose-500 disabled:opacity-40"
                        />
                      </td>
                      <td className="py-2 px-0.5 text-center">
                        <input
                          type="number"
                          min={0}
                          max={120}
                          value={row.minutes_played}
                          disabled={!row.is_convocado}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0
                            setStatsMap((prev) => ({
                              ...prev,
                              [row.player_id]: { ...prev[row.player_id], minutes_played: val }
                            }))
                          }}
                          className="w-10 sm:w-12 text-center border border-slate-200 rounded py-0.5 text-[11px] font-bold text-slate-800 focus:ring-1 focus:ring-blue-500 disabled:opacity-40 bg-white"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4 shrink-0">
              <span className="text-xs text-slate-500 font-medium">
                {Object.values(statsMap).filter((r) => r.is_convocado).length} jugadores convocados seleccionados
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveConciliation}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Guardando..." : "Guardar Conciliación"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
