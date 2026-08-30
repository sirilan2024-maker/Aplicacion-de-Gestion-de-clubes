"use client"

import React, { useState } from "react"
import Link from "next/link"
import { Calendar as CalendarIcon, CheckCircle2, XCircle, AlertCircle, Clock, HelpCircle, Users } from "lucide-react"
import { AttendanceRecordDTO } from "@/app/actions/attendance-actions"

interface AttendanceRecordsViewProps {
  records: AttendanceRecordDTO[]
  pageSize?: number
  onSelectPlayer?: (playerId: string) => void
}

export function AttendanceRecordsView({
  records,
  pageSize = 25,
  onSelectPlayer,
}: AttendanceRecordsViewProps) {
  const [currentPage, setCurrentPage] = useState(1)

  const totalPages = Math.ceil(records.length / pageSize) || 1
  const paginatedRecords = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return records.slice(start, start + pageSize)
  }, [records, currentPage, pageSize])

  // Reset page when records length changes
  React.useEffect(() => {
    setCurrentPage(1)
  }, [records.length])

  const getStatusBadge = (status: AttendanceRecordDTO["status"]) => {
    switch (status) {
      case "presente":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Presente
          </span>
        )
      case "ausente":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" />
            Ausente
          </span>
        )
      case "justificado":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle className="w-3.5 h-3.5" />
            Justificado
          </span>
        )
      case "lesionado":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <HelpCircle className="w-3.5 h-3.5" />
            Lesionado
          </span>
        )
      case "retraso":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
            <Clock className="w-3.5 h-3.5" />
            Retraso
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
            Otro
          </span>
        )
    }
  }

  if (records.length === 0) {
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
      {/* Móvil: Lista de tarjetas compactas */}
      <div className="grid grid-cols-1 gap-2.5 sm:hidden">
        {paginatedRecords.map((r) => (
          <div
            key={r.id}
            className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => onSelectPlayer ? onSelectPlayer(r.playerId) : undefined}
                  className="font-bold text-xs text-slate-900 hover:text-blue-600 block truncate text-left cursor-pointer"
                  title="Ver ficha de asistencia"
                >
                  {r.playerDorsal !== null ? `#${r.playerDorsal} ` : ""}
                  {r.playerName}
                </button>
                <p className="text-[11px] text-slate-500 font-medium truncate">
                  {r.teamName} {r.teamCategory ? `(${r.teamCategory})` : ""}
                </p>
              </div>

              {getStatusBadge(r.status)}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
              <span className="flex items-center gap-1">
                <CalendarIcon className="w-3 h-3 text-slate-400" />
                {r.date || "Sin fecha"}
              </span>
              <span className="truncate max-w-[140px] text-slate-600 font-medium">
                {r.eventName}
              </span>
            </div>

            {r.notes && (
              <p className="text-[10px] text-slate-500 italic bg-slate-50 p-1.5 rounded-md">
                {r.notes}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Escritorio: Tabla Completa */}
      <div className="hidden sm:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Fecha</th>
                <th className="py-3.5 px-4">Equipo</th>
                <th className="py-3.5 px-4">Jugador</th>
                <th className="py-3.5 px-4">Sesión / Evento</th>
                <th className="py-3.5 px-4 text-center">Estado</th>
                <th className="py-3.5 px-4">Observaciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {paginatedRecords.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60 transition">
                  {/* Fecha */}
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                    <div className="flex items-center gap-2 font-medium">
                      <CalendarIcon className="w-4 h-4 text-slate-400" />
                      {r.date || "Sin fecha"}
                    </div>
                  </td>

                  {/* Equipo */}
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{r.teamName}</div>
                    {r.teamCategory && (
                      <div className="text-xs text-slate-400 uppercase font-medium">
                        {r.teamCategory}
                      </div>
                    )}
                  </td>

                  {/* Jugador */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center shrink-0">
                        {r.playerDorsal !== null ? r.playerDorsal : r.playerName.charAt(0)}
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={() => onSelectPlayer ? onSelectPlayer(r.playerId) : undefined}
                          className="font-medium text-slate-900 hover:text-blue-600 hover:underline transition-colors text-left cursor-pointer"
                          title="Ver ficha de asistencia del jugador"
                        >
                          {r.playerName}
                        </button>
                        {r.playerDorsal !== null && (
                          <div className="text-xs text-slate-400">Dorsal #{r.playerDorsal}</div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Evento */}
                  <td className="py-3 px-4 text-slate-700 max-w-xs truncate">
                    <span className="font-medium">{r.eventName}</span>
                    {r.activityType && (
                      <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase">
                        {r.activityType}
                      </span>
                    )}
                  </td>

                  {/* Estado */}
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    {getStatusBadge(r.status)}
                  </td>

                  {/* Observaciones */}
                  <td className="py-3 px-4 text-slate-500 text-xs italic max-w-xs truncate">
                    {r.notes || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>
              Página <b>{currentPage}</b> de <b>{totalPages}</b> ({records.length} registros)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 font-bold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 font-bold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
