"use client"

import React, { useMemo, useState, useEffect } from "react"
import { X, Calendar, TrendingUp, Shield, FileText, Loader2 } from "lucide-react"
import { AttendanceRecordDTO, getGlobalAttendanceAction } from "@/app/actions/attendance-actions"

interface AttendancePlayerDrawerProps {
  playerId: string | null
  onClose: () => void
  records: AttendanceRecordDTO[]
}

export function AttendancePlayerDrawer({ playerId, onClose, records }: AttendancePlayerDrawerProps) {
  const [fullHistory, setFullHistory] = useState<AttendanceRecordDTO[] | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Cargar todo el histórico real del jugador independientemente del filtro de período activo
  useEffect(() => {
    if (!playerId) {
      setFullHistory(null)
      return
    }
    let isMounted = true
    setLoadingHistory(true)
    getGlobalAttendanceAction({ playerId })
      .then((res) => {
        if (isMounted && res.success && res.records) {
          setFullHistory(res.records)
        }
      })
      .finally(() => {
        if (isMounted) setLoadingHistory(false)
      })
    return () => {
      isMounted = false
    }
  }, [playerId])

  // Filtrar registros reales de este jugador (priorizando el histórico completo del servidor)
  const playerRecords = useMemo(() => {
    if (!playerId) return []
    const source = fullHistory !== null ? fullHistory : records.filter((r) => r.playerId === playerId)
    return [...source].sort((a, b) => (b.date || "").localeCompare(a.date || ""))
  }, [playerId, fullHistory, records])

  // Obtener metadatos del jugador a partir de los registros reales o de la lista de registros en memoria
  const playerMeta = useMemo(() => {
    const candidate = playerRecords[0] || records.find((r) => r.playerId === playerId)
    if (!candidate) return null
    return {
      id: candidate.playerId,
      name: candidate.playerName,
      dorsal: candidate.playerDorsal,
      avatar: candidate.playerAvatar,
      teamName: candidate.teamName,
      teamCategory: candidate.teamCategory,
    }
  }, [playerRecords, records, playerId])

  // Métricas acumuladas del jugador
  const stats = useMemo(() => {
    let presentes = 0
    let ausentes = 0
    let justificados = 0
    let retrasos = 0
    let lesionados = 0

    playerRecords.forEach((r) => {
      if (r.status === "presente") presentes++
      else if (r.status === "ausente") ausentes++
      else if (r.status === "justificado") justificados++
      else if (r.status === "retraso") retrasos++
      else if (r.status === "lesionado") lesionados++
    })

    const total = playerRecords.length
    const rate = total > 0 ? Math.round((presentes / total) * 100) : null

    return { total, presentes, ausentes, justificados, retrasos, lesionados, rate }
  }, [playerRecords])

  // Evolución mensual (únicamente meses con datos reales)
  const monthlyEvolution = useMemo(() => {
    const map = new Map<string, { label: string; presentes: number; total: number }>()

    playerRecords.forEach((r) => {
      if (!r.date) return
      const monthKey = r.date.substring(0, 7) // YYYY-MM
      if (!map.has(monthKey)) {
        let label = monthKey
        try {
          const dt = new Date(monthKey + "-01T00:00:00")
          const monthName = dt.toLocaleDateString("es-ES", { month: "long", year: "numeric" })
          label = monthName.charAt(0).toUpperCase() + monthName.slice(1)
        } catch {
          label = monthKey
        }
        map.set(monthKey, { label, presentes: 0, total: 0 })
      }

      const item = map.get(monthKey)!
      item.total++
      if (r.status === "presente") item.presentes++
    })

    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, data]) => ({
        key,
        label: data.label,
        rate: data.total > 0 ? Math.round((data.presentes / data.total) * 100) : 0,
        total: data.total,
        presentes: data.presentes,
      }))
  }, [playerRecords])

  if (!playerId) return null

  // Si está cargando y todavía no hay registros
  if (loadingHistory && playerRecords.length === 0) {
    return (
      <div className="fixed inset-0 z-50 overflow-hidden">
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={onClose} />
        <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
          <div className="w-screen max-w-md bg-white shadow-2xl p-6 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-xs font-semibold text-slate-500">Cargando historial de asistencia...</p>
          </div>
        </div>
      </div>
    )
  }

  // Si no se encuentran registros para este jugador
  if (!playerMeta || playerRecords.length === 0) {
    return (
      <div className="fixed inset-0 z-50 overflow-hidden">
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={onClose} />
        <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
          <div className="w-screen max-w-md bg-white shadow-2xl p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-slate-900 text-base">Ficha del Jugador</h3>
                <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-slate-500">Sin datos de asistencia registrados para este jugador.</p>
            </div>
            <button onClick={onClose} className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-bold">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    )
  }

  const formatSessionDate = (d?: string) => {
    if (!d) return "Sin fecha"
    try {
      const parts = d.split("-")
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`
      }
      return d
    } catch {
      return d
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Fondo oscurecido con desenfoque suave */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md sm:max-w-lg bg-white shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
          {/* Cabecera del Drawer */}
          <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/30 border border-blue-400/30 text-white font-black text-base flex items-center justify-center shrink-0">
                {playerMeta.dorsal !== null ? `#${playerMeta.dorsal}` : playerMeta.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-black text-white truncate tracking-tight">
                  {playerMeta.name}
                </h2>
                <div className="flex items-center gap-2 text-xs text-blue-200 mt-0.5">
                  <Shield className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{playerMeta.teamName}</span>
                  {playerMeta.teamCategory && (
                    <span className="px-1.5 py-0.2 rounded bg-blue-900/60 text-[10px] uppercase font-bold text-blue-200">
                      {playerMeta.teamCategory}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Cerrar ficha"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Contenido scrolleable */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            {/* Resumen de Asistencia */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Rendimiento Global
                </span>
                <div className="flex items-center gap-1.5 text-blue-600 font-black text-xl">
                  <TrendingUp className="w-4 h-4" />
                  <span>{stats.rate !== null ? `${stats.rate}%` : "Sin datos"}</span>
                </div>
              </div>

              {/* Barra de progreso */}
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${stats.rate !== null ? Math.min(stats.rate, 100) : 0}%` }}
                />
              </div>

              {/* Conteo de sesiones */}
              <div className="grid grid-cols-5 gap-1.5 pt-2 text-center">
                <div className="bg-white p-2 rounded-xl border border-slate-200/80">
                  <div className="text-[10px] font-bold text-emerald-600 uppercase">Pres.</div>
                  <div className="text-sm font-black text-slate-900">{stats.presentes}</div>
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-200/80">
                  <div className="text-[10px] font-bold text-rose-600 uppercase">Aus.</div>
                  <div className="text-sm font-black text-slate-900">{stats.ausentes}</div>
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-200/80">
                  <div className="text-[10px] font-bold text-amber-600 uppercase">Just.</div>
                  <div className="text-sm font-black text-slate-900">{stats.justificados}</div>
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-200/80">
                  <div className="text-[10px] font-bold text-sky-600 uppercase">Retr.</div>
                  <div className="text-sm font-black text-slate-900">{stats.retrasos}</div>
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-200/80">
                  <div className="text-[10px] font-bold text-purple-600 uppercase">Bajas</div>
                  <div className="text-sm font-black text-slate-900">{stats.lesionados}</div>
                </div>
              </div>
            </div>

            {/* Evolución Mensual */}
            {monthlyEvolution.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>Evolución Mensual</span>
                </h3>

                <div className="space-y-2 bg-white border border-slate-200 rounded-2xl p-4">
                  {monthlyEvolution.map((m) => (
                    <div key={m.key} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">{m.label}</span>
                        <span className="font-black text-slate-900">
                          {m.rate}% <span className="text-[10px] text-slate-400 font-normal">({m.presentes}/{m.total})</span>
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-blue-600 h-full rounded-full transition-all"
                          style={{ width: `${m.rate}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Historial Completo de Sesiones */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Historial de Sesiones ({playerRecords.length})</span>
              </h3>

              <div className="space-y-2.5">
                {playerRecords.map((r) => (
                  <div
                    key={r.id}
                    className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-slate-900">{r.eventName}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          <span>{formatSessionDate(r.date)}</span>
                          <span className="text-slate-300">·</span>
                          <span>{r.teamName}</span>
                          {r.activityType && (
                            <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                              {r.activityType}
                            </span>
                          )}
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase shrink-0 ${
                          r.status === "presente"
                            ? "bg-emerald-100 text-emerald-800"
                            : r.status === "ausente"
                            ? "bg-rose-100 text-rose-800"
                            : r.status === "justificado"
                            ? "bg-amber-100 text-amber-800"
                            : r.status === "retraso"
                            ? "bg-sky-100 text-sky-800"
                            : "bg-purple-100 text-purple-800"
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>

                    {r.notes && (
                      <div className="text-[11px] text-slate-600 bg-amber-50/70 border border-amber-200/50 p-2 rounded-lg italic">
                        Nota: {r.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pie del Drawer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="text-xs text-slate-400">Modo supervisión ejecutiva (solo lectura)</span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}