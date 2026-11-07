"use client";

import { useState } from "react";
import { CalendarEvent } from "./mock-data";
import { Trophy, Shield, Calendar as CalendarIcon } from "lucide-react";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

interface CalendarGridViewProps {
  year: number;
  month: number; // 0-indexed
  events: CalendarEvent[];
  today: Date;
  onEventClick?: (ev: CalendarEvent) => void;
  selectedDate?: string | null;
  onDateClick?: (dateStr: string) => void;
}

export function CalendarGridView({
  year,
  month,
  events,
  today,
  onEventClick,
  selectedDate: controlledSelectedDate,
  onDateClick
}: CalendarGridViewProps) {
  // Build the grid
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday = 0
  const totalDays = lastDay.getDate();

  // Group events by date string and sort chronologically
  const eventsByDate: Record<string, CalendarEvent[]> = {};
  events.forEach((ev) => {
    if (!eventsByDate[ev.date]) eventsByDate[ev.date] = [];
    eventsByDate[ev.date].push(ev);
  });
  Object.keys(eventsByDate).forEach((key) => {
    eventsByDate[key].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  });

  // Build cells array
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  const pad = (n: number) => String(n).padStart(2, "0");
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  const [internalSelectedDate, setInternalSelectedDate] = useState<string>(todayStr);
  const currentSelectedDate = controlledSelectedDate !== undefined ? controlledSelectedDate : internalSelectedDate;
  const activeEvents = currentSelectedDate ? (eventsByDate[currentSelectedDate] || []) : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 py-2 sm:py-2.5">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="text-center text-[11px] sm:text-xs font-black uppercase tracking-wider text-gray-600"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells grid */}
        <div className="grid grid-cols-7 auto-rows-[minmax(64px,auto)] md:auto-rows-[minmax(84px,auto)] bg-gray-200 gap-px">
          {cells.map((day, idx) => {
            const dateStr =
              day !== null
                ? `${year}-${pad(month + 1)}-${pad(day)}`
                : null;
            const dayEvents = dateStr ? (eventsByDate[dateStr] ?? []) : [];
            const isToday = dateStr === todayStr;
            const isWeekend = idx % 7 >= 5;
            const hasMatch = dayEvents.some(e => e.type === "Partido");
            const hasTraining = dayEvents.some(e => e.type === "Entrenamiento");

            if (day === null) {
              return (
                <div 
                  key={`empty-${idx}`} 
                  className="bg-gray-50/50 min-h-[64px] md:min-h-[84px]"
                />
              );
            }

            const isCellSelected = !!dateStr && dateStr === currentSelectedDate;

            return (
              <div
                key={idx}
                onClick={() => {
                  if (dateStr) {
                    setInternalSelectedDate(dateStr);
                    onDateClick && onDateClick(dateStr);
                  }
                }}
                className={`bg-white min-h-[64px] md:min-h-[84px] p-1 md:p-1.5 flex flex-col justify-start transition-all relative cursor-pointer group ${
                  isWeekend ? "bg-slate-50/30" : ""
                } ${isCellSelected ? "ring-2 ring-blue-500 bg-blue-50/50 shadow-inner" : "hover:bg-blue-50/30"}`}
              >
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span
                      className={`text-xs md:text-sm font-black w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-full shrink-0 transition-all ${
                        isToday
                          ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-300"
                          : hasMatch
                          ? "bg-blue-600 text-white font-black shadow-2xs"
                          : hasTraining
                          ? "bg-emerald-600 text-white font-black shadow-2xs"
                          : "text-gray-700 group-hover:text-blue-600"
                      }`}
                    >
                      {day}
                    </span>

                    {/* Indicadores de equipos con actividad este día */}
                    <div className="flex items-center gap-1">
                      {Array.from(new Set(dayEvents.map(e => e.teamHex || '#2563eb'))).slice(0, 3).map((hex, i) => (
                        <span
                          key={i}
                          className="w-2 h-2 rounded-full shrink-0 shadow-2xs border border-white"
                          style={{ backgroundColor: hex }}
                          title="Equipo con actividad"
                        />
                      ))}
                    </div>
                  </div>

                  {/* Vista Móvil: Pastilla compacta con color del equipo, icono y hora */}
                  <div className="flex md:hidden flex-col gap-1 mt-0.5">
                    {dayEvents.slice(0, 2).map((ev) => {
                      const hex = ev.teamHex || '#2563eb';
                      return (
                        <div
                          key={ev.id}
                          onClick={(e) => { e.stopPropagation(); onEventClick && onEventClick(ev); }}
                          className="flex items-center justify-center py-0.5 px-1 rounded text-white font-black shadow-2xs border transition-transform active:scale-95"
                          style={{
                            backgroundColor: hex,
                            borderColor: `${hex}ee`
                          }}
                          title={`${ev.time} · ${ev.title} (${ev.teamName})`}
                        >
                          <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 mr-1 bg-black/15">
                            {ev.type === "Partido" ? (
                              <Trophy className="w-2.5 h-2.5 text-amber-200" />
                            ) : ev.type === "Entrenamiento" ? (
                              <Shield className="w-2.5 h-2.5 text-white" />
                            ) : (
                              <CalendarIcon className="w-2.5 h-2.5 text-white" />
                            )}
                          </div>
                          <span className="text-[9px] font-black leading-none">{ev.time}</span>
                        </div>
                      );
                    })}
                    {dayEvents.length > 2 && (
                      <div className="text-[8px] font-black text-gray-500 text-center leading-none">
                        +{dayEvents.length - 2}
                      </div>
                    )}
                  </div>

                  {/* Vista PC / Tablet: Pastilla completa con color del equipo, icono y hora - Muestra todos los eventos */}
                  <div className="hidden md:flex flex-col gap-1 mt-0.5">
                    {dayEvents.map((ev) => {
                      const hex = ev.teamHex || '#2563eb';
                      return (
                        <div
                          key={ev.id}
                          onClick={(e) => { e.stopPropagation(); onEventClick && onEventClick(ev); }}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-bold truncate shadow-2xs border border-l-4 transition-all hover:scale-[1.01]"
                          style={{
                            borderLeftColor: hex,
                            backgroundColor: `${hex}18`,
                            borderColor: `${hex}40`,
                            color: '#0f172a'
                          }}
                          title={`${ev.time} · ${ev.title} (${ev.teamName})`}
                        >
                          <div 
                            className="w-4 h-4 rounded flex items-center justify-center shrink-0 shadow-2xs"
                            style={{ backgroundColor: hex }}
                          >
                            {ev.type === "Partido" ? (
                              <Trophy className="w-2.5 h-2.5 text-amber-200" />
                            ) : ev.type === "Entrenamiento" ? (
                              <Shield className="w-2.5 h-2.5 text-white" />
                            ) : (
                              <CalendarIcon className="w-2.5 h-2.5 text-white" />
                            )}
                          </div>
                          <span className="text-[10px] font-black shrink-0 text-slate-950">{ev.time}</span>
                          <span className="truncate text-[11px] font-bold text-slate-950 flex-1 min-w-0">{ev.title}</span>
                          <span className="text-[10px] font-medium text-slate-500 shrink-0 hidden 2xl:inline">({ev.teamName})</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Selected Day Details */}
      <div className="md:hidden flex flex-col gap-3 pb-8">
        <h3 className="text-sm font-bold text-gray-700 px-2 capitalize">
          {new Date(currentSelectedDate || todayStr).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
        </h3>
        {activeEvents.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-6 text-center border border-gray-100">
            <p className="text-gray-400 text-sm font-medium">No hay eventos programados para este día.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {activeEvents.map(ev => {
              const hex = ev.teamHex || '#2563eb';
              return (
                <div 
                  key={ev.id}
                  onClick={() => onEventClick && onEventClick(ev)}
                  className="bg-white border rounded-xl p-3 shadow-xs flex items-center gap-3 active:scale-[0.98] transition-transform cursor-pointer border-l-4"
                  style={{ borderLeftColor: hex }}
                >
                  <div className="w-2.5 h-full min-h-[44px] rounded-full shrink-0" style={{ backgroundColor: hex }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1 gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span 
                          className="text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1.5 shadow-2xs text-slate-900 border"
                          style={{ backgroundColor: `${hex}18`, borderColor: `${hex}45` }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: hex }} />
                          <span className="text-slate-900 font-bold">{ev.teamName}</span>
                        </span>
                        <span className="text-xs font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                          {ev.time}
                        </span>
                      </div>
                      <span className="text-base shrink-0">{ev.type === "Partido" ? "⚽" : ev.type === "Entrenamiento" ? "🏃" : "📅"}</span>
                    </div>
                    <h4 className="font-bold text-gray-900 text-sm truncate">{ev.title}</h4>
                    <p className="text-[11px] font-medium text-gray-500 truncate mt-0.5">{ev.location || "Instalaciones del Club"}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
