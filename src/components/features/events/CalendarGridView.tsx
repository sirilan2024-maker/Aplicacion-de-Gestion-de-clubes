"use client"

import { CalendarEvent } from "./mock-data"

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

interface CalendarGridViewProps {
  year: number
  month: number // 0-indexed
  events: CalendarEvent[]
  today: Date
}

export function CalendarGridView({ year, month, events, today }: CalendarGridViewProps) {
  // Build the grid
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startOffset = (firstDay.getDay() + 6) % 7 // Monday = 0
  const totalDays = lastDay.getDate()

  // Group events by date string
  const eventsByDate: Record<string, CalendarEvent[]> = {}
  events.forEach((ev) => {
    if (!eventsByDate[ev.date]) eventsByDate[ev.date] = []
    eventsByDate[ev.date].push(ev)
  })

  // Build cells array
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ]
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null)

  const pad = (n: number) => String(n).padStart(2, "0")
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="py-3 text-center text-[11px] font-bold uppercase tracking-widest text-gray-400"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          const dateStr =
            day !== null
              ? `${year}-${pad(month + 1)}-${pad(day)}`
              : null
          const dayEvents = dateStr ? (eventsByDate[dateStr] ?? []) : []
          const isToday = dateStr === todayStr
          const isWeekend = idx % 7 >= 5

          return (
            <div
              key={idx}
              className={[
                "min-h-[96px] p-2 border-b border-r border-gray-50 flex flex-col gap-1 transition-colors",
                isWeekend && day ? "bg-gray-50/60" : "",
                day ? "hover:bg-blue-50/30 cursor-pointer" : "bg-gray-50/20",
              ].join(" ")}
            >
              {day !== null && (
                <>
                  <span
                    className={[
                      "text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full shrink-0 transition-all",
                      isToday
                        ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                        : "text-gray-500 hover:text-gray-900",
                    ].join(" ")}
                  >
                    {day}
                  </span>

                  {/* Event pills */}
                  <div className="flex flex-col gap-0.5 overflow-hidden">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <div
                        key={ev.id}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-white text-[10px] font-semibold truncate cursor-pointer hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: ev.teamHex }}
                        title={`${ev.time} · ${ev.title}`}
                      >
                        <span className="shrink-0">
                          {ev.type === "Partido" ? "⚽" : "🏃"}
                        </span>
                        <span className="truncate">{ev.title}</span>
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[10px] text-gray-400 font-semibold pl-1">
                        +{dayEvents.length - 3} más
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
