"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getFullMethodologyCurriculumAction } from "@/app/actions/methodology-actions";
import {
  Brain,
  Target,
  BookOpen,
  ChevronRight,
  ChevronDown,
  ShieldAlert,
  Swords,
  Shield,
  RefreshCw,
  Activity,
  Layers,
  Sparkles,
  Users,
  CheckCircle2,
  ListOrdered,
  Tag,
  ArrowRight,
  Info,
  Dumbbell,
  HeartHandshake,
  Compass,
  Clock,
  ExternalLink,
  X,
  Play,
  Zap,
  Flame,
  Plus,
  PlusCircle,
  Eye,
  Sliders
} from "lucide-react";
import Link from "next/link";

interface Behaviour {
  id: string;
  description: string;
  age_categories?: string[];
  performance_indicators?: string[];
}

interface Subprinciple {
  id: string;
  name: string;
  description?: string;
  methodology_behaviours?: Behaviour[];
}

interface Principle {
  id: string;
  name: string;
  game_phase: string;
  description?: string;
  curriculum_id?: string;
  methodology_subprinciples?: Subprinciple[];
}

interface Curriculum {
  id: string;
  category_code: string;
  category_label: string;
  age_min?: number;
  age_max?: number;
  philosophy_text?: string;
  objectives?: string[];
  priority_families?: string[];
  color?: string;
}

interface Exercise {
  id: string;
  nombre: string;
  tipo?: string;
  descripcion?: string;
  duracion_recomendada?: number;
  min_players?: number;
  max_players?: number;
  espacio?: string;
  carga_fisica?: number;
  carga_cognitiva?: number;
  objetivo_tactico?: string[];
  objetivo_tecnico?: string[];
  tags?: string[];
  game_phase?: string;
  age_category?: string;
  categoria_edad?: string[];
  bloque_sesion?: string;
  variantes?: string[];
  criterios_exito?: string[];
  correcciones?: string;
}

interface ScoredExercise {
  exercise: Exercise;
  score: number;
  compatibilityLevel: "ALTA" | "MEDIA" | "ADAPTABLE";
  stageBadge: string;
  matchReasons: string[];
}

const CATEGORIES = [
  { id: "U6", code: "U6", slug: "querubin", name: "Querubín", age: "4-5 años", color: "bg-pink-50 text-pink-700 border-pink-200" },
  { id: "U7-U8", code: "U7-U8", slug: "prebenjamin", name: "Prebenjamín", age: "6-7 años", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { id: "U9-U10", code: "U9-U10", slug: "benjamin", name: "Benjamín", age: "8-9 años", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "U11-U12", code: "U11-U12", slug: "alevin", name: "Alevín", age: "10-11 años", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { id: "U13-U14", code: "U13-U14", slug: "infantil", name: "Infantil", age: "12-13 años", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "U15-U16", code: "U15-U16", slug: "cadete", name: "Cadete", age: "14-15 años", color: "bg-orange-50 text-orange-700 border-orange-200" },
  { id: "U17-U19", code: "U17-U19", slug: "juvenil", name: "Juvenil", age: "16-18 años", color: "bg-rose-50 text-rose-700 border-rose-200" },
  { id: "Senior", code: "Senior", slug: "senior", name: "Amateur / Senior", age: "+19 años", color: "bg-slate-100 text-slate-700 border-slate-200" },
];

const GAME_PHASES = [
  { 
    id: "Ataque", 
    label: "Ataque Organizado", 
    description: "Construcción, progresión, desequilibrio y finalización con posesión del balón.", 
    icon: Swords, 
    badgeClass: "bg-blue-100 text-blue-800 border-blue-200", 
    iconClass: "text-blue-600",
    bgClass: "bg-blue-50/40"
  },
  { 
    id: "Defensa", 
    label: "Defensa Organizada", 
    description: "Presión, repliegue, basculación y protección de la portería sin balón.", 
    icon: Shield, 
    badgeClass: "bg-rose-100 text-rose-800 border-rose-200", 
    iconClass: "text-rose-600",
    bgClass: "bg-rose-50/40"
  },
  { 
    id: "Transición Ataque-Defensa", 
    label: "Transición Ataque-Defensa", 
    description: "Pérdida de balón: presión instantánea tras pérdida o reorganización defensiva.", 
    icon: RefreshCw, 
    badgeClass: "bg-amber-100 text-amber-800 border-amber-200", 
    iconClass: "text-amber-600",
    bgClass: "bg-amber-50/40"
  },
  { 
    id: "Transición Defensa-Ataque", 
    label: "Transición Defensa-Ataque", 
    description: "Recuperación de balón: contraataque rápido o salida protegida.", 
    icon: Activity, 
    badgeClass: "bg-orange-100 text-orange-800 border-orange-200", 
    iconClass: "text-orange-600",
    bgClass: "bg-orange-50/40"
  },
  { 
    id: "Balón Parado", 
    label: "Balón Parado (ABP)", 
    description: "Estrategias de saques de esquina, faltas laterales, frontales y penaltis.", 
    icon: Target, 
    badgeClass: "bg-purple-100 text-purple-800 border-purple-200", 
    iconClass: "text-purple-600",
    bgClass: "bg-purple-50/40"
  },
];

const TRANSVERSAL_DIMENSIONS = [
  { name: "Técnica", desc: "Superficies de contacto, control orientado, golpeo y conducción", icon: Compass, color: "text-blue-600 bg-blue-50 border-blue-100" },
  { name: "Táctica", desc: "Toma de decisiones, ocupación de espacios y principios de juego", icon: Brain, color: "text-indigo-600 bg-indigo-50 border-indigo-100" },
  { name: "Física", desc: "Psicomotricidad, velocidad de reacción, fuerza y resistencia", icon: Dumbbell, color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
  { name: "Psicológica", desc: "Concentración, actitud, competitividad y cohesión de equipo", icon: HeartHandshake, color: "text-amber-600 bg-amber-50 border-amber-100" }
];

/**
 * Normalizador exacto de fase táctica
 */
function normalizePhase(phase: string): string {
  const norm = (phase || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

  if (norm.includes("ataque") && !norm.includes("transicion")) return "ataque";
  if (norm.includes("defensa") && !norm.includes("transicion")) return "defensa";
  if (norm.includes("transicionataquedefensa") || norm.includes("atktodef") || norm.includes("transiciondefensiva")) return "transicion_ad";
  if (norm.includes("transiciondefensaataque") || norm.includes("deftoatk") || norm.includes("transicionofensiva")) return "transicion_da";
  if (norm.includes("balonparado") || norm.includes("abp") || norm.includes("setpieces")) return "abp";
  return norm;
}

/**
 * Función determinista para comparar principios y fases del juego evitando falsos positivos por substrings
 */
function isPrincipleInGamePhase(principlePhase: string, targetPhaseId: string): boolean {
  return normalizePhase(principlePhase) === normalizePhase(targetPhaseId);
}

import { evaluateTacticalAffinity, ScoredExerciseResult } from "@/lib/methodology/tacticalEngine/tacticalAffinityEngine";

/**
 * Algoritmo determinista de scoring de calidad con precedencia táctica y adecuación por categoría
 */
function scoreExerciseCompatibility(
  ex: Exercise,
  principle: Principle,
  stageSlug: string,
  stageCode: string,
  curriculumPriorities: string[] = []
): ScoredExercise | null {
  const result = evaluateTacticalAffinity(ex, principle, stageSlug, stageCode, curriculumPriorities);
  if (!result) return null;
  return {
    exercise: result.exercise,
    score: result.score,
    compatibilityLevel: result.compatibilityLevel,
    stageBadge: result.stageBadge,
    matchReasons: result.matchReasons
  };
}

function CurriculoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = searchParams.get("tab") === "fases" ? "fases" : "etapas";

  const [activeTab, setActiveTab] = useState<"etapas" | "fases">(initialTab);
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[3]); // U11-U12 por defecto
  const [activePhase, setActivePhase] = useState(GAME_PHASES[0].id); // Ataque Organizado por defecto
  
  const [allCurricula, setAllCurricula] = useState<Curriculum[]>([]);
  const [allPrinciples, setAllPrinciples] = useState<Principle[]>([]);
  const [expandedPrinciples, setExpandedPrinciples] = useState<Record<string, boolean>>({});
  
  // Catálogo Oficial de 199 Ejercicios
  const [catalogExercises, setCatalogExercises] = useState<Exercise[]>([]);
  const [selectedExerciseModal, setSelectedExerciseModal] = useState<Exercise | null>(null);
  const [showExercisesForPrinciple, setShowExercisesForPrinciple] = useState<Record<string, boolean>>({});

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "fases" || tabParam === "etapas") {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    loadAllMethodology();
  }, []);

  const loadAllMethodology = async () => {
    setLoading(true);
    try {
      const res = await getFullMethodologyCurriculumAction();
      setAllCurricula(res.curricula || []);
      setAllPrinciples(res.principles || []);
      setCatalogExercises(res.exercises || []);
    } catch (error) {
      console.error("Error al cargar datos metodológicos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: "etapas" | "fases") => {
    setActiveTab(tab);
    router.replace(`/admin/metodologia/curriculo?tab=${tab}`, { scroll: false });
  };

  const togglePrinciple = (id: string) => {
    setExpandedPrinciples(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const toggleExercisesForPrinciple = (id: string) => {
    setShowExercisesForPrinciple(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Obtener currículo específico de la etapa activa
  const currentCurriculum = allCurricula.find(
    c => c.category_code === activeCategory.code || c.category_label?.toLowerCase() === activeCategory.name.toLowerCase()
  ) || null;

  // Principios filtrados por la fase de juego activa (transversales al modelo)
  const phasePrinciples = useMemo(() => {
    return allPrinciples.filter(p => isPrincipleInGamePhase(p.game_phase, activePhase));
  }, [allPrinciples, activePhase]);

  // Mapa de tareas compatibles calculadas por principio con adecuación real por categoría
  const compatibleExercisesMap = useMemo(() => {
    const map: Record<string, ScoredExercise[]> = {};
    if (!catalogExercises || catalogExercises.length === 0) return map;

    const currentPriorities = currentCurriculum?.priority_families || [];

    for (const p of allPrinciples) {
      const matched = catalogExercises
        .map(ex => scoreExerciseCompatibility(ex, p, activeCategory.slug, activeCategory.code, currentPriorities))
        .filter((r): r is ScoredExercise => r !== null)
        .sort((a, b) => b.score - a.score);
      map[p.id] = matched;
    }
    return map;
  }, [catalogExercises, allPrinciples, activeCategory, currentCurriculum]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Header Principal con Navegación Metodológica */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 tracking-wider">
              Flujo de Trabajo del Entrenador
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl inline-flex items-center justify-center shrink-0">
              <Brain className="w-6 h-6" aria-hidden="true" />
            </span>
            <span>Currículo & Modelo de Juego</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1 max-w-3xl">
            Flujo guiado para entrenadores: Etapa → Prioridades → Fase de Juego → Principio → Conducta → Tareas oficiales (199 ejercicios) → Añadir a sesión.
          </p>
        </div>

        {/* Acciones Rápidas */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Link
            href="/admin/metodologia/biblioteca"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
            <span>Biblioteca (199 Oficiales)</span>
          </Link>
          <Link
            href="/admin/metodologia/sesiones/nueva"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Constructor de Sesión</span>
          </Link>
        </div>
      </div>

      {/* Selector de Tabs Principales */}
      <div className="flex border-b border-slate-200 bg-white px-4 pt-3 rounded-2xl border shadow-xs gap-4">
        <button
          onClick={() => handleTabChange("etapas")}
          className={`pb-3 px-3 text-sm font-black flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "etapas"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Users className="w-4 h-4" aria-hidden="true" />
          <span>1. Etapas Formativas (U6 - Senior)</span>
        </button>
        <button
          onClick={() => handleTabChange("fases")}
          className={`pb-3 px-3 text-sm font-black flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "fases"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Swords className="w-4 h-4" aria-hidden="true" />
          <span>2. Modelo de Juego por 5 Fases</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-slate-200 gap-3 shadow-xs">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="text-xs font-bold text-slate-500">Cargando marco curricular y modelo formativo...</p>
        </div>
      ) : activeTab === "etapas" ? (
        
        /* ═══════════════════════════════════════════════════════════════════════════
           TAB 1: ETAPAS FORMATIVAS (U6 A SENIOR)
        ═══════════════════════════════════════════════════════════════════════════ */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Sidebar de Categorías */}
          <div className="lg:col-span-1 space-y-2 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs h-fit">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2 px-1">
              Etapas Formativas
            </h3>
            <div className="space-y-1.5">
              {CATEGORIES.map((cat) => {
                const isSelected = activeCategory.id === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all text-left ${
                      isSelected
                        ? "bg-indigo-50/80 border border-indigo-200 text-indigo-900 font-black shadow-2xs"
                        : "hover:bg-slate-50 text-slate-600 font-medium border border-transparent"
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold leading-tight">{cat.name}</div>
                      <div className="text-[10px] text-slate-400 font-semibold">{cat.code} • {cat.age}</div>
                    </div>
                    {isSelected && <ChevronRight className="w-4 h-4 text-indigo-600 shrink-0" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detalle de la Etapa Seleccionada */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Tarjeta de Filosofía y Enfoque */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-black px-3 py-1 rounded-lg border uppercase tracking-wider ${activeCategory.color}`}>
                    {activeCategory.code} • {activeCategory.age}
                  </span>
                  <span className="text-xs font-bold text-slate-400 uppercase">
                    Etapa Formativa Oficial
                  </span>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  {currentCurriculum?.category_label || activeCategory.name}
                </h2>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  {currentCurriculum?.philosophy_text || "Estructuración pedagógica oficial orientada al desarrollo integral del futbolista según las demandas tácticas, técnicas, físicas y cognitivas de la edad."}
                </p>
              </div>

              {/* 4 Dimensiones Transversales */}
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2.5">
                  Dimensiones Formativas Integrales
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {TRANSVERSAL_DIMENSIONS.map((dim, idx) => {
                    const IconD = dim.icon;
                    return (
                      <div key={idx} className={`p-2.5 rounded-xl border ${dim.color} space-y-1`}>
                        <div className="flex items-center gap-1.5">
                          <IconD className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          <span className="text-xs font-black">{dim.name}</span>
                        </div>
                        <p className="text-[10px] opacity-80 leading-tight line-clamp-2">{dim.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Objetivos de la Etapa */}
              {currentCurriculum?.objectives && currentCurriculum.objectives.length > 0 && (
                <div className="pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-indigo-600" aria-hidden="true" />
                    <span>Objetivos Formativos Prioritarios ({currentCurriculum.objectives.length})</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {currentCurriculum.objectives.map((obj, i) => (
                      <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 font-medium">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-black flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                          {i + 1}
                        </span>
                        <span className="leading-snug">{obj}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Familias de Contenido Prioritarias */}
              {currentCurriculum?.priority_families && currentCurriculum.priority_families.length > 0 && (
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Familias de tareas recomendadas:</span>
                  {currentCurriculum.priority_families.map((fam, idx) => (
                    <span key={idx} className="text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md">
                      {fam}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* SECCIÓN "¿QUÉ QUIERES TRABAJAR?" CON LAS 5 FASES REALES */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <Swords className="w-5 h-5 text-indigo-600" aria-hidden="true" />
                    <span>¿Qué quieres trabajar en {activeCategory.name}?</span>
                  </h3>
                  <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                    {activeCategory.code} ({activeCategory.age})
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {activeCategory.id === "Senior"
                    ? "Esta etapa aplica el modelo de juego competitivo de máximo rendimiento, optimización táctica y eficacia en la competición."
                    : activeCategory.id === "U17-U19" || activeCategory.id === "U15-U16"
                    ? "Esta etapa aplica el modelo de juego de especialización y rendimiento formativo con rigor posicional y alta intensidad."
                    : activeCategory.id === "U13-U14" || activeCategory.id === "U11-U12"
                    ? "Esta etapa consolida la táctica colectiva, roles posicionales y principios del modelo formativo en Fútbol-8 y Fútbol-11."
                    : "Esta etapa utiliza los principios formativos base adaptados al aprendizaje progresivo y desarrollo motor."}
                </p>
              </div>

              {/* Selector de 5 Fases de Juego */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                {GAME_PHASES.map((phase) => {
                  const isSelected = activePhase === phase.id;
                  const IconComp = phase.icon;
                  const count = allPrinciples.filter(p => isPrincipleInGamePhase(p.game_phase, phase.id)).length;

                  return (
                    <button
                      key={phase.id}
                      onClick={() => setActivePhase(phase.id)}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                        isSelected
                          ? "bg-indigo-50/60 border-indigo-600 ring-2 ring-indigo-400/20 shadow-2xs text-indigo-950 font-black"
                          : "bg-slate-50/50 border-slate-200 hover:border-slate-300 text-slate-600 font-medium"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className={`p-1.5 rounded-lg ${isSelected ? "bg-indigo-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>
                          <IconComp className="w-4 h-4" aria-hidden="true" />
                        </div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isSelected ? "bg-indigo-100 text-indigo-800" : "bg-slate-200/70 text-slate-700"}`}>
                          {count}
                        </span>
                      </div>
                      <div className="text-xs leading-tight">{phase.label}</div>
                    </button>
                  );
                })}
              </div>

              {/* Listado de Principios de la Fase Seleccionada */}
              <div className="pt-2 border-t border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-600" aria-hidden="true" />
                    <span>Principios de {GAME_PHASES.find(p => p.id === activePhase)?.label}</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {phasePrinciples.length} {phasePrinciples.length === 1 ? "Principio registrado" : "Principios registrados"} en BD
                  </span>
                </div>

                {phasePrinciples.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 border border-slate-200 border-dashed rounded-xl space-y-2">
                    <Info className="w-8 h-8 text-slate-400 mx-auto" aria-hidden="true" />
                    <p className="text-sm font-bold text-slate-600">No hay principios definidos para esta fase en la base de datos.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {phasePrinciples.map((pr) => {
                      const isExpanded = expandedPrinciples[pr.id] !== false; // Default expanded
                      const compatibleDrills = compatibleExercisesMap[pr.id] || [];
                      const areDrillsVisible = showExercisesForPrinciple[pr.id] || false;

                      return (
                        <div key={pr.id} className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                          <div className="p-4 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => togglePrinciple(pr.id)}
                              className="flex-1 text-left"
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wider">
                                  Fase: {pr.game_phase}
                                </span>
                              </div>
                              <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                                <span>{pr.name}</span>
                                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} aria-hidden="true" />
                              </h4>
                              {pr.description && (
                                <p className="text-xs text-slate-500 mt-0.5">{pr.description}</p>
                              )}
                            </button>

                            {/* Botón de Tareas Compatibles con Conteo Real */}
                            <button
                              type="button"
                              onClick={() => toggleExercisesForPrinciple(pr.id)}
                              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
                                areDrillsVisible
                                  ? "bg-indigo-600 text-white border-indigo-600"
                                  : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                              }`}
                            >
                              <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>{areDrillsVisible ? "Ocultar tareas" : `Ver tareas (${compatibleDrills.length})`}</span>
                            </button>
                          </div>

                          {/* BANDEJA DESPLEGABLE: EJERCICIOS COMPATIBLES DEL CATÁLOGO DE 199 */}
                          {areDrillsVisible && (
                            <div className="p-4 bg-indigo-50/30 border-b border-indigo-100/80 space-y-3 animate-in fade-in duration-150">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-indigo-900 flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" aria-hidden="true" />
                                  <span>Tareas Oficiales Compatibles ({compatibleDrills.length} en Catálogo)</span>
                                </span>
                                <Link
                                  href={`/admin/metodologia/biblioteca?category=${activeCategory.slug}`}
                                  className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
                                >
                                  <span>Ver en Biblioteca completa</span>
                                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                                </Link>
                              </div>

                              {compatibleDrills.length === 0 ? (
                                <div className="p-4 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-500">
                                  No hay tareas oficiales suficientemente compatibles con este principio.
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {compatibleDrills.slice(0, 12).map((item) => {
                                    const drill = item.exercise;
                                    return (
                                      <div
                                        key={drill.id}
                                        className="p-3.5 bg-white border border-slate-200 hover:border-indigo-300 rounded-xl shadow-2xs flex flex-col justify-between gap-2.5 transition-all"
                                      >
                                        <div className="space-y-1.5">
                                          <div className="flex flex-wrap items-center justify-between gap-1">
                                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-100">
                                              {drill.tipo || "Tarea Oficial"}
                                            </span>
                                            {drill.duracion_recomendada && (
                                              <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                                                <Clock className="w-3 h-3 text-slate-400" aria-hidden="true" />
                                                <span>{drill.duracion_recomendada}&apos;</span>
                                              </span>
                                            )}
                                          </div>

                                          <div className="flex flex-wrap gap-1">
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                              item.compatibilityLevel === "ALTA"
                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                : item.compatibilityLevel === "MEDIA"
                                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                                  : "bg-amber-50 text-amber-700 border-amber-200"
                                            }`}>
                                              {item.compatibilityLevel === "ALTA" ? "⭐ Alta Compatibilidad" : item.compatibilityLevel === "MEDIA" ? "🔹 Media Compatibilidad" : "🔸 Adaptable"}
                                            </span>
                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-200">
                                              {item.stageBadge}
                                            </span>
                                          </div>
                                          
                                          <h5 className="text-xs font-black text-slate-900 line-clamp-2 leading-tight">
                                            {drill.nombre}
                                          </h5>

                                          {drill.objetivo_tactico && drill.objetivo_tactico.length > 0 && (
                                            <div className="flex flex-wrap gap-1 pt-0.5">
                                              {drill.objetivo_tactico.slice(0, 2).map((obj, oi) => (
                                                <span key={oi} className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                                  🎯 {obj}
                                                </span>
                                              ))}
                                            </div>
                                          )}

                                          {drill.descripcion && (
                                            <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">
                                              {drill.descripcion}
                                            </p>
                                          )}

                                          <div className="flex flex-wrap gap-2 text-[10px] text-slate-400 pt-1">
                                            {drill.min_players && (
                                              <span>👥 {drill.min_players}-{drill.max_players || "+"} jug.</span>
                                            )}
                                            {drill.espacio && (
                                              <span>📐 {drill.espacio}</span>
                                            )}
                                          </div>
                                        </div>

                                        {/* Botones de Acción: Ver Ficha y Usar en Sesión */}
                                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
                                          <button
                                            type="button"
                                            onClick={() => setSelectedExerciseModal(drill)}
                                            className="text-[11px] font-bold text-slate-700 hover:text-indigo-600 flex items-center gap-1 cursor-pointer"
                                          >
                                            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                                            <span>Ver ficha</span>
                                          </button>
                                          
                                          <Link
                                            href={`/admin/metodologia/sesiones/nueva?exerciseId=${drill.id}&category=${activeCategory.slug}&objective=${encodeURIComponent(pr.name)}`}
                                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                                          >
                                            <Plus className="w-3 h-3" aria-hidden="true" />
                                            <span>Usar en sesión</span>
                                          </Link>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Subprincipios y Comportamientos */}
                          {isExpanded && pr.methodology_subprinciples && pr.methodology_subprinciples.length > 0 && (
                            <div className="p-4 space-y-4 animate-in fade-in duration-100">
                              {pr.methodology_subprinciples.map((sub) => (
                                <div key={sub.id} className="pl-3 border-l-2 border-indigo-200 space-y-2">
                                  <h5 className="text-xs font-black text-slate-800">{sub.name}</h5>
                                  {sub.description && (
                                    <p className="text-[11px] text-slate-500">{sub.description}</p>
                                  )}

                                  {sub.methodology_behaviours && sub.methodology_behaviours.length > 0 ? (
                                    <div className="space-y-1.5 pt-1">
                                      {sub.methodology_behaviours.map((beh) => (
                                        <div key={beh.id} className="flex items-start gap-2 text-xs bg-white p-2.5 rounded-lg border border-slate-100">
                                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                          <div className="flex-1">
                                            <span className="text-slate-700 font-medium">{beh.description}</span>
                                            {beh.performance_indicators && beh.performance_indicators.length > 0 && (
                                              <div className="flex flex-wrap gap-1 mt-1">
                                                {beh.performance_indicators.map((ind, i) => (
                                                  <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-bold">
                                                    {ind}
                                                  </span>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-[11px] text-slate-400 italic">No hay conductas definidas para esta etapa.</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

      ) : (

        /* ═══════════════════════════════════════════════════════════════════════════
           TAB 2: MODELO DE JUEGO POR 5 FASES (ATAQUE, DEFENSA, TRANSICIONES, ABP)
        ═══════════════════════════════════════════════════════════════════════════ */
        <div className="space-y-6">
          
          {/* Selector de Etapa Adaptada para Tab 2 */}
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Etapa adaptada:</span>
              <span className={`text-xs font-black px-2.5 py-0.5 rounded-md border ${activeCategory.color}`}>
                {activeCategory.name} ({activeCategory.code})
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeCategory.id === cat.id
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat.code}
                </button>
              ))}
            </div>
          </div>

          {/* Selector de Fase de Juego */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {GAME_PHASES.map((phase) => {
              const isSelected = activePhase === phase.id;
              const IconComp = phase.icon;
              const count = allPrinciples.filter(p => isPrincipleInGamePhase(p.game_phase, phase.id)).length;

              return (
                <button
                  key={phase.id}
                  onClick={() => setActivePhase(phase.id)}
                  className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 ${
                    isSelected
                      ? "bg-white border-indigo-600 ring-2 ring-indigo-400/30 shadow-sm"
                      : "bg-white border-slate-200 hover:border-slate-300 text-slate-600"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-xl ${isSelected ? "bg-indigo-50" : "bg-slate-100"}`}>
                      <IconComp className={`w-5 h-5 ${isSelected ? "text-indigo-600" : "text-slate-600"}`} aria-hidden="true" />
                    </div>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                      {count} {count === 1 ? "Principio" : "Principios"}
                    </span>
                  </div>
                  <div>
                    <div className={`text-xs font-black ${isSelected ? "text-slate-900" : "text-slate-700"}`}>
                      {phase.label}
                    </div>
                    <div className="text-[10px] text-slate-400 line-clamp-2 mt-0.5">
                      {phase.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Listado de Principios de la Fase Activa */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Swords className="w-5 h-5 text-indigo-600" aria-hidden="true" />
                  <span>Principios del Modelo: {GAME_PHASES.find(p => p.id === activePhase)?.label}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {GAME_PHASES.find(p => p.id === activePhase)?.description}
                </p>
              </div>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg self-start sm:self-auto">
                Total en fase: {phasePrinciples.length}
              </span>
            </div>

            {phasePrinciples.length === 0 ? (
              <div className="p-12 text-center bg-slate-50 border border-slate-200 border-dashed rounded-xl space-y-2">
                <ShieldAlert className="w-10 h-10 text-slate-300 mx-auto" aria-hidden="true" />
                <h4 className="text-base font-black text-slate-700">Sin principios registrados para esta fase</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Actualmente no existen principios asociados a la fase <strong>{activePhase}</strong> en la base de datos oficial.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {phasePrinciples.map((pr) => {
                  const compatibleDrills = compatibleExercisesMap[pr.id] || [];
                  const topDrill = compatibleDrills[0]?.exercise || null;

                  return (
                    <div key={pr.id} className="border border-slate-200 rounded-2xl p-5 bg-white shadow-2xs space-y-4 hover:border-indigo-200 transition-colors flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wider">
                            Principio Táctico
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            {compatibleDrills.length} tareas compatibles
                          </span>
                        </div>
                        <h4 className="text-lg font-black text-slate-900">{pr.name}</h4>
                        {pr.description && (
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">{pr.description}</p>
                        )}
                      </div>

                      {/* Subprincipios & Conductas */}
                      {pr.methodology_subprinciples && pr.methodology_subprinciples.length > 0 ? (
                        <div className="space-y-3 pt-2 border-t border-slate-100">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Subprincipios y Comportamientos</span>
                          {pr.methodology_subprinciples.map((sub) => (
                            <div key={sub.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5">
                              <div className="text-xs font-black text-slate-800">{sub.name}</div>
                              {sub.description && (
                                <div className="text-[11px] text-slate-500">{sub.description}</div>
                              )}

                              {sub.methodology_behaviours && sub.methodology_behaviours.length > 0 && (
                                <div className="space-y-1 pt-1">
                                  {sub.methodology_behaviours.map((beh) => (
                                    <div key={beh.id} className="flex items-start gap-1.5 text-[11px] text-slate-700 bg-white px-2 py-1.5 rounded border border-slate-100">
                                      <div className="w-1 h-1 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                                      <span className="font-medium">{beh.description}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {/* Tareas rápidas y acción hacia sesión */}
                      {topDrill && (
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedExerciseModal(topDrill)}
                            className="text-xs font-bold text-slate-700 hover:text-indigo-600 flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3 text-slate-400" aria-hidden="true" />
                            <span>Ver tarea ({compatibleDrills.length})</span>
                          </button>
                          
                          <Link
                            href={`/admin/metodologia/sesiones/nueva?exerciseId=${topDrill.id}&category=${activeCategory.slug}&objective=${encodeURIComponent(pr.name)}`}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-black rounded-lg transition-colors flex items-center gap-1"
                          >
                            <PlusCircle className="w-3 h-3" aria-hidden="true" />
                            <span>Usar en una sesión</span>
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

          </div>

        </div>
      )}

      {/* MODAL DETALLE DE EJERCICIO OFICIAL */}
      {selectedExerciseModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                    {selectedExerciseModal.tipo || "Tarea Oficial"}
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    Catálogo Oficial (199 Tareas)
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900 leading-tight">
                  {selectedExerciseModal.nombre}
                </h3>
              </div>
              <button
                onClick={() => setSelectedExerciseModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-700">
              {selectedExerciseModal.descripcion && (
                <div>
                  <h4 className="font-bold text-slate-900 uppercase text-[10px] tracking-wider mb-1">Descripción:</h4>
                  <p className="bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                    {selectedExerciseModal.descripcion}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Duración</span>
                  <span className="text-sm font-black text-slate-900">{selectedExerciseModal.duracion_recomendada || 15} min</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Jugadores</span>
                  <span className="text-sm font-black text-slate-900">
                    {selectedExerciseModal.min_players ? `${selectedExerciseModal.min_players}-${selectedExerciseModal.max_players || "+"}` : "Libre"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Espacio</span>
                  <span className="text-sm font-black text-slate-900">{selectedExerciseModal.espacio || "Variable"}</span>
                </div>
              </div>

              {selectedExerciseModal.objetivo_tactico && selectedExerciseModal.objetivo_tactico.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-900 uppercase text-[10px] tracking-wider mb-1">Objetivos Tácticos:</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedExerciseModal.objetivo_tactico.map((obj, i) => (
                      <span key={i} className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-[11px] font-bold">
                        {obj}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedExerciseModal.correcciones && (
                <div>
                  <h4 className="font-bold text-slate-900 uppercase text-[10px] tracking-wider mb-1">Consignas y Correcciones:</h4>
                  <p className="bg-amber-50/60 border border-amber-200/60 text-amber-900 p-3 rounded-xl leading-relaxed">
                    {selectedExerciseModal.correcciones}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-3">
              <Link
                href={`/admin/metodologia/sesiones/nueva?exerciseId=${selectedExerciseModal.id}&category=${activeCategory.slug}`}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" aria-hidden="true" />
                <span>Usar en una sesión</span>
              </Link>
              <button
                type="button"
                onClick={() => setSelectedExerciseModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function CurriculoMetodologicoPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        <p className="text-xs font-bold text-slate-500">Cargando Currículo & Modelo de Juego...</p>
      </div>
    }>
      <CurriculoContent />
    </Suspense>
  );
}
