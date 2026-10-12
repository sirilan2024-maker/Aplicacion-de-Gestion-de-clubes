"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, User as UserIcon, X, Calendar, Activity, Clock, Flame, CheckCircle2, AlertCircle, TrendingUp, Target } from "lucide-react";

import { PlayerProgressView } from "@/components/features/formative/PlayerProgressView";
import { isFormativeCategory } from "@/lib/utils";

export interface PlayerPerformanceDrawerProps {
  playerId: string;
  teamId: string;
  initialTab?: 'entrenamientos' | 'partidos' | 'formativo';
  onClose: () => void;
  globalTrainingStats?: any;
  globalMatchStats?: any;
  onlyFormative?: boolean;
}

export function PlayerPerformanceDrawer({ 
  playerId, 
  teamId, 
  initialTab, 
  onClose, 
  globalTrainingStats, 
  globalMatchStats,
  onlyFormative = false
}: PlayerPerformanceDrawerProps) {
  const [activeTab, setActiveTab] = useState<'entrenamientos' | 'partidos' | 'formativo'>(
    onlyFormative ? 'formativo' : (initialTab || 'entrenamientos')
  );
  const [events, setEvents] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, { status: string; notes?: string }>>({});
  const [teamCategory, setTeamCategory] = useState<string>('');
  const [teamName, setTeamName] = useState<string>('');
  const [playerInfo, setPlayerInfo] = useState<any>(null);
  const [officialMatches, setOfficialMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!playerId) return;
    const fetchData = async () => {
      setLoading(true);
      const supabase = createClient();
      
      if (teamId) {
        const { data: tData } = await supabase.from('teams').select('category, name, club_id').eq('id', teamId).single();
        if (tData) {
          setTeamCategory(tData.category || '');
          setTeamName(tData.name || '');
        }

        if (!onlyFormative) {
          // 1. Obtener temporada activa de forma dinámica
          let activeSeasonId: string | null = null;
          if (tData?.club_id) {
            const { data: seasonData } = await supabase
              .from('seasons')
              .select('id')
              .eq('club_id', tData.club_id)
              .eq('is_active', true)
              .single();
            if (seasonData) activeSeasonId = seasonData.id;
          }

          // 2. Eventos del equipo (entrenamientos)
          const { data: allEvents } = await supabase
            .from('team_events')
            .select('id, date, event_type, title')
            .eq('team_id', teamId)
            .order('date', { ascending: false });
          if (allEvents) setEvents(allEvents);

          const eventIds = (allEvents || []).map(e => e.id);

          // 3. Asistencia del jugador a los eventos del equipo
          if (eventIds.length > 0) {
            const { data: attData } = await supabase
              .from('attendance')
              .select('event_id, status, notes')
              .eq('player_id', playerId)
              .in('event_id', eventIds);

            if (attData) {
              const attObj: Record<string, { status: string; notes?: string }> = {};
              attData.forEach(a => {
                attObj[a.event_id] = { status: a.status, notes: a.notes || undefined };
              });
              setAttendanceMap(attObj);
            }
          }

          // 4. Convocatorias de partidos oficiales filtradas por temporada activa
          let convsQuery = supabase
            .from('convocatorias')
            .select(`
              id, partido_id, minutos_jugados, minutes_played, goles, goals, asistencias, assists, tarjetas_amarillas, yellow_cards, tarjetas_rojas, red_cards, status, titular,
              partidos!inner(id, rival_nombre, fecha_hora, estado, resultado_propio, resultado_rival, equipo_id, season_id)
            `)
            .eq('player_id', playerId)
            .eq('partidos.equipo_id', teamId);

          if (activeSeasonId) {
            convsQuery = convsQuery.eq('partidos.season_id', activeSeasonId);
          } else {
            // Guardia de aislamiento: excluir temporada 25/26 archivada
            convsQuery = convsQuery.neq('partidos.season_id', '584f508a-fc1a-4339-b5b2-4296ffde2f4c');
          }

          const { data: officialConvs } = await convsQuery.order('created_at', { ascending: false });

          if (officialConvs) {
            const sortedConvs = [...officialConvs].sort((a, b) => {
              const timeA = new Date(a.partidos?.fecha_hora || 0).getTime();
              const timeB = new Date(b.partidos?.fecha_hora || 0).getTime();
              return timeA - timeB;
            });
            setOfficialMatches(sortedConvs);
          }

          // 5. Métricas de entrenamiento vía API autorizada
          if (eventIds.length > 0) {
            try {
              const res = await fetch('/api/player-metrics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerId, eventIds })
              });
              const json = await res.json();
              setMetrics(json.data || []);
            } catch (err) {
              console.error("Error fetching drawer metrics:", err);
            }
          }
        }
      }

      // 6. Información del jugador si no viene precargada
      if (!globalTrainingStats && !globalMatchStats) {
        const { data: pData } = await supabase
          .from('players')
          .select('first_name, last_name, avatar_url, dorsal, posicion')
          .eq('id', playerId)
          .single();
        if (pData) {
          setPlayerInfo(pData);
        }
      }

      setLoading(false);
    };
    fetchData();
  }, [playerId, teamId, onlyFormative]);

  const isFormative = isFormativeCategory(teamCategory, teamName);
  const effectivePlayer = globalTrainingStats || globalMatchStats || playerInfo;
  const pName = effectivePlayer?.first_name ? `${effectivePlayer.first_name} ${effectivePlayer.last_name || ''}`.trim() : 'Ficha del Jugador';
  const avatarUrl = effectivePlayer?.avatar_url;
  const dorsal = effectivePlayer?.dorsal;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 transition-opacity" onClick={onClose}></div>
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 animate-in slide-in-from-right overflow-hidden border-l border-slate-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 sm:w-12 sm:h-12 bg-white rounded-full border border-slate-200 shadow-xs flex items-center justify-center overflow-hidden shrink-0 font-bold text-sm text-slate-700">
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt={pName} 
                  className="w-full h-full object-cover object-[center_25%]" 
                />
              ) : (
                <span>{dorsal || pName.charAt(0)}</span>
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-slate-900 truncate leading-tight">{pName}</h2>
              <div className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase mt-0.5 flex items-center gap-2">
                <span>{dorsal ? `Dorsal #${dorsal}` : 'Sin dorsal'}</span>
                {teamName && <span className="text-slate-400 font-semibold">• {teamName}</span>}
              </div>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 bg-white border border-slate-200 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors shadow-xs shrink-0 cursor-pointer"
            aria-label="Cerrar ficha"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        {!onlyFormative && (
          <div className="flex border-b border-slate-100 bg-slate-50/50 shrink-0">
            <button 
              onClick={() => setActiveTab('entrenamientos')} 
              className={`flex-1 py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'entrenamientos' 
                  ? 'border-emerald-500 text-emerald-700 bg-white' 
                  : 'border-transparent text-slate-500 hover:bg-slate-100/50'
              }`}
            >
              <TrendingUp size={15} />
              <span>Entrenamientos</span>
            </button>
            <button 
              onClick={() => setActiveTab('partidos')} 
              className={`flex-1 py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'partidos' 
                  ? 'border-indigo-500 text-indigo-700 bg-white' 
                  : 'border-transparent text-slate-500 hover:bg-slate-100/50'
              }`}
            >
              <Target size={15} />
              <span>Partidos</span>
            </button>
            {isFormative && (
              <button 
                onClick={() => setActiveTab('formativo')} 
                className={`flex-1 py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === 'formativo' 
                    ? 'border-purple-500 text-purple-700 bg-white' 
                    : 'border-transparent text-slate-500 hover:bg-slate-100/50'
                }`}
              >
                <span>🧠 Formativo</span>
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white">
          {(activeTab === 'formativo' || onlyFormative) && (
            <div className="animate-in fade-in duration-200">
              <PlayerProgressView playerId={playerId} playerName={pName} />
            </div>
          )}

          {!onlyFormative && activeTab === 'entrenamientos' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Tarjetas de Métricas Globales del Jugador */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-center">
                  <div className="text-xl sm:text-2xl font-black text-slate-900">
                    {globalTrainingStats?.acwr > 0 ? globalTrainingStats.acwr.toFixed(2) : '-'}
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mt-0.5">ACWR</div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-center">
                  <div className="text-xl sm:text-2xl font-black text-slate-900">
                    {typeof globalTrainingStats?.trainingMinutes === 'number' ? `${globalTrainingStats.trainingMinutes}'` : '-'}
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mt-0.5">Mins Entreno</div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-center">
                  <div className="text-xl sm:text-2xl font-black text-slate-900">
                    {typeof globalTrainingStats?.trainingAttendancePct === 'number' ? `${globalTrainingStats.trainingAttendancePct}%` : '-'}
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mt-0.5">Asistencia</div>
                </div>
              </div>

              {/* Historial Detallado Sesión a Sesión */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-extrabold text-slate-900 text-sm">Historial de Sesiones Registradas</h3>
                  <span className="text-[11px] font-semibold text-slate-400">RPE • Minutos • Carga</span>
                </div>

                {loading ? (
                  <div className="text-center py-10">
                    <Loader2 className="animate-spin mx-auto text-emerald-500 mb-2" size={24} />
                    <span className="text-xs text-slate-400 font-medium">Cargando evolución temporal...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {events.filter(e => e.event_type === 'Entrenamiento').length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        No hay sesiones de entrenamiento programadas para este equipo.
                      </div>
                    ) : (
                      events.filter(e => e.event_type === 'Entrenamiento').map(ev => {
                        const m = metrics.filter(mx => mx.event_id === ev.id);
                        const rpeVal = m.find(x => x.club_metrics?.name?.toLowerCase().includes('rpe'))?.value_number;
                        const minVal = m.find(x => x.club_metrics?.name?.toLowerCase().includes('minutos'))?.value_number;
                        const att = attendanceMap[ev.id];

                        // Si no hay datos registrados de ningún tipo en esta sesión
                        const hasMetrics = (rpeVal !== undefined && rpeVal !== null) || (minVal !== undefined && minVal !== null);
                        const hasAttendanceInfo = att !== undefined;

                        // Carga sRPE = RPE * Minutos confirmados (solo si ambos existen)
                        const load = (typeof rpeVal === 'number' && typeof minVal === 'number') ? (rpeVal * minVal) : null;

                        return (
                          <div 
                            key={ev.id} 
                            className="p-3.5 border border-slate-100 rounded-2xl bg-white shadow-xs hover:border-slate-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-800">
                                {ev.date ? new Date(ev.date).toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: '2-digit' }) : '-'}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate mt-0.5">
                                {ev.title || 'Sesión de entrenamiento'}
                              </div>

                              {/* Estado de Asistencia si está registrado */}
                              {hasAttendanceInfo && (
                                <div className="mt-1 flex items-center gap-1.5 text-[10px]">
                                  <span className={`font-bold px-2 py-0.5 rounded-md ${
                                    att.status?.toLowerCase().includes('present') 
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                      : att.status?.toLowerCase().includes('retraso')
                                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                                  }`}>
                                    {att.status}
                                  </span>
                                  {att.notes && <span className="text-slate-400 italic truncate">({att.notes})</span>}
                                </div>
                              )}
                            </div>

                            {/* Desglose de Métricas Físicas */}
                            <div className="flex items-center gap-3 text-center bg-slate-50/70 p-2 rounded-xl border border-slate-100 self-end sm:self-auto shrink-0">
                              <div className="px-1.5">
                                <span className="block text-[9px] font-bold text-slate-400 uppercase">Min</span>
                                <span className="text-xs font-black text-slate-800">
                                  {typeof minVal === 'number' ? `${minVal}'` : '-'}
                                </span>
                              </div>

                              <div className="px-1.5 border-l border-slate-200/60">
                                <span className="block text-[9px] font-bold text-slate-400 uppercase">RPE</span>
                                <span className="text-xs font-black text-slate-800">
                                  {typeof rpeVal === 'number' ? rpeVal : '-'}
                                </span>
                              </div>

                              <div className="px-1.5 border-l border-slate-200/60">
                                <span className="block text-[9px] font-bold text-slate-400 uppercase">Carga</span>
                                <span className="text-xs font-black text-emerald-700">
                                  {typeof load === 'number' ? load : '-'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Leyenda Informativa de Cargas ACWR */}
              <div className="pt-4 border-t border-slate-100">
                <h4 className="font-extrabold text-slate-700 text-xs mb-2.5 text-center uppercase tracking-wide">
                  Rangos de Referencia ACWR
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="bg-slate-50 border-t-2 border-slate-400 p-2 rounded-b-xl text-center">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Bajo</div>
                    <div className="text-xs font-black text-slate-700">&lt; 0.8</div>
                  </div>
                  <div className="bg-emerald-50 border-t-2 border-emerald-500 p-2 rounded-b-xl text-center">
                    <div className="text-[10px] font-bold text-emerald-700 uppercase">Óptimo</div>
                    <div className="text-xs font-black text-emerald-800">0.8 - 1.3</div>
                  </div>
                  <div className="bg-amber-50 border-t-2 border-amber-500 p-2 rounded-b-xl text-center">
                    <div className="text-[10px] font-bold text-amber-700 uppercase">Precaución</div>
                    <div className="text-xs font-black text-amber-800">1.3 - 1.5</div>
                  </div>
                  <div className="bg-rose-50 border-t-2 border-rose-500 p-2 rounded-b-xl text-center">
                    <div className="text-[10px] font-bold text-rose-700 uppercase">Peligro</div>
                    <div className="text-xs font-black text-rose-800">&gt; 1.5</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'partidos' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Tarjetas de Resumen en Partidos */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <div className="text-xl font-black text-slate-900">
                    {typeof globalMatchStats?.matchMinutes === 'number' ? `${globalMatchStats.matchMinutes}'` : '0\''}
                  </div>
                  <div className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">Minutos</div>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <div className="text-xl font-black text-slate-900">{globalMatchStats?.goals ?? 0}</div>
                  <div className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">Goles</div>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <div className="text-xl font-black text-slate-900">{globalMatchStats?.assists ?? 0}</div>
                  <div className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">Asistencias</div>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <div className="text-sm font-black text-slate-900 mt-1">
                    {globalMatchStats?.yellowCards ?? 0}🟨 {globalMatchStats?.redCards ?? 0}🟥
                  </div>
                  <div className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">Tarjetas</div>
                </div>
              </div>

              {/* Historial Oficial de Actas FFCV */}
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm mb-3">
                  Historial de Actas Oficiales (Temporada Activa)
                </h3>

                {loading ? (
                  <div className="text-center py-10">
                    <Loader2 className="animate-spin mx-auto text-indigo-500 mb-2" size={24} />
                    <span className="text-xs text-slate-400 font-medium">Cargando actas oficiales...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {officialMatches.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        No hay convocatorias registradas en actas oficiales para este jugador en la temporada activa.
                      </div>
                    ) : (
                      officialMatches.map((conv) => {
                        const partido = conv.partidos;
                        const matchDate = partido?.fecha_hora ? new Date(partido.fecha_hora).toLocaleDateString('es-ES') : '-';
                        const mins = conv.minutos_jugados || conv.minutes_played || 0;
                        const gols = conv.goles ?? conv.goals ?? 0;
                        const asts = conv.asistencias ?? conv.assists ?? 0;
                        const yellows = conv.tarjetas_amarillas ?? conv.yellow_cards ?? 0;
                        const reds = conv.tarjetas_rojas ?? conv.red_cards ?? 0;

                        return (
                          <div key={conv.id} className="p-3.5 border border-slate-100 rounded-2xl bg-white shadow-xs flex items-center justify-between">
                            <div className="min-w-0">
                              <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                {partido?.rival_nombre ? `vs ${partido.rival_nombre}` : 'Partido Oficial'}
                              </div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                <span>{matchDate}</span>
                                {conv.titular && (
                                  <span className="text-[9px] font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded border border-indigo-200">
                                    Titular
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex gap-2.5 text-center items-center shrink-0">
                              <div className="bg-indigo-50/70 border border-indigo-100 px-2 py-1 rounded-xl">
                                <span className="block text-[9px] font-bold text-indigo-700 uppercase">Min</span>
                                <span className="text-xs font-black text-indigo-950">{mins}'</span>
                              </div>

                              {gols > 0 && (
                                <div className="bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-xl">
                                  <span className="block text-[9px] font-bold text-emerald-700 uppercase">Gol</span>
                                  <span className="text-xs font-black text-emerald-900">⚽ {gols}</span>
                                </div>
                              )}

                              {asts > 0 && (
                                <div className="bg-blue-50 border border-blue-100 px-2 py-1 rounded-xl">
                                  <span className="block text-[9px] font-bold text-blue-700 uppercase">Ast</span>
                                  <span className="text-xs font-black text-blue-900">{asts}</span>
                                </div>
                              )}

                              {(yellows > 0 || reds > 0) && (
                                <div className="text-xs font-black bg-slate-50 border border-slate-100 px-2 py-1 rounded-xl">
                                  {yellows > 0 && <span className="text-amber-500 mr-1">🟨{yellows}</span>}
                                  {reds > 0 && <span className="text-rose-500">🟥{reds}</span>}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
