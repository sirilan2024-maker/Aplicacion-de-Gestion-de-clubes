"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Loader2, Save, UserCheck, Dumbbell, BrainCircuit, Zap } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  dorsal: number | null;
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
  const [activeModule, setActiveModule] = useState<'rendimiento' | 'formativo' | 'rapida'>('rendimiento');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [savingPlayer, setSavingPlayer] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [teamId, eventId]);

  const fetchData = async () => {
    if (!teamId || !eventId) return;
    setLoading(true);
    const supabase = createClient();

    // 1. Fetch Event
    const { data: evData } = await supabase.from('team_events').select('*').eq('id', eventId).single();
    if (evData) setEventDetails(evData);

    // 2. Fetch Players and Attendance
    const { data: plData } = await supabase.from('players').select('id, first_name, last_name, dorsal').eq('team_id', teamId).order('last_name');
    const { data: attData } = await supabase.from('attendance').select('player_id, status').eq('event_id', eventId);
    
    if (plData) {
      // Filter by "Presente"
      const presentIds = attData?.filter(a => a.status === 'Presente').map(a => a.player_id) || [];
      const presentPlayers = plData.filter(p => presentIds.includes(p.id));
      
      setPlayers(presentPlayers);
      if (presentPlayers.length > 0) setSelectedPlayerId(presentPlayers[0].id);
    }

    // 3. Fetch Club Metrics
    const { data: profile } = await supabase.from('profiles').select('club_id').single();
    if (profile) {
      const { data: metricData } = await supabase.from('club_metrics').select('*').eq('club_id', profile.club_id).eq('is_active', true);
      if (metricData) {
        // Parse options JSONB into array and filter out unwanted metrics
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

  const handleMetricChange = (metricId: string, value: string, type: string) => {
    if (!selectedPlayerId) return;
    setPlayerMetrics(prev => ({
      ...prev,
      [selectedPlayerId]: {
        ...(prev[selectedPlayerId] || {}),
        [metricId]: value
      }
    }));
  };

  const saveSelectedPlayerMetrics = async () => {
    if (!selectedPlayerId) return;
    setSavingPlayer(selectedPlayerId);
    const supabase = createClient();
    
    const pData = playerMetrics[selectedPlayerId] || {};
    const relevantMetrics = metrics.filter(m => activeModule === 'rapida' ? (m.name.includes('RPE') || m.name.includes('Minutos')) : m.module_type === activeModule);
    
    let hasError = false;

    for (const metric of relevantMetrics) {
      const rawVal = pData[metric.id];
      if (rawVal === undefined || rawVal === '') continue; // Skip empty
      
      const payload = {
        event_id: eventId,
        player_id: selectedPlayerId,
        metric_id: metric.id,
        value_number: metric.type === 'number' ? parseFloat(rawVal as string) : null,
        value_text: metric.type === 'text' ? rawVal : null
      };

      const { data: existing } = await supabase
        .from('player_training_metrics')
        .select('id')
        .eq('event_id', eventId)
        .eq('player_id', selectedPlayerId)
        .eq('metric_id', metric.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase.from('player_training_metrics').update(payload).eq('id', existing.id);
        if (error) hasError = true;
      } else {
        const { error } = await supabase.from('player_training_metrics').insert(payload);
        if (error) hasError = true;
      }
    }

    setSavingPlayer(null);
    if (hasError) {
      toast.error("Hubo un error al guardar algunos datos.");
    } else {
      toast.success("Evaluación guardada correctamente");
    }
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

        // If RPE was entered, also save the minutes (defaulting to 90 if untouched)
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <p className="text-gray-500 font-medium">Cargando sesión de entrenamiento...</p>
      </div>
    );
  }

  const selectedPlayer = players.find(p => p.id === selectedPlayerId);
  
  // Group metrics by category for the active module
  const activeMetrics = metrics.filter(m => m.module_type === activeModule);
  const categories = Array.from(new Set(activeMetrics.map(m => m.category || 'General')));

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
            {eventDetails?.date} • Selecciona un módulo y un jugador para registrar sus datos.
          </p>
        </div>

        {/* MODULE SELECTOR */}
        <div className="w-full md:w-auto">
        {/* TABS (Desktop) */}
        <div className="hidden sm:flex gap-2 pb-2 border-b border-gray-100">
          <button 
            onClick={() => setActiveModule('rendimiento')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${
              activeModule === 'rendimiento' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Dumbbell size={18} />
            Rendimiento
          </button>
          <button 
            onClick={() => setActiveModule('formativo')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${
              activeModule === 'formativo' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <BrainCircuit size={18} />
            Formativo
          </button>
          <button 
            onClick={() => setActiveModule('rapida')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${
              activeModule === 'rapida' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Zap size={18} />
            Carga Rápida (RPE)
          </button>
        </div>

        {/* TABS (Mobile Dropdown) */}
        <div className="sm:hidden mb-2">
          <select
             value={activeModule}
             onChange={(e) => setActiveModule(e.target.value as any)}
             className="w-full bg-white border border-gray-200 text-gray-700 font-bold text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none shadow-sm cursor-pointer"
             style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%236B7280\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.25rem' }}
          >
             <option value="rendimiento">💪 Rendimiento</option>
             <option value="formativo">🧠 Formativo</option>
             <option value="rapida">⚡ Carga Rápida (RPE)</option>
          </select>
        </div>   </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: PLAYER LIST (Hidden in rapida mode) */}
        {activeModule !== 'rapida' && (
        <div className="md:col-span-4 lg:col-span-3 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
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
        <div className={activeModule === 'rapida' ? "md:col-span-12" : "md:col-span-8 lg:col-span-9"}>
          {activeModule === 'rapida' ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Carga Rápida (Tabla de RPE)
                  </h2>
                  <p className="text-gray-500 text-sm">
                    Introduce el RPE y Minutos de todos los jugadores de golpe.
                  </p>
                </div>
                <button 
                  onClick={saveAllQuickMetrics}
                  disabled={savingPlayer === 'all'}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-70 shadow-md shadow-purple-200"
                >
                  {savingPlayer === 'all' ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  Guardar Todos
                </button>
              </div>
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                      <th className="p-4 font-bold">Jugador</th>
                      <th className="p-4 font-bold w-48">RPE (1-10)</th>
                      <th className="p-4 font-bold w-48">Minutos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {players.map(player => {
                      const rpeMetricId = metrics.find(m => m.name.toLowerCase().includes('rpe'))?.id;
                      const minMetricId = metrics.find(m => m.name.toLowerCase().includes('minutos'))?.id;
                      return (
                        <tr key={player.id} className="hover:bg-gray-50/50">
                          <td className="p-4 font-semibold text-gray-900 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                              {player.dorsal || '-'}
                            </div>
                            {player.first_name} {player.last_name}
                          </td>
                          <td className="p-4">
                            <input
                              type="number"
                              min="1" max="10"
                              value={rpeMetricId ? (playerMetrics[player.id]?.[rpeMetricId] || '') : ''}
                              onChange={(e) => {
                                if (rpeMetricId) {
                                  setPlayerMetrics(prev => ({ ...prev, [player.id]: { ...(prev[player.id] || {}), [rpeMetricId]: e.target.value } }));
                                }
                              }}
                              className="w-full max-w-[120px] border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-purple-500 outline-none font-bold"
                              placeholder="Ej: 7"
                            />
                          </td>
                          <td className="p-4">
                            <input
                              type="number"
                              min="0" max="300"
                              value={minMetricId ? (playerMetrics[player.id]?.[minMetricId] !== undefined ? playerMetrics[player.id][minMetricId] : 90) : 90}
                              onChange={(e) => {
                                if (minMetricId) {
                                  setPlayerMetrics(prev => ({ ...prev, [player.id]: { ...(prev[player.id] || {}), [minMetricId]: e.target.value } }));
                                }
                              }}
                              className="w-full max-w-[120px] border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-purple-500 outline-none font-bold"
                              placeholder="Ej: 90"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : selectedPlayer ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Evaluación: {selectedPlayer.first_name} {selectedPlayer.last_name}
                  </h2>
                  <p className="text-gray-500 text-sm">
                    {activeModule === 'rendimiento' ? 'Módulo de Rendimiento y Carga Física' : 'Módulo Formativo y Psicológico'}
                  </p>
                </div>
                <button 
                  onClick={saveSelectedPlayerMetrics}
                  disabled={savingPlayer === selectedPlayer.id}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-70"
                >
                  {savingPlayer === selectedPlayer.id ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  Guardar Datos
                </button>
              </div>

              <div className="p-6 bg-gray-50/30 space-y-8">
                {categories.length === 0 ? (
                  <div className="text-center p-8 text-gray-500">
                    No hay métricas configuradas para el módulo {activeModule}.
                  </div>
                ) : (
                  categories.map(category => (
                    <div key={category} className="space-y-4">
                      <h3 className="text-lg font-bold text-slate-800 border-b border-gray-200 pb-2">
                        {category}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                        {activeMetrics.filter(m => (m.category || 'General') === category).map(metric => {
                          const val = playerMetrics[selectedPlayer.id]?.[metric.id] || '';
                          
                          return (
                            <div key={metric.id} className="flex flex-col gap-1.5">
                              <label className="text-sm font-bold text-gray-700">
                                {metric.name} {metric.unit ? <span className="text-gray-400 font-normal">({metric.unit})</span> : ''}
                              </label>
                              
                              {/* DROPDOWN SELECT */}
                              {metric.options && metric.options.length > 0 ? (
                                <select
                                  value={val}
                                  onChange={(e) => handleMetricChange(metric.id, e.target.value, metric.type)}
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 font-medium"
                                >
                                  <option value="">Seleccionar...</option>
                                  {metric.options.map((opt, i) => (
                                    <option key={i} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              ) : (
                                /* REGULAR INPUT */
                                <input
                                  type={metric.type === 'number' ? 'number' : 'text'}
                                  value={val}
                                  onChange={(e) => handleMetricChange(metric.id, e.target.value, metric.type)}
                                  placeholder={metric.type === 'number' ? '0.00' : 'Escribe aquí...'}
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 font-medium"
                                  step={metric.type === 'number' ? 'any' : undefined}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-dashed border-gray-300 p-12 text-center text-gray-500">
              {players.length === 0 ? "No hay jugadores marcados como 'Presente' en la asistencia de este entrenamiento. Pasa lista primero en la pestaña 'Asistencia'." : "Selecciona un jugador de la lista para comenzar la evaluación."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
