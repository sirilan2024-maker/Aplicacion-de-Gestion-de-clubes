"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { BarChart3, Users, Activity, TrendingUp, Goal, AlertTriangle, Clock, Ruler, Scale, Filter } from "lucide-react"
import Link from "next/link"

interface RawData {
  players: any[];
  staff: any[];
  teams: any[];
  attendance: any[];
  events: any[];
  perf: any[];
  metricMap: Map<string, string>;
}

export default function EstadisticasClubPage() {
  const [rawData, setRawData] = useState<RawData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTeamId, setSelectedTeamId] = useState<string>("todos")
  const supabase = createClient()

  useEffect(() => {
    const fetchAllData = async () => {
      // Fetch teams
      const { data: teams } = await supabase.from('equipos').select('id, name')
      
      // 1. Fetch Players data (remove hardcoded statuses that cause 0 count)
      const { data: players } = await supabase
        .from('players')
        .select('id, first_name, last_name, height, weight, team_id')
        .neq('status', 'inactive')

      // 2. Fetch Staff
      const { data: staff } = await supabase.from('team_coaches').select('id, team_id')

      // 3. Fetch Events & Attendance
      const { data: events } = await supabase.from('team_events').select('id, team_id')
      const { data: attendance } = await supabase.from('attendance').select('status, event_id')

      // 4. Fetch Metrics Definitions
      const { data: clubMetrics } = await supabase.from('club_metrics').select('id, name')
      const metricMap = new Map();
      clubMetrics?.forEach(m => metricMap.set(m.id, m.name.toLowerCase()));

      // 5. Fetch Performance Data
      const { data: perf } = await supabase.from('player_training_metrics').select('metric_id, value_number, player_id')

      setRawData({
        players: players || [],
        staff: staff || [],
        teams: teams || [],
        events: events || [],
        attendance: attendance || [],
        perf: perf || [],
        metricMap
      })
      
      setLoading(false)
    }
    fetchAllData()
  }, [])

  // Calculate stats based on selected team
  const stats = useMemo(() => {
    if (!rawData) return null;

    const { players, staff, teams, events, attendance, perf, metricMap } = rawData;

    // Helper to filter by team
    const filterByTeam = (teamId: string | null) => {
      if (selectedTeamId === "todos") return true;
      return teamId === selectedTeamId;
    }

    // Filter players & staff
    const filteredPlayers = players.filter(p => filterByTeam(p.team_id));
    const filteredStaff = staff.filter(s => filterByTeam(s.team_id));
    
    // Map events for attendance filtering
    const eventTeamMap = new Map();
    events.forEach(e => eventTeamMap.set(e.id, e.team_id));

    // Filter attendance
    const filteredAttendance = attendance.filter(a => filterByTeam(eventTeamMap.get(a.event_id)));
    
    // Map players for performance filtering
    const playerTeamMap = new Map();
    players.forEach(p => playerTeamMap.set(p.id, p.team_id));

    // Filter performance
    const filteredPerf = perf.filter(p => filterByTeam(playerTeamMap.get(p.player_id)));

    // CALCULATIONS
    const countJugadores = filteredPlayers.length;
    let sumH = 0, sumW = 0, validH = 0, validW = 0;
    
    // player stats map for rankings
    const playerStatsMap = new Map();
    filteredPlayers.forEach(p => {
      if (p.height) { sumH += p.height; validH++; }
      if (p.weight) { sumW += p.weight; validW++; }
      
      playerStatsMap.set(p.id, {
        id: p.id,
        name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Jugador',
        teamName: teams.find((t: any) => t.id === p.team_id)?.name || 'Sin Equipo',
        teamId: p.team_id,
        goles: 0,
        amarillas: 0,
        rojas: 0,
        minutos: 0,
        sumRen: 0,
        countRen: 0,
        avgRendimiento: 0,
        disciplinaPuntos: 0
      });
    });
    
    const avgHeight = validH > 0 ? (sumH / validH).toFixed(2) : 0;
    const avgWeight = validW > 0 ? (sumW / validW).toFixed(1) : 0;

    const countStaff = filteredStaff.length;
    const countEquipos = selectedTeamId === "todos" ? teams.length : 1;

    let asisMedia = 0;
    if (filteredAttendance.length > 0) {
      const presentes = filteredAttendance.filter(a => a.status?.toLowerCase() === 'presente' || a.status?.toLowerCase() === 'present').length;
      asisMedia = Math.round((presentes / filteredAttendance.length) * 100);
    }

    let totalGoles = 0, totalAma = 0, totalRoj = 0, totalMin = 0;
    let sumRPE = 0, countRPE = 0;
    let sumRen = 0, countRen = 0;

    filteredPerf.forEach(row => {
      const name = metricMap.get(row.metric_id) || '';
      const val = row.value_number || 0;

      // Global totals
      if (name === 'goles') totalGoles += val;
      else if (name === 'tarjetas amarillas') totalAma += val;
      else if (name === 'tarjetas rojas') totalRoj += val;
      else if (name.includes('minutos')) totalMin += val;
      else if (name.includes('rpe')) { sumRPE += val; countRPE++; }
      else if (name === 'rendimiento') { sumRen += val; countRen++; }
      
      // Player totals
      const pStats = playerStatsMap.get(row.player_id);
      if (pStats) {
        if (name === 'goles') pStats.goles += val;
        else if (name === 'tarjetas amarillas') pStats.amarillas += val;
        else if (name === 'tarjetas rojas') pStats.rojas += val;
        else if (name.includes('minutos')) pStats.minutos += val;
        else if (name === 'rendimiento') { pStats.sumRen += val; pStats.countRen++; }
      }
    });

    const avgRPE = countRPE > 0 ? (sumRPE / countRPE).toFixed(1) : 0;
    const avgRendimiento = countRen > 0 ? (sumRen / countRen).toFixed(1) : 0;
    
    const playersStatsArray = Array.from(playerStatsMap.values()).map(p => {
      p.avgRendimiento = p.countRen > 0 ? Number((p.sumRen / p.countRen).toFixed(1)) : 0;
      p.disciplinaPuntos = p.amarillas + (p.rojas * 3);
      return p;
    });

    const topGoles = [...playersStatsArray].sort((a, b) => b.goles - a.goles).slice(0, 3);
    const topRendimiento = [...playersStatsArray].sort((a, b) => b.avgRendimiento - a.avgRendimiento).slice(0, 3);
    const topMinutos = [...playersStatsArray].sort((a, b) => b.minutos - a.minutos).slice(0, 3);
    const topDisciplina = [...playersStatsArray].sort((a, b) => b.disciplinaPuntos - a.disciplinaPuntos).slice(0, 3);

    return {
      totalJugadores: countJugadores,
      totalStaff: countStaff,
      asistenciaMedia: asisMedia,
      equiposActivos: countEquipos,
      avgHeight: Number(avgHeight),
      avgWeight: Number(avgWeight),
      totalGoles,
      totalAmarillas: totalAma,
      totalRojas: totalRoj,
      avgRPE: Number(avgRPE),
      avgRendimiento: Number(avgRendimiento),
      totalMinutos: totalMin,
      topGoles,
      topRendimiento,
      topMinutos,
      topDisciplina
    }
  }, [rawData, selectedTeamId]);

  if (loading || !stats || !rawData) {
    return <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center gap-2 h-64">
      <Activity className="animate-spin text-blue-500" size={32} />
      Cargando Analítica Avanzada del Club...
    </div>
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="text-indigo-600" size={32} />
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Estadísticas y Analítica</h1>
            <p className="text-slate-500">Panel global de dirección deportiva con todos los indicadores.</p>
          </div>
        </div>
        
        {/* Selector de Equipo */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-xl shadow-sm">
          <Filter size={18} className="text-gray-400" />
          <select 
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            className="bg-transparent border-none outline-none font-bold text-slate-700 cursor-pointer"
          >
            <option value="todos">Todos los Equipos</option>
            {rawData.teams.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* SECCIÓN 1: GENERAL */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Users size={20} className="text-blue-500"/> Visión General
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
              <Users size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Jugadores</p>
              <p className="text-2xl font-black text-slate-900">{stats.totalJugadores}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center shrink-0">
              <BarChart3 size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Equipos</p>
              <p className="text-2xl font-black text-slate-900">{stats.equiposActivos}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Asistencia Media</p>
              <p className="text-2xl font-black text-slate-900">{stats.asistenciaMedia}%</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center shrink-0">
              <Activity size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Staff Técnico</p>
              <p className="text-2xl font-black text-slate-900">{stats.totalStaff}</p>
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: RENDIMIENTO Y JUEGO */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Goal size={20} className="text-emerald-500"/> Rendimiento y Partidos
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-5 rounded-2xl text-white shadow-md relative overflow-hidden">
            <Goal size={100} className="absolute -bottom-4 -right-4 text-emerald-400 opacity-20" />
            <p className="text-xs font-bold text-emerald-100 uppercase tracking-wide relative z-10">Goles Totales</p>
            <p className="text-4xl font-black mt-1 relative z-10">{stats.totalGoles}</p>
            <p className="text-xs text-emerald-200 mt-1 relative z-10">En esta temporada</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden flex flex-col justify-center">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Nota Media (Rendimiento)</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-4xl font-black text-slate-900">{stats.avgRendimiento}</span>
              <span className="text-sm font-bold text-gray-400">/10</span>
            </div>
          </div>

          <Link href="/dashboard/club/estadisticas/minutos" className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-sm flex flex-col justify-center hover:border-indigo-300 hover:shadow-md transition-all group cursor-pointer relative">
            <div className="absolute top-4 right-4 bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
              Ver detalle
            </div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide group-hover:text-slate-800 transition-colors">Minutos Jugados</p>
            <div className="flex items-baseline gap-2 mt-1 group-hover:scale-105 transition-transform origin-left">
              <span className="text-4xl font-black text-indigo-600">{stats.totalMinutos}</span>
              <span className="text-sm font-bold text-indigo-400">min</span>
            </div>
          </Link>

          {/* TARJETA DISCIPLINA CLICKABLE */}
          <Link href="/dashboard/club/estadisticas/disciplina" className="bg-white p-5 rounded-2xl border border-red-100 shadow-sm flex flex-col justify-center hover:border-red-300 hover:shadow-md transition-all group cursor-pointer relative">
            <div className="absolute top-4 right-4 bg-red-50 text-red-600 px-2 py-1 rounded-full text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
              Ver detalle
            </div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1 group-hover:text-slate-800 transition-colors">
              <AlertTriangle size={14} className="text-amber-500"/> Disciplina
            </p>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex flex-col items-center">
                <div className="w-8 h-10 bg-yellow-400 rounded-sm shadow-sm border border-yellow-500 flex items-center justify-center font-bold text-yellow-900 group-hover:scale-110 transition-transform">{stats.totalAmarillas}</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-8 h-10 bg-red-500 rounded-sm shadow-sm border border-red-600 flex items-center justify-center font-bold text-white group-hover:scale-110 transition-transform">{stats.totalRojas}</div>
              </div>
            </div>
          </Link>
        </div>

        {/* RANKINGS TOP 3 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mt-6">
          {/* Top Goleadores */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            <div className="bg-emerald-50 py-3 px-4 border-b border-emerald-100 flex items-center gap-2">
              <Goal size={16} className="text-emerald-600" />
              <h3 className="font-bold text-emerald-800 text-sm">Top Goleadores</h3>
            </div>
            <div className="p-4 flex-1 flex flex-col gap-3">
              {stats.topGoles.length > 0 ? stats.topGoles.map((p: any, i: number) => (
                <div key={p.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className={`font-black text-sm w-4 text-center ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-400' : 'text-amber-700'}`}>{i + 1}</span>
                    <div className="overflow-hidden">
                      <p className="text-sm font-bold text-slate-800 truncate">{p.name}</p>
                      <p className="text-[10px] text-slate-500 font-medium uppercase truncate">{p.teamName}</p>
                    </div>
                  </div>
                  <span className="font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg text-sm">{p.goles}</span>
                </div>
              )) : <p className="text-xs text-slate-400 text-center py-4">Sin datos suficientes</p>}
            </div>
          </div>

          {/* Top Rendimiento */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            <div className="bg-slate-50 py-3 px-4 border-b border-slate-200 flex items-center gap-2">
              <Activity size={16} className="text-slate-600" />
              <h3 className="font-bold text-slate-800 text-sm">Top Rendimiento</h3>
            </div>
            <div className="p-4 flex-1 flex flex-col gap-3">
              {stats.topRendimiento.length > 0 ? stats.topRendimiento.map((p: any, i: number) => (
                <div key={p.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className={`font-black text-sm w-4 text-center ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-400' : 'text-amber-700'}`}>{i + 1}</span>
                    <div className="overflow-hidden">
                      <p className="text-sm font-bold text-slate-800 truncate">{p.name}</p>
                      <p className="text-[10px] text-slate-500 font-medium uppercase truncate">{p.teamName}</p>
                    </div>
                  </div>
                  <span className="font-black text-slate-700 bg-slate-100 px-2 py-1 rounded-lg text-sm">{p.avgRendimiento}</span>
                </div>
              )) : <p className="text-xs text-slate-400 text-center py-4">Sin datos suficientes</p>}
            </div>
          </div>

          {/* Top Minutos */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            <div className="bg-indigo-50 py-3 px-4 border-b border-indigo-100 flex items-center gap-2">
              <Clock size={16} className="text-indigo-600" />
              <h3 className="font-bold text-indigo-800 text-sm">Más Minutos</h3>
            </div>
            <div className="p-4 flex-1 flex flex-col gap-3">
              {stats.topMinutos.length > 0 ? stats.topMinutos.map((p: any, i: number) => (
                <div key={p.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className={`font-black text-sm w-4 text-center ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-400' : 'text-amber-700'}`}>{i + 1}</span>
                    <div className="overflow-hidden">
                      <p className="text-sm font-bold text-slate-800 truncate">{p.name}</p>
                      <p className="text-[10px] text-slate-500 font-medium uppercase truncate">{p.teamName}</p>
                    </div>
                  </div>
                  <span className="font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg text-sm">{p.minutos}'</span>
                </div>
              )) : <p className="text-xs text-slate-400 text-center py-4">Sin datos suficientes</p>}
            </div>
          </div>

          {/* Top Disciplina */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            <div className="bg-red-50 py-3 px-4 border-b border-red-100 flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-600" />
              <h3 className="font-bold text-red-800 text-sm">Más Tarjetas</h3>
            </div>
            <div className="p-4 flex-1 flex flex-col gap-3">
              {stats.topDisciplina.length > 0 ? stats.topDisciplina.map((p: any, i: number) => (
                <div key={p.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className={`font-black text-sm w-4 text-center ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-400' : 'text-amber-700'}`}>{i + 1}</span>
                    <div className="overflow-hidden">
                      <p className="text-sm font-bold text-slate-800 truncate">{p.name}</p>
                      <p className="text-[10px] text-slate-500 font-medium uppercase truncate">{p.teamName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {p.amarillas > 0 && <span className="font-bold text-yellow-700 bg-yellow-100 px-1.5 py-0.5 rounded text-xs">{p.amarillas}</span>}
                    {p.rojas > 0 && <span className="font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded text-xs">{p.rojas}</span>}
                  </div>
                </div>
              )) : <p className="text-xs text-slate-400 text-center py-4">Sin amonestaciones</p>}
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN 3: FÍSICO Y CARGAS */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Activity size={20} className="text-purple-500"/> Perfil Físico y Cargas de Trabajo
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center shrink-0">
              <Activity size={28} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">RPE Medio General</p>
              <div className="flex items-baseline gap-1 mt-1">
                <p className="text-3xl font-black text-slate-900">{stats.avgRPE}</p>
                <p className="text-sm font-bold text-gray-400">/10</p>
              </div>
              <p className="text-xs text-purple-600 font-medium mt-1">Nivel de esfuerzo percibido</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
              <Ruler size={28} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Altura Media</p>
              <div className="flex items-baseline gap-1 mt-1">
                <p className="text-3xl font-black text-slate-900">{stats.avgHeight}</p>
                <p className="text-sm font-bold text-gray-400">m</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
              <Scale size={28} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Peso Medio</p>
              <div className="flex items-baseline gap-1 mt-1">
                <p className="text-3xl font-black text-slate-900">{stats.avgWeight}</p>
                <p className="text-sm font-bold text-gray-400">kg</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
