"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Calendar, Plus, ChevronRight, LayoutDashboard, Loader2, X } from "lucide-react";
import Link from "next/link";
import { format, differenceInWeeks } from "date-fns";
import { es } from "date-fns/locale";

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

      if (!clubId) return;

      const [macroRes, seasonRes, teamRes] = await Promise.all([
        supabase
          .from("macrocycles")
          .select("*, seasons(name), teams(name)")
          .eq("club_id", clubId)
          .order("start_date", { ascending: false }),
        supabase.from("seasons").select("*").eq("club_id", clubId),
        supabase.from("teams").select("*").eq("club_id", clubId),
      ]);

      if (macroRes.data) setMacrocycles(macroRes.data);
      if (seasonRes.data) setSeasons(seasonRes.data);
      if (teamRes.data) setTeams(teamRes.data);
      
      if (seasonRes.data && seasonRes.data.length > 0) {
        setSeasonId(seasonRes.data[0].id);
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
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Calendar className="w-8 h-8 text-blue-600" />
            Planificación de Temporada
          </h1>
          <p className="text-slate-500 mt-1">Gestiona los macrociclos de la temporada actual.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-colors w-full md:w-auto justify-center"
        >
          <Plus className="w-5 h-5" />
          Nuevo Macrociclo
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : macrocycles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <LayoutDashboard className="w-10 h-10 text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">No hay macrociclos</h3>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">
            Comienza a planificar tu temporada creando tu primer macrociclo. Podrás dividirlo luego en mesociclos y microciclos.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-xl inline-flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Crear primer macrociclo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {macrocycles.map((macro) => {
            const start = new Date(macro.start_date);
            const end = new Date(macro.end_date);
            const totalWeeks = differenceInWeeks(end, start);
            const now = new Date();
            const totalMs = end.getTime() - start.getTime();
            const elapsedMs = now.getTime() - start.getTime();
            const progress = Math.max(0, Math.min(100, (elapsedMs / totalMs) * 100));

            return (
              <div key={macro.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 leading-tight">{macro.name}</h3>
                    <p className="text-sm text-slate-500">{macro.seasons?.name}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-lg ${getPhaseColor(macro.phase_type)}`}>
                    {macro.phase_type}
                  </span>
                </div>

                <div className="space-y-3 mb-4 flex-grow">
                  <div className="flex items-center text-sm text-slate-600 gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {format(start, "d MMM yyyy", { locale: es })} - {format(end, "d MMM yyyy", { locale: es })}
                    </span>
                  </div>
                  
                  <div className="text-sm font-medium text-slate-700">
                    Duración: {totalWeeks} semanas
                  </div>

                  {macro.objectives && macro.objectives.length > 0 && (
                    <div className="text-sm text-slate-600">
                      <p className="font-semibold text-slate-700 mb-1">Objetivos:</p>
                      <ul className="list-disc pl-5 space-y-1">
                        {macro.objectives.slice(0, 3).map((obj, i) => (
                          <li key={i} className="truncate">{obj}</li>
                        ))}
                        {macro.objectives.length > 3 && (
                          <li className="text-slate-400 italic">+{macro.objectives.length - 3} más...</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="mt-auto">
                  <div className="mb-4">
                    <div className="flex justify-between text-xs font-medium text-slate-500 mb-1">
                      <span>Progreso</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>

                  <Link
                    href={`/admin/metodologia/planificacion/${macro.id}`}
                    className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-blue-600 font-semibold rounded-xl border border-slate-200 flex items-center justify-center gap-1 transition-colors"
                  >
                    Ver Mesociclos
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
              <h2 className="text-xl font-bold text-slate-900">Nuevo Macrociclo</h2>
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
                    placeholder="Ej. Macrociclo 1 - Preparación"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Fase</label>
                  <select
                    required
                    value={phaseType}
                    onChange={(e) => setPhaseType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Pretemporada">Pretemporada</option>
                    <option value="Inicio">Inicio</option>
                    <option value="Desarrollo">Desarrollo</option>
                    <option value="Competición">Competición</option>
                    <option value="Mantenimiento">Mantenimiento</option>
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
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Temporada</label>
                  <select
                    required
                    value={seasonId}
                    onChange={(e) => setSeasonId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {seasons.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Equipo (Opcional)</label>
                  <select
                    value={teamId}
                    onChange={(e) => setTeamId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Aplicable a todo el club</option>
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Objetivos Principales (uno por línea)</label>
                <textarea
                  rows={4}
                  value={objectivesStr}
                  onChange={(e) => setObjectivesStr(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  placeholder="- Mejorar la condición aeróbica&#10;- Integrar los principios del modelo de juego&#10;- Cohesión grupal"
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
                  {isSubmitting ? "Guardando..." : "Crear Macrociclo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
