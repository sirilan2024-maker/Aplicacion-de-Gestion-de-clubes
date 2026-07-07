import React, { useMemo, useState } from 'react';
import { User, Activity, Clock, Shield, Goal, AlertTriangle, CalendarDays, ChevronRight, X, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { useExport } from "@/components/providers/ExportContext";

interface RawData {
  players: any[];
  staff: any[];
  teams: any[];
  attendance: any[];
  events: any[];
  perf: any[];
  matchStats: any[];
  metricMap: Map<string, string>;
}

export function PlayerStatsGrid({ rawData, teamId }: { rawData: RawData; teamId: string }) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  // Calculate aggregated stats per player
  const playerStats = useMemo(() => {
    if (!rawData) return [];

    const playersInTeam = rawData.players.filter(p => p.team_id === teamId || teamId === 'todos');
    const teamEventIds = rawData.events.filter(e => e.team_id === teamId || teamId === 'todos').map(e => e.id);
    const totalTeamEvents = teamEventIds.length;

    return playersInTeam.map(player => {
      // Attendance
      const playerAttendance = rawData.attendance.filter(a => a.player_id === player.id && teamEventIds.includes(a.event_id));
      const attendedCount = playerAttendance.filter(a => a.status === 'presente' || a.status === 'retraso').length;
      const attendance_percentage = totalTeamEvents > 0 ? Math.round((attendedCount / totalTeamEvents) * 100) : 0;

      // Match Stats
      const playerMatches = rawData.matchStats.filter(m => m.player_id === player.id && (m.team_id === teamId || teamId === 'todos'));
      const matches_called = playerMatches.length;
      const minutes_played = playerMatches.reduce((sum, m) => sum + (m.minutes_played || 0), 0);
      const goals = playerMatches.reduce((sum, m) => sum + (m.goals || 0), 0);
      const yellow_cards = playerMatches.reduce((sum, m) => sum + (m.yellow_cards || 0), 0);
      const red_cards = playerMatches.reduce((sum, m) => sum + (m.red_cards || 0), 0);

      // Performance
      const playerPerf = rawData.perf.filter(p => p.player_id === player.id && teamEventIds.includes(p.event_id));
      const average_performance = playerPerf.length > 0 
        ? Math.round((playerPerf.reduce((sum, p) => sum + (p.value_number || 0), 0) / playerPerf.length) * 10) / 10 
        : null;

      // Group perf by date (simulated based on event_id for now, ideally we need event date)
      const perf_trends = playerPerf.map((p, index) => ({
        name: `S${index + 1}`, // Session 1, 2...
        value: p.value_number
      }));

      return {
        ...player,
        attendance_percentage,
        matches_called,
        minutes_played,
        goals,
        yellow_cards,
        red_cards,
        average_performance,
        perf_trends
      };
    }).sort((a, b) => (b.minutes_played - a.minutes_played) || (b.attendance_percentage - a.attendance_percentage));
  }, [rawData, teamId]);

  const { setExportData } = useExport();

  React.useEffect(() => {
    const exportFormatted = playerStats.map(p => ({
      Nombre: p.first_name,
      Apellidos: p.last_name,
      Posicion: p.posicion_principal || p.posicion || 'Jugador',
      Dorsal: p.dorsal || '-',
      Minutos_Jugados: p.minutes_played,
      Asistencia_Porc: p.attendance_percentage,
      Goles: p.goals,
      Amarillas: p.yellow_cards,
      Rojas: p.red_cards,
      Rendimiento_Medio: p.average_performance || '-'
    }));
    setExportData(exportFormatted, `Estadisticas_Jugadores_${teamId}`);
  }, [playerStats, setExportData, teamId]);

  const selectedPlayer = playerStats.find(p => p.id === selectedPlayerId);

  return (
    <div className="w-full">
      {/* Grid View */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {playerStats.map((player) => (
          <div 
            key={player.id} 
            onClick={() => setSelectedPlayerId(player.id)}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-blue-300"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-lg border border-slate-200 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-200 transition-colors">
                {player.first_name?.charAt(0) || ''}{player.last_name?.charAt(0) || ''}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-900 truncate" title={`${player.first_name} ${player.last_name}`}>
                  {player.first_name} {player.last_name}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    {player.posicion_principal || player.posicion || 'Jugador'}
                  </span>
                  {player.dorsal && (
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      #{player.dorsal}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                  <Clock size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Minutos</span>
                </div>
                <p className="text-lg font-black text-slate-800">{player.minutes_played}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                  <Activity size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Asistencia</span>
                </div>
                <p className="text-lg font-black text-slate-800">{player.attendance_percentage}%</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                  <Goal size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Goles</span>
                </div>
                <p className="text-lg font-black text-slate-800">{player.goals}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 flex flex-col justify-center">
                <div className="flex gap-2">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-4 bg-yellow-400 rounded-sm shadow-sm" />
                    <span className="font-bold text-slate-700 text-sm">{player.yellow_cards}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-4 bg-red-500 rounded-sm shadow-sm" />
                    <span className="font-bold text-slate-700 text-sm">{player.red_cards}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-4 flex items-center justify-end text-blue-600 text-xs font-bold gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              Ver detalle <ChevronRight size={14} />
            </div>
          </div>
        ))}
        {playerStats.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 border-dashed">
            No hay datos de jugadores para mostrar.
          </div>
        )}
      </div>

      {/* Expanded Modal */}
      {selectedPlayer && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg shadow-sm border border-blue-200">
                  {selectedPlayer.first_name?.charAt(0) || ''}{selectedPlayer.last_name?.charAt(0) || ''}
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 leading-tight">
                    {selectedPlayer.first_name} {selectedPlayer.last_name}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                      {selectedPlayer.posicion_principal || selectedPlayer.posicion || 'Jugador'}
                    </span>
                    {selectedPlayer.dorsal && (
                      <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-sm">
                        Dorsal: {selectedPlayer.dorsal}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedPlayerId(null)}
                className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-8">
              
              {/* Highlight Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Minutos Jugados</span>
                    <Clock size={16} className="text-blue-500" />
                  </div>
                  <div className="text-3xl font-black text-slate-900">{selectedPlayer.minutes_played}</div>
                  <div className="text-xs font-medium text-slate-500 mt-1">En {selectedPlayer.matches_called} convocatorias</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Asistencia Entr.</span>
                    <CalendarDays size={16} className="text-emerald-500" />
                  </div>
                  <div className="text-3xl font-black text-slate-900">{selectedPlayer.attendance_percentage}%</div>
                  <div className="text-xs font-medium text-slate-500 mt-1">De todas las sesiones</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Goles Oficiales</span>
                    <Goal size={16} className="text-amber-500" />
                  </div>
                  <div className="text-3xl font-black text-slate-900">{selectedPlayer.goals}</div>
                  <div className="text-xs font-medium text-slate-500 mt-1">Goles anotados</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Rendimiento Medio</span>
                    <TrendingUp size={16} className="text-purple-500" />
                  </div>
                  <div className="text-3xl font-black text-slate-900">{selectedPlayer.average_performance ?? '-'}</div>
                  <div className="text-xs font-medium text-slate-500 mt-1">Puntuación 1-10</div>
                </div>
              </div>

              {/* Charts & Discipline */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Discipline Card */}
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 col-span-1">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                    <Shield size={18} className="text-slate-500" />
                    Disciplina
                  </h3>
                  <div className="space-y-4">
                    <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-6 bg-yellow-400 rounded-sm shadow-sm" />
                        <span className="font-semibold text-slate-700">Tarjetas Amarillas</span>
                      </div>
                      <span className="text-xl font-black text-slate-900">{selectedPlayer.yellow_cards}</span>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-6 bg-red-500 rounded-sm shadow-sm" />
                        <span className="font-semibold text-slate-700">Tarjetas Rojas</span>
                      </div>
                      <span className="text-xl font-black text-slate-900">{selectedPlayer.red_cards}</span>
                    </div>
                  </div>
                </div>

                {/* Performance Chart */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 col-span-1 lg:col-span-2 shadow-sm">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6">
                    <Activity size={18} className="text-slate-500" />
                    Evolución del Rendimiento
                  </h3>
                  {selectedPlayer.perf_trends.length > 0 ? (
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={selectedPlayer.perf_trends}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis 
                            dataKey="name" 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 12 }}
                            dy={10}
                          />
                          <YAxis 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 12 }}
                            domain={[0, 10]}
                            dx={-10}
                          />
                          <RechartsTooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                            cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="value" 
                            name="Puntuación"
                            stroke="#3b82f6" 
                            strokeWidth={3}
                            dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[200px] w-full flex items-center justify-center flex-col text-slate-400">
                      <Activity size={32} className="mb-2 opacity-50" />
                      <p className="text-sm font-medium">No hay datos de rendimiento registrados</p>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
