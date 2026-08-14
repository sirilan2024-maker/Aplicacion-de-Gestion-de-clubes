"use client";

import React, { useState, useEffect, Fragment } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Check, X, Stethoscope, Loader2, Calendar as CalendarIcon, ArrowLeft, BarChart2, ListChecks, ChevronDown, ChevronUp, Save, Clock } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  dorsal: number | null;
  avatar_url?: string | null;
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

export default function AsistenciaEquipoPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
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

  // Single event recording state
  const [eventDetails, setEventDetails] = useState<any>(null);
  const [singleEventAttendance, setSingleEventAttendance] = useState<Record<string, string>>({});
  const [savingStatus, setSavingStatus] = useState<Record<string, boolean>>({});
  const [loadingEvent, setLoadingEvent] = useState(false);
  const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null);

  useEffect(() => {
    fetchPlayers();
    if (queryEventId) {
      fetchSingleEventDetails();
    } else {
      fetchSummaryData();
    }
  }, [teamId, queryEventId, queryDate]);

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
      setActiveSeasonId(activeSeason.id);

      // 3. Fetch players via player_season_history
      const { data: playersData, error } = await supabase
        .from("player_season_history")
        .select(`
          player_id,
          players (
            id, first_name, last_name, dorsal, avatar_url
          )
        `)
        .eq("team_id", teamId)
        .eq("season_id", activeSeason.id);

      if (error) throw error;
      
      const mappedPlayers = (playersData || []).map((history: any) => ({
        id: history.players.id,
        first_name: history.players.first_name,
        last_name: history.players.last_name,
        dorsal: history.players.dorsal,
        avatar_url: history.players.avatar_url
      })).sort((a, b) => (a.last_name || '').localeCompare(b.last_name || ''));

      setPlayers(mappedPlayers);
    } catch (err: any) {
      toast.error("Error al cargar jugadores: " + err.message);
    }
  };

  const fetchSummaryData = async () => {
    if (!teamId) return;
    setLoadingSummary(true);
    const supabase = createClient();
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: evs, error: err1 } = await supabase
        .from('team_events')
        .select('id, title, date, event_type')
        .eq('team_id', teamId)
        .lte('date', today)
        .order('date', { ascending: false })
        .limit(15);
      
      if (err1) throw err1;
      
      const { data: atts, error: err2 } = await supabase
        .from('attendance')
        .select('player_id, event_id, date, status')
        .in('event_id', evs?.map(e => e.id) || []);
        
      if (err2) throw err2;

      setPastEvents(evs?.reverse() || []);
      setSummaryData(atts || []);
    } catch (err: any) {
      toast.error("Error al cargar resumen: " + err.message);
    } finally {
      setLoadingSummary(false);
    }
  };

  const fetchSingleEventDetails = async () => {
    if (!queryEventId) return;
    setLoadingEvent(true);
    const supabase = createClient();
    try {
      // 1. Fetch Event info
      const { data: ev, error: evError } = await supabase
        .from('team_events')
        .select('*')
        .eq('id', queryEventId)
        .maybeSingle();
      
      if (evError) throw evError;
      
      let finalEvent = ev;

      // Si no encontramos un evento en team_events, puede que sea un Partido.
      // Creamos un evento "sombra" en team_events para poder usar la misma tabla de attendance.
      if (!finalEvent) {
        const { data: pEv } = await supabase.from('partidos').select('*').eq('id', queryEventId).maybeSingle();
        if (pEv) {
           const { data: newEv, error: insertError } = await supabase
             .from('team_events')
             .insert({
                id: pEv.id,
                team_id: pEv.equipo_id,
                event_type: 'Partido',
                title: `Jornada vs ${pEv.rival_nombre || 'Rival'}`,
                date: pEv.fecha_hora ? pEv.fecha_hora.split('T')[0] : new Date().toISOString().split('T')[0],
                start_time: pEv.fecha_hora ? pEv.fecha_hora.split('T')[1].substring(0, 5) : '00:00'
             })
             .select()
             .single();
             
           if (newEv) {
             finalEvent = newEv;
           } else if (insertError) {
             // If we failed to insert, maybe it was just inserted by another concurrent request, try fetching again
             const { data: retryEv } = await supabase.from('team_events').select('*').eq('id', queryEventId).maybeSingle();
             if (retryEv) finalEvent = retryEv;
           }
        }
      }

      if (!finalEvent) {
        toast.error("El evento no se encuentra.");
        setLoadingEvent(false);
        return;
      }
      
      setEventDetails(finalEvent);

      // 2. Fetch existing attendance records
      const { data: atts, error: attError } = await supabase
        .from('attendance')
        .select('player_id, status')
        .eq('event_id', queryEventId);

      if (attError) throw attError;

      const attMap: Record<string, string> = {};
      if (atts) {
        atts.forEach(a => {
          attMap[a.player_id] = a.status;
        });
      }
      setSingleEventAttendance(attMap);
    } catch (err: any) {
      toast.error("Error al cargar detalles del evento: " + err.message);
    } finally {
      setLoadingEvent(false);
    }
  };

  const handleStatusChange = async (playerId: string, status: string) => {
    if (!queryEventId || !queryDate) return;
    
    // Optimistic update
    setSingleEventAttendance(prev => ({ ...prev, [playerId]: status }));
    setSavingStatus(prev => ({ ...prev, [playerId]: true }));

    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('attendance')
        .upsert({
          session_id: queryEventId,
          event_id: queryEventId,
          player_id: playerId,
          status: status, // 'present', 'absent', 'excused'
          date: queryDate,
          season_id: activeSeasonId
        }, { onConflict: 'session_id,player_id' });

      if (error) throw error;
      toast.success("Asistencia guardada correctamente", { id: 'save-toast', duration: 1000 });
    } catch (err: any) {
      toast.error("Error al guardar asistencia: " + err.message);
      // Revert optimistic update
      fetchSingleEventDetails();
    } finally {
      setSavingStatus(prev => ({ ...prev, [playerId]: false }));
    }
  };

  const getPlayerPercentage = (playerId: string, eventsToUse: PastEvent[]) => {
    if (eventsToUse.length === 0) return { pct: 0, faltas: 0 };
    const totalEvents = eventsToUse.length;
    const presents = summaryData.filter(a => 
      a.player_id === playerId && 
      (eventsToUse.some(ev => ev.id === a.event_id || ev.date === a.date)) &&
      (a.status?.toLowerCase() === 'presente' || a.status?.toLowerCase() === 'present' || a.status?.toLowerCase() === 'retraso' || a.status?.toLowerCase() === 'late')
    ).length;
    
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
    if (s === 'retraso' || s === 'late') return 'bg-orange-500 text-white shadow-sm';
    if (s === 'ausente' || s === 'absent') return 'bg-red-500 text-white shadow-sm';
    if (s === 'lesionado' || s === 'excused') return 'bg-amber-500 text-white shadow-sm';
    return 'bg-gray-100 text-gray-400';
  };

  // --- RENDERING FOR SINGLE EVENT ---
  if (queryEventId) {
    if (loadingEvent) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
          <p className="text-gray-500 font-medium">Cargando sesión y asistencia...</p>
        </div>
      );
    }

    return (
      <div className="max-w-4xl mx-auto px-4 py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Toaster position="bottom-right" />
        
        {/* Navigation header */}
        <button 
          onClick={() => router.push(`/dashboard/equipos/${teamId}/asistencia`)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 font-medium transition-colors"
        >
          <ArrowLeft size={18} /> Volver a Resumen de Asistencia
        </button>

        {/* Event details card */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700">
                <CalendarIcon className="w-3.5 h-3.5" />
                {eventDetails?.event_type || 'Sesión'}
              </span>
              <h1 className="text-2xl font-bold text-gray-900 mt-2">{eventDetails?.title || 'Pasar Lista'}</h1>
              <p className="text-sm text-gray-500 mt-1">
                {eventDetails?.date} • {eventDetails?.start_time?.substring(0, 5)} {eventDetails?.end_time ? `- ${eventDetails?.end_time?.substring(0, 5)}` : ''} • {eventDetails?.location || 'Sin ubicación'}
              </p>
            </div>
            
            <button
              onClick={() => router.push(`/dashboard/equipos/${teamId}/calendario`)}
              className="text-xs font-bold text-gray-600 hover:text-gray-900 px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors self-start sm:self-auto"
            >
              Ver en Calendario
            </button>
          </div>
        </div>

        {/* Players list to mark attendance */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-slate-700">
            Plantilla del Equipo
          </div>
          
          {players.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No hay jugadores inscritos en este equipo para la temporada activa.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {players.map(player => {
                const currentStatus = singleEventAttendance[player.id];
                const isSaving = savingStatus[player.id];
                
                return (
                  <div key={player.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-sm border border-gray-200 shrink-0">
                        {player.dorsal || '-'}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{player.first_name} {player.last_name}</p>
                      </div>
                    </div>
                    
                    {/* Status selectors */}
                    <div className="flex bg-gray-100 p-1 rounded-xl self-start sm:self-auto relative border border-gray-200/50 shadow-inner">
                        <button
                          onClick={() => handleStatusChange(player.id, 'present')}
                          disabled={isSaving}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50 ${
                            currentStatus === 'present' || currentStatus === 'Presente'
                              ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-100'
                              : 'text-gray-600 hover:bg-gray-200/60'
                          }`}
                        >
                          {isSaving && (currentStatus === 'present' || currentStatus === 'Presente') ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Check className="w-3.5 h-3.5" />}
                          Presente
                        </button>
                        <button
                          onClick={() => handleStatusChange(player.id, 'retraso')}
                          disabled={isSaving}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50 ${
                            currentStatus === 'retraso' || currentStatus === 'Retraso'
                              ? 'bg-orange-500 text-white shadow-sm shadow-orange-100'
                              : 'text-gray-600 hover:bg-gray-200/60'
                          }`}
                        >
                          {isSaving && (currentStatus === 'retraso' || currentStatus === 'Retraso') ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Clock className="w-3.5 h-3.5" />}
                          Retraso
                        </button>
                      <button
                        onClick={() => handleStatusChange(player.id, 'absent')}
                        disabled={isSaving}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50 ${
                          currentStatus === 'absent'
                            ? 'bg-red-500 text-white shadow-sm shadow-red-100'
                            : 'text-gray-600 hover:bg-gray-200/60'
                        }`}
                      >
                        {isSaving && currentStatus === 'absent' ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <X className="w-3.5 h-3.5" />}
                        Ausente
                      </button>
                      <button
                        onClick={() => handleStatusChange(player.id, 'excused')}
                        disabled={isSaving}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50 ${
                          currentStatus === 'excused'
                            ? 'bg-amber-500 text-white shadow-sm shadow-amber-100'
                            : 'text-gray-600 hover:bg-gray-200/60'
                        }`}
                      >
                        {isSaving && currentStatus === 'excused' ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Stethoscope className="w-3.5 h-3.5" />}
                        Justificado
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- RENDERING FOR SUMMARY GRID ---
  const filteredPastEvents = attendanceFilter === 'todos' 
    ? pastEvents 
    : pastEvents.filter(ev => ev.event_type === (attendanceFilter === 'entrenamientos' ? 'Entrenamiento' : 'Partido'));

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Toaster position="bottom-right" />
      
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Análisis de Asistencia</h2>
            <p className="text-gray-500 text-sm mt-1">Cuadrícula con el historial de los últimos eventos. Pulsa en el título de un evento para pasar lista o editarlo.</p>
          </div>
          
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
                    <th 
                      key={ev.id || i} 
                      onClick={() => router.push(`/dashboard/equipos/${teamId}/asistencia?eventId=${ev.id}&date=${ev.date}`)}
                      className="p-4 border-b border-l border-gray-200 bg-gray-50 text-center text-xs font-bold text-gray-600 w-24 cursor-pointer hover:bg-gray-100/80 transition-colors group"
                    >
                      <div className="truncate w-full max-w-[80px] mx-auto text-blue-600 group-hover:underline" title={ev.title}>
                        {ev.title}
                      </div>
                      <div className="text-[10px] text-gray-400 font-medium mt-1">
                        {new Date(ev.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
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
                        <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                          {player.avatar_url ? (
                            <img src={player.avatar_url} alt={player.first_name} className="w-full h-full object-cover object-[center_25%]" />
                          ) : (
                            <span className="text-[10px] font-bold text-slate-500">
                              {player.first_name?.charAt(0)}{player.last_name?.charAt(0)}
                            </span>
                          )}
                        </div>
                        {player.dorsal ? (
                          <span className="text-xs text-gray-500 font-extrabold w-4 text-right shrink-0">{player.dorsal}</span>
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
                              {(stat?.toLowerCase() === 'retraso' || stat?.toLowerCase() === 'late') && <Clock className="w-4 h-4" />}
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
    </div>
  );
}

// Subcomponente para mostrar un resumen visual de la asistencia
function PlayerAttendanceSummary({ playerId, events, summaryData }: { playerId: string, events: PastEvent[], summaryData: AttendanceRecord[] }) {
  if (events.length === 0) return <div className="p-8 text-center text-slate-500">No hay eventos para mostrar.</div>;

  const totalEvents = events.length;
  const presents = summaryData.filter(a => a.player_id === playerId && (events.some(ev => ev.id === a.event_id || ev.date === a.date)) && ['presente', 'present', 'retraso', 'late'].includes(a.status?.toLowerCase())).length;
  const absents = summaryData.filter(a => a.player_id === playerId && (events.some(ev => ev.id === a.event_id || ev.date === a.date)) && (a.status?.toLowerCase() === 'ausente' || a.status?.toLowerCase() === 'absent')).length;
  const excused = summaryData.filter(a => a.player_id === playerId && (events.some(ev => ev.id === a.event_id || ev.date === a.date)) && (a.status?.toLowerCase() === 'lesionado' || a.status?.toLowerCase() === 'excused')).length;

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
                    <div className="text-xs text-slate-500 truncate">{new Date(ev.date).toLocaleDateString('es-ES')} • {ev.event_type}</div>
                  </div>
                </div>
                <div className={`self-start sm:self-auto px-3 py-1 rounded-full text-[10px] md:text-xs font-bold shrink-0 ${isExcused ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                  {isExcused ? 'Falta Justificada' : 'Ausencia'}
                </div>
              </div>
            );
          }).reverse()}
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
