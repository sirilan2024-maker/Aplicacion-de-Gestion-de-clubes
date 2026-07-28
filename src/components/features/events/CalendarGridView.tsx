"use client"

import { useState } from "react"
import { CalendarEvent } from "./mock-data"

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

interface CalendarGridViewProps {
  year: number
  month: number // 0-indexed
  events: CalendarEvent[]
  today: Date
  onEventClick?: (ev: CalendarEvent) => void
}

export function CalendarGridView({ year, month, events, today, onEventClick }: CalendarGridViewProps) {
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

  const [selectedDate, setSelectedDate] = useState<string>(todayStr)
  
  const activeEvents = eventsByDate[selectedDate] || []

  return (
    <div className="flex flex-col gap-6">
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
              onClick={() => {
                if (dateStr) setSelectedDate(dateStr)
              }}
              className={[
                "min-h-[70px] md:min-h-[140px] p-1 md:p-2 border-b border-r border-gray-50 flex flex-col gap-1 transition-colors relative",
                isWeekend && day ? "bg-gray-50/60" : "",
                day ? "hover:bg-blue-50/30 cursor-pointer" : "bg-gray-50/20",
                dateStr === selectedDate ? "bg-blue-50/40 md:bg-transparent" : "" // Highlight selected on mobile
              ].join(" ")}
            >
              {day !== null && (
                <>
                  <div className="flex justify-center md:justify-start w-full">
                    <span
                      className={[
                        "text-[11px] md:text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full shrink-0 transition-all",
                        isToday
                          ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                          : dateStr === selectedDate 
                            ? "bg-blue-100 text-blue-700 md:bg-transparent md:text-gray-500 md:hover:text-gray-900" 
                            : "text-gray-500 hover:text-gray-900",
                      ].join(" ")}
                    >
                      {day}
                    </span>
                  </div>

                  {/* Desktop Event Pills */}
                  <div className="hidden md:flex flex-col gap-1 overflow-hidden mt-1">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <div
                        key={ev.id}
                        onClick={(e) => { e.stopPropagation(); onEventClick && onEventClick(ev); }}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-md text-white text-[11px] sm:text-xs font-bold truncate cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
                        style={{ backgroundColor: ev.teamHex }}
                        title={`${ev.time} · ${ev.title}`}
                      >
                        <span className="shrink-0 flex items-center justify-center">
                          {ev.type === "Partido" ? "⚽" : ev.type === "Entrenamiento" ? "🏃" : "📅"}
                        </span>
                        <span className="truncate">{ev.time} • {ev.title}</span>
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[11px] text-gray-500 font-bold pl-1 pt-1">
                        +{dayEvents.length - 3} más
                      </span>
                    )}
                  </div>
                  
                  {/* Mobile Event Dots */}
                  <div className="flex md:hidden flex-wrap justify-center gap-1 mt-1 px-1">
                    {dayEvents.slice(0, 4).map(ev => (
                      <div key={ev.id} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ev.teamHex }} />
                    ))}
                    {dayEvents.length > 4 && <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
      </div>

      {/* Mobile Selected Day Details */}
      <div className="md:hidden flex flex-col gap-3 pb-8">
         <h3 className="text-sm font-bold text-gray-700 px-2 capitalize">
           {new Date(selectedDate).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
         </h3>
         {activeEvents.length === 0 ? (
           <div className="bg-gray-50 rounded-xl p-6 text-center border border-gray-100">
              <p className="text-gray-400 text-sm font-medium">No hay eventos programados para este día.</p>
           </div>
         ) : (
           <div className="flex flex-col gap-2">
             {activeEvents.map(ev => (
               <div 
                 key={ev.id}
                 onClick={() => onEventClick && onEventClick(ev)}
                 className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm flex items-center gap-3 active:scale-[0.98] transition-transform cursor-pointer"
               >
                  <div className="w-2 h-full min-h-[40px] rounded-full shrink-0" style={{ backgroundColor: ev.teamHex }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-black text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
                        {ev.time}
                      </span>
                      <span className="text-lg shrink-0">{ev.type === "Partido" ? "⚽" : ev.type === "Entrenamiento" ? "🏃" : "📅"}</span>
                    </div>
                    <h4 className="font-bold text-gray-900 text-sm truncate">{ev.title}</h4>
                    <p className="text-[11px] font-medium text-gray-500 truncate mt-0.5">{ev.location || "Instalaciones del Club"}</p>
                  </div>
               </div>
             ))}
           </div>
         )}
      </div>
    </div>
  )
}
