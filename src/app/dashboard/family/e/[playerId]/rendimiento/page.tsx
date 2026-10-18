"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Activity, Clock, Flame, Calendar, Trophy, TrendingUp, 
  Target, ArrowLeft, Loader2, AlertCircle, CheckCircle2, 
  User as UserIcon, ShieldAlert, Award
} from "lucide-react";
import { getPersonalPerformanceAction, PersonalPerformanceData } from "@/app/actions/performance-portal-actions";
import { isFormativeCategory } from "@/lib/utils";
import { PlayerProgressView } from "@/components/features/formative/PlayerProgressView";
import { PlayerAchievementsShowcase } from "@/components/features/performance/PlayerAchievementsShowcase";
import { PlayerHeaderBadges } from "@/components/features/performance/PlayerHeaderBadges";

export default function FamilyPerformancePage() {
  const params = useParams();
  const router = useRouter();
  const playerId = typeof params.playerId === 'string' ? params.playerId : '';

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [perfData, setPerfData] = useState<PersonalPerformanceData | null>(null);
  const [activeTab, setActiveTab] = useState<'resumen' | 'sesiones' | 'partidos' | 'formativo'>('resumen');

  useEffect(() => {
    if (!playerId) return;

    let isMounted = true;
    const loadPerformance = async () => {
      setLoading(true);
      setErrorMsg(null);

      const res = await getPersonalPerformanceAction(playerId);
      if (!isMounted) return;

      if (!res.success || !res.data) {
        setErrorMsg(res.error || "No se pudo acceder a la información de rendimiento.");
        setPerfData(null);
      } else {
        setPerfData(res.data);
      }
      setLoading(false);
    };

    loadPerformance();

    return () => {
      isMounted = false;
    };
  }, [playerId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] p-6 text-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-500">Cargando datos de rendimiento personal...</p>
      </div>
    );
  }

  if (errorMsg || !perfData) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto animate-in fade-in duration-300">
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 sm:p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-2xl shadow-xs">
            <ShieldAlert size={28} />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-black text-rose-950">Acceso No Autorizado</h2>
            <p className="text-sm text-rose-700 max-w-md mx-auto">
              {errorMsg || "No tienes permisos verificados como tutor o jugador para ver estas métricas."}
            </p>
          </div>
          <button
            onClick={() => router.push(`/dashboard/family/e/${playerId}/perfil`)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-rose-200 text-rose-800 text-xs font-bold hover:bg-rose-100 transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Volver al Perfil</span>
          </button>
        </div>
      </div>
    );
  }

  const { player, summary, recentSessions, recentMatches } = perfData;
  const isFormative = isFormativeCategory(player.team_category || '', player.team_name || '');
  const pName = `${player.first_name || ''} ${player.last_name || ''}`.trim() || 'Jugador';

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      {/* Cabecera / Identidad */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 font-black text-slate-700 text-base shadow-inner">
            {player.avatar_url ? (
              <img 
                src={player.avatar_url} 
                alt={pName} 
                className="w-full h-full object-cover object-[center_25%]" 
              />
            ) : (
              <span>{player.dorsal || pName.charAt(0)}</span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                Mi Rendimiento
              </span>
              {player.team_name && (
                <span className="text-xs font-bold text-slate-400 truncate">
                  • {player.team_name}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 truncate mt-0.5">{pName}</h1>
            <p className="text-xs text-slate-500 font-medium">
              {player.dorsal ? `Dorsal #${player.dorsal}` : 'Sin dorsal'} {player.posicion ? `• ${player.posicion}` : ''}
            </p>
            <div className="mt-1.5">
              <PlayerHeaderBadges playerId={playerId} />
            </div>
          </div>
        </div>

        <button
          onClick={() => router.push(`/dashboard/family/e/${playerId}/perfil`)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors shrink-0 cursor-pointer self-start sm:self-auto"
        >
          <ArrowLeft size={14} />
          <span>Panel Familiar</span>
        </button>
      </header>

      {/* Selector de Pestañas */}
      <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 gap-1 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('resumen')}
          className={`flex-1 min-w-[100px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'resumen' 
              ? 'bg-white text-blue-700 shadow-xs border border-slate-200/60' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Activity size={15} />
          <span>Resumen</span>
        </button>
        <button
          onClick={() => setActiveTab('sesiones')}
          className={`flex-1 min-w-[110px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'sesiones' 
              ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/60' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp size={15} />
          <span>Entrenamientos</span>
        </button>
        <button
          onClick={() => setActiveTab('partidos')}
          className={`flex-1 min-w-[100px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'partidos' 
              ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Target size={15} />
          <span>Partidos</span>
        </button>
        {isFormative && (
          <button
            onClick={() => setActiveTab('formativo')}
            className={`flex-1 min-w-[100px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'formativo' 
                ? 'bg-white text-purple-700 shadow-xs border border-slate-200/60' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>🧠 Formativo</span>
          </button>
        )}
      </div>

      {/* VISTA 1: RESUMEN */}
      {activeTab === 'resumen' && (
        <section className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Asistencia</span>
              <span className="text-2xl sm:text-3xl font-black text-slate-900">{summary.trainingAttendancePct}%</span>
              <span className="text-[11px] text-slate-500 block mt-0.5">En {summary.totalTrainingSessions} sesiones</span>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Mins. Entreno</span>
              <span className="text-2xl sm:text-3xl font-black text-slate-900">{summary.totalTrainingMinutes}'</span>
              <span className="text-[11px] text-slate-500 block mt-0.5">Completados</span>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Esfuerzo Medio (RPE)</span>
              <span className="text-2xl sm:text-3xl font-black text-amber-600">
                {summary.avgRpe !== null ? summary.avgRpe : '-'}
                {summary.avgRpe !== null && <span className="text-xs font-normal text-slate-400"> / 10</span>}
              </span>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                {summary.avgRpe !== null ? 'Percepción de fatiga' : 'Sin respuestas'}
              </span>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Partidos Disputados</span>
              <span className="text-2xl sm:text-3xl font-black text-indigo-900">{summary.totalMatchesPlayed}</span>
              <span className="text-[11px] text-slate-500 block mt-0.5">{summary.totalMatchMinutes} mins en actas</span>
            </div>
          </div>

          {/* Vitrina de Logros e Insignias Deportivas */}
          <PlayerAchievementsShowcase playerId={playerId} />

          {/* Panel Informativo de Seguimiento */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-3xl p-5 sm:p-6 text-blue-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold flex items-center gap-2">
                <CheckCircle2 size={18} className="text-blue-600" />
                <span>Seguimiento Deportivo Protegido</span>
              </h3>
              <p className="text-xs text-blue-800 leading-relaxed max-w-2xl">
                Esta vista muestra exclusivamente las estadísticas confirmadas y la percepción de esfuerzo reportada por {pName}. Las evaluaciones internas del cuerpo técnico permanecen reservadas.
              </p>
            </div>
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200 shrink-0">
              Datos Personales
            </span>
          </div>
        </section>
      )}

      {/* VISTA 2: SESIONES DE ENTRENAMIENTO */}
      {activeTab === 'sesiones' && (
        <section className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-900">Historial de Entrenamientos Registrados</h2>
            <span className="text-xs font-semibold text-slate-400">{recentSessions.length} sesiones</span>
          </div>

          {recentSessions.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 border border-dashed border-slate-200 text-center text-xs text-slate-400">
              No hay sesiones de entrenamiento programadas para este equipo.
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentSessions.map(sess => {
                const isPresent = sess.attendanceStatus.toLowerCase().includes('present');
                const isLate = sess.attendanceStatus.toLowerCase().includes('retraso');
                const isAbsent = sess.attendanceStatus.toLowerCase().includes('ausente') || sess.attendanceStatus.toLowerCase().includes('falta');

                return (
                  <div
                    key={sess.eventId}
                    className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800">
                        {sess.date ? new Date(sess.date).toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: '2-digit' }) : '-'}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                        {sess.title}
                      </div>

                      <div className="mt-1 flex items-center gap-1.5 text-[10px]">
                        <span className={`font-bold px-2 py-0.5 rounded-md ${
                          isPresent
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : isLate
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : isAbsent
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {sess.attendanceStatus}
                        </span>
                        {sess.attendanceNotes && (
                          <span className="text-slate-400 italic truncate">({sess.attendanceNotes})</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-center bg-slate-50 p-2 rounded-xl border border-slate-100 self-end sm:self-auto shrink-0">
                      <div className="px-2">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase">Minutos</span>
                        <span className="text-xs font-black text-slate-800">
                          {sess.minutes !== null ? `${sess.minutes}'` : '-'}
                        </span>
                      </div>
                      <div className="px-2 border-l border-slate-200">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase">RPE</span>
                        <span className="text-xs font-black text-slate-800">
                          {sess.rpe !== null ? sess.rpe : '-'}
                        </span>
                      </div>
                      <div className="px-2 border-l border-slate-200">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase">Carga</span>
                        <span className="text-xs font-black text-emerald-700">
                          {sess.load !== null ? sess.load : '-'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* VISTA 3: PARTIDOS */}
      {activeTab === 'partidos' && (
        <section className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-900">Historial de Partidos Oficiales (Temporada Activa)</h2>
            <span className="text-xs font-semibold text-slate-400">{recentMatches.length} convocatorias</span>
          </div>

          {recentMatches.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 border border-dashed border-slate-200 text-center text-xs text-slate-400">
              No hay partidos oficiales registrados en actas para esta temporada.
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentMatches.map(m => (
                <div
                  key={m.matchId}
                  className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                      vs {m.rivalName}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>{m.date ? new Date(m.date).toLocaleDateString('es-ES') : '-'}</span>
                      {m.isStarter && (
                        <span className="text-[9px] font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded border border-indigo-200">
                          Titular
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 text-center items-center shrink-0">
                    <div className="bg-indigo-50/70 border border-indigo-100 px-2.5 py-1 rounded-xl">
                      <span className="block text-[9px] font-bold text-indigo-700 uppercase">Min</span>
                      <span className="text-xs font-black text-indigo-950">{m.minutes}'</span>
                    </div>

                    {m.goals > 0 && (
                      <div className="bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-xl">
                        <span className="block text-[9px] font-bold text-emerald-700 uppercase">Gol</span>
                        <span className="text-xs font-black text-emerald-900">⚽ {m.goals}</span>
                      </div>
                    )}

                    {m.assists > 0 && (
                      <div className="bg-blue-50 border border-blue-100 px-2 py-1 rounded-xl">
                        <span className="block text-[9px] font-bold text-blue-700 uppercase">Ast</span>
                        <span className="text-xs font-black text-blue-900">{m.assists}</span>
                      </div>
                    )}

                    {(m.yellowCards > 0 || m.redCards > 0) && (
                      <div className="text-xs font-black bg-slate-50 border border-slate-100 px-2 py-1 rounded-xl">
                        {m.yellowCards > 0 && <span className="text-amber-500 mr-1">🟨{m.yellowCards}</span>}
                        {m.redCards > 0 && <span className="text-rose-500">🟥{m.redCards}</span>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* VISTA 4: FORMATIVO */}
      {activeTab === 'formativo' && isFormative && (
        <section className="animate-in fade-in duration-200">
          <PlayerProgressView playerId={playerId} playerName={pName} />
        </section>
      )}

    </div>
  );
}
