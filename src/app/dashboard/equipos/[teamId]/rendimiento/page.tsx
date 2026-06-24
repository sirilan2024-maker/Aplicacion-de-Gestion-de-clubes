"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Activity, Calendar, Clock, TrendingUp, User as UserIcon, Target, Crosshair, BarChart2, X } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";

interface TrainingStats {
  id: string;
  first_name: string;
  last_name: string;
  dorsal: number | null;
  avatar_url: string | null;
  acuteLoad: number;
  chronicLoad: number;
  acwr: number;
  trainingMinutes: number;
  totalTrainings: number;
  trainingsAttended: number;
  trainingAttendancePct: number;
}

interface MatchStats {
  id: string;
  first_name: string;
  last_name: string;
  dorsal: number | null;
  avatar_url: string | null;
  matchMinutes: number;
  totalMatches: number;
  matchesAttended: number;
  matchAttendancePct: number;
  goals: number | null;
  assists: number | null;
  technicalRating: number | null;
}

export default function RendimientoGlobalPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = typeof params.teamId === 'string' ? params.teamId : '';

  const [trainingStats, setTrainingStats] = useState<TrainingStats[]>([]);
  const [matchStats, setMatchStats] = useState<MatchStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'entrenamientos' | 'partidos'>('entrenamientos');
  const [drawerPlayerId, setDrawerPlayerId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<'entrenamientos' | 'partidos'>('entrenamientos');

  useEffect(() => {
    if (teamId) {
      fetchGlobalData();
    }
  }, [teamId]);

  const fetchGlobalData = async () => {
    setLoading(true);
    const supabase = createClient();

    try {
      // 1. Fetch team and metrics
      const { data: teamData } = await supabase.from('teams').select('club_id').eq('id', teamId).single();
      if (!teamData) return;
      
      const { data: metrics } = await supabase.from('club_metrics').select('id, name').eq('club_id', teamData.club_id);

      // 2. Fetch all players
      const { data: allPlayers } = await supabase.from('players').select('id, first_name, last_name, dorsal, avatar_url, accumulated_minutes, technical_rating, posicion').eq('team_id', teamId);
      if (!allPlayers) return;

      const players = allPlayers.filter(p => {
        const pos = p.posicion?.toLowerCase() || '';
        return !pos.includes('entrenador') && !pos.includes('delegado') && !pos.includes('técnico');
      });

      // 3. Fetch all events and separate them
      const { data: allEvents } = await supabase.from('team_events').select('id, date, event_type').eq('team_id', teamId);
      const trainings = allEvents?.filter(e => e.event_type === 'Entrenamiento') || [];
      const matches = allEvents?.filter(e => e.event_type === 'Partido') || [];
      const eventIds = allEvents?.map(e => e.id) || [];

      // 4. Fetch Attendance
      let attendanceData: any[] = [];
      if (eventIds.length > 0) {
        const { data: att } = await supabase.from('attendance').select('player_id, event_id, status').in('event_id', eventIds);
        if (att) attendanceData = att;
      }

      // 5. Fetch RPE/Minutos via API to bypass RLS
      let ptData: any[] = [];
      if (eventIds.length > 0) {
        try {
          const res = await fetch('/api/player-metrics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventIds })
          });
          const json = await res.json();
          ptData = json.data || [];
        } catch (err) {
          console.error("Error fetching global team metrics:", err);
        }
      }

      const today = new Date();
      const tResults: TrainingStats[] = [];
      const mResults: MatchStats[] = [];

      for (const p of players) {
        // --- TRAINING STATS ---
        const playerAtt = attendanceData.filter(a => a.player_id === p.id);
        const tAtt = playerAtt.filter(a => trainings.find(t => t.id === a.event_id));
        const tPresents = tAtt.filter(a => a.status.toLowerCase() === 'presente' || a.status.toLowerCase() === 'present').length;
        const totalTrainings = trainings.length;
        const tPct = totalTrainings > 0 ? Math.round((tPresents / totalTrainings) * 100) : 0;

        let totalTMin = 0;
        const dailyLoads: Record<string, number> = {};
        
        trainings.forEach(ev => {
          const rpe = ptData.find(m => m.event_id === ev.id && m.player_id === p.id && m.club_metrics?.name?.toLowerCase().includes('rpe'))?.value_number;
          const min = ptData.find(m => m.event_id === ev.id && m.player_id === p.id && m.club_metrics?.name?.toLowerCase().includes('minutos'))?.value_number;
          if (min) totalTMin += min;
          if (rpe !== undefined && min !== undefined && rpe !== null && min !== null) {
            dailyLoads[ev.date] = (dailyLoads[ev.date] || 0) + (rpe * min);
          }
        });

        // Determine the reference date for ACWR (latest training date)
        const dates = Object.keys(dailyLoads).map(d => parseISO(d).getTime());
        const referenceDate = dates.length > 0 ? new Date(Math.max(...dates)) : new Date();

        let acuteSum = 0; let acuteDays = 0;
        let chronicSum = 0; let chronicDays = 0;

        Object.entries(dailyLoads).forEach(([dateStr, load]) => {
          const diff = Math.abs(differenceInDays(referenceDate, parseISO(dateStr)));
          if (diff <= 7) { acuteSum += load; acuteDays++; }
          if (diff <= 28) { chronicSum += load; chronicDays++; }
        });

        const acuteLoad = acuteDays > 0 ? acuteSum / 7 : 0;
        const chronicLoad = chronicDays > 0 ? chronicSum / 28 : 0;
        const acwr = chronicLoad > 0 ? acuteLoad / chronicLoad : 0;

        tResults.push({
          id: p.id,
          first_name: p.first_name,
          last_name: p.last_name,
          dorsal: p.dorsal,
          avatar_url: p.avatar_url,
          acuteLoad,
          chronicLoad,
          acwr,
          trainingMinutes: totalTMin,
          totalTrainings,
          trainingsAttended: tPresents,
          trainingAttendancePct: tPct
        });

        // --- MATCH STATS ---
        const mAtt = playerAtt.filter(a => matches.find(m => m.id === a.event_id));
        const mPresents = mAtt.filter(a => a.status.toLowerCase() === 'presente' || a.status.toLowerCase() === 'present').length;
        const totalMatches = matches.length;
        const mPct = totalMatches > 0 ? Math.round((mPresents / totalMatches) * 100) : 0;

        let totalGoals = 0;
        let totalAssists = 0;
        matches.forEach(ev => {
          const gol = ptData.find(m => m.event_id === ev.id && m.player_id === p.id && m.club_metrics?.name?.toLowerCase() === 'goles')?.value_number;
          const ast = ptData.find(m => m.event_id === ev.id && m.player_id === p.id && m.club_metrics?.name?.toLowerCase() === 'asistencias')?.value_number;
          if (gol) totalGoals += gol;
          if (ast) totalAssists += ast;
        });

        mResults.push({
          id: p.id,
          first_name: p.first_name,
          last_name: p.last_name,
          dorsal: p.dorsal,
          avatar_url: p.avatar_url,
          matchMinutes: p.accumulated_minutes || 0,
          totalMatches,
          matchesAttended: mPresents,
          matchAttendancePct: mPct,
          goals: totalGoals,
          assists: totalAssists,
          technicalRating: p.technical_rating || null
        });
      }

      setTrainingStats(tResults.sort((a, b) => b.acwr - a.acwr));
      setMatchStats(mResults.sort((a, b) => b.matchMinutes - a.matchMinutes));
    } catch (err) {
      console.error("Error fetching global stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const getACWRStatus = (acwr: number) => {
    if (acwr === 0) return { text: "Sin Datos", color: "bg-slate-100 text-slate-700 border-slate-200" };
    if (acwr >= 0.8 && acwr <= 1.3) return { text: "Óptimo", color: "bg-green-100 text-green-700 border-green-200" };
    if (acwr > 1.3 && acwr <= 1.5) return { text: "Precaución", color: "bg-yellow-100 text-yellow-700 border-yellow-200" };
    if (acwr > 1.5) return { text: "Peligro", color: "bg-red-100 text-red-700 border-red-200" };
    return { text: "Bajo", color: "bg-slate-100 text-slate-700 border-slate-200" };
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Analizando rendimiento global de la plantilla...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-gray-200 pb-6">
        <div>
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Activity className="text-blue-500" />
            Centro de Rendimiento Global
          </h2>
          <p className="text-gray-500 text-sm mt-1">Análisis detallado de sesiones preparatorias y competición oficial.</p>
        </div>

        {/* Toggle Switch Píldora */}
        <div className="flex bg-gray-100 p-1 rounded-full border border-gray-200 shadow-inner">
          <button
            onClick={() => setViewMode('entrenamientos')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold transition-all ${
              viewMode === 'entrenamientos' 
                ? 'bg-white text-emerald-700 shadow-sm border border-gray-200/50' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <TrendingUp size={16} className={viewMode === 'entrenamientos' ? 'text-emerald-500' : 'text-gray-400'} />
            Entrenamientos
          </button>
          <button
            onClick={() => setViewMode('partidos')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold transition-all ${
              viewMode === 'partidos' 
                ? 'bg-white text-indigo-700 shadow-sm border border-gray-200/50' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Target size={16} className={viewMode === 'partidos' ? 'text-indigo-500' : 'text-gray-400'} />
            Partidos
          </button>
        </div>
      </div>

      {/* BLOQUE ENTRENAMIENTOS */}
      {viewMode === 'entrenamientos' && (
      <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="mb-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100">
            <TrendingUp className="text-emerald-600" size={20} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Rendimiento en Entrenamientos</h3>
            <p className="text-sm text-gray-500">Estado físico (ACWR), asistencia a sesiones y carga de trabajo.</p>
          </div>
        </div>

        {/* Global Team Performance Banner */}
        <TeamPerformanceBanner trainingStats={trainingStats} />

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {trainingStats.map(player => {
            const acwrStatus = getACWRStatus(player.acwr);
            return (
              <button
                key={`tr-${player.id}`}
                onClick={() => { setDrawerPlayerId(player.id); setDrawerTab('entrenamientos'); }}
                className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-emerald-300 hover:shadow-md transition-all text-left flex flex-col h-full group cursor-pointer"
              >
                <div className="flex items-center gap-3 mb-4">
                  {player.avatar_url ? (
                    <img src={player.avatar_url} alt={player.first_name} className="w-12 h-12 rounded-full object-cover border border-gray-200" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-600 flex items-center justify-center font-bold text-lg border border-slate-200">
                      {player.first_name.charAt(0)}{player.last_name.charAt(0)}
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <h3 className="font-bold text-gray-900 truncate group-hover:text-emerald-600 transition-colors">
                      {player.first_name} {player.last_name}
                    </h3>
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <UserIcon size={12} /> Dorsal {player.dorsal || '-'}
                    </div>
                  </div>
                </div>

                <div className="flex-1 space-y-3">
                  <div className={`flex items-center justify-between p-3 rounded-xl border ${acwrStatus.color}`}>
                    <div className="flex items-center gap-2">
                      <Activity size={16} />
                      <span className="text-xs font-bold uppercase">ACWR</span>
                    </div>
                    <div className="font-black">
                      {player.acwr > 0 ? player.acwr.toFixed(2) : '-'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-1 mb-1">
                        <Calendar size={14} className="text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Asist.</span>
                      </div>
                      <span className="font-black text-slate-900">{player.trainingAttendancePct}%</span>
                    </div>
                    
                    <div className="flex flex-col p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-1 mb-1">
                        <Clock size={14} className="text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Mins.</span>
                      </div>
                      <span className="font-black text-slate-900">{player.trainingMinutes}</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>
      )}

      {/* BLOQUE PARTIDOS */}
      {viewMode === 'partidos' && (
      <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="mb-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100">
            <Target className="text-indigo-600" size={20} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Rendimiento en Partidos</h3>
            <p className="text-sm text-gray-500">Convocatorias, minutos oficiales y estadísticas de juego directo.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {matchStats.map(player => {
            return (
              <button
                key={`mt-${player.id}`}
                onClick={() => { setDrawerPlayerId(player.id); setDrawerTab('partidos'); }}
                className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-indigo-300 hover:shadow-md transition-all text-left flex flex-col h-full group cursor-pointer"
              >
                <div className="flex items-center gap-3 mb-4">
                  {player.avatar_url ? (
                    <img src={player.avatar_url} alt={player.first_name} className="w-12 h-12 rounded-full object-cover border border-gray-200" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-600 flex items-center justify-center font-bold text-lg border border-slate-200">
                      {player.first_name.charAt(0)}{player.last_name.charAt(0)}
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <h3 className="font-bold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                      {player.first_name} {player.last_name}
                    </h3>
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <UserIcon size={12} /> Dorsal {player.dorsal || '-'}
                    </div>
                  </div>
                </div>

                <div className="flex-1 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col p-3 rounded-xl bg-indigo-50/50 border border-indigo-100">
                      <div className="flex items-center gap-1 mb-1">
                        <Clock size={14} className="text-indigo-500" />
                        <span className="text-[10px] font-bold text-indigo-700 uppercase">Minutos</span>
                      </div>
                      <span className="font-black text-indigo-900">{player.matchMinutes}</span>
                    </div>
                    
                    <div className="flex flex-col p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-1 mb-1">
                        <Calendar size={14} className="text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Convocat.</span>
                      </div>
                      <span className="font-black text-slate-900">{player.matchAttendancePct}%</span>
                    </div>
                  </div>

                  {/* Bloque Estadísticas de Directo (Futuro) */}
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <Target size={12} className="text-amber-500" />
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Goles</span>
                      </div>
                      <span className="font-bold text-sm text-gray-900">{player.goals ?? '-'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <Crosshair size={12} className="text-blue-500" />
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Asist.</span>
                      </div>
                      <span className="font-bold text-sm text-gray-900">{player.assists ?? '-'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <BarChart2 size={12} className="text-purple-500" />
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Valoración</span>
                      </div>
                      <span className="font-bold text-sm text-gray-900">{player.technicalRating ? `${player.technicalRating}/10` : '-'}</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>
      )}

      {/* DRAWER */}
      {drawerPlayerId && (
        <PlayerPerformanceDrawer 
          playerId={drawerPlayerId} 
          teamId={teamId}
          initialTab={drawerTab}
          onClose={() => setDrawerPlayerId(null)} 
          globalTrainingStats={trainingStats.find(p => p.id === drawerPlayerId)}
          globalMatchStats={matchStats.find(p => p.id === drawerPlayerId)}
        />
      )}
    </div>
  );
}

function PlayerPerformanceDrawer({ playerId, teamId, initialTab, onClose, globalTrainingStats, globalMatchStats }: any) {
  const [activeTab, setActiveTab] = useState<'entrenamientos' | 'partidos'>(initialTab);
  const [events, setEvents] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const supabase = createClient();
      
      const { data: allEvents } = await supabase.from('team_events').select('id, date, event_type, title').eq('team_id', teamId).order('date', { ascending: false });
      if (allEvents) setEvents(allEvents);

      try {
        const res = await fetch('/api/player-metrics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId, eventIds: allEvents?.map(e => e.id) || [] })
        });
        const json = await res.json();
        setMetrics(json.data || []);
      } catch (err) {
        console.error("Error fetching drawer metrics:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [playerId, teamId]);

  const pName = globalTrainingStats?.first_name ? `${globalTrainingStats.first_name} ${globalTrainingStats.last_name}` : 'Cargando...';

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity" onClick={onClose}></div>
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 animate-in slide-in-from-right overflow-hidden border-l border-slate-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-full border border-slate-200 shadow-sm flex items-center justify-center">
              <UserIcon className="text-slate-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">{pName}</h2>
              <div className="text-xs font-bold text-slate-500 uppercase">Dorsal {globalTrainingStats?.dorsal || '-'}</div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white border border-slate-200 rounded-full text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors shadow-sm">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          <button onClick={() => setActiveTab('entrenamientos')} className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'entrenamientos' ? 'border-emerald-500 text-emerald-700 bg-emerald-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>
            Entrenamientos
          </button>
          <button onClick={() => setActiveTab('partidos')} className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'partidos' ? 'border-indigo-500 text-indigo-700 bg-indigo-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>
            Partidos
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          {activeTab === 'entrenamientos' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                  <div className="text-2xl font-black text-slate-900">{globalTrainingStats?.acwr > 0 ? globalTrainingStats.acwr.toFixed(2) : '-'}</div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Ratio ACWR</div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                  <div className="text-2xl font-black text-slate-900">{globalTrainingStats?.trainingMinutes || 0}</div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Mins Totales</div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-800 text-sm mb-3">Historial por Días</h3>
                {loading ? <div className="text-center py-8"><Loader2 className="animate-spin mx-auto text-emerald-500" /></div> : (
                  <div className="space-y-3">
                    {events.filter(e => e.event_type === 'Entrenamiento').map(ev => {
                      const m = metrics.filter(mx => mx.event_id === ev.id);
                      const rpe = m.find(x => x.club_metrics?.name?.toLowerCase().includes('rpe'))?.value_number;
                      const min = m.find(x => x.club_metrics?.name?.toLowerCase().includes('minutos'))?.value_number;
                      if (rpe === undefined && min === undefined) return null;
                      return (
                        <div key={ev.id} className="p-3 border border-slate-100 rounded-xl bg-white shadow-sm flex items-center justify-between">
                          <div>
                            <div className="text-sm font-bold text-slate-700">{new Date(ev.date).toLocaleDateString()}</div>
                            <div className="text-xs text-slate-400">{ev.title}</div>
                          </div>
                          <div className="flex gap-4 text-center">
                            <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase">Min</div>
                              <div className="text-sm font-black text-slate-700">{min ?? '-'}</div>
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase">RPE</div>
                              <div className="text-sm font-black text-slate-700">{rpe ?? '-'}</div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'partidos' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                  <div className="text-2xl font-black text-slate-900">{globalMatchStats?.goals ?? '-'}</div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Goles</div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                  <div className="text-2xl font-black text-slate-900">{globalMatchStats?.assists ?? '-'}</div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Asistencias</div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-800 text-sm mb-3">Historial de Partidos</h3>
                {loading ? <div className="text-center py-8"><Loader2 className="animate-spin mx-auto text-indigo-500" /></div> : (
                  <div className="space-y-3">
                    {events.filter(e => e.event_type === 'Partido').map(ev => {
                      const m = metrics.filter(mx => mx.event_id === ev.id);
                      const min = m.find(x => x.club_metrics?.name?.toLowerCase().includes('minutos'))?.value_number;
                      const gol = m.find(x => x.club_metrics?.name?.toLowerCase() === 'goles')?.value_number;
                      const ast = m.find(x => x.club_metrics?.name?.toLowerCase() === 'asistencias')?.value_number;
                      if (min === undefined && gol === undefined && ast === undefined) return null;
                      return (
                        <div key={ev.id} className="p-3 border border-slate-100 rounded-xl bg-white shadow-sm flex items-center justify-between">
                          <div>
                            <div className="text-sm font-bold text-slate-700">{new Date(ev.date).toLocaleDateString()}</div>
                            <div className="text-xs text-slate-400">{ev.title}</div>
                          </div>
                          <div className="flex gap-3 text-center">
                            <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase">Min</div>
                              <div className="text-sm font-black text-indigo-700">{min ?? '-'}</div>
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase">Gol</div>
                              <div className="text-sm font-black text-slate-700">{gol ?? '-'}</div>
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase">Ast</div>
                              <div className="text-sm font-black text-slate-700">{ast ?? '-'}</div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
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

function TeamPerformanceBanner({ trainingStats }: { trainingStats: TrainingStats[] }) {
  const validAcwrPlayers = trainingStats.filter(p => p.acwr > 0);
  
  if (validAcwrPlayers.length === 0) return null;

  const teamTotalAcute = validAcwrPlayers.reduce((sum, p) => sum + p.acuteLoad, 0);
  const teamTotalChronic = validAcwrPlayers.reduce((sum, p) => sum + p.chronicLoad, 0);
  
  const teamAcwr = teamTotalChronic > 0 ? teamTotalAcute / teamTotalChronic : 0;
  
  const optimalCount = validAcwrPlayers.filter(p => p.acwr >= 0.8 && p.acwr <= 1.3).length;
  const underCount = validAcwrPlayers.filter(p => p.acwr < 0.8).length;
  const riskCount = validAcwrPlayers.filter(p => p.acwr > 1.3 && p.acwr <= 1.5).length;
  const dangerCount = validAcwrPlayers.filter(p => p.acwr > 1.5).length;

  let globalStatusText = "Óptimo";
  let globalStatusColor = "text-emerald-600";
  let globalStatusBg = "bg-emerald-50";
  let globalStatusBorder = "border-emerald-200";

  if (teamAcwr < 0.8) {
    globalStatusText = "Bajo Entrenado";
    globalStatusColor = "text-slate-600";
    globalStatusBg = "bg-slate-50";
    globalStatusBorder = "border-slate-200";
  } else if (teamAcwr > 1.5) {
    globalStatusText = "Peligro";
    globalStatusColor = "text-red-600";
    globalStatusBg = "bg-red-50";
    globalStatusBorder = "border-red-200";
  } else if (teamAcwr > 1.3) {
    globalStatusText = "Precaución";
    globalStatusColor = "text-yellow-600";
    globalStatusBg = "bg-yellow-50";
    globalStatusBorder = "border-yellow-200";
  }

  return (
    <div className={`mb-8 p-6 rounded-2xl border ${globalStatusBorder} ${globalStatusBg} flex flex-col md:flex-row items-center gap-6 shadow-sm`}>
      {/* Left side: Global Number */}
      <div className="flex flex-col items-center justify-center bg-white p-5 rounded-xl border border-white/50 shadow-sm min-w-[160px] text-center">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Media Global ACWR</span>
        <span className={`text-4xl font-black ${globalStatusColor}`}>{teamAcwr.toFixed(2)}</span>
        <span className={`text-xs font-bold uppercase mt-1 px-3 py-1 rounded-full ${globalStatusColor} bg-white border ${globalStatusBorder}`}>{globalStatusText}</span>
      </div>

      {/* Right side: Breakdown */}
      <div className="flex-1 w-full">
        <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide border-b border-gray-200/50 pb-2">Desglose de la Plantilla ({validAcwrPlayers.length} Jugadores)</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="flex flex-col bg-white/60 rounded-lg p-3 border border-white">
            <span className="text-xl font-black text-slate-700">{underCount}</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase leading-tight">Bajo Entrenado<br/>(&lt;0.8)</span>
          </div>
          <div className="flex flex-col bg-white/60 rounded-lg p-3 border border-white">
            <span className="text-xl font-black text-emerald-600">{optimalCount}</span>
            <span className="text-[10px] font-bold text-emerald-700 uppercase leading-tight">Óptimo<br/>(0.8 - 1.3)</span>
          </div>
          <div className="flex flex-col bg-white/60 rounded-lg p-3 border border-white">
            <span className="text-xl font-black text-yellow-600">{riskCount}</span>
            <span className="text-[10px] font-bold text-yellow-700 uppercase leading-tight">Precaución<br/>(1.3 - 1.5)</span>
          </div>
          <div className="flex flex-col bg-white/60 rounded-lg p-3 border border-white">
            <span className="text-xl font-black text-red-600">{dangerCount}</span>
            <span className="text-[10px] font-bold text-red-700 uppercase leading-tight">Peligro<br/>(&gt;1.5)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
