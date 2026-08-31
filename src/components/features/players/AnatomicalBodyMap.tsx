"use client"

import React, { useState } from "react"
import Image from "next/image"
import dynamic from "next/dynamic"
import {
  MapPin,
  Check,
  Box,
  Layout,
  AlertTriangle,
  Loader2,
  ListFilter
} from "lucide-react"
import type { LateralityType, AnatomicalPieceData } from "./AnatomicalMannequin3D"

// Carga diferida / lazy del componente Three.js para aislamiento de SSR
const DynamicMannequin3D = dynamic(
  () => import("./AnatomicalMannequin3D").then(mod => mod.AnatomicalMannequin3D),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-80 sm:h-96 bg-slate-900 rounded-2xl flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
        <span className="text-xs font-semibold">Cargando visor 3D anatómico...</span>
      </div>
    )
  }
)

export type { LateralityType }

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

// Catálogo completo de regiones anatómicas (usado para el mapa 2D y la selección accesible)
export const ANATOMICAL_REGIONS: RegionConfig[] = [
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
    structures: ["Hombro", "Deltoides", "Articulación acromioclavicular"],
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
    structures: ["Hombro", "Deltoides", "Articulación acromioclavicular"],
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

  // Brazos (Bíceps / Tríceps)
  {
    id: "brazo_izq",
    region: "Brazo",
    structures: ["Bíceps", "Tríceps"],
    defaultStructure: "Bíceps",
    view: "both",
    allowedLaterality: ["izquierda"],
    defaultLaterality: "izquierda",
    x: 36,
    y: 104,
    w: 22,
    h: 36,
    rx: 6
  },
  {
    id: "brazo_der",
    region: "Brazo",
    structures: ["Bíceps", "Tríceps"],
    defaultStructure: "Bíceps",
    view: "both",
    allowedLaterality: ["derecha"],
    defaultLaterality: "derecha",
    x: 162,
    y: 104,
    w: 22,
    h: 36,
    rx: 6
  },

  // Codos
  {
    id: "codo_izq",
    region: "Codo",
    structures: ["Codo", "Epicóndilo", "Articulación"],
    defaultStructure: "Codo",
    view: "both",
    allowedLaterality: ["izquierda"],
    defaultLaterality: "izquierda",
    x: 30,
    y: 142,
    w: 20,
    h: 18,
    rx: 5
  },
  {
    id: "codo_der",
    region: "Codo",
    structures: ["Codo", "Epicóndilo", "Articulación"],
    defaultStructure: "Codo",
    view: "both",
    allowedLaterality: ["derecha"],
    defaultLaterality: "derecha",
    x: 170,
    y: 142,
    w: 20,
    h: 18,
    rx: 5
  },

  // Antebrazos
  {
    id: "antebrazo_izq",
    region: "Antebrazo",
    structures: ["Musculatura flexora", "Musculatura extensora", "Radio", "Cúbito"],
    defaultStructure: "Musculatura flexora",
    view: "both",
    allowedLaterality: ["izquierda"],
    defaultLaterality: "izquierda",
    x: 24,
    y: 162,
    w: 20,
    h: 36,
    rx: 6
  },
  {
    id: "antebrazo_der",
    region: "Antebrazo",
    structures: ["Musculatura flexora", "Musculatura extensora", "Radio", "Cúbito"],
    defaultStructure: "Musculatura flexora",
    view: "both",
    allowedLaterality: ["derecha"],
    defaultLaterality: "derecha",
    x: 176,
    y: 162,
    w: 20,
    h: 36,
    rx: 6
  },

  // Muñecas
  {
    id: "muneca_izq",
    region: "Muñeca",
    structures: ["Muñeca", "Escafoides"],
    defaultStructure: "Muñeca",
    view: "both",
    allowedLaterality: ["izquierda"],
    defaultLaterality: "izquierda",
    x: 20,
    y: 200,
    w: 18,
    h: 12,
    rx: 4
  },
  {
    id: "muneca_der",
    region: "Muñeca",
    structures: ["Muñeca", "Escafoides"],
    defaultStructure: "Muñeca",
    view: "both",
    allowedLaterality: ["derecha"],
    defaultLaterality: "derecha",
    x: 182,
    y: 200,
    w: 18,
    h: 12,
    rx: 4
  },

  // Manos / Dedos
  {
    id: "mano_izq",
    region: "Mano",
    structures: ["Mano", "Metacarpos", "Dedos"],
    defaultStructure: "Mano",
    view: "both",
    allowedLaterality: ["izquierda"],
    defaultLaterality: "izquierda",
    x: 16,
    y: 214,
    w: 20,
    h: 22,
    rx: 5
  },
  {
    id: "mano_der",
    region: "Mano",
    structures: ["Mano", "Metacarpos", "Dedos"],
    defaultStructure: "Mano",
    view: "both",
    allowedLaterality: ["derecha"],
    defaultLaterality: "derecha",
    x: 184,
    y: 214,
    w: 20,
    h: 22,
    rx: 5
  },

  // Cadera / Pelvis / Aductores (Frontal)
  {
    id: "cadera_izq_ant",
    region: "Cadera / Pelvis",
    structures: [
      "Aductor largo (medio)",
      "Aductor mayor",
      "Pectíneo",
      "Grácil (Recto interno)",
      "Psoas ilíaco",
      "Tensor de la fascia lata",
      "Aductores",
      "Cadera",
      "Ingle"
    ],
    defaultStructure: "Aductor largo (medio)",
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
    structures: [
      "Aductor largo (medio)",
      "Aductor mayor",
      "Pectíneo",
      "Grácil (Recto interno)",
      "Psoas ilíaco",
      "Tensor de la fascia lata",
      "Aductores",
      "Cadera",
      "Ingle"
    ],
    defaultStructure: "Aductor largo (medio)",
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
    structures: [
      "Recto anterior (cuádriceps)",
      "Vasto lateral (cuádriceps)",
      "Vasto medial (cuádriceps)",
      "Sartorio",
      "Cuádriceps",
      "Recto femoral"
    ],
    defaultStructure: "Recto anterior (cuádriceps)",
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
    structures: [
      "Recto anterior (cuádriceps)",
      "Vasto lateral (cuádriceps)",
      "Vasto medial (cuádriceps)",
      "Sartorio",
      "Cuádriceps",
      "Recto femoral"
    ],
    defaultStructure: "Recto anterior (cuádriceps)",
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
    structures: [
      "Bíceps femoral (Cabeza larga)",
      "Bíceps femoral (Cabeza corta)",
      "Semitendinoso",
      "Semimembranoso",
      "Isquiotibiales",
      "Bíceps femoral"
    ],
    defaultStructure: "Bíceps femoral (Cabeza larga)",
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
    structures: [
      "Bíceps femoral (Cabeza larga)",
      "Bíceps femoral (Cabeza corta)",
      "Semitendinoso",
      "Semimembranoso",
      "Isquiotibiales",
      "Bíceps femoral"
    ],
    defaultStructure: "Bíceps femoral (Cabeza larga)",
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
    structures: ["Gemelo", "Sóleo", "Tibial anterior"],
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
    structures: ["Gemelo", "Sóleo", "Tibial anterior"],
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
    structures: ["Tibial anterior", "Gemelo", "Sóleo"],
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
    structures: ["Tibial anterior", "Gemelo", "Sóleo"],
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

export const QUICK_REGIONS = [
  { id: "cabeza", label: "Cabeza", thumb: "/models/thumbnails/cabeza.png", region: "Cabeza", structure: "Cabeza", lat: "central" as LateralityType, view: "front" as const },
  { id: "cuello", label: "Cuello", thumb: "/models/thumbnails/cuello.png", region: "Cuello", structure: "Cuello", lat: "central" as LateralityType, view: "front" as const },
  { id: "hombro", label: "Hombro", thumb: "/models/thumbnails/hombro.png", region: "Hombro", structure: "Hombro", lat: "derecha" as LateralityType, view: "front" as const },
  { id: "brazo", label: "Brazo", thumb: "/models/thumbnails/brazo.png", region: "Brazo", structure: "Bíceps", lat: "derecha" as LateralityType, view: "front" as const },
  { id: "codo", label: "Codo", thumb: "/models/thumbnails/codo.png", region: "Codo", structure: "Codo", lat: "derecha" as LateralityType, view: "front" as const },
  { id: "antebrazo", label: "Antebrazo", thumb: "/models/thumbnails/antebrazo.png", region: "Antebrazo", structure: "Musculatura flexora", lat: "derecha" as LateralityType, view: "front" as const },
  { id: "muneca", label: "Muñeca", thumb: "/models/thumbnails/muneca.png", region: "Muñeca", structure: "Muñeca", lat: "derecha" as LateralityType, view: "front" as const },
  { id: "mano", label: "Mano", thumb: "/models/thumbnails/mano.png", region: "Mano", structure: "Mano", lat: "derecha" as LateralityType, view: "front" as const },
  { id: "cadera", label: "Cadera", thumb: "/models/thumbnails/cadera.png", region: "Cadera / Pelvis", structure: "Cadera", lat: "derecha" as LateralityType, view: "front" as const },
  { id: "muslo_post", label: "Muslo post.", thumb: "/models/thumbnails/muslo_post.png", region: "Muslo posterior", structure: "Isquiotibiales", lat: "derecha" as LateralityType, view: "back" as const },
  { id: "rodilla", label: "Rodilla", thumb: "/models/thumbnails/rodilla.png", region: "Rodilla", structure: "Rodilla", lat: "derecha" as LateralityType, view: "front" as const },
  { id: "pierna", label: "Pierna", thumb: "/models/thumbnails/pierna.png", region: "Pierna", structure: "Gemelo", lat: "derecha" as LateralityType, view: "back" as const },
  { id: "tobillo", label: "Tobillo", thumb: "/models/thumbnails/tobillo.png", region: "Tobillo", structure: "Tobillo externo", lat: "derecha" as LateralityType, view: "front" as const },
  { id: "pie_tarso", label: "Pie (tarso)", thumb: "/models/thumbnails/pie_tarso.png", region: "Pie", structure: "Talón", lat: "derecha" as LateralityType, view: "back" as const },
  { id: "pie_meta", label: "Pie (metatarso)", thumb: "/models/thumbnails/pie_meta.png", region: "Pie", structure: "Empeine", lat: "derecha" as LateralityType, view: "front" as const },
  { id: "dedos", label: "Dedos", thumb: "/models/thumbnails/dedos.png", region: "Pie", structure: "Dedos", lat: "derecha" as LateralityType, view: "front" as const },
]

export function AnatomicalBodyMap({ value, onChange }: AnatomicalBodyMapProps) {
  // Modo de visualización: 3D por defecto, con opción 2D
  const [viewMode, setViewMode] = useState<"3d" | "2d">("3d")
  const [activeView2D, setActiveView2D] = useState<"front" | "back">("front")
  const [hoveredRegion2D, setHoveredRegion2D] = useState<RegionConfig | null>(null)
  const [webGlError, setWebGlError] = useState<string | null>(null)
  const [showAccessibleSelector, setShowAccessibleSelector] = useState<boolean>(false)

  // Manejador de selección desde el maniquí 3D
  const handle3DSelect = (piece: AnatomicalPieceData) => {
    const label = buildDisplayLabel(piece.defaultStructure, piece.laterality)
    onChange({
      bodyRegion: piece.region,
      bodyStructure: piece.defaultStructure,
      laterality: piece.laterality,
      bodyView: "front",
      displayLabel: label
    })
  }

  // Manejador de selección en el mapa 2D
  const handle2DRegionClick = (reg: RegionConfig) => {
    const defaultLat = reg.defaultLaterality
    const struct = reg.defaultStructure
    const label = buildDisplayLabel(struct, defaultLat)

    onChange({
      bodyRegion: reg.region,
      bodyStructure: struct,
      laterality: defaultLat,
      bodyView: activeView2D,
      displayLabel: label
    })
  }

  // Cambio de estructura anatómica de nivel 2
  const handleStructureChange = (structure: string) => {
    if (!value) return
    const newLabel = buildDisplayLabel(structure, value.laterality)
    onChange({
      ...value,
      bodyStructure: structure,
      displayLabel: newLabel
    })
  }

  // Cambio de lateralidad
  const handleLateralityChange = (lat: LateralityType) => {
    if (!value) return
    const newLabel = buildDisplayLabel(value.bodyStructure, lat)
    onChange({
      ...value,
      laterality: lat,
      displayLabel: newLabel
    })
  }

  // Encuentra la configuración de la región actual para mostrar sus estructuras hijas
  const currentRegionConfig = ANATOMICAL_REGIONS.find(
    r => r.region.toLowerCase() === value?.bodyRegion?.toLowerCase()
  )

  const visibleRegions2D = ANATOMICAL_REGIONS.filter(
    r => r.view === "both" || r.view === activeView2D
  )

  return (
    <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3 sm:p-4 space-y-4">
      {/* Barra superior de controles: Modo 3D / 2D y Estado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-200/80 pb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-red-500 shrink-0" />
          <div>
            <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
              Localizador Anatómico Profesional
            </span>
            <span className="hidden sm:inline text-[11px] text-slate-400 ml-2">
              (Nivel 1: Región 3D → Nivel 2: Estructura)
            </span>
          </div>
        </div>

        {/* Conmutador de modo 3D / 2D */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <div className="inline-flex p-0.5 bg-slate-200 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode("3d")}
              className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                viewMode === "3d"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>Avatar 3D</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("2d")}
              className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                viewMode === "2d"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layout className="w-3.5 h-3.5" />
              <span>Plano 2D</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowAccessibleSelector(!showAccessibleSelector)}
            className={`p-1.5 rounded-xl border text-xs transition-colors cursor-pointer ${
              showAccessibleSelector
                ? "bg-blue-50 border-blue-300 text-blue-700"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
            }`}
            title="Abrir selector manual accesible"
          >
            <ListFilter className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Alerta de fallback en caso de error de WebGL */}
      {webGlError && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            El navegador no pudo inicializar aceleración WebGL. Se ha activado automáticamente el <strong>Mapa Anatómico 2D</strong>.
          </span>
        </div>
      )}

      {/* Selector Manual Accesible (Navegación por teclado / sin ratón) */}
      {showAccessibleSelector && (
        <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl space-y-3 animate-in fade-in duration-200 text-xs">
          <div className="flex items-center justify-between font-bold text-blue-900">
            <span>Selector Manual Accesible</span>
            <button
              type="button"
              onClick={() => setShowAccessibleSelector(false)}
              className="text-blue-600 hover:underline text-[11px]"
            >
              Cerrar
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-blue-800 uppercase mb-1">
                Región Anatómica
              </label>
              <select
                value={value?.bodyRegion || ""}
                onChange={e => {
                  const regName = e.target.value
                  const reg = ANATOMICAL_REGIONS.find(r => r.region === regName)
                  if (reg) {
                    handle2DRegionClick(reg)
                  }
                }}
                className="w-full border border-blue-200 rounded-lg p-2 bg-white text-slate-900 text-xs font-semibold"
              >
                <option value="">-- Seleccionar Región --</option>
                {Array.from(new Set(ANATOMICAL_REGIONS.map(r => r.region))).map(reg => (
                  <option key={reg} value={reg}>
                    {reg}
                  </option>
                ))}
              </select>
            </div>

            {currentRegionConfig && (
              <div>
                <label className="block text-[11px] font-bold text-blue-800 uppercase mb-1">
                  Estructura Específica
                </label>
                <select
                  value={value?.bodyStructure || ""}
                  onChange={e => handleStructureChange(e.target.value)}
                  className="w-full border border-blue-200 rounded-lg p-2 bg-white text-slate-900 text-xs font-semibold"
                >
                  {currentRegionConfig.structures.map(struct => (
                    <option key={struct} value={struct}>
                      {struct}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CUERPO PRINCIPAL: VISOR (3D O 2D) + PANEL DE CONFIGURACIÓN */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5 items-start">
        {/* COLUMNA VISOR: 3D O 2D */}
        <div className="md:col-span-6 lg:col-span-7 flex flex-col items-center justify-center">
          {viewMode === "3d" && !webGlError ? (
            <div className="w-full">
              <DynamicMannequin3D
                selectedRegionId={value?.bodyRegion}
                selectedLaterality={value?.laterality}
                onSelectPiece={handle3DSelect}
                onError={err => {
                  setWebGlError(err.message)
                  setViewMode("2d")
                }}
              />
            </div>
          ) : (
            /* MAPA 2D (ESQUEMÁTICO DE SEGURIDAD / FALLBACK) */
            <div className="w-full flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 p-3 shadow-xs">
              <div className="w-full flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  {activeView2D === "front" ? "Vista Anterior (Frontal)" : "Vista Posterior (Dorsal)"}
                </span>
                <div className="inline-flex p-0.5 bg-slate-100 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveView2D("front")}
                    className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                      activeView2D === "front" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
                    }`}
                  >
                    Frontal
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveView2D("back")}
                    className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                      activeView2D === "back" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
                    }`}
                  >
                    Dorsal
                  </button>
                </div>
              </div>

              <svg
                viewBox="0 0 220 375"
                className="w-44 h-72 select-none"
                aria-label="Silueta anatómica deportiva 2D"
              >
                {/* Silueta base anatómica */}
                <g opacity="0.16" fill="#64748b" stroke="#475569" strokeWidth="1.5">
                  <circle cx="110" cy="33" r="20" />
                  <rect x="102" y="53" width="16" height="15" rx="3" />
                  <path d="M 68,68 L 152,68 L 140,165 L 80,165 Z" />
                  <path d="M 68,72 L 30,145 L 20,205 L 35,205 L 48,150 L 75,85 Z" />
                  <path d="M 152,72 L 190,145 L 200,205 L 185,205 L 172,150 L 145,85 Z" />
                  <path d="M 80,165 L 105,165 L 102,345 L 82,345 L 75,230 Z" />
                  <path d="M 140,165 L 115,165 L 118,345 L 138,345 L 145,230 Z" />
                </g>

                {/* Zonas anatómicas clickables */}
                {visibleRegions2D.map(reg => {
                  const isSelected =
                    value?.bodyRegion === reg.region &&
                    (reg.allowedLaterality.includes(value?.laterality || ("" as any)) ||
                      reg.defaultLaterality === value?.laterality)
                  const isHovered = hoveredRegion2D?.id === reg.id

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
                        onMouseEnter={() => setHoveredRegion2D(reg)}
                        onMouseLeave={() => setHoveredRegion2D(null)}
                        onClick={() => handle2DRegionClick(reg)}
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
                <span>{activeView2D === "front" ? "← Lado Izq" : "← Lado Der"}</span>
                <span>{activeView2D === "front" ? "Lado Der →" : "Lado Izq →"}</span>
              </div>
            </div>
          )}

          {/* Carrusel de Selección Rápida por Región (Idéntico a la referencia médica) */}
          <div className="w-full mt-3 p-2.5 bg-slate-900 rounded-2xl border border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[11px] font-black uppercase text-slate-300 tracking-wide">
                Selección rápida por región <span className="text-slate-500 font-normal text-[10px] lowercase">(clic para ir)</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-slate-700">
              {QUICK_REGIONS.map(qr => {
                const isActive = value?.bodyRegion?.toLowerCase() === qr.region.toLowerCase()
                return (
                  <button
                    key={qr.id}
                    type="button"
                    onClick={() => {
                      const label = buildDisplayLabel(qr.structure, qr.lat)
                      onChange({
                        bodyRegion: qr.region,
                        bodyStructure: qr.structure,
                        laterality: qr.lat,
                        bodyView: qr.view,
                        displayLabel: label
                      })
                    }}
                    className={`flex flex-col items-center gap-1 p-1 rounded-xl border transition-all shrink-0 cursor-pointer min-w-[50px] ${
                      isActive
                        ? "bg-red-950/80 border-red-500 shadow-md shadow-red-950/50 scale-105"
                        : "bg-slate-950/60 border-slate-800 hover:border-slate-600 opacity-80 hover:opacity-100"
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
        </div>

        {/* COLUMNA DETALLE: SELECCIÓN EN DOS NIVELES Y LATERALIDAD */}
        <div className="md:col-span-6 lg:col-span-5 space-y-4">
          {/* Nivel 1: Zona / Región Seleccionada */}
          <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Estructura Seleccionada (Nivel 1 + Nivel 2)
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
              <div className="flex items-center justify-between gap-3 p-2 bg-slate-900 border border-slate-800 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-16 relative rounded-lg overflow-hidden border border-red-500/40 bg-black/60 shrink-0">
                    <Image
                      src="/models/mini_body_preview.png"
                      alt="Miniatura anatómica"
                      width={40}
                      height={64}
                      className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                      <span className="text-sm font-black text-white">
                        {value.displayLabel}
                      </span>
                    </div>
                    <div className="text-[11px] font-semibold text-slate-400 mt-0.5">
                      Región: <strong className="text-slate-200">{value.bodyRegion}</strong>
                    </div>
                    <div className="text-[10px] text-red-400 font-bold">
                      Estructura: {value.bodyStructure}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                Haz clic o toca sobre el avatar deportivo 3D o en el carrusel inferior para seleccionar la zona afectada.
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

          {/* Nivel 2: Refinamiento de Estructura Anatómica Concreta */}
          {value && currentRegionConfig && (
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                Nivel 2: Estructura Específica ({currentRegionConfig.region})
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

          {/* Accesos Rápidos de Patologías Comunes de Fútbol */}
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
              Patologías Habituales en Fútbol (Acceso Rápido):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "Isquiotibiales Der.", region: "Muslo posterior", struct: "Isquiotibiales", lat: "derecha" as const, view: "back" as const },
                { label: "Isquiotibiales Izq.", region: "Muslo posterior", struct: "Isquiotibiales", lat: "izquierda" as const, view: "back" as const },
                { label: "Cuádriceps / Recto", region: "Muslo anterior", struct: "Recto femoral", lat: "derecha" as const, view: "front" as const },
                { label: "Sóleo / Gemelo", region: "Pierna", struct: "Sóleo", lat: "derecha" as const, view: "back" as const },
                { label: "Aductores / Ingle", region: "Cadera / Pelvis", struct: "Aductores", lat: "derecha" as const, view: "front" as const },
                { label: "Ligamento Tobillo", region: "Tobillo", struct: "Tobillo externo", lat: "derecha" as const, view: "front" as const },
                { label: "Tendón Rotuliano", region: "Rodilla", struct: "Tendón rotuliano", lat: "derecha" as const, view: "front" as const },
                { label: "Codo / Hiperextensión", region: "Codo", struct: "Codo", lat: "derecha" as const, view: "front" as const },
                { label: "Esguince Muñeca", region: "Muñeca", struct: "Muñeca", lat: "derecha" as const, view: "front" as const },
                { label: "Hombro / Acromio", region: "Hombro", struct: "Articulación acromioclavicular", lat: "derecha" as const, view: "front" as const }
              ].map(f => (
                <button
                  key={f.label}
                  type="button"
                  onClick={() => {
                    setActiveView2D(f.view)
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
