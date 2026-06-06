"use client"

import { useState, useTransition } from "react"
import { updateAsistencia, EstadoAsistencia } from "@/lib/matches-actions"
import { CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react"

interface AttendanceToggleProps {
  partidoId: string
  playerId: string
  playerName: string
  currentState: EstadoAsistencia
}

const STATES: EstadoAsistencia[] = ["Pendiente", "Confirmado", "Ausente"]

const STATE_CONFIG: Record<EstadoAsistencia, {
  label: string
  icon: React.ElementType
  className: string
  next: EstadoAsistencia
}> = {
  Pendiente: {
    label: "Pendiente",
    icon: Clock,
    className: "bg-gray-100 text-gray-600 hover:bg-amber-50 hover:text-amber-700",
    next: "Confirmado",
  },
  Confirmado: {
    label: "Confirmado",
    icon: CheckCircle2,
    className: "bg-emerald-100 text-emerald-700 hover:bg-red-50 hover:text-red-600",
    next: "Ausente",
  },
  Ausente: {
    label: "Ausente",
    icon: XCircle,
    className: "bg-red-100 text-red-700 hover:bg-gray-100 hover:text-gray-600",
    next: "Pendiente",
  },
}

export function AttendanceToggle({
  partidoId,
  playerId,
  currentState,
}: AttendanceToggleProps) {
  const [estado, setEstado] = useState<EstadoAsistencia>(currentState)
  const [isPending, startTransition] = useTransition()

  const cfg = STATE_CONFIG[estado]
  const Icon = cfg.icon

  const handleClick = () => {
    const next = cfg.next
    startTransition(async () => {
      const result = await updateAsistencia(partidoId, playerId, next)
      if (result.success) setEstado(next)
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      title={`Estado: ${estado}. Click para cambiar.`}
      className={[
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all",
        cfg.className,
        isPending ? "opacity-60 cursor-wait" : "cursor-pointer",
      ].join(" ")}
    >
      {isPending ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <Icon className="w-3 h-3" />
      )}
      {cfg.label}
    </button>
  )
}
