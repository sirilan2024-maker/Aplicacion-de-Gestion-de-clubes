"use client"

import { useState, useEffect, useRef, useTransition } from "react"
import { addMatchEvent, deleteMatchEvent, AddMatchEventPayload } from "@/lib/matches-actions"
import { MatchEvent, TipoEvento } from "@/types/matches"
import {
  Zap, Goal, AlertTriangle, ArrowRightLeft, X, Loader2,
  ChevronDown, Trash2, Plus, Activity
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConvocadoBasic {
  id: string
  first_name: string
  last_name: string
  dorsal?: number | null
  estado_asistencia: 'Pendiente' | 'Confirmado' | 'Ausente'
}

interface LiveMatchPanelProps {
  partidoId: string
  convocados: ConvocadoBasic[]
  initialEvents: MatchEvent[]
  teamColor: string
}

// ─── Event config ─────────────────────────────────────────────────────────────

interface EventConfig {
  label: string
  icon: string        // emoji for timeline
  color: string       // Tailwind bg class
  text: string        // Tailwind text class
  requiresPlayer: boolean
}

const EVENT_CONFIG: Record<TipoEvento, EventConfig> = {
  'Gol':             { label: 'Gol',            icon: '⚽', color: 'bg-emerald-500', text: 'text-emerald-700', requiresPlayer: true  },
  'Asistencia':      { label: 'Asistencia',     icon: '🎯', color: 'bg-blue-500',    text: 'text-blue-700',    requiresPlayer: true  },
  'Tarjeta Amarilla':{ label: 'T. Amarilla',    icon: '🟨', color: 'bg-amber-400',   text: 'text-amber-700',   requiresPlayer: true  },
  'Tarjeta Roja':    { label: 'T. Roja',        icon: '🟥', color: 'bg-red-500',     text: 'text-red-700',     requiresPlayer: true  },
  'Cambio Entra':    { label: 'Entra',          icon: '🔼', color: 'bg-teal-500',    text: 'text-teal-700',    requiresPlayer: true  },
  'Cambio Sale':     { label: 'Sale',           icon: '🔽', color: 'bg-orange-400',  text: 'text-orange-700',  requiresPlayer: true  },
  'Penalty':         { label: 'Penalty',        icon: '🎽', color: 'bg-violet-500',  text: 'text-violet-700',  requiresPlayer: false },
  'Gol en Propia':   { label: 'Autogol',        icon: '🔴', color: 'bg-rose-600',    text: 'text-rose-700',    requiresPlayer: false },
}

const QUICK_ACTION_TYPES: TipoEvento[] = [
  'Gol', 'Asistencia', 'Tarjeta Amarilla', 'Tarjeta Roja',
  'Cambio Entra', 'Cambio Sale', 'Penalty', 'Gol en Propia',
]

// ─── Add Event Modal ──────────────────────────────────────────────────────────

interface AddEventModalProps {
  tipoEvento: TipoEvento
  convocados: ConvocadoBasic[]
  onClose: () => void
  onSave: (payload: Omit<AddMatchEventPayload, 'partido_id'>) => void
  isSaving: boolean
}

function AddEventModal({ tipoEvento, convocados, onClose, onSave, isSaving }: AddEventModalProps) {
  const cfg = EVENT_CONFIG[tipoEvento]
  const [minuto, setMinuto] = useState(45)
  const [playerId, setPlayerId] = useState("")
  const [notas, setNotas] = useState("")
  const overlayRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [onClose])

  // Confirmed players only
  const confirmados = convocados.filter(p => p.estado_asistencia === 'Confirmado')

  const canSubmit = !cfg.requiresPlayer || playerId !== ""

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className={`px-5 py-4 text-white flex items-center justify-between ${cfg.color}`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{cfg.icon}</span>
            <div>
              <p className="font-black text-base">Registrar {cfg.label}</p>
              <p className="text-white/70 text-xs">Introduce los datos del evento</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Minuto */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400 block mb-1.5">
              Minuto
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={130}
                value={minuto}
                onChange={e => setMinuto(Number(e.target.value))}
                className="flex-1 h-2 rounded-full accent-blue-600"
              />
              <div className="w-14 h-10 rounded-xl border-2 border-blue-200 bg-blue-50 flex items-center justify-center">
                <span className="font-black text-blue-700 text-lg">{minuto}'</span>
              </div>
            </div>
          </div>

          {/* Jugador */}
          {cfg.requiresPlayer && (
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400 block mb-1.5">
                Jugador {confirmados.length === 0 && <span className="text-red-400">(sin confirmados)</span>}
              </label>
              <div className="relative">
                <select
                  value={playerId}
                  onChange={e => setPlayerId(e.target.value)}
                  className="w-full appearance-none bg-white border border-gray-200 rounded-xl pl-3 pr-8 py-2.5 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Seleccionar jugador —</option>
                  {confirmados.map(p => (
                    <option key={p.id} value={p.id}>
                      #{p.dorsal ?? '?'} {p.first_name} {p.last_name}
                    </option>
                  ))}
                  {convocados
                    .filter(p => p.estado_asistencia !== 'Confirmado')
                    .map(p => (
                      <option key={p.id} value={p.id} className="text-gray-400">
                        #{p.dorsal ?? '?'} {p.first_name} {p.last_name} (no confirmado)
                      </option>
                    ))
                  }
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400 block mb-1.5">
              Notas <span className="text-gray-300 normal-case">(opcional)</span>
            </label>
            <input
              type="text"
              placeholder="Ej: Cabezazo en el área..."
              value={notas}
              onChange={e => setNotas(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => onSave({
                tipo_evento: tipoEvento,
                minuto,
                player_id: playerId || null,
                notas: notas || null,
              })}
              disabled={!canSubmit || isSaving}
              className={[
                "flex-1 py-2.5 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-all",
                cfg.color,
                (!canSubmit || isSaving) ? "opacity-60 cursor-not-allowed" : "hover:opacity-90",
              ].join(" ")}
            >
              {isSaving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando…</>
                : <><Plus className="w-4 h-4" /> Registrar</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Timeline Event Row ───────────────────────────────────────────────────────

function TimelineEvent({
  event,
  onDelete,
}: {
  event: MatchEvent
  onDelete: (id: string) => void
}) {
  const cfg = EVENT_CONFIG[event.tipo_evento]
  const [isPending, startTransition] = useTransition()

  const playerName = event.player
    ? `${event.player.first_name} ${event.player.last_name}`
    : null

  return (
    <div className="flex items-center gap-3 group py-2 px-1 rounded-xl hover:bg-gray-50 transition-colors">
      {/* Minuto */}
      <div className="w-10 text-right shrink-0">
        <span className="text-[11px] font-black text-gray-400">{event.minuto}'</span>
      </div>

      {/* Dot + line */}
      <div className="flex flex-col items-center shrink-0">
        <div className={`w-7 h-7 rounded-full ${cfg.color} flex items-center justify-center text-sm shadow-sm`}>
          {cfg.icon}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900 leading-tight">
          {cfg.label}
          {playerName && (
            <span className="font-medium text-gray-500 ml-1">· {playerName}</span>
          )}
        </p>
        {event.notas && (
          <p className="text-[11px] text-gray-400 truncate mt-0.5">{event.notas}</p>
        )}
      </div>

      {/* Delete */}
      <button
        onClick={() => startTransition(() => onDelete(event.id))}
        disabled={isPending}
        className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
        title="Eliminar evento"
      >
        {isPending
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <Trash2 className="w-3.5 h-3.5" />
        }
      </button>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function LiveMatchPanel({
  partidoId,
  convocados,
  initialEvents,
  teamColor,
}: LiveMatchPanelProps) {
  const [events, setEvents] = useState<MatchEvent[]>(initialEvents)
  const [modalTipo, setModalTipo] = useState<TipoEvento | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Score counters derived from events
  const goles = events.filter(e => e.tipo_evento === 'Gol').length
  const tarjetasAmarillas = events.filter(e => e.tipo_evento === 'Tarjeta Amarilla').length
  const tarjetasRojas = events.filter(e => e.tipo_evento === 'Tarjeta Roja').length

  const handleSaveEvent = async (payload: Omit<AddMatchEventPayload, 'partido_id'>) => {
    setIsSaving(true)
    const result = await addMatchEvent({ ...payload, partido_id: partidoId })
    setIsSaving(false)
    if (result.success && result.id) {
      // Optimistically add to local state
      const p = payload.player_id
        ? convocados.find(c => c.id === payload.player_id)
        : null

      const newEvent: MatchEvent = {
        id: result.id,
        partido_id: partidoId,
        player_id: payload.player_id ?? null,
        tipo_evento: payload.tipo_evento,
        minuto: payload.minuto,
        notas: payload.notas ?? null,
        created_at: new Date().toISOString(),
        player: p ? {
          id: p.id,
          first_name: p.first_name,
          last_name: p.last_name,
          dorsal: p.dorsal ?? undefined,
        } : undefined,
      }
      setEvents(prev => [...prev, newEvent].sort((a, b) => a.minuto - b.minuto))
      setModalTipo(null)
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    const result = await deleteMatchEvent(eventId, partidoId)
    if (result.success) {
      setEvents(prev => prev.filter(e => e.id !== eventId))
    }
  }

  const sortedEvents = [...events].sort((a, b) => a.minuto - b.minuto)

  return (
    <div className="space-y-5">

      {/* ── Live score banner ───────────────────────────────────────── */}
      <div
        className="rounded-2xl p-4 flex items-center justify-between text-white shadow-md"
        style={{ background: `linear-gradient(135deg, ${teamColor}cc, ${teamColor})` }}
      >
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 animate-pulse" />
          <span className="text-sm font-bold">En Directo</span>
        </div>
        <div className="flex items-center gap-5 text-sm font-bold">
          <span>⚽ {goles} gol{goles !== 1 ? 'es' : ''}</span>
          <span>🟨 {tarjetasAmarillas}</span>
          <span>🟥 {tarjetasRojas}</span>
        </div>
      </div>

      {/* ── Quick action buttons ─────────────────────────────────────── */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">
          Acciones rápidas
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {QUICK_ACTION_TYPES.map((tipo) => {
            const cfg = EVENT_CONFIG[tipo]
            return (
              <button
                key={tipo}
                onClick={() => setModalTipo(tipo)}
                className={[
                  "flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 border-transparent",
                  "transition-all hover:scale-105 hover:border-current hover:shadow-md active:scale-95",
                  "bg-gray-50",
                  cfg.text,
                ].join(" ")}
              >
                <span className="text-2xl">{cfg.icon}</span>
                <span className="text-[11px] font-bold">{cfg.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Timeline ─────────────────────────────────────────────────── */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1">
          Línea temporal · {events.length} evento{events.length !== 1 ? 's' : ''}
        </p>

        {sortedEvents.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-gray-400">
            <Zap className="w-8 h-8 opacity-30" />
            <p className="text-sm font-medium">Sin eventos todavía</p>
            <p className="text-xs">Usa los botones de arriba para registrar goles, tarjetas y cambios</p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[54px] top-0 bottom-0 w-px bg-gray-100" />
            <div className="space-y-0">
              {sortedEvents.map(event => (
                <TimelineEvent
                  key={event.id}
                  event={event}
                  onDelete={handleDeleteEvent}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Modal ────────────────────────────────────────────────────── */}
      {modalTipo && (
        <AddEventModal
          tipoEvento={modalTipo}
          convocados={convocados}
          onClose={() => setModalTipo(null)}
          onSave={handleSaveEvent}
          isSaving={isSaving}
        />
      )}
    </div>
  )
}
