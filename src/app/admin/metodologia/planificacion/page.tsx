"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Calendar,
  Plus,
  ChevronRight,
  LayoutDashboard,
  Loader2,
  X,
  Target,
  Clock,
  ArrowRight,
  Layers,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { format, differenceInWeeks } from "date-fns";
import { es } from "date-fns/locale";
import { MethodologyNavHeader } from "@/components/methodology/MethodologyNavHeader";

interface Macrocycle {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  phase_type: string;
  objectives: string[];
  seasons: { name: string } | null;
  teams: { name: string } | null;
}

export default function MacrocyclesPage() {
  const [macrocycles, setMacrocycles] = useState<Macrocycle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const supabase = createClient();

  // Form states
  const [name, setName] = useState("");
  const [phaseType, setPhaseType] = useState("Pretemporada");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [objectivesStr, setObjectivesStr] = useState("");
  const [seasonId, setSeasonId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const clubId = userData.user?.user_metadata?.club_id;

      const [macroRes, seasonRes, teamRes] = await Promise.all([
        supabase
          .from("macrocycles")
          .select("*, seasons(name), teams(name)")
          .order("start_date", { ascending: false }),
        supabase.from("seasons").select("*").order("start_date", { ascending: false }),
        supabase.from("teams").select("*").order("name", { ascending: true }),
      ]);

      if (macroRes.data) setMacrocycles(macroRes.data);
      if (seasonRes.data) setSeasons(seasonRes.data);
      if (teamRes.data) setTeams(teamRes.data);
      
      if (seasonRes.data && seasonRes.data.length > 0) {
        setSeasonId(seasonRes.data[0].id);
      }
    } catch (error) {
      console.error("Error fetching planning data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const clubId = userData.user?.user_metadata?.club_id;

      const objectives = objectivesStr
        .split("\n")
        .map((o) => o.trim())
        .filter((o) => o.length > 0);

      const { error } = await supabase.from("macrocycles").insert({
        club_id: clubId,
        name,
        phase_type: phaseType,
        start_date: startDate,
        end_date: endDate,
        objectives,
        season_id: seasonId,
        team_id: teamId || null,
      });

      if (error) throw error;
      
      setIsModalOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error creating macrocycle:", error);
      alert("Error al crear el macrociclo");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setName("");
    setPhaseType("Pretemporada");
    setStartDate("");
    setEndDate("");
    setObjectivesStr("");
    setTeamId("");
  };

  const getPhaseColor = (type: string) => {
    switch (type) {
      case "Pretemporada":
        return "bg-blue-100 text-blue-700";
      case "Competición":
        return "bg-green-100 text-green-700";
      case "Inicio":
        return "bg-yellow-100 text-yellow-700";
      case "Desarrollo":
        return "bg-purple-100 text-purple-700";
      case "Mantenimiento":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Header con Navegación Metodológica y Acciones */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 tracking-wider">
              Planificación Metodológica
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Calendar className="w-7 h-7 text-blue-600 shrink-0" />
            Planificación de Temporada
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1 max-w-2xl">
            ¿Qué vamos a entrenar? Estructura temporal en cascada: Macrociclos, Mesociclos, Microciclos y Sesiones de Entrenamiento.
          </p>
        </div>

        {/* Acciones Rápidas */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Link
            href="/admin/metodologia/sesiones"
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Target className="w-3.5 h-3.5 text-slate-600" />
            <span>Ver Sesiones</span>
          </Link>

          <Link
            href="/admin/metodologia/sesiones/nueva"
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Diseñar Sesión</span>
          </Link>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo Macrociclo</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-slate-200 gap-3 shadow-xs">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-xs font-bold text-slate-500">Cargando planificación de temporada...</p>
        </div>
      ) : macrocycles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 border-dashed p-12 text-center shadow-xs space-y-3">
          <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto text-blue-600">
            <LayoutDashboard className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-slate-900">No hay macrociclos planificados</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Comienza a planificar tu temporada creando tu primer macrociclo. Podrás estructurarlo en mesociclos y microciclos semanales.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-xs inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Crear primer macrociclo</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {macrocycles.map((macro) => {
            const start = new Date(macro.start_date);
            const end = new Date(macro.end_date);
            const totalWeeks = differenceInWeeks(end, start) || 1;
            const now = new Date();
            const totalMs = Math.max(1, end.getTime() - start.getTime());
            const elapsedMs = now.getTime() - start.getTime();
            const progress = Math.max(0, Math.min(100, (elapsedMs / totalMs) * 100));

            return (
              <div key={macro.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between gap-4">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-base font-black text-slate-900 leading-tight">{macro.name}</h3>
                      <p className="text-xs text-slate-400 font-semibold mt-0.5">{macro.seasons?.name || "Temporada General"}</p>
                    </div>
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider ${getPhaseColor(macro.phase_type)}`}>
                      {macro.phase_type}
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>
                        {format(start, "d MMM yyyy", { locale: es })} — {format(end, "d MMM yyyy", { locale: es })}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-500">Duración estimada:</span>
                      <span className="font-black text-slate-800">{totalWeeks} semanas</span>
                    </div>

                    {macro.objectives && macro.objectives.length > 0 && (
                      <div className="pt-2 border-t border-slate-200/60">
                        <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Objetivos Clave:</span>
                        <ul className="space-y-1 text-[11px]">
                          {macro.objectives.slice(0, 2).map((obj, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-slate-700">
                              <span className="w-1 h-1 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                              <span className="line-clamp-1">{obj}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="mb-3">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                      <span>Progreso temporal</span>
                      <span className="text-slate-700 font-black">{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <Link
                    href={`/admin/metodologia/planificacion/${macro.id}`}
                    className="w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Ver Mesociclos & Semanas</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Creación */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-lg font-black text-slate-900">Nuevo Macrociclo</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nombre del Macrociclo</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Periodo Preparatorio 2026/27"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tipo de Fase</label>
                  <select
                    value={phaseType}
                    onChange={(e) => setPhaseType(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 font-bold"
                  >
                    <option value="Pretemporada">Pretemporada</option>
                    <option value="Inicio">Inicio</option>
                    <option value="Desarrollo">Desarrollo</option>
                    <option value="Competición">Competición</option>
                    <option value="Mantenimiento">Mantenimiento</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Temporada</label>
                  <select
                    value={seasonId}
                    onChange={(e) => setSeasonId(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 font-bold"
                  >
                    {seasons.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Fecha de Inicio</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Fecha de Fin</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Objetivos del Macrociclo (un objetivo por línea)</label>
                <textarea
                  rows={3}
                  placeholder="Asimilar el modelo de juego en salida de balón&#10;Consolidar la estructura física básica"
                  value={objectivesStr}
                  onChange={(e) => setObjectivesStr(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-bold text-xs hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Creando..." : "Guardar Macrociclo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
