import React, { useMemo, useState } from 'react';
import { User, Activity, Clock, Shield, Goal, AlertTriangle, CalendarDays, ChevronRight, X, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { useExport } from "@/components/providers/ExportContext";
import { PlayerStatsModal, type PlayerStatsData } from "./PlayerStatsModal";

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
              <div className="w-14 h-14 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-lg border border-slate-200 group-hover:border-blue-200 transition-colors shrink-0">
                {player.avatar_url ? (
                  <img src={player.avatar_url} alt={player.first_name} className="w-full h-full object-cover object-[center_25%]" />
                ) : (
                  <span>{player.first_name?.charAt(0) || ''}{player.last_name?.charAt(0) || ''}</span>
                )}
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
        <PlayerStatsModal 
          player={selectedPlayer as PlayerStatsData} 
          onClose={() => setSelectedPlayerId(null)} 
        />
      )}
    </div>
  );
}
