"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Loader2, Save, UserCheck, BrainCircuit, Zap } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { FormativeEvaluationForm } from "@/components/features/formative/FormativeEvaluationForm";
import { isFormativeCategory } from "@/lib/utils";

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  dorsal: number | null;
  avatar_url?: string | null;
}

interface ClubMetric {
  id: string;
  name: string;
  category: string;
  module_type: string;
  type: string;
  unit: string | null;
  options: string[] | null;
}

export default function EntrenamientoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = typeof params.teamId === 'string' ? params.teamId : '';
  const eventId = typeof params.eventId === 'string' ? params.eventId : '';

  const [loading, setLoading] = useState(true);
  const [eventDetails, setEventDetails] = useState<any>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [metrics, setMetrics] = useState<ClubMetric[]>([]);
  const [playerMetrics, setPlayerMetrics] = useState<Record<string, Record<string, string | number>>>({});
  
  // Selection States
  const [activeModule, setActiveModule] = useState<'asistencia' | 'formativo' | 'rapida'>('asistencia');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [savingPlayer, setSavingPlayer] = useState<string | null>(null);

  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [showFormativo, setShowFormativo] = useState(false);
  const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null);
  const [teamCategory, setTeamCategory] = useState<string>('');
  const [teamName, setTeamName] = useState<string>('');

  const isFormative = (): boolean => {
    return isFormativeCategory(teamCategory, teamName);
  };

  useEffect(() => {
    const stored = localStorage.getItem('showFormativo');
    if (stored) setShowFormativo(stored === 'true');
    fetchData();
  }, [teamId, eventId]);

  const fetchData = async () => {
    if (!teamId || !eventId) return;
    setLoading(true);
    const supabase = createClient();

    // 0. Fetch Team Category & Name
    const { data: tData } = await supabase.from('teams').select('category, name').eq('id', teamId).single();
    if (tData) {
      setTeamCategory(tData.category || '');
      setTeamName(tData.name || '');
    }

    // 1. Fetch Event
    const { data: evData } = await supabase.from('team_events').select('*').eq('id', eventId).single();
    if (evData) setEventDetails(evData);

    // 2. Fetch Active Season & Players
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = user ? await supabase.from('profiles').select('club_id').eq('id', user.id).single() : { data: null };
    const { data: activeSeason } = profile?.club_id ? await supabase.from('seasons').select('id').eq('club_id', profile.club_id).eq('is_active', true).single() : { data: null };
    
    if (activeSeason?.id) {
      setActiveSeasonId(activeSeason.id);
    }
    
    let plData: any[] = [];
    if (activeSeason?.id) {
      const { data: historyData } = await supabase
        .from('player_season_history')
        .select('player_id, players(id, first_name, last_name, dorsal, avatar_url)')
        .eq('team_id', teamId)
        .neq('status', 'inactive')
        .or(`season_id.eq.${activeSeason.id},season_id.is.null`);
      if (historyData) {
        plData = historyData.map((h: any) => h.players).sort((a, b) => (a.last_name || '').localeCompare(b.last_name || ''));
      }
    }

    const { data: attData } = await supabase.from('attendance').select('player_id, status').eq('event_id', eventId);
    
    if (plData) {
      setAllPlayers(plData);
      
      const attMap: Record<string, string> = {};
      let hasAttendance = false;
      if (attData && attData.length > 0) {
        hasAttendance = true;
        attData.forEach(a => { attMap[a.player_id] = a.status; });
      }
      setAttendance(attMap);

      if (!hasAttendance) {
        setActiveModule('asistencia');
      }

      // Si hay asistencia tomada, filtrar por los presentes. Si aún no hay lista pasada, mostrar a toda la plantilla
      const presentIds = Object.keys(attMap).filter(id => attMap[id] === 'Presente' || attMap[id] === 'Retraso');
      const presentPlayers = (hasAttendance && presentIds.length > 0) ? plData.filter(p => presentIds.includes(p.id)) : plData;
      
      setPlayers(presentPlayers);
      if (presentPlayers.length > 0) {
        setSelectedPlayerId(presentPlayers[0].id);
      } else if (plData.length > 0) {
        setSelectedPlayerId(plData[0].id);
      }
    }

    // 3. Fetch Club Metrics
    const { data: currentProfile } = await supabase.from('profiles').select('club_id').single();
    if (currentProfile) {
      const { data: metricData } = await supabase.from('club_metrics').select('*').eq('club_id', currentProfile.club_id).eq('is_active', true);
      if (metricData) {
        const parsedMetrics = metricData
          .filter((m: any) => {
            const name = m.name.toLowerCase();
            return !name.includes('asistencia') && !name.includes('goles') && !name.includes('gol');
          })
          .map((m: any) => ({
            ...m,
            options: m.options ? (typeof m.options === 'string' ? JSON.parse(m.options) : m.options) : null
          }));
        setMetrics(parsedMetrics);
      }
    }

    // 4. Fetch existing values for this event
    const { data: valData } = await supabase.from('player_training_metrics').select('*').eq('event_id', eventId);
    if (valData) {
      const pm: Record<string, Record<string, string | number>> = {};
      valData.forEach(m => {
        if (!pm[m.player_id]) pm[m.player_id] = {};
        pm[m.player_id][m.metric_id] = m.value_number ?? m.value_text ?? '';
      });
      setPlayerMetrics(pm);
    }

    setLoading(false);
  };

  const handleMetricChange = (playerId: string, metricId: string, value: string, type: string) => {
    if (!playerId) return;
    setPlayerMetrics(prev => ({
      ...prev,
      [playerId]: {
        ...(prev[playerId] || {}),
        [metricId]: value
      }
    }));
  };

  const saveAllQuickMetrics = async () => {
    setSavingPlayer('all');
    const supabase = createClient();
    
    const rpeMetric = metrics.find(m => m.name.toLowerCase().includes('rpe'));
    const minMetric = metrics.find(m => m.name.toLowerCase().includes('minutos'));
    
    if (!rpeMetric || !minMetric) {
      toast.error("No se encontraron las métricas base (RPE/Minutos)");
      setSavingPlayer(null);
      return;
    }

    let hasError = false;

    for (const player of players) {
      const pData = playerMetrics[player.id] || {};
      const rpeVal = pData[rpeMetric.id];
      const minVal = pData[minMetric.id];

      if (rpeVal !== undefined && rpeVal !== '') {
        const { data: existingRpe } = await supabase.from('player_training_metrics').select('id').eq('event_id', eventId).eq('player_id', player.id).eq('metric_id', rpeMetric.id).maybeSingle();
        const rpePayload = { event_id: eventId, player_id: player.id, metric_id: rpeMetric.id, value_number: parseFloat(rpeVal as string) };
        if (existingRpe) await supabase.from('player_training_metrics').update(rpePayload).eq('id', existingRpe.id);
        else await supabase.from('player_training_metrics').insert(rpePayload);

        const finalMinVal = minVal !== undefined && minVal !== '' ? minVal : 90;
        const { data: existingMin } = await supabase.from('player_training_metrics').select('id').eq('event_id', eventId).eq('player_id', player.id).eq('metric_id', minMetric.id).maybeSingle();
        const minPayload = { event_id: eventId, player_id: player.id, metric_id: minMetric.id, value_number: parseFloat(finalMinVal as string) };
        if (existingMin) await supabase.from('player_training_metrics').update(minPayload).eq('id', existingMin.id);
        else await supabase.from('player_training_metrics').insert(minPayload);
      }
    }

    setSavingPlayer(null);
    if (hasError) toast.error("Error guardando algunos datos");
    else toast.success("Todos los datos guardados correctamente");
  };

  const saveAttendance = async () => {
    setSavingPlayer('asistencia');
    const supabase = createClient();
    
    // Filtrar solo los jugadores marcados o asignar 'Ausente' a los no marcados
    const markedEntries = Object.entries(attendance).filter(([_, status]) => Boolean(status));
    
    if (markedEntries.length === 0) {
      toast.error("Por favor, marca el estado de asistencia de al menos un jugador");
      setSavingPlayer(null);
      return;
    }

    const payloads = markedEntries.map(([playerId, status]) => ({
      session_id: eventId,
      event_id: eventId,
      player_id: playerId,
      date: eventDetails?.date,
      status: status,
      season_id: activeSeasonId
    }));

    const { error } = await supabase.from('attendance').upsert(payloads, { onConflict: 'session_id,player_id' });
    
    if (error) {
      console.error(error);
      toast.error("Error al guardar: " + error.message);
      setSavingPlayer(null);
      return;
    }

    setSavingPlayer(null);
    toast.success("Asistencia guardada correctamente");
    
    const presentIds = Object.keys(attendance).filter(id => attendance[id] === 'Presente' || attendance[id] === 'Retraso');
    const presentPlayers = allPlayers.filter(p => presentIds.includes(p.id));
    setPlayers(presentPlayers);
    if (presentPlayers.length > 0) setSelectedPlayerId(presentPlayers[0].id);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <p className="text-gray-500 font-medium">Cargando sesión de entrenamiento...</p>
      </div>
    );
  }

  const selectedPlayer = players.find(p => p.id === selectedPlayerId);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Toaster position="bottom-right" />
      
      {/* HEADER */}
      <button 
        onClick={() => router.push(`/dashboard/equipos/${teamId}/entrenamientos`)}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 font-medium transition-colors"
      >
        <ArrowLeft size={18} /> Volver a Entrenamientos
      </button>

      <div className="flex flex-col md:flex-row items-start justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-gray-900">{eventDetails?.title || 'Evaluación de Sesión'}</h1>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/feedback/${eventId}`);
                toast.success("Enlace copiado al portapapeles");
              }}
              className="text-xs font-bold bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full hover:bg-blue-200 transition-colors"
            >
              Copiar Enlace Jugadores
            </button>
          </div>
          <p className="text-gray-500 mt-1">
            {eventDetails?.date ? new Date(eventDetails.date).toLocaleDateString('es-ES') : ''} • Selecciona un módulo y un jugador para registrar sus datos.
          </p>
        </div>

        {/* MODULE SELECTOR */}
        <div className="w-full md:w-auto flex flex-col items-stretch md:items-end gap-2">
          {/* Barra segmentada unificada */}
          <div className="grid grid-cols-2 sm:flex gap-1.5 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 shadow-inner w-full sm:w-auto">
            <button 
              type="button"
              onClick={() => setActiveModule('asistencia')}
              className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
                activeModule === 'asistencia' ? 'bg-white text-blue-700 shadow-sm border border-slate-200/50' : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
              }`}
            >
              <UserCheck size={16} className={activeModule === 'asistencia' ? "text-blue-600" : "text-slate-400"} />
              <span>Control Asistencia</span>
            </button>

            <button 
              type="button"
              onClick={() => setActiveModule('rapida')}
              className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
                activeModule === 'rapida' ? 'bg-white text-purple-700 shadow-sm border border-slate-200/50' : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
              }`}
            >
              <Zap size={16} className={activeModule === 'rapida' ? "text-purple-600" : "text-slate-400"} />
              <span>Carga Rápida (RPE)</span>
            </button>

            {/* Botón Formativo con su mini interruptor de activación (solo en categorías hasta infantil 2º año) */}
            {isFormative() && (
              <button 
                type="button"
                onClick={() => setActiveModule('formativo')}
                className={`col-span-2 sm:col-span-1 flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
                  activeModule === 'formativo' 
                    ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/50' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                }`}
              >
                <BrainCircuit size={16} className={activeModule === 'formativo' ? "text-emerald-600" : "text-slate-400"} />
                <span>Formativo</span>

                {/* Botoncito switch toggle independiente para activar/desactivar */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextState = !showFormativo;
                    setShowFormativo(nextState);
                    localStorage.setItem('showFormativo', nextState ? 'true' : 'false');
                    if (nextState) {
                      setActiveModule('formativo');
                    }
                  }}
                  title={showFormativo ? "Módulo activado (clic para desactivar)" : "Módulo desactivado (clic para activar)"}
                  className={`w-7 h-4 flex items-center rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ml-1 ${
                    showFormativo ? 'bg-emerald-500 justify-end' : 'bg-slate-300 justify-start hover:bg-slate-400'
                  }`}
                >
                  <div className="bg-white w-3 h-3 rounded-full shadow-md" />
                </div>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: PLAYER LIST (Hidden in rapida, asistencia, or disabled formativo) */}
        {activeModule !== 'rapida' && activeModule !== 'asistencia' && (activeModule !== 'formativo' || showFormativo) && (
        <div className="md:col-span-4 lg:col-span-3 space-y-4">
          {/* Selector Desplegable para Móviles */}
          <div className="block md:hidden bg-white p-3.5 rounded-2xl shadow-sm border border-slate-200">
            <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1.5">
              <UserCheck size={14} className="text-emerald-600" />
              <span>Seleccionar Jugador para Evaluar:</span>
            </label>
            <select
              value={selectedPlayerId || ""}
              onChange={(e) => setSelectedPlayerId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="" disabled>-- Elige un jugador --</option>
              {players.map(p => (
                <option key={p.id} value={p.id}>
                  {p.dorsal ? `#${p.dorsal} ` : ''}{p.first_name} {p.last_name}
                </option>
              ))}
            </select>
          </div>

          {/* Lista Completa para Pantallas Grandes / Desktop */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-gray-700 flex items-center gap-2">
              <UserCheck size={18} /> Seleccionar Jugador
            </div>
            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {players.map(player => (
                <button
                  key={player.id}
                  onClick={() => setSelectedPlayerId(player.id)}
                  className={`w-full text-left p-4 flex items-center gap-3 transition-colors ${
                    selectedPlayerId === player.id 
                      ? 'bg-blue-50/80 border-l-4 border-blue-600' 
                      : 'hover:bg-gray-50 border-l-4 border-transparent'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                    selectedPlayerId === player.id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {player.dorsal || '-'}
                  </div>
                  <span className={`font-semibold truncate ${selectedPlayerId === player.id ? 'text-blue-900' : 'text-gray-700'}`}>
                    {player.first_name} {player.last_name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
        )}

        {/* RIGHT COLUMN: EVALUATION FORM */}
        <div className={(activeModule === 'rapida' || activeModule === 'asistencia' || (activeModule === 'formativo' && !showFormativo)) ? "md:col-span-12" : "md:col-span-8 lg:col-span-9"}>
          
          {activeModule === 'asistencia' ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white sticky top-0 z-10">
                <div className="space-y-1">
                  <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                    Control de Asistencia
                  </h2>
                  <p className="text-gray-500 text-xs sm:text-sm font-medium">
                    Marca quién asistió al entrenamiento antes de evaluar.
                  </p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
                  <button
                    type="button"
                    onClick={() => {
                      const allPresent: Record<string, string> = {};
                      allPlayers.forEach(p => { allPresent[p.id] = 'Presente'; });
                      setAttendance(allPresent);
                      toast.success("Todos marcados como Presente");
                    }}
                    className="inline-flex items-center justify-center text-center text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl transition-all border border-slate-200 shadow-sm active:scale-95 whitespace-nowrap min-h-[40px]"
                  >
                    Todos Presentes
                  </button>
                  <button 
                    onClick={saveAttendance}
                    disabled={savingPlayer === 'asistencia'}
                    className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all disabled:opacity-70 shadow-md shadow-blue-500/20 active:scale-95 whitespace-nowrap min-h-[40px]"
                  >
                    {savingPlayer === 'asistencia' ? <Loader2 size={16} className="animate-spin shrink-0" /> : <Save size={16} className="shrink-0" />}
                    <span>Guardar Asistencia</span>
                  </button>
                </div>
              </div>
              <div className="p-0 overflow-x-auto divide-y divide-gray-100">
                {allPlayers.map(player => {
                  const currentStatus = attendance[player.id];
                  
                  return (
                    <div key={player.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                          {player.avatar_url ? (
                            <img src={player.avatar_url} alt={player.first_name} className="w-full h-full object-cover object-[center_25%]" />
                          ) : (
                            <span className="text-slate-600 font-extrabold">{player.dorsal || `${player.first_name?.charAt(0)}${player.last_name?.charAt(0)}`}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 leading-tight">{player.first_name} {player.last_name}</p>
                          {player.dorsal && (
                            <span className="text-[11px] font-bold text-slate-500">Dorsal {player.dorsal}</span>
                          )}
                        </div>
                      </div>
                      
                      {/* Status selectors con texto visible y accesible */}
                      <div className="grid grid-cols-4 sm:flex bg-slate-100 p-1 rounded-2xl w-full sm:w-auto gap-1 border border-slate-200/70 shadow-inner">
                        <button
                          type="button"
                          onClick={() => setAttendance(prev => ({ ...prev, [player.id]: 'Presente' }))}
                          className={`flex items-center justify-center gap-1 px-2.5 sm:px-3.5 py-2 rounded-xl text-[11px] sm:text-xs font-black transition-all ${
                            currentStatus === 'Presente' || currentStatus === 'present'
                              ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200'
                              : 'text-slate-600 hover:bg-white/60'
                          }`}
                        >
                          <UserCheck className="w-3.5 h-3.5 shrink-0" />
                          <span>Presente</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setAttendance(prev => ({ ...prev, [player.id]: 'Retraso' }))}
                          className={`flex items-center justify-center gap-1 px-2.5 sm:px-3.5 py-2 rounded-xl text-[11px] sm:text-xs font-black transition-all ${
                            currentStatus === 'Retraso' || currentStatus === 'late'
                              ? 'bg-orange-500 text-white shadow-sm shadow-orange-200'
                              : 'text-slate-600 hover:bg-white/60'
                          }`}
                        >
                          <Zap className="w-3.5 h-3.5 shrink-0" />
                          <span>Retraso</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setAttendance(prev => ({ ...prev, [player.id]: 'Ausente' }))}
                          className={`flex items-center justify-center gap-1 px-2.5 sm:px-3.5 py-2 rounded-xl text-[11px] sm:text-xs font-black transition-all ${
                            currentStatus === 'Ausente' || currentStatus === 'absent'
                              ? 'bg-rose-500 text-white shadow-sm shadow-rose-200'
                              : 'text-slate-600 hover:bg-white/60'
                          }`}
                        >
                          <span className="text-xs leading-none shrink-0 font-black">✕</span>
                          <span>Ausente</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setAttendance(prev => ({ ...prev, [player.id]: 'Lesionado' }))}
                          className={`flex items-center justify-center gap-1 px-2.5 sm:px-3.5 py-2 rounded-xl text-[11px] sm:text-xs font-black transition-all ${
                            currentStatus === 'Lesionado' || currentStatus === 'excused'
                              ? 'bg-amber-500 text-white shadow-sm shadow-amber-200'
                              : 'text-slate-600 hover:bg-white/60'
                          }`}
                        >
                          <span className="text-xs leading-none shrink-0">⚕️</span>
                          <span>Justificado</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : activeModule === 'rapida' ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white sticky top-0 z-10">
                <div className="space-y-1">
                  <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                    Carga Rápida (Tabla de RPE)
                  </h2>
                  <p className="text-gray-500 text-xs sm:text-sm font-medium">
                    Introduce el RPE y Minutos de todos los jugadores de golpe.
                  </p>
                </div>
                <button 
                  onClick={saveAllQuickMetrics}
                  disabled={savingPlayer === 'all'}
                  className="inline-flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all disabled:opacity-70 shadow-md shadow-purple-500/20 active:scale-95 whitespace-nowrap shrink-0 min-h-[40px]"
                >
                  {savingPlayer === 'all' ? <Loader2 size={16} className="animate-spin shrink-0" /> : <Save size={16} className="shrink-0" />}
                  <span>Guardar Todos</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50 text-xs font-bold text-gray-600 uppercase">
                      <th className="p-4">Jugador</th>
                      <th className="p-4 w-44">Minutos</th>
                      <th className="p-4 w-44">RPE (1-10)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {players.map(p => {
                      const minutesMetric = metrics.find(m => m.name.toLowerCase().includes('minuto') || m.name.toLowerCase().includes('tiempo'));
                      const rpeMetric = metrics.find(m => m.name.toLowerCase().includes('rpe') || m.name.toLowerCase().includes('esfuerzo') || m.name.toLowerCase().includes('carga'));
                      
                      const minVal = minutesMetric ? (playerMetrics[p.id]?.[minutesMetric.id] ?? '90') : '';
                      const rpeVal = rpeMetric ? (playerMetrics[p.id]?.[rpeMetric.id] ?? '') : '';

                      return (
                        <tr key={p.id} className="hover:bg-gray-50/50">
                          <td className="p-4 font-semibold text-gray-900 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0">
                              {p.avatar_url ? (
                                <img src={p.avatar_url} alt={p.first_name} className="w-full h-full object-cover object-[center_25%]" />
                              ) : (
                                <span>{p.dorsal || `${p.first_name?.charAt(0)}${p.last_name?.charAt(0)}`}</span>
                              )}
                            </div>
                            <span>{p.first_name} {p.last_name}</span>
                          </td>
                          <td className="p-4">
                            <input 
                              type="number"
                              value={minVal}
                              onChange={(e) => minutesMetric && handleMetricChange(p.id, minutesMetric.id, e.target.value, 'number')}
                              className="w-full max-w-[130px] border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none font-bold text-slate-900 bg-white"
                              placeholder="Ej: 90"
                            />
                          </td>
                          <td className="p-4">
                            <input 
                              type="number" 
                              min={1} 
                              max={10} 
                              value={rpeVal}
                              onChange={(e) => {
                                if (!rpeMetric) return;
                                const raw = e.target.value;
                                if (raw === '') {
                                  handleMetricChange(p.id, rpeMetric.id, '', 'number');
                                  return;
                                }
                                const num = parseInt(raw, 10);
                                if (!isNaN(num)) {
                                  const clamped = Math.min(10, Math.max(1, num));
                                  handleMetricChange(p.id, rpeMetric.id, clamped.toString(), 'number');
                                }
                              }}
                              className="w-full max-w-[130px] border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none font-bold text-slate-900 bg-white"
                              placeholder="1 - 10"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeModule === 'formativo' ? (
            /* MÓDULO FORMATIVO Y EVALUACIÓN DE APRENDIZAJE INFANTIL */
            !showFormativo ? (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-12 text-center max-w-xl mx-auto space-y-4">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
                  <BrainCircuit size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Módulo Formativo Desactivado</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  El módulo de evaluación pedagógica y rúbricas cualitativas (1-5) está actualmente desactivado para este entrenamiento.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowFormativo(true);
                    localStorage.setItem('showFormativo', 'true');
                  }}
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3 rounded-2xl text-sm shadow-md transition-all active:scale-95"
                >
                  <BrainCircuit size={18} />
                  <span>Activar Módulo Formativo</span>
                </button>
              </div>
            ) : selectedPlayer ? (
              <div className="space-y-6">
                <FormativeEvaluationForm 
                  playerId={selectedPlayer.id}
                  playerName={`${selectedPlayer.first_name} ${selectedPlayer.last_name}`}
                  playerAvatarUrl={selectedPlayer.avatar_url}
                  dorsal={selectedPlayer.dorsal}
                  eventId={eventId}
                />
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-dashed border-gray-300 p-12 text-center text-gray-500">
                <p className="font-bold text-gray-800 text-lg mb-2">Selecciona un jugador</p>
                <p className="text-sm">Elige un jugador de la columna izquierda para evaluar sus rúbricas formativas.</p>
              </div>
            )
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-dashed border-gray-300 p-12 text-center text-gray-500">
              {players.length === 0 ? "No hay jugadores disponibles." : "Selecciona una opción del menú superior."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
