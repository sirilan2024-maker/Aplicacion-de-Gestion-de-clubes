"use client"

import React, { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight, Users, Calendar, X } from "lucide-react"
import { AttendanceRecordDTO } from "@/app/actions/attendance-actions"

interface AttendanceMatrixViewProps {
  records: AttendanceRecordDTO[]
  teams: Array<{ id: string; name: string; category: string }>
  onSelectPlayer: (playerId: string) => void
  currentMonth: Date
  onMonthChange: (newDate: Date) => void
}

interface PlayerMatrixRow {
  playerId: string
  playerName: string
  playerDorsal: number | null
  playerAvatar: string | null
  teamName: string
  teamCategory: string
  days: Record<number, AttendanceRecordDTO[]>
  presentes: number
  ausentes: number
  justificados: number
  retrasos: number
  lesionados: number
  totalSessions: number
  rate: number | null
}

export function AttendanceMatrixView({
  records,
  onSelectPlayer,
  currentMonth,
  onMonthChange,
}: AttendanceMatrixViewProps) {
  // Modal de detalle de día (cuando hay 1 o más sesiones en un día concreto)
  const [selectedDayDetail, setSelectedDayDetail] = useState<{
    playerName: string
    dayNumber: number
    sessions: AttendanceRecordDTO[]
  } | null>(null)

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth() // 0-indexed

  // Nombre del mes en español
  const monthName = useMemo(() => {
    const str = currentMonth.toLocaleDateString("es-ES", { month: "long", year: "numeric" })
    return str.charAt(0).toUpperCase() + str.slice(1)
  }, [currentMonth])

  // Total de días del mes (28, 29, 30 o 31)
  const daysInMonth = useMemo(() => {
    return new Date(year, month + 1, 0).getDate()
  }, [year, month])

  const daysArray = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1)
  }, [daysInMonth])

  // Construir filas de la matriz agrupadas por jugador
  const playerRows: PlayerMatrixRow[] = useMemo(() => {
    const map = new Map<string, PlayerMatrixRow>()

    records.forEach((r) => {
      if (!r.playerId) return

      if (!map.has(r.playerId)) {
        map.set(r.playerId, {
          playerId: r.playerId,
          playerName: r.playerName,
          playerDorsal: r.playerDorsal,
          playerAvatar: r.playerAvatar,
          teamName: r.teamName,
          teamCategory: r.teamCategory,
          days: {},
          presentes: 0,
          ausentes: 0,
          justificados: 0,
          retrasos: 0,
          lesionados: 0,
          totalSessions: 0,
          rate: null,
        })
      }

      const row = map.get(r.playerId)!

      // Extraer el día de la fecha si coincide con el mes y año actual
      if (r.date) {
        const parts = r.date.split("-")
        if (parts.length === 3) {
          const recYear = parseInt(parts[0], 10)
          const recMonth = parseInt(parts[1], 10) - 1
          const recDay = parseInt(parts[2], 10)

          if (recYear === year && recMonth === month && recDay >= 1 && recDay <= daysInMonth) {
            if (!row.days[recDay]) {
              row.days[recDay] = []
            }
            row.days[recDay].push(r)
            row.totalSessions++
            if (r.status === "presente") row.presentes++
            else if (r.status === "ausente") row.ausentes++
            else if (r.status === "justificado") row.justificados++
            else if (r.status === "retraso") row.retrasos++
            else if (r.status === "lesionado") row.lesionados++
          }
        }
      }
    })

    const list: PlayerMatrixRow[] = []
    map.forEach((row) => {
      row.rate = row.totalSessions > 0 ? Math.round((row.presentes / row.totalSessions) * 100) : null
      list.push(row)
    })

    // Ordenar alfabéticamente por nombre del jugador
    return list.sort((a, b) => a.playerName.localeCompare(b.playerName))
  }, [records, year, month, daysInMonth])

  const prevMonth = () => {
    onMonthChange(new Date(year, month - 1, 1))
  }

  const nextMonth = () => {
    onMonthChange(new Date(year, month + 1, 1))
  }

  // Renderizar celda de un día
  const renderDayCell = (row: PlayerMatrixRow, day: number) => {
    const sessions = row.days[day]

    // Sin sesión ni dato registrado para este día
    if (!sessions || sessions.length === 0) {
      return (
        <span className="text-slate-300 select-none text-xs font-semibold">—</span>
      )
    }

    // 1 sesión individual
    if (sessions.length === 1) {
      const s = sessions[0]
      let symbol = "✓"
      let bgClass = "bg-emerald-100 text-emerald-800 border-emerald-300"

      if (s.status === "ausente") {
        symbol = "✕"
        bgClass = "bg-rose-100 text-rose-800 border-rose-300"
      } else if (s.status === "justificado") {
        symbol = "J"
        bgClass = "bg-amber-100 text-amber-800 border-amber-300"
      } else if (s.status === "retraso") {
        symbol = "R"
        bgClass = "bg-sky-100 text-sky-800 border-sky-300"
      } else if (s.status === "lesionado") {
        symbol = "L"
        bgClass = "bg-purple-100 text-purple-800 border-purple-300"
      }

      return (
        <button
          onClick={() =>
            setSelectedDayDetail({
              playerName: row.playerName,
              dayNumber: day,
              sessions,
            })
          }
          className={`w-6 h-6 rounded-md border text-[11px] font-black flex items-center justify-center transition-transform hover:scale-110 cursor-pointer ${bgClass}`}
          title={`${s.eventName}: ${s.status}${s.notes ? ` (${s.notes})` : ""}`}
        >
          {symbol}
        </button>
      )
    }

    // Múltiples actividades el mismo día (ej. Entrenamiento y Partido)
    return (
      <button
        onClick={() =>
          setSelectedDayDetail({
            playerName: row.playerName,
            dayNumber: day,
            sessions,
          })
        }
        className="px-1.5 h-6 rounded-md bg-indigo-100 text-indigo-800 border border-indigo-300 text-[10px] font-black flex items-center justify-center gap-0.5 transition-transform hover:scale-105 cursor-pointer shadow-2xs"
        title={`${sessions.length} actividades el día ${day}`}
      >
        <span>{sessions.length} act.</span>
      </button>
    )
  }

  return (
    <div className="space-y-4">
      {/* Selector de Mes y Año */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-xs flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900">{monthName}</h3>
            <p className="text-[11px] text-slate-400 font-medium">
              {playerRows.length > 0
                ? `${playerRows.length} jugadores con actividad`
                : "Sin datos para este mes"}
            </p>
          </div>
        </div>

        {/* Controles de cambio de mes */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition cursor-pointer"
            title="Mes anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-slate-700 px-2.5 select-none">
            {monthName}
          </span>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition cursor-pointer"
            title="Mes siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Leyenda compacta */}
        <div className="hidden lg:flex items-center gap-2 text-xs font-semibold text-slate-600">
          <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center justify-center">✓</span> Presente</span>
          <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-rose-100 text-rose-800 text-[10px] font-black flex items-center justify-center">✕</span> Ausente</span>
          <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-amber-100 text-amber-800 text-[10px] font-black flex items-center justify-center">J</span> Justificado</span>
          <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-sky-100 text-sky-800 text-[10px] font-black flex items-center justify-center">R</span> Retraso</span>
          <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-purple-100 text-purple-800 text-[10px] font-black flex items-center justify-center">L</span> Lesión</span>
          <span className="flex items-center gap-1 text-slate-400"><span className="font-bold">—</span> Sin sesión</span>
        </div>
      </div>

      {playerRows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
          <Users className="w-12 h-12 mx-auto text-slate-300" />
          <p className="text-base font-semibold text-slate-700">Sin datos para este mes.</p>
          <p className="text-sm">No hay registros de asistencia para este período.</p>
        </div>
      ) : (
        <>
          {/* Móvil: Lista de Resumen a Detalle (sin 31 columnas) */}
          <div className="grid grid-cols-1 gap-3 sm:hidden">
            {playerRows.map((row) => (
              <div
                key={row.playerId}
                onClick={() => onSelectPlayer(row.playerId)}
                className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-3 cursor-pointer hover:border-blue-300 transition-all active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-slate-900 truncate">
                      {row.playerDorsal !== null ? `#${row.playerDorsal} ` : ""}
                      {row.playerName}
                    </h4>
                    <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                      {row.teamName} {row.teamCategory ? `(${row.teamCategory})` : ""}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-lg font-black text-slate-900">
                      {row.rate !== null ? `${row.rate}%` : "Sin datos"}
                    </div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Asistencia</div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-1.5 text-center text-xs border-t border-slate-100 pt-2 font-medium">
                  <div className="bg-slate-50 p-1.5 rounded-lg">
                    <div className="text-[9px] font-bold uppercase text-emerald-600">Pres.</div>
                    <div className="font-black text-slate-900">{row.presentes}</div>
                  </div>
                  <div className="bg-slate-50 p-1.5 rounded-lg">
                    <div className="text-[9px] font-bold uppercase text-rose-600">Aus.</div>
                    <div className="font-black text-slate-900">{row.ausentes}</div>
                  </div>
                  <div className="bg-slate-50 p-1.5 rounded-lg">
                    <div className="text-[9px] font-bold uppercase text-amber-600">Just.</div>
                    <div className="font-black text-slate-900">{row.justificados}</div>
                  </div>
                  <div className="bg-slate-50 p-1.5 rounded-lg">
                    <div className="text-[9px] font-bold uppercase text-sky-600">Retr.</div>
                    <div className="font-black text-slate-900">{row.retrasos}</div>
                  </div>
                </div>

                <div className="text-right pt-1">
                  <span className="text-xs font-bold text-blue-600 hover:underline">
                    Ver detalle →
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Escritorio: Matriz Completa Jugador × Días */}
          <div className="hidden sm:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto w-full max-w-full">
              <table className="border-collapse text-left text-xs min-w-max">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200">
                    {/* Columna fija de Jugador */}
                    <th className="sticky left-0 z-20 bg-slate-50/95 py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider min-w-[200px] max-w-[220px] shadow-xs">
                      Jugador ({playerRows.length})
                    </th>

                    {/* Días del 1 al N */}
                    {daysArray.map((day) => (
                      <th
                        key={day}
                        className="py-3 px-1.5 text-center font-bold text-slate-500 w-8 border-r border-slate-100"
                      >
                        {day}
                      </th>
                    ))}

                    {/* Porcentaje final */}
                    <th className="py-3 px-3 text-center font-bold text-slate-700 uppercase tracking-wider min-w-[60px]">
                      % Mes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {playerRows.map((row) => (
                    <tr key={row.playerId} className="hover:bg-slate-50/50 transition">
                      {/* Celda fija de Jugador */}
                      <td
                        onClick={() => onSelectPlayer(row.playerId)}
                        className="sticky left-0 z-10 bg-white hover:bg-slate-50 py-2 px-4 border-r border-slate-200 cursor-pointer group transition-colors shadow-xs"
                      >
                        <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                          {row.playerDorsal !== null ? `#${row.playerDorsal} ` : ""}
                          {row.playerName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium truncate">
                          {row.teamName}
                        </div>
                      </td>

                      {/* Celdas de los días */}
                      {daysArray.map((day) => (
                        <td
                          key={day}
                          className="py-2 px-1 text-center border-r border-slate-100 align-middle"
                        >
                          <div className="flex items-center justify-center">
                            {renderDayCell(row, day)}
                          </div>
                        </td>
                      ))}

                      {/* % Asistencia */}
                      <td className="py-2 px-3 text-center font-black text-slate-900">
                        {row.rate !== null ? `${row.rate}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modal para detalle de día (cuando se pulsa sobre una celda con sesiones) */}
      {selectedDayDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-xl animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-black text-sm text-slate-900">{selectedDayDetail.playerName}</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Día {selectedDayDetail.dayNumber} de {monthName}
                </p>
              </div>
              <button
                onClick={() => setSelectedDayDetail(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {selectedDayDetail.sessions.map((s, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">{s.eventName}</span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                        s.status === "presente"
                          ? "bg-emerald-100 text-emerald-800"
                          : s.status === "ausente"
                          ? "bg-rose-100 text-rose-800"
                          : s.status === "justificado"
                          ? "bg-amber-100 text-amber-800"
                          : s.status === "retraso"
                          ? "bg-sky-100 text-sky-800"
                          : "bg-purple-100 text-purple-800"
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {s.teamName} {s.activityType ? `· ${s.activityType}` : ""}
                  </div>
                  {s.notes && (
                    <div className="text-[11px] text-slate-600 italic bg-white p-1.5 rounded mt-1">
                      Nota: {s.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => setSelectedDayDetail(null)}
              className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}