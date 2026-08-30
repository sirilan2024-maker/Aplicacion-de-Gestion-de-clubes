"use client"

import React, { useState, useEffect, useCallback } from "react"
import {
  Activity,
  Plus,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Clock,
  Loader2,
  FileText,
  X,
  ShieldAlert,
  ShieldCheck,
  MapPin,
  TrendingUp,
  BookOpen,
  Info,
  ChevronDown,
  ChevronUp,
  History,
  MessageSquarePlus,
  CalendarCheck,
  Sparkles
} from "lucide-react"
import {
  PlayerInjuryDTO,
  InjuryUpdateDTO,
  getPlayerInjuriesAction,
  createInjuryAction,
  resolveInjuryAction,
  addInjuryUpdateAction
} from "@/app/actions/injury-actions"
import {
  AnatomicalBodyMap,
  AnatomicalSelection,
  LateralityType,
  buildDisplayLabel
} from "./AnatomicalBodyMap"
import {
  estimateRecovery,
  RecoveryEstimationResult,
  MEDICAL_DISCLAIMER
} from "@/lib/injuries/recovery-guidelines"

interface PlayerInjuriesSectionProps {
  playerId: string
  playerName?: string
  canManage?: boolean
  onInjuriesChange?: (hasActiveInjury: boolean, activeCount: number) => void
}

// Catálogo estructurado de tipos de lesiones
const INJURY_CATEGORIES = [
  {
    category: "Musculares",
    types: [
      "Rotura muscular",
      "Microrrotura",
      "Distensión muscular",
      "Elongación",
      "Contractura",
      "Sobrecarga muscular"
    ]
  },
  {
    category: "Tendinosas",
    types: [
      "Tendinitis",
      "Tendinopatía",
      "Sobrecarga tendinosa",
      "Rotura tendinosa"
    ]
  },
  {
    category: "Ligamentosas / Articulares",
    types: [
      "Esguince",
      "Lesión ligamentosa",
      "Inflamación articular",
      "Luxación"
    ]
  },
  {
    category: "Traumáticas",
    types: [
      "Contusión",
      "Fractura",
      "Golpe"
    ]
  },
  {
    category: "Dolor / Molestias",
    types: [
      "Dolor muscular",
      "Dolor articular",
      "Molestia inespecífica"
    ]
  },
  {
    category: "Otras",
    types: ["Otra"]
  }
]

const SEVERITY_OPTIONS = ["Leve", "Moderada", "Grave", "Por determinar"] as const

export function PlayerInjuriesSection({
  playerId,
  playerName = "el jugador",
  canManage = true,
  onInjuriesChange
}: PlayerInjuriesSectionProps) {
  const [injuries, setInjuries] = useState<PlayerInjuryDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modales
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  const [isEvolutionModalOpen, setIsEvolutionModalOpen] = useState(false)
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false)
  const [selectedInjuryForAction, setSelectedInjuryForAction] = useState<PlayerInjuryDTO | null>(null)

  // Expandir evoluciones en historial
  const [expandedHistories, setExpandedHistories] = useState<Record<string, boolean>>({})

  // Formulario Nueva Lesión
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [injuryDate, setInjuryDate] = useState<string>(() => new Date().toISOString().split("T")[0])
  const [injuryType, setInjuryType] = useState<string>("Rotura muscular")
  const [customType, setCustomType] = useState<string>("")
  const [severity, setSeverity] = useState<"Leve" | "Moderada" | "Grave" | "Por determinar">("Moderada")
  const [anatomicalSelection, setAnatomicalSelection] = useState<AnatomicalSelection | null>(null)
  const [notes, setNotes] = useState<string>("")
  const [expectedReturnDate, setExpectedReturnDate] = useState<string>("")

  // Formulario Evolución
  const [evolutionNotes, setEvolutionNotes] = useState<string>("")
  const [newForecastDate, setNewForecastDate] = useState<string>("")

  // Formulario Resolución / Alta
  const [actualReturnDate, setActualReturnDate] = useState<string>(() => new Date().toISOString().split("T")[0])
  const [resolutionNotes, setResolutionNotes] = useState<string>("")

  const loadInjuries = useCallback(async () => {
    if (!playerId) return
    setLoading(true)
    setError(null)
    try {
      const res = await getPlayerInjuriesAction(playerId)
      if (res.success && res.injuries) {
        setInjuries(res.injuries)
        const activeCount = res.injuries.filter(i => i.status === "activa").length
        onInjuriesChange?.(activeCount > 0, activeCount)
      } else {
        setError(res.error || "Error al cargar lesiones")
      }
    } catch (err: any) {
      setError(err.message || "Error al cargar lesiones")
    } finally {
      setLoading(false)
    }
  }, [playerId, onInjuriesChange])

  useEffect(() => {
    loadInjuries()
  }, [loadInjuries])

  // Cálculo en tiempo real del estimador orientativo
  const currentEstimation: RecoveryEstimationResult = estimateRecovery({
    injuryType: injuryType === "Otra" ? customType : injuryType,
    structure: anatomicalSelection?.bodyStructure,
    severity,
    injuryDate
  })

  const handleCreateInjury = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const finalType = injuryType === "Otra" ? customType.trim() : injuryType
    if (!finalType) {
      setFormError("Por favor especifica el tipo de lesión")
      return
    }

    if (!injuryDate) {
      setFormError("La fecha de lesión es obligatoria")
      return
    }

    setSaving(true)
    try {
      const res = await createInjuryAction({
        playerId,
        injuryDate,
        injuryType: finalType,
        notes,
        expectedReturnDate: expectedReturnDate || undefined,
        bodyView: anatomicalSelection?.bodyView || null,
        bodyRegion: anatomicalSelection?.bodyRegion || null,
        bodyStructure: anatomicalSelection?.bodyStructure || null,
        laterality: anatomicalSelection?.laterality || "no_aplica",
        severity,
        estimatedMinDays: currentEstimation.minDays || null,
        estimatedMaxDays: currentEstimation.maxDays || null,
        estimatedReturnFrom: currentEstimation.estimatedReturnFrom || null,
        estimatedReturnTo: currentEstimation.estimatedReturnTo || null
      })

      if (res.success && res.injury) {
        const newInj = res.injury!
        setInjuries(prev => {
          const updated = [newInj, ...prev.filter(x => x.id !== newInj.id)]
          const activeCount = updated.filter(i => i.status === "activa").length
          onInjuriesChange?.(activeCount > 0, activeCount)
          return updated
        })
        setIsNewModalOpen(false)
        // Reset form
        setNotes("")
        setExpectedReturnDate("")
        setInjuryType("Rotura muscular")
        setCustomType("")
        setSeverity("Moderada")
        setAnatomicalSelection(null)
        // Sincronizar en segundo plano
        loadInjuries()
      } else {
        setFormError(res.error || "Error al registrar la lesión")
      }
    } catch (err: any) {
      setFormError(err.message || "Error inesperado al registrar la lesión")
    } finally {
      setSaving(false)
    }
  }

  const handleAddEvolution = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedInjuryForAction) return
    setSaving(true)
    try {
      const res = await addInjuryUpdateAction({
        injuryId: selectedInjuryForAction.id,
        notes: evolutionNotes,
        newExpectedReturnDate: newForecastDate || undefined
      })

      if (res.success && res.update) {
        // Actualizar en el estado local
        setInjuries(prev =>
          prev.map(inj => {
            if (inj.id === selectedInjuryForAction.id) {
              const updatedList = [res.update!, ...(inj.updates || [])]
              return {
                ...inj,
                expectedReturnDate: newForecastDate || inj.expectedReturnDate,
                updates: updatedList
              }
            }
            return inj
          })
        )
        setIsEvolutionModalOpen(false)
        setEvolutionNotes("")
        setNewForecastDate("")
        setSelectedInjuryForAction(null)
      } else {
        alert(res.error || "Error al registrar evolución")
      }
    } catch (err: any) {
      alert(err.message || "Error inesperado")
    } finally {
      setSaving(false)
    }
  }

  const handleResolveInjury = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedInjuryForAction) return
    setSaving(true)
    try {
      const res = await resolveInjuryAction(
        selectedInjuryForAction.id,
        actualReturnDate,
        resolutionNotes
      )

      if (res.success && res.injury) {
        const resolvedInj = res.injury!
        setInjuries(prev => {
          const updated = prev.map(inj => (inj.id === resolvedInj.id ? resolvedInj : inj))
          const activeCount = updated.filter(i => i.status === "activa").length
          onInjuriesChange?.(activeCount > 0, activeCount)
          return updated
        })
        setIsResolveModalOpen(false)
        setResolutionNotes("")
        setSelectedInjuryForAction(null)
        // Sincronizar en segundo plano
        loadInjuries()
      } else {
        alert(res.error || "Error al marcar recuperación")
      }
    } catch (err: any) {
      alert(err.message || "Error inesperado")
    } finally {
      setSaving(false)
    }
  }

  const activeInjuries = injuries.filter(i => i.status === "activa")
  const recoveredInjuries = injuries.filter(i => i.status === "recuperado")

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—"
    try {
      const parts = dateStr.split("-")
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
      return dateStr
    } catch {
      return dateStr
    }
  }

  const formatLocationLabel = (inj: PlayerInjuryDTO) => {
    if (inj.bodyStructure) {
      return buildDisplayLabel(inj.bodyStructure, (inj.laterality as any) || "no_aplica")
    }
    if (inj.bodyRegion) {
      const sideStr =
        inj.bodySide === "right" ? "derecho/a" : inj.bodySide === "left" ? "izquierdo/a" : ""
      return `${inj.bodyRegion} ${sideStr}`.trim()
    }
    return "Localización no registrada"
  }

  const getSeverityBadgeClass = (sev: string | null) => {
    switch (sev) {
      case "Leve":
        return "bg-amber-100 text-amber-800 border border-amber-200"
      case "Moderada":
        return "bg-orange-100 text-orange-800 border border-orange-200"
      case "Grave":
        return "bg-red-100 text-red-800 border border-red-200"
      default:
        return "bg-slate-100 text-slate-700 border border-slate-200"
    }
  }

  const calculateDaysBetween = (startStr: string, endStr: string | null) => {
    if (!endStr) return null
    try {
      const start = new Date(startStr).getTime()
      const end = new Date(endStr).getTime()
      const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24))
      return diffDays >= 0 ? diffDays : null
    } catch {
      return null
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. CABECERA & BADGE DE DISPONIBILIDAD DEPORTIVA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-gray-100 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h3 className="text-base sm:text-lg font-black text-gray-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-red-600 shrink-0" />
              Módulo de Lesiones Deportivas
            </h3>

            {/* Badge de Disponibilidad Deportiva */}
            {activeInjuries.length > 0 ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-black uppercase bg-red-600 text-white shadow-xs animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                🔴 BAJA POR LESIÓN
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                🟢 SIN LESIONES ACTIVAS
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Gestión, localización anatómica y estimación de recuperación orientativa.
            <span className="hidden sm:inline text-gray-400"> (La ausencia de lesiones no sustituye autorización médica).</span>
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-red-200 cursor-pointer w-full sm:w-auto shrink-0"
          >
            <Plus className="w-4 h-4" />
            Registrar Nueva Lesión
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="p-6 sm:p-8 text-center bg-gray-50 rounded-2xl border border-gray-100 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-red-500" />
          <span className="text-xs text-gray-400 font-medium">Consultando historial médico deportivo...</span>
        </div>
      ) : (
        <>
          {/* 2. PANEL DE LESIÓN ACTIVA */}
          {activeInjuries.length > 0 && (
            <div className="space-y-4">
              <span className="text-xs font-extrabold uppercase tracking-wider text-red-700 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                Lesión Activa en Seguimiento ({activeInjuries.length})
              </span>

              {activeInjuries.map(act => (
                <div
                  key={act.id}
                  className="bg-gradient-to-r from-red-50/90 via-rose-50/70 to-orange-50/80 border-2 border-red-300 rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 shadow-sm space-y-4"
                >
                  {/* Fila Principal */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-red-300">
                        <Activity className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <h4 className="text-base sm:text-lg font-black text-slate-950 break-words">
                            {act.injuryType}
                          </h4>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${getSeverityBadgeClass(act.severity)}`}>
                            {act.severity || "Por determinar"}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600 text-white">
                            En Recuperación
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-700 mt-1">
                          <span className="font-extrabold text-red-950 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0" />
                            {formatLocationLabel(act)}
                          </span>
                          <span className="text-slate-500">
                            Fecha: <strong>{formatDate(act.injuryDate)}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Botones de acción rápida */}
                    {canManage && (
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => {
                            setSelectedInjuryForAction(act)
                            setNewForecastDate(act.expectedReturnDate || "")
                            setIsEvolutionModalOpen(true)
                          }}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer w-full sm:w-auto"
                        >
                          <MessageSquarePlus className="w-3.5 h-3.5 text-blue-600" />
                          Registrar Evolución
                        </button>

                        <button
                          onClick={() => {
                            setSelectedInjuryForAction(act)
                            setActualReturnDate(new Date().toISOString().split("T")[0])
                            setIsResolveModalOpen(true)
                          }}
                          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shadow-emerald-200 cursor-pointer w-full sm:w-auto"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Marcar como Recuperado
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Panel de Previsión y Estimación Orientativa */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 pt-3 border-t border-red-200/80 text-xs">
                    {/* Previsión Actual */}
                    <div className="bg-white/80 rounded-2xl p-3 border border-red-200/60 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Previsión Actual de Regreso
                      </span>
                      <div className="flex items-center gap-1.5 font-black text-slate-900 text-sm">
                        <CalendarCheck className="w-4 h-4 text-emerald-600" />
                        <span>{formatDate(act.expectedReturnDate)}</span>
                      </div>
                    </div>

                    {/* Estimación Inicial */}
                    <div className="bg-white/80 rounded-2xl p-3 border border-red-200/60 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Estimación Orientativa
                      </span>
                      {act.estimatedMinDays ? (
                        <div className="font-bold text-slate-900">
                          {act.estimatedMinDays}–{act.estimatedMaxDays} días
                          <span className="text-[11px] text-slate-500 block font-normal">
                            ({formatDate(act.estimatedReturnFrom)} – {formatDate(act.estimatedReturnTo)})
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">No estimada</span>
                      )}
                    </div>

                    {/* Observaciones */}
                    <div className="bg-white/80 rounded-2xl p-3 border border-red-200/60 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Observaciones Médicas
                      </span>
                      <p className="text-slate-700 line-clamp-2">
                        {act.notes || "Sin observaciones registradas."}
                      </p>
                    </div>
                  </div>

                  {/* Historial de Evoluciones Recientes */}
                  {act.updates && act.updates.length > 0 && (
                    <div className="pt-2 border-t border-red-200/60">
                      <span className="text-[10px] font-extrabold uppercase text-red-900/70 block mb-2">
                        Seguimiento y Evolución ({act.updates.length} notas)
                      </span>
                      <div className="space-y-2">
                        {act.updates.slice(0, 3).map(up => (
                          <div key={up.id} className="bg-white/70 rounded-xl p-2.5 text-xs flex items-start gap-2 border border-red-100">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between text-[11px] text-slate-500">
                                <span className="font-bold text-slate-700">{formatDate(up.updateDate)}</span>
                                {up.createdByName && <span>{up.createdByName}</span>}
                              </div>
                              <p className="text-slate-800 mt-0.5 whitespace-pre-wrap">{up.notes}</p>
                              {up.newExpectedReturnDate && (
                                <span className="inline-block mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                                  Nueva previsión: {formatDate(up.newExpectedReturnDate)}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 3. HISTORIAL COMPLETO DE LESIONES */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <History className="w-4 h-4 text-gray-400" />
                Historial Cronológico de Lesiones
              </span>
              <span className="text-xs text-gray-400">{injuries.length} registros</span>
            </div>

            {injuries.length === 0 ? (
              <div className="p-8 text-center bg-white border border-gray-200 rounded-2xl shadow-xs space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="text-sm font-bold text-gray-800">Sin lesiones registradas</p>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  El jugador no presenta historial de lesiones en el club.
                </p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[620px]">
                    <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase">
                      <tr>
                        <th className="px-4 py-3">Fecha</th>
                        <th className="px-4 py-3">Lesión & Localización</th>
                        <th className="px-4 py-3">Gravedad</th>
                        <th className="px-4 py-3">Estado</th>
                        <th className="px-4 py-3">Estimado vs Real</th>
                        <th className="px-4 py-3">Observaciones</th>
                        {canManage && <th className="px-4 py-3 text-right">Acción</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {injuries.map(inj => {
                        const isExpanded = !!expandedHistories[inj.id]
                        const actualDays = calculateDaysBetween(inj.injuryDate, inj.actualReturnDate)
                        return (
                          <React.Fragment key={inj.id}>
                            <tr className="hover:bg-gray-50/80 transition-colors">
                              <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                                {formatDate(inj.injuryDate)}
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-bold text-slate-900">{inj.injuryType}</div>
                                <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                  <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                                  <span>{formatLocationLabel(inj)}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${getSeverityBadgeClass(inj.severity)}`}>
                                  {inj.severity || "—"}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {inj.status === "activa" ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-700">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                                    Activa
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-700">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Recuperado
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                                {inj.status === "recuperado" && actualDays !== null ? (
                                  <div>
                                    <span className="font-bold text-emerald-800">{actualDays} días baja</span>
                                    {inj.estimatedMinDays && (
                                      <span className="text-[10px] text-slate-400 block">
                                        Est: {inj.estimatedMinDays}–{inj.estimatedMaxDays}d
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div>
                                    <span className="text-slate-500">Previsto: {formatDate(inj.expectedReturnDate)}</span>
                                    {inj.estimatedMinDays && (
                                      <span className="text-[10px] text-slate-400 block">
                                        Est: {inj.estimatedMinDays}–{inj.estimatedMaxDays}d
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                                {inj.notes || "—"}
                              </td>
                              {canManage && (
                                <td className="px-4 py-3 text-right whitespace-nowrap">
                                  {inj.status === "activa" ? (
                                    <button
                                      onClick={() => {
                                        setSelectedInjuryForAction(inj)
                                        setActualReturnDate(new Date().toISOString().split("T")[0])
                                        setIsResolveModalOpen(true)
                                      }}
                                      className="text-emerald-600 hover:text-emerald-800 font-bold hover:underline cursor-pointer inline-flex items-center gap-1"
                                    >
                                      Dar Alta
                                    </button>
                                  ) : (
                                    <span className="text-gray-400 text-[11px]">
                                      Alta: {formatDate(inj.actualReturnDate)}
                                    </span>
                                  )}

                                  {inj.updates && inj.updates.length > 0 && (
                                    <button
                                      onClick={() =>
                                        setExpandedHistories(prev => ({
                                          ...prev,
                                          [inj.id]: !prev[inj.id]
                                        }))
                                      }
                                      className="ml-2 text-slate-400 hover:text-slate-700 p-1"
                                      title="Ver evoluciones"
                                    >
                                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                    </button>
                                  )}
                                </td>
                              )}
                            </tr>

                            {/* Desplegable de evoluciones para esta fila */}
                            {isExpanded && inj.updates && inj.updates.length > 0 && (
                              <tr className="bg-slate-50/90">
                                <td colSpan={7} className="px-6 py-3">
                                  <div className="space-y-1.5">
                                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                                      Evolución de la lesión:
                                    </span>
                                    {inj.updates.map(u => (
                                      <div key={u.id} className="text-xs text-slate-700 flex items-start gap-2 bg-white p-2 rounded-lg border border-slate-200">
                                        <Clock className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                                        <div>
                                          <span className="font-bold">{formatDate(u.updateDate)}</span>
                                          {u.createdByName && <span className="text-slate-400"> por {u.createdByName}</span>}
                                          : <span>{u.notes}</span>
                                          {u.newExpectedReturnDate && (
                                            <span className="ml-2 text-[10px] text-emerald-700 font-semibold">
                                              (Previsión: {formatDate(u.newExpectedReturnDate)})
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* 4. MODAL PARA REGISTRAR NUEVA LESIÓN PROFESIONAL */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[94vh] flex flex-col overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
            {/* Cabecera */}
            <div className="p-5 bg-gradient-to-r from-red-600 to-rose-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="text-base font-bold">Registrar Nueva Lesión Deportiva</h4>
                  <p className="text-xs text-red-100">Jugador: {playerName}</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/20 transition-colors text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario scrolleable */}
            <form onSubmit={handleCreateInjury} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Fila 1: Fecha y Gravedad */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Fecha de Lesión <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={injuryDate}
                    onChange={e => setInjuryDate(e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Gravedad Inicial <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={severity}
                    onChange={e => setSeverity(e.target.value as any)}
                    className="w-full border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                  >
                    {SEVERITY_OPTIONS.map(s => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Fila 2: Clasificación de Lesión */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Clasificación / Tipo de Lesión <span className="text-red-500">*</span>
                </label>
                <select
                  value={injuryType}
                  onChange={e => setInjuryType(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                >
                  {INJURY_CATEGORIES.map(cat => (
                    <optgroup key={cat.category} label={`— ${cat.category} —`}>
                      {cat.types.map(t => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {injuryType === "Otra" && (
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Especificar Diagnóstico <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customType}
                    onChange={e => setCustomType(e.target.value)}
                    placeholder="Ej. Apofisitis tibial anterior"
                    className="w-full border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
              )}

              {/* MAPA ANATÓMICO INTERACTIVO */}
              <div className="pt-1">
                <AnatomicalBodyMap
                  value={anatomicalSelection}
                  onChange={setAnatomicalSelection}
                />
              </div>

              {/* MOTOR DE ESTIMACIÓN ORIENTATIVA DE RECUPERACIÓN */}
              <div className="p-4 bg-gradient-to-r from-blue-50/90 to-indigo-50/80 border border-blue-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-blue-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    Estimador Orientativo de Recuperación
                  </span>
                  {currentEstimation.hasEstimation && (
                    <button
                      type="button"
                      onClick={() => {
                        if (currentEstimation.estimatedReturnTo) {
                          setExpectedReturnDate(currentEstimation.estimatedReturnTo)
                        }
                      }}
                      className="text-[10px] font-bold text-blue-700 bg-white px-2 py-0.5 rounded-lg border border-blue-200 hover:bg-blue-50 cursor-pointer"
                    >
                      Aplicar fecha sugerida
                    </button>
                  )}
                </div>

                {currentEstimation.hasEstimation ? (
                  <div className="space-y-1.5">
                    <div className="text-sm font-black text-blue-950">
                      Tiempo habitual orientativo: {currentEstimation.rangeLabel}
                    </div>
                    {currentEstimation.estimatedReturnFrom && (
                      <div className="text-xs text-blue-800">
                        Ventana orientativa: <strong>{formatDate(currentEstimation.estimatedReturnFrom)}</strong> a <strong>{formatDate(currentEstimation.estimatedReturnTo)}</strong>
                      </div>
                    )}
                    <div className="text-[10px] text-blue-900/70 flex items-center gap-1 pt-1">
                      <BookOpen className="w-3 h-3" />
                      <span>Fuente: {currentEstimation.source} ({currentEstimation.reference})</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-blue-900/70 italic">
                    Estimación no disponible para esta combinación. Introduce manualmente la previsión deportiva a continuación.
                  </p>
                )}

                <div className="text-[10px] text-amber-800 bg-amber-50/80 p-2 rounded-xl border border-amber-200/60 flex items-start gap-1.5 mt-1">
                  <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>{MEDICAL_DISCLAIMER}</span>
                </div>
              </div>

              {/* Previsión de regreso acordada */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Fecha Prevista de Regreso (Previsión Deportiva)
                </label>
                <input
                  type="date"
                  value={expectedReturnDate}
                  onChange={e => setExpectedReturnDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              {/* Observaciones */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Observaciones / Contexto de la Lesión
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Mecanismo lesional (entrenamiento/partido), sensación del jugador, pautas iniciales de descanso o derivación..."
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 focus:ring-2 focus:ring-red-500 focus:outline-none resize-none"
                />
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  disabled={saving}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-sm shadow-red-200 cursor-pointer disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Guardar Lesión
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL PARA REGISTRAR EVOLUCIÓN */}
      {isEvolutionModalOpen && selectedInjuryForAction && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="p-5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquarePlus className="w-5 h-5" />
                <h4 className="text-base font-bold">Registrar Evolución Deportiva</h4>
              </div>
              <button
                onClick={() => setIsEvolutionModalOpen(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddEvolution} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Nota de Seguimiento / Estado del Jugador <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={evolutionNotes}
                  onChange={e => setEvolutionNotes(e.target.value)}
                  required
                  rows={4}
                  placeholder="Ej. Inicia carrera continua sin dolor. Buena respuesta a ejercicios excéntricos..."
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Actualizar Fecha Prevista de Regreso (Opcional)
                </label>
                <input
                  type="date"
                  value={newForecastDate}
                  onChange={e => setNewForecastDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEvolutionModalOpen(false)}
                  disabled={saving}
                  className="px-4 py-2 border border-gray-300 rounded-xl font-bold hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Guardar Evolución
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL PARA ALTA / MARCACIÓN DE RECUPERACIÓN */}
      {isResolveModalOpen && selectedInjuryForAction && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                <h4 className="text-base font-bold">Confirmar Alta / Recuperación</h4>
              </div>
              <button
                onClick={() => setIsResolveModalOpen(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResolveInjury} className="p-5 space-y-4 text-xs">
              <p className="text-gray-600">
                ¿Confirmas que el jugador <strong>{playerName}</strong> ha completado su recuperación de la lesión de{" "}
                <strong>{selectedInjuryForAction.injuryType}</strong> ({formatLocationLabel(selectedInjuryForAction)})?
              </p>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Fecha Real de Alta / Regreso <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={actualReturnDate}
                  onChange={e => setActualReturnDate(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Observaciones de Cierre (Opcional)
                </label>
                <textarea
                  value={resolutionNotes}
                  onChange={e => setResolutionNotes(e.target.value)}
                  rows={2}
                  placeholder="Ej. Alta deportiva completa tras test de sprint y cambios de dirección sin síntomas."
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsResolveModalOpen(false)}
                  disabled={saving}
                  className="px-4 py-2 border border-gray-300 rounded-xl font-bold hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs shadow-emerald-200"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirmar Alta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
