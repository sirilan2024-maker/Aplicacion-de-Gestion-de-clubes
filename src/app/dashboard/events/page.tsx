"use client"

import { useState, useEffect, useMemo } from "react"
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
  Trash2,
  Clock,
  MapPin,
  ClipboardCheck
} from "lucide-react"
import { CalendarEvent } from "@/components/features/events/mock-data"
import { CalendarGridView } from "@/components/features/events/CalendarGridView"
import { CalendarListView } from "@/components/features/events/CalendarListView"
import { createClient } from "@/lib/supabase/client"
import toast, { Toaster } from "react-hot-toast"
import { useRouter } from "next/navigation"
import { ManageMatchModal } from "@/components/features/matches/ManageMatchModal"
import { createTeamEventAction, updateTeamEventAction, deleteTeamEventAction } from "@/app/actions/event-actions"
import { format, parseISO, addDays, getDay, subDays } from "date-fns"
import { es } from "date-fns/locale"
import { getTeamHexColor } from "@/lib/team-colors"

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
  const router = useRouter()
  const today = new Date()
  const [viewMode, setViewMode] = useState<ViewMode>("month")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedTeams, setSelectedTeams] = useState<string[]>([])
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [dbTeams, setDbTeams] = useState<TeamData[]>([])
  const [dbEvents, setDbEvents] = useState<CalendarEvent[]>([])
  const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null)

  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [showMatchModal, setShowMatchModal] = useState(false)
  const [editingMatch, setEditingMatch] = useState<any>(null)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [modalTitle, setModalTitle] = useState("")
  const [modalDate, setModalDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  })
  const [modalStartTime, setModalStartTime] = useState("18:00")
  const [modalEndTime, setModalEndTime] = useState("19:30")
  const [modalType, setModalType] = useState<"Entrenamiento" | "Partido" | "Reunión" | "Otro">("Entrenamiento")
  const [modalLocation, setModalLocation] = useState("")
  const [modalSelectedTeams, setModalSelectedTeams] = useState<string[]>([])
  
  // Recurring state
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringDays, setRecurringDays] = useState<number[]>([])
  const [recurringEndDate, setRecurringEndDate] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Auto RSVP / Reminder states
  const [autoRsvp, setAutoRsvp] = useState(false)
  const [rsvpTimingType, setRsvpTimingType] = useState<"relative" | "exact">("relative")
  const [rsvpDaysBefore, setRsvpDaysBefore] = useState<number>(1)
  const [rsvpDate, setRsvpDate] = useState("")
  const [rsvpTime, setRsvpTime] = useState("19:00")

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
      .select("club_id, role, roles")
      .eq("id", user.id)
      .single()

    if (!profile?.club_id) {
      setLoading(false)
      return
    }

    const userRole = (profile.role || "").toLowerCase()
    const userRoles = (profile.roles || []).map((r: string) => r.toLowerCase())
    const isGlobalAdmin = userRole === "admin" || userRole === "superadmin" || userRole === "coordinador" ||
      userRoles.includes("admin") || userRoles.includes("superadmin") || userRoles.includes("coordinador")

    // Fetch active season (REGLA DE ORO: AISLAMIENTO PERMANENTE DE TEMPORADAS)
    const { data: activeSeason } = await supabase
      .from('seasons')
      .select('id')
      .eq('club_id', profile.club_id)
      .eq('is_active', true)
      .single()

    const currentSeasonId = activeSeason?.id || "663ed6ef-1dab-4350-9489-ed50f9e9ac15"
    setActiveSeasonId(currentSeasonId)

    // Si es entrenador y no admin/coordinador, consultar exclusivamente sus equipos asignados
    let coachTeamIds: string[] | null = null
    if (!isGlobalAdmin) {
      const { data: coachAssignments } = await supabase
        .from('team_coaches')
        .select('team_id')
        .eq('profile_id', user.id)

      if (coachAssignments && coachAssignments.length > 0) {
        coachTeamIds = coachAssignments.map(ca => ca.team_id).filter(Boolean)
      } else {
        coachTeamIds = []
      }
    }

    // Fetch teams de la temporada activa únicamente
    let teamsQuery = supabase
      .from('teams')
      .select("id, name, color")
      .eq("club_id", profile.club_id)
      .eq('season_id', currentSeasonId)
      .neq('season_id', '584f508a-fc1a-4339-b5b2-4296ffde2f4c')

    if (coachTeamIds !== null) {
      if (coachTeamIds.length === 0) {
        setDbTeams([])
        setDbEvents([])
        setLoading(false)
        return
      }
      teamsQuery = teamsQuery.in('id', coachTeamIds)
    }

    const { data: equipos } = await teamsQuery.order("name")

    if (!equipos) {
      setLoading(false)
      return
    }

    const mappedTeams = equipos.map((eq, idx) => ({
      id: eq.id,
      name: eq.name,
      hex: getTeamHexColor(eq, idx)
    }))
    setDbTeams(mappedTeams)

    // Fetch events for those teams (estrictamente temporada activa)
    const teamIds = equipos.map(eq => eq.id)
    if (teamIds.length > 0) {
      const eventsQuery = supabase
        .from("team_events")
        .select("*")
        .in("team_id", teamIds)
        .eq('season_id', currentSeasonId)
        .neq('season_id', '584f508a-fc1a-4339-b5b2-4296ffde2f4c')

      const partidosQuery = supabase
        .from("partidos")
        .select("*")
        .in("equipo_id", teamIds)
        .eq('season_id', currentSeasonId)
        .neq('season_id', '584f508a-fc1a-4339-b5b2-4296ffde2f4c')
        .order("fecha_hora", { ascending: true })

      const [eventsRes, partidosRes] = await Promise.all([
        eventsQuery,
        partidosQuery
      ])

      const mappedEvents: CalendarEvent[] = []
      const seenKeys = new Set<string>()

      // 1. Procesar primero los partidos oficiales de `partidos` para conservar su ID real y permitir abrir/editar el partido
      if (partidosRes.data) {
        partidosRes.data.forEach((p: any) => {
          if (!p.fecha_hora) return;
          const dt = new Date(p.fecha_hora)
          const dateStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
          const key = `${p.equipo_id}_${dateStr}_Partido`
          if (seenKeys.has(key)) return;
          seenKeys.add(key)

          const timeStr = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`
          const teamInfo = mappedTeams.find(t => t.id === p.equipo_id)
          
          let title = `Jornada (vs ${p.rival_nombre || 'Rival'})`
          if (p.lugar === 'Local') {
            title = `${teamInfo?.name || 'Local'} vs ${p.rival_nombre || 'Visitante'}`
          } else {
            title = `${p.rival_nombre || 'Local'} vs ${teamInfo?.name || 'Visitante'}`
          }

          mappedEvents.push({
            id: p.id,
            title: title,
            date: dateStr,
            time: timeStr,
            type: "Partido",
            teamId: p.equipo_id,
            teamName: teamInfo?.name || "Equipo",
            teamColor: "", 
            teamHex: teamInfo?.hex || getTeamHexColor(teamInfo),
            location: p.lugar || "",
            isOfficialMatch: true
          })
        })
      }

      // 2. Procesar los eventos de `team_events` (entrenamientos, reuniones y eventos manuales no duplicados)
      if (eventsRes.data) {
        eventsRes.data.forEach((ev: any) => {
          const teamInfo = mappedTeams.find(t => t.id === ev.team_id)
          const key = `${ev.team_id}_${ev.date}_${ev.event_type}`
          if (ev.event_type === 'Partido' && seenKeys.has(key)) {
            return
          }
          seenKeys.add(key)

          mappedEvents.push({
            id: ev.id,
            title: ev.title,
            date: ev.date, // "YYYY-MM-DD" expected
            time: ev.start_time ? ev.start_time.substring(0, 5) : "00:00",
            type: ev.event_type as "Entrenamiento" | "Partido" | "Reunión" | "Otro",
            teamId: ev.team_id,
            teamName: teamInfo?.name || "Equipo",
            teamColor: "", 
            teamHex: teamInfo?.hex || getTeamHexColor(teamInfo),
            location: ev.location || "",
            isOfficialMatch: false
          })
        })
      }

      mappedEvents.sort((a, b) => {
        const timeA = new Date(`${a.date}T${a.time}:00`).getTime();
        const timeB = new Date(`${b.date}T${b.time}:00`).getTime();
        const diff = (isNaN(timeA) ? 0 : timeA) - (isNaN(timeB) ? 0 : timeB);
        return diff !== 0 ? diff : a.title.localeCompare(b.title);
      });

      setDbEvents(mappedEvents)
    }
    setLoading(false)
  }

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const handlePrev = () => {
    const d = new Date(year, month - 1, 1)
    setCurrentDate(d)
    setSelectedCalendarDate(null)
  }
  const handleNext = () => {
    const d = new Date(year, month + 1, 1)
    setCurrentDate(d)
    setSelectedCalendarDate(null)
  }
  const handleToday = () => {
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1))
    setSelectedCalendarDate(null)
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
    setIsRecurring(false)
    setRecurringDays([])
    setRecurringEndDate("")
    setAutoRsvp(false)
    setRsvpTimingType("relative")
    setRsvpDaysBefore(1)
    setRsvpDate("")
    setRsvpTime("19:00")
    setShowModal(true)
  }

  const handleOpenEditModal = (ev: CalendarEvent) => {
    if (ev.isOfficialMatch) {
      router.push(`/dashboard/matches/${ev.id}`)
      return
    }

    setEditingEventId(ev.id)
    setModalTitle(ev.title)
    setModalDate(ev.date)
    setModalStartTime(ev.time)
    setModalEndTime("19:30") // MOCK_EVENTS didn't have end_time, real ones might
    setModalType(ev.type as any)
    setModalLocation(ev.location || "")
    setModalSelectedTeams([ev.teamId]) // When editing, we only edit for ONE specific team (as discussed in plan)
    setAutoRsvp(false)
    setShowModal(true)
  }

  const handleDeleteEvent = async (id: string, isOfficialMatch?: boolean) => {
    if (isOfficialMatch) {
      toast.error("Para eliminar un partido oficial, hazlo desde la sección de partidos.")
      return
    }
    if (!confirm("¿Eliminar este evento permanentemente?")) return
    setSubmitting(true)
    const targetEv = dbEvents.find(ev => ev.id === id)
    const targetTeamId = targetEv?.teamId || modalSelectedTeams[0]
    try {
      if (!targetTeamId) throw new Error("No se pudo identificar el equipo del evento")
      await deleteTeamEventAction(id, targetTeamId)
      toast.success("Evento eliminado")
      setShowModal(false)
      fetchData()
    } catch (err: any) {
      toast.error("Error al eliminar: " + (err?.message || "Error inesperado"))
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!modalTitle || modalSelectedTeams.length === 0) {
      toast.error("Rellena el título y selecciona al menos un equipo")
      return
    }

    setSubmitting(true)

    const computeReminderTime = (eventDateStr: string) => {
      if (!autoRsvp) return null
      if (rsvpTimingType === 'exact') {
        return rsvpDate && rsvpTime ? new Date(`${rsvpDate}T${rsvpTime}:00`).toISOString() : null
      }
      const d = subDays(parseISO(eventDateStr), rsvpDaysBefore)
      const dStr = format(d, 'yyyy-MM-dd')
      return new Date(`${dStr}T${rsvpTime}:00`).toISOString()
    }
    
    try {
      if (editingEventId) {
        // Edit a single event via Server Action
        const targetTeamId = modalSelectedTeams[0]
        const eventData = {
          title: modalTitle,
          event_type: modalType,
          date: modalDate,
          start_time: modalStartTime,
          end_time: modalEndTime || null,
          location: modalLocation || null,
          rsvp_reminder_time: computeReminderTime(modalDate)
        }
        await updateTeamEventAction(editingEventId, targetTeamId, eventData)
        toast.success("Evento actualizado")
        setShowModal(false)
        fetchData()
      } else {
        // Create new event(s) for all selected teams via Server Action
        if (isRecurring && (!recurringEndDate || recurringDays.length === 0)) {
          toast.error("Selecciona días y fecha fin para la recurrencia.")
          setSubmitting(false)
          return
        }

        const eventsToInsert: Array<{ teamId: string; payload: any }> = []
        
        if (!isRecurring) {
          const reminderTime = computeReminderTime(modalDate)
          modalSelectedTeams.forEach(tid => {
            eventsToInsert.push({
              teamId: tid,
              payload: {
                title: modalTitle,
                event_type: modalType,
                date: modalDate,
                start_time: modalStartTime,
                end_time: modalEndTime || null,
                location: modalLocation || null,
                rsvp_reminder_time: reminderTime
              }
            })
          })
        } else {
          let currentDate = parseISO(modalDate)
          const end = parseISO(recurringEndDate)
          
          let iterations = 0
          while (currentDate <= end && iterations < 730) {
            if (recurringDays.includes(getDay(currentDate))) {
              const dateStr = format(currentDate, 'yyyy-MM-dd')
              const reminderTime = computeReminderTime(dateStr)
              modalSelectedTeams.forEach(tid => {
                eventsToInsert.push({
                  teamId: tid,
                  payload: {
                    title: modalTitle,
                    event_type: modalType,
                    date: dateStr,
                    start_time: modalStartTime,
                    end_time: modalEndTime || null,
                    location: modalLocation || null,
                    rsvp_reminder_time: reminderTime
                  }
                })
              })
            }
            currentDate = addDays(currentDate, 1)
            iterations++
          }
          
          if (eventsToInsert.length === 0) {
            toast.error("No hay fechas válidas en el rango seleccionado.")
            setSubmitting(false)
            return
          }
        }

        for (const item of eventsToInsert) {
          await createTeamEventAction(item.teamId, item.payload, activeSeasonId || undefined)
        }

        toast.success(eventsToInsert.length > 1 ? `${eventsToInsert.length} eventos creados` : "Evento creado")
        setShowModal(false)
        fetchData()
      }
    } catch (err: any) {
      toast.error("Error al guardar: " + (err?.message || "Error inesperado"))
    } finally {
      setSubmitting(false)
    }
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

  const displayListEvents = useMemo(() => {
    if (selectedCalendarDate) {
      return filteredEvents.filter(e => e.date === selectedCalendarDate);
    }
    return filteredEvents;
  }, [filteredEvents, selectedCalendarDate]);

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
      <div className="w-full max-w-[1720px] mx-auto px-3 sm:px-5 lg:px-6 py-4">

        {/* ─── Page Header ──────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight">Eventos y Calendario</h1>
            <p className="text-xs font-semibold text-gray-500 mt-0.5">
              {eventCountThisMonth} eventos en {MONTH_NAMES[month]}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={async () => {
                const res = await fetch('/api/events/send-reminders', { method: 'POST' });
                if (res.ok) {
                  const data = await res.json();
                  toast.success(`Recordatorios enviados: ${data.message || 'OK'}`);
                } else {
                  toast.error("Error al enviar recordatorios");
                }
              }}
              className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 transition-all shadow-2xs"
            >
              <CalendarDays className="w-3.5 h-3.5 text-slate-500" />
              Enviar Recordatorios
            </button>
            <button 
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs shadow-blue-200 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Nuevo Evento
            </button>
          </div>
        </div>

        {/* ─── Two-column Layout ────────────────────────────────────────── */}
        <div className="flex gap-3.5 lg:gap-4 flex-col md:flex-row items-start">

          {/* ── LEFT SIDEBAR (COMPACT) ─────────────────────────────────── */}
          <aside className="w-full md:w-44 lg:w-48 shrink-0 space-y-2.5">

            {/* Tipos de evento */}
            <details className="bg-white rounded-xl border border-blue-100 shadow-2xs group [&_summary::-webkit-details-marker]:hidden hover:border-blue-200 transition-colors">
              <summary className="flex items-center justify-between p-2.5 cursor-pointer outline-none bg-blue-50/30 rounded-t-xl group-open:bg-blue-50/50 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                    <CalendarDays className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-xs font-black uppercase tracking-wider text-blue-900">Eventos</p>
                </div>
                <span className="text-blue-400 group-open:rotate-180 transition-transform text-xs font-bold">▼</span>
              </summary>
              <div className="px-3 pb-3 space-y-2 pt-2">
                {(["Entrenamiento", "Partido", "Reunión", "Otro"]).map((type) => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(type)}
                      onChange={() => toggleType(type)}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex items-center gap-1.5 min-w-0">
                      {type === "Entrenamiento" ? (
                        <Dumbbell className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : type === "Partido" ? (
                        <Trophy className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      ) : (
                        <CalendarDays className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      )}
                      <span className="text-xs text-gray-700 font-bold group-hover:text-blue-700 transition-colors truncate">
                        {type}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </details>

            {/* Equipos */}
            <details className="bg-white rounded-xl border border-blue-100 shadow-2xs group [&_summary::-webkit-details-marker]:hidden hover:border-blue-200 transition-colors">
              <summary className="flex items-center justify-between p-2.5 cursor-pointer outline-none bg-blue-50/30 rounded-t-xl group-open:bg-blue-50/50 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <p className="text-xs font-black uppercase tracking-wider text-blue-900">Equipos</p>
                </div>
                <span className="text-blue-400 group-open:rotate-180 transition-transform text-xs font-bold">▼</span>
              </summary>
              <div className="px-3 pb-3 space-y-2 max-h-56 overflow-y-auto pt-2">
                {dbTeams.map((team) => (
                  <label key={team.id} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedTeams.includes(team.id)}
                      onChange={() => toggleTeam(team.id)}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs border border-white"
                        style={{ backgroundColor: team.hex }}
                      />
                      <span className="text-xs text-gray-800 font-bold group-hover:text-blue-700 transition-colors truncate">
                        {team.name}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </details>

            {/* Mini stats */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-3 text-white shadow-2xs">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-200 mb-2">Este mes</p>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-blue-100 flex items-center gap-1.5 font-medium">
                    <Dumbbell className="w-3.5 h-3.5" /> Entrenos
                  </span>
                  <span className="font-black text-base">
                    {dbEvents.filter(e => e.date.startsWith(monthStr) && e.type === "Entrenamiento").length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-blue-100 flex items-center gap-1.5 font-medium">
                    <Trophy className="w-3.5 h-3.5" /> Partidos
                  </span>
                  <span className="font-black text-base">
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

              {/* Selector rápido de meses de la temporada con badge de partidos */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
                {[
                  { label: "Ago 26", y: 2026, m: 7 },
                  { label: "Sep 25", y: 2025, m: 8 },
                  { label: "Oct 25", y: 2025, m: 9 },
                  { label: "Nov 25", y: 2025, m: 10 },
                  { label: "Dic 25", y: 2025, m: 11 },
                  { label: "Ene 26", y: 2026, m: 0 },
                  { label: "Feb 26", y: 2026, m: 1 },
                  { label: "Mar 26", y: 2026, m: 2 },
                  { label: "Abr 26", y: 2026, m: 3 },
                  { label: "May 26", y: 2026, m: 4 },
                ].map((item) => {
                  const isSel = year === item.y && month === item.m;
                  const matchCount = dbEvents.filter(e => e.date.startsWith(`${item.y}-${String(item.m+1).padStart(2,'0')}`) && e.type === "Partido").length;
                  return (
                    <button
                      key={item.label}
                      onClick={() => setCurrentDate(new Date(item.y, item.m, 1))}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 whitespace-nowrap shadow-sm ${
                        isSel
                          ? 'bg-blue-600 text-white shadow-blue-200'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{item.label}</span>
                      {matchCount > 0 && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${isSel ? 'bg-blue-800 text-white' : 'bg-blue-100 text-blue-800'}`}>
                          ⚽ {matchCount}
                        </span>
                      )}
                    </button>
                  );
                })}
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

                {/* View toggle (Desktop only) */}
                <div className="hidden md:flex bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
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
            <div className="hidden md:block">
              {viewMode === "month" ? (
                <>
                  <CalendarGridView
                    year={year}
                    month={month}
                    events={filteredEvents}
                    today={today}
                    onEventClick={handleOpenEditModal}
                    selectedDate={selectedCalendarDate}
                    onDateClick={(dateStr) => {
                      setSelectedCalendarDate(dateStr);
                      setTimeout(() => {
                        const el = document.getElementById('events-day-section');
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }, 50);
                    }}
                  />

                  {/* Lista de eventos del mes o del día seleccionado */}
                  <div id="events-day-section" className="mt-8 bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4 scroll-mt-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-3 gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <CalendarDays className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-slate-900 capitalize tracking-tight">
                            {selectedCalendarDate 
                              ? format(parseISO(selectedCalendarDate), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
                              : `Eventos de ${MONTH_NAMES[month]} de ${year}`}
                          </h3>
                          <p className="text-xs text-slate-500 font-medium">
                            {displayListEvents.length} {displayListEvents.length === 1 ? 'evento programado' : 'eventos programados'}
                          </p>
                        </div>
                      </div>

                      {selectedCalendarDate && (
                        <button
                          onClick={() => setSelectedCalendarDate(null)}
                          className="self-start sm:self-auto px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-2 shadow-2xs cursor-pointer"
                          title="Mostrar todos los eventos del mes"
                        >
                          <span>Ver todo el mes ({filteredEvents.length})</span>
                          <span className="w-4 h-4 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center text-[10px]">✕</span>
                        </button>
                      )}
                    </div>

                    {displayListEvents.length === 0 ? (
                      <div className="text-center py-10 text-slate-400">
                        <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-50 text-slate-300" />
                        <p className="font-bold text-sm text-slate-700">
                          {selectedCalendarDate 
                            ? `No hay eventos programados para el ${format(parseISO(selectedCalendarDate), "d 'de' MMMM", { locale: es })}.`
                            : "No hay eventos registrados para este mes con los filtros seleccionados."}
                        </p>
                        {selectedCalendarDate && (
                          <button
                            onClick={() => setSelectedCalendarDate(null)}
                            className="mt-3 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                          >
                            Mostrar todos los eventos de {MONTH_NAMES[month]} ({filteredEvents.length})
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {displayListEvents.map((event) => {
                          const hex = event.teamHex || '#2563eb';
                          return (
                          <div 
                            key={event.id}
                            className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all bg-white gap-4 border-l-4"
                            style={{ borderLeftColor: hex }}
                          >
                            <div className="flex items-center gap-4">
                              <div 
                                className="w-12 h-12 rounded-xl flex items-center justify-center border shadow-2xs shrink-0"
                                style={{
                                  backgroundColor: `${hex}15`,
                                  borderColor: `${hex}30`,
                                  color: hex
                                }}
                              >
                                {event.type === 'Partido' ? <Trophy className="w-5 h-5" /> : 
                                 event.type === 'Entrenamiento' ? <Dumbbell className="w-5 h-5" /> : 
                                 <CalendarDays className="w-5 h-5" />}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-bold text-slate-900 text-base">
                                    {event.title}
                                  </h4>
                                  <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${
                                    event.type === 'Entrenamiento' ? 'bg-emerald-100 text-emerald-800' :
                                    event.type === 'Partido' ? 'bg-blue-100 text-blue-800' :
                                    'bg-amber-100 text-amber-800'
                                  }`}>
                                    {event.type}
                                  </span>
                                  {event.teamName && (
                                    <span 
                                      className="text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1.5 shadow-2xs text-slate-900"
                                      style={{
                                        backgroundColor: `${hex}18`,
                                        borderColor: `${hex}45`,
                                      }}
                                    >
                                      <span className="w-2 h-2 rounded-full shrink-0 border border-white" style={{ backgroundColor: hex }}></span>
                                      <span className="text-slate-900 font-bold">{event.teamName}</span>
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mt-1 font-medium">
                                  <span className="flex items-center gap-1.5 text-slate-700">
                                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                                    {format(parseISO(event.date), "EEEE d 'de' MMMM", { locale: es })} • {event.time}
                                  </span>
                                  {event.location && (
                                    <span className="flex items-center gap-1.5">
                                      <MapPin className="w-3.5 h-3.5 text-red-400" />
                                      {event.location}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* ACTION BUTTONS */}
                            <div className="w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-0 border-gray-100 flex gap-2">
                              {event.isOfficialMatch ? (
                                <>
                                  <button 
                                    onClick={() => router.push(`/dashboard/matches/${event.id}`)}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors"
                                  >
                                    Ver Partido
                                  </button>
                                  <button 
                                    onClick={() => router.push(`/dashboard/equipos/${event.teamId}/partidos/${event.id}?tab=post-partido&action=pasar-lista`)}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors"
                                  >
                                    <ClipboardCheck className="w-4 h-4" />
                                    Pasar Lista
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button 
                                    onClick={() => handleOpenEditModal(event)}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-600 px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors"
                                  >
                                    Editar
                                  </button>
                                  <button 
                                    onClick={() => router.push(`/dashboard/equipos/${event.teamId}/asistencia?eventId=${event.id}&date=${event.date}`)}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors"
                                  >
                                    <ClipboardCheck className="w-4 h-4" />
                                    Pasar Lista
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteEvent(event.id, event.isOfficialMatch)}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-lg text-sm font-bold shadow-sm border border-red-100 transition-colors"
                                    title="Eliminar evento"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                        })}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <CalendarListView
                  events={filteredEvents}
                  selectedTeams={selectedTeams}
                  selectedTypes={selectedTypes}
                  onEventClick={handleOpenEditModal}
                />
              )}
            </div>
            
            {/* Mobile Calendar Body (Cards List forced) */}
            <div className="block md:hidden pb-12">
              <CalendarListView
                events={filteredEvents}
                selectedTeams={selectedTeams}
                selectedTypes={selectedTypes}
                onEventClick={handleOpenEditModal}
              />
            </div>
          </div>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="shrink-0 bg-gray-50 border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <CalendarDays className="text-blue-600 w-5 h-5" />
                {editingEventId ? "Editar Evento" : "Nuevo Evento"}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 hover:bg-gray-200 p-1 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveEvent} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
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
                      onChange={e => {
                        const val = e.target.value;
                        if (val === 'Partido') {
                          setShowModal(false);
                          setEditingMatch({ id: 'new', fecha_hora: new Date().toISOString() });
                          setShowMatchModal(true);
                          setModalType('Entrenamiento');
                        } else {
                          setModalType(val as any);
                        }
                      }}
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
                
                {/* RECURRENCIA */}
                {!editingEventId && (
                  <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-3 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={isRecurring}
                        onChange={e => setIsRecurring(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <span className="font-bold text-blue-900">Evento Recurrente</span>
                    </label>
                    
                    {isRecurring && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200 mt-2">
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1.5">Días de la semana</label>
                          <div className="flex flex-wrap gap-2">
                            {[{id: 1, label: 'L'}, {id: 2, label: 'M'}, {id: 3, label: 'X'}, {id: 4, label: 'J'}, {id: 5, label: 'V'}, {id: 6, label: 'S'}, {id: 0, label: 'D'}].map(day => (
                              <button
                                type="button"
                                key={day.id}
                                onClick={() => {
                                  if (recurringDays.includes(day.id)) {
                                    setRecurringDays(recurringDays.filter(d => d !== day.id));
                                  } else {
                                    setRecurringDays([...recurringDays, day.id]);
                                  }
                                }}
                                className={`w-9 h-9 rounded-full font-bold flex items-center justify-center transition-colors ${recurringDays.includes(day.id) ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                              >
                                {day.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1.5">Repetir hasta (Fecha Fin)</label>
                          <input 
                            type="date" 
                            value={recurringEndDate}
                            onChange={(e) => setRecurringEndDate(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                            required={isRecurring}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* PROGRAMACIÓN AUTOMÁTICA DE ASISTENCIA / RECORDATORIO */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 mt-2 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={autoRsvp}
                      onChange={(e) => setAutoRsvp(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="font-bold text-slate-900 text-sm">Petición de asistencia / Recordatorio automático</span>
                  </label>
                  
                  {autoRsvp && (
                    <div className="space-y-3 pt-1 animate-in fade-in slide-in-from-top-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Cuándo avisar</label>
                          <select
                            value={rsvpTimingType === 'exact' ? 'exact' : String(rsvpDaysBefore)}
                            onChange={(e) => {
                              if (e.target.value === 'exact') {
                                setRsvpTimingType('exact');
                              } else {
                                setRsvpTimingType('relative');
                                setRsvpDaysBefore(Number(e.target.value));
                              }
                            }}
                            className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-xs font-medium"
                          >
                            <option value="1">1 día antes (Recomendado)</option>
                            <option value="0">El mismo día del evento</option>
                            <option value="2">2 días antes</option>
                            <option value="3">3 días antes</option>
                            <option value="exact">Fecha fija específica</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Hora de envío</label>
                          <input 
                            type="time" 
                            required={autoRsvp}
                            value={rsvpTime}
                            onChange={e => setRsvpTime(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-xs font-medium" 
                          />
                        </div>
                      </div>

                      {rsvpTimingType === 'exact' && (
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Fecha fija de envío</label>
                          <input 
                            type="date" 
                            required={autoRsvp && rsvpTimingType === 'exact'}
                            value={rsvpDate}
                            onChange={e => setRsvpDate(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-xs" 
                          />
                        </div>
                      )}

                      <p className="text-[11px] text-blue-700 font-medium bg-blue-100/60 p-2 rounded-lg">
                        {rsvpTimingType === 'exact' 
                          ? `Se solicitará la confirmación el ${rsvpDate || '...'} a las ${rsvpTime}.`
                          : isRecurring
                            ? `Para cada sesión generada, se enviará la petición automáticamente ${rsvpDaysBefore === 0 ? 'el mismo día' : `${rsvpDaysBefore} día${rsvpDaysBefore > 1 ? 's' : ''} antes`} a las ${rsvpTime}.`
                            : modalDate
                              ? `Se solicitará la confirmación el ${format(subDays(parseISO(modalDate), rsvpDaysBefore), "EEEE d 'de' MMMM", { locale: es })} a las ${rsvpTime}.`
                              : `Se enviará la petición ${rsvpDaysBefore === 0 ? 'el mismo día' : `${rsvpDaysBefore} día(s) antes`} a las ${rsvpTime}.`
                        }
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="shrink-0 bg-gray-50 border-t border-gray-100 px-6 py-4 flex items-center justify-between">
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
                    className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold shadow-sm disabled:opacity-50 transition-colors"
                  >
                    {submitting ? "Guardando..." : (editingEventId ? "Guardar Cambios" : "Guardar Evento")}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMatchModal && editingMatch && (
        <ManageMatchModal
          match={editingMatch}
          teams={dbTeams}
          onClose={() => {
            setShowMatchModal(false)
            setEditingMatch(null)
          }}
          onSave={() => {
            setShowMatchModal(false)
            setEditingMatch(null)
            fetchData() // refresh events list
          }}
        />
      )}
    </div>
  )
}
