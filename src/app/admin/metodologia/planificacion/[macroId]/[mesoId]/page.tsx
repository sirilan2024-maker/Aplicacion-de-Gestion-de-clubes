"use client";

import { useState, useEffect, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { Calendar, Plus, ChevronRight, Loader2, ArrowLeft, Activity, Trophy } from "lucide-react";
import Link from "next/link";
import { format, addDays, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";

interface Microcycle {
  id: string;
  week_start_date: string;
  match_day_date: string | null;
  match_opponent: string | null;
  total_minutes: number;
  weekly_load_index: number;
  sessions_count?: number;
}

export default function MicrocyclesPage({ params }: { params: Promise<{ macroId: string, mesoId: string }> }) {
  const resolvedParams = use(params);
  const { macroId, mesoId } = resolvedParams;

  const [mesocycle, setMesocycle] = useState<any>(null);
  const [microcycles, setMicrocycles] = useState<Microcycle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, [mesoId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [mesoRes, microRes] = await Promise.all([
        supabase.from("mesocycles").select("*, macrocycles(name)").eq("id", mesoId).single(),
        supabase.from("microcycles").select("*").eq("mesocycle_id", mesoId).order("week_start_date", { ascending: true })
      ]);

      if (mesoRes.data) setMesocycle(mesoRes.data);
      if (microRes.data) setMicrocycles(microRes.data);

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createNextMicrocycle = async () => {
    try {
      let nextDate = new Date();
      if (microcycles.length > 0) {
        const lastMicro = microcycles[microcycles.length - 1];
        nextDate = addDays(new Date(lastMicro.week_start_date), 7);
      } else if (mesocycle) {
        nextDate = startOfWeek(new Date(mesocycle.start_date), { weekStartsOn: 1 });
      }

      const { data, error } = await supabase.from("microcycles").insert({
        mesocycle_id: mesoId,
        week_start_date: format(nextDate, "yyyy-MM-dd"),
        weekly_load_index: mesocycle?.weekly_load_target || 50,
      }).select().single();

      if (error) throw error;
      
      if (data) {
        setMicrocycles([...microcycles, data]);
      }
    } catch (error) {
      console.error("Error creating microcycle:", error);
      alert("Error al crear microciclo");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!mesocycle) return <div>Mesociclo no encontrado</div>;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
        <Link href="/admin/metodologia/planificacion" className="hover:text-blue-600 transition-colors">
          Planificación
        </Link>
        <ChevronRight className="w-4 h-4" />
        <Link href={`/admin/metodologia/planificacion/${macroId}`} className="hover:text-blue-600 transition-colors">
          {mesocycle.macrocycles?.name}
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-slate-900 font-semibold">{mesocycle.name}</span>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <Activity className="w-6 h-6 text-blue-600" />
              Microciclos (Semanas)
            </h1>
            <p className="text-slate-500 mt-1">Gestiona las semanas del mesociclo: {mesocycle.name}</p>
          </div>
          <button
            onClick={createNextMicrocycle}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-xl flex items-center gap-2 transition-colors w-full md:w-auto justify-center"
          >
            <Plus className="w-5 h-5" />
            Nueva Semana
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {microcycles.map((micro, index) => {
          const start = new Date(micro.week_start_date);
          const end = addDays(start, 6);

          return (
            <div key={micro.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-slate-900">Semana {index + 1}</h3>
                <span className="text-xs font-bold px-2 py-1 rounded-lg bg-slate-100 text-slate-700">
                  {format(start, "d MMM", { locale: es })} - {format(end, "d MMM", { locale: es })}
                </span>
              </div>

              <div className="space-y-4">
                {micro.match_day_date ? (
                  <div className="flex items-center gap-2 text-sm bg-green-50 text-green-700 p-2 rounded-lg">
                    <Trophy className="w-4 h-4" />
                    <span>Partido: {micro.match_opponent || "Sin rival definido"}</span>
                  </div>
                ) : (
                  <div className="text-sm text-slate-500 italic p-2 bg-slate-50 rounded-lg">
                    Sin partido programado
                  </div>
                )}

                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-500 mb-1">
                    <span>Índice de Carga</span>
                    <span>{micro.weekly_load_index}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${micro.weekly_load_index}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex justify-between text-sm text-slate-600 border-t border-slate-100 pt-3">
                  <span>Volumen Total</span>
                  <span className="font-semibold">{micro.total_minutes} min</span>
                </div>
                
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Sesiones</span>
                  <span className="font-semibold">{micro.sessions_count || 0}</span>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Link
                  href={`/admin/metodologia/planificacion/${macroId}/${mesoId}/${micro.id}`}
                  className="flex-1 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs rounded-xl border border-purple-100 flex items-center justify-center gap-1 transition-colors"
                >
                  <Activity className="w-3.5 h-3.5" />
                  Planificar Microciclo
                </Link>
                <Link
                  href="/admin/metodologia/sesiones/nueva"
                  className="py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-100 flex items-center justify-center gap-1 transition-colors"
                  title="Nueva sesión rápida"
                >
                  <Plus className="w-4 h-4" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
