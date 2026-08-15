"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Activity, Calendar, Clock, TrendingUp, User as UserIcon, Target, Crosshair, BarChart2, X, BrainCircuit, Sparkles, Flame, Compass, HeartHandshake, CheckCircle2, ChevronRight } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";
import { PlayerPerformanceDrawer } from "@/components/features/performance/PlayerPerformanceDrawer";
import { getTeamFormativeOverview, TeamPlayerFormativeSummary } from "@/app/actions/formative-actions";

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
  const [formativeStats, setFormativeStats] = useState<TeamPlayerFormativeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'entrenamientos' | 'partidos' | 'formativo'>('entrenamientos');
  const [drawerPlayerId, setDrawerPlayerId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<'entrenamientos' | 'partidos' | 'formativo'>('entrenamientos');

  useEffect(() => {
    if (teamId) {
      fetchGlobalData();
    }
  }, [teamId]);

  const fetchGlobalData = async () => {
    setLoading(true);
    const supabase = createClient();

    try {
      // 0. Fetch Formative Team Overview
      const formSummary = await getTeamFormativeOverview(teamId);
      setFormativeStats(formSummary);

      // 1. Fetch team and metrics
      const { data: teamData } = await supabase.from('teams').select('club_id').eq('id', teamId).single();
      if (!teamData) return;
      
      const { data: metrics } = await supabase.from('club_metrics').select('id, name').eq('club_id', teamData.club_id);

      // 2. Fetch Active Season & Players
      const { data: activeSeason } = await supabase.from('seasons').select('id').eq('club_id', teamData.club_id).eq('is_active', true).single();
      
      let allPlayers: any[] = [];
      if (activeSeason?.id) {
        const { data: historyData } = await supabase
          .from('player_season_history')
          .select('player_id, players(id, first_name, last_name, dorsal, avatar_url, accumulated_minutes, technical_rating, posicion)')
          .eq('team_id', teamId)
          .neq('status', 'inactive')
          .or(`season_id.eq.${activeSeason.id},season_id.is.null`);
          
        if (historyData) {
          allPlayers = historyData.map((h: any) => h.players);
        }
      }
      if (!allPlayers.length) return;

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
        const tPresents = tAtt.filter(a => ['presente', 'present', 'retraso', 'late'].includes(a.status.toLowerCase())).length;
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
        const mPresents = mAtt.filter(a => ['presente', 'present', 'retraso', 'late', 'convocado'].includes(a.status.toLowerCase())).length;
        const totalMatches = matches.length;
        const mPct = totalMatches > 0 ? Math.round((mPresents / totalMatches) * 100) : 0;

        let totalGoals = 0;
        let totalAssists = 0;
        matches.forEach(ev => {
          const goals = ptData.find(m => m.event_id === ev.id && m.player_id === p.id && m.club_metrics?.name?.toLowerCase() === 'goles')?.value_number;
          const assists = ptData.find(m => m.event_id === ev.id && m.player_id === p.id && m.club_metrics?.name?.toLowerCase() === 'asistencias')?.value_number;
          if (goals) totalGoals += goals;
          if (assists) totalAssists += assists;
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

  // Medias globales formativas del equipo
  const evaluatedPlayers = formativeStats.filter(p => p.overallAverage > 0);
  const teamFormativeAvg = evaluatedPlayers.length > 0 
    ? (evaluatedPlayers.reduce((s, p) => s + p.overallAverage, 0) / evaluatedPlayers.length).toFixed(2)
    : '0.0';

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-gray-200 pb-6">
        <div>
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Activity className="text-blue-500" />
            Centro de Rendimiento Global
          </h2>
          <p className="text-gray-500 text-sm mt-1">Análisis detallado de sesiones preparatorias, competición oficial y evaluación formativa.</p>
        </div>

        {/* Toggle Switch Píldora (3 Vistas) */}
        <div className="flex bg-gray-100 p-1.5 rounded-2xl border border-gray-200 shadow-inner w-full lg:w-auto">
          <button
            onClick={() => setViewMode('entrenamientos')}
            className={`flex-1 lg:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              viewMode === 'entrenamientos' 
                ? 'bg-white text-emerald-700 shadow-sm border border-gray-200/50' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <TrendingUp size={16} className={viewMode === 'entrenamientos' ? 'text-emerald-500' : 'text-gray-400'} />
            <span>Entrenamientos</span>
          </button>
          <button
            onClick={() => setViewMode('partidos')}
            className={`flex-1 lg:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              viewMode === 'partidos' 
                ? 'bg-white text-indigo-700 shadow-sm border border-gray-200/50' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Target size={16} className={viewMode === 'partidos' ? 'text-indigo-500' : 'text-gray-400'} />
            <span>Partidos</span>
          </button>
          <button
            onClick={() => setViewMode('formativo')}
            className={`flex-1 lg:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              viewMode === 'formativo' 
                ? 'bg-white text-purple-700 shadow-sm border border-gray-200/50' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <BrainCircuit size={16} className={viewMode === 'formativo' ? 'text-purple-600' : 'text-gray-400'} />
            <span>Formativo</span>
          </button>
        </div>
      </div>

      {/* BLOQUE FORMATIVO & APRENDIZAJE COLECTIVO */}
      {viewMode === 'formativo' && (
        <section className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center border border-purple-100 text-purple-600">
                <BrainCircuit size={22} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Progreso y Rúbricas Formativas Colectivas</h3>
                <p className="text-sm text-gray-500">Evaluación de competencias técnicas, tácticas, físicas y socio-afectivas de la plantilla.</p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-purple-50 border border-purple-200/80 px-4 py-2 rounded-2xl self-start sm:self-auto">
              <span className="text-xs font-bold text-purple-700 uppercase tracking-wide">Media de Plantilla:</span>
              <span className="text-xl font-black text-purple-900">{teamFormativeAvg} / 5</span>
            </div>
          </div>

          {/* Tarjetas de Medias por Módulo del Equipo */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-5 rounded-3xl text-white shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-100">Técnico-Analítico</span>
                <Flame size={18} className="text-amber-200" />
              </div>
              <div className="text-3xl font-black">
                {evaluatedPlayers.length > 0 
                  ? (evaluatedPlayers.reduce((s, p) => s + p.moduleAverages.tecnico, 0) / evaluatedPlayers.length).toFixed(1)
                  : '0.0'}
                <span className="text-sm font-normal opacity-80"> / 5</span>
              </div>
              <p className="text-[11px] text-amber-100 mt-1 font-medium">Controles, pierna débil y golpeo</p>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-5 rounded-3xl text-white shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-100">Táctico-Global</span>
                <Compass size={18} className="text-blue-200" />
              </div>
              <div className="text-3xl font-black">
                {evaluatedPlayers.length > 0 
                  ? (evaluatedPlayers.reduce((s, p) => s + p.moduleAverages.tactico, 0) / evaluatedPlayers.length).toFixed(1)
                  : '0.0'}
                <span className="text-sm font-normal opacity-80"> / 5</span>
              </div>
              <p className="text-[11px] text-blue-100 mt-1 font-medium">Toma de decisiones y espacios</p>
            </div>

            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-5 rounded-3xl text-white shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-100">Físico-Coordinativo</span>
                <Activity size={18} className="text-emerald-200" />
              </div>
              <div className="text-3xl font-black">
                {evaluatedPlayers.length > 0 
                  ? (evaluatedPlayers.reduce((s, p) => s + p.moduleAverages.fisico, 0) / evaluatedPlayers.length).toFixed(1)
                  : '0.0'}
                <span className="text-sm font-normal opacity-80"> / 5</span>
              </div>
              <p className="text-[11px] text-emerald-100 mt-1 font-medium">Agilidad, apoyos y frenadas</p>
            </div>

            <div className="bg-gradient-to-br from-rose-500 to-pink-600 p-5 rounded-3xl text-white shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-100">Socio-Afectivo</span>
                <HeartHandshake size={18} className="text-rose-200" />
              </div>
              <div className="text-3xl font-black">
                {evaluatedPlayers.length > 0 
                  ? (evaluatedPlayers.reduce((s, p) => s + p.moduleAverages.socio, 0) / evaluatedPlayers.length).toFixed(1)
                  : '0.0'}
                <span className="text-sm font-normal opacity-80"> / 5</span>
              </div>
              <p className="text-[11px] text-rose-100 mt-1 font-medium">Comunicación, esfuerzo y respeto</p>
            </div>
          </div>

          {/* Desglose Colectivo de Todos los Jugadores */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <h4 className="font-extrabold text-slate-900 text-base mb-4 flex items-center gap-2">
              <Sparkles size={18} className="text-purple-600" />
              <span>Evaluación Detallada por Futbolista ({formativeStats.length} Jugadores)</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {formativeStats.map(player => {
                const hasEvals = player.overallAverage > 0;

                return (
                  <div
                    key={`form-${player.playerId}`}
                    onClick={() => {
                      setDrawerPlayerId(player.playerId);
                      setDrawerTab('formativo');
                    }}
                    className="bg-slate-50/70 hover:bg-white border border-slate-200/80 hover:border-purple-300 rounded-2xl p-4 transition-all hover:shadow-md cursor-pointer flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full overflow-hidden bg-white border border-slate-200 flex items-center justify-center font-bold text-xs shrink-0 shadow-inner">
                            {player.avatarUrl ? (
                              <img src={player.avatarUrl} alt={player.playerName} className="w-full h-full object-cover object-[center_25%]" />
                            ) : (
                              <span>{player.dorsal || player.playerName.charAt(0)}</span>
                            )}
                          </div>
                          <div>
                            <h5 className="font-black text-slate-900 text-sm group-hover:text-purple-700 transition-colors leading-tight">
                              {player.playerName}
                            </h5>
                            <span className="text-[11px] font-bold text-slate-400">
                              {player.dorsal ? `Dorsal #${player.dorsal}` : 'Sin dorsal'}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`inline-block text-base font-black px-2.5 py-0.5 rounded-xl border ${
                            hasEvals 
                              ? 'bg-purple-50 text-purple-700 border-purple-200' 
                              : 'bg-slate-100 text-slate-400 border-slate-200'
                          }`}>
                            {hasEvals ? `${player.overallAverage} ★` : 'S/E'}
                          </span>
                        </div>
                      </div>

                      {/* Mini barras de los 4 módulos */}
                      <div className="grid grid-cols-4 gap-1.5 my-2 text-center text-[10px]">
                        <div className="bg-amber-50 border border-amber-100 p-1.5 rounded-lg">
                          <span className="block text-amber-700 font-bold">Téc</span>
                          <span className="font-black text-amber-900">{player.moduleAverages.tecnico || '-'}</span>
                        </div>
                        <div className="bg-blue-50 border border-blue-100 p-1.5 rounded-lg">
                          <span className="block text-blue-700 font-bold">Tác</span>
                          <span className="font-black text-blue-900">{player.moduleAverages.tactico || '-'}</span>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-100 p-1.5 rounded-lg">
                          <span className="block text-emerald-700 font-bold">Fís</span>
                          <span className="font-black text-emerald-900">{player.moduleAverages.fisico || '-'}</span>
                        </div>
                        <div className="bg-rose-50 border border-rose-100 p-1.5 rounded-lg">
                          <span className="block text-rose-700 font-bold">Soc</span>
                          <span className="font-black text-rose-900">{player.moduleAverages.socio || '-'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 mt-2 font-medium">
                      <span>{player.evaluationsCount > 0 ? `${player.evaluationsCount} eval. registradas` : 'Sin evaluación'}</span>
                      <span className="text-purple-600 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                        Ver informe <ChevronRight size={14} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

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
                    <img src={player.avatar_url} alt={player.first_name} className="w-12 h-12 rounded-full object-cover object-[center_25%] border border-gray-200" />
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
                    <img src={player.avatar_url} alt={player.first_name} className="w-12 h-12 rounded-full object-cover object-[center_25%] border border-gray-200" />
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
