"use client"

import { ClipboardCheck } from "lucide-react"
import { use } from "react"

export default function TeamAttendancePage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = use(params)
  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 border-b pb-4">
        <ClipboardCheck className="text-emerald-500" size={32} />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Control de Asistencia</h1>
          <p className="text-slate-500">Pasa lista en entrenamientos y partidos.</p>
        </div>
      </div>
      <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-slate-500">
        Próximamente: Módulo de toma de asistencia en tiempo real.
      </div>
    </div>
  )
}
