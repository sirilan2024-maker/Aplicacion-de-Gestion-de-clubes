"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Plus,
  Search,
  Calendar,
  Clock,
  Activity,
  Loader2,
  ChevronRight,
  Copy,
  Edit,
  Layers,
  Play,
  Trash2,
  Sparkles,
  CheckCircle2,
  Check
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { duplicateOperationalSessionAction, deleteOperationalSessionAction } from "@/app/actions/methodology-actions";

interface Session {
  id: string;
  title?: string;
  date?: string;
  date_time?: string;
  duration_minutes: number;
  microcycle_day?: string;
  intensity_load?: number;
  objective?: string;
  coach_notes?: string;
  status?: string;
  is_completed?: boolean;
  teams: { name: string; category?: string } | null;
  age_category: string;
  exercises_count?: number;
}

export default function SessionsListPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("training_sessions")
        .select(`
          *,
          teams ( name, category ),
          session_drills ( id )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Error consultando sesiones con drills:", error.message || error);
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("training_sessions")
          .select(`
            *,
            teams ( name, category )
          `)
          .order("created_at", { ascending: false });

        if (fallbackError) throw fallbackError;

        if (fallbackData) {
          setSessions(fallbackData.map((s: any) => ({ ...s, exercises_count: 0 })));
        }
        return;
      }
      
      if (data) {
        const formattedData = data.map((session: any) => ({
          ...session,
          exercises_count: Array.isArray(session.session_drills) ? session.session_drills.length : 0
        }));
        setSessions(formattedData);
      }
    } catch (error: any) {
      console.error("Error fetching sessions:", error?.message || JSON.stringify(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDuplicate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await duplicateOperationalSessionAction(id);
      if (res.success) {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
        await fetchSessions();
      }
    } catch (err: any) {
      alert(`Error al duplicar sesión: ${err.message || err}`);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("¿Estás seguro de que deseas eliminar esta sesión planificada?")) return;
    try {
      await deleteOperationalSessionAction(id);
      await fetchSessions();
    } catch (err: any) {
      alert(`Error al eliminar sesión: ${err.message || err}`);
    }
  };

  const getStatusBadge = (session: Session) => {
    if (session.is_completed || session.status === "completed") {
      return (
        <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-md inline-flex items-center gap-1">
          <CheckCircle2 className="w-2.5 h-2.5" /> Completada
        </span>
      );
    }
    if (session.status === "draft") {
      return (
        <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-md">
          Borrador
        </span>
      );
    }
    return (
      <span className="bg-blue-100 text-blue-800 border border-blue-200 text-[10px] font-black uppercase px-2 py-0.5 rounded-md">
        Planificada
      </span>
    );
  };

  const filteredSessions = sessions.filter(s => {
    const teamName = (s.teams?.name || "").toLowerCase();
    const title = (s.title || "").toLowerCase();
    const obj = (s.objective || s.coach_notes || "").toLowerCase();
    const cat = (s.age_category || "").toLowerCase();
    const term = searchTerm.toLowerCase();
    const matchesTerm = teamName.includes(term) || title.includes(term) || obj.includes(term) || cat.includes(term);

    if (statusFilter === "all") return matchesTerm;
    if (statusFilter === "completed") return matchesTerm && (s.is_completed || s.status === "completed");
    if (statusFilter === "planned") return matchesTerm && !s.is_completed && s.status !== "draft";
    if (statusFilter === "draft") return matchesTerm && s.status === "draft";
    return matchesTerm;
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-blue-100 text-blue-800 text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-md">
              Planificación Metodológica
            </span>
            <span className="text-slate-400 text-xs font-bold">• Registro y Ejecución de Sesiones</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-1">Sesiones de Entrenamiento</h1>
          <p className="text-slate-500 mt-0.5">Control, edición y ejecución en campo de las sesiones metodológicas del club.</p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/metodologia/biblioteca"
            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 transition-colors justify-center text-xs shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            Generador IA
          </Link>

          <Link
            href="/admin/metodologia/sesiones/nueva"
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-colors justify-center text-xs shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nueva Sesión
          </Link>
        </div>
      </div>

      {/* Filter / Search bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por título, equipo, objetivo principal o categoría..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-slate-50 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-auto"
          >
            <option value="all">Todos los estados</option>
            <option value="planned">Planificadas</option>
            <option value="completed">Completadas</option>
            <option value="draft">Borradores</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 border-dashed space-y-3">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
            <Calendar className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No hay sesiones registradas</h3>
          <p className="text-slate-500 text-xs max-w-sm mx-auto">
            Planifica una sesión desde el constructor o usa el Generador Inteligente para crear una progresión en segundos.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href="/admin/metodologia/biblioteca"
              className="px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold hover:bg-indigo-100"
            >
              ✨ Usar Generador IA
            </Link>
            <Link
              href="/admin/metodologia/sesiones/nueva"
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-500"
            >
              Constructor Manual
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase text-slate-400 font-black tracking-wider">
                  <th className="px-6 py-4">Sesión / Equipo</th>
                  <th className="px-6 py-4">Métricas y Tareas</th>
                  <th className="px-6 py-4">Objetivo Principal</th>
                  <th className="px-6 py-4 text-center">Estado</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredSessions.map((session) => (
                  <tr key={session.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-indigo-50 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-indigo-600 font-black">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-black text-slate-900 text-sm line-clamp-1">
                            {session.title || session.objective || "Sesión Metodológica"}
                          </div>
                          <div className="text-xs text-slate-400 font-medium">
                            {session.date || (session.date_time ? format(new Date(session.date_time), "d MMM yyyy", { locale: es }) : "Fecha pendiente")} • {session.teams?.name || session.age_category || "General"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        <span className="flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">
                          <Clock className="w-3 h-3 text-slate-500" /> {session.duration_minutes} min
                        </span>
                        <span className="flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">
                          <Layers className="w-3 h-3 text-slate-500" /> {session.exercises_count} tareas
                        </span>
                        {session.microcycle_day && (
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-black uppercase text-[10px]">
                            {session.microcycle_day}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-slate-700 font-bold line-clamp-2 max-w-xs">
                        {session.objective || session.coach_notes || "Sin objetivo definido"}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(session)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Start in Field Button */}
                        <Link
                          href={`/admin/metodologia/sesiones/${session.id}/ejecucion`}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-1 transition-all"
                          title="Iniciar sesión en campo"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          Campo
                        </Link>

                        {/* Duplicate Button */}
                        <button
                          onClick={(e) => handleDuplicate(session.id, e)}
                          className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer"
                          title="Duplicar sesión"
                        >
                          {copiedId === session.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>

                        {/* Edit Button */}
                        <Link 
                          href={`/admin/metodologia/sesiones/${session.id}`}
                          className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors" 
                          title="Editar sesión"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>

                        {/* Delete Button */}
                        <button
                          onClick={(e) => handleDelete(session.id, e)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                          title="Eliminar sesión"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
