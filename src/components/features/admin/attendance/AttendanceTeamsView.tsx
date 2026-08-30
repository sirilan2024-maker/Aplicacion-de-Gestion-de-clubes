"use client"

import React from "react"
import { Shield, ArrowRight, CheckCircle2, XCircle, AlertCircle, Clock, HelpCircle } from "lucide-react"
import { AttendanceRecordDTO } from "@/app/actions/attendance-actions"

interface AttendanceTeamsViewProps {
  records: AttendanceRecordDTO[]
  teams: Array<{ id: string; name: string; category: string }>
  onSelectTeam: (teamId: string) => void
}

interface TeamStats {
  id: string
  name: string
  category: string
  totalRecords: number
  uniquePlayers: number
  sessionsCount: number
  presentes: number
  ausentes: number
  justificados: number
  retrasos: number
  lesionados: number
  rate: number
}

export function AttendanceTeamsView({ records, teams, onSelectTeam }: AttendanceTeamsViewProps) {
  // Agrupar métricas por equipo
  const teamStatsList: TeamStats[] = React.useMemo(() => {
    const map = new Map<string, TeamStats>()

    // Inicializar todos los equipos del club
    teams.forEach((t) => {
      map.set(t.id, {
        id: t.id,
        name: t.name,
        category: t.category,
        totalRecords: 0,
        uniquePlayers: 0,
        sessionsCount: 0,
        presentes: 0,
        ausentes: 0,
        justificados: 0,
        retrasos: 0,
        lesionados: 0,
        rate: 0,
      })
    })

    const playersByTeam = new Map<string, Set<string>>()
    const sessionsByTeam = new Map<string, Set<string>>()

    records.forEach((r) => {
      if (!r.teamId) return
      let stat = map.get(r.teamId)
      if (!stat) {
        stat = {
          id: r.teamId,
          name: r.teamName,
          category: r.teamCategory,
          totalRecords: 0,
          uniquePlayers: 0,
          sessionsCount: 0,
          presentes: 0,
          ausentes: 0,
          justificados: 0,
          retrasos: 0,
          lesionados: 0,
          rate: 0,
        }
        map.set(r.teamId, stat)
      }

      stat.totalRecords++
      if (r.status === "presente") stat.presentes++
      else if (r.status === "ausente") stat.ausentes++
      else if (r.status === "justificado") stat.justificados++
      else if (r.status === "retraso") stat.retrasos++
      else if (r.status === "lesionado") stat.lesionados++

      if (!playersByTeam.has(r.teamId)) playersByTeam.set(r.teamId, new Set())
      playersByTeam.get(r.teamId)!.add(r.playerId)

      if (!sessionsByTeam.has(r.teamId)) sessionsByTeam.set(r.teamId, new Set())
      sessionsByTeam.get(r.teamId)!.add(`${r.date}_${r.eventName}`)
    })

    const list: TeamStats[] = []
    map.forEach((stat, tId) => {
      stat.uniquePlayers = playersByTeam.get(tId)?.size || 0
      stat.sessionsCount = sessionsByTeam.get(tId)?.size || 0
      stat.rate = stat.totalRecords > 0 ? Math.round((stat.presentes / stat.totalRecords) * 100) : 0
      list.push(stat)
    })

    // Ordenar de mayor a menor asistencia
    return list.sort((a, b) => b.rate - a.rate)
  }, [records, teams])

  const getStatusBadge = (rate: number, total: number) => {
    if (total === 0) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500">
          Sin datos
        </span>
      )
    }
    if (rate >= 90) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          🟢 Excelente
        </span>
      )
    }
    if (rate >= 75) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
          🟡 Bueno
        </span>
      )
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
        🔴 Atención
      </span>
    )
  }

  return (
    <div className="space-y-4">
      {/* Móvil: Tarjetas compactas de Equipo */}
      <div className="grid grid-cols-1 gap-3 sm:hidden">
        {teamStatsList.map((team) => (
          <div
            key={team.id}
            onClick={() => onSelectTeam(team.id)}
            className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-3 cursor-pointer hover:border-blue-300 transition-all active:scale-[0.99]"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{team.name}</h4>
                  {team.category && (
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      {team.category}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <div className="text-lg font-black text-slate-900">
                  {team.totalRecords > 0 ? `${team.rate}%` : "Sin datos"}
                </div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Asistencia</div>
              </div>
            </div>

            <div className="text-xs text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2 font-medium">
              <span>{team.sessionsCount} sesiones · {team.uniquePlayers} jug.</span>
              <span className="text-rose-600 font-bold">{team.ausentes} ausencias</span>
            </div>

            <div className="flex items-center justify-between pt-1">
              {getStatusBadge(team.rate, team.totalRecords)}
              <span className="text-xs font-bold text-blue-600 inline-flex items-center gap-1">
                Ver equipo <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Escritorio: Tabla Comparativa Rica */}
      <div className="hidden sm:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Equipo</th>
                <th className="py-3.5 px-4 text-center">Jugadores</th>
                <th className="py-3.5 px-4 text-center">Sesiones</th>
                <th className="py-3.5 px-4 text-center">% Asistencia</th>
                <th className="py-3.5 px-4 text-center">Presentes</th>
                <th className="py-3.5 px-4 text-center">Ausencias</th>
                <th className="py-3.5 px-4 text-center">Justificados</th>
                <th className="py-3.5 px-4 text-center">Retrasos</th>
                <th className="py-3.5 px-4 text-center">Estado</th>
                <th className="py-3.5 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {teamStatsList.map((team) => (
                <tr
                  key={team.id}
                  onClick={() => onSelectTeam(team.id)}
                  className="hover:bg-slate-50/70 transition cursor-pointer group"
                >
                  {/* Nombre y categoría */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs shrink-0 group-hover:bg-blue-100 transition-colors">
                        <Shield className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {team.name}
                        </div>
                        {team.category && (
                          <div className="text-xs text-slate-400 font-medium uppercase">
                            {team.category}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Jugadores */}
                  <td className="py-3.5 px-4 text-center font-semibold text-slate-700">
                    {team.uniquePlayers}
                  </td>

                  {/* Sesiones */}
                  <td className="py-3.5 px-4 text-center font-semibold text-slate-700">
                    {team.sessionsCount}
                  </td>

                  {/* Ratio % */}
                  <td className="py-3.5 px-4 text-center">
                    <span className="text-base font-black text-slate-900">
                      {team.totalRecords > 0 ? `${team.rate}%` : "Sin datos"}
                    </span>
                  </td>

                  {/* Presentes */}
                  <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">
                    {team.presentes}
                  </td>

                  {/* Ausencias */}
                  <td className="py-3.5 px-4 text-center text-rose-600 font-bold">
                    {team.ausentes}
                  </td>

                  {/* Justificados */}
                  <td className="py-3.5 px-4 text-center text-amber-600 font-bold">
                    {team.justificados}
                  </td>

                  {/* Retrasos */}
                  <td className="py-3.5 px-4 text-center text-sky-600 font-bold">
                    {team.retrasos}
                  </td>

                  {/* Estado */}
                  <td className="py-3.5 px-4 text-center">
                    {getStatusBadge(team.rate, team.totalRecords)}
                  </td>

                  {/* Acción */}
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectTeam(team.id)
                      }}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Ver equipo</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
