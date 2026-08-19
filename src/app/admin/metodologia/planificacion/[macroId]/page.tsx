"use client";

import { useState, useEffect, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { Calendar, Plus, ChevronRight, Loader2, X, ArrowLeft, Target } from "lucide-react";
import Link from "next/link";
import { format, differenceInWeeks } from "date-fns";
import { es } from "date-fns/locale";

interface Mesocycle {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  focus_phase: string;
  weekly_load_target: number;
  objectives: string[];
}

export default function MacrocycleDetailPage({ params }: { params: Promise<{ macroId: string }> }) {
  const resolvedParams = use(params);
  const macroId = resolvedParams.macroId;

  const [macrocycle, setMacrocycle] = useState<any>(null);
  const [mesocycles, setMesocycles] = useState<Mesocycle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const supabase = createClient();

  // Form states
  const [name, setName] = useState("");
  const [focusPhase, setFocusPhase] = useState("Aprendizaje");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [weeklyLoad, setWeeklyLoad] = useState("50");
  const [objectivesStr, setObjectivesStr] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [macroId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [macroRes, mesoRes] = await Promise.all([
        supabase.from("macrocycles").select("*").eq("id", macroId).single(),
        supabase.from("mesocycles").select("*").eq("macrocycle_id", macroId).order("start_date", { ascending: true })
      ]);

      if (macroRes.data) setMacrocycle(macroRes.data);
      if (mesoRes.data) setMesocycles(mesoRes.data);
      
      if (macroRes.data && (!mesoRes.data || mesoRes.data.length === 0)) {
        setStartDate(macroRes.data.start_date);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const objectives = objectivesStr
        .split("\n")
        .map((o) => o.trim())
        .filter((o) => o.length > 0);

      const { error } = await supabase.from("mesocycles").insert({
        macrocycle_id: macroId,
        name,
        focus_phase: focusPhase,
        start_date: startDate,
        end_date: endDate,
        weekly_load_target: parseInt(weeklyLoad),
        objectives,
        sort_order: mesocycles.length + 1
      });

      if (error) throw error;
      
      setIsModalOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error creating mesocycle:", error);
      alert("Error al crear el mesociclo");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setName("");
    setFocusPhase("Aprendizaje");
    setStartDate("");
    setEndDate("");
    setWeeklyLoad("50");
    setObjectivesStr("");
  };

  const getPhaseColor = (type: string) => {
    switch (type) {
      case "Aprendizaje": return "bg-blue-100 text-blue-700";
      case "Consolidación": return "bg-purple-100 text-purple-700";
      case "Rendimiento": return "bg-red-100 text-red-700";
      case "Transferencia": return "bg-orange-100 text-orange-700";
      case "Evaluación": return "bg-slate-100 text-slate-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getLoadColor = (load: number) => {
    if (load < 40) return "bg-green-500";
    if (load < 70) return "bg-yellow-500";
    return "bg-red-500";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!macrocycle) return <div>Macrociclo no encontrado</div>;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
        <Link href="/admin/metodologia/planificacion" className="hover:text-blue-600 transition-colors flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Planificación
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-slate-900 font-semibold">{macrocycle.name}</span>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">{macrocycle.name}</h1>
            <div className="flex items-center gap-3 mt-2 text-sm text-slate-600">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {format(new Date(macrocycle.start_date), "d MMM yyyy", { locale: es })} - {format(new Date(macrocycle.end_date), "d MMM yyyy", { locale: es })}
              </span>
              <span className="px-2 py-1 bg-slate-100 rounded-lg font-medium">{macrocycle.phase_type}</span>
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-xl flex items-center gap-2 transition-colors w-full md:w-auto justify-center"
          >
            <Plus className="w-5 h-5" />
            Nuevo Mesociclo
          </button>
        </div>
      </div>

      <h2 className="text-xl font-bold text-slate-900 pt-4">Mesociclos</h2>
      
      {mesocycles.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 border-dashed">
          <p className="text-slate-500 mb-4">Aún no hay mesociclos en este macrociclo.</p>
          <button onClick={() => setIsModalOpen(true)} className="text-blue-600 font-semibold hover:underline">
            Crear el primer mesociclo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mesocycles.map((meso) => {
            const start = new Date(meso.start_date);
            const end = new Date(meso.end_date);
            const weeks = differenceInWeeks(end, start) || 1; // At least 1 week

            return (
              <div key={meso.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-bold text-slate-900">{meso.name}</h3>
                  <span className={`text-xs font-bold px-2 py-1 rounded-lg ${getPhaseColor(meso.focus_phase)}`}>
                    {meso.focus_phase}
                  </span>
                </div>

                <div className="space-y-4 flex-grow">
                  <div className="text-sm text-slate-600 flex justify-between">
                    <span>{format(start, "d MMM", { locale: es })} - {format(end, "d MMM", { locale: es })}</span>
                    <span className="font-semibold">{weeks} sem</span>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-medium text-slate-500 mb-1">
                      <span>Carga Objetivo</span>
                      <span>{meso.weekly_load_target} / 100</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getLoadColor(meso.weekly_load_target)}`}
                        style={{ width: `${meso.weekly_load_target}%` }}
                      ></div>
                    </div>
                  </div>

                  {meso.objectives && meso.objectives.length > 0 && (
                    <div className="text-sm">
                      <div className="font-semibold text-slate-700 flex items-center gap-1 mb-1">
                        <Target className="w-4 h-4" /> Objetivos
                      </div>
                      <ul className="list-disc pl-5 text-slate-600 space-y-1">
                        {meso.objectives.slice(0, 2).map((obj, i) => (
                          <li key={i} className="truncate">{obj}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                  <Link
                    href={`/admin/metodologia/planificacion/${macroId}/${meso.id}`}
                    className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-blue-600 font-semibold rounded-xl border border-slate-200 flex items-center justify-center gap-1 transition-colors"
                  >
                    Ver Microciclos
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-slate-900">Nuevo Mesociclo</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Nombre</label>
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Ej. Meso 1 - Adaptación"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Foco de la Fase</label>
                  <select
                    required
                    value={focusPhase}
                    onChange={(e) => setFocusPhase(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Aprendizaje">Aprendizaje</option>
                    <option value="Consolidación">Consolidación</option>
                    <option value="Rendimiento">Rendimiento</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Evaluación">Evaluación</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Fecha de Inicio</label>
                  <input
                    required
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    min={macrocycle?.start_date}
                    max={macrocycle?.end_date}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Fecha de Fin</label>
                  <input
                    required
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    min={startDate || macrocycle?.start_date}
                    max={macrocycle?.end_date}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Carga Objetivo ({weeklyLoad})
                </label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={weeklyLoad}
                  onChange={(e) => setWeeklyLoad(e.target.value)}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>Baja</span>
                  <span>Media</span>
                  <span>Alta</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Objetivos (uno por línea)</label>
                <textarea
                  rows={4}
                  value={objectivesStr}
                  onChange={(e) => setObjectivesStr(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  placeholder="- Adaptación al esfuerzo&#10;- Conocimiento mutuo"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? "Guardando..." : "Crear Mesociclo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
