"use client"

import React, { useState, useEffect, useMemo } from "react"
import Image from "next/image"
import {
  X,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  Calendar,
  Sparkles,
  Info,
  Clock,
  ArrowLeft,
  ArrowRight,
  Save,
  MousePointer,
  Eye,
  Maximize2
} from "lucide-react"
import { createInjuryAction } from "@/app/actions/injury-actions"
import {
  estimateRecovery,
  MEDICAL_DISCLAIMER,
  type RecoveryEstimationResult
} from "@/lib/injuries/recovery-guidelines"
import { QUICK_REGIONS } from "./AnatomicalBodyMap"
import type { LateralityType } from "./AnatomicalMannequin3D"

interface PlayerData {
  id: string
  name: string
  number?: string | number
  position?: string
  status?: string
  avatarUrl?: string
}

interface ProfessionalInjuryModalProps {
  isOpen: boolean
  onClose: () => void
  player: PlayerData
  onInjuryCreated: () => void
}

// 25 Músculos de fútbol estructurados en el acordeón izquierdo
interface MuscleItem {
  id: string
  name: string
  region: string
  laterality: LateralityType
  view: "front" | "back"
}

interface CategoryGroup {
  id: string
  title: string
  icon: string
  muscles: MuscleItem[]
}

const FOOTBALL_ANATOMY_CATEGORIES: CategoryGroup[] = [
  {
    id: "cabeza_cuello",
    title: "Cabeza y cuello",
    icon: "💀",
    muscles: [
      { id: "cabeza", name: "Cráneo / Cara", region: "Cabeza", laterality: "central", view: "front" },
      { id: "cuello", name: "Musculatura cervical", region: "Cuello", laterality: "central", view: "front" }
    ]
  },
  {
    id: "tronco",
    title: "Core y Tronco",
    icon: "🩻",
    muscles: [
      { id: "pecho", name: "Pectoral mayor", region: "Tronco", laterality: "central", view: "front" },
      { id: "recto_abdominal", name: "Recto abdominal", region: "Tronco", laterality: "central", view: "front" },
      { id: "oblicuos", name: "Oblicuo interno / externo", region: "Tronco", laterality: "central", view: "front" },
      { id: "dorsal_ancho", name: "Dorsal ancho", region: "Tronco", laterality: "central", view: "back" },
      { id: "erectores", name: "Erectores de la columna", region: "Tronco", laterality: "central", view: "back" }
    ]
  },
  {
    id: "miembros_superiores",
    title: "Miembros superiores (y Portero)",
    icon: "🫱",
    muscles: [
      { id: "supraespinoso_der", name: "Supraespinoso (Hombro der)", region: "Hombro", laterality: "derecha", view: "front" },
      { id: "supraespinoso_izq", name: "Supraespinoso (Hombro izq)", region: "Hombro", laterality: "izquierda", view: "front" },
      { id: "subescapular_der", name: "Subescapular / Redondo mayor (der)", region: "Hombro", laterality: "derecha", view: "back" },
      { id: "biceps_der", name: "Bíceps braquial derecho", region: "Brazo", laterality: "derecha", view: "front" },
      { id: "triceps_der", name: "Tríceps braquial derecho", region: "Brazo", laterality: "derecha", view: "back" },
      { id: "codo_der", name: "Codo / Epicóndilo derecho", region: "Codo", laterality: "derecha", view: "front" },
      { id: "antebrazo_der", name: "Musculatura flexora / extensora", region: "Antebrazo", laterality: "derecha", view: "front" },
      { id: "muneca_der", name: "Muñeca / Escafoides derecho", region: "Muñeca", laterality: "derecha", view: "front" }
    ]
  },
  {
    id: "ingle_cadera",
    title: "Ingle y Cadera (Aductores / Flexores)",
    icon: "🦵",
    muscles: [
      { id: "aductor_largo_der", name: "Aductor largo (medio) der", region: "Cadera / Pelvis", laterality: "derecha", view: "front" },
      { id: "aductor_largo_izq", name: "Aductor largo (medio) izq", region: "Cadera / Pelvis", laterality: "izquierda", view: "front" },
      { id: "aductor_mayor_der", name: "Aductor mayor derecho", region: "Cadera / Pelvis", laterality: "derecha", view: "front" },
      { id: "pectineo_der", name: "Pectíneo derecho", region: "Cadera / Pelvis", laterality: "derecha", view: "front" },
      { id: "gracil_der", name: "Grácil (Recto interno) der", region: "Cadera / Pelvis", laterality: "derecha", view: "front" },
      { id: "psoas_der", name: "Psoas ilíaco derecho", region: "Cadera / Pelvis", laterality: "derecha", view: "front" },
      { id: "tfl_der", name: "Tensor de la fascia lata der", region: "Cadera / Pelvis", laterality: "derecha", view: "front" },
      { id: "gluteo_der", name: "Glúteo mayor / medio derecho", region: "Cadera / Pelvis", laterality: "derecha", view: "back" },
      { id: "gluteo_izq", name: "Glúteo mayor / medio izquierdo", region: "Cadera / Pelvis", laterality: "izquierda", view: "back" }
    ]
  },
  {
    id: "miembros_inferiores",
    title: "Miembros inferiores (Muslo y Pierna)",
    icon: "👟",
    muscles: [
      { id: "recto_anterior_der", name: "Recto anterior (cuádriceps) der", region: "Muslo anterior", laterality: "derecha", view: "front" },
      { id: "vasto_lateral_der", name: "Vasto lateral (cuádriceps) der", region: "Muslo anterior", laterality: "derecha", view: "front" },
      { id: "vasto_medial_der", name: "Vasto medial (cuádriceps) der", region: "Muslo anterior", laterality: "derecha", view: "front" },
      { id: "sartorio_der", name: "Sartorio derecho", region: "Muslo anterior", laterality: "derecha", view: "front" },
      { id: "biceps_femoral_larga_der", name: "Bíceps femoral (Cabeza larga) der", region: "Muslo posterior", laterality: "derecha", view: "back" },
      { id: "biceps_femoral_corta_der", name: "Bíceps femoral (Cabeza corta) der", region: "Muslo posterior", laterality: "derecha", view: "back" },
      { id: "semitendinoso_der", name: "Semitendinoso derecho", region: "Muslo posterior", laterality: "derecha", view: "back" },
      { id: "semimembranoso_der", name: "Semimembranoso derecho", region: "Muslo posterior", laterality: "derecha", view: "back" },
      { id: "rodilla_der", name: "Rótula / Tendón rotuliano der", region: "Rodilla", laterality: "derecha", view: "front" },
      { id: "gemelo_interno_der", name: "Gemelo interno (Gastrocnemio) der", region: "Pierna", laterality: "derecha", view: "back" },
      { id: "gemelo_externo_der", name: "Gemelo externo (Gastrocnemio) der", region: "Pierna", laterality: "derecha", view: "back" },
      { id: "soleo_der", name: "Sóleo derecho", region: "Pierna", laterality: "derecha", view: "back" },
      { id: "tibial_anterior_der", name: "Tibial anterior derecho", region: "Pierna", laterality: "derecha", view: "front" },
      { id: "peroneos_der", name: "Peroneo lateral largo / corto der", region: "Pierna", laterality: "derecha", view: "front" },
      { id: "tobillo_der", name: "Ligamentos tobillo / Aquiles der", region: "Tobillo", laterality: "derecha", view: "front" }
    ]
  }
]

// Mapeo espacial exacto de cada músculo sobre el avatar (porcentaje x, y, ancho y alto)
interface MuscleCoordinate {
  view: "front" | "back"
  x: number // porcentaje X
  y: number // porcentaje Y
  w: number // ancho del aura
  h: number // alto del aura
  pointerSide: "left" | "right"
}

const MUSCLE_COORDINATES: Record<string, MuscleCoordinate> = {
  // Cabeza y Cuello
  "Cráneo / Cara": { view: "front", x: 50, y: 9, w: 50, h: 55, pointerSide: "right" },
  "Musculatura cervical": { view: "front", x: 50, y: 15, w: 42, h: 28, pointerSide: "right" },

  // Core y Tronco
  "Pectoral mayor": { view: "front", x: 50, y: 24, w: 90, h: 48, pointerSide: "right" },
  "Recto abdominal": { view: "front", x: 50, y: 35, w: 60, h: 70, pointerSide: "right" },
  "Oblicuo interno / externo": { view: "front", x: 62, y: 36, w: 45, h: 60, pointerSide: "right" },
  "Dorsal ancho": { view: "back", x: 50, y: 27, w: 95, h: 65, pointerSide: "right" },
  "Erectores de la columna": { view: "back", x: 50, y: 38, w: 65, h: 60, pointerSide: "right" },

  // Miembros Superiores
  "Supraespinoso (Hombro der)": { view: "front", x: 32, y: 22, w: 45, h: 45, pointerSide: "left" },
  "Supraespinoso (Hombro izq)": { view: "front", x: 68, y: 22, w: 45, h: 45, pointerSide: "right" },
  "Subescapular / Redondo mayor (der)": { view: "back", x: 33, y: 25, w: 45, h: 45, pointerSide: "left" },
  "Bíceps braquial derecho": { view: "front", x: 27, y: 31, w: 35, h: 50, pointerSide: "left" },
  "Tríceps braquial derecho": { view: "back", x: 27, y: 31, w: 35, h: 50, pointerSide: "left" },
  "Codo / Epicóndilo derecho": { view: "front", x: 24, y: 39, w: 30, h: 30, pointerSide: "left" },
  "Musculatura flexora / extensora": { view: "front", x: 21, y: 46, w: 30, h: 50, pointerSide: "left" },
  "Muñeca / Escafoides derecho": { view: "front", x: 18, y: 54, w: 25, h: 25, pointerSide: "left" },

  // Ingle y Cadera
  "Aductor largo (medio) der": { view: "front", x: 45, y: 48, w: 38, h: 55, pointerSide: "left" },
  "Aductor largo (medio) izq": { view: "front", x: 55, y: 48, w: 38, h: 55, pointerSide: "right" },
  "Aductor mayor derecho": { view: "front", x: 44, y: 51, w: 38, h: 50, pointerSide: "left" },
  "Pectíneo derecho": { view: "front", x: 44, y: 46, w: 35, h: 35, pointerSide: "left" },
  "Grácil (Recto interno) der": { view: "front", x: 46, y: 53, w: 25, h: 60, pointerSide: "left" },
  "Psoas ilíaco derecho": { view: "front", x: 42, y: 44, w: 35, h: 45, pointerSide: "left" },
  "Tensor de la fascia lata der": { view: "front", x: 35, y: 46, w: 30, h: 45, pointerSide: "left" },
  "Glúteo mayor / medio derecho": { view: "back", x: 43, y: 47, w: 50, h: 50, pointerSide: "left" },
  "Glúteo mayor / medio izquierdo": { view: "back", x: 57, y: 47, w: 50, h: 50, pointerSide: "right" },

  // Miembros Inferiores
  "Recto anterior (cuádriceps) der": { view: "front", x: 41, y: 55, w: 45, h: 80, pointerSide: "left" },
  "Vasto lateral (cuádriceps) der": { view: "front", x: 35, y: 56, w: 35, h: 70, pointerSide: "left" },
  "Vasto medial (cuádriceps) der": { view: "front", x: 45, y: 62, w: 35, h: 50, pointerSide: "left" },
  "Sartorio derecho": { view: "front", x: 39, y: 53, w: 25, h: 75, pointerSide: "left" },
  "Bíceps femoral (Cabeza larga) der": { view: "back", x: 42, y: 56, w: 45, h: 80, pointerSide: "left" },
  "Bíceps femoral (Cabeza corta) der": { view: "back", x: 40, y: 60, w: 35, h: 55, pointerSide: "left" },
  "Semitendinoso derecho": { view: "back", x: 44, y: 56, w: 35, h: 75, pointerSide: "left" },
  "Semimembranoso derecho": { view: "back", x: 45, y: 58, w: 35, h: 75, pointerSide: "left" },
  "Rótula / Tendón rotuliano der": { view: "front", x: 42, y: 70, w: 35, h: 35, pointerSide: "left" },
  "Gemelo interno (Gastrocnemio) der": { view: "back", x: 45, y: 77, w: 35, h: 55, pointerSide: "left" },
  "Gemelo externo (Gastrocnemio) der": { view: "back", x: 38, y: 77, w: 35, h: 55, pointerSide: "left" },
  "Sóleo derecho": { view: "back", x: 43, y: 83, w: 35, h: 50, pointerSide: "left" },
  "Tibial anterior derecho": { view: "front", x: 42, y: 80, w: 35, h: 65, pointerSide: "left" },
  "Peroneo lateral largo / corto der": { view: "front", x: 37, y: 81, w: 30, h: 60, pointerSide: "left" },
  "Ligamentos tobillo / Aquiles der": { view: "front", x: 43, y: 91, w: 30, h: 30, pointerSide: "left" }
}

const INJURY_TYPES = [
  { value: "Rotura muscular", desc: "Desgarro total de las fibras musculares.", defaultImpact: "Grave" },
  { value: "Microrrotura", desc: "Rotura parcial o rotura fibrilar circunscrita.", defaultImpact: "Moderada" },
  { value: "Distensión muscular", desc: "Elongación excesiva de las fibras sin discontinuidad anatómica.", defaultImpact: "Leve" },
  { value: "Contractura", desc: "Contracción involuntaria continuada de las fibras musculares.", defaultImpact: "Leve" },
  { value: "Esguince", desc: "Lesión ligamentosa por movimiento forzado de la articulación.", defaultImpact: "Moderada" },
  { value: "Tendinopatía", desc: "Inflamación o degeneración del tejido tendinoso.", defaultImpact: "Moderada" },
  { value: "Contusión", desc: "Traumatismo directo con hematoma intramuscular.", defaultImpact: "Leve" },
  { value: "Otra", desc: "Lesión deportiva de otra naturaleza médica.", defaultImpact: "Moderada" }
]

export function ProfessionalInjuryModal({
  isOpen,
  onClose,
  player,
  onInjuryCreated
}: ProfessionalInjuryModalProps) {
  // Pasos del Wizard: 1. Zona -> 2. Tipo -> 3. Gravedad -> 4. Detalles
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1)

  // Vista activa del avatar: "dual" (ambos), "front", "back"
  const [activeAvatarView, setActiveAvatarView] = useState<"dual" | "front" | "back">("dual")
  const [view3DMode, setView3DMode] = useState<"3d" | "2d">("3d")

  // Acordeón izquierdo abierto
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["miembros_inferiores"])

  // Selección Anatómica: EMPIEZA LIMPIO SIN LESIÓN MARCADA POR DEFECTO
  const [selectedRegion, setSelectedRegion] = useState<string>("")
  const [selectedStructure, setSelectedStructure] = useState<string>("")
  const [selectedLaterality, setSelectedLaterality] = useState<LateralityType>("derecha")
  const [isTooltipDismissed, setIsTooltipDismissed] = useState<boolean>(false)

  // Datos de la Lesión
  const [injuryType, setInjuryType] = useState<string>("Rotura muscular")
  const [customType, setCustomType] = useState<string>("")
  const [severity, setSeverity] = useState<"Leve" | "Moderada" | "Grave">("Grave")
  const [injuryDate, setInjuryDate] = useState<string>(new Date().toISOString().split("T")[0])
  const [expectedReturnDate, setExpectedReturnDate] = useState<string>("")
  const [notes, setNotes] = useState<string>("")
  const [saving, setSaving] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Coordenadas anatómicas del músculo seleccionado actualmente
  const activeCoord = useMemo(() => {
    if (!selectedStructure) return null
    return MUSCLE_COORDINATES[selectedStructure] || {
      view: "back" as const,
      x: 42,
      y: 56,
      w: 45,
      h: 80,
      pointerSide: "left" as const
    }
  }, [selectedStructure])

  // Cálculo en tiempo real del pronóstico de baja con el motor científico
  const currentEstimation: RecoveryEstimationResult = estimateRecovery({
    injuryType: injuryType === "Otra" ? customType : injuryType,
    structure: selectedStructure,
    severity,
    injuryDate
  })

  // Sincronizar automáticamente la fecha de regreso sugerida si el usuario lo desea
  useEffect(() => {
    if (currentEstimation.hasEstimation && currentEstimation.estimatedReturnTo && !expectedReturnDate) {
      setExpectedReturnDate(currentEstimation.estimatedReturnTo)
    }
  }, [currentEstimation, expectedReturnDate])

  if (!isOpen) return null

  // Alternar categorías del acordeón
  const toggleCategory = (catId: string) => {
    setExpandedCategories(prev =>
      prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
    )
  }

  // Selección desde el acordeón o avatar
  const handleSelectMuscle = (item: { name: string; region: string; laterality: LateralityType; view?: "front" | "back" }) => {
    setSelectedStructure(item.name)
    setSelectedRegion(item.region)
    setSelectedLaterality(item.laterality)
    setIsTooltipDismissed(false)

    // En móviles o si no está en modo dual, cambiar a la vista adecuada
    if (item.view && activeAvatarView !== "dual") {
      setActiveAvatarView(item.view)
    }
  }

  // Guardar lesión definitiva
  const handleSaveInjury = async () => {
    setErrorMsg(null)
    if (!selectedStructure || !selectedRegion) {
      setErrorMsg("Debes seleccionar una zona anatómica en el Paso 1")
      setCurrentStep(1)
      return
    }

    setSaving(true)
    try {
      const finalType = injuryType === "Otra" ? customType.trim() : injuryType
      if (!finalType) {
        setErrorMsg("Especifica el tipo de lesión")
        setSaving(false)
        return
      }

      const res = await createInjuryAction({
        playerId: player.id,
        injuryDate,
        injuryType: finalType,
        notes,
        expectedReturnDate: expectedReturnDate || undefined,
        bodyView: activeAvatarView === "dual" ? null : activeAvatarView,
        bodyRegion: selectedRegion,
        bodyStructure: selectedStructure,
        laterality: selectedLaterality,
        severity,
        estimatedMinDays: currentEstimation.minDays || null,
        estimatedMaxDays: currentEstimation.maxDays || null,
        estimatedReturnFrom: currentEstimation.estimatedReturnFrom || null,
        estimatedReturnTo: currentEstimation.estimatedReturnTo || null
      })

      if (res.success) {
        onInjuryCreated()
        onClose()
      } else {
        setErrorMsg(res.error || "No se pudo guardar la lesión")
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error al registrar la lesión")
    } finally {
      setSaving(false)
    }
  }

  const selectedTypeInfo = INJURY_TYPES.find(t => t.value === injuryType) || INJURY_TYPES[0]

  return (
    <div className="fixed inset-0 z-50 bg-[#060911] text-slate-100 flex flex-col select-none overflow-hidden animate-in fade-in duration-200">
      {/* 1. HEADER SUPERIOR DINÁMICO (IDÉNTICO A LA IMAGEN) */}
      <header className="h-16 px-5 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md flex items-center justify-between gap-4 shrink-0">
        {/* Datos del Jugador a la izquierda */}
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-slate-700 bg-slate-800 shrink-0 relative">
            {player.avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={player.avatarUrl}
                alt={player.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-black text-slate-300 text-sm">
                {player.name.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              {player.number && (
                <span className="font-black text-xl text-white tracking-tight">
                  {player.number}
                </span>
              )}
              <span className="font-bold text-sm text-white truncate max-w-[200px] sm:max-w-xs">
                {player.name}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span>{player.position || "Jugador del Club"}</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 font-bold text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {player.status || "Disponible"}
              </span>
            </div>
          </div>
        </div>

        {/* Controles Centrales de Cámara y Vista */}
        <div className="flex items-center gap-2">
          {/* Conmutador 3D / 2D */}
          <div className="inline-flex p-0.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setView3DMode("3d")}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                view3DMode === "3d" ? "bg-red-600 text-white shadow-xs" : "text-slate-400 hover:text-white"
              }`}
            >
              3D
            </button>
            <button
              type="button"
              onClick={() => setView3DMode("2d")}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                view3DMode === "2d" ? "bg-red-600 text-white shadow-xs" : "text-slate-400 hover:text-white"
              }`}
            >
              2D
            </button>
          </div>

          {/* Botones de Perspectiva (Frontal, Posterior, Dual, Restablecer) */}
          <div className="flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveAvatarView("front")}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeAvatarView === "front" ? "bg-red-600 text-white shadow-xs" : "bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
              }`}
            >
              Frontal
            </button>
            <button
              type="button"
              onClick={() => setActiveAvatarView("back")}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeAvatarView === "back" ? "bg-red-600 text-white shadow-xs" : "bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
              }`}
            >
              Posterior
            </button>
            <button
              type="button"
              onClick={() => setActiveAvatarView("dual")}
              className={`hidden sm:inline px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeAvatarView === "dual" ? "bg-red-600 text-white shadow-xs" : "bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
              }`}
            >
              Dual
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveAvatarView("dual")
              }}
              className="p-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-lg text-slate-300 transition-colors cursor-pointer"
              title="Restablecer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Botón Cerrar Modal */}
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          title="Cerrar modal de lesión"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      {/* CUERPO PRINCIPAL DIVIDIDO EN 3 COLUMNAS: IZQUIERDA + CENTRO + DERECHA */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* 2. PANEL IZQUIERDO: ACORDEÓN DE REGIONES DE FÚTBOL (COL 3) */}
        <aside className="hidden lg:flex lg:col-span-3 border-r border-slate-800/70 bg-[#070b13] flex-col p-4 overflow-y-auto space-y-4">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-black text-slate-400 block mb-0.5">
              1. Selecciona la región
            </span>
            <p className="text-xs text-slate-500">
              Haz clic en el avatar o despliega el músculo
            </p>
          </div>

          {/* Acordeón de las 5 Categorías Anatómicas */}
          <div className="space-y-1.5 flex-1">
            {FOOTBALL_ANATOMY_CATEGORIES.map(cat => {
              const isExpanded = expandedCategories.includes(cat.id)
              const hasSelectedMuscle = cat.muscles.some(m => m.name === selectedStructure)

              return (
                <div
                  key={cat.id}
                  className={`rounded-xl border transition-all ${
                    hasSelectedMuscle
                      ? "border-red-500/60 bg-red-950/20"
                      : "border-slate-800/80 bg-slate-900/40 hover:bg-slate-900/60"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className="w-full flex items-center justify-between p-2.5 text-xs font-bold text-slate-200 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      <span>{cat.title}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>

                  {/* Listado de músculos específicos al expandir */}
                  {isExpanded && (
                    <div className="px-2 pb-2 space-y-1 border-t border-slate-800/60 pt-1.5">
                      {cat.muscles.map(m => {
                        const isSelected = selectedStructure === m.name
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => handleSelectMuscle(m)}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-between cursor-pointer ${
                              isSelected
                                ? "bg-red-600 text-white shadow-xs font-bold"
                                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                            }`}
                          >
                            <span className="truncate">{m.name}</span>
                            {isSelected && <Check className="w-3 h-3 text-white shrink-0" />}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Caja Informativa en el pie izquierdo */}
          <div className="p-3 rounded-xl border border-slate-800/80 bg-slate-900/30 text-xs text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-300 font-bold text-[11px]">
              <Info className="w-3.5 h-3.5 text-sky-400" />
              <span>Información</span>
            </div>
            <p className="text-[10px] leading-relaxed">
              Selecciona una región en el avatar o usa la tira rápida inferior.
            </p>
          </div>
        </aside>

        {/* 3. ESCENARIO CENTRAL: DOBLE AVATAR ANATÓMICO (COL 6) */}
        <main className="lg:col-span-6 flex flex-col bg-gradient-to-b from-[#0a0f19] via-[#070b13] to-[#04060b] relative overflow-hidden">
          {/* Escenario de los dos Avatares */}
          <div className="flex-1 flex items-center justify-center p-4 relative">
            <div className="w-full h-full max-w-xl flex items-center justify-around">
              {/* AVATAR FRONTAL (Visible en Dual o Front) */}
              {(activeAvatarView === "dual" || activeAvatarView === "front") && (
                <div className="relative w-48 sm:w-56 h-[380px] sm:h-[430px] flex items-center justify-center">
                  <Image
                    src="/models/avatar_front_reference_clean.png"
                    alt="Anatomía Frontal"
                    width={280}
                    height={520}
                    priority
                    className="w-full h-full object-contain filter drop-shadow-[0_12px_28px_rgba(0,0,0,0.85)] pointer-events-none"
                  />

                  {/* CAPA SVG INTERACTIVA: ZONAS ANATÓMICAS CLICABLES DIRECTAMENTE EN EL AVATAR */}
                  <svg
                    viewBox="0 0 255 495"
                    className="absolute inset-0 w-full h-full z-20"
                  >
                    {/* Cráneo / Cara */}
                    <ellipse
                      cx="127.5" cy="42" rx="26" ry="32"
                      className={`cursor-pointer transition-all ${
                        selectedStructure === "Cráneo / Cara"
                          ? "fill-red-600/60 stroke-red-400 stroke-2 filter drop-shadow-[0_0_12px_rgba(239,68,68,0.95)]"
                          : "fill-transparent hover:fill-red-500/25 hover:stroke-red-400/80 hover:stroke-1"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectMuscle({ name: "Cráneo / Cara", region: "Cabeza", laterality: "central", view: "front" })
                      }}
                    >
                      <title>Cráneo / Cara</title>
                    </ellipse>

                    {/* Cuello */}
                    <rect
                      x="115" y="74" width="25" height="18" rx="4"
                      className={`cursor-pointer transition-all ${
                        selectedStructure === "Musculatura cervical"
                          ? "fill-red-600/60 stroke-red-400 stroke-2 filter drop-shadow-[0_0_12px_rgba(239,68,68,0.95)]"
                          : "fill-transparent hover:fill-red-500/25 hover:stroke-red-400/80 hover:stroke-1"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectMuscle({ name: "Musculatura cervical", region: "Cuello", laterality: "central", view: "front" })
                      }}
                    >
                      <title>Musculatura cervical</title>
                    </rect>

                    {/* Pectoral Mayor */}
                    <rect
                      x="94" y="94" width="67" height="42" rx="8"
                      className={`cursor-pointer transition-all ${
                        selectedStructure === "Pectoral mayor"
                          ? "fill-red-600/60 stroke-red-400 stroke-2 filter drop-shadow-[0_0_12px_rgba(239,68,68,0.95)]"
                          : "fill-transparent hover:fill-red-500/25 hover:stroke-red-400/80 hover:stroke-1"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectMuscle({ name: "Pectoral mayor", region: "Tronco", laterality: "central", view: "front" })
                      }}
                    >
                      <title>Pectoral mayor</title>
                    </rect>

                    {/* Recto Abdominal */}
                    <rect
                      x="106" y="138" width="43" height="66" rx="6"
                      className={`cursor-pointer transition-all ${
                        selectedStructure === "Recto abdominal"
                          ? "fill-red-600/60 stroke-red-400 stroke-2 filter drop-shadow-[0_0_12px_rgba(239,68,68,0.95)]"
                          : "fill-transparent hover:fill-red-500/25 hover:stroke-red-400/80 hover:stroke-1"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectMuscle({ name: "Recto abdominal", region: "Tronco", laterality: "central", view: "front" })
                      }}
                    >
                      <title>Recto abdominal</title>
                    </rect>

                    {/* Oblicuo Derecho */}
                    <rect
                      x="82" y="142" width="22" height="56" rx="6"
                      className={`cursor-pointer transition-all ${
                        selectedStructure === "Oblicuo interno / externo" && selectedLaterality === "derecha"
                          ? "fill-red-600/60 stroke-red-400 stroke-2 filter drop-shadow-[0_0_12px_rgba(239,68,68,0.95)]"
                          : "fill-transparent hover:fill-red-500/25 hover:stroke-red-400/80 hover:stroke-1"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectMuscle({ name: "Oblicuo interno / externo", region: "Tronco", laterality: "derecha", view: "front" })
                      }}
                    >
                      <title>Oblicuo derecho</title>
                    </rect>

                    {/* Oblicuo Izquierdo */}
                    <rect
                      x="151" y="142" width="22" height="56" rx="6"
                      className={`cursor-pointer transition-all ${
                        selectedStructure === "Oblicuo interno / externo" && selectedLaterality === "izquierda"
                          ? "fill-red-600/60 stroke-red-400 stroke-2 filter drop-shadow-[0_0_12px_rgba(239,68,68,0.95)]"
                          : "fill-transparent hover:fill-red-500/25 hover:stroke-red-400/80 hover:stroke-1"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectMuscle({ name: "Oblicuo interno / externo", region: "Tronco", laterality: "izquierda", view: "front" })
                      }}
                    >
                      <title>Oblicuo izquierdo</title>
                    </rect>

                    {/* Hombro Derecho */}
                    <ellipse
                      cx="78" cy="110" rx="17" ry="17"
                      className={`cursor-pointer transition-all ${
                        selectedStructure === "Supraespinoso (Hombro der)"
                          ? "fill-red-600/60 stroke-red-400 stroke-2 filter drop-shadow-[0_0_12px_rgba(239,68,68,0.95)]"
                          : "fill-transparent hover:fill-red-500/25 hover:stroke-red-400/80 hover:stroke-1"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectMuscle({ name: "Supraespinoso (Hombro der)", region: "Hombro", laterality: "derecha", view: "front" })
                      }}
                    >
                      <title>Hombro derecho</title>
                    </ellipse>

                    {/* Hombro Izquierdo */}
                    <ellipse
                      cx="177" cy="110" rx="17" ry="17"
                      className={`cursor-pointer transition-all ${
                        selectedStructure === "Supraespinoso (Hombro izq)"
                          ? "fill-red-600/60 stroke-red-400 stroke-2 filter drop-shadow-[0_0_12px_rgba(239,68,68,0.95)]"
                          : "fill-transparent hover:fill-red-500/25 hover:stroke-red-400/80 hover:stroke-1"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectMuscle({ name: "Supraespinoso (Hombro izq)", region: "Hombro", laterality: "izquierda", view: "front" })
                      }}
                    >
                      <title>Hombro izquierdo</title>
                    </ellipse>

                    {/* Bíceps Brazo Derecho */}
                    <rect
                      x="56" y="128" width="22" height="46" rx="8"
                      className={`cursor-pointer transition-all ${
                        selectedStructure === "Bíceps braquial derecho" && selectedLaterality === "derecha"
                          ? "fill-red-600/60 stroke-red-400 stroke-2 filter drop-shadow-[0_0_12px_rgba(239,68,68,0.95)]"
                          : "fill-transparent hover:fill-red-500/25 hover:stroke-red-400/80 hover:stroke-1"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectMuscle({ name: "Bíceps braquial derecho", region: "Brazo", laterality: "derecha", view: "front" })
                      }}
                    >
                      <title>Bíceps derecho</title>
                    </rect>

                    {/* Bíceps Brazo Izquierdo */}
                    <rect
                      x="177" y="128" width="22" height="46" rx="8"
                      className={`cursor-pointer transition-all ${
                        selectedStructure === "Bíceps braquial derecho" && selectedLaterality === "izquierda"
                          ? "fill-red-600/60 stroke-red-400 stroke-2 filter drop-shadow-[0_0_12px_rgba(239,68,68,0.95)]"
                          : "fill-transparent hover:fill-red-500/25 hover:stroke-red-400/80 hover:stroke-1"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectMuscle({ name: "Bíceps braquial derecho", region: "Brazo", laterality: "izquierda", view: "front" })
                      }}
                    >
                      <title>Bíceps izquierdo</title>
                    </rect>

                    {/* Codo Derecho */}
                    <circle
                      cx="62" cy="182" r="12"
                      className={`cursor-pointer transition-all ${
                        selectedStructure === "Codo / Epicóndilo derecho"
                          ? "fill-red-600/60 stroke-red-400 stroke-2 filter drop-shadow-[0_0_12px_rgba(239,68,68,0.95)]"
                          : "fill-transparent hover:fill-red-500/25 hover:stroke-red-400/80 hover:stroke-1"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectMuscle({ name: "Codo / Epicóndilo derecho", region: "Codo", laterality: "derecha", view: "front" })
                      }}
                    >
                      <title>Codo derecho</title>
                    </circle>

                    {/* Antebrazo Derecho */}
                    <rect
                      x="46" y="196" width="20" height="48" rx="6"
                      className={`cursor-pointer transition-all ${
                        selectedStructure === "Musculatura flexora / extensora"
                          ? "fill-red-600/60 stroke-red-400 stroke-2 filter drop-shadow-[0_0_12px_rgba(239,68,68,0.95)]"
                          : "fill-transparent hover:fill-red-500/25 hover:stroke-red-400/80 hover:stroke-1"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectMuscle({ name: "Musculatura flexora / extensora", region: "Antebrazo", laterality: "derecha", view: "front" })
                      }}
                    >
                      <title>Antebrazo derecho</title>
                    </rect>

                    {/* Muñeca / Mano Derecha */}
                    <rect
                      x="36" y="246" width="22" height="34" rx="5"
                      className={`cursor-pointer transition-all ${
                        selectedStructure === "Muñeca / Escafoides derecho"
                          ? "fill-red-600/60 stroke-red-400 stroke-2 filter drop-shadow-[0_0_12px_rgba(239,68,68,0.95)]"
                          : "fill-transparent hover:fill-red-500/25 hover:stroke-red-400/80 hover:stroke-1"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectMuscle({ name: "Muñeca / Escafoides derecho", region: "Muñeca", laterality: "derecha", view: "front" })
                      }}
                    >
                      <title>Muñeca derecha</title>
                    </rect>

                    {/* Aductor Derecho (Ingle) */}
                    <rect
                      x="108" y="214" width="18" height="52" rx="6"
                      className={`cursor-pointer transition-all ${
                        selectedStructure.toLowerCase().includes("aductor") && selectedLaterality === "derecha"
                          ? "fill-red-600/60 stroke-red-400 stroke-2 filter drop-shadow-[0_0_12px_rgba(239,68,68,0.95)]"
                          : "fill-transparent hover:fill-red-500/25 hover:stroke-red-400/80 hover:stroke-1"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectMuscle({ name: "Aductor largo (medio) der", region: "Cadera / Pelvis", laterality: "derecha", view: "front" })
                      }}
                    >
                      <title>Aductor derecho</title>
                    </rect>

                    {/* Aductor Izquierdo (Ingle) */}
                    <rect
                      x="129" y="214" width="18" height="52" rx="6"
                      className={`cursor-pointer transition-all ${
                        selectedStructure.toLowerCase().includes("aductor") && selectedLaterality === "izquierda"
                          ? "fill-red-600/60 stroke-red-400 stroke-2 filter drop-shadow-[0_0_12px_rgba(239,68,68,0.95)]"
                          : "fill-transparent hover:fill-red-500/25 hover:stroke-red-400/80 hover:stroke-1"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectMuscle({ name: "Aductor largo (medio) izq", region: "Cadera / Pelvis", laterality: "izquierda", view: "front" })
                      }}
                    >
                      <title>Aductor izquierdo</title>
                    </rect>

                    {/* Cuádriceps / Recto Anterior Derecho */}
                    <rect
                      x="86" y="240" width="30" height="85" rx="10"
                      className={`cursor-pointer transition-all ${
                        (selectedStructure.includes("cuádriceps") || selectedStructure.includes("Recto anterior") || selectedStructure.includes("Vasto")) && selectedLaterality === "derecha"
                          ? "fill-red-600/60 stroke-red-400 stroke-2 filter drop-shadow-[0_0_12px_rgba(239,68,68,0.95)]"
                          : "fill-transparent hover:fill-red-500/25 hover:stroke-red-400/80 hover:stroke-1"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectMuscle({ name: "Recto anterior (cuádriceps) der", region: "Muslo anterior", laterality: "derecha", view: "front" })
                      }}
                    >
                      <title>Cuádriceps derecho</title>
                    </rect>

                    {/* Cuádriceps / Recto Anterior Izquierdo */}
                    <rect
                      x="139" y="240" width="30" height="85" rx="10"
                      className={`cursor-pointer transition-all ${
                        (selectedStructure.includes("cuádriceps") || selectedStructure.includes("Recto anterior") || selectedStructure.includes("Vasto")) && selectedLaterality === "izquierda"
                          ? "fill-red-600/60 stroke-red-400 stroke-2 filter drop-shadow-[0_0_12px_rgba(239,68,68,0.95)]"
                          : "fill-transparent hover:fill-red-500/25 hover:stroke-red-400/80 hover:stroke-1"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectMuscle({ name: "Recto anterior (cuádriceps) der", region: "Muslo anterior", laterality: "izquierda", view: "front" })
                      }}
                    >
                      <title>Cuádriceps izquierdo</title>
                    </rect>

                    {/* Rodilla Derecha */}
                    <circle
                      cx="100" cy="338" r="14"
                      className={`cursor-pointer transition-all ${
                        selectedStructure.includes("rotuliano") && selectedLaterality === "derecha"
                          ? "fill-red-600/60 stroke-red-400 stroke-2 filter drop-shadow-[0_0_12px_rgba(239,68,68,0.95)]"
                          : "fill-transparent hover:fill-red-500/25 hover:stroke-red-400/80 hover:stroke-1"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectMuscle({ name: "Rótula / Tendón rotuliano der", region: "Rodilla", laterality: "derecha", view: "front" })
                      }}
                    >
                      <title>Rodilla derecha</title>
                    </circle>

                    {/* Rodilla Izquierda */}
                    <circle
                      cx="155" cy="338" r="14"
                      className={`cursor-pointer transition-all ${
                        selectedStructure.includes("rotuliano") && selectedLaterality === "izquierda"
                          ? "fill-red-600/60 stroke-red-400 stroke-2 filter drop-shadow-[0_0_12px_rgba(239,68,68,0.95)]"
                          : "fill-transparent hover:fill-red-500/25 hover:stroke-red-400/80 hover:stroke-1"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectMuscle({ name: "Rótula / Tendón rotuliano der", region: "Rodilla", laterality: "izquierda", view: "front" })
                      }}
                    >
                      <title>Rodilla izquierda</title>
                    </circle>

                    {/* Tibia / Pierna Derecha */}
                    <rect
                      x="89" y="356" width="22" height="75" rx="8"
                      className={`cursor-pointer transition-all ${
                        (selectedStructure.includes("Tibial") || selectedStructure.includes("Peroneo")) && selectedLaterality === "derecha"
                          ? "fill-red-600/60 stroke-red-400 stroke-2 filter drop-shadow-[0_0_12px_rgba(239,68,68,0.95)]"
                          : "fill-transparent hover:fill-red-500/25 hover:stroke-red-400/80 hover:stroke-1"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectMuscle({ name: "Tibial anterior derecho", region: "Pierna", laterality: "derecha", view: "front" })
                      }}
                    >
                      <title>Tibia / Pierna derecha</title>
                    </rect>

                    {/* Tibia / Pierna Izquierda */}
                    <rect
                      x="144" y="356" width="22" height="75" rx="8"
                      className={`cursor-pointer transition-all ${
                        (selectedStructure.includes("Tibial") || selectedStructure.includes("Peroneo")) && selectedLaterality === "izquierda"
                          ? "fill-red-600/60 stroke-red-400 stroke-2 filter drop-shadow-[0_0_12px_rgba(239,68,68,0.95)]"
                          : "fill-transparent hover:fill-red-500/25 hover:stroke-red-400/80 hover:stroke-1"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectMuscle({ name: "Tibial anterior derecho", region: "Pierna", laterality: "izquierda", view: "front" })
                      }}
                    >
                      <title>Tibia / Pierna izquierda</title>
                    </rect>

                    {/* Tobillo / Pie Derecho */}
                    <rect
                      x="88" y="435" width="24" height="46" rx="6"
                      className={`cursor-pointer transition-all ${
                        selectedStructure.includes("tobillo") && selectedLaterality === "derecha"
                          ? "fill-red-600/60 stroke-red-400 stroke-2 filter drop-shadow-[0_0_12px_rgba(239,68,68,0.95)]"
                          : "fill-transparent hover:fill-red-500/25 hover:stroke-red-400/80 hover:stroke-1"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectMuscle({ name: "Ligamentos tobillo / Aquiles der", region: "Tobillo", laterality: "derecha", view: "front" })
                      }}
                    >
                      <title>Tobillo derecho</title>
                    </rect>

                    {/* Tobillo / Pie Izquierdo */}
                    <rect
                      x="143" y="435" width="24" height="46" rx="6"
                      className={`cursor-pointer transition-all ${
                        selectedStructure.includes("tobillo") && selectedLaterality === "izquierda"
                          ? "fill-red-600/60 stroke-red-400 stroke-2 filter drop-shadow-[0_0_12px_rgba(239,68,68,0.95)]"
                          : "fill-transparent hover:fill-red-500/25 hover:stroke-red-400/80 hover:stroke-1"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectMuscle({ name: "Ligamentos tobillo / Aquiles der", region: "Tobillo", laterality: "izquierda", view: "front" })
                      }}
                    >
                      <title>Tobillo izquierdo</title>
                    </rect>
                  </svg>
                </div>
              )}

              {/* AVATAR POSTERIOR (Visible en Dual o Back) */}
              {(activeAvatarView === "dual" || activeAvatarView === "back") && (
                <div className="relative w-48 sm:w-56 h-[380px] sm:h-[430px] flex items-center justify-center">
                  <Image
                    src="/models/avatar_back_unlit.png"
                    alt="Anatomía Posterior"
                    width={280}
                    height={520}
                    priority
                    className="w-full h-full object-contain filter drop-shadow-[0_12px_28px_rgba(0,0,0,0.85)] pointer-events-none"
                  />

                  {/* CAPA SVG INTERACTIVA POSTERIOR */}
                  <svg
                    viewBox="0 0 255 495"
                    className="absolute inset-0 w-full h-full z-20"
                  >
                    {/* Cuello Posterior */}
                    <ellipse
                      cx="127.5" cy="55" rx="22" ry="28"
                      className={`cursor-pointer transition-all ${
                        selectedStructure === "Musculatura cervical"
                          ? "fill-red-600/60 stroke-red-400 stroke-2 filter drop-shadow-[0_0_12px_rgba(239,68,68,0.95)]"
                          : "fill-transparent hover:fill-red-500/25 hover:stroke-red-400/80 hover:stroke-1"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectMuscle({ name: "Musculatura cervical", region: "Cuello", laterality: "central", view: "back" })
                      }}
                    >
                      <title>Cuello posterior</title>
                    </ellipse>

                    {/* Espalda / Dorsal Ancho */}
                    <rect
                      x="90" y="98" width="75" height="60" rx="8"
                      className={`cursor-pointer transition-all ${
                        selectedStructure === "Dorsal ancho"
                          ? "fill-red-600/60 stroke-red-400 stroke-2 filter drop-shadow-[0_0_12px_rgba(239,68,68,0.95)]"
                          : "fill-transparent hover:fill-red-500/25 hover:stroke-red-400/80 hover:stroke-1"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectMuscle({ name: "Dorsal ancho", region: "Tronco", laterality: "central", view: "back" })
                      }}
                    >
                      <title>Dorsal ancho</title>
                    </rect>

                    {/* Lumbar / Erectores Columna */}
                    <rect
                      x="105" y="160" width="45" height="45" rx="6"
                      className={`cursor-pointer transition-all ${
                        selectedStructure === "Erectores de la columna"
                          ? "fill-red-600/60 stroke-red-400 stroke-2 filter drop-shadow-[0_0_12px_rgba(239,68,68,0.95)]"
                          : "fill-transparent hover:fill-red-500/25 hover:stroke-red-400/80 hover:stroke-1"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectMuscle({ name: "Erectores de la columna", region: "Tronco", laterality: "central", view: "back" })
                      }}
                    >
                      <title>Lumbar / Erectores columna</title>
                    </rect>

                    {/* Hombro Posterior Derecho */}
                    <ellipse
                      cx="75" cy="110" rx="18" ry="18"
                      className={`cursor-pointer transition-all ${
                        selectedStructure === "Subescapular / Redondo mayor (der)" && selectedLaterality === "derecha"
                          ? "fill-red-600/60 stroke-red-400 stroke-2 filter drop-shadow-[0_0_12px_rgba(239,68,68,0.95)]"
                          : "fill-transparent hover:fill-red-500/25 hover:stroke-red-400/80 hover:stroke-1"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectMuscle({ name: "Subescapular / Redondo mayor (der)", region: "Hombro", laterality: "derecha", view: "back" })
                      }}
                    >
                      <title>Hombro posterior derecho</title>
                    </ellipse>

                    {/* Hombro Posterior Izquierdo */}
                    <ellipse
                      cx="180" cy="110" rx="18" ry="18"
                      className={`cursor-pointer transition-all ${
                        selectedStructure === "Subescapular / Redondo mayor (der)" && selectedLaterality === "izquierda"
                          ? "fill-red-600/60 stroke-red-400 stroke-2 filter drop-shadow-[0_0_12px_rgba(239,68,68,0.95)]"
                          : "fill-transparent hover:fill-red-500/25 hover:stroke-red-400/80 hover:stroke-1"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectMuscle({ name: "Subescapular / Redondo mayor (der)", region: "Hombro", laterality: "izquierda", view: "back" })
                      }}
                    >
                      <title>Hombro posterior izquierdo</title>
                    </ellipse>

                    {/* Tríceps Derecho */}
                    <rect
                      x="56" y="130" width="20" height="48" rx="8"
                      className={`cursor-pointer transition-all ${
                        selectedStructure === "Tríceps braquial derecho" && selectedLaterality === "derecha"
                          ? "fill-red-600/60 stroke-red-400 stroke-2 filter drop-shadow-[0_0_12px_rgba(239,68,68,0.95)]"
                          : "fill-transparent hover:fill-red-500/25 hover:stroke-red-400/80 hover:stroke-1"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectMuscle({ name: "Tríceps braquial derecho", region: "Brazo", laterality: "derecha", view: "back" })
                      }}
                    >
                      <title>Tríceps derecho</title>
                    </rect>

                    {/* Tríceps Izquierdo */}
                    <rect
                      x="179" y="130" width="20" height="48" rx="8"
                      className={`cursor-pointer transition-all ${
                        selectedStructure === "Tríceps braquial derecho" && selectedLaterality === "izquierda"
                          ? "fill-red-600/60 stroke-red-400 stroke-2 filter drop-shadow-[0_0_12px_rgba(239,68,68,0.95)]"
                          : "fill-transparent hover:fill-red-500/25 hover:stroke-red-400/80 hover:stroke-1"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectMuscle({ name: "Tríceps braquial derecho", region: "Brazo", laterality: "izquierda", view: "back" })
                      }}
                    >
                      <title>Tríceps izquierdo</title>
                    </rect>

                    {/* Glúteo Derecho */}
                    <rect
                      x="92" y="205" width="33" height="40" rx="10"
                      className={`cursor-pointer transition-all ${
                        selectedStructure.includes("Glúteo") && selectedLaterality === "derecha"
                          ? "fill-red-600/60 stroke-red-400 stroke-2 filter drop-shadow-[0_0_12px_rgba(239,68,68,0.95)]"
                          : "fill-transparent hover:fill-red-500/25 hover:stroke-red-400/80 hover:stroke-1"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectMuscle({ name: "Glúteo mayor / medio derecho", region: "Cadera / Pelvis", laterality: "derecha", view: "back" })
                      }}
                    >
                      <title>Glúteo derecho</title>
                    </rect>

                    {/* Glúteo Izquierdo */}
                    <rect
                      x="130" y="205" width="33" height="40" rx="10"
                      className={`cursor-pointer transition-all ${
                        selectedStructure.includes("Glúteo") && selectedLaterality === "izquierda"
                          ? "fill-red-600/60 stroke-red-400 stroke-2 filter drop-shadow-[0_0_12px_rgba(239,68,68,0.95)]"
                          : "fill-transparent hover:fill-red-500/25 hover:stroke-red-400/80 hover:stroke-1"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectMuscle({ name: "Glúteo mayor / medio izquierdo", region: "Cadera / Pelvis", laterality: "izquierda", view: "back" })
                      }}
                    >
                      <title>Glúteo izquierdo</title>
                    </rect>

                    {/* Isquiotibiales Derechos (Bíceps femoral) */}
                    <rect
                      x="90" y="250" width="34" height="80" rx="10"
                      className={`cursor-pointer transition-all ${
                        (selectedStructure.includes("femoral") || selectedStructure.includes("Semitendinoso") || selectedStructure.includes("Semimembranoso")) && selectedLaterality === "derecha"
                          ? "fill-red-600/60 stroke-red-400 stroke-2 filter drop-shadow-[0_0_12px_rgba(239,68,68,0.95)]"
                          : "fill-transparent hover:fill-red-500/25 hover:stroke-red-400/80 hover:stroke-1"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectMuscle({ name: "Bíceps femoral (Cabeza larga) der", region: "Muslo posterior", laterality: "derecha", view: "back" })
                      }}
                    >
                      <title>Isquiotibiales derechos</title>
                    </rect>

                    {/* Isquiotibiales Izquierdos */}
                    <rect
                      x="131" y="250" width="34" height="80" rx="10"
                      className={`cursor-pointer transition-all ${
                        (selectedStructure.includes("femoral") || selectedStructure.includes("Semitendinoso") || selectedStructure.includes("Semimembranoso")) && selectedLaterality === "izquierda"
                          ? "fill-red-600/60 stroke-red-400 stroke-2 filter drop-shadow-[0_0_12px_rgba(239,68,68,0.95)]"
                          : "fill-transparent hover:fill-red-500/25 hover:stroke-red-400/80 hover:stroke-1"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectMuscle({ name: "Bíceps femoral (Cabeza larga) der", region: "Muslo posterior", laterality: "izquierda", view: "back" })
                      }}
                    >
                      <title>Isquiotibiales izquierdos</title>
                    </rect>

                    {/* Gemelos Derechos */}
                    <rect
                      x="88" y="345" width="28" height="60" rx="10"
                      className={`cursor-pointer transition-all ${
                        selectedStructure.includes("Gemelo") && selectedLaterality === "derecha"
                          ? "fill-red-600/60 stroke-red-400 stroke-2 filter drop-shadow-[0_0_12px_rgba(239,68,68,0.95)]"
                          : "fill-transparent hover:fill-red-500/25 hover:stroke-red-400/80 hover:stroke-1"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectMuscle({ name: "Gemelo interno (Gastrocnemio) der", region: "Pierna", laterality: "derecha", view: "back" })
                      }}
                    >
                      <title>Gemelos derechos</title>
                    </rect>

                    {/* Gemelos Izquierdos */}
                    <rect
                      x="139" y="345" width="28" height="60" rx="10"
                      className={`cursor-pointer transition-all ${
                        selectedStructure.includes("Gemelo") && selectedLaterality === "izquierda"
                          ? "fill-red-600/60 stroke-red-400 stroke-2 filter drop-shadow-[0_0_12px_rgba(239,68,68,0.95)]"
                          : "fill-transparent hover:fill-red-500/25 hover:stroke-red-400/80 hover:stroke-1"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectMuscle({ name: "Gemelo interno (Gastrocnemio) der", region: "Pierna", laterality: "izquierda", view: "back" })
                      }}
                    >
                      <title>Gemelos izquierdos</title>
                    </rect>

                    {/* Sóleo / Aquiles Derecho */}
                    <rect
                      x="95" y="408" width="18" height="45" rx="6"
                      className={`cursor-pointer transition-all ${
                        selectedStructure.includes("Sóleo") && selectedLaterality === "derecha"
                          ? "fill-red-600/60 stroke-red-400 stroke-2 filter drop-shadow-[0_0_12px_rgba(239,68,68,0.95)]"
                          : "fill-transparent hover:fill-red-500/25 hover:stroke-red-400/80 hover:stroke-1"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectMuscle({ name: "Sóleo derecho", region: "Pierna", laterality: "derecha", view: "back" })
                      }}
                    >
                      <title>Sóleo derecho</title>
                    </rect>

                    {/* Sóleo / Aquiles Izquierdo */}
                    <rect
                      x="142" y="408" width="18" height="45" rx="6"
                      className={`cursor-pointer transition-all ${
                        selectedStructure.includes("Sóleo") && selectedLaterality === "izquierda"
                          ? "fill-red-600/60 stroke-red-400 stroke-2 filter drop-shadow-[0_0_12px_rgba(239,68,68,0.95)]"
                          : "fill-transparent hover:fill-red-500/25 hover:stroke-red-400/80 hover:stroke-1"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectMuscle({ name: "Sóleo derecho", region: "Pierna", laterality: "izquierda", view: "back" })
                      }}
                    >
                      <title>Sóleo izquierdo</title>
                    </rect>
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Barra de ayuda interactiva con iconos */}
          <div className="px-6 py-2 border-t border-slate-800/60 bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-5">
              <span className="flex items-center gap-1.5">
                <MousePointer className="w-3.5 h-3.5 text-slate-300" />
                <span>Haz clic en un músculo para seleccionarlo</span>
              </span>
              <span className="hidden sm:flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-slate-300" />
                <span>Vista dual simultánea</span>
              </span>
            </div>
            <div className="text-[10px] text-slate-500">
              Anatomía Deportiva de Alta Definición
            </div>
          </div>

          {/* 4. CARRUSEL INFERIOR DE 16 MINIATURAS ANATÓMICAS */}
          <div className="p-3 border-t border-slate-800 bg-[#060911]">
            <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">
              Selección rápida por región <span className="text-slate-500 font-normal lowercase">(clic para ir)</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-700">
              {QUICK_REGIONS.map(qr => {
                const isActive = selectedRegion.toLowerCase() === qr.region.toLowerCase()
                return (
                  <button
                    key={qr.id}
                    type="button"
                    onClick={() => {
                      setSelectedRegion(qr.region)
                      setSelectedStructure(qr.structure)
                      setSelectedLaterality(qr.lat)
                      setIsTooltipDismissed(false)
                      if (qr.view && (qr.view as string) !== "both" && activeAvatarView !== "dual") {
                        setActiveAvatarView(qr.view)
                      }
                    }}
                    className={`flex flex-col items-center gap-1 p-1 rounded-xl border transition-all shrink-0 cursor-pointer min-w-[50px] ${
                      isActive
                        ? "bg-red-950/90 border-red-500 shadow-lg shadow-red-950/50 scale-105"
                        : "bg-slate-900/60 border-slate-800 hover:border-slate-600 opacity-75 hover:opacity-100"
                    }`}
                  >
                    <div className="w-9 h-11 relative rounded-lg overflow-hidden bg-black/40">
                      <Image
                        src={qr.thumb}
                        alt={qr.label}
                        width={36}
                        height={44}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className={`text-[9px] font-bold truncate max-w-[52px] ${isActive ? "text-red-400 font-black" : "text-slate-400"}`}>
                      {qr.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </main>

        {/* 5. PANEL DERECHO: WIZARD DE 4 PASOS ("NUEVA LESIÓN") (COL 3) */}
        <aside className="lg:col-span-3 border-l border-slate-800/70 bg-[#070b13] flex flex-col justify-between p-5 overflow-y-auto">
          <div className="space-y-4">
            {/* Cabecera del Panel Derecho */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <span className="font-black text-sm text-white tracking-wide">
                Nueva lesión
              </span>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Stepper en 4 Pasos */}
            <div className="grid grid-cols-4 gap-1">
              {[
                { step: 1, label: "Zona" },
                { step: 2, label: "Tipo" },
                { step: 3, label: "Gravedad" },
                { step: 4, label: "Detalles" }
              ].map(s => {
                const isPassed = currentStep > s.step || (s.step === 1 && Boolean(selectedStructure))
                const isCurrent = currentStep === s.step
                return (
                  <button
                    key={s.step}
                    type="button"
                    onClick={() => setCurrentStep(s.step as any)}
                    className="flex flex-col items-center gap-1 text-center cursor-pointer group"
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                        isPassed && !isCurrent
                          ? "bg-emerald-500 text-white"
                          : isCurrent
                          ? "bg-red-600 text-white ring-2 ring-red-500/50"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {isPassed && !isCurrent ? <Check className="w-3.5 h-3.5" /> : s.step}
                    </div>
                    <span className={`text-[9px] font-bold ${isCurrent ? "text-white" : "text-slate-500"}`}>
                      {s.label}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* ZONA SELECCIONADA CON MINIATURA DE SILUETA HUMANA */}
            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                  Zona seleccionada
                </span>
                <span className="font-black text-sm text-white block mt-0.5">
                  {selectedStructure || "Sin selección"}
                </span>
                <span className="text-[11px] font-bold text-red-400">
                  {selectedStructure ? selectedLaterality.toUpperCase() : "Selecciona en el avatar"}
                </span>
              </div>
              <div className="w-10 h-16 relative rounded-lg overflow-hidden border border-red-500/40 bg-black/60 shrink-0">
                <Image
                  src="/models/mini_body_preview.png"
                  alt="Silueta anatómica"
                  width={40}
                  height={64}
                  className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                />
              </div>
            </div>

            {/* CONTENIDO SEGÚN EL PASO DEL ASISTENTE */}
            {/* PASO 1: CONFIRMAR ZONA Y LATERALIDAD */}
            {currentStep === 1 && (
              <div className="space-y-3">
                {!selectedStructure ? (
                  <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-400 text-center space-y-1">
                    <MousePointer className="w-5 h-5 text-red-500 mx-auto" />
                    <p className="font-bold text-slate-200">Haz clic en un músculo</p>
                    <p className="text-[10px]">Toca cualquier parte en el maniquí o en el menú de la izquierda para marcar la lesión.</p>
                  </div>
                ) : (
                  <>
                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide block">
                      Lateralidad de la lesión
                    </span>
                    <div className="grid grid-cols-3 gap-1.5 text-xs">
                      {(["izquierda", "derecha", "central", "bilateral"] as const).map(lat => (
                        <button
                          key={lat}
                          type="button"
                          onClick={() => setSelectedLaterality(lat)}
                          className={`py-2 rounded-xl font-bold border transition-all cursor-pointer capitalize ${
                            selectedLaterality === lat
                              ? "bg-red-600 text-white border-red-500 shadow-xs"
                              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          {lat}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* PASO 2: TIPO DE LESIÓN Y ESTIMADOR CIENTÍFICO */}
            {currentStep === 2 && (
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wide block mb-1">
                    Tipo de lesión
                  </label>
                  <select
                    value={injuryType}
                    onChange={e => setInjuryType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                  >
                    {INJURY_TYPES.map(t => (
                      <option key={t.value} value={t.value}>
                        {t.value}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs text-slate-300">
                  <span className="font-bold text-white block mb-0.5">{injuryType}</span>
                  <p className="text-[11px] text-slate-400">{selectedTypeInfo.desc}</p>
                </div>

                {/* PRONÓSTICO DE TIEMPO DE BAJA ESTIMADO */}
                <div className="p-3.5 bg-gradient-to-br from-red-950/40 via-slate-900/80 to-slate-900/90 border border-red-500/40 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-xs font-black text-red-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Pronóstico estimado de baja deportiva</span>
                  </div>

                  <div className="text-base font-black text-white">
                    {currentEstimation.rangeLabel || "8 - 12 semanas (56 - 84 días)"}
                  </div>

                  {currentEstimation.mechanism && (
                    <div className="text-[11px] text-slate-300 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                      <strong className="text-red-400">Mecanismo común:</strong> {currentEstimation.mechanism}
                    </div>
                  )}

                  <div className="text-[10px] text-slate-400 flex items-center gap-1.5 pt-0.5">
                    <Sparkles className="w-3 h-3 text-red-400" />
                    <span>Estimación orientativa basada en FIFA Medical Network y BJSM</span>
                  </div>
                </div>
              </div>
            )}

            {/* PASO 3: GRAVEDAD E IMPACTO */}
            {currentStep === 3 && (
              <div className="space-y-3">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide block">
                  Gravedad / Impacto competitivo
                </span>
                <div className="space-y-2">
                  {(["Leve", "Moderada", "Grave"] as const).map(sev => {
                    const isSelected = severity === sev
                    return (
                      <button
                        key={sev}
                        type="button"
                        onClick={() => setSeverity(sev)}
                        className={`w-full p-3 rounded-xl border flex items-center justify-between text-xs transition-all cursor-pointer ${
                          isSelected
                            ? "bg-red-950/70 border-red-500 text-white shadow-xs"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              sev === "Grave" ? "bg-red-500" : sev === "Moderada" ? "bg-amber-400" : "bg-emerald-400"
                            }`}
                          />
                          <span className="font-bold">{sev}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {sev === "Grave" ? "Impacto alto" : sev === "Moderada" ? "Impacto medio" : "Impacto bajo"}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {/* Recálculo del pronóstico tras seleccionar gravedad */}
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Tiempo estimado resultante</span>
                  <div className="text-sm font-black text-white">{currentEstimation.rangeLabel}</div>
                </div>
              </div>
            )}

            {/* PASO 4: DETALLES Y EVOLUCIÓN (FECHAS Y OBSERVACIONES) */}
            {currentStep === 4 && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wide block mb-1">
                    Fecha de la lesión
                  </label>
                  <input
                    type="date"
                    value={injuryDate}
                    onChange={e => setInjuryDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">
                      Fecha prevista regreso
                    </label>
                    {currentEstimation.estimatedReturnTo && (
                      <button
                        type="button"
                        onClick={() => setExpectedReturnDate(currentEstimation.estimatedReturnTo!)}
                        className="text-[10px] font-bold text-red-400 hover:underline cursor-pointer"
                      >
                        Sugerida: {currentEstimation.estimatedReturnTo}
                      </button>
                    )}
                  </div>
                  <input
                    type="date"
                    value={expectedReturnDate}
                    onChange={e => setExpectedReturnDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wide block mb-1">
                    Observaciones clínicas
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Mecanismo lesional, resonancia, sensaciones..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-red-500 focus:outline-hidden resize-none"
                  />
                </div>
              </div>
            )}

            {/* Cuadro de Advertencia Médica Oficial */}
            <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-300 text-[10px] flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Importante:</strong> Esta estimación es orientativa y no sustituye la valoración de un profesional sanitario.
              </p>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-500 text-red-300 text-xs">
                {errorMsg}
              </div>
            )}
          </div>

          {/* BOTONES INFERIORES DEL WIZARD (ANTERIOR / SIGUIENTE / GUARDAR / CANCELAR) */}
          <div className="pt-4 border-t border-slate-800/80 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(prev => (prev - 1) as any)}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Anterior</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              )}

              {currentStep < 4 ? (
                <button
                  type="button"
                  disabled={currentStep === 1 && !selectedStructure}
                  onClick={() => setCurrentStep(prev => (prev + 1) as any)}
                  className="py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-red-600/30"
                >
                  <span>Siguiente</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={saving || !selectedStructure}
                  onClick={handleSaveInjury}
                  className="py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-red-600/30"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? "Guardando..." : "Guardar Lesión"}</span>
                </button>
              )}
            </div>

            {currentStep > 1 && (
              <button
                type="button"
                onClick={onClose}
                className="w-full text-center py-1 text-[11px] text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                Cancelar y salir
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
