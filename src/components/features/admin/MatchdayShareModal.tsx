"use client"

import React, { useState, useEffect, useMemo, useRef } from "react"
import {
  X, Calendar, Clock, MapPin, Trophy, Send, Share2,
  Copy, Download, Check, Sparkles, MessageCircle,
  Bell, ChevronDown, ChevronUp, AlertCircle, Shield
} from "lucide-react"
import { toPng } from "html-to-image"
import toast from "react-hot-toast"
import {
  getSeasonScheduledMatchesAction,
  broadcastMatchdayToCoachesAction
} from "@/app/actions/coordinator-actions"
import { toProxyImageUrl } from "@/lib/ffcv/rival-shields"

interface MatchItem {
  id: string
  fecha_hora: string
  rival_nombre: string
  rival_escudo?: string | null
  lugar: string | null
  estado: string
  equipo_id: string
  equipo?: {
    id: string
    name: string
    category?: string
    color?: string | null
  }
}

interface MatchdayShareModalProps {
  isOpen: boolean
  onClose: () => void
  seasonId?: string
  seasonName?: string
  clubName?: string
  clubLogoUrl?: string | null
}

export function MatchdayShareModal({
  isOpen,
  onClose,
  seasonId,
  seasonName = "TEMPORADA 26/27",
  clubName = "Sporting Saladar",
  clubLogoUrl
}: MatchdayShareModalProps) {
  const [loading, setLoading] = useState(true)
  const [allMatches, setAllMatches] = useState<MatchItem[]>([])
  const [selectedMatchIds, setSelectedMatchIds] = useState<Set<string>>(new Set())
  const [customNote, setCustomNote] = useState("")
  const [showAdvancedMatches, setShowAdvancedMatches] = useState(false)
  const [activeTab, setActiveTab] = useState<"selector" | "preview">("preview")
  const [isBroadcasting, setIsBroadcasting] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [copiedText, setCopiedText] = useState(false)

  const posterRef = useRef<HTMLDivElement>(null)

  // Funciones de cálculo de fin de semana
  const getCurrentWeekendRange = () => {
    const now = new Date()
    const dayOfWeek = now.getDay() // 0 = dom, 1 = lun, ..., 5 = vie, 6 = sab
    const start = new Date(now)

    if (dayOfWeek === 5) {
      // Viernes
      start.setHours(0, 0, 0, 0)
    } else if (dayOfWeek === 6) {
      // Sábado
      start.setDate(now.getDate() - 1)
      start.setHours(0, 0, 0, 0)
    } else if (dayOfWeek === 0) {
      // Domingo
      start.setDate(now.getDate() - 2)
      start.setHours(0, 0, 0, 0)
    } else {
      // Lunes a jueves -> próximo viernes
      const daysToFriday = 5 - dayOfWeek
      start.setDate(now.getDate() + daysToFriday)
      start.setHours(0, 0, 0, 0)
    }

    const end = new Date(start)
    end.setDate(start.getDate() + 3) // hasta lunes noche
    end.setHours(23, 59, 59, 999)

    return { start, end }
  }

  const getNextWeekendRange = () => {
    const curr = getCurrentWeekendRange()
    const start = new Date(curr.start)
    start.setDate(start.getDate() + 7)
    const end = new Date(curr.end)
    end.setDate(end.getDate() + 7)
    return { start, end }
  }

  // 1. Cargar todos los partidos programados de la temporada
  useEffect(() => {
    if (!isOpen) return
    let isMounted = true

    async function loadMatches() {
      setLoading(true)
      try {
        const res = await getSeasonScheduledMatchesAction(seasonId)
        if (res.success && res.data && isMounted) {
          const list = res.data as MatchItem[]
          setAllMatches(list)

          // Auto-seleccionar partidos del fin de semana actual/próximo
          const { start, end } = getCurrentWeekendRange()
          const defaultSelection = new Set<string>()

          list.forEach(m => {
            if (!m.fecha_hora) return
            const mDate = new Date(m.fecha_hora)
            if (mDate >= start && mDate <= end) {
              defaultSelection.add(m.id)
            }
          })

          // Si el fin de semana próximo no tiene partidos, seleccionar los más cercanos
          if (defaultSelection.size === 0 && list.length > 0) {
            const now = new Date()
            const firstUpcoming = list.filter(m => new Date(m.fecha_hora) >= now).slice(0, 5)
            firstUpcoming.forEach(m => defaultSelection.add(m.id))
          }

          setSelectedMatchIds(defaultSelection)
        } else if (!res.success && isMounted) {
          toast.error(res.error || "No se pudieron cargar los partidos")
        }
      } catch (err) {
        console.error("Error al cargar partidos de la jornada:", err)
        toast.error("Error al cargar los partidos")
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadMatches()
    return () => {
      isMounted = false
    }
  }, [isOpen, seasonId])

  // Partidos seleccionados ordenados cronológicamente
  const selectedMatches = useMemo(() => {
    return allMatches
      .filter(m => selectedMatchIds.has(m.id))
      .sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime())
  }, [allMatches, selectedMatchIds])

  // Calcular rango de fechas de los partidos seleccionados
  const dateRangeLabel = useMemo(() => {
    if (selectedMatches.length === 0) return "Sin fechas seleccionadas"
    const dates = selectedMatches.map(m => new Date(m.fecha_hora))
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))

    const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }
    if (minDate.toDateString() === maxDate.toDateString()) {
      return minDate.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    }
    return `${minDate.toLocaleDateString("es-ES", options)} – ${maxDate.toLocaleDateString("es-ES", { ...options, year: "numeric" })}`
  }, [selectedMatches])

  const toggleMatch = (id: string) => {
    setSelectedMatchIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectCurrentWeekend = () => {
    const { start, end } = getCurrentWeekendRange()
    const current = new Set<string>()
    allMatches.forEach(m => {
      if (!m.fecha_hora) return
      const dt = new Date(m.fecha_hora)
      if (dt >= start && dt <= end) current.add(m.id)
    })
    setSelectedMatchIds(current)
    if (current.size === 0) {
      toast("No hay partidos programados en este fin de semana", { icon: "ℹ️" })
    }
  }

  const selectNextWeekend = () => {
    const { start, end } = getNextWeekendRange()
    const next = new Set<string>()
    allMatches.forEach(m => {
      if (!m.fecha_hora) return
      const dt = new Date(m.fecha_hora)
      if (dt >= start && dt <= end) next.add(m.id)
    })
    setSelectedMatchIds(next)
    if (next.size === 0) {
      toast("No hay partidos programados en el siguiente fin de semana", { icon: "ℹ️" })
    }
  }

  const selectAll = () => {
    const all = new Set(allMatches.map(m => m.id))
    setSelectedMatchIds(all)
  }

  const clearSelection = () => {
    setSelectedMatchIds(new Set())
  }

  // Generador de texto para WhatsApp
  const generateWhatsAppText = () => {
    if (selectedMatches.length === 0) return ""

    let text = `🏆 *${clubName.toUpperCase()} — PARTIDOS DE LA JORNADA* 🏆\n`
    text += `📅 _${dateRangeLabel}_\n`
    text += `──────────────\n\n`

    selectedMatches.forEach(m => {
      const dt = m.fecha_hora ? new Date(m.fecha_hora) : null
      const dayName = dt ? dt.toLocaleDateString("es-ES", { weekday: "long" }) : ""
      const dayCapitalized = dayName ? dayName.charAt(0).toUpperCase() + dayName.slice(1) : ""
      const dateFormatted = dt ? dt.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" }) : ""
      const timeFormatted = dt ? dt.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) + "h" : ""
      const loc = m.lugar === "Local" ? "🏠 Local" : "✈️ Visitante"
      const category = m.equipo?.category ? ` (${m.equipo.category})` : ""

      text += `⚽ *${m.equipo?.name || "Equipo"}*${category}\n`
      text += `🆚 vs *${m.rival_nombre}* (${loc})\n`
      text += `⏰ ${dayCapitalized} ${dateFormatted} · ${timeFormatted}\n`
      if (m.lugar) {
        text += `📍 ${m.lugar}\n`
      }
      text += `\n`
    })

    if (customNote.trim()) {
      text += `──────────────\n`
      text += `💬 *Aviso del Coordinador:*\n${customNote.trim()}\n\n`
    }

    text += `🔴🔵 ¡Mucho ánimo a todos nuestros equipos! #SportingSaladar`
    return text
  }

  // Copiar texto formateado
  const handleCopyText = async () => {
    const text = generateWhatsAppText()
    if (!text) {
      toast.error("Selecciona al menos un partido")
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      setCopiedText(true)
      toast.success("¡Texto para WhatsApp copiado al portapapeles!")
      setTimeout(() => setCopiedText(false), 2500)
    } catch {
      toast.error("No se pudo copiar automáticamente")
    }
  }

  // Abrir WhatsApp con texto predefinido
  const handleOpenWhatsApp = () => {
    const text = generateWhatsAppText()
    if (!text) {
      toast.error("Selecciona al menos un partido")
      return
    }
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`
    window.open(url, "_blank")
  }

  // Descargar cartelera como imagen PNG
  const handleDownloadImage = async () => {
    if (!posterRef.current) return
    setIsDownloading(true)
    const toastId = toast.loading("Generando cartelera gráfica en alta resolución...")

    try {
      const dataUrl = await toPng(posterRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#020617",
      })

      const link = document.createElement("a")
      link.href = dataUrl
      link.download = `Cartelera_Jornada_${clubName.replace(/\s+/g, "_")}.png`
      link.click()

      toast.success("¡Cartelera descargada con éxito!", { id: toastId })
    } catch (err: any) {
      console.error("Error generating matchday poster image:", err)
      toast.error("Error al exportar la imagen. Inténtalo de nuevo.", { id: toastId })
    } finally {
      setIsDownloading(false)
    }
  }

  // Enviar por la aplicación a los entrenadores (notificación + chat)
  const handleBroadcastToCoaches = async () => {
    if (selectedMatches.length === 0) {
      toast.error("Selecciona al menos un partido para difundir")
      return
    }

    const confirmSend = window.confirm(
      `¿Deseas enviar la cartelera de la jornada con ${selectedMatches.length} partidos a todos los entrenadores del club? Recibirán una notificación interna y se publicará en el chat del club.`
    )
    if (!confirmSend) return

    setIsBroadcasting(true)
    const toastId = toast.loading("Difundiendo jornada a los entrenadores...")

    try {
      const res = await broadcastMatchdayToCoachesAction({
        matchIds: Array.from(selectedMatchIds),
        customNote: customNote.trim() || undefined,
        seasonId
      })

      if (res.success) {
        toast.success(
          `¡Jornada difundida con éxito! ${res.notifiedCoaches || 0} entrenadores notificados y publicado en el chat.`,
          { id: toastId, duration: 4000 }
        )
      } else {
        toast.error(res.error || "No se pudo difundir la jornada", { id: toastId })
      }
    } catch (err: any) {
      console.error("Error broadcasting matchday:", err)
      toast.error("Error al enviar la notificación a entrenadores", { id: toastId })
    } finally {
      setIsBroadcasting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header Modal */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white p-1 shadow-md flex items-center justify-center shrink-0 overflow-hidden border border-white/80">
              <img
                src={clubLogoUrl || "/escudo-saladar.jpg"}
                alt={clubName}
                className="w-full h-full object-contain rounded-xl"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/escudo-saladar.jpg"
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">Cartelera de la Jornada</h3>
                <span className="text-[10px] font-extrabold uppercase bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full">
                  {seasonName}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Horarios oficiales, compartir por WhatsApp o notificar a los entrenadores
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-Tabs de Navegación */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 py-2 gap-2 shrink-0">
          <button
            onClick={() => setActiveTab("preview")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "preview"
                ? "bg-white text-blue-600 shadow-xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            Cartelera Gráfica y Opciones ({selectedMatches.length})
          </button>
          <button
            onClick={() => setActiveTab("selector")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "selector"
                ? "bg-white text-blue-600 shadow-xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Calendar className="w-4 h-4 text-blue-500" />
            Seleccionar / Añadir Partidos
            {selectedMatches.length > 0 && (
              <span className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0.2 rounded-full font-black">
                {selectedMatches.length}
              </span>
            )}
          </button>
        </div>

        {/* Contenido Scrolleable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-sm font-semibold text-slate-500">Cargando partidos de la temporada...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: SELECTOR DE PARTIDOS */}
              {activeTab === "selector" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50/70 border border-blue-100 p-4 rounded-2xl">
                    <div>
                      <h4 className="text-sm font-bold text-blue-950">Partidos para la Cartelera</h4>
                      <p className="text-xs text-blue-700">
                        Selecciona los partidos de la jornada o utiliza los filtros rápidos.
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                      <button
                        onClick={selectCurrentWeekend}
                        className="text-xs font-bold px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-xs"
                      >
                        Esta Jornada
                      </button>
                      <button
                        onClick={selectNextWeekend}
                        className="text-xs font-bold px-3 py-1.5 bg-white text-blue-700 border border-blue-200 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        Próxima Jornada
                      </button>
                      <button
                        onClick={selectAll}
                        className="text-xs font-bold px-2.5 py-1.5 bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        Todos ({allMatches.length})
                      </button>
                      <button
                        onClick={clearSelection}
                        className="text-xs font-bold px-2.5 py-1.5 bg-white text-slate-500 border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        Limpiar
                      </button>
                    </div>
                  </div>

                  {/* Lista de partidos */}
                  <div className="space-y-2">
                    {allMatches.length === 0 ? (
                      <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-xs font-semibold">No se encontraron partidos programados en el calendario de esta temporada.</p>
                      </div>
                    ) : (
                      allMatches.map(m => {
                      const isSelected = selectedMatchIds.has(m.id)
                      const dt = m.fecha_hora ? new Date(m.fecha_hora) : null
                      const dateStr = dt ? dt.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" }) : ""
                      const timeStr = dt ? dt.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : ""

                      return (
                        <div
                          key={m.id}
                          onClick={() => toggleMatch(m.id)}
                          className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-blue-50/80 border-blue-300 ring-1 ring-blue-400/40 shadow-xs"
                              : "bg-white border-slate-200 hover:border-slate-300 opacity-75"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // controlado por el onClick del div
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <div
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: m.equipo?.color || "#3b82f6" }}
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-black text-slate-900 truncate flex items-center gap-1.5 flex-wrap">
                                <span>{m.equipo?.name || "Equipo"}</span>
                                <span className="text-xs font-normal text-slate-400">vs</span>
                                {m.rival_escudo && (
                                  <span className="w-4 h-4 rounded-full bg-slate-100 p-0.5 inline-flex items-center justify-center shrink-0 overflow-hidden border border-slate-200">
                                    <img
                                      src={toProxyImageUrl(m.rival_escudo) || m.rival_escudo}
                                      alt={m.rival_nombre}
                                      className="w-full h-full object-contain"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                      }}
                                    />
                                  </span>
                                )}
                                <span>{m.rival_nombre}</span>
                              </p>
                              <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                                <span className="font-semibold text-slate-700">{m.lugar === "Local" ? "🏠 Local" : "✈️ Visitante"}</span>
                                <span>·</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {dateStr} {timeStr}h
                                </span>
                                {m.equipo?.category && (
                                  <>
                                    <span>·</span>
                                    <span className="text-slate-400 font-medium">{m.equipo.category}</span>
                                  </>
                                )}
                              </p>
                            </div>
                          </div>
                          <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-xl shrink-0 ${
                            isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                          }`}>
                            {isSelected ? "Incluido" : "Omitir"}
                          </span>
                        </div>
                      )
                    }))}
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      onClick={() => setActiveTab("preview")}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-sm transition-all"
                    >
                      Continuar a la Cartelera <Sparkles className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: VISTA PREVIA Y COMPARTIR */}
              {activeTab === "preview" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Columna Izquierda: Cartelera Gráfica (para descargar) */}
                  <div className="lg:col-span-7 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                          Cartelera Oficial
                        </span>
                        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                          <button
                            type="button"
                            onClick={selectCurrentWeekend}
                            className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-blue-700 shadow-xs hover:bg-blue-50 transition-colors"
                          >
                            Esta Jornada
                          </button>
                          <button
                            type="button"
                            onClick={selectNextWeekend}
                            className="text-[10px] font-bold px-2 py-0.5 rounded text-slate-600 hover:text-slate-900 transition-colors"
                          >
                            Próxima Jornada
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={handleDownloadImage}
                        disabled={isDownloading || selectedMatches.length === 0}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Download className="w-3.5 h-3.5" />
                        {isDownloading ? "Generando..." : "Descargar Imagen PNG"}
                      </button>
                    </div>

                    {/* Contenedor Cartelera Oficial */}
                    <div
                      ref={posterRef}
                      className="bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-800 space-y-6 relative overflow-hidden"
                    >
                      {/* Fondo decorativo */}
                      <div className="absolute -top-10 -right-10 w-52 h-52 bg-blue-600/15 rounded-full pointer-events-none" />
                      <div className="absolute -bottom-10 -left-10 w-52 h-52 bg-amber-500/15 rounded-full pointer-events-none" />

                      {/* Cabecera de la Cartelera */}
                      <div className="text-center space-y-2 relative z-10 border-b border-slate-800 pb-5">
                        <div className="w-20 h-20 rounded-full bg-white border-2 border-amber-400 p-2 mx-auto flex items-center justify-center shadow-2xl shadow-black/40 overflow-hidden">
                          <img
                            src={clubLogoUrl || "/escudo-saladar.jpg"}
                            alt={clubName}
                            className="w-full h-full object-contain rounded-full"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/escudo-saladar.jpg"
                            }}
                          />
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase drop-shadow-sm">
                          {clubName}
                        </h2>
                        <div className="inline-block bg-blue-600/40 border border-blue-400/30 px-3 py-1 rounded-full">
                          <p className="text-[11px] font-black tracking-wider text-blue-300 uppercase">
                            PARTIDOS DE LA JORNADA
                          </p>
                        </div>
                        <p className="text-xs font-semibold text-slate-400">
                          📅 {dateRangeLabel}
                        </p>
                      </div>

                      {/* Lista de Partidos en la Cartelera */}
                      <div className="space-y-3 relative z-10">
                        {selectedMatches.length === 0 ? (
                          <div className="text-center py-8 text-slate-500">
                            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-xs">No hay partidos seleccionados para la cartelera.</p>
                          </div>
                        ) : (
                          selectedMatches.map(m => {
                            const dt = m.fecha_hora ? new Date(m.fecha_hora) : null
                            const dayName = dt ? dt.toLocaleDateString("es-ES", { weekday: "short" }) : ""
                            const dayFormatted = dayName.toUpperCase()
                            const dateFormatted = dt ? dt.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" }) : ""
                            const timeFormatted = dt ? dt.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : ""
                            const isHome = m.lugar === "Local"
                            const rivalShieldUrl = m.rival_escudo ? toProxyImageUrl(m.rival_escudo) : null

                            return (
                              <div
                                key={m.id}
                                className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-md transition-all"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 shrink-0 text-center">
                                    <span className="text-[9px] font-black text-amber-400">{dayFormatted}</span>
                                    <span className="text-xs font-black text-white leading-tight">{dateFormatted}</span>
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-sm font-black text-white truncate">
                                        {m.equipo?.name}
                                      </span>
                                      <span className="text-[10px] text-slate-400 font-semibold">vs</span>
                                      <div className="inline-flex items-center gap-1.5 min-w-0">
                                        {rivalShieldUrl && (
                                          <div className="w-5 h-5 rounded-md bg-white p-0.5 shrink-0 flex items-center justify-center overflow-hidden shadow-xs">
                                            <img
                                              src={rivalShieldUrl}
                                              alt={m.rival_nombre}
                                              className="w-full h-full object-contain"
                                              crossOrigin="anonymous"
                                              onError={(e) => {
                                                (e.target as HTMLElement).style.display = 'none';
                                              }}
                                            />
                                          </div>
                                        )}
                                        <span className="text-sm font-bold text-slate-200 truncate">
                                          {m.rival_nombre}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                                      <span className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${
                                        isHome ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                                      }`}>
                                        {isHome ? "LOCAL" : "VISITANTE"}
                                      </span>
                                      {m.equipo?.category && (
                                        <span className="text-slate-400">· {m.equipo.category}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="flex items-center gap-1 text-sm font-black text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 rounded-xl">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>{timeFormatted}h</span>
                                  </div>
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>

                      {/* Nota de Coordinación en la Cartelera (si existe) */}
                      {customNote.trim() && (
                        <div className="relative z-10 bg-amber-500/10 border border-amber-400/20 rounded-2xl p-3 text-xs text-amber-200/90 italic">
                          <span className="font-bold not-italic text-amber-300">Aviso: </span>
                          "{customNote.trim()}"
                        </div>
                      )}

                      {/* Footer Oficial */}
                      <div className="pt-3 border-t border-slate-800 text-center text-[10px] text-slate-500 font-medium">
                        Plataforma Oficial {clubName} · Temporada Oficial FFCV
                      </div>
                    </div>
                  </div>

                  {/* Columna Derecha: Opciones de Difusión y Personalización */}
                  <div className="lg:col-span-5 space-y-5">
                    
                    {/* Nota del Coordinador */}
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
                      <label className="block text-xs font-black uppercase text-slate-700">
                        💬 Nota o Instrucciones (Opcional)
                      </label>
                      <textarea
                        value={customNote}
                        onChange={e => setCustomNote(e.target.value)}
                        placeholder="Ej: Puntualidad en los campos de juego. ¡A por todas equipo! 🔴🔵"
                        rows={3}
                        className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-slate-800"
                      />
                      <p className="text-[11px] text-slate-500">
                        Se añadirá automáticamente al mensaje de WhatsApp y a la notificación de la app.
                      </p>
                    </div>

                    {/* SECCIÓN WHATSAPP */}
                    <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center gap-2 text-emerald-800">
                        <MessageCircle className="w-5 h-5 text-emerald-600" />
                        <h4 className="text-sm font-black uppercase tracking-tight">Difusión por WhatsApp</h4>
                      </div>
                      <p className="text-xs text-emerald-700 leading-snug">
                        Envía los horarios y partidos formateados directamente al grupo de entrenadores o capitanes.
                      </p>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={handleOpenWhatsApp}
                          disabled={selectedMatches.length === 0}
                          className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Abrir WhatsApp
                        </button>
                        <button
                          onClick={handleCopyText}
                          disabled={selectedMatches.length === 0}
                          className="w-full py-2.5 px-3 bg-white hover:bg-emerald-100/50 text-emerald-800 border border-emerald-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                        >
                          {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedText ? "Copiado!" : "Copiar Texto"}
                        </button>
                      </div>
                    </div>

                    {/* SECCIÓN NOTIFICACIÓN EN LA APP */}
                    <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center gap-2 text-indigo-900">
                        <Bell className="w-5 h-5 text-indigo-600" />
                        <h4 className="text-sm font-black uppercase tracking-tight">Enviar por la Aplicación</h4>
                      </div>
                      <p className="text-xs text-indigo-700 leading-snug">
                        Envía una alerta interna a la campana y notificaciones push de todos los entrenadores del club y publícalo en el chat general.
                      </p>
                      <button
                        onClick={handleBroadcastToCoaches}
                        disabled={isBroadcasting || selectedMatches.length === 0}
                        className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
                      >
                        {isBroadcasting ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Share2 className="w-4 h-4" />
                        )}
                        {isBroadcasting ? "Enviando a entrenadores..." : "Notificar a Entrenadores en la App"}
                      </button>
                    </div>

                    {/* Botón de Descarga PNG */}
                    <div className="pt-2">
                      <button
                        onClick={handleDownloadImage}
                        disabled={isDownloading || selectedMatches.length === 0}
                        className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
                      >
                        <Download className="w-4 h-4 text-amber-400" />
                        {isDownloading ? "Generando imagen..." : "Descargar Cartelera en Imagen (PNG)"}
                      </button>
                    </div>

                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 font-medium">
            {selectedMatches.length} partido{selectedMatches.length === 1 ? "" : "s"} seleccionado{selectedMatches.length === 1 ? "" : "s"}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  )
}
