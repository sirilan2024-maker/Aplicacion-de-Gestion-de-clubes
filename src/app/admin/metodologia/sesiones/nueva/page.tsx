"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Plus, Save, Clock, Target, ArrowLeft, Search, Loader2, GripVertical, 
  X, Trash2, ArrowUp, ArrowDown, Sparkles, Activity, Brain, Shield,
  Maximize, AlertCircle, CheckCircle2, Copy, RefreshCw, ChevronRight, Layers, Users
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
  getRecentTeamExerciseIds, 
  saveMethodologySession,
  getTeamMethodologySummary
} from "@/lib/methodology/methodologyService";
import {
  calculateMethodologyPriorities,
  MethodologyPriority
} from "@/lib/methodology/methodologyPriorityEngine";
import {
  generateMethodologySessionProposal,
  regenerateSessionBlock,
  validateMethodologySessionProposal,
  SessionProposal
} from "@/lib/methodology/methodologySessionGenerator";

// Block structure definitions
const BLOCKS = [
  { id: "activacion", name: "✨ Activación", suggestedMin: 15, tag: "Calentamiento" },
  { id: "principal_1", name: "🎯 Principal 1", suggestedMin: 20, tag: "Fijación Táctica" },
  { id: "principal_2", name: "📊 Principal 2", suggestedMin: 25, tag: "Oposición / SSG" },
  { id: "global", name: "🏟️ Global / Partido", suggestedMin: 20, tag: "Representatividad" },
  { id: "vuelta_calma", name: "🔄 Vuelta a la Calma", suggestedMin: 10, tag: "Regeneración" },
];

export default function SessionBuilderPage() {
  const router = useRouter();
  const supabase = createClient();
  
  // 1. Session Configuration
  const [teamId, setTeamId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState("18:00");
  const [duration, setDuration] = useState("90");
  const [ageCategory, setAgeCategory] = useState("cadete");
  const [microcycleDay, setMicrocycleDay] = useState("MD-3");
  const [intensity, setIntensity] = useState("3");
  const [objective, setObjective] = useState("Presión tras pérdida");
  const [objectivesSecondary, setObjectivesSecondary] = useState<string[]>(["Transición defensiva"]);
  const [numPlayers, setNumPlayers] = useState("16");
  const [numGoalkeepers, setNumGoalkeepers] = useState("2");
  const [availableSpace, setAvailableSpace] = useState("Medio campo");
  const [availableMaterial, setAvailableMaterial] = useState<string[]>(["balones", "conos", "petos"]);
  const [location, setLocation] = useState("Campo Principal");
  const [microcycleId, setMicrocycleId] = useState("");

  // Reference data
  const [teams, setTeams] = useState<any[]>([]);
  const [microcycles, setMicrocycles] = useState<any[]>([]);
  const [exercises, setExercises] = useState<any[]>([]);
  const [recentExerciseIds, setRecentExerciseIds] = useState<string[]>([]);
  const [curriculumObjectives, setCurriculumObjectives] = useState<string[]>([]);
  const [curriculumPrinciplesList, setCurriculumPrinciplesList] = useState<any[]>([]);
  
  // Priorities Intelligence State
  const [priorities, setPriorities] = useState<MethodologyPriority[]>([]);
  const [selectedPriority, setSelectedPriority] = useState<MethodologyPriority | null>(null);
  const [isLoadingPriorities, setIsLoadingPriorities] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Search & Recommendations panel state
  const [searchTerm, setSearchTerm] = useState("");
  const [searchBlockId, setSearchBlockId] = useState<string | null>(null);
  const [selectedExDetail, setSelectedExDetail] = useState<any | null>(null);

  // Session content state
  const [sessionBlocks, setSessionBlocks] = useState<Record<string, any[]>>({
    activacion: [],
    principal_1: [],
    principal_2: [],
    global: [],
    vuelta_calma: []
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (teamId) {
      // Fetch recent exercises to prevent repetition
      getRecentTeamExerciseIds(teamId, 4).then(ids => setRecentExerciseIds(ids));
      // Auto-set age category based on selected team if available
      const selTeam = teams.find(t => t.id === teamId);
      if (selTeam?.category) {
        setAgeCategory(selTeam.category.toLowerCase());
      }
      loadTeamPriorities(teamId, microcycleDay);
    }
  }, [teamId, microcycleDay, teams]);

  const loadTeamPriorities = async (targetTeamId: string, currentMd: string) => {
    setIsLoadingPriorities(true);
    try {
      const summary = await getTeamMethodologySummary(targetTeamId);
      const calculated = calculateMethodologyPriorities({
        teamId: targetTeamId,
        date,
        microcycleDay: currentMd,
        currentObjective: objective,
        summary,
        curriculumPrinciples: curriculumPrinciplesList
      });
      setPriorities(calculated);
    } catch (error) {
      console.error("Error loading team priorities:", error);
    } finally {
      setIsLoadingPriorities(false);
    }
  };

  const fetchInitialData = async () => {
    try {
      const [teamsRes, exercisesRes, microcyclesRes, curriculumRes, principlesRes] = await Promise.all([
        supabase.from("teams").select("*").order("name"),
        supabase.from("banco_ejercicios").select("*").order("created_at", { ascending: false }).order("id", { ascending: true }),
        supabase.from("microcycles").select("id, week_start_date, match_opponent, objective").order("week_start_date", { ascending: false }).order("id", { ascending: true }).limit(10),
        supabase.from("methodology_curriculum").select("objectives, priority_families").order("created_at", { ascending: true }),
        supabase.from("methodology_principles").select("id, name, game_phase").order("sort_order", { ascending: true }).order("id", { ascending: true })
      ]);

      if (teamsRes.data) setTeams(teamsRes.data);
      if (exercisesRes.data) setExercises(exercisesRes.data);
      if (microcyclesRes.data) setMicrocycles(microcyclesRes.data);
      if (principlesRes.data) setCurriculumPrinciplesList(principlesRes.data);

      if (curriculumRes.data) {
        const allObjs = new Set<string>();
        curriculumRes.data.forEach(c => (c.objectives || []).forEach((o: string) => allObjs.add(o)));
        setCurriculumObjectives(Array.from(allObjs));
      }
    } catch (error) {
      console.error("Error loading builder data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyPriority = (priority: MethodologyPriority) => {
    setSelectedPriority(priority);
    if (priority.suggestedObjective) {
      setObjective(priority.suggestedObjective);
    }
  };

  const handleRemovePriority = () => {
    setSelectedPriority(null);
  };

  // Build Context for Deterministic Recommendation Engine
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
    targetBlock: searchBlockId as any || undefined,
    priorityContext: selectedPriority?.suggestedObjective || selectedPriority?.title || undefined
  }), [ageCategory, objective, objectivesSecondary, numPlayers, duration, microcycleDay, intensity, availableSpace, availableMaterial, recentExerciseIds, searchBlockId, selectedPriority]);

  // Real-time Recommendations
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

  // Session Real-time Metrics Calculation
  const sessionMetrics = useMemo(() => {
    return calculateSessionMetrics(sessionBlocks, parseInt(duration, 10) || 90);
  }, [sessionBlocks, duration]);

  // Assisted Generator State
  const [generatedProposal, setGeneratedProposal] = useState<SessionProposal | null>(null);
  const [showProposalModal, setShowProposalModal] = useState(false);

  // Live Session Validation
  const sessionValidation = useMemo(() => {
    return validateMethodologySessionProposal({
      durationMinutes: parseInt(duration, 10) || 90,
      blocks: sessionBlocks,
      microcycleDay
    });
  }, [sessionBlocks, duration, microcycleDay]);

  const handleGenerateProposal = () => {
    if (!exercises.length) {
      alert("No hay ejercicios disponibles en la biblioteca para generar la propuesta.");
      return;
    }

    const proposal = generateMethodologySessionProposal({
      ...currentContext,
      teamId: teamId || "default-team",
      allExercises: exercises
    });

    setGeneratedProposal(proposal);
    setShowProposalModal(true);
  };

  const handleApplyProposal = () => {
    if (!generatedProposal) return;

    const newBlocks: Record<string, any[]> = {
      activacion: [],
      principal_1: [],
      principal_2: [],
      global: [],
      vuelta_calma: []
    };

    Object.entries(generatedProposal.blocks).forEach(([blockId, b]) => {
      if (b.exercise) {
        newBlocks[blockId] = [{
          ...b.exercise,
          unique_id: `${blockId}-${b.exercise.id}-0`,
          duration_min: b.durationMin,
          drill_id: b.exercise.id
        }];
      }
    });

    setSessionBlocks(newBlocks);
    setShowProposalModal(false);
  };

  const handleRegenerateSingleBlock = (blockId: 'activacion' | 'principal_1' | 'principal_2' | 'global' | 'vuelta_calma') => {
    if (!exercises.length) return;

    // Crear propuesta temporal a partir del estado actual
    const currentBlocksMap: Record<string, any> = {};
    Object.entries(sessionBlocks).forEach(([bId, bList]) => {
      const firstEx = bList[0];
      if (firstEx) {
        currentBlocksMap[bId] = {
          blockId: bId,
          blockName: BLOCKS.find(b => b.id === bId)?.name || bId,
          durationMin: firstEx.duration_min || 15,
          exercise: firstEx,
          score: 100,
          selectionReasons: []
        };
      }
    });

    const tempProposal: SessionProposal = {
      teamId: teamId || "default-team",
      category: ageCategory,
      objective,
      secondaryObjectives: objectivesSecondary,
      microcycleDay,
      plannedDurationMin: parseInt(duration, 10) || 90,
      totalDurationMin: parseInt(duration, 10) || 90,
      numPlayers: parseInt(numPlayers, 10) || 16,
      intensityLoad: parseInt(intensity, 10) || 3,
      priorityContext: selectedPriority?.suggestedObjective || selectedPriority?.title,
      blocks: currentBlocksMap,
      sessionReasons: [],
      rationale: [],
      metrics: sessionMetrics
    };

    const updated = regenerateSessionBlock(tempProposal, blockId, {
      ...currentContext,
      teamId: teamId || "default-team",
      allExercises: exercises
    });

    const newEx = updated.blocks[blockId]?.exercise;
    if (newEx) {
      setSessionBlocks(prev => ({
        ...prev,
        [blockId]: [{
          ...newEx,
          unique_id: `${blockId}-${newEx.id}-0`,
          duration_min: updated.blocks[blockId].durationMin || 15,
          drill_id: newEx.id
        }]
      }));
    }
  };

  // Block handlers
  const handleAddExercise = (exercise: any, blockId: string) => {
    setSessionBlocks(prev => {
      const currentList = prev[blockId] || [];
      return {
        ...prev,
        [blockId]: [
          ...currentList,
          {
            ...exercise,
            unique_id: `${blockId}-${exercise.id}-${currentList.length}`,
            duration_min: exercise.duracion_recomendada || 15,
            drill_id: exercise.id
          }
        ]
      };
    });
    setSearchBlockId(null);
  };

  const handleDuplicateExercise = (blockId: string, index: number) => {
    const ex = sessionBlocks[blockId][index];
    setSessionBlocks(prev => ({
      ...prev,
      [blockId]: [
        ...prev[blockId].slice(0, index + 1),
        { ...ex, unique_id: `${blockId}-${ex.id}-${prev[blockId].length}` },
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

  const handleSave = async (isDraft: boolean) => {
    if (sessionMetrics.durationAlert === 'warning_long' && !isDraft) {
      if (!confirm(`La sesión supera la duración planificada (${sessionMetrics.totalDurationMin} min vs ${sessionMetrics.plannedDurationMin} min planificados). ¿Deseas guardar de todos modos?`)) {
        return;
      }
    }

    setIsSaving(true);
    try {
      let date_time = null;
      if (date && time) {
        date_time = `${date}T${time}:00`;
      }

      await saveMethodologySession({
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
      console.error("Error saving session:", error);
      alert("Error al guardar la sesión en el sistema");
    } finally {
      setIsSaving(false);
    }
  };

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
              <span className="text-[11px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                Planificador v1.0
              </span>
              <span className="text-xs font-bold text-slate-400">• Motor Determinista Activo</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Constructor de Sesión Metodológica</h1>
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
            <span>Carga Metodológica: {sessionMetrics.estimatedMethodologicalLoad}%</span>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleGenerateProposal}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
              title="Generar propuesta estructurada de 5 bloques"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Generar Propuesta Asistida
            </button>
            <button 
              onClick={() => handleSave(true)}
              disabled={isSaving}
              className="px-4 py-2 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition-colors"
            >
              Guardar Borrador
            </button>
            <button 
              onClick={() => handleSave(false)}
              disabled={isSaving || !sessionValidation.valid}
              className={`px-4 py-2 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 shadow-sm ${
                !sessionValidation.valid 
                  ? 'bg-slate-400 cursor-not-allowed' 
                  : sessionValidation.warnings.length > 0
                    ? 'bg-amber-600 hover:bg-amber-500'
                    : 'bg-blue-600 hover:bg-blue-500'
              }`}
              title={!sessionValidation.valid ? sessionValidation.errors[0] : (sessionValidation.warnings.length > 0 ? "Guardar con advertencias confirmadas" : "Confirmar y guardar sesión")}
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {sessionValidation.warnings.length > 0 && sessionValidation.valid ? "Confirmar y Guardar (con avisos)" : "Confirmar y Guardar Sesión"}
            </button>
          </div>
        </div>
      </div>

      {/* LIVE VALIDATION ALERTS (IF ANY) */}
      {(!sessionValidation.valid || sessionValidation.warnings.length > 0) && (
        <div className="space-y-2">
          {sessionValidation.errors.map((err, i) => (
            <div key={`err-${i}`} className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs font-bold text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{err}</span>
            </div>
          ))}
          {sessionValidation.warnings.map((warn, i) => (
            <div key={`warn-${i}`} className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs font-bold text-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{warn}</span>
            </div>
          ))}
        </div>
      )}

      {/* METHODOLOGY INTELLIGENCE & PRIORITIES PANEL */}
      {teamId && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                <Brain className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  Inteligencia Metodológica & Prioridades de Planificación
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Sugerencias deterministas extraídas del histórico y evaluaciones del equipo
                </p>
              </div>
            </div>

            {selectedPriority && (
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-900">
                <span>Prioridad Activa: <strong className="text-blue-700">{selectedPriority.suggestedObjective || selectedPriority.title}</strong></span>
                <button
                  type="button"
                  onClick={handleRemovePriority}
                  className="p-1 hover:bg-blue-100 rounded-md text-blue-600 ml-1"
                  title="Quitar prioridad"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {isLoadingPriorities ? (
            <div className="py-4 flex items-center justify-center gap-2 text-xs font-bold text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" /> Analizando histórico del equipo...
            </div>
          ) : priorities.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2">
              No hay alertas críticas pendientes para este equipo. Cobertura del modelo y carga en parámetros óptimos.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {priorities.slice(0, 3).map((p) => {
                const isSelected = selectedPriority?.id === p.id;
                return (
                  <div 
                    key={p.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${
                      isSelected 
                        ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20' 
                        : p.priority === 'high'
                          ? 'bg-rose-50/50 border-rose-200'
                          : p.priority === 'medium'
                            ? 'bg-amber-50/50 border-amber-200'
                            : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                          p.priority === 'high'
                            ? 'bg-rose-100 text-rose-800'
                            : p.priority === 'medium'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-200 text-slate-700'
                        }`}>
                          Prioridad {p.priority === 'high' ? 'Alta' : p.priority === 'medium' ? 'Media' : 'Informativa'}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          {p.type.replace('_', ' ')}
                        </span>
                      </div>

                      <h4 className="text-xs font-black text-slate-900">
                        {p.title}
                      </h4>

                      <p className="text-[11px] text-slate-600 font-medium line-clamp-2">
                        {p.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-slate-500 truncate" title={p.explanation}>
                        {p.evidence.daysSinceLastWork ? `Hace ${p.evidence.daysSinceLastWork} días` : (p.evidence.avgScore ? `Media: ${p.evidence.avgScore}/4 (${p.evidence.sampleSize} obs)` : 'Basado en MD')}
                      </span>

                      <button
                        type="button"
                        onClick={() => isSelected ? handleRemovePriority() : handleApplyPriority(p)}
                        className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-colors shrink-0 ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white border border-slate-200 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        {isSelected ? 'Aplicada ✓' : 'Aplicar'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MAIN TWO-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
        
        {/* LEFT COLUMN: 12 CONTEXT PARAMETERS (4 COLS) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
              <Target className="w-4 h-4 text-blue-600" />
              Parámetros de la Sesión
            </h2>

            {/* Equipo & Categoría */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Equipo</label>
                <select 
                  value={teamId} 
                  onChange={e => setTeamId(e.target.value)} 
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar Equipo...</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Categoría</label>
                <select 
                  value={ageCategory} 
                  onChange={e => setAgeCategory(e.target.value)} 
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
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

            {/* Fecha, Hora y Duración */}
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

            {/* Jugadores & Porteros */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Nº Jugadores</label>
                <input 
                  type="number" 
                  value={numPlayers} 
                  onChange={e => setNumPlayers(e.target.value)} 
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none" 
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Porteros</label>
                <input 
                  type="number" 
                  value={numGoalkeepers} 
                  onChange={e => setNumGoalkeepers(e.target.value)} 
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none" 
                />
              </div>
            </div>

            {/* Microciclo Context (MD) & Intensidad */}
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

            {/* Objetivo Principal */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Objetivo Principal</label>
              <input 
                type="text" 
                value={objective} 
                onChange={e => setObjective(e.target.value)} 
                placeholder="Ej: Presión tras pérdida, Salida de balón, Tercer hombre..." 
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>

            {/* Espacio & Ubicación */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Espacio Disp.</label>
                <input 
                  type="text" 
                  value={availableSpace} 
                  onChange={e => setAvailableSpace(e.target.value)} 
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none" 
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Ubicación</label>
                <input 
                  type="text" 
                  value={location} 
                  onChange={e => setLocation(e.target.value)} 
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none" 
                />
              </div>
            </div>

            {/* Microciclo Vinculado */}
            {microcycles.length > 0 && (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Vincular a Microciclo</label>
                <select 
                  value={microcycleId} 
                  onChange={e => setMicrocycleId(e.target.value)} 
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                >
                  <option value="">Ninguno / Sesión independiente</option>
                  {microcycles.map(m => (
                    <option key={m.id} value={m.id}>
                      Semana {m.week_start_date} {m.match_opponent ? `vs ${m.match_opponent}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
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

            {sessionMetrics.principlesCovered.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Principios Cubiertos
                </span>
                <div className="flex flex-wrap gap-1">
                  {sessionMetrics.principlesCovered.map((p, i) => (
                    <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: 5 SESSION BLOCKS + RECOMMENDATIONS (8 COLS) */}
        <div className="lg:col-span-8 space-y-4">
          
          {BLOCKS.map(block => {
            const blockExercises = sessionBlocks[block.id] || [];
            const blockMinutes = blockExercises.reduce((sum, e) => sum + (Number(e.duration_min) || 0), 0);

            return (
              <div key={block.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                
                {/* Block Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900">{block.name}</h3>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {block.tag}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 mr-1">
                      {blockMinutes} min (Sugerido: {block.suggestedMin}&apos;)
                    </span>
                    {blockExercises.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleRegenerateSingleBlock(block.id as any)}
                        className="flex items-center gap-1 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 px-2.5 rounded-xl transition-all"
                        title="Regenerar y rotar el ejercicio de este bloque"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Regenerar
                      </button>
                    )}
                    <button
                      onClick={() => setSearchBlockId(searchBlockId === block.id ? null : block.id)}
                      className="flex items-center gap-1.5 text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 py-1.5 px-3 rounded-xl transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {searchBlockId === block.id ? "Cerrar" : "+ Añadir / Recomendar"}
                    </button>
                  </div>
                </div>

                {/* Exercises in Block */}
                {blockExercises.length === 0 ? (
                  <div className="p-4 border-2 border-dashed border-slate-100 rounded-xl text-center text-xs font-medium text-slate-400">
                    Bloque vacío. Pulsa en &quot;+ Añadir / Recomendar&quot; o usa &quot;Generar Propuesta Asistida&quot;.
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
                              <span className="font-bold text-xs text-slate-900 truncate">{ex.nombre}</span>
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-white border border-slate-200 text-slate-600 shrink-0">
                                {ex.tipo}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate max-w-md">
                              {ex.objetivo_tactico?.join(", ") || ex.descripcion || "Sin descripción"}
                            </p>
                          </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1">
                            <input 
                              type="number"
                              value={ex.duration_min || 15}
                              onChange={(e) => updateExerciseDuration(block.id, index, parseInt(e.target.value, 10) || 0)}
                              className="w-10 text-xs font-bold text-center outline-none bg-transparent"
                            />
                            <span className="text-[10px] font-medium text-slate-400">min</span>
                          </div>

                          <button 
                            onClick={() => handleDuplicateExercise(block.id, index)}
                            title="Duplicar tarea"
                            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <button 
                            onClick={() => handleRemoveExercise(block.id, index)}
                            title="Eliminar de la sesión"
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Recommendations slide-down drawer */}
                {searchBlockId === block.id && (
                  <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-blue-900">
                          Tareas Sugeridas por el Motor Metodológico
                        </h4>
                      </div>
                      <span className="text-[10px] font-bold text-blue-600 bg-white border border-blue-200 px-2 py-0.5 rounded-lg">
                        Scoring Ponderado
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                      {recommendedExercises.slice(0, 6).map((rec) => (
                        <div 
                          key={rec.exercise.id} 
                          className="p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-400 transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex justify-between items-start">
                              <span className="text-[10px] font-black uppercase text-blue-600">
                                Compatibilidad: {rec.score} pts
                              </span>
                            </div>
                            <h4 className="font-black text-xs text-slate-900 mt-1 truncate">
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

      {/* PROPOSAL PREVIEW MODAL */}
      {showProposalModal && generatedProposal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-4xl w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md">
                    Propuesta Asistida Generada
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    • {generatedProposal.plannedDurationMin} minutos • MD {generatedProposal.microcycleDay}
                  </span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 mt-1">
                  {generatedProposal.objective}
                </h3>
              </div>
              <button 
                onClick={() => setShowProposalModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* RATIONALE CARDS */}
            <div className="p-4 bg-purple-50/60 border border-purple-100 rounded-2xl space-y-2">
              <span className="text-[11px] font-black uppercase text-purple-900 flex items-center gap-1.5">
                <Brain className="w-4 h-4 text-purple-600" />
                Justificación Metodológica de la Propuesta
              </span>
              <ul className="text-xs font-medium text-purple-800 space-y-1 list-disc list-inside">
                {generatedProposal.rationale.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>

            {/* 5 BLOCKS PREVIEW */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Estructura de los 5 Bloques Propuestos
              </h4>

              <div className="space-y-2.5">
                {Object.values(generatedProposal.blocks).map((b) => (
                  <div key={b.blockId} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-xs text-slate-900">{b.blockName}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                          {b.durationMin} min
                        </span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                          Compatibilidad: {b.score} pts
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700">
                          Carga: {b.estimatedLoad}%
                        </span>
                      </div>
                      <h5 className="text-sm font-black text-slate-800">{b.exercise?.nombre}</h5>
                      <p className="text-xs text-slate-500 font-medium line-clamp-1">{b.exercise?.descripcion}</p>
                      <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-400">
                        <span>🎯 {b.objective}</span>
                        <span>📐 {b.space}</span>
                        <span>⚽ {Array.isArray(b.material) ? b.material.join(", ") : b.material}</span>
                      </div>
                    </div>

                    <div className="text-[11px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200/60 p-2.5 rounded-xl shrink-0 max-w-xs">
                      ✓ {b.selectionReasons[0]}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* MODAL ACTIONS */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowProposalModal(false)}
                className="px-4 py-2.5 border border-slate-200 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-50"
              >
                Descartar y Ajustar Manualmente
              </button>
              <button
                type="button"
                onClick={handleApplyProposal}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirmar y Aplicar Propuesta al Constructor
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
