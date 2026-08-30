"use client"

import React, { useState } from "react"
import { RotateCw, CheckCircle2, MapPin } from "lucide-react"

export interface BodyLocationSelection {
  view: "front" | "back"
  region: string
  side: "left" | "right" | "center" | "none"
  label: string
}

interface BodyMapPickerProps {
  value?: BodyLocationSelection | null
  onChange: (selection: BodyLocationSelection | null) => void
}

interface BodyZoneDef {
  id: string
  region: string
  side: "left" | "right" | "center" | "none"
  view: "front" | "back" | "both"
  label: string
  // SVG coordinates / shape
  x: number
  y: number
  w: number
  h: number
  rx?: number
}

// Zonas deportivas estandarizadas
const BODY_ZONES: BodyZoneDef[] = [
  // Cabeza y cuello
  { id: "cabeza", region: "Cabeza", side: "center", view: "both", label: "Cabeza", x: 90, y: 15, w: 40, h: 42, rx: 20 },
  { id: "cuello", region: "Cuello", side: "center", view: "both", label: "Cuello", x: 100, y: 60, w: 20, h: 16, rx: 4 },

  // Torso Frontal
  { id: "pecho", region: "Pecho", side: "center", view: "front", label: "Pecho", x: 80, y: 80, w: 60, h: 36, rx: 6 },
  { id: "abdomen", region: "Abdomen", side: "center", view: "front", label: "Abdomen", x: 84, y: 118, w: 52, h: 32, rx: 6 },
  { id: "ingle_izq", region: "Ingle", side: "left", view: "front", label: "Ingle izquierda", x: 92, y: 152, w: 16, h: 18, rx: 4 },
  { id: "ingle_der", region: "Ingle", side: "right", view: "front", label: "Ingle derecha", x: 112, y: 152, w: 16, h: 18, rx: 4 },

  // Torso Posterior
  { id: "espalda_alta", region: "Espalda", side: "center", view: "back", label: "Espalda", x: 78, y: 80, w: 64, h: 42, rx: 6 },
  { id: "lumbar", region: "Zona lumbar", side: "center", view: "back", label: "Zona lumbar", x: 82, y: 124, w: 56, h: 28, rx: 6 },
  { id: "gluteo_izq", region: "Glúteo", side: "left", view: "back", label: "Glúteo izquierdo", x: 82, y: 154, w: 26, h: 26, rx: 8 },
  { id: "gluteo_der", region: "Glúteo", side: "right", view: "back", label: "Glúteo derecho", x: 112, y: 154, w: 26, h: 26, rx: 8 },

  // Extremidades superiores - Izquierda (lado izquierdo del cuerpo = vista frontal derecha o viceversa)
  // Lado anatómico: Izquierdo del jugador
  { id: "hombro_izq", region: "Hombro", side: "left", view: "both", label: "Hombro izquierdo", x: 50, y: 78, w: 26, h: 24, rx: 8 },
  { id: "brazo_izq", region: "Brazo", side: "left", view: "both", label: "Brazo izquierdo", x: 42, y: 104, w: 20, h: 32, rx: 6 },
  { id: "codo_izq", region: "Codo", side: "left", view: "both", label: "Codo izquierdo", x: 40, y: 138, w: 18, h: 18, rx: 5 },
  { id: "antebrazo_izq", region: "Antebrazo", side: "left", view: "both", label: "Antebrazo izquierdo", x: 36, y: 158, w: 18, h: 34, rx: 5 },
  { id: "muneca_izq", region: "Muñeca / Mano", side: "left", view: "both", label: "Muñeca/Mano izquierda", x: 30, y: 194, w: 20, h: 24, rx: 6 },

  // Extremidades superiores - Derecha del jugador
  { id: "hombro_der", region: "Hombro", side: "right", view: "both", label: "Hombro derecho", x: 144, y: 78, w: 26, h: 24, rx: 8 },
  { id: "brazo_der", region: "Brazo", side: "right", view: "both", label: "Brazo derecho", x: 158, y: 104, w: 20, h: 32, rx: 6 },
  { id: "codo_der", region: "Codo", side: "right", view: "both", label: "Codo derecho", x: 162, y: 138, w: 18, h: 18, rx: 5 },
  { id: "antebrazo_der", region: "Antebrazo", side: "right", view: "both", label: "Antebrazo derecho", x: 166, y: 158, w: 18, h: 34, rx: 5 },
  { id: "muneca_der", region: "Muñeca / Mano", side: "right", view: "both", label: "Muñeca/Mano derecha", x: 170, y: 194, w: 20, h: 24, rx: 6 },

  // Caderas
  { id: "cadera_izq", region: "Cadera", side: "left", view: "both", label: "Cadera izquierda", x: 74, y: 152, w: 18, h: 22, rx: 6 },
  { id: "cadera_der", region: "Cadera", side: "right", view: "both", label: "Cadera derecha", x: 128, y: 152, w: 18, h: 22, rx: 6 },

  // Extremidades inferiores - Izquierda del jugador
  { id: "muslo_izq", region: "Muslo", side: "left", view: "both", label: "Muslo izquierdo", x: 80, y: 182, w: 26, h: 56, rx: 8 },
  { id: "rodilla_izq", region: "Rodilla", side: "left", view: "front", label: "Rodilla izquierda", x: 82, y: 240, w: 22, h: 22, rx: 6 },
  { id: "corva_izq", region: "Hueco poplíteo (Corva)", side: "left", view: "back", label: "Corva izquierda", x: 82, y: 240, w: 22, h: 22, rx: 6 },
  { id: "pantorrilla_izq", region: "Pantorrilla / Gemelo", side: "left", view: "both", label: "Pantorrilla izquierda", x: 80, y: 264, w: 24, h: 54, rx: 8 },
  { id: "tobillo_izq", region: "Tobillo", side: "left", view: "both", label: "Tobillo izquierdo", x: 82, y: 320, w: 20, h: 18, rx: 5 },
  { id: "pie_izq", region: "Pie", side: "left", view: "both", label: "Pie izquierdo", x: 76, y: 340, w: 26, h: 20, rx: 6 },

  // Extremidades inferiores - Derecha del jugador
  { id: "muslo_der", region: "Muslo", side: "right", view: "both", label: "Muslo derecho", x: 114, y: 182, w: 26, h: 56, rx: 8 },
  { id: "rodilla_der", region: "Rodilla", side: "right", view: "front", label: "Rodilla derecha", x: 116, y: 240, w: 22, h: 22, rx: 6 },
  { id: "corva_der", region: "Hueco poplíteo (Corva)", side: "right", view: "back", label: "Corva derecha", x: 116, y: 240, w: 22, h: 22, rx: 6 },
  { id: "pantorrilla_der", region: "Pantorrilla / Gemelo", side: "right", view: "both", label: "Pantorrilla derecha", x: 116, y: 264, w: 24, h: 54, rx: 8 },
  { id: "tobillo_der", region: "Tobillo", side: "right", view: "both", label: "Tobillo derecho", x: 118, y: 320, w: 20, h: 18, rx: 5 },
  { id: "pie_der", region: "Pie", side: "right", view: "both", label: "Pie derecho", x: 118, y: 340, w: 26, h: 20, rx: 6 }
]

export function BodyMapPicker({ value, onChange }: BodyMapPickerProps) {
  const [activeView, setActiveView] = useState<"front" | "back">("front")
  const [hoveredZone, setHoveredZone] = useState<BodyZoneDef | null>(null)

  // Filtrar zonas visibles en la vista seleccionada
  const visibleZones = BODY_ZONES.filter(
    z => z.view === "both" || z.view === activeView
  )

  const handleSelectZone = (zone: BodyZoneDef) => {
    if (
      value &&
      value.region === zone.region &&
      value.side === zone.side &&
      value.view === activeView
    ) {
      // Deseleccionar si hace clic de nuevo
      onChange(null)
    } else {
      onChange({
        view: activeView,
        region: zone.region,
        side: zone.side,
        label: zone.label
      })
    }
  }

  const isZoneSelected = (zone: BodyZoneDef) => {
    if (!value) return false
    return (
      value.region === zone.region &&
      value.side === zone.side &&
      (value.view === activeView || zone.view === "both")
    )
  }

  return (
    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
      {/* Barra superior de control: Toggle Vista Frontal / Posterior */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5">
        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-red-500" />
          Mapa Corporal Deportivo
        </span>

        <div className="inline-flex p-0.5 bg-slate-200 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveView("front")}
            className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
              activeView === "front"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Vista Frontal
          </button>
          <button
            type="button"
            onClick={() => setActiveView("back")}
            className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
              activeView === "back"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Vista Posterior
          </button>
        </div>
      </div>

      {/* Área del mapa SVG interactivo y selector */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
        {/* Silueta interactiva SVG */}
        <div className="sm:col-span-6 flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200 p-2 relative shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 mb-1">
            {activeView === "front" ? "Anterior (Frontal)" : "Posterior (Dorsal)"}
          </span>

          <svg
            viewBox="0 0 220 375"
            className="w-44 h-72 select-none"
            aria-label="Mapa anatómico interactivo"
          >
            {/* Silueta base del cuerpo en gris suave */}
            <g opacity="0.15" fill="#64748b" stroke="#475569" strokeWidth="1.5">
              {/* Cabeza */}
              <circle cx="110" cy="35" r="20" />
              {/* Cuello */}
              <rect x="102" y="55" width="16" height="15" rx="3" />
              {/* Torso */}
              <path d="M 68,70 L 152,70 L 140,165 L 80,165 Z" />
              {/* Brazos */}
              <path d="M 68,75 L 42,150 L 32,210 L 45,210 L 58,155 L 75,90 Z" />
              <path d="M 152,75 L 178,150 L 188,210 L 175,210 L 162,155 L 145,90 Z" />
              {/* Piernas */}
              <path d="M 80,165 L 105,165 L 102,345 L 82,345 L 75,230 Z" />
              <path d="M 140,165 L 115,165 L 118,345 L 138,345 L 145,230 Z" />
            </g>

            {/* Zonas interactivas clickables */}
            {visibleZones.map(zone => {
              const selected = isZoneSelected(zone)
              const hovered = hoveredZone?.id === zone.id

              return (
                <g key={zone.id}>
                  <rect
                    x={zone.x}
                    y={zone.y}
                    width={zone.w}
                    height={zone.h}
                    rx={zone.rx || 4}
                    className={`cursor-pointer transition-all duration-200 ${
                      selected
                        ? "fill-red-500 stroke-red-700 stroke-2 opacity-95 shadow-lg animate-pulse"
                        : hovered
                        ? "fill-red-200 stroke-red-400 stroke-1.5 opacity-80"
                        : "fill-blue-500/20 stroke-blue-400/50 stroke-1 hover:fill-red-200/60"
                    }`}
                    onMouseEnter={() => setHoveredZone(zone)}
                    onMouseLeave={() => setHoveredZone(null)}
                    onClick={() => handleSelectZone(zone)}
                  />
                  {/* Punto central si está seleccionado */}
                  {selected && (
                    <circle
                      cx={zone.x + zone.w / 2}
                      cy={zone.y + zone.h / 2}
                      r="4"
                      fill="#ffffff"
                      className="pointer-events-none"
                    />
                  )}
                </g>
              )
            })}
          </svg>

          {/* Leyenda lateral izquierda/derecha de referencia */}
          <div className="w-full flex justify-between px-4 text-[9px] font-bold text-slate-400 uppercase">
            <span>{activeView === "front" ? "← Lado Izq" : "← Lado Der"}</span>
            <span>{activeView === "front" ? "Lado Der →" : "Lado Izq →"}</span>
          </div>
        </div>

        {/* Panel informativo y selector rápido complementario */}
        <div className="sm:col-span-6 space-y-3">
          {/* Zona actualmente seleccionada */}
          <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Zona Seleccionada:
            </span>
            {value ? (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                  <span className="text-xs font-black text-red-950">
                    {value.label}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onChange(null)}
                  className="text-[10px] text-slate-400 hover:text-red-600 font-bold underline cursor-pointer"
                >
                  Quitar
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                Haz clic en el mapa anatómico para marcar la zona.
              </p>
            )}
          </div>

          {/* Hover preview */}
          <div className="text-[11px] text-slate-500 h-5 truncate px-1">
            {hoveredZone ? (
              <span className="font-semibold text-slate-700">
                Apuntando a: <strong>{hoveredZone.label}</strong>
              </span>
            ) : (
              <span className="text-slate-400">Pasa el cursor sobre la silueta</span>
            )}
          </div>

          {/* Accesos rápidos frecuentes de fútbol */}
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
              Zonas Frecuentes en Fútbol:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "Muslo Der.", region: "Muslo", side: "right", view: "front" },
                { label: "Muslo Izq.", region: "Muslo", side: "left", view: "front" },
                { label: "Rodilla Der.", region: "Rodilla", side: "right", view: "front" },
                { label: "Rodilla Izq.", region: "Rodilla", side: "left", view: "front" },
                { label: "Tobillo Der.", region: "Tobillo", side: "right", view: "both" },
                { label: "Tobillo Izq.", region: "Tobillo", side: "left", view: "both" },
                { label: "Gemelo / Pantorrilla", region: "Pantorrilla / Gemelo", side: "right", view: "back" },
                { label: "Zona Lumbar", region: "Zona lumbar", side: "center", view: "back" }
              ].map(f => {
                const isCurrent =
                  value?.region === f.region &&
                  value?.side === f.side
                return (
                  <button
                    key={f.label}
                    type="button"
                    onClick={() => {
                      setActiveView(f.view === "back" ? "back" : "front")
                      onChange({
                        view: f.view === "back" ? "back" : "front",
                        region: f.region,
                        side: f.side as any,
                        label: f.label
                      })
                    }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                      isCurrent
                        ? "bg-red-600 text-white border-red-700"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {f.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
