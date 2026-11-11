"use client"

import { useState, useEffect } from "react"
import { X, Check, FileText } from "lucide-react"
import { PlayerAvatar } from "./PlayerAvatar"

interface AttendanceJustificationModalProps {
  isOpen: boolean
  onClose: () => void
  player: {
    id: string
    first_name?: string
    last_name?: string
    posicion?: string
    posicion_principal?: string
    photo_url?: string | null
    avatar_url?: string | null
    foto_url?: string | null
    image_url?: string | null
    dorsal?: string | number | null
  } | null
  currentMotive: string
  onSaveMotive: (motive: string) => void
}

const COMMON_MOTIVES = [
  { label: "Enfermedad / Malestar", icon: "🤒" },
  { label: "Lesión deportiva", icon: "🩹" },
  { label: "Estudios / Exámenes", icon: "📚" },
  { label: "Viaje familiar", icon: "🚗" },
  { label: "Compromiso familiar", icon: "👨‍👩‍👧" },
  { label: "Competición escolar / Otro deporte", icon: "⚽" }
]

export function AttendanceJustificationModal({
  isOpen,
  onClose,
  player,
  currentMotive,
  onSaveMotive
}: AttendanceJustificationModalProps) {
  const [selectedMotive, setSelectedMotive] = useState(currentMotive || "")
  const [customText, setCustomText] = useState("")

  useEffect(() => {
    if (isOpen) {
      setSelectedMotive(currentMotive || "")
      const isPreset = COMMON_MOTIVES.some(m => m.label === currentMotive)
      setCustomText(isPreset ? "" : (currentMotive || ""))
    }
  }, [isOpen, currentMotive])

  if (!isOpen || !player) return null

  const handleSelectPreset = (label: string) => {
    setSelectedMotive(label)
    setCustomText("")
  }

  const handleCustomChange = (val: string) => {
    setCustomText(val)
    setSelectedMotive(val)
  }

  const handleSave = () => {
    const finalMotive = customText.trim() || selectedMotive.trim() || "Justificado por la familia / entrenador"
    onSaveMotive(finalMotive)
    onClose()
  }

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">Añadir Motivo de Justificación</h3>
              <p className="text-xs text-slate-500 font-medium">Registro de ausencia justificada</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ficha Jugador */}
        <div className="p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-amber-50/60 border border-amber-200/60 rounded-2xl">
            <PlayerAvatar
              player={player}
              dorsal={player.dorsal}
              size="lg"
            />
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wider text-amber-800">Jugador Convocado</p>
              <p className="text-sm font-black text-slate-900 leading-tight">
                {player.first_name} {player.last_name}
              </p>
            </div>
          </div>

          {/* Opciones Rápidas */}
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-slate-500 block mb-2">
              Motivos frecuentes:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {COMMON_MOTIVES.map(m => {
                const isSelected = selectedMotive === m.label && !customText.trim()
                return (
                  <button
                    key={m.label}
                    type="button"
                    onClick={() => handleSelectPreset(m.label)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      isSelected
                        ? "bg-amber-500 text-white border-amber-600 shadow-xs ring-2 ring-amber-200"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-amber-50/50 hover:border-amber-200"
                    }`}
                  >
                    <span className="text-base shrink-0">{m.icon}</span>
                    <span className="truncate leading-tight">{m.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Motivo Personalizado */}
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-slate-500 block mb-1.5">
              O escribe un motivo personalizado:
            </label>
            <textarea
              rows={2}
              value={customText}
              onChange={(e) => handleCustomChange(e.target.value)}
              placeholder="Ej: Cita médica especialista, permiso autorizado..."
              className="w-full text-xs font-medium text-slate-800 p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
            />
          </div>
        </div>

        {/* Botones Acción */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 rounded-xl transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 text-xs font-black text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            Guardar Motivo
          </button>
        </div>
      </div>
    </div>
  )
}
