"use client"

import { useState, useEffect } from "react"
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
  Loader2,
  X,
  Trash2
} from "lucide-react"
import { CalendarEvent } from "@/components/features/events/mock-data"
import { CalendarGridView } from "@/components/features/events/CalendarGridView"
import { CalendarListView } from "@/components/features/events/CalendarListView"
import { createClient } from "@/lib/supabase/client"
import toast, { Toaster } from "react-hot-toast"

type ViewMode = "month" | "list"

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

interface TeamData {
  id: string;
  name: string;
  hex: string;
}

export default function EventsPage() {
  const today = new Date()
  const [viewMode, setViewMode] = useState<ViewMode>("month")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedTeams, setSelectedTeams] = useState<string[]>([])

  const [loading, setLoading] = useState(true)
  const [dbTeams, setDbTeams] = useState<TeamData[]>([])
  const [dbEvents, setDbEvents] = useState<CalendarEvent[]>([])

  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [modalTitle, setModalTitle] = useState("")
  const [modalDate, setModalDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  })
  const [modalStartTime, setModalStartTime] = useState("18:00")
  const [modalEndTime, setModalEndTime] = useState("19:30")
  const [modalType, setModalType] = useState<'Entrenamiento' | 'Partido' | 'Reunión' | 'Otro'>('Entrenamiento')
  const [modalLocation, setModalLocation] = useState("")
  const [modalSelectedTeams, setModalSelectedTeams] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from("profiles")
      .select("club_id")
      .eq("id", user.id)
      .single()

    if (!profile?.club_id) {
      setLoading(false)
      return
    }

    // Fetch teams
    const { data: equipos } = await supabase
      .from("equipos")
      .select("id, name, color")
      .eq("club_id", profile.club_id)
      .order("name")

    if (!equipos) {
      setLoading(false)
      return
    }

    const mappedTeams = equipos.map(eq => ({
      id: eq.id,
      name: eq.name,
      hex: eq.color || "#10b981"
    }))
    setDbTeams(mappedTeams)

    // Fetch events for those teams
    const teamIds = equipos.map(eq => eq.id)
    if (teamIds.length > 0) {
      const { data: eventsData } = await supabase
        .from("team_events")
        .select("*")
        .in("team_id", teamIds)

      if (eventsData) {
        const mappedEvents: CalendarEvent[] = eventsData.map(ev => {
          const teamInfo = mappedTeams.find(t => t.id === ev.team_id)
          return {
            id: ev.id,
            title: ev.title,
            date: ev.date, // "YYYY-MM-DD" expected
            time: ev.start_time ? ev.start_time.substring(0, 5) : "00:00",
            type: ev.event_type as "Entrenamiento" | "Partido" | "Reunión" | "Otro",
            teamId: ev.team_id,
            teamName: teamInfo?.name || "Equipo",
            teamColor: "", 
            teamHex: teamInfo?.hex || "#10b981",
            location: ev.location || ""
          }
        })
        setDbEvents(mappedEvents)
      }
    }
    setLoading(false)
  }

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

  // --- Modal Handlers ---
  const handleOpenCreateModal = () => {
    setEditingEventId(null)
    setModalTitle("")
    setModalStartTime("18:00")
    setModalEndTime("19:30")
    setModalType("Entrenamiento")
    setModalLocation("")
    setModalSelectedTeams([])
    setShowModal(true)
  }

  const handleOpenEditModal = (ev: CalendarEvent) => {
    setEditingEventId(ev.id)
    setModalTitle(ev.title)
    setModalDate(ev.date)
    setModalStartTime(ev.time)
    setModalEndTime("19:30") // MOCK_EVENTS didn't have end_time, real ones might
    setModalType(ev.type as any)
    setModalLocation(ev.location || "")
    setModalSelectedTeams([ev.teamId]) // When editing, we only edit for ONE specific team (as discussed in plan)
    setShowModal(true)
  }

  const handleDeleteEvent = async (id: string) => {
    if (!confirm("¿Eliminar este evento permanentemente?")) return
    setSubmitting(true)
    const { error } = await supabase.from("team_events").delete().eq("id", id)
    setSubmitting(false)
    if (error) {
      toast.error("Error al eliminar: " + error.message)
    } else {
      toast.success("Evento eliminado")
      setShowModal(false)
      fetchData()
    }
  }

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!modalTitle || modalSelectedTeams.length === 0) {
      toast.error("Rellena el título y selecciona al menos un equipo")
      return
    }

    setSubmitting(true)
    
    if (editingEventId) {
      // Edit a single event
      const eventData = {
        title: modalTitle,
        event_type: modalType,
        date: modalDate,
        start_time: modalStartTime,
        end_time: modalEndTime,
        location: modalLocation,
        // team_id is NOT updated, we keep it assigned to the original team
      }
      const { error } = await supabase.from("team_events").update(eventData).eq("id", editingEventId)
      if (error) {
        toast.error("Error al actualizar: " + error.message)
      } else {
        toast.success("Evento actualizado")
        setShowModal(false)
        fetchData()
      }
    } else {
      // Create new event(s) for all selected teams
      const eventsToInsert = modalSelectedTeams.map(tid => ({
        team_id: tid,
        title: modalTitle,
        event_type: modalType,
        date: modalDate,
        start_time: modalStartTime,
        end_time: modalEndTime,
        location: modalLocation
      }))
      const { error } = await supabase.from("team_events").insert(eventsToInsert)
      if (error) {
        toast.error("Error al crear: " + error.message)
      } else {
        toast.success("Eventos creados")
        setShowModal(false)
        fetchData()
      }
    }
    setSubmitting(false)
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
  const pad = (n: number) => String(n).padStart(2, "0")
  const monthStr = `${year}-${pad(month + 1)}`
  const filteredEvents: CalendarEvent[] = dbEvents.filter((ev) => {
    const inMonth = viewMode === "month" ? ev.date.startsWith(monthStr) : true
    const matchSearch =
      searchTerm === "" ||
      ev.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ev.teamName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchType = selectedTypes.length === 0 || selectedTypes.includes(ev.type)
    const matchTeam = selectedTeams.length === 0 || selectedTeams.includes(ev.teamId)
    return inMonth && matchSearch && matchType && matchTeam
  })

  const eventCountThisMonth = dbEvents.filter((e) =>
    e.date.startsWith(monthStr)
  ).length

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50/50 min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-full bg-gray-50/50">
      <Toaster position="bottom-right" />
      <div className="max-w-screen-xl mx-auto px-5 py-7">

        {/* ─── Page Header ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Eventos y Calendario</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {eventCountThisMonth} eventos en {MONTH_NAMES[month]}
            </p>
          </div>
          <button 
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-sm shadow-blue-200 transition-all"
          >
            <Plus className="w-4 h-4" />
            Nuevo Evento
          </button>
        </div>

        {/* ─── Two-column Layout ────────────────────────────────────────── */}
        <div className="flex gap-5 flex-col md:flex-row">

          {/* ── LEFT SIDEBAR ───────────────────────────────────────────── */}
          <aside className="w-full md:w-52 shrink-0 space-y-4">

            {/* Tipos de evento */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <CalendarDays className="w-4 h-4 text-gray-400" />
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Eventos</p>
              </div>
              <div className="space-y-2">
                {(["Entrenamiento", "Partido", "Reunión", "Otro"]).map((type) => (
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
                      ) : type === "Partido" ? (
                        <Trophy className="w-3.5 h-3.5 text-blue-500" />
                      ) : (
                        <CalendarDays className="w-3.5 h-3.5 text-slate-500" />
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
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 max-h-64 overflow-y-auto">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-gray-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </span>
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Equipo</p>
              </div>
              <div className="space-y-2">
                {dbTeams.map((team) => (
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
                    {dbEvents.filter(e => e.date.startsWith(monthStr) && e.type === "Entrenamiento").length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-100 flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5" /> Partidos
                  </span>
                  <span className="font-bold text-lg">
                    {dbEvents.filter(e => e.date.startsWith(monthStr) && e.type === "Partido").length}
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
                onEventClick={handleOpenEditModal}
              />
            ) : (
              <CalendarListView
                events={filteredEvents}
                selectedTeams={selectedTeams}
                selectedTypes={selectedTypes}
                onEventClick={handleOpenEditModal}
              />
            )}
          </div>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <CalendarDays className="text-blue-600 w-5 h-5" />
                {editingEventId ? "Editar Evento" : "Nuevo Evento"}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 hover:bg-gray-200 p-1 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveEvent} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Título del Evento</label>
                <input 
                  required 
                  value={modalTitle}
                  onChange={e => setModalTitle(e.target.value)}
                  placeholder="Ej. Entrenamiento Técnico..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Tipo</label>
                  <select 
                    value={modalType} 
                    onChange={e => setModalType(e.target.value as any)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Entrenamiento">Entrenamiento</option>
                    <option value="Partido">Partido</option>
                    <option value="Reunión">Reunión</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Fecha</label>
                  <input 
                    type="date" 
                    required 
                    value={modalDate}
                    onChange={e => setModalDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Hora Inicio</label>
                  <input 
                    type="time" 
                    required 
                    value={modalStartTime}
                    onChange={e => setModalStartTime(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Hora Fin (opcional)</label>
                  <input 
                    type="time" 
                    value={modalEndTime}
                    onChange={e => setModalEndTime(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Ubicación</label>
                <input 
                  value={modalLocation}
                  onChange={e => setModalLocation(e.target.value)}
                  placeholder="Ej. Campo Norte"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Equipos (Selecciona uno o más)</label>
                <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                  {dbTeams.map(team => (
                    <label key={team.id} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
                      <input 
                        type="checkbox"
                        disabled={!!editingEventId && !modalSelectedTeams.includes(team.id)}
                        checked={modalSelectedTeams.includes(team.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setModalSelectedTeams([...modalSelectedTeams, team.id])
                          } else {
                            setModalSelectedTeams(modalSelectedTeams.filter(id => id !== team.id))
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-slate-700">{team.name}</span>
                    </label>
                  ))}
                </div>
                {!!editingEventId && (
                  <p className="text-[10px] text-gray-400 mt-1">Al editar un evento, solo puedes modificar el equipo asignado originalmente.</p>
                )}
              </div>
              
              <div className="pt-4 flex items-center justify-between border-t border-gray-100">
                {editingEventId ? (
                  <button 
                    type="button"
                    onClick={() => handleDeleteEvent(editingEventId)}
                    className="flex items-center gap-1.5 px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg font-bold transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> Eliminar
                  </button>
                ) : <div></div>}
                <div className="flex items-center gap-2">
                  <button 
                    type="button" 
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold shadow-sm disabled:opacity-50 transition-colors"
                  >
                    {submitting ? "Guardando..." : "Guardar Evento"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
