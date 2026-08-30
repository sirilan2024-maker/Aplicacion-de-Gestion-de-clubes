"use client"

import React, { useState } from "react"
import Link from "next/link"
import { Calendar, ChevronDown, ChevronUp, Users, CheckCircle2, XCircle, AlertCircle, Clock, HelpCircle, Dumbbell, Trophy } from "lucide-react"
import { AttendanceRecordDTO } from "@/app/actions/attendance-actions"

interface AttendanceDaysViewProps {
  records: AttendanceRecordDTO[]
  onSelectPlayer?: (playerId: string) => void
  onSelectSession?: (session: {
    eventName: string
    activityType: string
    date: string
    teamName: string
    teamCategory?: string
    players: AttendanceRecordDTO[]
  }) => void
}

interface SessionGroup {
  id: string
  teamName: string
  teamCategory: string
  eventName: string
  activityType: string
  presentes: number
  ausentes: number
  justificados: number
  retrasos: number
  lesionados: number
  total: number
  rate: number
  players: AttendanceRecordDTO[]
}

interface DateGroup {
  date: string
  formattedDate: string
  sessions: SessionGroup[]
  totalPresentes: number
  totalRecords: number
  rate: number
}

export function AttendanceDaysView({ records, onSelectPlayer, onSelectSession }: AttendanceDaysViewProps) {
  // Estado para expandir fechas (por defecto abiertas las 3 primeras)
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({})
  // Estado para expandir jugadores de una sesión concreta
  const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({})

  // Agrupación en memoria: Fecha -> Sesión/Equipo -> Jugadores
  const dateGroups: DateGroup[] = React.useMemo(() => {
    const datesMap = new Map<string, Map<string, SessionGroup>>()

    records.forEach((r) => {
      const d = r.date || "Sin fecha"
      if (!datesMap.has(d)) {
        datesMap.set(d, new Map())
      }
      const sessionMap = datesMap.get(d)!

      // Clave única por sesión (eventName + teamName)
      const sessionKey = `${r.teamName}_${r.eventName}_${r.activityType || "Otro"}`
      if (!sessionMap.has(sessionKey)) {
        sessionMap.set(sessionKey, {
          id: sessionKey,
          teamName: r.teamName,
          teamCategory: r.teamCategory,
          eventName: r.eventName,
          activityType: r.activityType || "Otro",
          presentes: 0,
          ausentes: 0,
          justificados: 0,
          retrasos: 0,
          lesionados: 0,
          total: 0,
          rate: 0,
          players: [],
        })
      }

      const sGroup = sessionMap.get(sessionKey)!
      sGroup.total++
      if (r.status === "presente") sGroup.presentes++
      else if (r.status === "ausente") sGroup.ausentes++
      else if (r.status === "justificado") sGroup.justificados++
      else if (r.status === "retraso") sGroup.retrasos++
      else if (r.status === "lesionado") sGroup.lesionados++
      sGroup.players.push(r)
    })

    // Convertir y ordenar fechas descendentes
    const result: DateGroup[] = []
    datesMap.forEach((sessionMap, d) => {
      let datePres = 0
      let dateTot = 0
      const sessionsArr: SessionGroup[] = []

      sessionMap.forEach((sg) => {
        sg.rate = sg.total > 0 ? Math.round((sg.presentes / sg.total) * 100) : 0
        datePres += sg.presentes
        dateTot += sg.total
        sessionsArr.push(sg)
      })

      // Formatear fecha en castellano
      let formatted = d
      if (d !== "Sin fecha") {
        try {
          const dt = new Date(d + "T00:00:00")
          formatted = dt.toLocaleDateString("es-ES", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        } catch {
          formatted = d
        }
      }

      result.push({
        date: d,
        formattedDate: formatted.charAt(0).toUpperCase() + formatted.slice(1),
        sessions: sessionsArr,
        totalPresentes: datePres,
        totalRecords: dateTot,
        rate: dateTot > 0 ? Math.round((datePres / dateTot) * 100) : 0,
      })
    })

    return result.sort((a, b) => b.date.localeCompare(a.date))
  }, [records])

  const toggleDate = (dateKey: string) => {
    setExpandedDates((prev) => ({
      ...prev,
      [dateKey]: prev[dateKey] === undefined ? false : !prev[dateKey],
    }))
  }

  const toggleSession = (sessKey: string) => {
    setExpandedSessions((prev) => ({
      ...prev,
      [sessKey]: !prev[sessKey],
    }))
  }

  if (dateGroups.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
        <Users className="w-12 h-12 mx-auto text-slate-300" />
        <p className="text-base font-semibold text-slate-700">No hay registros de asistencia para este período.</p>
        <p className="text-sm">Prueba a modificar los filtros seleccionados.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {dateGroups.map((dg, idx) => {
        // Por defecto, las primeras 3 fechas abiertas
        const isDateExpanded = expandedDates[dg.date] ?? idx < 3

        return (
          <div
            key={dg.date}
            className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all"
          >
            {/* Cabecera de Fecha */}
            <button
              onClick={() => toggleDate(dg.date)}
              className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left hover:bg-slate-50/70 transition-colors cursor-pointer border-b border-slate-100"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 font-black">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-black text-slate-900 truncate">
                    {dg.formattedDate}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {dg.sessions.length} {dg.sessions.length === 1 ? "sesión" : "sesiones"} · {dg.totalRecords} jugadores evaluados
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div className="text-sm sm:text-base font-black text-slate-900">{dg.rate}%</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Asistencia</div>
                </div>
                <div className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                  {isDateExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </div>
            </button>

            {/* Contenido de Sesiones de esa Fecha */}
            {isDateExpanded && (
              <div className="p-4 sm:p-5 space-y-4 bg-slate-50/40">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dg.sessions.map((session) => {
                    const isSessExpanded = !!expandedSessions[session.id]
                    const isMatch = session.activityType?.toLowerCase().includes("partido")

                    return (
                      <div
                        key={session.id}
                        className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3 flex flex-col justify-between"
                      >
                        {/* Cabecera de Sesión */}
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-slate-900">{session.teamName}</span>
                                {session.teamCategory && (
                                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-600 uppercase">
                                    {session.teamCategory}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1.5">
                                {isMatch ? (
                                  <Trophy className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                ) : (
                                  <Dumbbell className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                )}
                                <span>{session.eventName}</span>
                              </p>
                            </div>

                            <span
                              className={`px-2 py-1 rounded-lg text-xs font-black shrink-0 ${
                                session.rate >= 90
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : session.rate >= 75
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                            >
                              {session.rate}%
                            </span>
                          </div>

                          {/* Métricas de Asistencia */}
                          <div className="mt-3 flex items-center gap-2 text-xs font-semibold flex-wrap">
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              {session.presentes}/{session.total} presentes
                            </span>
                            {session.ausentes > 0 && (
                              <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100 flex items-center gap-1">
                                <XCircle className="w-3 h-3" />
                                {session.ausentes} ausente{session.ausentes > 1 ? "s" : ""}
                              </span>
                            )}
                            {session.justificados > 0 && (
                              <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                {session.justificados} justif.
                              </span>
                            )}
                            {session.retrasos > 0 && (
                              <span className="text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {session.retrasos} retraso{session.retrasos > 1 ? "s" : ""}
                              </span>
                            )}
                            {session.lesionados > 0 && (
                              <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100 flex items-center gap-1">
                                <HelpCircle className="w-3 h-3" />
                                {session.lesionados} baja{session.lesionados > 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Botones Ver Lista / Detalle */}
                        <div className="pt-2 border-t border-slate-100 space-y-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleSession(session.id)}
                              className="flex-1 py-1.5 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <span>{isSessExpanded ? "Ocultar jugadores" : "Ver jugadores"}</span>
                              {isSessExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>

                            {onSelectSession && (
                              <button
                                type="button"
                                onClick={() =>
                                  onSelectSession({
                                    eventName: session.eventName,
                                    activityType: session.activityType,
                                    date: dg.date,
                                    teamName: session.teamName,
                                    teamCategory: session.teamCategory,
                                    players: session.players,
                                  })
                                }
                                className="py-1.5 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer shrink-0"
                                title="Ver detalle de sesión"
                              >
                                Detalle
                              </button>
                            )}
                          </div>

                        {/* Desglose de Jugadores */}
                        {isSessExpanded && (
                          <div className="mt-2.5 pt-2 space-y-1.5 border-t border-slate-100 max-h-60 overflow-y-auto pr-1">
                            {session.players.map((p) => (
                              <div
                                key={p.id}
                                className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-50 hover:bg-slate-100/80 transition-colors"
                              >
                                <button
                                  type="button"
                                  onClick={() => onSelectPlayer ? onSelectPlayer(p.playerId) : undefined}
                                  className="font-medium text-slate-900 hover:text-blue-600 truncate max-w-[180px] text-left cursor-pointer"
                                  title="Ver ficha de asistencia del jugador"
                                >
                                  {p.playerDorsal !== null ? `#${p.playerDorsal} ` : ""}
                                  {p.playerName}
                                </button>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <span
                                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold capitalize ${
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
                                    {p.notes && (
                                      <span className="text-[10px] text-slate-400 italic max-w-[100px] truncate" title={p.notes}>
                                        {p.notes}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
