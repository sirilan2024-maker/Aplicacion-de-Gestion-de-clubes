"use client";

import React, { useState, useEffect, Fragment } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Check, X, Stethoscope, Loader2, Calendar as CalendarIcon, BarChart2, ListChecks, ChevronDown, ChevronUp } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  dorsal: number | null;
}

interface PastEvent {
  id: string;
  title: string;
  date: string;
  event_type?: string;
}

interface AttendanceRecord {
  player_id: string;
  event_id: string | null;
  date: string;
  status: string;
}

interface ClubMetric {
  id: string;
  name: string;
  unit: string;
  type: string;
}

interface PlayerTrainingMetric {
  player_id: string;
  metric_id: string;
  value_number: number | null;
  value_text: string | null;
}

export default function AsistenciaEquipoPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const teamId = typeof params.teamId === 'string' ? params.teamId : '';
  
  const queryEventId = searchParams.get('eventId');
  const queryDate = searchParams.get('date');

  // --- STATE ---
  const [players, setPlayers] = useState<Player[]>([]);
  const [pastEvents, setPastEvents] = useState<PastEvent[]>([]);
  const [summaryData, setSummaryData] = useState<AttendanceRecord[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [attendanceFilter, setAttendanceFilter] = useState<'todos' | 'entrenamientos' | 'partidos'>('todos');
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);

  useEffect(() => {
    fetchPlayers();
    fetchSummaryData();
  }, [teamId]);

  const fetchPlayers = async () => {
    if (!teamId) return;
    const supabase = createClient();
    try {
      // 1. Get user profile and club
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('club_id').eq('id', user.id).single();
      if (!profile?.club_id) return;

      // 2. Get active season
      const { data: activeSeason } = await supabase.from('seasons').select('id').eq('club_id', profile.club_id).eq('is_active', true).single();
      if (!activeSeason?.id) return;

      // 3. Fetch players via player_season_history
      const { data: playersData, error } = await supabase
        .from("player_season_history")
        .select(`
          player_id,
          players (
            id, first_name, last_name, dorsal
          )
        `)
        .eq("team_id", teamId)
        .eq("season_id", activeSeason.id);

      if (error) throw error;
      
      // Mapear al formato original
      const mappedPlayers = (playersData || []).map((history: any) => ({
        id: history.players.id,
        first_name: history.players.first_name,
        last_name: history.players.last_name,
        dorsal: history.players.dorsal
      })).sort((a, b) => (a.last_name || '').localeCompare(b.last_name || ''));

      setPlayers(mappedPlayers);
    } catch (err: any) {
      toast.error("Error al cargar jugadores: " + err.message);
    }
  };

  // ==========================================
  // SUMMARY LOGIC
  // ==========================================
  const fetchSummaryData = async () => {
    if (!teamId) return;
    setLoadingSummary(true);
    const supabase = createClient();
    try {
      // Get all events from the past up to today
      const today = new Date().toISOString().split('T')[0];
      const { data: evs, error: err1 } = await supabase
        .from('team_events')
        .select('id, title, date, event_type')
        .eq('team_id', teamId)
        .lte('date', today)
        .order('date', { ascending: false })
        .limit(15); // Show last 15 events max
      
      if (err1) throw err1;
      
      // Get all attendance records for this team
      const { data: atts, error: err2 } = await supabase
        .from('attendance')
        .select('player_id, event_id, date, status')
        .eq('team_id', teamId);
        
      if (err2) throw err2;

      setPastEvents(evs?.reverse() || []); // Order oldest to newest in the array for left-to-right table
      setSummaryData(atts || []);
    } catch (err: any) {
      toast.error("Error al cargar resumen: " + err.message);
    } finally {
      setLoadingSummary(false);
    }
  };

  const getPlayerPercentage = (playerId: string, eventsToUse: PastEvent[]) => {
    // If no events exist, return { pct: 0, faltas: 0 }
    if (eventsToUse.length === 0) return { pct: 0, faltas: 0 };
    
    // Total events
    const totalEvents = eventsToUse.length;
    // How many times present
    const presents = summaryData.filter(a => 
      a.player_id === playerId && 
      (eventsToUse.some(ev => ev.id === a.event_id || ev.date === a.date)) &&
      (a.status?.toLowerCase() === 'presente' || a.status?.toLowerCase() === 'present')
    ).length;
    
    // How many times absent
    const absents = summaryData.filter(a => 
      a.player_id === playerId && 
      (eventsToUse.some(ev => ev.id === a.event_id || ev.date === a.date)) &&
      (a.status?.toLowerCase() === 'ausente' || a.status?.toLowerCase() === 'absent')
    ).length;
    
    return {
      pct: Math.round((presents / totalEvents) * 100),
      faltas: absents
    };
  };

  const getStatusColor = (status: string | undefined) => {
    if (!status) return 'bg-gray-100 text-gray-400';
    const s = status.toLowerCase();
    if (s === 'presente' || s === 'present') return 'bg-emerald-500 text-white shadow-sm';
    if (s === 'ausente' || s === 'absent') return 'bg-red-500 text-white shadow-sm';
    if (s === 'lesionado' || s === 'excused') return 'bg-amber-500 text-white shadow-sm';
    return 'bg-gray-100 text-gray-400';
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Toaster position="bottom-right" />
      
      {/* SUMMARY VIEW */}
      {(() => {
        const filteredPastEvents = attendanceFilter === 'todos' 
          ? pastEvents 
          : pastEvents.filter(ev => ev.event_type === (attendanceFilter === 'entrenamientos' ? 'Entrenamiento' : 'Partido'));

        return (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Análisis de Asistencia</h2>
                <p className="text-gray-500 text-sm mt-1">Cuadrícula con el historial de los últimos eventos.</p>
              </div>
              
              {/* Selector de Asistencia */}
              <div className="flex bg-gray-100 p-1 rounded-full border border-gray-200 shadow-inner">
                <button
                  onClick={() => setAttendanceFilter('todos')}
                  className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-bold transition-all ${
                    attendanceFilter === 'todos' 
                      ? 'bg-white text-slate-800 shadow-sm border border-gray-200/50' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setAttendanceFilter('entrenamientos')}
                  className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-bold transition-all ${
                    attendanceFilter === 'entrenamientos' 
                      ? 'bg-white text-emerald-700 shadow-sm border border-gray-200/50' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Entrenamientos
                </button>
                <button
                  onClick={() => setAttendanceFilter('partidos')}
                  className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-bold transition-all ${
                    attendanceFilter === 'partidos' 
                      ? 'bg-white text-indigo-700 shadow-sm border border-gray-200/50' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Partidos
                </button>
              </div>
            </div>
            
            {loadingSummary ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Calculando estadísticas...</p>
              </div>
            ) : filteredPastEvents.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-500">No hay eventos pasados para analizar en esta categoría.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr>
                      <th className="p-4 border-b border-gray-200 bg-gray-50 sticky left-0 z-10 font-bold text-gray-700 w-64 shadow-[1px_0_0_0_#e5e7eb]">
                        Jugador
                      </th>
                      <th className="p-4 border-b border-gray-200 bg-gray-50 text-center font-bold text-gray-700 w-24 border-l border-gray-200">
                        Faltas
                      </th>
                      <th className="p-4 border-b border-gray-200 bg-gray-50 text-center font-bold text-gray-700 w-32 border-l border-gray-200">
                        % Total
                      </th>
                      {filteredPastEvents.map((ev, i) => (
                        <th key={ev.id || i} className="p-4 border-b border-l border-gray-200 bg-gray-50 text-center text-xs font-bold text-gray-600 w-24">
                          <div className="truncate w-full max-w-[80px] mx-auto" title={ev.title}>
                            {ev.title}
                          </div>
                          <div className="text-[10px] text-gray-400 font-medium mt-1">
                            {ev.date.substring(5,10)}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                <tbody className="divide-y divide-gray-100">
                  {players.map((player) => {
                    const stats = getPlayerPercentage(player.id, filteredPastEvents);
                    const pct = stats.pct;
                    const faltas = stats.faltas;
                    const isExpanded = expandedPlayerId === player.id;
                    
                    return (
                      <Fragment key={player.id}>
                      <tr 
                        onClick={() => setExpandedPlayerId(isExpanded ? null : player.id)}
                        className={`hover:bg-blue-50/20 transition-colors cursor-pointer ${faltas >= 3 ? 'bg-red-50/10' : ''} ${isExpanded ? 'bg-blue-50/40' : ''}`}
                      >
                        <td className="p-4 font-semibold text-gray-900 sticky left-0 bg-white shadow-[1px_0_0_0_#e5e7eb] z-10 flex items-center gap-3">
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-blue-500 shrink-0"/> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0"/>}
                          {player.dorsal ? (
                            <span className="text-xs text-gray-400 font-bold w-4 text-right shrink-0">{player.dorsal}</span>
                          ) : (
                            <span className="text-xs text-gray-400 font-bold w-4 text-right shrink-0"></span>
                          )}
                          <span className="truncate group-hover:text-blue-600 transition-colors">{player.first_name} {player.last_name}</span>
                          {faltas >= 3 && <div className="w-2 h-2 rounded-full bg-red-500 ml-1" title="Múltiples faltas"></div>}
                        </td>
                        
                        <td className="p-4 text-center border-l border-gray-100 font-bold text-red-600 bg-red-50/30">
                          {faltas > 0 ? faltas : '-'}
                        </td>
                        
                        <td className="p-4 text-center font-black text-gray-900 border-l border-gray-200 bg-gray-50/50">
                          {pct}%
                        </td>
                        {filteredPastEvents.map((ev, i) => {
                          const att = summaryData.find(a => a.player_id === player.id && (a.event_id === ev.id || a.date === ev.date));
                          const stat = att?.status;
                          return (
                            <td key={ev.id || i} className="p-4 border-l border-gray-200 text-center">
                              <div className={`w-8 h-8 rounded-full mx-auto flex items-center justify-center shadow-sm border border-black/5 ${getStatusColor(stat)}`}>
                                {!stat && <span className="text-gray-300">-</span>}
                                {(stat?.toLowerCase() === 'presente' || stat?.toLowerCase() === 'present') && <Check className="w-4 h-4" />}
                                {(stat?.toLowerCase() === 'ausente' || stat?.toLowerCase() === 'absent') && <X className="w-4 h-4" />}
                                {(stat?.toLowerCase() === 'lesionado' || stat?.toLowerCase() === 'excused') && <Stethoscope className="w-4 h-4" />}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={filteredPastEvents.length + 3} className="p-0 border-b border-blue-100 bg-slate-50/80 shadow-inner">
                            <PlayerAttendanceSummary 
                              playerId={player.id} 
                              events={filteredPastEvents} 
                              summaryData={summaryData} 
                            />
                          </td>
                        </tr>
                      )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        );
      })()}
    </div>
  );
}

// Subcomponente para mostrar un resumen visual de la asistencia
function PlayerAttendanceSummary({ playerId, events, summaryData }: { playerId: string, events: PastEvent[], summaryData: AttendanceRecord[] }) {
  if (events.length === 0) return <div className="p-8 text-center text-slate-500">No hay eventos para mostrar.</div>;

  const totalEvents = events.length;
  const presents = summaryData.filter(a => a.player_id === playerId && (events.some(ev => ev.id === a.event_id || ev.date === a.date)) && (a.status?.toLowerCase() === 'presente' || a.status?.toLowerCase() === 'present')).length;
  const absents = summaryData.filter(a => a.player_id === playerId && (events.some(ev => ev.id === a.event_id || ev.date === a.date)) && (a.status?.toLowerCase() === 'ausente' || a.status?.toLowerCase() === 'absent')).length;
  const excused = summaryData.filter(a => a.player_id === playerId && (events.some(ev => ev.id === a.event_id || ev.date === a.date)) && (a.status?.toLowerCase() === 'lesionado' || a.status?.toLowerCase() === 'excused')).length;
  const unrecorded = totalEvents - (presents + absents + excused);

  const pct = totalEvents > 0 ? Math.round((presents / totalEvents) * 100) : 0;

  return (
    <div className="sticky left-0 p-3 md:p-6 bg-slate-50/50 w-full max-w-[95vw] md:max-w-[calc(100vw-300px)] lg:max-w-5xl mx-auto md:mx-0 overflow-hidden">
      <h4 className="font-bold text-blue-900 mb-6 flex items-center gap-2">
        <CalendarIcon className="w-5 h-5 text-blue-500" />
        Resumen de Asistencia
      </h4>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center relative overflow-hidden text-center">
          <div className="absolute top-0 right-0 w-12 h-12 bg-emerald-50 rounded-bl-full -z-10"></div>
          <div className="text-2xl md:text-3xl font-black text-slate-800 mb-1">{pct}%</div>
          <div className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wide leading-tight">Asistencia Total</div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
            <div className={`h-1.5 rounded-full ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }}></div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="text-2xl md:text-3xl font-black text-emerald-600 mb-1">{presents}</div>
          <div className="text-[10px] md:text-xs font-bold text-emerald-800 uppercase tracking-wide leading-tight">Asistencias</div>
          <div className="text-[9px] md:text-[10px] text-emerald-500 mt-1 leading-tight">Completadas</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-red-100 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="text-2xl md:text-3xl font-black text-red-600 mb-1">{absents}</div>
          <div className="text-[10px] md:text-xs font-bold text-red-800 uppercase tracking-wide leading-tight">Injustificadas</div>
          <div className="text-[9px] md:text-[10px] text-red-500 mt-1 leading-tight">Ausencias</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="text-2xl md:text-3xl font-black text-amber-600 mb-1">{excused}</div>
          <div className="text-[10px] md:text-xs font-bold text-amber-800 uppercase tracking-wide leading-tight">Justificadas</div>
          <div className="text-[9px] md:text-[10px] text-amber-500 mt-1 leading-tight">Lesión/Permiso</div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-100 px-4 py-3 font-bold text-slate-700 text-sm">
          Últimas Ausencias Registradas
        </div>
        <div className="divide-y divide-slate-100">
          {events.filter(ev => {
            const att = summaryData.find(a => a.player_id === playerId && (a.event_id === ev.id || a.date === ev.date));
            return att && ['ausente', 'absent', 'lesionado', 'excused'].includes(att.status?.toLowerCase() || '');
          }).slice(0, 5).map(ev => {
            const att = summaryData.find(a => a.player_id === playerId && (a.event_id === ev.id || a.date === ev.date));
            const isExcused = ['lesionado', 'excused'].includes(att?.status?.toLowerCase() || '');
            return (
              <div key={ev.id} className="p-3 md:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                <div className="flex items-start sm:items-center gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 sm:mt-0 shrink-0 ${isExcused ? 'bg-amber-500' : 'bg-red-500'}`}></div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800 text-sm truncate">{ev.title}</div>
                    <div className="text-xs text-slate-500 truncate">{new Date(ev.date).toLocaleDateString()} • {ev.event_type}</div>
                  </div>
                </div>
                <div className={`self-start sm:self-auto px-3 py-1 rounded-full text-[10px] md:text-xs font-bold shrink-0 ${isExcused ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                  {isExcused ? 'Falta Justificada' : 'Ausencia'}
                </div>
              </div>
            );
          })}
          {events.filter(ev => {
            const att = summaryData.find(a => a.player_id === playerId && (a.event_id === ev.id || a.date === ev.date));
            return att && ['ausente', 'absent', 'lesionado', 'excused'].includes(att.status?.toLowerCase() || '');
          }).length === 0 && (
            <div className="p-8 text-center text-slate-400 text-sm">No se han registrado ausencias recientes en este filtro.</div>
          )}
        </div>
      </div>
    </div>
  );
}
