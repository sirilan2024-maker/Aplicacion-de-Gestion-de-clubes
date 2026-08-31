"use client"

import React, { useState, useCallback } from "react"
import Image from "next/image"
import {
  RotateCcw,
  Eye,
  ZoomIn,
  ZoomOut,
  Maximize2,
  MousePointer,
  Sparkles
} from "lucide-react"

export type LateralityType = "izquierda" | "derecha" | "bilateral" | "central" | "no_aplica"

export interface AnatomicalPieceData {
  id: string
  region: string
  laterality: LateralityType
  structures: string[]
  defaultStructure: string
  displayName: string
  viewSide?: "front" | "back" | "both"
}

interface AnatomicalMannequin3DProps {
  selectedRegionId?: string | null
  selectedLaterality?: LateralityType | null
  displayMode?: "dual" | "orbit"
  onSelectPiece: (piece: AnatomicalPieceData) => void
  onError?: (err: Error) => void
}

// Catálogo de piezas anatómicas estructuradas
export const MANNEQUIN_PIECES: Record<string, AnatomicalPieceData> = {
  cabeza: {
    id: "cabeza",
    region: "Cabeza",
    laterality: "central",
    structures: ["Cabeza", "Cráneo", "Cara", "Mandíbula"],
    defaultStructure: "Cabeza",
    displayName: "Cabeza / Cara",
    viewSide: "both"
  },
  cuello: {
    id: "cuello",
    region: "Cuello",
    laterality: "central",
    structures: ["Cuello", "Musculatura cervical"],
    defaultStructure: "Cuello",
    displayName: "Cuello / Cervical",
    viewSide: "both"
  },
  pecho: {
    id: "pecho",
    region: "Tronco",
    laterality: "central",
    structures: ["Pecho", "Pectoral mayor", "Clavícula", "Esternón"],
    defaultStructure: "Pecho",
    displayName: "Pectorales / Clavícula",
    viewSide: "front"
  },
  abdomen: {
    id: "abdomen",
    region: "Tronco",
    laterality: "central",
    structures: ["Abdomen", "Recto abdominal", "Oblicuos", "Serrato anterior"],
    defaultStructure: "Abdomen",
    displayName: "Abdomen / Oblicuos",
    viewSide: "front"
  },
  espalda: {
    id: "espalda",
    region: "Tronco",
    laterality: "central",
    structures: ["Espalda", "Trapecio", "Dorsal ancho", "Romboides"],
    defaultStructure: "Espalda",
    displayName: "Espalda dorsal / Trapecio",
    viewSide: "back"
  },
  lumbar: {
    id: "lumbar",
    region: "Tronco",
    laterality: "central",
    structures: ["Zona lumbar", "Erectores espinales"],
    defaultStructure: "Zona lumbar",
    displayName: "Zona lumbar",
    viewSide: "back"
  },
  cadera_izq: {
    id: "cadera_izq",
    region: "Cadera / Pelvis",
    laterality: "izquierda",
    structures: ["Cadera", "Glúteo medio", "Ingle", "Aductores"],
    defaultStructure: "Cadera",
    displayName: "Cadera / Ingle izquierda",
    viewSide: "both"
  },
  cadera_der: {
    id: "cadera_der",
    region: "Cadera / Pelvis",
    laterality: "derecha",
    structures: ["Cadera", "Glúteo medio", "Ingle", "Aductores"],
    defaultStructure: "Cadera",
    displayName: "Cadera / Ingle derecha",
    viewSide: "both"
  },
  gluteo_izq: {
    id: "gluteo_izq",
    region: "Cadera / Pelvis",
    laterality: "izquierda",
    structures: ["Glúteo mayor", "Glúteo medio", "Pelvis posterior"],
    defaultStructure: "Glúteo mayor",
    displayName: "Glúteo izquierdo",
    viewSide: "back"
  },
  gluteo_der: {
    id: "gluteo_der",
    region: "Cadera / Pelvis",
    laterality: "derecha",
    structures: ["Glúteo mayor", "Glúteo medio", "Pelvis posterior"],
    defaultStructure: "Glúteo mayor",
    displayName: "Glúteo derecho",
    viewSide: "back"
  },
  hombro_izq: {
    id: "hombro_izq",
    region: "Hombro",
    laterality: "izquierda",
    structures: ["Hombro", "Deltoides", "Articulación acromioclavicular"],
    defaultStructure: "Hombro",
    displayName: "Hombro izquierdo (Deltoides)",
    viewSide: "both"
  },
  hombro_der: {
    id: "hombro_der",
    region: "Hombro",
    laterality: "derecha",
    structures: ["Hombro", "Deltoides", "Articulación acromioclavicular"],
    defaultStructure: "Hombro",
    displayName: "Hombro derecho (Deltoides)",
    viewSide: "both"
  },
  brazo_izq: {
    id: "brazo_izq",
    region: "Brazo",
    laterality: "izquierda",
    structures: ["Bíceps", "Tríceps"],
    defaultStructure: "Bíceps",
    displayName: "Brazo izquierdo (Bíceps)",
    viewSide: "both"
  },
  brazo_der: {
    id: "brazo_der",
    region: "Brazo",
    laterality: "derecha",
    structures: ["Bíceps", "Tríceps"],
    defaultStructure: "Bíceps",
    displayName: "Brazo derecho (Bíceps)",
    viewSide: "both"
  },
  codo_izq: {
    id: "codo_izq",
    region: "Codo",
    laterality: "izquierda",
    structures: ["Codo", "Epicóndilo", "Articulación"],
    defaultStructure: "Codo",
    displayName: "Codo izquierdo",
    viewSide: "both"
  },
  codo_der: {
    id: "codo_der",
    region: "Codo",
    laterality: "derecha",
    structures: ["Codo", "Epicóndilo", "Articulación"],
    defaultStructure: "Codo",
    displayName: "Codo derecho",
    viewSide: "both"
  },
  antebrazo_izq: {
    id: "antebrazo_izq",
    region: "Antebrazo",
    laterality: "izquierda",
    structures: ["Musculatura flexora", "Musculatura extensora", "Radio", "Cúbito"],
    defaultStructure: "Musculatura flexora",
    displayName: "Antebrazo izquierdo",
    viewSide: "both"
  },
  antebrazo_der: {
    id: "antebrazo_der",
    region: "Antebrazo",
    laterality: "derecha",
    structures: ["Musculatura flexora", "Musculatura extensora", "Radio", "Cúbito"],
    defaultStructure: "Musculatura flexora",
    displayName: "Antebrazo derecho",
    viewSide: "both"
  },
  muneca_izq: {
    id: "muneca_izq",
    region: "Muñeca",
    laterality: "izquierda",
    structures: ["Muñeca", "Escafoides"],
    defaultStructure: "Muñeca",
    displayName: "Muñeca izquierda",
    viewSide: "both"
  },
  muneca_der: {
    id: "muneca_der",
    region: "Muñeca",
    laterality: "derecha",
    structures: ["Muñeca", "Escafoides"],
    defaultStructure: "Muñeca",
    displayName: "Muñeca derecha",
    viewSide: "both"
  },
  mano_izq: {
    id: "mano_izq",
    region: "Mano",
    laterality: "izquierda",
    structures: ["Mano", "Metacarpos", "Dedos"],
    defaultStructure: "Mano",
    displayName: "Mano y dedos izquierdos",
    viewSide: "both"
  },
  mano_der: {
    id: "mano_der",
    region: "Mano",
    laterality: "derecha",
    structures: ["Mano", "Metacarpos", "Dedos"],
    defaultStructure: "Mano",
    displayName: "Mano y dedos derechos",
    viewSide: "both"
  },
  muslo_ant_izq: {
    id: "muslo_ant_izq",
    region: "Muslo anterior",
    laterality: "izquierda",
    structures: ["Cuádriceps", "Recto femoral", "Vasto interno", "Vasto externo"],
    defaultStructure: "Cuádriceps",
    displayName: "Cuádriceps izquierdo",
    viewSide: "front"
  },
  muslo_ant_der: {
    id: "muslo_ant_der",
    region: "Muslo anterior",
    laterality: "derecha",
    structures: ["Cuádriceps", "Recto femoral", "Vasto interno", "Vasto externo"],
    defaultStructure: "Cuádriceps",
    displayName: "Cuádriceps derecho",
    viewSide: "front"
  },
  muslo_post_izq: {
    id: "muslo_post_izq",
    region: "Muslo posterior",
    laterality: "izquierda",
    structures: ["Isquiotibiales", "Bíceps femoral", "Semitendinoso", "Semimembranoso"],
    defaultStructure: "Isquiotibiales",
    displayName: "Isquiotibiales izquierdos",
    viewSide: "back"
  },
  muslo_post_der: {
    id: "muslo_post_der",
    region: "Muslo posterior",
    laterality: "derecha",
    structures: ["Isquiotibiales", "Bíceps femoral", "Semitendinoso", "Semimembranoso"],
    defaultStructure: "Isquiotibiales",
    displayName: "Isquiotibiales derechos",
    viewSide: "back"
  },
  rodilla_izq: {
    id: "rodilla_izq",
    region: "Rodilla",
    laterality: "izquierda",
    structures: ["Rodilla", "Rótula", "Tendón rotuliano"],
    defaultStructure: "Rodilla",
    displayName: "Rodilla izquierda",
    viewSide: "both"
  },
  rodilla_der: {
    id: "rodilla_der",
    region: "Rodilla",
    laterality: "derecha",
    structures: ["Rodilla", "Rótula", "Tendón rotuliano"],
    defaultStructure: "Rodilla",
    displayName: "Rodilla derecha",
    viewSide: "both"
  },
  pierna_izq_ant: {
    id: "pierna_izq_ant",
    region: "Pierna",
    laterality: "izquierda",
    structures: ["Tibial anterior"],
    defaultStructure: "Tibial anterior",
    displayName: "Tibial anterior izquierdo",
    viewSide: "front"
  },
  pierna_der_ant: {
    id: "pierna_der_ant",
    region: "Pierna",
    laterality: "derecha",
    structures: ["Tibial anterior"],
    defaultStructure: "Tibial anterior",
    displayName: "Tibial anterior derecho",
    viewSide: "front"
  },
  pierna_izq_post: {
    id: "pierna_izq_post",
    region: "Pierna",
    laterality: "izquierda",
    structures: ["Gemelo", "Gastrocnemio medial", "Gastrocnemio lateral", "Sóleo"],
    defaultStructure: "Gemelo",
    displayName: "Gemelo y sóleo izquierdo",
    viewSide: "back"
  },
  pierna_der_post: {
    id: "pierna_der_post",
    region: "Pierna",
    laterality: "derecha",
    structures: ["Gemelo", "Gastrocnemio medial", "Gastrocnemio lateral", "Sóleo"],
    defaultStructure: "Gemelo",
    displayName: "Gemelo y sóleo derecho",
    viewSide: "back"
  },
  tobillo_izq: {
    id: "tobillo_izq",
    region: "Tobillo",
    laterality: "izquierda",
    structures: ["Tobillo interno", "Tobillo externo", "Tendón de Aquiles"],
    defaultStructure: "Tobillo externo",
    displayName: "Tobillo izquierdo / Aquiles",
    viewSide: "both"
  },
  tobillo_der: {
    id: "tobillo_der",
    region: "Tobillo",
    laterality: "derecha",
    structures: ["Tobillo interno", "Tobillo externo", "Tendón de Aquiles"],
    defaultStructure: "Tobillo externo",
    displayName: "Tobillo derecho / Aquiles",
    viewSide: "both"
  },
  pie_izq: {
    id: "pie_izq",
    region: "Pie",
    laterality: "izquierda",
    structures: ["Empeine", "Talón", "Planta", "Dedos"],
    defaultStructure: "Empeine",
    displayName: "Pie y dedos izquierdos",
    viewSide: "both"
  },
  pie_der: {
    id: "pie_der",
    region: "Pie",
    laterality: "derecha",
    structures: ["Empeine", "Talón", "Planta", "Dedos"],
    defaultStructure: "Empeine",
    displayName: "Pie y dedos derechos",
    viewSide: "both"
  }
}

// Zonas interactivas de selección calibradas
interface HitArea {
  pieceId: string
  top: string
  left: string
  width: string
  height: string
  shape?: "rect" | "circle"
}

// Zonas sobre el avatar Frontal
const FRONT_HIT_AREAS: HitArea[] = [
  { pieceId: "cabeza", top: "5%", left: "41%", width: "18%", height: "11%" },
  { pieceId: "cuello", top: "16%", left: "44%", width: "12%", height: "5%" },
  { pieceId: "pecho", top: "20%", left: "33%", width: "34%", height: "11%" },
  { pieceId: "hombro_izq", top: "19%", left: "19%", width: "13%", height: "9%" },
  { pieceId: "hombro_der", top: "19%", left: "68%", width: "13%", height: "9%" },
  { pieceId: "brazo_izq", top: "28%", left: "13%", width: "12%", height: "11%" },
  { pieceId: "brazo_der", top: "28%", left: "75%", width: "12%", height: "11%" },
  { pieceId: "codo_izq", top: "39%", left: "9%", width: "10%", height: "6%" },
  { pieceId: "codo_der", top: "39%", left: "81%", width: "10%", height: "6%" },
  { pieceId: "antebrazo_izq", top: "45%", left: "5%", width: "11%", height: "12%" },
  { pieceId: "antebrazo_der", top: "45%", left: "84%", width: "11%", height: "12%" },
  { pieceId: "muneca_izq", top: "57%", left: "3%", width: "9%", height: "6%" },
  { pieceId: "muneca_der", top: "57%", left: "88%", width: "9%", height: "6%" },
  { pieceId: "mano_izq", top: "63%", left: "1%", width: "11%", height: "10%" },
  { pieceId: "mano_der", top: "63%", left: "88%", width: "11%", height: "10%" },
  { pieceId: "abdomen", top: "31%", left: "35%", width: "30%", height: "12%" },
  { pieceId: "cadera_izq", top: "43%", left: "33%", width: "17%", height: "9%" },
  { pieceId: "cadera_der", top: "43%", left: "50%", width: "17%", height: "9%" },
  { pieceId: "muslo_ant_izq", top: "51%", left: "28%", width: "20%", height: "17%" },
  { pieceId: "muslo_ant_der", top: "51%", left: "52%", width: "20%", height: "17%" },
  { pieceId: "rodilla_izq", top: "68%", left: "30%", width: "16%", height: "7%" },
  { pieceId: "rodilla_der", top: "68%", left: "54%", width: "16%", height: "7%" },
  { pieceId: "pierna_izq_ant", top: "75%", left: "30%", width: "15%", height: "15%" },
  { pieceId: "pierna_der_ant", top: "75%", left: "55%", width: "15%", height: "15%" },
  { pieceId: "tobillo_izq", top: "90%", left: "29%", width: "14%", height: "5%" },
  { pieceId: "tobillo_der", top: "90%", left: "57%", width: "14%", height: "5%" },
  { pieceId: "pie_izq", top: "94%", left: "26%", width: "17%", height: "6%" },
  { pieceId: "pie_der", top: "94%", left: "57%", width: "17%", height: "6%" }
]

// Zonas sobre el avatar Posterior
const BACK_HIT_AREAS: HitArea[] = [
  { pieceId: "cabeza", top: "5%", left: "41%", width: "18%", height: "11%" },
  { pieceId: "cuello", top: "16%", left: "43%", width: "14%", height: "6%" },
  { pieceId: "espalda", top: "21%", left: "31%", width: "38%", height: "14%" },
  { pieceId: "hombro_izq", top: "19%", left: "68%", width: "13%", height: "9%" }, // en dorsal, izquierda anatómica está a la derecha de la pantalla
  { pieceId: "hombro_der", top: "19%", left: "19%", width: "13%", height: "9%" },
  { pieceId: "brazo_izq", top: "28%", left: "75%", width: "12%", height: "11%" },
  { pieceId: "brazo_der", top: "28%", left: "13%", width: "12%", height: "11%" },
  { pieceId: "codo_izq", top: "39%", left: "81%", width: "10%", height: "6%" },
  { pieceId: "codo_der", top: "39%", left: "9%", width: "10%", height: "6%" },
  { pieceId: "antebrazo_izq", top: "45%", left: "84%", width: "11%", height: "12%" },
  { pieceId: "antebrazo_der", top: "45%", left: "5%", width: "11%", height: "12%" },
  { pieceId: "lumbar", top: "34%", left: "36%", width: "28%", height: "8%" },
  { pieceId: "gluteo_der", top: "41%", left: "30%", width: "20%", height: "11%" },
  { pieceId: "gluteo_izq", top: "41%", left: "50%", width: "20%", height: "11%" },
  { pieceId: "muslo_post_der", top: "51%", left: "28%", width: "20%", height: "17%" },
  { pieceId: "muslo_post_izq", top: "51%", left: "52%", width: "20%", height: "17%" },
  { pieceId: "rodilla_der", top: "68%", left: "30%", width: "16%", height: "7%" },
  { pieceId: "rodilla_izq", top: "68%", left: "54%", width: "16%", height: "7%" },
  { pieceId: "pierna_der_post", top: "75%", left: "30%", width: "16%", height: "15%" },
  { pieceId: "pierna_izq_post", top: "75%", left: "54%", width: "16%", height: "15%" },
  { pieceId: "tobillo_der", top: "90%", left: "30%", width: "14%", height: "5%" },
  { pieceId: "tobillo_izq", top: "90%", left: "56%", width: "14%", height: "5%" },
  { pieceId: "pie_der", top: "94%", left: "29%", width: "15%", height: "6%" },
  { pieceId: "pie_izq", top: "94%", left: "56%", width: "15%", height: "6%" }
]

export function AnatomicalMannequin3D({
  selectedRegionId,
  selectedLaterality,
  onSelectPiece
}: AnatomicalMannequin3DProps) {
  const [hoveredPiece, setHoveredPiece] = useState<AnatomicalPieceData | null>(null)
  const [zoomLevel, setZoomLevel] = useState<number>(1)
  const [focusedSide, setFocusedSide] = useState<"both" | "front" | "back">("both")

  // Comprueba si una pieza coincide con la selección activa
  const isPieceSelected = useCallback(
    (pieceId: string) => {
      const piece = MANNEQUIN_PIECES[pieceId]
      if (!piece) return false
      if (selectedRegionId === pieceId) return true
      if (
        selectedRegionId &&
        piece.region.toLowerCase() === selectedRegionId.toLowerCase() &&
        (!selectedLaterality || piece.laterality === selectedLaterality)
      ) {
        return true
      }
      return false
    },
    [selectedRegionId, selectedLaterality]
  )

  // Obtiene la pieza seleccionada actual para el tooltip flotante
  const currentSelectedPiece = Object.values(MANNEQUIN_PIECES).find(p => isPieceSelected(p.id))
  const displayedPiece = hoveredPiece || currentSelectedPiece

  return (
    <div className="flex flex-col bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative select-none">
      {/* Barra superior de controles */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-slate-900/95 border-b border-slate-800 text-xs text-white z-20">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-black tracking-wide text-[11px] uppercase text-slate-300">
            Modelo Anatómico Deportivo: <strong className="text-white">Frontal + Posterior</strong>
          </span>
        </div>

        {/* Botones de enfoque rápido */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setFocusedSide("both")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              focusedSide === "both"
                ? "bg-red-600 text-white shadow-xs"
                : "bg-slate-800 text-slate-300 hover:text-white"
            }`}
          >
            Dual
          </button>
          <button
            type="button"
            onClick={() => setFocusedSide("front")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              focusedSide === "front"
                ? "bg-red-600 text-white shadow-xs"
                : "bg-slate-800 text-slate-300 hover:text-white"
            }`}
          >
            Frontal
          </button>
          <button
            type="button"
            onClick={() => setFocusedSide("back")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              focusedSide === "back"
                ? "bg-red-600 text-white shadow-xs"
                : "bg-slate-800 text-slate-300 hover:text-white"
            }`}
          >
            Posterior
          </button>
          <button
            type="button"
            onClick={() => {
              setFocusedSide("both")
              setZoomLevel(1)
            }}
            className="p-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-colors ml-1"
            title="Restablecer vista"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Escenario Anatómico Central */}
      <div className="w-full h-96 sm:h-[430px] relative overflow-hidden bg-gradient-to-b from-[#0b0f19] via-[#090d16] to-[#06080e] flex items-center justify-center">
        {/* Contenedor escalable con Zoom y Enfoque */}
        <div
          className="w-full h-full max-w-2xl flex items-center justify-around px-4 transition-transform duration-300 ease-out"
          style={{
            transform: `scale(${zoomLevel}) ${
              focusedSide === "front" ? "translateX(25%)" : focusedSide === "back" ? "translateX(-25%)" : "translateX(0)"
            }`
          }}
        >
          {/* AVATAR FRONTAL (ANTERIOR) */}
          <div className="relative w-44 sm:w-52 h-[380px] sm:h-[410px] flex items-center justify-center">
            {/* Imagen base anatómica de alta definición frontal */}
            <Image
              src="/models/avatar_front_reference_clean.png"
              alt="Avatar Anatómico Frontal"
              width={260}
              height={510}
              priority
              className="w-full h-full object-contain pointer-events-none filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.8)]"
            />

            {/* Hitboxes interactivos sobre el avatar frontal */}
            {FRONT_HIT_AREAS.map((hit, idx) => {
              const isSelected = isPieceSelected(hit.pieceId)
              const isHovered = hoveredPiece?.id === hit.pieceId

              return (
                <div
                  key={`front-${hit.pieceId}-${idx}`}
                  style={{
                    top: hit.top,
                    left: hit.left,
                    width: hit.width,
                    height: hit.height
                  }}
                  onMouseEnter={() => setHoveredPiece(MANNEQUIN_PIECES[hit.pieceId])}
                  onMouseLeave={() => setHoveredPiece(null)}
                  onClick={() => onSelectPiece(MANNEQUIN_PIECES[hit.pieceId])}
                  className={`absolute cursor-pointer transition-all duration-150 rounded-xl z-10 ${
                    isSelected
                      ? "bg-red-500/35 border-2 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.9)] animate-pulse"
                      : isHovered
                      ? "bg-sky-400/25 border border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.8)]"
                      : "bg-transparent hover:bg-white/5"
                  }`}
                  title={MANNEQUIN_PIECES[hit.pieceId]?.displayName}
                />
              )
            })}
          </div>

          {/* AVATAR POSTERIOR (DORSAL) */}
          <div className="relative w-44 sm:w-52 h-[380px] sm:h-[410px] flex items-center justify-center">
            {/* Imagen base anatómica de alta definición dorsal */}
            <Image
              src="/models/avatar_back_unlit.png"
              alt="Avatar Anatómico Posterior"
              width={260}
              height={510}
              priority
              className="w-full h-full object-contain pointer-events-none filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.8)]"
            />

            {/* Capa de brillo especial de isquiotibiales (cuando está seleccionado) */}
            {isPieceSelected("muslo_post_der") && (
              <div className="absolute top-[41%] left-[26%] w-[24%] h-[26%] pointer-events-none z-15 animate-pulse">
                <Image
                  src="/models/hamstring_right_glow.png"
                  alt="Isquiotibiales iluminados"
                  width={120}
                  height={220}
                  className="w-full h-full object-contain filter drop-shadow-[0_0_16px_rgba(239,68,68,1)] drop-shadow-[0_0_32px_rgba(220,38,38,0.8)]"
                />
              </div>
            )}

            {/* Hitboxes interactivos sobre el avatar posterior */}
            {BACK_HIT_AREAS.map((hit, idx) => {
              const isSelected = isPieceSelected(hit.pieceId)
              const isHovered = hoveredPiece?.id === hit.pieceId

              return (
                <div
                  key={`back-${hit.pieceId}-${idx}`}
                  style={{
                    top: hit.top,
                    left: hit.left,
                    width: hit.width,
                    height: hit.height
                  }}
                  onMouseEnter={() => setHoveredPiece(MANNEQUIN_PIECES[hit.pieceId])}
                  onMouseLeave={() => setHoveredPiece(null)}
                  onClick={() => onSelectPiece(MANNEQUIN_PIECES[hit.pieceId])}
                  className={`absolute cursor-pointer transition-all duration-150 rounded-xl z-10 ${
                    isSelected
                      ? "bg-red-500/35 border-2 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.9)] animate-pulse"
                      : isHovered
                      ? "bg-sky-400/25 border border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.8)]"
                      : "bg-transparent hover:bg-white/5"
                  }`}
                  title={MANNEQUIN_PIECES[hit.pieceId]?.displayName}
                />
              )
            })}
          </div>
        </div>

        {/* Tooltip Card con puntero idéntico a la referencia */}
        {displayedPiece && (
          <div className="absolute top-8 right-6 bg-slate-900/95 backdrop-blur-md border border-red-500/80 rounded-xl p-3 shadow-2xl z-30 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span className="font-black text-white text-xs tracking-wide">
                {displayedPiece.displayName}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-bold text-red-400">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span>Lateralidad: {displayedPiece.laterality.toUpperCase()}</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1 border-t border-slate-800 pt-1">
              Haz clic para confirmar zona anatómica
            </div>
          </div>
        )}

        {/* Barra de ayuda inferior con iconos idénticos a la imagen */}
        <div className="absolute bottom-2.5 inset-x-4 flex items-center justify-between text-[11px] text-slate-400 bg-slate-950/80 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-800/80 z-20">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <MousePointer className="w-3.5 h-3.5 text-slate-300" />
              <span>Haz clic en cualquier músculo</span>
            </span>
            <span className="hidden sm:flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-slate-300" />
              <span>Vista simultánea frontal y dorsal</span>
            </span>
          </div>

          {/* Controles de Zoom */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.min(1.4, prev + 0.15))}
              className="p-1 text-slate-300 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
              title="Acercar zoom"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.max(0.85, prev - 0.15))}
              className="p-1 text-slate-300 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
              title="Alejar zoom"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
