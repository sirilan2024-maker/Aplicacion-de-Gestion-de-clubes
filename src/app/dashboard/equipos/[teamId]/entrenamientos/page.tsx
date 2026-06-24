"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Plus, Target, Activity, CalendarDays, ArrowRight, Loader2, Trash2, X } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { format, parseISO, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";

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

  useEffect(() => {
    fetchData();
  }, [teamId]);

  const fetchData = async () => {
    if (!teamId) return;
    setLoading(true);
    const supabase = createClient();

    // 1. Fetch training sessions
    const { data: evData, error: evError } = await supabase
      .from('team_events')
      .select('id, title, date, start_time')
      .eq('team_id', teamId)
      .eq('event_type', 'Entrenamiento')
      .order('date', { ascending: false })
      .order('start_time', { ascending: false });

    if (!evError && evData) {
      setSessions(evData);
    }

    // 2. Calculate ACWR Manually
    try {
      const { data: teamData } = await supabase.from('teams').select('club_id').eq('id', teamId).single();
      if (teamData) {
        const { data: metrics } = await supabase.from('club_metrics').select('id, name').eq('club_id', teamData.club_id);
        const rpeMetricId = metrics?.find(m => m.name.toLowerCase().includes('rpe'))?.id;
        const minMetricId = metrics?.find(m => m.name.toLowerCase().includes('minutos'))?.id;

        if (rpeMetricId && minMetricId && evData) {
          const eventIds = evData.map(e => e.id);
          const { data: ptData } = await supabase.from('player_training_metrics').select('event_id, player_id, metric_id, value_number').in('event_id', eventIds).in('metric_id', [rpeMetricId, minMetricId]);
          const { data: plData } = await supabase.from('players').select('id, first_name, last_name').eq('team_id', teamId);

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
    const supabase = createClient();
    
    const newSession = {
      team_id: teamId,
      title: newTitle || "Entrenamiento",
      event_type: "Entrenamiento",
      date: newDate,
      start_time: newTime
    };

    const { data, error } = await supabase
      .from('team_events')
      .insert(newSession)
      .select()
      .single();

    if (error) {
      toast.error("Error al crear la sesión");
      setCreating(false);
    } else if (data) {
      toast.success("Sesión creada");
      setCreating(false);
      setShowModal(false);
      fetchData(); // Refresh list instead of redirecting
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Toaster position="bottom-right" />
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
            <Target size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Módulo de Entrenamientos</h1>
            <p className="text-gray-500">Planifica las sesiones y evalúa la carga física y formativa.</p>
          </div>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-70"
        >
          <Plus size={18} />
          Nueva Sesión
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN: SESSIONS LIST */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarDays className="text-blue-500" />
            Historial de Sesiones
          </h2>
          
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
                Cargando sesiones...
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                No hay sesiones de entrenamiento registradas aún.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {sessions.map(session => (
                  <div key={session.id} className="p-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col gap-1">
                      <h3 className="font-bold text-gray-900 text-lg">{session.title}</h3>
                      <div className="text-sm text-gray-500 font-medium">
                        {format(parseISO(session.date), "EEEE d 'de' MMMM, yyyy", { locale: es })} • {session.start_time.substring(0,5)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleDeleteSession(session.id)}
                        className="flex items-center justify-center p-2 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors"
                        title="Eliminar sesión"
                      >
                        <Trash2 size={18} />
                      </button>
                      <button 
                        onClick={() => router.push(`/dashboard/equipos/${teamId}/entrenamientos/${session.id}`)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-blue-700 font-semibold rounded-lg transition-colors"
                      >
                        Evaluar
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-bold text-lg text-gray-900">Programar Nueva Sesión</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full p-1.5 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateSession} className="p-6 space-y-4">
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
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Fecha</label>
                  <input 
                    type="date" 
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Hora</label>
                  <input 
                    type="time" 
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    required
                  />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
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
