"use client";

import React from "react";
import { CalendarEvent } from "./mock-data";
import { MapPin, Clock, MoreHorizontal, Dumbbell, Trophy, Shield, CalendarDays } from "lucide-react";

interface CalendarListViewProps {
  events: CalendarEvent[];
  selectedTeams: string[];
  selectedTypes: string[];
  onEventClick?: (ev: CalendarEvent) => void;
}

export function CalendarListView({ events, selectedTeams, selectedTypes, onEventClick }: CalendarListViewProps) {
  const filtered = events.filter((ev) => {
    const teamOk = selectedTeams.length === 0 || selectedTeams.includes(ev.teamId);
    const typeOk = selectedTypes.length === 0 || selectedTypes.includes(ev.type);
    return teamOk && typeOk;
  });

  // Group by week
  const grouped: Record<string, CalendarEvent[]> = {};
  filtered.forEach((ev) => {
    const d = new Date(ev.date);
    const year = d.getFullYear();
    const week = getWeekNumber(d);
    const key = `${year}-W${week}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(ev);
  });

  const sortedKeys = Object.keys(grouped).sort();

  if (filtered.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
        <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <Trophy className="w-6 h-6 text-gray-300" />
        </div>
        <p className="text-gray-500 text-sm font-medium">No hay eventos que coincidan con los filtros</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── DESKTOP VIEW (TABLE) ── */}
      <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
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
              <React.Fragment key={`frag-${weekKey}`}>
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
                      className="border-t border-gray-100 hover:bg-slate-50/80 transition-colors group cursor-pointer border-l-4"
                      style={{ borderLeftColor: ev.teamHex || '#2563eb' }}
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
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span 
                          className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-bold border shadow-2xs transition-transform group-hover:scale-[1.02]"
                          style={{
                            backgroundColor: `${ev.teamHex || '#2563eb'}18`,
                            borderColor: `${ev.teamHex || '#2563eb'}45`,
                          }}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs border border-white"
                            style={{ backgroundColor: ev.teamHex || '#2563eb' }}
                          />
                          <span className="text-slate-900 font-bold">{ev.teamName}</span>
                        </span>
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
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── MOBILE VIEW (CARDS) ── */}
      <div className="md:hidden flex flex-col gap-6">
        {sortedKeys.map((weekKey) => (
          <div key={`mob-${weekKey}`} className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs">
                {formatWeekLabel(grouped[weekKey][0].date)}
              </h3>
              <span className="text-xs font-bold text-slate-400">({grouped[weekKey].length})</span>
            </div>
            
            <div className="space-y-3">
              {grouped[weekKey]
                .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
                .map((ev) => (
                  <div 
                    key={`mob-ev-${ev.id}`}
                    onClick={() => onEventClick && onEventClick(ev)}
                    className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs hover:border-slate-300 flex items-start gap-3.5 active:scale-[0.99] transition-all cursor-pointer relative overflow-hidden"
                  >
                    {/* Indicador de equipo en el lateral izquierdo */}
                    <div className="w-1.5 absolute left-0 top-0 bottom-0 shrink-0 rounded-l" style={{ backgroundColor: ev.teamHex }} />
                    
                    <div className="flex-1 min-w-0 pl-1">
                      <div className="flex justify-between items-start gap-2 mb-2 pb-2 border-b border-slate-100">
                        <div>
                          <span className="text-xs font-black text-slate-900 capitalize tracking-tight block">
                            {formatFullDate(ev.date)}
                          </span>
                          <span className="text-base font-black text-blue-600 mt-0.5 block">
                            {ev.time}
                          </span>
                        </div>
                        
                        {/* Icono nítido de tipo de evento */}
                        <div className={`p-2 rounded-xl border shrink-0 ${
                          ev.type === "Partido" 
                            ? "bg-blue-600 text-amber-300 border-blue-700 shadow-xs" 
                            : ev.type === "Entrenamiento"
                            ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                            : "bg-slate-800 text-white border-slate-900 shadow-xs"
                        }`}>
                          {ev.type === "Partido" ? (
                            <Trophy className="w-4 h-4 text-amber-300" />
                          ) : ev.type === "Entrenamiento" ? (
                            <Shield className="w-4 h-4 text-white" />
                          ) : (
                            <CalendarDays className="w-4 h-4 text-white" />
                          )}
                        </div>
                      </div>

                      <h4 className="font-bold text-slate-900 text-sm leading-snug break-words">{ev.title}</h4>
                      
                      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                        <span className="text-[11px] font-bold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1.5 shadow-2xs">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ev.teamHex }} />
                          <span>{ev.teamName}</span>
                        </span>
                        {ev.location && (
                          <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[170px]">{ev.location}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00"); // avoid timezone shift
  return d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
}

function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
}

function formatWeekLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  // start of week (Monday)
  const day = d.getDay() || 7;
  const mon = new Date(d); mon.setDate(d.getDate() - day + 1);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  const fmt = (x: Date) => x.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  return `Semana del ${fmt(mon)} al ${fmt(sun)}`;
}
