"use client"

import React, { useMemo } from "react"
import { X, Calendar, Shield, Users, CheckCircle2, XCircle, AlertCircle, Clock, HelpCircle, Dumbbell, Trophy } from "lucide-react"
import { AttendanceRecordDTO } from "@/app/actions/attendance-actions"

interface AttendanceSessionModalProps {
  session: {
    eventName: string
    activityType: string
    date: string
    teamName: string
    teamCategory?: string
    players: AttendanceRecordDTO[]
  } | null
  onClose: () => void
  onSelectPlayer?: (playerId: string) => void
}

export function AttendanceSessionModal({ session, onClose, onSelectPlayer }: AttendanceSessionModalProps) {
  const stats = useMemo(() => {
    if (!session || !session.players) return { presentes: 0, ausentes: 0, justificados: 0, retrasos: 0, lesionados: 0, total: 0, rate: null }

    let presentes = 0
    let ausentes = 0
    let justificados = 0
    let retrasos = 0
    let lesionados = 0

    session.players.forEach((p) => {
      if (p.status === "presente") presentes++
      else if (p.status === "ausente") ausentes++
      else if (p.status === "justificado") justificados++
      else if (p.status === "retraso") retrasos++
      else if (p.status === "lesionado") lesionados++
    })

    const total = session.players.length
    const rate = total > 0 ? Math.round((presentes / total) * 100) : null

    return { presentes, ausentes, justificados, retrasos, lesionados, total, rate }
  }, [session])

  if (!session) return null

  const formatDate = (d: string) => {
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

  const isMatch = session.activityType?.toLowerCase().includes("partido") || session.eventName?.toLowerCase().includes("partido")

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        className="fixed inset-0"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 z-10 flex flex-col max-h-[90vh]">
        {/* Cabecera de la Sesión */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shrink-0 ${
              isMatch
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "bg-blue-600/20 text-blue-300 border border-blue-400/30"
            }`}>
              {isMatch ? <Trophy className="w-6 h-6" /> : <Dumbbell className="w-6 h-6" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white truncate tracking-tight">
                  {session.eventName}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/10 text-white">
                  {session.activityType || "Sesión"}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-blue-200 mt-1 flex-wrap">
                <div className="flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-blue-300" />
                  <span className="font-semibold">{session.teamName}</span>
                  {session.teamCategory && (
                    <span className="px-1.5 py-0.2 rounded bg-blue-900/60 text-[10px] uppercase font-bold text-blue-200">
                      {session.teamCategory}
                    </span>
                  )}
                </div>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-300" />
                  <span>{formatDate(session.date)}</span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumen de KPIs de la sesión */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200/80 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center">
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 col-span-2 sm:col-span-1">
              <div className="text-[10px] font-bold uppercase text-slate-400">Ratio</div>
              <div className="text-base font-black text-blue-600">
                {stats.rate !== null ? `${stats.rate}%` : "Sin datos"}
              </div>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
              <div className="text-[10px] font-bold uppercase text-emerald-600">Presentes</div>
              <div className="text-base font-black text-slate-900">{stats.presentes}</div>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
              <div className="text-[10px] font-bold uppercase text-rose-600">Ausentes</div>
              <div className="text-base font-black text-slate-900">{stats.ausentes}</div>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
              <div className="text-[10px] font-bold uppercase text-amber-600">Justificados</div>
              <div className="text-base font-black text-slate-900">{stats.justificados}</div>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
              <div className="text-[10px] font-bold uppercase text-sky-600">Retrasos</div>
              <div className="text-base font-black text-slate-900">{stats.retrasos}</div>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
              <div className="text-[10px] font-bold uppercase text-purple-600">Bajas</div>
              <div className="text-base font-black text-slate-900">{stats.lesionados}</div>
            </div>
          </div>
        </div>

        {/* Lista de Jugadores de la Sesión */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span>Convocatoria y Asistencia ({session.players.length})</span>
            </span>
            <span className="text-[11px] text-slate-400">Pulsa un jugador para ver su ficha</span>
          </div>

          {session.players.length === 0 ? (
            <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl">
              <p className="text-xs text-slate-500 font-medium">No hay registros de asistencia para esta sesión.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 bg-white border border-slate-200 rounded-2xl overflow-hidden">
              {session.players.map((p) => (
                <div
                  key={p.id}
                  onClick={() => onSelectPlayer && onSelectPlayer(p.playerId)}
                  className="p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors">
                      {p.playerDorsal !== null ? `#${p.playerDorsal}` : p.playerName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                        {p.playerName}
                      </div>
                      {p.notes && (
                        <div className="text-[11px] text-amber-700 italic truncate mt-0.5">
                          Nota: {p.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase shrink-0 ${
                      p.status === "presente"
                        ? "bg-emerald-100 text-emerald-800"
                        : p.status === "ausente"
                        ? "bg-rose-100 text-rose-800"
                        : p.status === "justificado"
                        ? "bg-amber-100 text-amber-800"
                        : p.status === "retraso"
                        ? "bg-sky-100 text-sky-800"
                        : "bg-purple-100 text-purple-800"
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pie del modal */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
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
  )
}