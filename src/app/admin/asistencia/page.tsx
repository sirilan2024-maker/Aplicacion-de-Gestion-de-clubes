"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  RefreshCw,
  Calendar,
  Users,
  Shield,
  FileText,
  Loader2,
  AlertCircle
} from "lucide-react"
import {
  getGlobalAttendanceAction,
  AttendanceRecordDTO,
  AttendanceKPIs
} from "@/app/actions/attendance-actions"
import { AttendanceKPIsHeader } from "@/components/features/admin/attendance/AttendanceKPIsHeader"
import { AttendanceFilters, PeriodType } from "@/components/features/admin/attendance/AttendanceFilters"
import { AttendanceDaysView } from "@/components/features/admin/attendance/AttendanceDaysView"
import { AttendanceMatrixView } from "@/components/features/admin/attendance/AttendanceMatrixView"
import { AttendanceTeamsView } from "@/components/features/admin/attendance/AttendanceTeamsView"
import { AttendanceRecordsView } from "@/components/features/admin/attendance/AttendanceRecordsView"
import { AttendancePlayerDrawer } from "@/components/features/admin/attendance/AttendancePlayerDrawer"
import { AttendanceSessionModal } from "@/components/features/admin/attendance/AttendanceSessionModal"

type ViewMode = "days" | "matrix" | "teams" | "records"

export default function AdminAsistenciaPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [records, setRecords] = useState<AttendanceRecordDTO[]>([])
  const [teams, setTeams] = useState<Array<{ id: string; name: string; category: string }>>([])

  // Vista activa (por defecto: Resumen por días)
  const [viewMode, setViewMode] = useState<ViewMode>("days")

  // Mes seleccionado para la Matriz Mensual (por defecto: mes actual)
  const [matrixMonth, setMatrixMonth] = useState<Date>(() => new Date())

  // Estado para la Ficha Individual del Jugador (Drawer)
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)

  // Estado para el Detalle de Sesión (Modal)
  const [selectedSession, setSelectedSession] = useState<{
    eventName: string
    activityType: string
    date: string
    teamName: string
    teamCategory?: string
    players: AttendanceRecordDTO[]
  } | null>(null)

  // Filtros
  const [period, setPeriod] = useState<PeriodType>("temporada")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [selectedTeam, setSelectedTeam] = useState<string>("todos")
  const [activityType, setActivityType] = useState<string>("todos")
  const [selectedStatus, setSelectedStatus] = useState<string>("todos")
  const [searchTerm, setSearchTerm] = useState<string>("")

  // Cálculo de fechas según período rápido o modo de matriz mensual
  const getDateRangeForPeriod = useCallback((p: PeriodType, vMode: ViewMode, mMonth: Date): { start?: string; end?: string } => {
    const today = new Date()
    const formatDate = (d: Date) => d.toISOString().split("T")[0]

    // Si estamos en modo Matriz Mensual, el rango se acota al mes seleccionado para alto rendimiento
    if (vMode === "matrix") {
      const firstDay = new Date(mMonth.getFullYear(), mMonth.getMonth(), 1)
      const lastDay = new Date(mMonth.getFullYear(), mMonth.getMonth() + 1, 0)
      return { start: formatDate(firstDay), end: formatDate(lastDay) }
    }

    if (p === "hoy") {
      const t = formatDate(today)
      return { start: t, end: t }
    }
    if (p === "semana") {
      const current = new Date(today)
      const day = current.getDay()
      const diff = current.getDate() - day + (day === 0 ? -6 : 1) // Lunes
      const monday = new Date(current.setDate(diff))
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      return { start: formatDate(monday), end: formatDate(sunday) }
    }
    if (p === "mes") {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      return { start: formatDate(firstDay), end: formatDate(lastDay) }
    }
    if (p === "mes_anterior") {
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0)
      return { start: formatDate(firstDay), end: formatDate(lastDay) }
    }
    if (p === "personalizado") {
      return {
        start: startDate || undefined,
        end: endDate || undefined,
      }
    }
    // Temporada completa
    return {}
  }, [startDate, endDate])

  // Carga de datos mediante Server Action optimizada
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const dateRange = getDateRangeForPeriod(period, viewMode, matrixMonth)
      const res = await getGlobalAttendanceAction({
        teamId: selectedTeam !== "todos" ? selectedTeam : undefined,
        startDate: dateRange.start,
        endDate: dateRange.end,
        activityType: activityType !== "todos" ? activityType : undefined,
      })

      if (!res.success) {
        setError(res.error || "Error al cargar asistencia global")
      } else {
        setRecords(res.records || [])
        setTeams(res.teams || [])
      }
    } catch (err: any) {
      setError(err?.message || "Error de conexión con el servidor")
    } finally {
      setLoading(false)
    }
  }, [period, viewMode, matrixMonth, selectedTeam, activityType, getDateRangeForPeriod])

  // Cargar datos al montar y cuando cambien los filtros de servidor
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Filtros reactivos en memoria (estado de asistencia y búsqueda textual)
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Filtro por estado
      if (selectedStatus !== "todos" && r.status !== selectedStatus) {
        return false
      }

      // Filtro por texto de búsqueda
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase()
        const matchPlayer = r.playerName.toLowerCase().includes(term)
        const matchTeam = r.teamName.toLowerCase().includes(term)
        const matchEvent = r.eventName.toLowerCase().includes(term)
        if (!matchPlayer && !matchTeam && !matchEvent) {
          return false
        }
      }

      return true
    })
  }, [records, selectedStatus, searchTerm])

  // Recálculo dinámico de KPIs sobre el conjunto filtrado
  const dynamicKPIs: AttendanceKPIs = useMemo(() => {
    let presentes = 0
    let ausentes = 0
    let justificados = 0
    let lesionados = 0
    let retrasos = 0
    const uniquePlayers = new Set<string>()
    const activeTeams = new Set<string>()

    filteredRecords.forEach((r) => {
      if (r.status === "presente") presentes++
      else if (r.status === "ausente") ausentes++
      else if (r.status === "justificado") justificados++
      else if (r.status === "lesionado") lesionados++
      else if (r.status === "retraso") retrasos++

      uniquePlayers.add(r.playerId)
      if (r.teamId) activeTeams.add(r.teamId)
    })

    const totalRecords = filteredRecords.length
    const attendanceRate = totalRecords > 0 ? Math.round((presentes / totalRecords) * 100) : 0

    return {
      totalRecords,
      uniquePlayers: uniquePlayers.size,
      totalTeams: filteredRecords.length > 0 ? (activeTeams.size || teams.length) : 0,
      presentes,
      ausentes,
      justificados,
      lesionados,
      retrasos,
      attendanceRate,
    }
  }, [filteredRecords, teams])

  // Contador de filtros activos
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (period !== "temporada") count++
    if (selectedTeam !== "todos") count++
    if (activityType !== "todos") count++
    if (selectedStatus !== "todos") count++
    if (searchTerm.trim()) count++
    return count
  }, [period, selectedTeam, activityType, selectedStatus, searchTerm])

  const handleResetFilters = () => {
    setPeriod("temporada")
    setStartDate("")
    setEndDate("")
    setSelectedTeam("todos")
    setActivityType("todos")
    setSelectedStatus("todos")
    setSearchTerm("")
  }

  // Selección directa de equipo desde la vista de comparativa
  const handleSelectTeamFromComparison = (teamId: string) => {
    setSelectedTeam(teamId)
    setViewMode("days")
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-8 space-y-6 overflow-x-hidden">
      {/* 1. CABECERA EJECUTIVA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/inicio"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold shadow-2xs transition"
              title="Volver al Centro de Control"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Centro de Control</span>
            </Link>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
              Supervisión 360°
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 mt-2">
            Control Global de Asistencia
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Supervisión consolidada y seguimiento de asistencia de todos los equipos del club.
          </p>
        </div>

        {/* Acciones de cabecera */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => fetchData()}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold shadow-2xs hover:bg-slate-50 flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
            title="Actualizar datos"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Error de conexión si lo hubiera */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 2. KPIS GLOBALES */}
      <AttendanceKPIsHeader kpis={dynamicKPIs} />

      {/* 3. FILTROS UNIFICADOS */}
      <AttendanceFilters
        teams={teams}
        period={period}
        setPeriod={setPeriod}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        selectedTeam={selectedTeam}
        setSelectedTeam={setSelectedTeam}
        activityType={activityType}
        setActivityType={setActivityType}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onReset={handleResetFilters}
        activeFiltersCount={activeFiltersCount}
      />

      {/* 4. SELECTOR DE VISTAS */}
      <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
        <div className="flex items-center gap-1 p-1 bg-slate-100/90 rounded-xl border border-slate-200/60 max-w-full overflow-x-auto scrollbar-none">
          <button
            onClick={() => setViewMode("days")}
            className={`px-3.5 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              viewMode === "days"
                ? "bg-white text-blue-700 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Resumen por días</span>
          </button>

          <button
            onClick={() => setViewMode("matrix")}
            className={`px-3.5 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              viewMode === "matrix"
                ? "bg-white text-blue-700 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Matriz mensual</span>
          </button>

          <button
            onClick={() => setViewMode("teams")}
            className={`px-3.5 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              viewMode === "teams"
                ? "bg-white text-blue-700 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Por equipos</span>
          </button>

          <button
            onClick={() => setViewMode("records")}
            className={`px-3.5 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              viewMode === "records"
                ? "bg-white text-blue-700 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Registros</span>
          </button>
        </div>

        <div className="text-xs font-semibold text-slate-400">
          Mostrando <b>{filteredRecords.length}</b> registros
        </div>
      </div>

      {/* 5. CONTENIDO SEGÚN MODO DE VISUALIZACIÓN */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-3">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-blue-600" />
          <p className="text-sm font-medium">Cargando control de asistencia...</p>
        </div>
      ) : (
        <div>
          {viewMode === "days" && (
            <AttendanceDaysView
              records={filteredRecords}
              onSelectPlayer={(id) => setSelectedPlayerId(id)}
              onSelectSession={(sess) => setSelectedSession(sess)}
            />
          )}

          {viewMode === "matrix" && (
            <AttendanceMatrixView
              records={filteredRecords}
              teams={teams}
              onSelectPlayer={(id) => setSelectedPlayerId(id)}
              currentMonth={matrixMonth}
              onMonthChange={(newMonth) => setMatrixMonth(newMonth)}
            />
          )}

          {viewMode === "teams" && (
            <AttendanceTeamsView
              records={filteredRecords}
              teams={teams}
              onSelectTeam={handleSelectTeamFromComparison}
            />
          )}

          {viewMode === "records" && (
            <AttendanceRecordsView
              records={filteredRecords}
              onSelectPlayer={(id) => setSelectedPlayerId(id)}
            />
          )}
        </div>
      )}

      {/* 6. FICHA INDIVIDUAL DEL JUGADOR (DRAWER / SHEET RESPONSIVE) */}
      <AttendancePlayerDrawer
        playerId={selectedPlayerId}
        onClose={() => setSelectedPlayerId(null)}
        records={records}
      />

      {/* 7. DETALLE DE SESIÓN (MODAL SOLO LECTURA) */}
      <AttendanceSessionModal
        session={selectedSession}
        onClose={() => setSelectedSession(null)}
        onSelectPlayer={(id) => {
          setSelectedSession(null)
          setSelectedPlayerId(id)
        }}
      />
    </div>
  )
}