"use client"

import React, { useState, useEffect, useMemo } from 'react'
import {
  BarChart3,
  Trophy,
  Users,
  Goal,
  Shield,
  Clock,
  AlertTriangle,
  Filter,
  Search,
  RefreshCw,
  TrendingUp,
  Award,
  Layers,
  ChevronDown,
  Loader2
} from 'lucide-react'
import {
  getGlobalStatsAction,
  GlobalStatsKPIs,
  TeamStatDTO,
  PlayerStatDTO
} from '@/app/actions/stats-actions'

export default function AdminEstadisticasPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [kpis, setKpis] = useState<GlobalStatsKPIs | null>(null)
  const [teamStats, setTeamStats] = useState<TeamStatDTO[]>([])
  const [playerStats, setPlayerStats] = useState<PlayerStatDTO[]>([])
  const [teams, setTeams] = useState<Array<{ id: string; name: string; category: string }>>([])
  const [seasons, setSeasons] = useState<Array<{ id: string; name: string; isActive: boolean }>>([])

  // Filtros
  const [selectedSeason, setSelectedSeason] = useState<string>('todas')
  const [selectedTeam, setSelectedTeam] = useState<string>('todos')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'equipos' | 'jugadores'>('equipos')

  const fetchData = async (seasonId?: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await getGlobalStatsAction(seasonId)
      if (!res.success) {
        setError(res.error || 'Error al cargar estadísticas globales')
      } else {
        setKpis(res.kpis || null)
        setTeamStats(res.teamStats || [])
        setPlayerStats(res.playerStats || [])
        setTeams(res.teams || [])
        setSeasons(res.seasons || [])
      }
    } catch (err: any) {
      setError(err?.message || 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(selectedSeason)
  }, [selectedSeason])

  // Filtrado de equipos
  const filteredTeams = useMemo(() => {
    if (selectedTeam === 'todos') return teamStats
    return teamStats.filter(t => t.teamId === selectedTeam)
  }, [teamStats, selectedTeam])

  // Filtrado de jugadores
  const filteredPlayers = useMemo(() => {
    return playerStats.filter(p => {
      if (selectedTeam !== 'todos' && p.teamId !== selectedTeam) {
        return false
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase()
        const matchName = p.playerName.toLowerCase().includes(term)
        const matchTeam = p.teamName.toLowerCase().includes(term)
        if (!matchName && !matchTeam) return false
      }
      return true
    })
  }, [playerStats, selectedTeam, searchTerm])

  // Top rankings
  const topScorers = useMemo(() => {
    return [...filteredPlayers].sort((a, b) => b.goals - a.goals).slice(0, 3)
  }, [filteredPlayers])

  const topMinutes = useMemo(() => {
    return [...filteredPlayers].sort((a, b) => b.minutesPlayed - a.minutesPlayed).slice(0, 3)
  }, [filteredPlayers])

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-200">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              Estadísticas Globales del Club
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Rendimiento deportivo consolidado de equipos, jugadores y competiciones
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Selector de Temporada */}
          <select
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(e.target.value)}
            className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="todas">Todas las temporadas</option>
            {seasons.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} {s.isActive ? '(Actual)' : ''}
              </option>
            ))}
          </select>

          <button
            onClick={() => fetchData(selectedSeason)}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl shadow-sm transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Ratio Victorias */}
        <div className="col-span-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-100">
              Efectividad Global
            </span>
            <Trophy className="w-5 h-5 text-blue-200" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-4xl font-black tracking-tight">{kpis?.winRate || 0}%</span>
            <span className="text-xs text-blue-100">victorias sobre partidos jugados</span>
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs font-medium text-blue-100 pt-2 border-t border-blue-500/40">
            <span><b>{kpis?.wins || 0}</b> Victorias</span>
            <span><b>{kpis?.draws || 0}</b> Empates</span>
            <span><b>{kpis?.losses || 0}</b> Derrotas</span>
          </div>
        </div>

        {/* Partidos */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-indigo-600 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Partidos</span>
            <Layers className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900">{kpis?.totalMatches || 0}</div>
          <div className="text-xs text-slate-400 mt-1">{kpis?.totalTeams || 0} equipos activos</div>
        </div>

        {/* Goles a Favor */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Goles Club</span>
            <Goal className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{kpis?.goalsFor || 0}</div>
          <div className="text-xs text-slate-400 mt-1">{kpis?.goalsAgainst || 0} en contra</div>
        </div>

        {/* Minutos Jugados */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-purple-600 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Minutos</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900">{kpis?.totalMinutes || 0}'</div>
          <div className="text-xs text-slate-400 mt-1">{kpis?.totalPlayers || 0} jugadores</div>
        </div>

        {/* Tarjetas / Disciplina */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-amber-600 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Tarjetas</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-yellow-600">{kpis?.yellowCards || 0} 🟨</span>
            <span className="text-xl font-bold text-red-600">{kpis?.redCards || 0} 🟥</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">amonestaciones</div>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Toggle Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
          <button
            onClick={() => setActiveTab('equipos')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'equipos' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Shield className="w-4 h-4" />
            Rendimiento por Equipos
          </button>
          <button
            onClick={() => setActiveTab('jugadores')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'jugadores' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            Estadísticas de Jugadores
          </button>
        </div>

        {/* Filtros secundarios */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {/* Selector de Equipo */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 border border-slate-200 rounded-xl w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-700 focus:outline-none cursor-pointer w-full"
            >
              <option value="todos">Todos los equipos ({teams.length})</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
              ))}
            </select>
          </div>

          {activeTab === 'jugadores' && (
            <div className="relative w-full sm:w-60">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar jugador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
              />
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-sm">Calculando indicadores deportivos consolidados...</p>
        </div>
      ) : activeTab === 'equipos' ? (
        /* TABLA POR EQUIPOS */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              Balance de Competición por Equipo
            </h2>
            <span className="text-xs text-slate-400 font-medium">
              {filteredTeams.length} equipos listados
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Equipo</th>
                  <th className="py-3 px-4 text-center">Partidos</th>
                  <th className="py-3 px-4 text-center text-emerald-700">V</th>
                  <th className="py-3 px-4 text-center text-slate-600">E</th>
                  <th className="py-3 px-4 text-center text-rose-700">D</th>
                  <th className="py-3 px-4 text-center">GF</th>
                  <th className="py-3 px-4 text-center">GC</th>
                  <th className="py-3 px-4 text-center">DG</th>
                  <th className="py-3 px-4 text-center">Efectividad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredTeams.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      No hay datos de partidos registrados para los filtros seleccionados
                    </td>
                  </tr>
                ) : (
                  filteredTeams.map((t) => (
                    <tr key={t.teamId} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{t.teamName}</div>
                        <div className="text-xs text-slate-400 font-medium uppercase">{t.teamCategory}</div>
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-800">
                        {t.matchesPlayed}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-600">
                        {t.wins}
                      </td>
                      <td className="py-3 px-4 text-center font-medium text-slate-600">
                        {t.draws}
                      </td>
                      <td className="py-3 px-4 text-center font-medium text-rose-600">
                        {t.losses}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-800">
                        {t.goalsFor}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-600">
                        {t.goalsAgainst}
                      </td>
                      <td className="py-3 px-4 text-center font-black">
                        <span className={t.goalDiff > 0 ? 'text-emerald-600' : t.goalDiff < 0 ? 'text-rose-600' : 'text-slate-600'}>
                          {t.goalDiff > 0 ? `+${t.goalDiff}` : t.goalDiff}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700">
                          {t.winRate}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* SECCIÓN DE JUGADORES */
        <div className="space-y-6">
          {/* Top Rankings Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top Goleadores */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3 text-emerald-700 font-bold text-sm">
                <Goal className="w-4 h-4" />
                Máximos Goleadores
              </div>
              <div className="space-y-2">
                {topScorers.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">Sin goles registrados</p>
                ) : (
                  topScorers.map((p, idx) => (
                    <div key={p.playerId} className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
                      <div className="flex items-center gap-3">
                        <span className={`w-5 text-center font-black text-sm ${idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-slate-400' : 'text-amber-700'}`}>
                          #{idx + 1}
                        </span>
                        <div>
                          <div className="font-semibold text-slate-900 text-sm">{p.playerName}</div>
                          <div className="text-xs text-slate-400">{p.teamName}</div>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-black text-sm rounded-lg">
                        {p.goals} goles
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Más Minutos */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3 text-indigo-700 font-bold text-sm">
                <Clock className="w-4 h-4" />
                Mayor Participación en Minutos
              </div>
              <div className="space-y-2">
                {topMinutes.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">Sin minutos registrados</p>
                ) : (
                  topMinutes.map((p, idx) => (
                    <div key={p.playerId} className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
                      <div className="flex items-center gap-3">
                        <span className={`w-5 text-center font-black text-sm ${idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-slate-400' : 'text-amber-700'}`}>
                          #{idx + 1}
                        </span>
                        <div>
                          <div className="font-semibold text-slate-900 text-sm">{p.playerName}</div>
                          <div className="text-xs text-slate-400">{p.teamName}</div>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-indigo-100 text-indigo-800 font-black text-sm rounded-lg">
                        {p.minutesPlayed}'
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Tabla de Jugadores */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Estadísticas Individuales de Jugadores
              </h2>
              <span className="text-xs text-slate-400 font-medium">
                {filteredPlayers.length} jugadores con actividad
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Jugador</th>
                    <th className="py-3 px-4">Equipo</th>
                    <th className="py-3 px-4 text-center">Partidos</th>
                    <th className="py-3 px-4 text-center">Minutos</th>
                    <th className="py-3 px-4 text-center text-emerald-700">Goles</th>
                    <th className="py-3 px-4 text-center text-yellow-700">Amarillas</th>
                    <th className="py-3 px-4 text-center text-rose-700">Rojas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredPlayers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No hay registros de jugadores para los filtros seleccionados
                      </td>
                    </tr>
                  ) : (
                    filteredPlayers.map((p) => (
                      <tr key={p.playerId} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{p.playerName}</div>
                          {p.playerDorsal !== null && (
                            <div className="text-xs text-slate-400 font-medium">Dorsal #{p.playerDorsal}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-medium">
                          {p.teamName}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-slate-800">
                          {p.matchesPlayed}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-slate-700">
                          {p.minutesPlayed}'
                        </td>
                        <td className="py-3 px-4 text-center font-black text-emerald-600">
                          {p.goals}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-yellow-600">
                          {p.yellowCards}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-rose-600">
                          {p.redCards}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
