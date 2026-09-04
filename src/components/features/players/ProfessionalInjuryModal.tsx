"use client"

import React, { useState, useEffect } from "react"
import Image from "next/image"
import {
  X,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  Info,
  ArrowLeft,
  ArrowRight,
  Save,
  MousePointer,
  Eye,
  Sparkles,
  Plus
} from "lucide-react"
import { createInjuryAction } from "@/app/actions/injury-actions"
import {
  estimateRecovery,
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

interface MuscleItem {
  id: string
  name: string
  region: string
  laterality: LateralityType
  view: "front" | "back" | "both"
  // Coordenadas relativas (%) en el avatar (x, y) sobre la imagen de 255x495
  svg?: {
    view: "front" | "back"
    type: "circle" | "rect" | "polygon"
    cx?: number
    cy?: number
    r?: number
    x?: number
    y?: number
    w?: number
    h?: number
    points?: string
    pinX?: number
    pinY?: number
  }
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
      {
        id: "cabeza",
        name: "Cráneo / Cara",
        region: "Cabeza",
        laterality: "central",
        view: "front",
        svg: { view: "front", type: "circle", cx: 127, cy: 38, r: 22, pinX: 155, pinY: 38 }
      },
      {
        id: "cuello",
        name: "Musculatura cervical",
        region: "Cuello",
        laterality: "central",
        view: "both",
        svg: { view: "front", type: "rect", x: 118, y: 63, w: 18, h: 16, pinX: 145, pinY: 70 }
      }
    ]
  },
  {
    id: "tronco",
    title: "Core y Tronco",
    icon: "🩻",
    muscles: [
      {
        id: "pecho",
        name: "Pectoral mayor",
        region: "Tronco",
        laterality: "central",
        view: "front",
        svg: { view: "front", type: "rect", x: 104, y: 106, w: 46, h: 26, pinX: 158, pinY: 118 }
      },
      {
        id: "recto_abdominal",
        name: "Recto abdominal",
        region: "Tronco",
        laterality: "central",
        view: "front",
        svg: { view: "front", type: "rect", x: 110, y: 136, w: 34, h: 54, pinX: 152, pinY: 160 }
      },
      {
        id: "oblicuos",
        name: "Oblicuo interno / externo",
        region: "Tronco",
        laterality: "derecha",
        view: "front",
        svg: { view: "front", type: "rect", x: 92, y: 142, w: 18, h: 42, pinX: 80, pinY: 160 }
      },
      {
        id: "dorsal_ancho",
        name: "Dorsal ancho",
        region: "Tronco",
        laterality: "derecha",
        view: "back",
        svg: { view: "back", type: "rect", x: 88, y: 110, w: 26, h: 48, pinX: 75, pinY: 130 }
      },
      {
        id: "erectores",
        name: "Erectores de la columna",
        region: "Tronco",
        laterality: "central",
        view: "back",
        svg: { view: "back", type: "rect", x: 116, y: 118, w: 22, h: 64, pinX: 146, pinY: 150 }
      }
    ]
  },
  {
    id: "miembros_superiores",
    title: "Miembros superiores (Brazos)",
    icon: "🫱",
    muscles: [
      {
        id: "supraespinoso_der",
        name: "Supraespinoso (Hombro der)",
        region: "Hombro",
        laterality: "derecha",
        view: "both",
        svg: { view: "front", type: "circle", cx: 88, cy: 92, r: 15, pinX: 70, pinY: 92 }
      },
      {
        id: "biceps_der",
        name: "Bíceps braquial derecho",
        region: "Brazo",
        laterality: "derecha",
        view: "front",
        svg: { view: "front", type: "rect", x: 68, y: 110, w: 18, h: 38, pinX: 55, pinY: 125 }
      },
      {
        id: "triceps_der",
        name: "Tríceps braquial derecho",
        region: "Brazo",
        laterality: "derecha",
        view: "back",
        svg: { view: "back", type: "rect", x: 68, y: 110, w: 18, h: 40, pinX: 55, pinY: 125 }
      },
      {
        id: "codo_der",
        name: "Codo / Epicóndilo derecho",
        region: "Codo",
        laterality: "derecha",
        view: "both",
        svg: { view: "front", type: "circle", cx: 74, cy: 154, r: 10, pinX: 58, pinY: 154 }
      },
      {
        id: "antebrazo_der",
        name: "Musculatura flexora / extensora",
        region: "Antebrazo",
        laterality: "derecha",
        view: "both",
        svg: { view: "front", type: "rect", x: 60, y: 166, w: 16, h: 38, pinX: 48, pinY: 185 }
      },
      {
        id: "muneca_der",
        name: "Muñeca / Mano derecha",
        region: "Muñeca",
        laterality: "derecha",
        view: "both",
        svg: { view: "front", type: "circle", cx: 54, cy: 212, r: 10, pinX: 40, pinY: 212 }
      }
    ]
  },
  {
    id: "ingle_cadera",
    title: "Tronco inferior y Pelvis",
    icon: "🦴",
    muscles: [
      {
        id: "pubis",
        name: "Sínfisis Púbica / Pubalgia",
        region: "Cadera / Pelvis",
        laterality: "central",
        view: "front",
        svg: { view: "front", type: "rect", x: 116, y: 198, w: 22, h: 18, pinX: 148, pinY: 206 }
      },
      {
        id: "aductor_largo_der",
        name: "Aductor largo (medio) der",
        region: "Cadera / Pelvis",
        laterality: "derecha",
        view: "front",
        svg: { view: "front", type: "polygon", points: "114,216 124,216 118,272 108,272", pinX: 130, pinY: 240 }
      },
      {
        id: "psoas_der",
        name: "Psoas ilíaco derecho",
        region: "Cadera / Pelvis",
        laterality: "derecha",
        view: "front",
        svg: { view: "front", type: "rect", x: 102, y: 182, w: 16, h: 28, pinX: 88, pinY: 195 }
      },
      {
        id: "gluteo_der",
        name: "Glúteo mayor / medio derecho",
        region: "Cadera / Pelvis",
        laterality: "derecha",
        view: "back",
        svg: { view: "back", type: "rect", x: 96, y: 182, w: 28, h: 36, pinX: 80, pinY: 198 }
      }
    ]
  },
  {
    id: "miembros_inferiores",
    title: "Miembros inferiores (Piernas)",
    icon: "🦵",
    muscles: [
      {
        id: "biceps_femoral_larga_der",
        name: "Isquiotibiales (Bíceps femoral)",
        region: "Muslo posterior",
        laterality: "derecha",
        view: "back",
        svg: { view: "back", type: "polygon", points: "96,220 118,220 114,286 92,286", pinX: 125, pinY: 250 }
      },
      {
        id: "recto_anterior_der",
        name: "Cuádriceps (Recto femoral)",
        region: "Muslo anterior",
        laterality: "derecha",
        view: "front",
        svg: { view: "front", type: "rect", x: 92, y: 220, w: 24, h: 62, pinX: 75, pinY: 250 }
      },
      {
        id: "rodilla_der",
        name: "Rodilla / Ligamentos (LCA)",
        region: "Rodilla",
        laterality: "derecha",
        view: "front",
        svg: { view: "front", type: "circle", cx: 104, cy: 298, r: 13, pinX: 85, pinY: 298 }
      },
      {
        id: "gemelo_interno_der",
        name: "Gemelo interno (Gastrocnemio)",
        region: "Pierna",
        laterality: "derecha",
        view: "back",
        svg: { view: "back", type: "rect", x: 102, y: 320, w: 18, h: 48, pinX: 125, pinY: 340 }
      },
      {
        id: "soleo_der",
        name: "Sóleo derecho",
        region: "Pierna",
        laterality: "derecha",
        view: "back",
        svg: { view: "back", type: "rect", x: 92, y: 350, w: 24, h: 42, pinX: 75, pinY: 370 }
      },
      {
        id: "tobillo_der",
        name: "Tobillo / Tendón Aquiles der",
        region: "Tobillo",
        laterality: "derecha",
        view: "both",
        svg: { view: "back", type: "rect", x: 98, y: 400, w: 16, h: 32, pinX: 80, pinY: 415 }
      },
      {
        id: "pie_der",
        name: "Pie y Metatarso derecho",
        region: "Pie",
        laterality: "derecha",
        view: "front",
        svg: { view: "front", type: "rect", x: 96, y: 440, w: 18, h: 28, pinX: 80, pinY: 450 }
      }
    ]
  }
]

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
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1)
  const [activeAvatarView, setActiveAvatarView] = useState<"dual" | "front" | "back">("dual")
  const [view3DMode, setView3DMode] = useState<"3d" | "2d">("3d")
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["miembros_inferiores"])

  // Selección Anatómica (Inicia limpio y en cero)
  const [selectedRegion, setSelectedRegion] = useState<string>("")
  const [selectedStructure, setSelectedStructure] = useState<string>("")
  const [selectedLaterality, setSelectedLaterality] = useState<LateralityType>("derecha")
  const [hoveredStructure, setHoveredStructure] = useState<string | null>(null)

  // Datos de la Lesión
  const [injuryType, setInjuryType] = useState<string>("Rotura muscular")
  const [customType, setCustomType] = useState<string>("")
  const [severity, setSeverity] = useState<"Leve" | "Moderada" | "Grave">("Grave")
  const [injuryDate, setInjuryDate] = useState<string>(() => new Date().toISOString().split("T")[0])
  const [expectedReturnDate, setExpectedReturnDate] = useState<string>("")
  const [notes, setNotes] = useState<string>("")
  const [saving, setSaving] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Reset total a cero cada vez que se abre el modal
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1)
      setSelectedRegion("")
      setSelectedStructure("")
      setHoveredStructure(null)
      setErrorMsg(null)
      setNotes("")
      setExpectedReturnDate("")
    }
  }, [isOpen])

  const currentEstimation: RecoveryEstimationResult = estimateRecovery({
    injuryType: injuryType === "Otra" ? customType : injuryType,
    structure: selectedStructure,
    severity,
    injuryDate
  })

  useEffect(() => {
    if (currentEstimation.hasEstimation && currentEstimation.estimatedReturnTo && !expectedReturnDate) {
      setExpectedReturnDate(currentEstimation.estimatedReturnTo)
    }
  }, [currentEstimation, expectedReturnDate])

  if (!isOpen) return null

  const toggleCategory = (catId: string) => {
    setExpandedCategories(prev =>
      prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
    )
  }

  const handleSelectMuscle = (item: { name: string; region: string; laterality: LateralityType; view?: "front" | "back" | "both" }) => {
    setSelectedStructure(item.name)
    setSelectedRegion(item.region)
    setSelectedLaterality(item.laterality)
    if (item.view && item.view !== "both" && activeAvatarView !== "dual") {
      setActiveAvatarView(item.view)
    }
  }

  const handleSaveInjury = async () => {
    setErrorMsg(null)
    if (!selectedStructure) {
      setErrorMsg("Por favor selecciona una zona anatómica en el avatar o lista.")
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
        setErrorMsg(res.error || "No se pudo guardar la lesión.")
      }
    } catch (e: any) {
      setErrorMsg(
        e.message?.includes("fetch")
          ? "Error de conexión con el servidor. Si acabas de actualizar o reiniciar la app, por favor recarga la página (F5)."
          : e.message || "Error al registrar la lesión."
      )
    } finally {
      setSaving(false)
    }
  }

  // Buscar el músculo actualmente activo para ubicar el pin en el SVG
  const allMuscles = FOOTBALL_ANATOMY_CATEGORIES.flatMap(c => c.muscles)
  const currentActiveMuscle = selectedStructure ? allMuscles.find(m => m.name === selectedStructure) || null : null

  return (
    <div className="fixed inset-0 z-50 bg-[#090d16]/95 backdrop-blur-xl flex flex-col font-sans select-none overflow-hidden animate-in fade-in duration-200">
      {/* 1. BARRA SUPERIOR: JUGADOR + CONTROLES 3D/2D + PERSPECTIVAS */}
      <header className="h-16 border-b border-slate-800/80 px-6 flex items-center justify-between bg-[#0b101b] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-700 bg-slate-800 shrink-0">
            <Image
              src={player.avatarUrl || "/models/marco_sanchez.png"}
              alt={player.name}
              width={40}
              height={40}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black text-slate-400">
                {String(player.number || "23").startsWith("#") ? player.number : `#${player.number || "23"}`}
              </span>
              <h2 className="font-bold text-sm text-white">{player.name}</h2>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span>{player.position || "Centrocampista"}</span>
              <span className="w-1 h-1 rounded-full bg-slate-600" />
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {player.status || "Disponible"}
              </span>
            </div>
          </div>
        </div>

        {/* Controles Centrales de Perspectiva */}
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5 text-xs font-bold">
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

          <div className="hidden md:flex items-center gap-1 text-xs">
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
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeAvatarView === "dual" ? "bg-red-600 text-white shadow-xs" : "bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
              }`}
            >
              Dual
            </button>
            <button
              type="button"
              onClick={() => setActiveAvatarView("dual")}
              className="p-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-lg text-slate-300 transition-colors cursor-pointer"
              title="Restablecer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          title="Cerrar modal de lesión"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      {/* CUERPO PRINCIPAL: 3 COLUMNAS */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* 2. PANEL IZQUIERDO: ACORDEÓN ANATÓMICO (COL 3) */}
        <aside className="hidden lg:flex lg:col-span-3 border-r border-slate-800/70 bg-[#070b13] flex-col p-4 overflow-y-auto space-y-4">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-black text-slate-400 block mb-0.5">
              1. Selecciona la región
            </span>
            <p className="text-xs text-slate-500">
              Haz clic en el avatar para seleccionar
            </p>
          </div>

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

                  {isExpanded && (
                    <div className="px-2 pb-2 space-y-1 border-t border-slate-800/60 pt-1.5">
                      {cat.muscles.map(m => {
                        const isSelected = selectedStructure === m.name
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => handleSelectMuscle(m)}
                            onMouseEnter={() => setHoveredStructure(m.name)}
                            onMouseLeave={() => setHoveredStructure(null)}
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

          <div className="p-3 rounded-xl border border-slate-800/80 bg-slate-900/30 text-xs text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-300 font-bold text-[11px]">
              <Info className="w-3.5 h-3.5 text-sky-400" />
              <span>Información</span>
            </div>
            <p className="text-[10px] leading-relaxed">
              Selecciona una región en el avatar o usa el selector manual.
            </p>
          </div>
        </aside>

        {/* 3. ESCENARIO CENTRAL: DOBLE AVATAR ANATÓMICO (COL 6) */}
        <main className="lg:col-span-6 flex flex-col bg-gradient-to-b from-[#0a0f19] via-[#070b13] to-[#04060b] relative overflow-hidden">
          <div className="flex-1 flex items-center justify-center p-4 relative">
            <div className="w-full h-full max-w-xl flex items-center justify-around">
              {/* AVATAR FRONTAL */}
              {(activeAvatarView === "dual" || activeAvatarView === "front") && (
                <div className="relative w-48 sm:w-56 h-[380px] sm:h-[430px] flex items-center justify-center group">
                  <Image
                    src="/models/avatar_front_reference_clean.png"
                    alt="Anatomía Frontal"
                    width={280}
                    height={520}
                    priority
                    className="w-full h-full object-contain filter drop-shadow-[0_12px_28px_rgba(0,0,0,0.85)] pointer-events-none"
                  />
                  <div className="absolute top-2 inset-x-0 text-center text-[10px] font-black uppercase text-slate-500 tracking-wider pointer-events-none">
                    Vista Anterior
                  </div>

                  {/* Capa SVG Frontal Interactiva */}
                  <svg viewBox="0 0 255 495" className="absolute inset-0 w-full h-full z-20">
                    {allMuscles.filter(m => m.svg && (m.svg.view === "front" || m.view === "front" || m.view === "both")).map(m => {
                      const isSelected = selectedStructure === m.name
                      const isHovered = hoveredStructure === m.name
                      const svg = m.svg!

                      const fillClass = isSelected
                        ? "fill-red-600/80 stroke-red-400 stroke-2 animate-pulse cursor-pointer"
                        : isHovered
                        ? "fill-red-500/40 stroke-red-400 stroke-1 cursor-pointer"
                        : "fill-transparent hover:fill-red-500/30 transition-colors cursor-pointer"

                      if (svg.type === "circle") {
                        return (
                          <circle
                            key={m.id}
                            cx={svg.cx}
                            cy={svg.cy}
                            r={svg.r}
                            onClick={() => handleSelectMuscle(m)}
                            onMouseEnter={() => setHoveredStructure(m.name)}
                            onMouseLeave={() => setHoveredStructure(null)}
                            className={fillClass}
                          />
                        )
                      }
                      if (svg.type === "polygon") {
                        return (
                          <polygon
                            key={m.id}
                            points={svg.points}
                            onClick={() => handleSelectMuscle(m)}
                            onMouseEnter={() => setHoveredStructure(m.name)}
                            onMouseLeave={() => setHoveredStructure(null)}
                            className={fillClass}
                          />
                        )
                      }
                      return (
                        <rect
                          key={m.id}
                          x={svg.x}
                          y={svg.y}
                          width={svg.w}
                          height={svg.h}
                          rx={4}
                          onClick={() => handleSelectMuscle(m)}
                          onMouseEnter={() => setHoveredStructure(m.name)}
                          onMouseLeave={() => setHoveredStructure(null)}
                          className={fillClass}
                        />
                      )
                    })}
                  </svg>

                  {/* Tooltip flotante si la zona seleccionada es frontal */}
                  {Boolean(selectedStructure && currentActiveMuscle?.svg && (currentActiveMuscle.svg.view === "front" || currentActiveMuscle.view === "front")) && (
                    <div
                      className="absolute bg-slate-900/95 border border-red-500/80 rounded-xl p-2 shadow-2xl z-30 pointer-events-none animate-in fade-in zoom-in-95 duration-150"
                      style={{
                        top: `${(currentActiveMuscle!.svg!.pinY! / 495) * 100}%`,
                        left: `${(currentActiveMuscle!.svg!.pinX! / 255) * 100}%`,
                      }}
                    >
                      <div className="font-bold text-white text-[10px] whitespace-nowrap">
                        {selectedStructure.split("(")[0]}
                      </div>
                      <div className="text-[9px] font-bold text-red-400 flex items-center gap-1 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        <span>{selectedLaterality.toUpperCase()}</span>
                      </div>
                      <div className="text-[8px] text-slate-400 mt-0.5">Haz clic para seleccionar</div>
                    </div>
                  )}
                </div>
              )}

              {/* AVATAR POSTERIOR */}
              {(activeAvatarView === "dual" || activeAvatarView === "back") && (
                <div className="relative w-48 sm:w-56 h-[380px] sm:h-[430px] flex items-center justify-center group">
                  <Image
                    src="/models/avatar_back_unlit.png"
                    alt="Anatomía Posterior"
                    width={280}
                    height={520}
                    priority
                    className="w-full h-full object-contain filter drop-shadow-[0_12px_28px_rgba(0,0,0,0.85)] pointer-events-none"
                  />
                  <div className="absolute top-2 inset-x-0 text-center text-[10px] font-black uppercase text-slate-500 tracking-wider pointer-events-none">
                    Vista Posterior
                  </div>

                  {/* Malla brillante roja especial para isquiotibiales */}
                  {selectedStructure.toLowerCase().includes("isquiotibial") && (
                    <div className="absolute top-[41%] left-[26%] w-[24%] h-[26%] pointer-events-none z-10 animate-pulse">
                      <Image
                        src="/models/hamstring_right_glow.png"
                        alt="Isquiotibiales iluminados"
                        width={120}
                        height={220}
                        className="w-full h-full object-contain filter drop-shadow-[0_0_20px_rgba(239,68,68,1)] drop-shadow-[0_0_35px_rgba(220,38,38,0.9)]"
                      />
                    </div>
                  )}

                  {/* Capa SVG Posterior Interactiva */}
                  <svg viewBox="0 0 255 495" className="absolute inset-0 w-full h-full z-20">
                    {allMuscles.filter(m => m.svg && (m.svg.view === "back" || m.view === "back" || m.view === "both")).map(m => {
                      const isSelected = selectedStructure === m.name
                      const isHovered = hoveredStructure === m.name
                      const svg = m.svg!

                      const fillClass = isSelected
                        ? "fill-red-600/80 stroke-red-400 stroke-2 animate-pulse cursor-pointer"
                        : isHovered
                        ? "fill-red-500/40 stroke-red-400 stroke-1 cursor-pointer"
                        : "fill-transparent hover:fill-red-500/30 transition-colors cursor-pointer"

                      if (svg.type === "circle") {
                        return (
                          <circle
                            key={m.id}
                            cx={svg.cx}
                            cy={svg.cy}
                            r={svg.r}
                            onClick={() => handleSelectMuscle(m)}
                            onMouseEnter={() => setHoveredStructure(m.name)}
                            onMouseLeave={() => setHoveredStructure(null)}
                            className={fillClass}
                          />
                        )
                      }
                      if (svg.type === "polygon") {
                        return (
                          <polygon
                            key={m.id}
                            points={svg.points}
                            onClick={() => handleSelectMuscle(m)}
                            onMouseEnter={() => setHoveredStructure(m.name)}
                            onMouseLeave={() => setHoveredStructure(null)}
                            className={fillClass}
                          />
                        )
                      }
                      return (
                        <rect
                          key={m.id}
                          x={svg.x}
                          y={svg.y}
                          width={svg.w}
                          height={svg.h}
                          rx={4}
                          onClick={() => handleSelectMuscle(m)}
                          onMouseEnter={() => setHoveredStructure(m.name)}
                          onMouseLeave={() => setHoveredStructure(null)}
                          className={fillClass}
                        />
                      )
                    })}
                  </svg>

                  {/* Tooltip flotante si la zona seleccionada es posterior */}
                  {Boolean(selectedStructure && currentActiveMuscle?.svg && (currentActiveMuscle.svg.view === "back" || currentActiveMuscle.view === "back")) && (
                    <div
                      className="absolute bg-slate-900/95 border border-red-500/80 rounded-xl p-2 shadow-2xl z-30 pointer-events-none animate-in fade-in zoom-in-95 duration-150"
                      style={{
                        top: `${(currentActiveMuscle!.svg!.pinY! / 495) * 100}%`,
                        left: `${(currentActiveMuscle!.svg!.pinX! / 255) * 100}%`,
                      }}
                    >
                      <div className="font-bold text-white text-[10px] whitespace-nowrap">
                        {selectedStructure.split("(")[0]}
                      </div>
                      <div className="text-[9px] font-bold text-red-400 flex items-center gap-1 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        <span>{selectedLaterality.toUpperCase()}</span>
                      </div>
                      <div className="text-[8px] text-slate-400 mt-0.5">Haz clic para seleccionar</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Barra de ayuda interactiva */}
          <div className="px-6 py-2 border-t border-slate-800/60 bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-5">
              <span className="flex items-center gap-1.5">
                <MousePointer className="w-3.5 h-3.5 text-slate-300" />
                <span>Haz clic para seleccionar</span>
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

        {/* 5. PANEL DERECHO: WIZARD DE 4 PASOS (COL 3) */}
        <aside className="lg:col-span-3 border-l border-slate-800/70 bg-[#070b13] flex flex-col justify-between p-5 overflow-y-auto">
          <div className="space-y-4">
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
                const isPassed = currentStep > s.step
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
                        isPassed
                          ? "bg-emerald-500 text-white"
                          : isCurrent
                          ? "bg-red-600 text-white ring-2 ring-red-500/50"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {isPassed ? <Check className="w-3.5 h-3.5" /> : s.step}
                    </div>
                    <span className={`text-[9px] font-bold ${isCurrent ? "text-white" : "text-slate-500"}`}>
                      {s.label}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* ZONA SELECCIONADA */}
            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                  Zona seleccionada
                </span>
                <span className="font-black text-sm text-white block mt-0.5">
                  {selectedStructure || "Ninguna zona seleccionada"}
                </span>
                <span className="text-[11px] font-bold text-red-400">
                  {selectedStructure ? selectedLaterality.toUpperCase() : "Haz clic en el avatar para elegir"}
                </span>
              </div>
              <div className="w-10 h-16 relative rounded-lg overflow-hidden border border-red-500/40 bg-black/60 shrink-0">
                <Image
                  src="/models/mini_body_preview.png"
                  alt="Silueta anatómica"
                  width={40}
                  height={64}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            {/* PASO 1: CONFIRMACIÓN DE ZONA */}
            {currentStep === 1 && (
              <div className="space-y-3">
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Región General:</span>
                    <span className="font-bold text-white">{selectedRegion || "Sin seleccionar"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Lateralidad:</span>
                    <div className="flex items-center gap-1">
                      {(["derecha", "izquierda", "bilateral"] as const).map(lat => (
                        <button
                          key={lat}
                          type="button"
                          onClick={() => setSelectedLaterality(lat)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize cursor-pointer transition-colors ${
                            selectedLaterality === lat
                              ? "bg-red-600 text-white"
                              : "bg-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          {lat === "derecha" ? "Der" : lat === "izquierda" ? "Izq" : "Bilateral"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PASO 2: TIPO DE LESIÓN Y ESTIMACIÓN */}
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
                      <option key={t.value} value={t.value} className="bg-slate-900 text-white">
                        {t.value}
                      </option>
                    ))}
                  </select>
                </div>

                {injuryType === "Otra" && (
                  <div>
                    <input
                      type="text"
                      placeholder="Especifica el tipo..."
                      value={customType}
                      onChange={e => setCustomType(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                )}

                {/* Tarjeta con Pronóstico Científico */}
                <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-2.5 text-xs">
                  <div>
                    <div className="font-bold text-white text-xs">{injuryType}</div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {INJURY_TYPES.find(t => t.value === injuryType)?.desc}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] font-bold">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-red-400 uppercase tracking-wider">
                      {severity === "Grave" ? "Impacto alto" : severity === "Moderada" ? "Impacto medio" : "Impacto bajo"}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-[10px] text-slate-400 block mb-0.5">
                      Tiempo de recuperación orientativo
                    </span>
                    <div className="text-base font-black text-white flex items-center gap-1.5">
                      <span>{currentEstimation.rangeLabel || "8 — 12 semanas"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[9px] text-slate-400 pt-1">
                    <ShieldAlert className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>Estimación orientativa basada en FIFA Medical Network y BJSM</span>
                  </div>
                </div>
              </div>
            )}

            {/* PASO 3: GRAVEDAD */}
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

                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Tiempo estimado resultante</span>
                  <div className="text-sm font-black text-white">{currentEstimation.rangeLabel}</div>
                </div>
              </div>
            )}

            {/* PASO 4: DETALLES Y EVOLUCIÓN */}
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

          {/* BOTONES INFERIORES */}
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
                  onClick={() => setCurrentStep(prev => (prev + 1) as any)}
                  className="py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-red-600/30"
                >
                  <span>Siguiente</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={saving}
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
