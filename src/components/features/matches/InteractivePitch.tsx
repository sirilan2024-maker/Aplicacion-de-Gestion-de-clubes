"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { FORMATIONS, FORMATION_KEYS, FormationKey } from "@/lib/formations"
import { saveLineup, LineupAssignment } from "@/lib/matches-actions"
import {
  ChevronDown,
  Save,
  UserPlus,
  X,
  Check,
  AlertCircle,
  RotateCcw,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConvocadoPlayer {
  id: string
  first_name: string
  last_name: string
  dorsal?: number | null
  posicion_tactica?: string | null
  slot_index?: number | null
}

interface InteractivePitchProps {
  partidoId: string
  convocados: ConvocadoPlayer[]
  teamColor: string   // hex, e.g. "#10b981"
  readOnly?: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initAssignments(
  convocados: ConvocadoPlayer[],
  formationLen: number
): Record<number, string | null> {
  const map: Record<number, string | null> = {}
  for (let i = 0; i < formationLen; i++) map[i] = null
  convocados.forEach((p) => {
    if (p.slot_index != null && p.slot_index < formationLen) {
      map[p.slot_index] = p.id
    }
  })
  return map
}

function playerName(p: ConvocadoPlayer, short = false) {
  if (short) return p.first_name.split(" ")[0]
  return `${p.first_name} ${p.last_name}`
}

// ─── Pitch SVG markings ──────────────────────────────────────────────────────

function PitchMarkings() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 300 450"
      preserveAspectRatio="none"
      fill="none"
      stroke="rgba(255,255,255,0.55)"
      strokeWidth="1.5"
    >
      {/* Boundary */}
      <rect x="10" y="10" width="280" height="430" rx="2" />
      {/* Halfway line */}
      <line x1="10" y1="225" x2="290" y2="225" />
      {/* Centre circle */}
      <circle cx="150" cy="225" r="40" />
      <circle cx="150" cy="225" r="2" fill="rgba(255,255,255,0.55)" />
      {/* Top penalty area */}
      <rect x="75" y="10" width="150" height="65" />
      <rect x="110" y="10" width="80" height="25" />
      <circle cx="150" cy="55" r="2" fill="rgba(255,255,255,0.55)" />
      <path d="M 110 75 A 40 40 0 0 1 190 75" />
      {/* Bottom penalty area */}
      <rect x="75" y="375" width="150" height="65" />
      <rect x="110" y="415" width="80" height="25" />
      <circle cx="150" cy="395" r="2" fill="rgba(255,255,255,0.55)" />
      <path d="M 110 375 A 40 40 0 0 0 190 375" />
      {/* Corner arcs */}
      <path d="M 10 25 A 15 15 0 0 1 25 10" />
      <path d="M 275 10 A 15 15 0 0 1 290 25" />
      <path d="M 10 425 A 15 15 0 0 0 25 440" />
      <path d="M 290 425 A 15 15 0 0 1 275 440" />
    </svg>
  )
}

// ─── Player Popover ───────────────────────────────────────────────────────────

interface PlayerPopoverProps {
  bench: ConvocadoPlayer[]
  onSelect: (playerId: string) => void
  onClose: () => void
  anchorRef: React.RefObject<HTMLDivElement | null>
}

function PlayerPopover({ bench, onSelect, onClose, anchorRef }: PlayerPopoverProps) {
  const popRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        popRef.current &&
        !popRef.current.contains(e.target as Node) &&
        !anchorRef.current?.contains(e.target as Node)
      ) {
        onClose()
      }
    }
    function keyHandler(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("mousedown", handler)
    document.addEventListener("keydown", keyHandler)
    return () => {
      document.removeEventListener("mousedown", handler)
      document.removeEventListener("keydown", keyHandler)
    }
  }, [onClose, anchorRef])

  return (
    <div
      ref={popRef}
      className="absolute z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 w-52 overflow-hidden"
      style={{
        top: "calc(100% + 8px)",
        left: "50%",
        transform: "translateX(-50%)",
      }}
    >
      <div className="px-3 py-2.5 border-b border-gray-100 bg-gray-50">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
          Seleccionar jugador
        </p>
      </div>

      {bench.length === 0 ? (
        <div className="px-3 py-4 text-center text-xs text-gray-400 font-medium">
          No hay jugadores en el banquillo
        </div>
      ) : (
        <ul className="max-h-52 overflow-y-auto py-1">
          {bench.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => { onSelect(p.id); onClose() }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-blue-50 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-black text-gray-600 shrink-0">
                  {p.dorsal ?? "?"}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-gray-900 truncate">
                    {playerName(p)}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function InteractivePitch({
  partidoId,
  convocados,
  teamColor,
  readOnly = false,
}: InteractivePitchProps) {
  // Detect saved formation from DB if any player has slot_index
  const savedFormation: FormationKey =
    (FORMATION_KEYS.find((fk) => {
      const savedPlayers = convocados.filter(
        (p) => p.slot_index != null && p.slot_index < FORMATIONS[fk].length
      )
      return savedPlayers.length > 0
    }) as FormationKey) ?? "4-3-3"

  const [formation, setFormation] = useState<FormationKey>(savedFormation)
  const slots = FORMATIONS[formation]

  // assignments: slotIndex → playerId | null
  const [assignments, setAssignments] = useState<Record<number, string | null>>(
    () => initAssignments(convocados, slots.length)
  )
  const [openSlot, setOpenSlot] = useState<number | null>(null)
  const slotRefs = useRef<Record<number, React.RefObject<HTMLDivElement | null>>>({})

  // Reinit assignments when formation changes
  const prevFormation = useRef(formation)
  useEffect(() => {
    if (prevFormation.current !== formation) {
      prevFormation.current = formation
      // Keep players assigned to slots that still exist in the new formation
      setAssignments(initAssignments(
        convocados.map((p) => ({ ...p, slot_index: null, posicion_tactica: null })),
        FORMATIONS[formation].length
      ))
      setOpenSlot(null)
    }
  }, [formation, convocados])

  const [isSaving, setIsSaving] = useState(false)
  const [saveState, setSaveState] = useState<"idle" | "ok" | "error">("idle")
  const [saveError, setSaveError] = useState<string | null>(null)

  // Compute bench (convocados not assigned to any slot)
  const assignedPlayerIds = new Set(Object.values(assignments).filter(Boolean) as string[])
  const bench = convocados.filter((p) => !assignedPlayerIds.has(p.id))

  const playerById = useCallback(
    (id: string | null) => convocados.find((p) => p.id === id) ?? null,
    [convocados]
  )

  // ── Slot interactions ────────────────────────────────────────────────────

  const handleSlotClick = (slotIdx: number) => {
    if (readOnly) return
    if (assignments[slotIdx]) {
      // Already assigned — toggle open for replacement
      setOpenSlot(openSlot === slotIdx ? null : slotIdx)
    } else {
      setOpenSlot(openSlot === slotIdx ? null : slotIdx)
    }
  }

  const assignPlayer = (slotIdx: number, playerId: string) => {
    setAssignments((prev) => {
      // Remove this player from any other slot first
      const next = { ...prev }
      Object.keys(next).forEach((k) => {
        if (next[Number(k)] === playerId) next[Number(k)] = null
      })
      next[slotIdx] = playerId
      return next
    })
    setOpenSlot(null)
  }

  const removePlayer = (slotIdx: number) => {
    setAssignments((prev) => ({ ...prev, [slotIdx]: null }))
    setOpenSlot(null)
  }

  const resetAll = () => {
    const empty: Record<number, string | null> = {}
    slots.forEach((_, i) => (empty[i] = null))
    setAssignments(empty)
    setOpenSlot(null)
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setIsSaving(true)
    setSaveState("idle")
    setSaveError(null)

    const lineupAssignments: LineupAssignment[] = Object.entries(assignments)
      .filter(([, playerId]) => playerId !== null)
      .map(([slotIdx, playerId]) => ({
        player_id: playerId as string,
        posicion_tactica: slots[Number(slotIdx)].label,
        slot_index: Number(slotIdx),
      }))

    const result = await saveLineup(partidoId, lineupAssignments)
    setIsSaving(false)

    if (result.success) {
      setSaveState("ok")
      setTimeout(() => setSaveState("idle"), 3000)
    } else {
      setSaveState("error")
      setSaveError(result.error ?? "Error desconocido")
    }
  }

  // Ensure slotRefs entries exist
  slots.forEach((_, i) => {
    if (!slotRefs.current[i]) {
      slotRefs.current[i] = { current: null }
    }
  })

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">

      {/* ── Controls bar ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Formation selector */}
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap">
            Sistema de juego
          </label>
          <div className="relative">
            <select
              value={formation}
              onChange={(e) => setFormation(e.target.value as FormationKey)}
              disabled={readOnly}
              className="appearance-none bg-white border border-gray-200 rounded-xl pl-3 pr-8 py-1.5 text-sm font-bold text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {FORMATION_KEYS.map((fk) => (
                <option key={fk} value={fk}>
                  {fk}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          </div>
        </div>

        {/* Action buttons */}
        {!readOnly && (
          <div className="flex items-center gap-2">
            <button
              onClick={resetAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-all shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Limpiar
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-200 transition-all disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Guardando…
                </>
              ) : saveState === "ok" ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Guardado
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Guardar Alineación
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* ── Save feedback ───────────────────────────────────────────── */}
      {saveState === "error" && saveError && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {saveError}
        </div>
      )}
      {saveState === "ok" && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-medium">
          <Check className="w-4 h-4 shrink-0" />
          Alineación guardada correctamente
        </div>
      )}

      {/* ── Pitch ──────────────────────────────────────────────────── */}
      <div className="flex gap-4 items-start">

        {/* The pitch itself */}
        <div
          className="relative rounded-2xl overflow-hidden shadow-lg shrink-0"
          style={{
            width: "min(360px, 100%)",
            paddingBottom: "130%",
            maxWidth: "360px",
            background:
              "linear-gradient(180deg, #16a34a 0%, #15803d 50%, #16a34a 100%)",
          }}
        >
          {/* Grass stripes */}
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="absolute left-0 right-0"
                style={{
                  top: `${i * 12.5}%`,
                  height: "12.5%",
                  backgroundColor: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.12)",
                }}
              />
            ))}
          </div>

          <PitchMarkings />

          {/* Slots */}
          {slots.map((slot, slotIdx) => {
            const assignedId = assignments[slotIdx]
            const assignedPlayer = playerById(assignedId ?? null)
            const isOpen = openSlot === slotIdx

            return (
              <div
                key={slot.id}
                ref={(el) => {
                  slotRefs.current[slotIdx] = { current: el }
                }}
                className="absolute flex flex-col items-center gap-0.5"
                style={{
                  left: `${slot.posX}%`,
                  top: `${slot.posY}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                {assignedPlayer ? (
                  /* ── Assigned slot ── */
                  <div className="relative group flex flex-col items-center gap-0.5">
                    <button
                      onClick={() => handleSlotClick(slotIdx)}
                      className="relative w-9 h-9 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white text-[10px] font-black transition-transform hover:scale-110 active:scale-95"
                      style={{ backgroundColor: teamColor }}
                      title={playerName(assignedPlayer)}
                    >
                      {assignedPlayer.dorsal ?? "#"}
                      {/* Remove button */}
                      {!readOnly && (
                        <button
                          onClick={(e) => { e.stopPropagation(); removePlayer(slotIdx) }}
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 border-2 border-white text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </button>
                    <div className="bg-black/60 backdrop-blur-sm text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap max-w-[60px] truncate">
                      {playerName(assignedPlayer, true)}
                    </div>

                    {/* Popover for replacement */}
                    {isOpen && !readOnly && (
                      <PlayerPopover
                        bench={bench}
                        onSelect={(pid) => assignPlayer(slotIdx, pid)}
                        onClose={() => setOpenSlot(null)}
                        anchorRef={slotRefs.current[slotIdx]}
                      />
                    )}
                  </div>
                ) : (
                  /* ── Empty slot ── */
                  <div className="relative flex flex-col items-center gap-0.5">
                    <button
                      onClick={() => handleSlotClick(slotIdx)}
                      disabled={readOnly}
                      className={[
                        "w-9 h-9 rounded-full border-2 border-dashed border-white/50 bg-white/10",
                        "flex items-center justify-center transition-all",
                        readOnly
                          ? "cursor-default"
                          : "hover:bg-white/25 hover:border-white/80 hover:scale-110 active:scale-95 cursor-pointer",
                      ].join(" ")}
                      title={`Asignar ${slot.label}`}
                    >
                      {!readOnly && (
                        <UserPlus className="w-3.5 h-3.5 text-white/60" />
                      )}
                    </button>
                    <div className="text-white/70 text-[9px] font-bold tracking-widest uppercase">
                      {slot.label}
                    </div>

                    {/* Popover */}
                    {isOpen && !readOnly && (
                      <PlayerPopover
                        bench={bench}
                        onSelect={(pid) => assignPlayer(slotIdx, pid)}
                        onClose={() => setOpenSlot(null)}
                        anchorRef={slotRefs.current[slotIdx]}
                      />
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Bench (right side panel) ────────────────────────────── */}
        <div className="flex-1 min-w-0">
          <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-3 py-2.5 border-b border-gray-100 bg-white/80">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Banquillo · {bench.length} jugadores
              </p>
            </div>
            {bench.length === 0 ? (
              <div className="px-3 py-6 text-center">
                <Check className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                <p className="text-xs text-gray-400 font-medium">
                  Todos colocados
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                {bench.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-2.5 px-3 py-2 hover:bg-white transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[11px] font-black text-gray-600 shrink-0">
                      {p.dorsal ?? "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-gray-800 truncate">
                        {playerName(p)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Not-convocated warning */}
            {convocados.length === 0 && (
              <div className="px-3 py-4 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-gray-500">
                  No hay jugadores convocados para este partido. Añade
                  convocatorias primero.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
