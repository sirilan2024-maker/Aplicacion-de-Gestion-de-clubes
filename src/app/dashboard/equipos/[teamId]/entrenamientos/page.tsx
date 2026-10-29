"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Plus, Target, Activity, CalendarDays, ArrowRight, Loader2, Trash2, X, ChevronDown, ChevronUp, UserCheck, Clock } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { format, parseISO, differenceInDays, addDays, getDay, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { createTeamEventAction } from "@/app/actions/event-actions";

interface TrainingSession {
  id: string;
  title: string;
  date: string;
  start_time: string;
}

interface PlayerStats {
  player_id: string;
  first_name: string;
  last_name: string;
  acute_load: number;
  chronic_load: number;
  acwr: number;
}

export default function EntrenamientosListPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = typeof params.teamId === 'string' ? params.teamId : '';

  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [stats, setStats] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState("Entrenamiento");
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newTime, setNewTime] = useState("18:00");
  const [newEndTime, setNewEndTime] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringDays, setRecurringDays] = useState<number[]>([]);
  const [recurringEndDate, setRecurringEndDate] = useState("");
  const [autoRsvp, setAutoRsvp] = useState(false);
  const [rsvpTimingType, setRsvpTimingType] = useState<"relative" | "exact">("relative");
  const [rsvpDaysBefore, setRsvpDaysBefore] = useState<number>(1);
  const [rsvpDate, setRsvpDate] = useState("");
  const [rsvpTime, setRsvpTime] = useState("19:00");

  // Collapsible History & Filter states
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<string>("current_month");

  useEffect(() => {
    fetchData();
  }, [teamId]);

  const fetchData = async () => {
    if (!teamId) return;
    setLoading(true);
    const supabase = createClient();

    // 1. Fetch training sessions (ordenados del más próximo al más lejano)
    const { data: evData, error: evError } = await supabase
      .from('team_events')
      .select('id, title, date, start_time')
      .eq('team_id', teamId)
      .eq('event_type', 'Entrenamiento')
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    if (!evError && evData) {
      setSessions(evData);
    }

    // 2. Calculate ACWR Manually
    try {
      const { data: teamData } = await supabase.from('teams').select('club_id, season_id').eq('id', teamId).single();
      if (teamData) {
        const { data: metrics } = await supabase.from('club_metrics').select('id, name').eq('club_id', teamData.club_id);
        const rpeMetricId = metrics?.find(m => m.name.toLowerCase().includes('rpe'))?.id;
        const minMetricId = metrics?.find(m => m.name.toLowerCase().includes('minutos'))?.id;

        if (rpeMetricId && minMetricId && evData) {
          const eventIds = evData.map(e => e.id);
          const { data: ptData } = await supabase.from('player_training_metrics').select('event_id, player_id, metric_id, value_number').in('event_id', eventIds).in('metric_id', [rpeMetricId, minMetricId]);
          
          let pshQuery = supabase
            .from('player_season_history')
            .select('player_id, players(id, first_name, last_name)')
            .eq('team_id', teamId)
            .neq('status', 'inactive');
          
          if (teamData.season_id) {
            pshQuery = pshQuery.eq('season_id', teamData.season_id);
          }

          const { data: historyData } = await pshQuery;
          let plData: any[] = [];
          if (historyData) {
            plData = historyData.map((h: any) => h.players);
          }

          if (ptData && plData) {
            const today = new Date();
            const calculatedStats: PlayerStats[] = [];

            for (const p of plData) {
              const dailyLoads: Record<string, number> = {};
              
              evData.forEach(ev => {
                const rpe = ptData.find(m => m.event_id === ev.id && m.player_id === p.id && m.metric_id === rpeMetricId)?.value_number;
                const min = ptData.find(m => m.event_id === ev.id && m.player_id === p.id && m.metric_id === minMetricId)?.value_number;
                if (rpe !== undefined && min !== undefined) {
                  dailyLoads[ev.date] = (dailyLoads[ev.date] || 0) + (rpe * min);
                }
              });

              let acuteSum = 0; let acuteDays = 0;
              let chronicSum = 0; let chronicDays = 0;

              Object.entries(dailyLoads).forEach(([dateStr, load]) => {
                const diff = Math.abs(differenceInDays(today, parseISO(dateStr)));
                if (diff <= 7) { acuteSum += load; acuteDays++; }
                if (diff <= 28) { chronicSum += load; chronicDays++; }
              });

              const acuteLoad = acuteDays > 0 ? acuteSum / 7 : 0;
              const chronicLoad = chronicDays > 0 ? chronicSum / 28 : 0;
              const acwr = chronicLoad > 0 ? acuteLoad / chronicLoad : 0;

              if (chronicLoad > 0 || acuteLoad > 0) {
                calculatedStats.push({
                  player_id: p.id,
                  first_name: p.first_name,
                  last_name: p.last_name,
                  acute_load: acuteLoad,
                  chronic_load: chronicLoad,
                  acwr
                });
              }
            }
            
            setStats(calculatedStats.sort((a,b) => b.acwr - a.acwr));
          }
        }
      }
    } catch (e) {
      console.error("No se pudo calcular ACWR", e);
    }

    setLoading(false);
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    
    if (isRecurring && (!recurringEndDate || recurringDays.length === 0)) {
      toast.error("Selecciona días y fecha fin para la recurrencia.");
      setCreating(false);
      return;
    }

    const computeReminderTime = (sessionDateStr: string) => {
      if (!autoRsvp) return null;
      if (rsvpTimingType === 'exact') {
        return rsvpDate && rsvpTime ? new Date(`${rsvpDate}T${rsvpTime}:00`).toISOString() : null;
      }
      const d = subDays(parseISO(sessionDateStr), rsvpDaysBefore);
      const dStr = format(d, 'yyyy-MM-dd');
      return new Date(`${dStr}T${rsvpTime}:00`).toISOString();
    };

    const baseEvent = {
      team_id: teamId,
      title: newTitle || "Entrenamiento",
      event_type: "Entrenamiento",
      start_time: newTime,
      end_time: newEndTime || null,
      location: newLocation || null,
      notes: newDescription || null,
    };

    const eventsToInsert = [];

    if (!isRecurring) {
      eventsToInsert.push({ 
        ...baseEvent, 
        date: newDate,
        rsvp_reminder_time: computeReminderTime(newDate)
      });
    } else {
      let currentDate = parseISO(newDate);
      const end = parseISO(recurringEndDate);
      
      // Limitar a máximo 2 años por seguridad (730 iteraciones)
      let iterations = 0;
      while (currentDate <= end && iterations < 730) {
        // getDay: 0=Dom, 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab
        if (recurringDays.includes(getDay(currentDate))) {
          const dStr = format(currentDate, 'yyyy-MM-dd');
          eventsToInsert.push({ 
            ...baseEvent, 
            date: dStr,
            rsvp_reminder_time: computeReminderTime(dStr)
          });
        }
        currentDate = addDays(currentDate, 1);
        iterations++;
      }
      
      if (eventsToInsert.length === 0) {
        toast.error("No hay fechas válidas en el rango seleccionado.");
        setCreating(false);
        return;
      }
    }

    try {
      for (const ev of eventsToInsert) {
        await createTeamEventAction(teamId, ev);
      }

      toast.success(eventsToInsert.length > 1 ? `${eventsToInsert.length} sesiones creadas` : "Sesión creada");
      setCreating(false);
      setShowModal(false);
      // Reset form
      setIsRecurring(false);
      setRecurringDays([]);
      setRecurringEndDate("");
      setNewEndTime("");
      setNewLocation("");
      setNewDescription("");
      setAutoRsvp(false);
      setRsvpTimingType("relative");
      setRsvpDaysBefore(1);
      setRsvpDate("");
      setRsvpTime("19:00");
      fetchData();
    } catch (err: any) {
      toast.error("Error al crear la sesión: " + (err.message || "Error desconocido"));
      setCreating(false);
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (!window.confirm("¿Seguro que quieres eliminar este entrenamiento? Se borrarán todos los datos físicos y formativos guardados, y desaparecerá del calendario.")) {
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.from('team_events').delete().eq('id', id);
    if (error) {
      toast.error("Error al eliminar la sesión");
    } else {
      toast.success("Sesión eliminada");
      fetchData();
    }
  };

  const getACWRStatus = (acwr: number) => {
    if (acwr === 0) return { text: "Sin Datos", color: "bg-gray-100 text-gray-600" };
    if (acwr < 0.8) return { text: "Subentrenamiento", color: "bg-amber-100 text-amber-700" };
    if (acwr <= 1.3) return { text: "Zona Segura", color: "bg-emerald-100 text-emerald-700" };
    return { text: "Peligro / Sobrecarga", color: "bg-red-100 text-red-700" };
  };

  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const currentMonthKey = useMemo(() => format(new Date(), 'yyyy-MM'), []);

  // Determinar sesión destacada superior (Hoy -> Próxima -> Última pasada)
  const featuredData = useMemo(() => {
    if (sessions.length === 0) return null;
    const todaySessions = sessions.filter(s => s.date === todayStr);
    if (todaySessions.length > 0) {
      return { session: todaySessions[0], kind: 'today' as const, extraToday: todaySessions.slice(1) };
    }
    const nextUpcoming = sessions.find(s => s.date > todayStr);
    if (nextUpcoming) {
      return { session: nextUpcoming, kind: 'upcoming' as const, extraToday: [] };
    }
    return { session: sessions[sessions.length - 1], kind: 'latest' as const, extraToday: [] };
  }, [sessions, todayStr]);

  // Meses disponibles en la temporada para el selector desplegable
  const availableMonths = useMemo(() => {
    const map = new Map<string, string>();
    // Asegurar que el mes actual esté siempre disponible
    const nowLabel = format(new Date(), "MMMM yyyy", { locale: es });
    map.set(currentMonthKey, nowLabel.charAt(0).toUpperCase() + nowLabel.slice(1));

    sessions.forEach(s => {
      const mKey = s.date.substring(0, 7);
      if (!map.has(mKey)) {
        const label = format(parseISO(`${mKey}-01`), "MMMM yyyy", { locale: es });
        map.set(mKey, label.charAt(0).toUpperCase() + label.slice(1));
      }
    });

    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [sessions, currentMonthKey]);

  // Sesiones filtradas para el desplegable de historial
  const filteredHistorySessions = useMemo(() => {
    if (historyFilter === 'all_season') {
      return sessions;
    }
    const targetMonth = historyFilter === 'current_month' ? currentMonthKey : historyFilter;
    return sessions.filter(s => s.date.startsWith(targetMonth));
  }, [sessions, historyFilter, currentMonthKey]);

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Toaster position="bottom-right" />
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl shrink-0">
            <Target size={26} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">Módulo de Entrenamientos</h1>
            <p className="text-sm text-gray-500">Planifica las sesiones, pasa lista y evalúa la carga.</p>
          </div>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition-colors disabled:opacity-70 shadow-sm shrink-0"
        >
          <Plus size={18} />
          Nueva Sesión
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* LEFT COLUMN: TODAY'S / NEXT SESSION + COLLAPSIBLE HISTORY */}
        <div className="lg:col-span-2 space-y-5">
          {loading ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center text-gray-500 flex flex-col items-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
              Cargando sesiones...
            </div>
          ) : sessions.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 text-center text-gray-500">
              No hay sesiones de entrenamiento registradas aún.
            </div>
          ) : (
            <>
              {/* TARJETA DESTACADA: ENTRENAMIENTO DEL DÍA O PRÓXIMA SESIÓN */}
              {featuredData && (
                <div className={`rounded-2xl shadow-sm border-2 overflow-hidden transition-all ${
                  featuredData.kind === 'today' 
                    ? 'bg-gradient-to-br from-blue-50/90 via-white to-emerald-50/40 border-blue-500/80' 
                    : 'bg-white border-blue-200'
                }`}>
                  <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        {featuredData.kind === 'today' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Entrenamiento de Hoy
                          </span>
                        ) : featuredData.kind === 'upcoming' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide bg-blue-100 text-blue-800 border border-blue-200">
                            <Clock size={12} />
                            Próxima Sesión (Hoy sin entreno)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide bg-gray-100 text-gray-700">
                            Última Sesión Registrada
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl sm:text-2xl font-black text-gray-900">
                        {featuredData.session.title}
                      </h2>
                      <div className="text-sm sm:text-base text-gray-600 font-semibold flex items-center gap-2 flex-wrap">
                        <CalendarDays size={16} className="text-blue-600 shrink-0" />
                        <span className="capitalize">
                          {format(parseISO(featuredData.session.date), "EEEE d 'de' MMMM, yyyy", { locale: es })}
                        </span>
                        <span>•</span>
                        <span className="text-blue-700 font-bold">
                          {featuredData.session.start_time.substring(0, 5)} h
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                      <button 
                        onClick={() => handleDeleteSession(featuredData.session.id)}
                        className="flex items-center justify-center p-2.5 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-xl transition-colors border border-transparent hover:border-red-100 shrink-0"
                        title="Eliminar sesión"
                      >
                        <Trash2 size={18} />
                      </button>
                      <button 
                        onClick={() => router.push(`/dashboard/equipos/${teamId}/entrenamientos/${featuredData.session.id}`)}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all active:scale-95"
                      >
                        <UserCheck size={18} />
                        <span>Pasar Lista</span>
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Si hubiera más de una sesión en el mismo día de hoy */}
                  {featuredData.extraToday.length > 0 && (
                    <div className="border-t border-blue-100 bg-white/80 divide-y divide-gray-100">
                      {featuredData.extraToday.map(extra => (
                        <div key={extra.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <span className="text-[11px] font-bold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                              Otra sesión hoy
                            </span>
                            <h3 className="font-bold text-gray-900 mt-0.5">{extra.title}</h3>
                            <p className="text-xs text-gray-500 font-medium">
                              Hoy • {extra.start_time.substring(0, 5)} h
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleDeleteSession(extra.id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                              title="Eliminar sesión"
                            >
                              <Trash2 size={16} />
                            </button>
                            <button 
                              onClick={() => router.push(`/dashboard/equipos/${teamId}/entrenamientos/${extra.id}`)}
                              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors"
                            >
                              <UserCheck size={16} />
                              <span>Pasar Lista</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* PESTAÑA DESPLEGABLE: HISTORIAL DE SESIONES (MES O TODA LA TEMPORADA) */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsHistoryOpen(prev => !prev)}
                  className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 bg-gray-50/70 hover:bg-gray-100/80 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-blue-100/80 text-blue-600 rounded-xl shrink-0">
                      <CalendarDays size={20} />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base sm:text-lg font-bold text-gray-900 truncate">
                        Historial de Sesiones
                      </h2>
                      <p className="text-xs text-gray-500 font-medium truncate">
                        {isHistoryOpen 
                          ? "Toca para ocultar el listado de sesiones" 
                          : `Toca para desplegar las sesiones del mes o de toda la temporada (${sessions.length})`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                      {sessions.length}
                    </span>
                    <div className="p-1.5 rounded-lg bg-white border border-gray-200 text-gray-600">
                      {isHistoryOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>
                </button>

                {isHistoryOpen && (
                  <div className="border-t border-gray-200 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* FILTROS DE MES / TODA LA TEMPORADA */}
                    <div className="p-3 sm:p-4 bg-slate-50 border-b border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                      <div className="grid grid-cols-2 sm:flex gap-1.5 bg-gray-200/70 p-1 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setHistoryFilter("current_month")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            historyFilter === "current_month"
                              ? "bg-white text-blue-700 shadow-xs"
                              : "text-gray-600 hover:text-gray-900"
                          }`}
                        >
                          Este Mes
                        </button>
                        <button
                          type="button"
                          onClick={() => setHistoryFilter("all_season")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            historyFilter === "all_season"
                              ? "bg-white text-blue-700 shadow-xs"
                              : "text-gray-600 hover:text-gray-900"
                          }`}
                        >
                          Toda la Temporada ({sessions.length})
                        </button>
                      </div>

                      {/* Selector de cualquier mes específico */}
                      <div className="flex items-center gap-2">
                        <select
                          value={
                            historyFilter === "current_month"
                              ? currentMonthKey
                              : historyFilter === "all_season"
                              ? "all_season"
                              : historyFilter
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === currentMonthKey) setHistoryFilter("current_month");
                            else setHistoryFilter(val);
                          }}
                          className="w-full sm:w-auto bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="all_season">📅 Ver toda la temporada</option>
                          {availableMonths.map(([mKey, mLabel]) => (
                            <option key={mKey} value={mKey}>
                              🗓️ {mLabel} {mKey === currentMonthKey ? "(Mes actual)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* LISTA DE SESIONES FILTRADAS */}
                    {filteredHistorySessions.length === 0 ? (
                      <div className="p-8 text-center text-sm text-gray-500">
                        No hay sesiones registradas en este mes. Prueba cambiando a &ldquo;Toda la Temporada&rdquo;.
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100 max-h-[520px] overflow-y-auto">
                        {filteredHistorySessions.map(session => {
                          const isToday = session.date === todayStr;
                          return (
                            <div 
                              key={session.id} 
                              className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50 transition-colors ${
                                isToday ? "bg-blue-50/40" : ""
                              }`}
                            >
                              <div className="flex flex-col gap-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-bold text-gray-900 text-base sm:text-lg truncate">
                                    {session.title}
                                  </h3>
                                  {isToday && (
                                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                      Hoy
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs sm:text-sm text-gray-500 font-medium capitalize">
                                  {format(parseISO(session.date), "EEEE d 'de' MMMM, yyyy", { locale: es })} • {session.start_time.substring(0,5)} h
                                </div>
                              </div>
                              <div className="flex items-center justify-end gap-2 shrink-0">
                                <button 
                                  onClick={() => handleDeleteSession(session.id)}
                                  className="flex items-center justify-center p-2 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors"
                                  title="Eliminar sesión"
                                >
                                  <Trash2 size={18} />
                                </button>
                                <button 
                                  onClick={() => router.push(`/dashboard/equipos/${teamId}/entrenamientos/${session.id}`)}
                                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-blue-50 text-gray-800 hover:text-blue-700 font-bold text-sm rounded-xl transition-colors"
                                >
                                  <UserCheck size={16} />
                                  <span>Pasar Lista</span>
                                  <ArrowRight size={15} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* RIGHT COLUMN: ACWR DASHBOARD */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="text-emerald-500" />
            Estado Físico (ACWR)
          </h2>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-gray-50 text-sm text-gray-500">
              Ratio de Carga Crónica-Aguda. Indica el riesgo de lesión basado en la acumulación de fatiga.
            </div>
            {stats.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">
                Aún no hay datos de carga suficientes para calcular el ACWR. Registra entrenamientos y RPE.
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                {stats.map(player => {
                  const status = getACWRStatus(player.acwr);
                  return (
                    <button 
                      key={player.player_id} 
                      onClick={() => router.push(`/dashboard/equipos/${teamId}/jugador/${player.player_id}?tab=stats`)}
                      className="w-full text-left p-4 hover:bg-blue-50/50 flex items-center justify-between transition-colors group cursor-pointer"
                    >
                      <div className="truncate pr-4 flex items-center gap-3">
                        <div>
                          <p className="font-bold text-sm text-gray-900 truncate group-hover:text-blue-700 transition-colors">
                            {player.first_name} {player.last_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            Aguda: {Math.round(player.acute_load)} | Crónica: {Math.round(player.chronic_load)}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <span className="font-black text-lg text-gray-900">
                          {player.acwr.toFixed(2)}
                        </span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${status.color}`}>
                          {status.text}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CREATE SESSION MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="shrink-0 flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-bold text-lg text-gray-900">Programar Nueva Sesión</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full p-1.5 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateSession} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Título (Opcional)</label>
                  <input 
                    type="text" 
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    placeholder="Ej: Entrenamiento Táctico"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Fecha Inicial</label>
                    <input 
                      type="date" 
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Hora Inicio</label>
                      <input 
                        type="time" 
                        value={newTime}
                        onChange={(e) => setNewTime(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-2 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Hora Fin</label>
                      <input 
                        type="time" 
                        value={newEndTime}
                        onChange={(e) => setNewEndTime(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-2 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Ubicación</label>
                  <input 
                    type="text" 
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    placeholder="Ej: Campo Norte"
                  />
                </div>

                {/* RECURRENCIA */}
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-3 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isRecurring}
                      onChange={e => setIsRecurring(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span className="font-bold text-blue-900">Entrenamiento Recurrente</span>
                  </label>
                  
                  {isRecurring && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Días de la semana</label>
                        <div className="flex flex-wrap gap-2">
                          {[{id: 1, label: 'L'}, {id: 2, label: 'M'}, {id: 3, label: 'X'}, {id: 4, label: 'J'}, {id: 5, label: 'V'}, {id: 6, label: 'S'}, {id: 0, label: 'D'}].map(day => (
                            <button
                              type="button"
                              key={day.id}
                              onClick={() => {
                                if (recurringDays.includes(day.id)) {
                                  setRecurringDays(recurringDays.filter(d => d !== day.id));
                                } else {
                                  setRecurringDays([...recurringDays, day.id]);
                                }
                              }}
                              className={`w-9 h-9 rounded-full font-bold flex items-center justify-center transition-colors ${recurringDays.includes(day.id) ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                            >
                              {day.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Repetir hasta (Fecha Fin)</label>
                        <input 
                          type="date" 
                          value={recurringEndDate}
                          onChange={(e) => setRecurringEndDate(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                          required={isRecurring}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* PROGRAMACIÓN AUTOMÁTICA DE ASISTENCIA */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mt-2 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={autoRsvp}
                      onChange={(e) => setAutoRsvp(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="font-bold text-slate-900 text-sm">Petición asistencia automática</span>
                  </label>
                  
                  {autoRsvp && (
                    <div className="space-y-3 pt-1 animate-in fade-in slide-in-from-top-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Cuándo avisar</label>
                          <select
                            value={rsvpTimingType === 'exact' ? 'exact' : String(rsvpDaysBefore)}
                            onChange={(e) => {
                              if (e.target.value === 'exact') {
                                setRsvpTimingType('exact');
                              } else {
                                setRsvpTimingType('relative');
                                setRsvpDaysBefore(Number(e.target.value));
                              }
                            }}
                            className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-xs font-medium"
                          >
                            <option value="1">1 día antes (Recomendado)</option>
                            <option value="0">El mismo día del entrenamiento</option>
                            <option value="2">2 días antes</option>
                            <option value="3">3 días antes</option>
                            <option value="exact">Fecha fija específica</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Hora de envío</label>
                          <input 
                            type="time" 
                            required={autoRsvp}
                            value={rsvpTime}
                            onChange={e => setRsvpTime(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-xs font-medium" 
                          />
                        </div>
                      </div>

                      {rsvpTimingType === 'exact' && (
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Fecha fija de envío</label>
                          <input 
                            type="date" 
                            required={autoRsvp && rsvpTimingType === 'exact'}
                            value={rsvpDate}
                            onChange={e => setRsvpDate(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-xs" 
                          />
                        </div>
                      )}

                      <p className="text-[11px] text-blue-700 font-medium bg-blue-100/60 p-2 rounded-lg">
                        {rsvpTimingType === 'exact' 
                          ? `Se solicitará la asistencia el ${rsvpDate || '...'} a las ${rsvpTime}.`
                          : isRecurring
                            ? `Para cada sesión generada, se enviará la petición automáticamente ${rsvpDaysBefore === 0 ? 'el mismo día' : `${rsvpDaysBefore} día${rsvpDaysBefore > 1 ? 's' : ''} antes`} a las ${rsvpTime}.`
                            : newDate
                              ? `Se solicitará la asistencia el ${format(subDays(parseISO(newDate), rsvpDaysBefore), "EEEE d 'de' MMMM", { locale: es })} a las ${rsvpTime}.`
                              : `Se enviará la petición ${rsvpDaysBefore === 0 ? 'el mismo día' : `${rsvpDaysBefore} día(s) antes`} a las ${rsvpTime}.`
                        }
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="shrink-0 bg-gray-50 border-t border-gray-100 p-4 px-6 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={creating}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors disabled:opacity-70"
                >
                  {creating ? <Loader2 size={18} className="animate-spin" /> : "Crear Sesión"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
