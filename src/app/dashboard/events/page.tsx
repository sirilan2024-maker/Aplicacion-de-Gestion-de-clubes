"use client"

import { useState } from "react"
import {
  Search,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Plus,
  Dumbbell,
  Trophy,
  CalendarDays,
} from "lucide-react"
import { MOCK_EVENTS, MOCK_TEAMS, CalendarEvent } from "@/components/features/events/mock-data"
import { CalendarGridView } from "@/components/features/events/CalendarGridView"
import { CalendarListView } from "@/components/features/events/CalendarListView"

type ViewMode = "month" | "list"

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

export default function EventsPage() {
  const today = new Date()
  const [viewMode, setViewMode] = useState<ViewMode>("month")
  const [currentDate, setCurrentDate] = useState(new Date(2026, 4, 1)) // Mayo 2026
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedTeams, setSelectedTeams] = useState<string[]>([])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const handlePrev = () => {
    const d = new Date(year, month - 1, 1)
    setCurrentDate(d)
  }
  const handleNext = () => {
    const d = new Date(year, month + 1, 1)
    setCurrentDate(d)
  }
  const handleToday = () => {
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1))
  }

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }
  const toggleTeam = (id: string) => {
    setSelectedTeams((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    )
  }

  // Filter events for the current month view or list view
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`
  const filteredEvents: CalendarEvent[] = MOCK_EVENTS.filter((ev) => {
    const inMonth = viewMode === "month" ? ev.date.startsWith(monthStr) : true
    const matchSearch =
      searchTerm === "" ||
      ev.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ev.teamName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchType = selectedTypes.length === 0 || selectedTypes.includes(ev.type)
    const matchTeam = selectedTeams.length === 0 || selectedTeams.includes(ev.teamId)
    return inMonth && matchSearch && matchType && matchTeam
  })

  const eventCountThisMonth = MOCK_EVENTS.filter((e) =>
    e.date.startsWith(monthStr)
  ).length

  return (
    <div className="min-h-full bg-gray-50/50">
      <div className="max-w-screen-xl mx-auto px-5 py-7">

        {/* ─── Page Header ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Eventos y Calendario</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {eventCountThisMonth} eventos en {MONTH_NAMES[month]}
            </p>
          </div>
          <button className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-sm shadow-blue-200 transition-all">
            <Plus className="w-4 h-4" />
            Nuevo Evento
          </button>
        </div>

        {/* ─── Two-column Layout ────────────────────────────────────────── */}
        <div className="flex gap-5">

          {/* ── LEFT SIDEBAR ───────────────────────────────────────────── */}
          <aside className="w-52 shrink-0 space-y-4">

            {/* Tipos de evento */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <CalendarDays className="w-4 h-4 text-gray-400" />
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Eventos</p>
              </div>
              <div className="space-y-2">
                {(["Entrenamiento", "Partido"] as const).map((type) => (
                  <label key={type} className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(type)}
                      onChange={() => toggleType(type)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex items-center gap-2">
                      {type === "Entrenamiento" ? (
                        <Dumbbell className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Trophy className="w-3.5 h-3.5 text-blue-500" />
                      )}
                      <span className="text-sm text-gray-700 font-medium group-hover:text-gray-900 transition-colors">
                        {type}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Equipos */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-gray-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </span>
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Equipo</p>
              </div>
              <div className="space-y-2">
                {MOCK_TEAMS.map((team) => (
                  <label key={team.id} className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedTeams.includes(team.id)}
                      onChange={() => toggleTeam(team.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: team.hex }}
                      />
                      <span className="text-sm text-gray-700 font-medium group-hover:text-gray-900 transition-colors truncate">
                        {team.name}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Mini stats */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-4 text-white shadow-sm shadow-blue-200">
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-200 mb-3">Este mes</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-100 flex items-center gap-1.5">
                    <Dumbbell className="w-3.5 h-3.5" /> Entrenos
                  </span>
                  <span className="font-bold text-lg">
                    {MOCK_EVENTS.filter(e => e.date.startsWith(monthStr) && e.type === "Entrenamiento").length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-100 flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5" /> Partidos
                  </span>
                  <span className="font-bold text-lg">
                    {MOCK_EVENTS.filter(e => e.date.startsWith(monthStr) && e.type === "Partido").length}
                  </span>
                </div>
              </div>
            </div>
          </aside>

          {/* ── RIGHT CONTENT ──────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* Controls bar */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              {/* Month navigation */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrev}
                  className="w-8 h-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-all shadow-sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleToday}
                  className="px-3 h-8 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-all shadow-sm"
                >
                  Hoy
                </button>
                <button
                  onClick={handleNext}
                  className="w-8 h-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-all shadow-sm"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <h2 className="text-base font-bold text-gray-900 ml-1">
                  {MONTH_NAMES[month]} de {year}
                </h2>
              </div>

              <div className="flex items-center gap-2 sm:ml-auto">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar evento..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 h-8 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm w-44 transition-all"
                  />
                </div>

                {/* View toggle */}
                <div className="flex bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  <button
                    onClick={() => setViewMode("month")}
                    className={[
                      "flex items-center gap-1.5 px-3 h-8 text-xs font-semibold transition-all",
                      viewMode === "month"
                        ? "bg-blue-600 text-white"
                        : "text-gray-500 hover:text-gray-900 hover:bg-gray-50",
                    ].join(" ")}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    Mes
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={[
                      "flex items-center gap-1.5 px-3 h-8 text-xs font-semibold transition-all",
                      viewMode === "list"
                        ? "bg-blue-600 text-white"
                        : "text-gray-500 hover:text-gray-900 hover:bg-gray-50",
                    ].join(" ")}
                  >
                    <List className="w-3.5 h-3.5" />
                    Lista
                  </button>
                </div>
              </div>
            </div>

            {/* Calendar body */}
            {viewMode === "month" ? (
              <CalendarGridView
                year={year}
                month={month}
                events={filteredEvents}
                today={today}
              />
            ) : (
              <CalendarListView
                events={filteredEvents}
                selectedTeams={selectedTeams}
                selectedTypes={selectedTypes}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
