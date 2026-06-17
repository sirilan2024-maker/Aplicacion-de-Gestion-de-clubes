"use client"

import { CalendarEvent } from "./mock-data"
import { MapPin, Clock, MoreHorizontal, Dumbbell, Trophy } from "lucide-react"

interface CalendarListViewProps {
  events: CalendarEvent[]
  selectedTeams: string[]
  selectedTypes: string[]
  onEventClick?: (ev: CalendarEvent) => void
}

export function CalendarListView({ events, selectedTeams, selectedTypes, onEventClick }: CalendarListViewProps) {
  const filtered = events.filter((ev) => {
    const teamOk = selectedTeams.length === 0 || selectedTeams.includes(ev.teamId)
    const typeOk = selectedTypes.length === 0 || selectedTypes.includes(ev.type)
    return teamOk && typeOk
  })

  // Group by week
  const grouped: Record<string, CalendarEvent[]> = {}
  filtered.forEach((ev) => {
    const d = new Date(ev.date)
    const year = d.getFullYear()
    const week = getWeekNumber(d)
    const key = `${year}-W${week}`
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(ev)
  })

  const sortedKeys = Object.keys(grouped).sort()

  if (filtered.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
        <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <Trophy className="w-6 h-6 text-gray-300" />
        </div>
        <p className="text-gray-500 text-sm font-medium">No hay eventos que coincidan con los filtros</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="w-8 px-4 py-3">
              <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            </th>
            <th className="text-left px-3 py-3 text-[11px] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap">
              Fecha
            </th>
            <th className="text-left px-3 py-3 text-[11px] font-bold uppercase tracking-widest text-gray-400">
              Tipo
            </th>
            <th className="text-left px-3 py-3 text-[11px] font-bold uppercase tracking-widest text-gray-400">
              Equipo
            </th>
            <th className="text-left px-3 py-3 text-[11px] font-bold uppercase tracking-widest text-gray-400 hidden md:table-cell">
              Detalles
            </th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {sortedKeys.map((weekKey) => (
            <>
              {/* Week separator row */}
              <tr key={`sep-${weekKey}`} className="bg-gray-50/70">
                <td colSpan={6} className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  {formatWeekLabel(grouped[weekKey][0].date)}
                </td>
              </tr>

              {grouped[weekKey]
                .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
                .map((ev) => (
                  <tr
                    key={ev.id}
                    onClick={() => onEventClick && onEventClick(ev)}
                    className="border-t border-gray-50 hover:bg-blue-50/30 transition-colors group cursor-pointer"
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-3">
                      <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    </td>

                    {/* Date */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="font-bold text-gray-900 text-[13px]">
                        {formatDate(ev.date)}
                      </div>
                      <div className="flex items-center gap-1 text-gray-400 text-[11px] mt-0.5">
                        <Clock className="w-3 h-3" />
                        {ev.time}
                      </div>
                    </td>

                    {/* Type */}
                    <td className="px-3 py-3">
                      <div
                        className={[
                          "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-semibold",
                          ev.type === "Partido"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-emerald-50 text-emerald-700",
                        ].join(" ")}
                      >
                        {ev.type === "Partido" ? (
                          <Trophy className="w-3 h-3" />
                        ) : (
                          <Dumbbell className="w-3 h-3" />
                        )}
                        {ev.type}
                      </div>
                    </td>

                    {/* Team */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: ev.teamHex }}
                        />
                        <span className="font-medium text-gray-800 text-[13px] whitespace-nowrap">
                          {ev.teamName}
                        </span>
                      </div>
                    </td>

                    {/* Details */}
                    <td className="px-3 py-3 hidden md:table-cell">
                      <div className="font-semibold text-gray-800 text-[13px] leading-tight">
                        {ev.title}
                      </div>
                      {ev.location && (
                        <div className="flex items-center gap-1 text-gray-400 text-[11px] mt-0.5">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate max-w-[180px]">{ev.location}</span>
                        </div>
                      )}
                    </td>

                    {/* Options */}
                    <td className="px-4 py-3">
                      <button className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-all opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
            </>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00") // avoid timezone shift
  return d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" })
}

function formatWeekLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00")
  // start of week (Monday)
  const day = d.getDay() || 7
  const mon = new Date(d); mon.setDate(d.getDate() - day + 1)
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
  const fmt = (x: Date) => x.toLocaleDateString("es-ES", { day: "numeric", month: "short" })
  return `Semana del ${fmt(mon)} al ${fmt(sun)}`
}
