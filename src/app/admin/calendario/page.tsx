"use client"

import React, { useState, useEffect, useMemo } from 'react'
import {
  Calendar as CalendarIcon,
  Trophy,
  Activity,
  Users,
  MapPin,
  Clock,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  AlertCircle,
  Loader2,
  List,
  Grid,
  Shield
} from 'lucide-react'
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  getDay
} from 'date-fns'
import { es } from 'date-fns/locale'
import {
  getGlobalCalendarAction,
  GlobalCalendarEventDTO,
  CalendarMonthKPIs
} from '@/app/actions/calendar-actions'

export default function AdminCalendarioPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [events, setEvents] = useState<GlobalCalendarEventDTO[]>([])
  const [teams, setTeams] = useState<Array<{ id: string; name: string; category: string }>>([])
  const [kpis, setKpis] = useState<CalendarMonthKPIs | null>(null)

  // Filtros
  const [selectedTeam, setSelectedTeam] = useState<string>('todos')
  const [selectedType, setSelectedType] = useState<string>('todos')
  const [viewMode, setViewMode] = useState<'mes' | 'lista'>('mes')
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date())

  const fetchCalendar = async () => {
    setLoading(true)
    setError(null)
    try {
      const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
      const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd')

      const res = await getGlobalCalendarAction({
        startDate: start,
        endDate: end,
        teamId: selectedTeam !== 'todos' ? selectedTeam : undefined
      })

      if (!res.success) {
        setError(res.error || 'Error al cargar eventos del calendario')
      } else {
        setEvents(res.events || [])
        setTeams(res.teams || [])
        setKpis(res.kpis || null)
      }
    } catch (err: any) {
      setError(err?.message || 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCalendar()
  }, [currentMonth, selectedTeam])

  // Filtrar eventos reactivamente por tipo
  const filteredEvents = useMemo(() => {
    if (selectedType === 'todos') return events
    return events.filter(e => e.type === selectedType)
  }, [events, selectedType])

  // Eventos del día seleccionado
  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) return []
    const dayStr = format(selectedDay, 'yyyy-MM-dd')
    return filteredEvents.filter(e => e.date === dayStr)
  }, [filteredEvents, selectedDay])

  // Días del calendario mensual (incluyendo padding para semana lunes-domingo)
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    const days = eachDayOfInterval({ start, end })

    // getDay returns 0 for Sunday, 1 for Monday
    const startDayOfWeek = getDay(start)
    // Convert to Monday=0, Sunday=6
    const leadPadding = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1

    return {
      days,
      leadPadding
    }
  }, [currentMonth])

  const getEventBadgeClass = (type: GlobalCalendarEventDTO['type']) => {
    switch (type) {
      case 'Partido':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'Entrenamiento':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'Reunión':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200'
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-200">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              Calendario Deportivo Global
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Programación unificada de partidos, entrenamientos y eventos del club
            </p>
          </div>
        </div>

        {/* Controles de Navegación de Mes */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white border border-slate-200 rounded-xl shadow-sm p-1">
            <button
              onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition"
              title="Mes anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="px-3 text-sm font-bold text-slate-800 capitalize min-w-[140px] text-center">
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </span>
            <button
              onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition"
              title="Mes siguiente"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-sm transition"
          >
            Hoy
          </button>

          <button
            onClick={fetchCalendar}
            disabled={loading}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl shadow-sm transition disabled:opacity-50"
            title="Recargar eventos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Eventos */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Eventos del Mes</span>
            <div className="text-2xl font-black text-slate-900">{kpis?.totalEvents || 0}</div>
          </div>
        </div>

        {/* Partidos */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Partidos</span>
            <div className="text-2xl font-black text-emerald-600">{kpis?.totalMatches || 0}</div>
          </div>
        </div>

        {/* Entrenamientos */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Entrenamientos</span>
            <div className="text-2xl font-black text-indigo-600">{kpis?.totalTrainings || 0}</div>
          </div>
        </div>

        {/* Reuniones / Otros */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Otros Eventos</span>
            <div className="text-2xl font-black text-amber-600">{kpis?.totalOther || 0}</div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Vistas */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Selector de Equipo */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 border border-slate-200 rounded-xl">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="todos">Todos los equipos ({teams.length})</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
              ))}
            </select>
          </div>

          {/* Selector de Tipo */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 border border-slate-200 rounded-xl">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="todos">Todos los tipos</option>
              <option value="Partido">Partidos</option>
              <option value="Entrenamiento">Entrenamientos</option>
              <option value="Reunión">Reuniones</option>
            </select>
          </div>
        </div>

        {/* Toggle Vista: Mes / Lista */}
        <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto self-end md:self-auto">
          <button
            onClick={() => setViewMode('mes')}
            className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
              viewMode === 'mes' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            Mes
          </button>
          <button
            onClick={() => setViewMode('lista')}
            className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
              viewMode === 'lista' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            Listado ({filteredEvents.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-sm">Cargando programación del club...</p>
        </div>
      ) : viewMode === 'mes' ? (
        /* VISTA MES CUADRÍCULA */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendario 2/3 */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 space-y-4">
            {/* Días de la semana */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100">
              <span>Lun</span>
              <span>Mar</span>
              <span>Mié</span>
              <span>Jue</span>
              <span>Vie</span>
              <span>Sáb</span>
              <span>Dom</span>
            </div>

            {/* Cuadrícula de días */}
            <div className="grid grid-cols-7 gap-1">
              {/* Espacios vacíos de padding inicial */}
              {Array.from({ length: calendarDays.leadPadding }).map((_, i) => (
                <div key={`lead-${i}`} className="min-h-[75px] md:min-h-[90px] p-1 bg-slate-50/50 rounded-xl" />
              ))}

              {/* Días del mes */}
              {calendarDays.days.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const dayEvents = filteredEvents.filter(e => e.date === dateStr)
                const isSelected = selectedDay && isSameDay(day, selectedDay)
                const isCurrentDay = isToday(day)

                return (
                  <div
                    key={dateStr}
                    onClick={() => setSelectedDay(day)}
                    className={`min-h-[75px] md:min-h-[90px] p-1.5 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/40 shadow-sm'
                        : isCurrentDay
                        ? 'border-blue-300 bg-blue-50/20'
                        : 'border-slate-100 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                          isCurrentDay
                            ? 'bg-blue-600 text-white'
                            : isSelected
                            ? 'text-blue-700'
                            : 'text-slate-700'
                        }`}
                      >
                        {format(day, 'd')}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="text-[10px] font-bold text-slate-400">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>

                    {/* Indicadores de eventos */}
                    <div className="space-y-1 mt-1 overflow-hidden">
                      {dayEvents.slice(0, 2).map((ev) => (
                        <div
                          key={ev.id}
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded truncate border ${getEventBadgeClass(ev.type)}`}
                          title={`${ev.startTime} ${ev.title} (${ev.teamName})`}
                        >
                          {ev.startTime} {ev.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-[9px] font-bold text-slate-400 text-center">
                          +{dayEvents.length - 2} más
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Panel Lateral: Detalle del Día Seleccionado */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h3 className="font-bold text-slate-900 text-base capitalize flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-blue-600" />
                  {selectedDay ? format(selectedDay, "EEEE, d 'de' MMMM", { locale: es }) : 'Selecciona un día'}
                </h3>
                <span className="text-xs font-bold text-slate-400">
                  {selectedDayEvents.length} eventos
                </span>
              </div>

              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {selectedDayEvents.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 space-y-1">
                    <CalendarIcon className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="text-sm font-semibold">Sin actividades</p>
                    <p className="text-xs text-slate-400">No hay eventos programados para este día</p>
                  </div>
                ) : (
                  selectedDayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${getEventBadgeClass(ev.type)}`}>
                          {ev.type}
                        </span>
                        <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {ev.startTime} {ev.endTime ? `- ${ev.endTime}` : ''}
                        </span>
                      </div>

                      <div className="font-bold text-slate-900 text-sm">
                        {ev.title}
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                        <span className="font-semibold text-slate-700 flex items-center gap-1">
                          <Shield className="w-3.5 h-3.5 text-blue-600" />
                          {ev.teamName} ({ev.teamCategory})
                        </span>
                        {ev.score && (
                          <span className="font-black text-slate-900 bg-slate-200 px-2 py-0.5 rounded">
                            {ev.score}
                          </span>
                        )}
                      </div>

                      {ev.location && (
                        <div className="text-xs text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {ev.location}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* VISTA LISTADO */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <List className="w-5 h-5 text-blue-600" />
              Eventos Cronológicos del Período
            </h2>
            <span className="text-xs text-slate-400 font-medium">
              {filteredEvents.length} eventos encontrados
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Fecha y Hora</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Equipo</th>
                  <th className="py-3 px-4">Evento / Rival</th>
                  <th className="py-3 px-4">Ubicación</th>
                  <th className="py-3 px-4 text-center">Estado / Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No hay eventos que coincidan con los filtros seleccionados
                    </td>
                  </tr>
                ) : (
                  filteredEvents.map((ev) => (
                    <tr key={ev.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{ev.date}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {ev.startTime} {ev.endTime ? `- ${ev.endTime}` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getEventBadgeClass(ev.type)}`}>
                          {ev.type}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{ev.teamName}</div>
                        <div className="text-xs text-slate-400 uppercase font-medium">{ev.teamCategory}</div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {ev.title}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-xs">
                        {ev.location || '-'}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {ev.score ? (
                          <span className="font-black text-xs px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {ev.score}
                          </span>
                        ) : ev.matchStatus ? (
                          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            {ev.matchStatus}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
