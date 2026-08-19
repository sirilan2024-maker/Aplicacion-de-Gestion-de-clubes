"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Search, Calendar, Clock, Activity, Loader2, ChevronRight, Copy, Edit, Layers } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Session {
  id: string;
  date_time: string;
  duration_minutes: number;
  microcycle_day: string;
  intensity_load: number;
  objective?: string;
  coach_notes?: string;
  estimated_load?: number;
  teams: { name: string; category?: string } | null;
  age_category: string;
  exercises_count?: number;
}

export default function SessionsListPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
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
        .order("date_time", { ascending: false });

      if (error) {
        console.warn("Error consultando sesiones con drills:", error.message || error);
        // Fallback defensivo: consultar solo training_sessions y teams si session_drills no tiene relación directa
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("training_sessions")
          .select(`
            *,
            teams ( name, category )
          `)
          .order("date_time", { ascending: false });

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

  const getIntensityColor = (level: number) => {
    switch (level) {
      case 1: return "bg-green-100 text-green-700";
      case 2: return "bg-blue-100 text-blue-700";
      case 3: return "bg-yellow-100 text-yellow-700";
      case 4: return "bg-orange-100 text-orange-700";
      case 5: return "bg-red-100 text-red-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  const filteredSessions = sessions.filter(s => {
    const teamName = (s.teams?.name || "").toLowerCase();
    const obj = (s.objective || s.coach_notes || "").toLowerCase();
    const cat = (s.age_category || "").toLowerCase();
    const term = searchTerm.toLowerCase();
    return teamName.includes(term) || obj.includes(term) || cat.includes(term);
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
            <span className="text-slate-400 text-xs font-bold">• Registro de Sesiones</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-1">Sesiones de Entrenamiento</h1>
          <p className="text-slate-500 mt-0.5">Control y seguimiento de todas las sesiones planificadas en el club.</p>
        </div>
        <Link
          href="/admin/metodologia/sesiones/nueva"
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-colors justify-center shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Nueva Sesión
        </Link>
      </div>

      {/* Filter / Search bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por equipo, objetivo principal o categoría..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-slate-50 font-medium"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 border-dashed">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">No hay sesiones que coincidan</h3>
          <p className="text-slate-500 mb-6">Planifica una nueva sesión con el motor metodológico.</p>
          <Link
            href="/admin/metodologia/sesiones/nueva"
            className="text-blue-600 font-semibold hover:underline"
          >
            Crear nueva sesión
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-400 font-bold tracking-wider">
                  <th className="px-6 py-4">Fecha y Equipo</th>
                  <th className="px-6 py-4">Detalles Metodológicos</th>
                  <th className="px-6 py-4">Objetivo Principal</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredSessions.map((session) => (
                  <tr key={session.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-50 w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                          <Calendar className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">
                            {session.date_time ? format(new Date(session.date_time), "d MMM yyyy, HH:mm", { locale: es }) : "Sin fecha"}
                          </div>
                          <div className="text-xs text-slate-500 font-medium">{session.teams?.name || "Sin equipo"} • {session.age_category}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        <span className="flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">
                          <Clock className="w-3 h-3 text-slate-500" /> {session.duration_minutes} min
                        </span>
                        <span className="flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">
                          <Layers className="w-3 h-3 text-slate-500" /> {session.exercises_count} ej.
                        </span>
                        <span className={`px-2 py-0.5 rounded font-bold ${getIntensityColor(session.intensity_load)}`}>
                          Intensidad {session.intensity_load}
                        </span>
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-black uppercase">
                          {session.microcycle_day}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-slate-700 font-semibold line-clamp-2 max-w-xs">
                        {session.objective || session.coach_notes || "Sin objetivo definido"}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link 
                          href={`/admin/metodologia/sesiones/${session.id}`}
                          className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                          title="Ver y editar detalles"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <Link 
                          href={`/admin/metodologia/sesiones/${session.id}`}
                          className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                          title="Abrir sesión"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Link>
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
