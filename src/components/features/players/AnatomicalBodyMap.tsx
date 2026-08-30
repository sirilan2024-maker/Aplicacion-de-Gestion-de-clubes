"use client"

import React, { useState } from "react"
import { MapPin, RotateCcw, Check, Sparkles } from "lucide-react"

export type LateralityType = "izquierda" | "derecha" | "bilateral" | "central" | "no_aplica"

export interface AnatomicalSelection {
  bodyRegion: string
  bodyStructure: string
  laterality: LateralityType
  bodyView: "front" | "back"
  displayLabel: string
}

interface AnatomicalBodyMapProps {
  value?: AnatomicalSelection | null
  onChange: (selection: AnatomicalSelection | null) => void
}

interface RegionConfig {
  id: string
  region: string
  structures: string[]
  defaultStructure: string
  view: "front" | "back" | "both"
  allowedLaterality: LateralityType[]
  defaultLaterality: LateralityType
  x: number
  y: number
  w: number
  h: number
  rx?: number
}

const ANATOMICAL_REGIONS: RegionConfig[] = [
  // Cabeza / Cuello
  {
    id: "cabeza",
    region: "Cabeza",
    structures: ["Cabeza", "Cara"],
    defaultStructure: "Cabeza",
    view: "both",
    allowedLaterality: ["central", "izquierda", "derecha", "no_aplica"],
    defaultLaterality: "central",
    x: 90,
    y: 12,
    w: 40,
    h: 42,
    rx: 20
  },
  {
    id: "cuello",
    region: "Cuello",
    structures: ["Cuello"],
    defaultStructure: "Cuello",
    view: "both",
    allowedLaterality: ["central", "izquierda", "derecha", "no_aplica"],
    defaultLaterality: "central",
    x: 100,
    y: 56,
    w: 20,
    h: 16,
    rx: 4
  },

  // Tronco Anterior
  {
    id: "pecho",
    region: "Tronco",
    structures: ["Pecho", "Clavícula", "Costillas"],
    defaultStructure: "Pecho",
    view: "front",
    allowedLaterality: ["central", "izquierda", "derecha", "bilateral"],
    defaultLaterality: "central",
    x: 78,
    y: 76,
    w: 64,
    h: 36,
    rx: 6
  },
  {
    id: "abdomen",
    region: "Tronco",
    structures: ["Abdomen", "Costillas"],
    defaultStructure: "Abdomen",
    view: "front",
    allowedLaterality: ["central", "izquierda", "derecha"],
    defaultLaterality: "central",
    x: 82,
    y: 114,
    w: 56,
    h: 34,
    rx: 6
  },

  // Tronco Posterior
  {
    id: "espalda",
    region: "Tronco",
    structures: ["Espalda"],
    defaultStructure: "Espalda",
    view: "back",
    allowedLaterality: ["central", "izquierda", "derecha", "bilateral"],
    defaultLaterality: "central",
    x: 78,
    y: 76,
    w: 64,
    h: 40,
    rx: 6
  },
  {
    id: "lumbar",
    region: "Tronco",
    structures: ["Zona lumbar"],
    defaultStructure: "Zona lumbar",
    view: "back",
    allowedLaterality: ["central", "izquierda", "derecha"],
    defaultLaterality: "central",
    x: 82,
    y: 118,
    w: 56,
    h: 30,
    rx: 6
  },

  // Hombros
  {
    id: "hombro_izq",
    region: "Hombro",
    structures: ["Hombro", "Clavícula"],
    defaultStructure: "Hombro",
    view: "both",
    allowedLaterality: ["izquierda"],
    defaultLaterality: "izquierda",
    x: 48,
    y: 74,
    w: 28,
    h: 26,
    rx: 8
  },
  {
    id: "hombro_der",
    region: "Hombro",
    structures: ["Hombro", "Clavícula"],
    defaultStructure: "Hombro",
    view: "both",
    allowedLaterality: ["derecha"],
    defaultLaterality: "derecha",
    x: 144,
    y: 74,
    w: 28,
    h: 26,
    rx: 8
  },

  // Cadera / Pelvis / Aductores (Frontal)
  {
    id: "cadera_izq_ant",
    region: "Cadera / Pelvis",
    structures: ["Cadera", "Ingle", "Aductores"],
    defaultStructure: "Aductores",
    view: "front",
    allowedLaterality: ["izquierda"],
    defaultLaterality: "izquierda",
    x: 74,
    y: 150,
    w: 32,
    h: 28,
    rx: 6
  },
  {
    id: "cadera_der_ant",
    region: "Cadera / Pelvis",
    structures: ["Cadera", "Ingle", "Aductores"],
    defaultStructure: "Aductores",
    view: "front",
    allowedLaterality: ["derecha"],
    defaultLaterality: "derecha",
    x: 114,
    y: 150,
    w: 32,
    h: 28,
    rx: 6
  },

  // Muslo Anterior
  {
    id: "muslo_izq_ant",
    region: "Muslo anterior",
    structures: ["Cuádriceps", "Recto femoral", "Vasto interno", "Vasto externo"],
    defaultStructure: "Cuádriceps",
    view: "front",
    allowedLaterality: ["izquierda"],
    defaultLaterality: "izquierda",
    x: 78,
    y: 180,
    w: 28,
    h: 58,
    rx: 8
  },
  {
    id: "muslo_der_ant",
    region: "Muslo anterior",
    structures: ["Cuádriceps", "Recto femoral", "Vasto interno", "Vasto externo"],
    defaultStructure: "Cuádriceps",
    view: "front",
    allowedLaterality: ["derecha"],
    defaultLaterality: "derecha",
    x: 114,
    y: 180,
    w: 28,
    h: 58,
    rx: 8
  },

  // Muslo Posterior (Dorsal)
  {
    id: "muslo_izq_post",
    region: "Muslo posterior",
    structures: ["Isquiotibiales", "Bíceps femoral", "Semitendinoso", "Semimembranoso"],
    defaultStructure: "Isquiotibiales",
    view: "back",
    allowedLaterality: ["izquierda"],
    defaultLaterality: "izquierda",
    x: 78,
    y: 180,
    w: 28,
    h: 58,
    rx: 8
  },
  {
    id: "muslo_der_post",
    region: "Muslo posterior",
    structures: ["Isquiotibiales", "Bíceps femoral", "Semitendinoso", "Semimembranoso"],
    defaultStructure: "Isquiotibiales",
    view: "back",
    allowedLaterality: ["derecha"],
    defaultLaterality: "derecha",
    x: 114,
    y: 180,
    w: 28,
    h: 58,
    rx: 8
  },

  // Rodilla (Frontal)
  {
    id: "rodilla_izq",
    region: "Rodilla",
    structures: ["Rodilla", "Rótula", "Tendón rotuliano"],
    defaultStructure: "Rodilla",
    view: "front",
    allowedLaterality: ["izquierda"],
    defaultLaterality: "izquierda",
    x: 80,
    y: 240,
    w: 24,
    h: 22,
    rx: 6
  },
  {
    id: "rodilla_der",
    region: "Rodilla",
    structures: ["Rodilla", "Rótula", "Tendón rotuliano"],
    defaultStructure: "Rodilla",
    view: "front",
    allowedLaterality: ["derecha"],
    defaultLaterality: "derecha",
    x: 116,
    y: 240,
    w: 24,
    h: 22,
    rx: 6
  },

  // Pierna / Gemelos / Sóleo (Posterior)
  {
    id: "pierna_izq_post",
    region: "Pierna",
    structures: ["Gemelo interno", "Gemelo externo", "Sóleo"],
    defaultStructure: "Sóleo",
    view: "back",
    allowedLaterality: ["izquierda"],
    defaultLaterality: "izquierda",
    x: 78,
    y: 264,
    w: 26,
    h: 54,
    rx: 8
  },
  {
    id: "pierna_der_post",
    region: "Pierna",
    structures: ["Gemelo interno", "Gemelo externo", "Sóleo"],
    defaultStructure: "Sóleo",
    view: "back",
    allowedLaterality: ["derecha"],
    defaultLaterality: "derecha",
    x: 116,
    y: 264,
    w: 26,
    h: 54,
    rx: 8
  },

  // Pierna Anterior (Tibial)
  {
    id: "pierna_izq_ant",
    region: "Pierna",
    structures: ["Tibial anterior"],
    defaultStructure: "Tibial anterior",
    view: "front",
    allowedLaterality: ["izquierda"],
    defaultLaterality: "izquierda",
    x: 78,
    y: 264,
    w: 26,
    h: 54,
    rx: 8
  },
  {
    id: "pierna_der_ant",
    region: "Pierna",
    structures: ["Tibial anterior"],
    defaultStructure: "Tibial anterior",
    view: "front",
    allowedLaterality: ["derecha"],
    defaultLaterality: "derecha",
    x: 116,
    y: 264,
    w: 26,
    h: 54,
    rx: 8
  },

  // Tobillo
  {
    id: "tobillo_izq",
    region: "Tobillo",
    structures: ["Tobillo externo", "Tobillo interno", "Tendón de Aquiles"],
    defaultStructure: "Tobillo externo",
    view: "both",
    allowedLaterality: ["izquierda"],
    defaultLaterality: "izquierda",
    x: 80,
    y: 320,
    w: 22,
    h: 18,
    rx: 5
  },
  {
    id: "tobillo_der",
    region: "Tobillo",
    structures: ["Tobillo externo", "Tobillo interno", "Tendón de Aquiles"],
    defaultStructure: "Tobillo externo",
    view: "both",
    allowedLaterality: ["derecha"],
    defaultLaterality: "derecha",
    x: 118,
    y: 320,
    w: 22,
    h: 18,
    rx: 5
  },

  // Pie
  {
    id: "pie_izq",
    region: "Pie",
    structures: ["Empeine", "Talón", "Planta", "Dedos"],
    defaultStructure: "Empeine",
    view: "both",
    allowedLaterality: ["izquierda"],
    defaultLaterality: "izquierda",
    x: 74,
    y: 340,
    w: 28,
    h: 20,
    rx: 6
  },
  {
    id: "pie_der",
    region: "Pie",
    structures: ["Empeine", "Talón", "Planta", "Dedos"],
    defaultStructure: "Empeine",
    view: "both",
    allowedLaterality: ["derecha"],
    defaultLaterality: "derecha",
    x: 118,
    y: 340,
    w: 28,
    h: 20,
    rx: 6
  }
]

export function buildDisplayLabel(structure: string, laterality: LateralityType): string {
  if (laterality === "izquierda") {
    return `${structure} izquierdo/a`
  }
  if (laterality === "derecha") {
    return `${structure} derecho/a`
  }
  if (laterality === "bilateral") {
    return `${structure} bilateral`
  }
  if (laterality === "central") {
    return `${structure} (central)`
  }
  return structure
}

export function AnatomicalBodyMap({ value, onChange }: AnatomicalBodyMapProps) {
  const [activeView, setActiveView] = useState<"front" | "back">("front")
  const [hoveredRegion, setHoveredRegion] = useState<RegionConfig | null>(null)

  const visibleRegions = ANATOMICAL_REGIONS.filter(
    r => r.view === "both" || r.view === activeView
  )

  const handleRegionClick = (reg: RegionConfig) => {
    const defaultLat = reg.defaultLaterality
    const struct = reg.defaultStructure
    const label = buildDisplayLabel(struct, defaultLat)

    onChange({
      bodyRegion: reg.region,
      bodyStructure: struct,
      laterality: defaultLat,
      bodyView: activeView,
      displayLabel: label
    })
  }

  const handleStructureChange = (structure: string) => {
    if (!value) return
    const newLabel = buildDisplayLabel(structure, value.laterality)
    onChange({
      ...value,
      bodyStructure: structure,
      displayLabel: newLabel
    })
  }

  const handleLateralityChange = (lat: LateralityType) => {
    if (!value) return
    const newLabel = buildDisplayLabel(value.bodyStructure, lat)
    onChange({
      ...value,
      laterality: lat,
      displayLabel: newLabel
    })
  }

  // Encuentra la configuración de la región actual
  const currentRegionConfig = ANATOMICAL_REGIONS.find(
    r => r.region === value?.bodyRegion && (r.view === "both" || r.view === activeView)
  )

  return (
    <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-4">
      {/* Controles de vista */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-200/80 pb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-red-500 shrink-0" />
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
            Localización Anatómica Interactiva
          </span>
        </div>

        <div className="inline-flex p-0.5 bg-slate-200 rounded-xl w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveView("front")}
            className={`flex-1 sm:flex-none px-3 py-1.5 sm:py-1 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
              activeView === "front"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Vista Anterior (Frontal)
          </button>
          <button
            type="button"
            onClick={() => setActiveView("back")}
            className={`flex-1 sm:flex-none px-3 py-1.5 sm:py-1 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
              activeView === "back"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Vista Posterior (Dorsal)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        {/* Silueta Anatómica SVG */}
        <div className="md:col-span-5 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 p-3 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 mb-2">
            {activeView === "front" ? "Vista Anterior (Frontal)" : "Vista Posterior (Dorsal)"}
          </span>

          <svg
            viewBox="0 0 220 375"
            className="w-44 h-72 select-none"
            aria-label="Silueta anatómica deportiva"
          >
            {/* Silueta base anatómica */}
            <g opacity="0.16" fill="#64748b" stroke="#475569" strokeWidth="1.5">
              <circle cx="110" cy="33" r="20" />
              <rect x="102" y="53" width="16" height="15" rx="3" />
              <path d="M 68,68 L 152,68 L 140,165 L 80,165 Z" />
              <path d="M 68,72 L 42,145 L 32,205 L 45,205 L 58,150 L 75,85 Z" />
              <path d="M 152,72 L 178,145 L 188,205 L 175,205 L 162,150 L 145,85 Z" />
              <path d="M 80,165 L 105,165 L 102,345 L 82,345 L 75,230 Z" />
              <path d="M 140,165 L 115,165 L 118,345 L 138,345 L 145,230 Z" />
            </g>

            {/* Zonas anatómicas clickables */}
            {visibleRegions.map(reg => {
              const isSelected =
                value?.bodyRegion === reg.region &&
                (reg.allowedLaterality.includes(value?.laterality || ("" as any)) ||
                  reg.defaultLaterality === value?.laterality)
              const isHovered = hoveredRegion?.id === reg.id

              return (
                <g key={reg.id}>
                  <rect
                    x={reg.x}
                    y={reg.y}
                    width={reg.w}
                    height={reg.h}
                    rx={reg.rx || 4}
                    className={`cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? "fill-red-500 stroke-red-700 stroke-2 opacity-95 animate-pulse"
                        : isHovered
                        ? "fill-red-200 stroke-red-400 stroke-1.5 opacity-85"
                        : "fill-blue-500/20 stroke-blue-400/50 stroke-1 hover:fill-red-200/60"
                    }`}
                    onMouseEnter={() => setHoveredRegion(reg)}
                    onMouseLeave={() => setHoveredRegion(null)}
                    onClick={() => handleRegionClick(reg)}
                  />
                  {isSelected && (
                    <circle
                      cx={reg.x + reg.w / 2}
                      cy={reg.y + reg.h / 2}
                      r="4"
                      fill="#ffffff"
                      className="pointer-events-none"
                    />
                  )}
                </g>
              )
            })}
          </svg>

          <div className="w-full flex justify-between px-3 text-[9px] font-bold text-slate-400 uppercase mt-1">
            <span>{activeView === "front" ? "← Lado Izq" : "← Lado Der"}</span>
            <span>{activeView === "front" ? "Lado Der →" : "Lado Izq →"}</span>
          </div>
        </div>

        {/* Panel de Estructura Anatómica y Lateralidad */}
        <div className="md:col-span-7 space-y-4">
          {/* Zona Seleccionada */}
          <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Estructura Seleccionada
              </span>
              {value && (
                <button
                  type="button"
                  onClick={() => onChange(null)}
                  className="text-[10px] font-bold text-red-600 hover:underline cursor-pointer"
                >
                  Limpiar selección
                </button>
              )}
            </div>

            {value ? (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                <span className="text-sm font-black text-slate-900">
                  {value.displayLabel}
                </span>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                Haz clic en el mapa corporal para seleccionar la zona afectada.
              </p>
            )}
          </div>

          {/* Selector de Lateralidad */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Lateralidad
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {(
                [
                  { id: "izquierda", label: "Izquierda" },
                  { id: "derecha", label: "Derecha" },
                  { id: "bilateral", label: "Bilateral" },
                  { id: "central", label: "Central" },
                  { id: "no_aplica", label: "No aplica" }
                ] as const
              ).map(lat => {
                const isSelected = value?.laterality === lat.id
                return (
                  <button
                    key={lat.id}
                    type="button"
                    onClick={() => handleLateralityChange(lat.id)}
                    className={`py-2 px-1 text-center rounded-xl text-[11px] font-bold border transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {lat.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Refinamiento de Estructura Concreta */}
          {value && currentRegionConfig && (
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Estructura Específica ({currentRegionConfig.region})
              </label>
              <div className="flex flex-wrap gap-1.5">
                {currentRegionConfig.structures.map(struct => {
                  const isCurrent = value.bodyStructure === struct
                  return (
                    <button
                      key={struct}
                      type="button"
                      onClick={() => handleStructureChange(struct)}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        isCurrent
                          ? "bg-red-600 text-white border-red-700 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {isCurrent && <Check className="w-3 h-3" />}
                      {struct}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Accesos rápidos frecuentes de fútbol */}
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
              Patologías Comunes en Fútbol:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "Isquiotibiales Der.", region: "Muslo posterior", struct: "Isquiotibiales", lat: "derecha" as const, view: "back" as const },
                { label: "Isquiotibiales Izq.", region: "Muslo posterior", struct: "Isquiotibiales", lat: "izquierda" as const, view: "back" as const },
                { label: "Cuádriceps / Recto Femoral", region: "Muslo anterior", struct: "Recto femoral", lat: "derecha" as const, view: "front" as const },
                { label: "Sóleo / Gemelo", region: "Pierna", struct: "Sóleo", lat: "derecha" as const, view: "back" as const },
                { label: "Aductores / Ingle", region: "Cadera / Pelvis", struct: "Aductores", lat: "derecha" as const, view: "front" as const },
                { label: "Ligamento Tobillo", region: "Tobillo", struct: "Tobillo externo", lat: "derecha" as const, view: "front" as const },
                { label: "Tendón Rotuliano", region: "Rodilla", struct: "Tendón rotuliano", lat: "derecha" as const, view: "front" as const }
              ].map(f => (
                <button
                  key={f.label}
                  type="button"
                  onClick={() => {
                    setActiveView(f.view)
                    onChange({
                      bodyRegion: f.region,
                      bodyStructure: f.struct,
                      laterality: f.lat,
                      bodyView: f.view,
                      displayLabel: buildDisplayLabel(f.struct, f.lat)
                    })
                  }}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
