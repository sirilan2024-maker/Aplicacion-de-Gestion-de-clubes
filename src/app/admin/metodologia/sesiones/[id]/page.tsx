"use client";

import { useState, useEffect, useMemo, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Plus, Save, Clock, Target, ArrowLeft, Search, Loader2, 
  Trash2, ArrowUp, ArrowDown, Sparkles, Activity, AlertCircle, CheckCircle2, Copy
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  recommendExercises, 
  calculateSessionMetrics, 
  SessionContext, 
  ExerciseScoreResult 
} from "@/lib/methodology/recommendationEngine";
import { 
  getMethodologySessionById, 
  updateMethodologySession,
  getRecentTeamExerciseIds 
} from "@/lib/methodology/methodologyService";

const BLOCKS = [
  { id: "activacion", name: "✨ Activación", suggestedMin: 15, tag: "Calentamiento" },
  { id: "principal_1", name: "🎯 Principal 1", suggestedMin: 20, tag: "Fijación Táctica" },
  { id: "principal_2", name: "📊 Principal 2", suggestedMin: 25, tag: "Oposición / SSG" },
  { id: "global", name: "🏟️ Global / Partido", suggestedMin: 20, tag: "Representatividad" },
  { id: "vuelta_calma", name: "🔄 Vuelta a la Calma", suggestedMin: 10, tag: "Regeneración" },
];

export default function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const sessionId = resolvedParams.id;

  const router = useRouter();
  const supabase = createClient();
  
  // Session Configuration State
  const [teamId, setTeamId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("90");
  const [ageCategory, setAgeCategory] = useState("cadete");
  const [microcycleDay, setMicrocycleDay] = useState("MD-3");
  const [intensity, setIntensity] = useState("3");
  const [objective, setObjective] = useState("");
  const [objectivesSecondary, setObjectivesSecondary] = useState<string[]>([]);
  const [numPlayers, setNumPlayers] = useState("16");
  const [numGoalkeepers, setNumGoalkeepers] = useState("2");
  const [availableSpace, setAvailableSpace] = useState("Medio campo");
  const [availableMaterial, setAvailableMaterial] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [microcycleId, setMicrocycleId] = useState("");

  // Reference data
  const [teams, setTeams] = useState<any[]>([]);
  const [microcycles, setMicrocycles] = useState<any[]>([]);
  const [exercises, setExercises] = useState<any[]>([]);
  const [recentExerciseIds, setRecentExerciseIds] = useState<string[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Search & Recommendations panel state
  const [searchTerm, setSearchTerm] = useState("");
  const [searchBlockId, setSearchBlockId] = useState<string | null>(null);

  // Session content state
  const [sessionBlocks, setSessionBlocks] = useState<Record<string, any[]>>({
    activacion: [],
    principal_1: [],
    principal_2: [],
    global: [],
    vuelta_calma: []
  });

  useEffect(() => {
    loadSessionAndReferences();
  }, [sessionId]);

  const loadSessionAndReferences = async () => {
    setIsLoading(true);
    try {
      const [sessionData, teamsRes, exercisesRes, microcyclesRes] = await Promise.all([
        getMethodologySessionById(sessionId),
        supabase.from("teams").select("*"),
        supabase.from("banco_ejercicios").select("*").order("created_at", { ascending: false }),
        supabase.from("microcycles").select("id, week_start_date, match_opponent, objective").order("week_start_date", { ascending: false }).limit(10)
      ]);

      if (teamsRes.data) setTeams(teamsRes.data);
      if (exercisesRes.data) setExercises(exercisesRes.data);
      if (microcyclesRes.data) setMicrocycles(microcyclesRes.data);

      if (sessionData) {
        setTeamId(sessionData.team_id || "");
        if (sessionData.date_time) {
          const parts = sessionData.date_time.split("T");
          setDate(parts[0]);
          setTime(parts[1]?.substring(0, 5) || "18:00");
        }
        setDuration(String(sessionData.duration_minutes || 90));
        setAgeCategory(sessionData.age_category || "cadete");
        setMicrocycleDay(sessionData.microcycle_day || "MD-3");
        setIntensity(String(sessionData.intensity_load || 3));
        setObjective(sessionData.objective || sessionData.coach_notes || "");
        setObjectivesSecondary(sessionData.objectives_secondary || []);
        setNumPlayers(String(sessionData.num_players || 16));
        setNumGoalkeepers(String(sessionData.num_goalkeepers || 2));
        setAvailableSpace(sessionData.available_space || "Medio campo");
        setAvailableMaterial(sessionData.available_material || ["balones", "conos", "petos"]);
        setLocation(sessionData.location || "Campo Principal");
        setMicrocycleId(sessionData.microcycle_id || "");
        
        if (sessionData.blocks) {
          setSessionBlocks(sessionData.blocks);
        }

        if (sessionData.team_id) {
          getRecentTeamExerciseIds(sessionData.team_id, 4).then(ids => setRecentExerciseIds(ids));
        }
      }
    } catch (error) {
      console.error("Error loading session:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const currentContext: SessionContext = useMemo(() => ({
    category: ageCategory,
    objective,
    secondaryObjectives: objectivesSecondary,
    numPlayers: parseInt(numPlayers, 10) || 16,
    durationMinutes: parseInt(duration, 10) || 90,
    microcycleDay,
    intensityLoad: parseInt(intensity, 10) || 3,
    availableSpace,
    availableMaterial,
    recentExerciseIds,
    targetBlock: searchBlockId as any || undefined
  }), [ageCategory, objective, objectivesSecondary, numPlayers, duration, microcycleDay, intensity, availableSpace, availableMaterial, recentExerciseIds, searchBlockId]);

  const recommendedExercises: ExerciseScoreResult[] = useMemo(() => {
    if (!exercises.length) return [];
    let list = exercises;
    if (searchTerm) {
      list = list.filter(ex => 
        ex.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ex.descripcion && ex.descripcion.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (ex.tipo && ex.tipo.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (ex.familia && ex.familia.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    return recommendExercises(list, currentContext, 12);
  }, [exercises, currentContext, searchTerm]);

  const sessionMetrics = useMemo(() => {
    return calculateSessionMetrics(sessionBlocks, parseInt(duration, 10) || 90);
  }, [sessionBlocks, duration]);

  const handleAddExercise = (exercise: any, blockId: string) => {
    setSessionBlocks(prev => ({
      ...prev,
      [blockId]: [
        ...prev[blockId],
        {
          ...exercise,
          unique_id: `${exercise.id}-${Date.now()}-${Math.random()}`,
          duration_min: exercise.duracion_recomendada || 15,
          drill_id: exercise.id
        }
      ]
    }));
    setSearchBlockId(null);
  };

  const handleDuplicateExercise = (blockId: string, index: number) => {
    const ex = sessionBlocks[blockId][index];
    setSessionBlocks(prev => ({
      ...prev,
      [blockId]: [
        ...prev[blockId].slice(0, index + 1),
        { ...ex, unique_id: `${ex.id}-${Date.now()}-${Math.random()}` },
        ...prev[blockId].slice(index + 1)
      ]
    }));
  };

  const handleRemoveExercise = (blockId: string, index: number) => {
    setSessionBlocks(prev => {
      const newBlock = [...prev[blockId]];
      newBlock.splice(index, 1);
      return { ...prev, [blockId]: newBlock };
    });
  };

  const moveExercise = (blockId: string, index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === sessionBlocks[blockId].length - 1)
    ) return;
    
    setSessionBlocks(prev => {
      const newBlock = [...prev[blockId]];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      const temp = newBlock[index];
      newBlock[index] = newBlock[targetIndex];
      newBlock[targetIndex] = temp;
      return { ...prev, [blockId]: newBlock };
    });
  };

  const updateExerciseDuration = (blockId: string, index: number, newDuration: number) => {
    setSessionBlocks(prev => {
      const newBlock = [...prev[blockId]];
      newBlock[index] = { ...newBlock[index], duration_min: Math.max(1, newDuration) };
      return { ...prev, [blockId]: newBlock };
    });
  };

  const handleUpdate = async (isDraft: boolean) => {
    setIsSaving(true);
    try {
      let date_time = null;
      if (date && time) {
        date_time = `${date}T${time}:00`;
      }

      await updateMethodologySession(sessionId, {
        teamId,
        microcycleId: microcycleId || undefined,
        dateTime: date_time || new Date().toISOString(),
        durationMinutes: sessionMetrics.totalDurationMin || parseInt(duration, 10),
        location,
        ageCategory,
        microcycleDay,
        intensityLoad: parseInt(intensity, 10),
        objective,
        objectivesSecondary,
        numPlayers: parseInt(numPlayers, 10) || 16,
        numGoalkeepers: parseInt(numGoalkeepers, 10) || 2,
        availableSpace,
        availableMaterial,
        estimatedLoad: sessionMetrics.estimatedMethodologicalLoad,
        isCompleted: !isDraft,
        coachNotes: objective,
        blocks: sessionBlocks
      });

      router.push("/admin/metodologia/sesiones");
    } catch (error) {
      console.error("Error updating session:", error);
      alert("Error al actualizar la sesión");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto min-h-screen flex flex-col space-y-6">
      
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white border border-slate-200 p-4 md:px-6 rounded-2xl shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/admin/metodologia/sesiones" className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                Sesión Guardada
              </span>
              <span className="text-xs font-bold text-slate-400">• ID: {sessionId.substring(0, 8)}...</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {objective || "Sesión de Entrenamiento"}
            </h1>
          </div>
        </div>

        {/* METRICS QUICK BAR */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>{sessionMetrics.totalDurationMin} / {duration}&apos;</span>
            {sessionMetrics.durationAlert === 'optimal' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-500" />
            )}
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
            <Activity className="w-4 h-4 text-purple-600" />
            <span>Carga: {sessionMetrics.estimatedMethodologicalLoad}%</span>
          </div>

          <div className="flex gap-2">
            <Link
              href={`/admin/metodologia/sesiones/${sessionId}/evaluacion`}
              className="px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 border border-purple-200"
            >
              <Target className="w-3.5 h-3.5 text-purple-600" />
              Evaluar Sesión
            </Link>
            <button 
              onClick={() => handleUpdate(true)}
              disabled={isSaving}
              className="px-4 py-2 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition-colors"
            >
              Guardar Borrador
            </button>
            <button 
              onClick={() => handleUpdate(false)}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-500 transition-all flex items-center gap-2 shadow-sm"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>

      {/* MAIN TWO-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
        
        {/* LEFT COLUMN: PARAMETERS */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
              <Target className="w-4 h-4 text-blue-600" />
              Parámetros de la Sesión
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Equipo</label>
                <select 
                  value={teamId} 
                  onChange={e => setTeamId(e.target.value)} 
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                >
                  <option value="">Seleccionar...</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Categoría</label>
                <select 
                  value={ageCategory} 
                  onChange={e => setAgeCategory(e.target.value)} 
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                >
                  <option value="querubin">U6 / Querubín</option>
                  <option value="prebenjamin">U7-U8 / Prebenjamín</option>
                  <option value="benjamin">U9-U10 / Benjamín</option>
                  <option value="alevin">U11-U12 / Alevín</option>
                  <option value="infantil">U13-U14 / Infantil</option>
                  <option value="cadete">U15-U16 / Cadete</option>
                  <option value="juvenil">U17-U19 / Juvenil</option>
                  <option value="senior">Senior / Amateur</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Fecha</label>
                <input 
                  type="date" 
                  value={date} 
                  onChange={e => setDate(e.target.value)} 
                  className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none" 
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Hora</label>
                <input 
                  type="time" 
                  value={time} 
                  onChange={e => setTime(e.target.value)} 
                  className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none" 
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Planificado</label>
                <input 
                  type="number" 
                  value={duration} 
                  onChange={e => setDuration(e.target.value)} 
                  className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Día Microciclo</label>
                <select 
                  value={microcycleDay} 
                  onChange={e => setMicrocycleDay(e.target.value)} 
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                >
                  <option value="MD+1">MD+1 (Recuperación)</option>
                  <option value="MD-4">MD-4 (Capacidad aeróbica)</option>
                  <option value="MD-3">MD-3 (Tensión / Fuerza)</option>
                  <option value="MD-2">MD-2 (Espacio amplio / Duración)</option>
                  <option value="MD-1">MD-1 (Velocidad / Reactividad)</option>
                  <option value="MD">MD (Día de Partido)</option>
                  <option value="REST">Descanso</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Intensidad (1-5)</label>
                <input 
                  type="range" 
                  min="1" 
                  max="5" 
                  value={intensity} 
                  onChange={e => setIntensity(e.target.value)} 
                  className="w-full mt-2 accent-blue-600" 
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Objetivo Principal</label>
              <input 
                type="text" 
                value={objective} 
                onChange={e => setObjective(e.target.value)} 
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>
          </div>

          {/* LOAD SUMMARY CARD */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              Carga Metodológica Estimada
            </h3>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Carga Física</span>
                <span className="font-black text-slate-800 text-sm">{sessionMetrics.avgCargaFisica} / 4</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Carga Cognitiva</span>
                <span className="font-black text-slate-800 text-sm">{sessionMetrics.avgCargaCognitiva} / 4</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Oposición</span>
                <span className="font-black text-slate-800 text-sm">{sessionMetrics.avgOposicion} / 4</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Representatividad</span>
                <span className="font-black text-slate-800 text-sm">{sessionMetrics.avgRepresentatividad} / 4</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: BLOCKS */}
        <div className="lg:col-span-8 space-y-4">
          {BLOCKS.map(block => {
            const blockExercises = sessionBlocks[block.id] || [];
            const blockMinutes = blockExercises.reduce((sum, e) => sum + (Number(e.duration_min) || 0), 0);

            return (
              <div key={block.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900">{block.name}</h3>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {block.tag}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-500">
                      {blockMinutes} min (Sugerido: {block.suggestedMin}&apos;)
                    </span>
                    <button
                      onClick={() => setSearchBlockId(searchBlockId === block.id ? null : block.id)}
                      className="flex items-center gap-1.5 text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 py-1.5 px-3 rounded-xl transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {searchBlockId === block.id ? "Cerrar Sugerencias" : "+ Añadir / Recomendar"}
                    </button>
                  </div>
                </div>

                {blockExercises.length === 0 ? (
                  <div className="p-4 border-2 border-dashed border-slate-100 rounded-xl text-center text-xs font-medium text-slate-400">
                    Bloque vacío. Pulsa en &quot;+ Añadir / Recomendar&quot; para seleccionar tareas metodológicas.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {blockExercises.map((ex, index) => (
                      <div 
                        key={ex.unique_id || index}
                        className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl transition-all gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex flex-col gap-0.5 text-slate-400">
                            <button 
                              onClick={() => moveExercise(block.id, index, 'up')}
                              disabled={index === 0}
                              className="hover:text-slate-700 disabled:opacity-30"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => moveExercise(block.id, index, 'down')}
                              disabled={index === blockExercises.length - 1}
                              className="hover:text-slate-700 disabled:opacity-30"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-black text-slate-900 truncate">{ex.nombre}</h4>
                              <span className="text-[10px] font-bold bg-white border border-slate-200 px-1.5 py-0.2 rounded text-slate-600">
                                {ex.tipo}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              {ex.familia || 'Táctica'} • {ex.espacio || '20x20m'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-1">
                            <input 
                              type="number"
                              value={ex.duration_min}
                              onChange={e => updateExerciseDuration(block.id, index, parseInt(e.target.value, 10))}
                              className="w-12 px-1.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-center"
                            />
                            <span className="text-xs font-bold text-slate-400">min</span>
                          </div>

                          <button 
                            onClick={() => handleDuplicateExercise(block.id, index)}
                            title="Duplicar tarea"
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-white transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <button 
                            onClick={() => handleRemoveExercise(block.id, index)}
                            title="Eliminar tarea"
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {searchBlockId === block.id && (
                  <div className="pt-3 border-t border-slate-100 space-y-3 bg-blue-50/50 p-4 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                          Recomendaciones para {block.name}
                        </span>
                      </div>
                      <div className="relative w-48">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Filtrar..."
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                          className="w-full pl-8 pr-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                      {recommendedExercises.map(rec => (
                        <div 
                          key={rec.exercise.id}
                          className="bg-white border border-blue-200/80 rounded-xl p-3 shadow-xs hover:border-blue-500 transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[10px] font-black uppercase px-1.5 py-0.2 rounded bg-blue-50 text-blue-700">
                                Score: {rec.score} pts
                              </span>
                              <span className="text-[10px] font-bold text-slate-400">
                                {rec.exercise.age_category || 'General'}
                              </span>
                            </div>
                            <h4 className="text-xs font-black text-slate-900 mt-1 line-clamp-1">
                              {rec.exercise.nombre}
                            </h4>
                            <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                              {rec.exercise.descripcion}
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400">
                              {rec.exercise.duracion_recomendada || 15}&apos; • {rec.exercise.tipo}
                            </span>
                            <button
                              onClick={() => handleAddExercise(rec.exercise, block.id)}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              Añadir
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
}
