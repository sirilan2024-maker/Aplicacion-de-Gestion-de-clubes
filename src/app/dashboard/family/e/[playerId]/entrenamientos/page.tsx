"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  Target, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock3, 
  Sparkles,
  ChevronRight,
  Info
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

interface TrainingSession {
  id: string;
  title: string | null;
  date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  notes: string | null;
  team_id: string;
}

interface PlayerAttendance {
  event_id: string;
  status: string;
  notes: string | null;
}

export default function FamilyTrainingsPage() {
  const params = useParams();
  const playerId = typeof params.playerId === 'string' ? params.playerId : '';

  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState("");
  const [trainings, setTrainings] = useState<TrainingSession[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Map<string, PlayerAttendance>>(new Map());
  const [activeTab, setActiveTab] = useState<'proximos' | 'pasados' | 'todos'>('proximos');

  useEffect(() => {
    fetchTrainings();
  }, [playerId]);

  // Obtiene la fecha actual en la zona horaria peninsular (Europe/Madrid) en formato YYYY-MM-DD
  const todayStr = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Madrid',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date());
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  }, []);

  const fetchTrainings = async () => {
    setLoading(true);
    const supabase = createClient();
    try {
      const { data: pData, error: pError } = await supabase
        .from('players')
        .select('team_id, teams(name)')
        .eq('id', playerId)
        .single();
        
      if (pError) throw pError;
      setTeamName((pData.teams as any)?.name || "Equipo");

      if (pData.team_id) {
        // Cargar todas las sesiones de entrenamiento del equipo
        const { data: tData, error: tError } = await supabase
          .from('team_events')
          .select('*')
          .eq('team_id', pData.team_id)
          .eq('event_type', 'Entrenamiento');

        if (tError) throw tError;

        // Cargar asistencias registradas para este jugador
        const { data: attData } = await supabase
          .from('attendance')
          .select('event_id, status, notes')
          .eq('player_id', playerId);

        const aMap = new Map<string, PlayerAttendance>();
        if (attData) {
          attData.forEach(a => {
            if (a.event_id) aMap.set(a.event_id, a);
          });
        }
        setAttendanceMap(aMap);
        setTrainings((tData as TrainingSession[]) || []);
      }

    } catch (err: any) {
      toast.error("Error al cargar entrenamientos: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Separar entrenamientos en próximos y pasados
  const { upcomingTrainings, pastTrainings } = useMemo(() => {
    const upcoming: TrainingSession[] = [];
    const past: TrainingSession[] = [];

    trainings.forEach(t => {
      if (t.date >= todayStr) {
        upcoming.push(t);
      } else {
        past.push(t);
      }
    });

    // Próximos: ordenados cronológicamente del más cercano al más lejano (ascendente)
    upcoming.sort((a, b) => {
      const cmpDate = a.date.localeCompare(b.date);
      if (cmpDate !== 0) return cmpDate;
      return (a.start_time || '').localeCompare(b.start_time || '');
    });

    // Pasados: ordenados del más reciente al más antiguo (descendente)
    past.sort((a, b) => {
      const cmpDate = b.date.localeCompare(a.date);
      if (cmpDate !== 0) return cmpDate;
      return (b.start_time || '').localeCompare(a.start_time || '');
    });

    return { upcomingTrainings: upcoming, pastTrainings: past };
  }, [trainings, todayStr]);

  // Si no hay próximos pero sí hay pasados y seguimos en 'proximos', sugerimos ver pasados
  const currentList = useMemo(() => {
    if (activeTab === 'proximos') return upcomingTrainings;
    if (activeTab === 'pasados') return pastTrainings;
    // 'todos': primero próximos (del más cercano al más lejano), luego pasados (del más reciente al más antiguo)
    return [...upcomingTrainings, ...pastTrainings];
  }, [activeTab, upcomingTrainings, pastTrainings]);

  const parseLocalDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    const parts = dateStr.split('-').map(Number);
    return new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
  };

  const getRelativeBadge = (dateStr: string) => {
    if (dateStr === todayStr) {
      return {
        label: 'HOY',
        className: 'bg-emerald-500 text-white font-black shadow-xs ring-2 ring-emerald-200 animate-pulse'
      };
    }

    const todayDate = parseLocalDate(todayStr);
    const targetDate = parseLocalDate(dateStr);
    const diffDays = Math.round((targetDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return {
        label: 'MAÑANA',
        className: 'bg-blue-600 text-white font-black shadow-xs'
      };
    }
    if (diffDays === 2) {
      return {
        label: 'Pasado mañana',
        className: 'bg-blue-100 text-blue-800 font-bold border border-blue-200'
      };
    }
    if (diffDays > 2 && diffDays <= 7) {
      return {
        label: `En ${diffDays} días`,
        className: 'bg-slate-100 text-slate-700 font-semibold border border-slate-200'
      };
    }
    if (diffDays > 7) {
      return {
        label: `En ${diffDays} días`,
        className: 'bg-slate-50 text-slate-500 font-medium border border-slate-200'
      };
    }
    if (diffDays === -1) {
      return {
        label: 'Ayer',
        className: 'bg-slate-100 text-slate-700 font-medium border border-slate-200'
      };
    }
    return {
      label: `Hace ${Math.abs(diffDays)} días`,
      className: 'bg-gray-100 text-gray-500 font-normal border border-gray-200'
    };
  };

  const nextSession = upcomingTrainings[0] || null;

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-sm font-semibold text-gray-400">Cargando sesiones de entrenamiento...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      <Toaster position="top-right" />
      
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
            <Target size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Entrenamientos</h1>
            <p className="text-gray-500 text-sm font-medium mt-0.5">
              Sesiones programadas del equipo <span className="font-bold text-gray-800">{teamName}</span>
            </p>
          </div>
        </div>

        {/* Resumen rápido */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold">
            {upcomingTrainings.length} {upcomingTrainings.length === 1 ? 'próxima sesión' : 'próximas sesiones'}
          </div>
        </div>
      </div>

      {/* Tarjeta destacada: Próximo entrenamiento más inmediato */}
      {nextSession && (
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-800 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-black uppercase tracking-wider text-blue-100 border border-white/20">
                <Sparkles size={14} className="text-amber-300" />
                <span>Próximo Entrenamiento Más Cercano</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                {nextSession.title || 'Sesión de Entrenamiento'}
              </h2>
              <p className="text-blue-100 text-sm capitalize">
                {parseLocalDate(nextSession.date).toLocaleDateString('es-ES', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15">
              <div className="flex items-center gap-2 pr-4 border-r border-white/20">
                <Clock3 size={18} className="text-blue-200 shrink-0" />
                <div>
                  <span className="block text-[10px] font-bold uppercase text-blue-200">Horario</span>
                  <span className="text-sm font-black text-white">
                    {nextSession.start_time?.slice(0, 5) || '--:--'}
                    {nextSession.end_time ? ` - ${nextSession.end_time.slice(0, 5)}` : ''}
                  </span>
                </div>
              </div>

              {nextSession.location && (
                <div className="flex items-center gap-2">
                  <MapPin size={18} className="text-blue-200 shrink-0" />
                  <div>
                    <span className="block text-[10px] font-bold uppercase text-blue-200">Ubicación</span>
                    <span className="text-sm font-bold text-white max-w-[200px] truncate block">
                      {nextSession.location}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Selector de pestañas */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-200/80 pb-2">
        <div className="flex items-center gap-1.5 p-1 bg-gray-100/80 rounded-2xl border border-gray-200/60">
          <button
            onClick={() => setActiveTab('proximos')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'proximos'
                ? 'bg-white text-blue-700 shadow-sm border border-gray-200/50'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>Próximos</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
              activeTab === 'proximos' ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-700'
            }`}>
              {upcomingTrainings.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('pasados')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'pasados'
                ? 'bg-white text-blue-700 shadow-sm border border-gray-200/50'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>Anteriores</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
              activeTab === 'pasados' ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-700'
            }`}>
              {pastTrainings.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('todos')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'todos'
                ? 'bg-white text-blue-700 shadow-sm border border-gray-200/50'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>Todos</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
              activeTab === 'todos' ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-700'
            }`}>
              {trainings.length}
            </span>
          </button>
        </div>

        <span className="text-xs font-semibold text-gray-400 hidden sm:inline">
          {activeTab === 'proximos' 
            ? 'Ordenados del más cercano al más lejano' 
            : activeTab === 'pasados' 
            ? 'Ordenados del más reciente al más antiguo' 
            : 'Listado completo'}
        </span>
      </div>

      {/* Listado de Entrenamientos */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {currentList.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-14 h-14 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center mx-auto">
              <CalendarIcon size={28} />
            </div>
            <h3 className="font-bold text-gray-800 text-base">
              {activeTab === 'proximos'
                ? 'No hay próximos entrenamientos programados'
                : activeTab === 'pasados'
                ? 'No hay historial de entrenamientos anteriores'
                : 'No hay entrenamientos registrados'}
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {activeTab === 'proximos' && pastTrainings.length > 0 ? (
                <span>
                  Puedes consultar las sesiones ya realizadas en la pestaña de{" "}
                  <button 
                    onClick={() => setActiveTab('pasados')}
                    className="font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    Anteriores ({pastTrainings.length})
                  </button>.
                </span>
              ) : (
                'El cuerpo técnico actualizará el calendario cuando se definan nuevas sesiones.'
              )}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {currentList.map((t, idx) => {
              const localDate = parseLocalDate(t.date);
              const isPast = t.date < todayStr;
              const isToday = t.date === todayStr;
              const relativeBadge = getRelativeBadge(t.date);
              const attendance = attendanceMap.get(t.id);

              return (
                <div 
                  key={t.id} 
                  className={`p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                    isToday ? 'bg-emerald-50/40 hover:bg-emerald-50/70' : 'hover:bg-gray-50/80'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Bloque visual de fecha */}
                    <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 border transition-all ${
                      isToday 
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                        : isPast 
                        ? 'bg-gray-50 text-gray-600 border-gray-200' 
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      <span className="text-[10px] font-black uppercase tracking-wider leading-tight">
                        {localDate.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '')}
                      </span>
                      <span className="text-xl font-black leading-none mt-0.5">
                        {localDate.getDate()}
                      </span>
                    </div>

                    {/* Información de la sesión */}
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-gray-900 text-base">
                          {t.title || 'Sesión de Entrenamiento'}
                        </h3>
                        <span className={`text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full ${relativeBadge.className}`}>
                          {relativeBadge.label}
                        </span>
                      </div>

                      <p className="text-xs font-semibold text-gray-600 capitalize">
                        {localDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-gray-500">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Clock size={14} className="text-gray-400" />
                          <span>
                            {t.start_time?.slice(0, 5) || '--:--'}
                            {t.end_time ? ` - ${t.end_time.slice(0, 5)}` : ''}
                          </span>
                        </div>
                        {t.location && (
                          <div className="flex items-center gap-1.5 font-medium">
                            <MapPin size={14} className="text-gray-400" />
                            <span>{t.location}</span>
                          </div>
                        )}
                      </div>

                      {t.notes && (
                        <div className="mt-1.5 flex items-start gap-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg p-2 max-w-xl">
                          <Info size={13} className="text-blue-500 shrink-0 mt-0.5" />
                          <span>{t.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Estado de Asistencia o Convocatoria */}
                  <div className="sm:self-center shrink-0">
                    {attendance ? (
                      (() => {
                        const statusLower = attendance.status?.toLowerCase() || '';
                        if (statusLower.includes('present')) {
                          return (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                              <CheckCircle2 size={14} />
                              Presente
                            </span>
                          );
                        }
                        if (statusLower.includes('ausente') || statusLower.includes('falta')) {
                          return (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <XCircle size={14} />
                              Ausente
                            </span>
                          );
                        }
                        if (statusLower.includes('justific') || statusLower.includes('lesion')) {
                          return (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <AlertCircle size={14} />
                              Justificada
                            </span>
                          );
                        }
                        return (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {attendance.status}
                          </span>
                        );
                      })()
                    ) : (
                      isPast ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                          Finalizado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          <Clock3 size={13} />
                          Programado
                        </span>
                      )
                    )}
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
