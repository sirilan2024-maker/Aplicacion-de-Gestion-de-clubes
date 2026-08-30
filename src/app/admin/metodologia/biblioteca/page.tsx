"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Search,
  Filter,
  Plus,
  BookOpen,
  Users,
  Clock,
  Activity,
  Brain,
  X,
  Target,
  Maximize,
  Shield,
  Zap,
  ArrowUpRight,
  TrendingUp,
  Award,
  Layers,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Upload,
  Check,
  Trash2,
  FileCode,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Loader2,
  Globe,
  ExternalLink,
  Copy,
  Sparkles,
  Bot,
  Wand2,
  Calendar,
  ChevronUp,
  ChevronDown,
  Save,
  Play,
  Download
} from "lucide-react";
import { getLibraryCatalogAction, importExerciseBatchAction, verifyExerciseAction, deleteExerciseAction, searchExternalExercisesAction, searchIntelligentExercisesAction, generateIntelligentSessionAction, saveOperationalSessionAction, revalidateExternalEvidenceAction, exportSessionPdfAction } from "@/app/actions/methodology-actions";
import { NormalizedExternalExercise } from "@/lib/methodology/externalSearch/types";
import { ParsedSearchIntent } from "@/lib/methodology/intelligentSearch/types";
import { GeneratedSessionPlan, GeneratedSessionDrill } from "@/lib/methodology/sessionGenerator/types";

export default function BibliotecaEjercicios() {
  const router = useRouter();
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Scope: 'club' (89 Sporting Saladar) vs 'all' (199 catálogo completo/plantillas)
  const [catalogScope, setCatalogScope] = useState<"club" | "all">("club");

  // Health Revalidation State (FASE 61)
  const [isRevalidatingHealth, setIsRevalidatingHealth] = useState(false);
  const [healthCheckStatus, setHealthCheckStatus] = useState<any>(null);

  // PDF Export State (FASE 62)
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Session Generator State (FASE 50, 51 & 55)
  const [isSessionGeneratorOpen, setIsSessionGeneratorOpen] = useState(false);
  const [sessionPrompt, setSessionPrompt] = useState("");
  const [isGeneratingSession, setIsGeneratingSession] = useState(false);
  const [generatedSession, setGeneratedSession] = useState<GeneratedSessionPlan | null>(null);
  const [variantNumber, setVariantNumber] = useState(1);
  const [usedExerciseIdsAcrossVariants, setUsedExerciseIdsAcrossVariants] = useState<string[]>([]);
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [sessionCopySuccess, setSessionCopySuccess] = useState(false);
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [saveSuccessSessionId, setSaveSuccessSessionId] = useState<string | null>(null);

  // Intelligent Search State (FASE 49)
  const [searchIntent, setSearchIntent] = useState<ParsedSearchIntent | null>(null);
  const [isSearchingIntelligent, setIsSearchingIntelligent] = useState(false);
  const [scoreExplanations, setScoreExplanations] = useState<Record<string, string>>({});

  // External Search State (FASE 48 & 53)
  const [externalResults, setExternalResults] = useState<NormalizedExternalExercise[]>([]);
  const [isSearchingExternal, setIsSearchingExternal] = useState(false);
  const [hasSearchedExternal, setHasSearchedExternal] = useState(false);
  const [externalSearchError, setExternalSearchError] = useState<string | null>(null);
  const [selectedExternalExercise, setSelectedExternalExercise] = useState<NormalizedExternalExercise | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Tab: Homologados vs Pendientes vs Web Externa
  const [activeTab, setActiveTab] = useState<"verified" | "pending" | "web">("verified");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedFamily, setSelectedFamily] = useState("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [selectedBlock, setSelectedBlock] = useState("all");
  const [minPlayers, setMinPlayers] = useState("");
  
  // Detail Modal
  const [selectedExercise, setSelectedExercise] = useState<any | null>(null);

  // Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importFeedback, setImportFeedback] = useState<{ success?: boolean; message?: string; errors?: any[]; warnings?: any[] } | null>(null);

  // Stats for the top bar
  const [stats, setStats] = useState({ 
    total: 0, 
    clubTotal: 89,
    globalTotal: 199,
    verified: 0,
    pending: 0,
    byCategory: {} as Record<string, number>,
    byFamily: {} as Record<string, number> 
  });

  useEffect(() => {
    fetchExercises();
  }, [catalogScope, searchTerm, selectedCategory, selectedType, selectedFamily, selectedDifficulty, selectedBlock, minPlayers]);

  const fetchExercises = async () => {
    setLoading(true);
    try {
      const res = await getLibraryCatalogAction({
        scope: catalogScope,
        search: searchTerm || undefined,
        category: selectedCategory !== "all" ? selectedCategory : undefined,
        type: selectedType !== "all" ? selectedType : undefined,
        family: selectedFamily !== "all" ? selectedFamily : undefined,
        difficulty: selectedDifficulty !== "all" ? parseInt(selectedDifficulty, 10) : undefined,
        block: selectedBlock !== "all" ? selectedBlock : undefined,
        minPlayers: minPlayers ? parseInt(minPlayers, 10) : undefined
      });

      if (res.success) {
        const data = res.exercises;
        setExercises(data);
        
        const verifiedCount = data.filter(e => e.is_validated !== false).length;
        const pendingCount = data.filter(e => e.is_validated === false).length;

        const catCount = data.reduce((acc: any, curr: any) => {
          const cat = curr.age_category || (curr.categoria_edad && curr.categoria_edad[0]) || 'general';
          acc[cat] = (acc[cat] || 0) + 1;
          return acc;
        }, {});
        const famCount = data.reduce((acc: any, curr: any) => {
          const fam = curr.familia || 'General';
          acc[fam] = (acc[fam] || 0) + 1;
          return acc;
        }, {});

        setStats({ 
          total: data.length, 
          clubTotal: res.clubTotal,
          globalTotal: res.globalTotal,
          verified: verifiedCount,
          pending: pendingCount,
          byCategory: catCount, 
          byFamily: famCount 
        });
      }
    } catch (error) {
      console.error("Error fetching exercises:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredByTab = exercises.filter((ex) => {
    if (activeTab === "verified") {
      return ex.is_validated !== false;
    }
    return ex.is_validated === false;
  });

  const handleVerifyExercise = async (id: string, approve: boolean) => {
    try {
      await verifyExerciseAction(id, approve);
      await fetchExercises();
      if (selectedExercise?.id === id) {
        setSelectedExercise({ ...selectedExercise, is_validated: approve });
      }
    } catch (err: any) {
      alert(`Error al procesar el ejercicio: ${err.message || err}`);
    }
  };

  const handleDeleteExercise = async (id: string) => {
    if (!confirm("¿Deseas eliminar definitivamente este ejercicio del banco?")) return;
    try {
      await deleteExerciseAction(id);
      setSelectedExercise(null);
      await fetchExercises();
    } catch (err: any) {
      alert(`Error al eliminar: ${err.message || err}`);
    }
  };

  const handleIntelligentSearch = async (overrideQuery?: string) => {
    const q = overrideQuery !== undefined ? overrideQuery : searchTerm;
    if (!q.trim()) {
      setSearchIntent(null);
      setScoreExplanations({});
      fetchExercises();
      return;
    }

    setIsSearchingIntelligent(true);
    setExternalSearchError(null);
    try {
      const res = await searchIntelligentExercisesAction(q, {
        includeExternal: true,
        manualFilters: {
          category: selectedCategory !== "all" ? selectedCategory : undefined,
          family: selectedFamily !== "all" ? selectedFamily : undefined,
          type: selectedType !== "all" ? selectedType : undefined,
          difficulty: selectedDifficulty !== "all" ? parseInt(selectedDifficulty, 10) : undefined
        }
      });

      if (res.success) {
        setSearchIntent(res.intent);
        
        // Build explanation map
        const expMap: Record<string, string> = {};
        res.internalResults.forEach((r) => {
          if (r.exercise.id) expMap[r.exercise.id] = r.relevanceExplanation;
        });
        res.externalResults.forEach((r) => {
          if (r.exercise.id) expMap[r.exercise.id] = r.relevanceExplanation;
        });
        setScoreExplanations(expMap);

        // Update internal exercises list ranked by score
        const mappedInternal = res.internalResults.map((r) => r.exercise);
        setExercises(mappedInternal);

        // Update external results
        const mappedExternal = res.externalResults.map((r) => r.exercise);
        setExternalResults(mappedExternal);
        setHasSearchedExternal(mappedExternal.length > 0);
      }
    } catch (err: any) {
      console.error("Intelligent search error:", err);
      // Fallback: regular search
      fetchExercises();
    } finally {
      setIsSearchingIntelligent(false);
    }
  };

  // ─── GENERADOR DE SESIONES (FASE 50 & 55) ──────────────────────────────────
  const handleGenerateSession = async (customPrompt?: string, isRegeneration: boolean = false) => {
    const p = customPrompt || sessionPrompt;
    if (!p.trim()) return;

    setIsGeneratingSession(true);
    try {
      let currentVariant = isRegeneration ? variantNumber + 1 : 1;
      let excluded = isRegeneration ? usedExerciseIdsAcrossVariants : [];

      if (isRegeneration && generatedSession) {
        const currentDrillIds = generatedSession.drills
          .map(d => d.exercise?.id || d.exercise?.nombre)
          .filter(Boolean);
        excluded = Array.from(new Set([...usedExerciseIdsAcrossVariants, ...currentDrillIds]));
        setUsedExerciseIdsAcrossVariants(excluded);
      } else if (!isRegeneration) {
        setVariantNumber(1);
        setUsedExerciseIdsAcrossVariants([]);
      }

      setVariantNumber(currentVariant);

      const res = await generateIntelligentSessionAction(p, {
        includeExternal: true,
        variantNumber: currentVariant,
        excludedExerciseIds: excluded
      });

      if (res.success && res.session) {
        setGeneratedSession(res.session);
        setIsEditingPrompt(false);
      } else {
        alert(res.error || "No se pudo generar la sesión.");
      }
    } catch (err: any) {
      alert(`Error al generar sesión: ${err.message || err}`);
    } finally {
      setIsGeneratingSession(false);
    }
  };

  const handleUpdateDrillDuration = (drillId: string, delta: number) => {
    if (!generatedSession) return;
    const updatedDrills = generatedSession.drills.map((d) => {
      if (d.id === drillId) {
        const newDur = Math.max(5, d.allocatedDurationMin + delta);
        return { ...d, allocatedDurationMin: newDur };
      }
      return d;
    });
    const newSum = updatedDrills.reduce((acc, d) => acc + d.allocatedDurationMin, 0);
    setGeneratedSession({
      ...generatedSession,
      drills: updatedDrills,
      calculatedDurationMinutes: newSum,
      isDurationExact: newSum === generatedSession.totalDurationMinutes
    });
  };

  const handleRemoveDrill = (drillId: string) => {
    if (!generatedSession) return;
    const updatedDrills = generatedSession.drills.filter((d) => d.id !== drillId);
    const newSum = updatedDrills.reduce((acc, d) => acc + d.allocatedDurationMin, 0);
    setGeneratedSession({
      ...generatedSession,
      drills: updatedDrills,
      calculatedDurationMinutes: newSum,
      isDurationExact: newSum === generatedSession.totalDurationMinutes
    });
  };

  const handleMoveDrill = (index: number, direction: "up" | "down") => {
    if (!generatedSession) return;
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= generatedSession.drills.length) return;

    const newDrills = [...generatedSession.drills];
    const temp = newDrills[index];
    newDrills[index] = newDrills[targetIdx];
    newDrills[targetIdx] = temp;

    setGeneratedSession({
      ...generatedSession,
      drills: newDrills
    });
  };

  const handleCopySessionPlan = () => {
    if (!generatedSession) return;
    const lines = [
      `=== ${generatedSession.title.toUpperCase()} ===`,
      `Objetivo: ${generatedSession.intent.primaryObjective}`,
      `Categoría: ${generatedSession.intent.ageCategory || 'General'} | Jugadores: ${generatedSession.intent.players || 'N/A'} | Duración: ${generatedSession.totalDurationMinutes} min`,
      `Resumen: ${generatedSession.methodologicalSummary}`,
      `\n--- TAREAS ---`
    ];

    generatedSession.drills.forEach((d, i) => {
      lines.push(`${i + 1}. [${d.phaseLabel}] (${d.allocatedDurationMin} min) - ${d.exercise.nombre || d.exercise.title}`);
      lines.push(`   Razón: ${d.selectionRationale}`);
      if (d.exercise.descripcion || d.exercise.description) {
        lines.push(`   Descripción: ${d.exercise.descripcion || d.exercise.description}`);
      }
    });

    navigator.clipboard.writeText(lines.join("\n"));
    setSessionCopySuccess(true);
    setTimeout(() => setSessionCopySuccess(false), 2000);
  };

  const handleExportSessionPdf = async () => {
    if (!generatedSession) return;
    setIsExportingPdf(true);
    try {
      const res = await exportSessionPdfAction(generatedSession, {
        clubName: "Sporting Saladar",
        includeQrCodes: true,
        includeAuditMatrix: true,
        includeLimitations: true
      });
      if (res?.success && res.base64) {
        const byteCharacters = atob(res.base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = res.fileName || `Sesion-${generatedSession.id || 'plan'}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("PDF export error:", err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleSaveGeneratedSession = async (status: 'draft' | 'planned', startInField?: boolean) => {
    if (!generatedSession) return;
    setIsSavingSession(true);
    try {
      const res = await saveOperationalSessionAction({
        title: generatedSession.title,
        ageCategory: generatedSession.intent.ageCategory || "General",
        durationMinutes: generatedSession.totalDurationMinutes,
        objective: generatedSession.intent.primaryObjective,
        objectivesSecondary: generatedSession.intent.secondaryObjectives,
        numPlayers: generatedSession.intent.players || 12,
        status,
        coachNotes: generatedSession.methodologicalSummary,
        drills: generatedSession.drills.map((d, i) => ({
          drillId: d.exercise.id,
          phase: d.phase,
          orderIndex: i + 1,
          durationMin: d.allocatedDurationMin,
          notes: d.selectionRationale,
          exerciseTitle: d.exercise.nombre || d.exercise.title,
          exerciseDescription: d.exercise.descripcion || d.exercise.description,
          source: d.source
        }))
      });

      if (res.success && res.sessionId) {
        setSaveSuccessSessionId(res.sessionId);
        if (startInField) {
          router.push(`/admin/metodologia/sesiones/${res.sessionId}/ejecucion`);
        }
      }
    } catch (err: any) {
      alert(`Error al guardar sesión: ${err.message || err}`);
    } finally {
      setIsSavingSession(false);
    }
  };

  const handleSearchExternal = async (overrideQuery?: string) => {
    const q = overrideQuery !== undefined ? overrideQuery : searchTerm;
    setIsSearchingExternal(true);
    setExternalSearchError(null);
    setHasSearchedExternal(true);
    setActiveTab("web");
    try {
      const res = await searchExternalExercisesAction(q, {
        ageCategory: selectedCategory !== "all" ? selectedCategory : undefined,
        difficulty: selectedDifficulty !== "all" ? parseInt(selectedDifficulty, 10) : undefined
      });
      if (res.success) {
        setExternalResults(res.results || []);
      } else {
        setExternalSearchError(res.error || "No se pudo completar la búsqueda externa.");
      }
    } catch (err: any) {
      setExternalSearchError(
        "La búsqueda externa no está disponible en este momento. La biblioteca oficial interna sigue 100% operativa."
      );
    } finally {
      setIsSearchingExternal(false);
    }
  };

  const handleCopyExternalDetails = (ex: NormalizedExternalExercise) => {
    const text = `[EJERCICIO EXTERNO]\nTítulo: ${ex.title}\nCategoría: ${ex.ageCategory}\nDuración: ${ex.duration} min\nJugadores: ${ex.players}\nFuente: ${ex.source} (${ex.sourceUrl})\nObjetivo Táctico: ${ex.tacticalObjective || 'N/A'}\nObjetivo Técnico: ${ex.technicalObjective || 'N/A'}\nDescripción: ${ex.description}`;
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleProcessImport = async () => {
    if (!importJsonText.trim()) return;
    setIsImporting(true);
    setImportFeedback(null);
    try {
      let parsed: any;
      try {
        parsed = JSON.parse(importJsonText);
      } catch (jsonErr) {
        throw new Error("El texto introducido no es un formato JSON válido.");
      }

      const items = Array.isArray(parsed) ? parsed : [parsed];
      const res = await importExerciseBatchAction(items);
      setImportFeedback({
        success: true,
        message: `Se importaron con éxito ${res.insertedCount} ejercicio(s) candidato(s) pendientes de homologación.`,
        warnings: res.duplicateWarnings
      });
      setImportJsonText("");
      await fetchExercises();
    } catch (err: any) {
      setImportFeedback({
        success: false,
        message: err.message || "Error al procesar el lote."
      });
    } finally {
      setIsImporting(false);
    }
  };

  const categories = [
    { value: "all", label: "Todas las Categorías" },
    { value: "querubin", label: "U6 / Querubín" },
    { value: "prebenjamin", label: "U7-U8 / Prebenjamín" },
    { value: "benjamin", label: "U9-U10 / Benjamín" },
    { value: "alevin", label: "U11-U12 / Alevín" },
    { value: "infantil", label: "U13-U14 / Infantil" },
    { value: "cadete", label: "U15-U16 / Cadete" },
    { value: "juvenil", label: "U17-U19 / Juvenil" },
    { value: "senior", label: "Senior / Amateur" }
  ];

  const families = [
    { value: "all", label: "Todas las Familias" },
    { value: "TÉCNICA", label: "Técnica Individual/Colectiva" },
    { value: "TÁCTICA OFENSIVA", label: "Táctica Ofensiva" },
    { value: "TÁCTICA DEFENSIVA", label: "Táctica Defensiva" },
    { value: "TRANSICIONES", label: "Transiciones Ofensiva/Defensiva" },
    { value: "BALÓN PARADO", label: "Balón Parado (ABP)" },
    { value: "COGNITIVO", label: "Cognitivo / Percepción" },
    { value: "FÍSICO", label: "Físico / Condicional" },
    { value: "PSICOSOCIAL", label: "Psicosocial" }
  ];

  const types = [
    { value: "all", label: "Todos los Tipos" },
    { value: "calentamiento", label: "Calentamiento" },
    { value: "circuito", label: "Circuito / Postas" },
    { value: "analitico", label: "Analítico" },
    { value: "rondo", label: "Rondo" },
    { value: "SSG", label: "Juego Reducido (SSG)" },
    { value: "juego_medio", label: "Juego de Posición / Medio" },
    { value: "juego_global", label: "Juego Global / Partido" }
  ];

  const blocks = [
    { value: "all", label: "Todos los Bloques" },
    { value: "calentamiento", label: "Activación / Calentamiento" },
    { value: "principal", label: "Fase Principal" },
    { value: "global", label: "Fase Global / Aplicación" },
    { value: "vuelta_calma", label: "Vuelta a la Calma" }
  ];

  const getDifficultyBadge = (level: number) => {
    if (level === 1) return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-2 py-0.5 rounded-md">Iniciación (Nivel 1)</span>;
    if (level === 2) return <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold px-2 py-0.5 rounded-md">Básico (Nivel 2)</span>;
    if (level === 3) return <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold px-2 py-0.5 rounded-md">Avanzado (Nivel 3)</span>;
    return <span className="bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold px-2 py-0.5 rounded-md">Élite / Senior (Nivel 4)</span>;
  };

  const getIntensityBar = (value: number, max: number = 4) => {
    const safeVal = Math.min(max, Math.max(1, value || 2));
    return (
      <div className="flex gap-1 items-center">
        {Array.from({ length: max }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 w-3 rounded-full ${
              i < safeVal ? "bg-blue-600" : "bg-slate-200"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 relative">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-blue-100 text-blue-800 text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-md">
              Metodología OS v1.0
            </span>
            <span className="text-slate-400 text-xs font-bold">• Repositorio Metodológico Homologado</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3 mt-1">
            <BookOpen className="w-8 h-8 text-blue-600" />
            Biblioteca Metodológica Profesional
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Repositorio estructurado de tareas conectado con el modelo de juego, currículo y periodización.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSessionGeneratorOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-black rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            ✨ Generar Sesión con IA
          </button>

          <button
            onClick={() => {
              setIsImportModalOpen(true);
              setImportFeedback(null);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            Importar JSON / Candidatos
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-black">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              {stats.clubTotal} <span className="text-sm font-bold text-slate-400">/ {stats.globalTotal}</span>
            </div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Club / Global</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-black">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{stats.verified}</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Homologadas</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 font-black">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{stats.pending}</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Por Homologar</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{externalResults.length}</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Descubiertos Web</div>
          </div>
        </div>
      </div>

      {/* Scope Switcher Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-3 px-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-slate-500">Ámbito Catálogo:</span>
          <div className="flex items-center gap-1.5 bg-white p-1 border border-slate-200 rounded-xl shadow-xs">
            <button
              onClick={() => setCatalogScope("club")}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                catalogScope === "club"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              🏛️ Catálogo Sporting Saladar ({stats.clubTotal})
            </button>
            <button
              onClick={() => setCatalogScope("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                catalogScope === "all"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              🌐 Catálogo Completo / Plantillas ({stats.globalTotal})
            </button>
          </div>
        </div>

        <span className="text-xs font-bold text-slate-400">
          {catalogScope === "club"
            ? "Mostrando tareas oficiales asignadas a tu club"
            : "Mostrando todos los ejercicios homologados del sistema"}
        </span>
      </div>

      {/* Filters & Intelligent Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Sparkles className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500" />
            <input
              type="text"
              placeholder="¿Qué ejercicio necesitas? (ej: posesión para 12 jugadores infantil, presión tras pérdida...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchTerm.trim()) {
                  handleIntelligentSearch();
                }
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-indigo-200/60 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => handleIntelligentSearch()}
              disabled={isSearchingIntelligent}
              className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isSearchingIntelligent ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              )}
              {isSearchingIntelligent ? "Analizando..." : "Buscar"}
            </button>

            <button
              onClick={() => handleSearchExternal()}
              disabled={isSearchingExternal}
              className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black border transition-all cursor-pointer disabled:opacity-50 ${
                activeTab === "web"
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
              }`}
            >
              {isSearchingExternal ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Globe className="w-3.5 h-3.5" />
              )}
              Web
            </button>

            <button
              onClick={() => {
                setSearchTerm("");
                setSearchIntent(null);
                setScoreExplanations({});
                setSelectedCategory("all");
                setSelectedType("all");
                setSelectedFamily("all");
                setSelectedDifficulty("all");
                setSelectedBlock("all");
                setMinPlayers("");
                setExternalResults([]);
                setHasSearchedExternal(false);
                setExternalSearchError(null);
                setActiveTab("verified");
                fetchExercises();
              }}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 py-2.5 px-3 rounded-xl hover:bg-slate-100 transition-all flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              Limpiar
            </button>
          </div>
        </div>

        {/* Suggestion Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 font-bold whitespace-nowrap flex items-center gap-1 text-[11px]">
            <Bot className="w-3 h-3 text-indigo-500" /> Sugerencias:
          </span>
          {[
            "Posesión para 12 jugadores",
            "Presión tras pérdida infantil",
            "Finalización para 10 jugadores",
            "Transición defensiva en espacio reducido",
            "Rondo 4v2 senior"
          ].map((sug, i) => (
            <button
              key={i}
              onClick={() => {
                setSearchTerm(sug);
                handleIntelligentSearch(sug);
              }}
              className="bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200/80 px-2.5 py-1 rounded-lg text-slate-600 font-medium text-[11px] whitespace-nowrap transition-all cursor-pointer"
            >
              {sug}
            </button>
          ))}
        </div>

        {/* Extracted Intent Badge Row */}
        {searchIntent && (
          <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-2.5 flex items-center flex-wrap gap-2 text-xs">
            <span className="font-black text-indigo-900 flex items-center gap-1 text-[11px]">
              <Sparkles className="w-3 h-3 text-indigo-600" /> Criterios detectados:
            </span>
            {searchIntent.extractedAgeCategory && (
              <span className="bg-white border border-indigo-200 text-indigo-800 font-bold px-2 py-0.5 rounded-md text-[11px]">
                👶 Categoría: {searchIntent.extractedAgeCategory}
              </span>
            )}
            {searchIntent.extractedObjectives.map((obj, i) => (
              <span key={i} className="bg-white border border-indigo-200 text-indigo-800 font-bold px-2 py-0.5 rounded-md text-[11px]">
                🎯 {obj}
              </span>
            ))}
            {searchIntent.extractedPlayersMin !== undefined && (
              <span className="bg-white border border-indigo-200 text-indigo-800 font-bold px-2 py-0.5 rounded-md text-[11px]">
                👥 {searchIntent.extractedPlayersMin} jugadores
              </span>
            )}
            {searchIntent.extractedDurationMin !== undefined && (
              <span className="bg-white border border-indigo-200 text-indigo-800 font-bold px-2 py-0.5 rounded-md text-[11px]">
                ⏱️ {searchIntent.extractedDurationMin} min
              </span>
            )}
            {searchIntent.extractedSpace && (
              <span className="bg-white border border-indigo-200 text-indigo-800 font-bold px-2 py-0.5 rounded-md text-[11px]">
                📐 {searchIntent.extractedSpace}
              </span>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Categoría</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Familia</label>
            <select
              value={selectedFamily}
              onChange={(e) => setSelectedFamily(e.target.value)}
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {families.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Tipo Tarea</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {types.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Bloque Sesión</label>
            <select
              value={selectedBlock}
              onChange={(e) => setSelectedBlock(e.target.value)}
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {blocks.map((b) => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Dificultad</label>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todas</option>
              <option value="1">Nivel 1 - Básico</option>
              <option value="2">Nivel 2 - Intermedio</option>
              <option value="3">Nivel 3 - Avanzado</option>
              <option value="4">Nivel 4 - Élite</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Mín. Jugadores</label>
            <input
              type="number"
              placeholder="Ej: 10"
              value={minPlayers}
              onChange={(e) => setMinPlayers(e.target.value)}
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Tabs Homologados vs Pendientes vs Web Externa */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-2 gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab("verified")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
              activeTab === "verified"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Homologados ({stats.verified})
          </button>

          <button
            onClick={() => setActiveTab("pending")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
              activeTab === "pending"
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            Candidatos Pendientes ({stats.pending})
          </button>

          <button
            onClick={() => {
              setActiveTab("web");
              if (externalResults.length === 0 && !isSearchingExternal) {
                handleSearchExternal();
              }
            }}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
              activeTab === "web"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
            }`}
          >
            <Globe className="w-4 h-4" />
            🌐 Búsqueda Web / Externos ({externalResults.length})
          </button>
        </div>

        <span className="text-xs font-bold text-slate-400">
          {activeTab === "web" ? `Mostrando ${externalResults.length} resultados externos` : `Mostrando ${filteredByTab.length} ejercicios`}
        </span>
      </div>

      {/* ERROR FALLBACK BANNER (Búsqueda Externa) */}
      {externalSearchError && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-amber-800">
          <div className="flex items-center gap-2 text-sm font-bold">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <span>{externalSearchError}</span>
          </div>
          <button
            onClick={() => setExternalSearchError(null)}
            className="text-xs font-bold text-amber-600 hover:text-amber-900 px-2 py-1"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* VISTA 1 & 2: CATÁLOGO INTERNO (HOMOLOGADOS / PENDIENTES) */}
      {activeTab !== "web" && (
        <>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-400 font-bold text-sm mt-3">Cargando biblioteca metodológica...</p>
            </div>
          ) : filteredByTab.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-md mx-auto space-y-4">
              <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {activeTab === "pending" ? "No hay candidatos pendientes" : "No se encontraron tareas en este catálogo"}
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  {activeTab === "pending" 
                    ? "Todos los ejercicios importados están homologados y verificados." 
                    : "Prueba a cambiar el ámbito a 'Catálogo Completo', relajar los filtros o buscar en la Web."}
                </p>
              </div>
              {activeTab === "verified" && (
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setCatalogScope("all")}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-black transition-all cursor-pointer"
                  >
                    Ver Catálogo Completo (199)
                  </button>
                  <button
                    onClick={() => handleSearchExternal()}
                    disabled={isSearchingExternal}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSearchingExternal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                    Buscar en Internet
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredByTab.map((ex) => (
                <div
                  key={ex.id}
                  onClick={() => setSelectedExercise(ex)}
                  className={`bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group ${
                    ex.is_validated === false ? "border-amber-300 ring-1 ring-amber-300/40 bg-amber-50/20" : "border-slate-200 hover:border-blue-400"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                          🏠 Oficial
                        </span>
                        <span className="text-[11px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                          {ex.age_category || (ex.categoria_edad && ex.categoria_edad[0]) || 'General'}
                        </span>
                        {ex.is_validated === false && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300">
                            Pendiente
                          </span>
                        )}
                      </div>
                      {getDifficultyBadge(ex.dificultad || 2)}
                    </div>

                    {/* Match Relevance Explanation (FASE 49) */}
                    {scoreExplanations[ex.id] && (
                      <div className="bg-indigo-50/80 border border-indigo-200 text-indigo-900 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-indigo-600 flex-shrink-0" />
                        <span className="line-clamp-1">{scoreExplanations[ex.id]}</span>
                      </div>
                    )}

                    {/* Title */}
                    <h3 className="text-base font-black text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                      {ex.nombre}
                    </h3>

                    {/* Subtitle / Family */}
                    <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600">
                      <Activity className="w-3.5 h-3.5" />
                      <span>{ex.familia || 'TÁCTICA'} • {ex.tipo}</span>
                    </div>

                    {/* Description Snippet */}
                    <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">
                      {ex.descripcion}
                    </p>

                    {/* Objectives Chips */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {(ex.objetivo_tactico || []).slice(0, 2).map((tac: string, i: number) => (
                        <span key={i} className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                          {tac}
                        </span>
                      ))}
                      {(ex.objetivo_tecnico || []).slice(0, 2).map((tec: string, i: number) => (
                        <span key={i} className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          {tec}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Bottom Metrics Bar */}
                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-400">
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      <span>{ex.min_players}-{ex.max_players} jug.</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{ex.duracion_recomendada || 15} min</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Maximize className="w-3.5 h-3.5 text-slate-500" />
                      <span className="truncate max-w-[80px]">{ex.espacio || '20x20m'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* VISTA 3: BÚSQUEDA WEB / RESULTADOS EXTERNOS (FASE 48 & 53) */}
      {activeTab === "web" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black shadow-xs">
                  <Globe className="w-4 h-4" />
                </div>
                <h2 className="text-base font-black text-slate-900 tracking-tight">
                  Resultados Web en Repositorios Federados Allowlisted
                </h2>
                <span className="bg-indigo-100 text-indigo-800 border border-indigo-200 text-[10px] font-black uppercase px-2 py-0.5 rounded-md">
                  🌐 Fuentes Oficiales Web
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Contenido descubierto bajo demanda (RFEF, UEFA, The FA, FootballDNA, Soccer Coach Weekly, The Coaching Manual). Aislado del catálogo oficial.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSearchExternal()}
                disabled={isSearchingExternal}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isSearchingExternal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                Actualizar Búsqueda Web
              </button>
            </div>
          </div>

          {isSearchingExternal ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-3xl">
              <Loader2 className="w-10 h-10 border-indigo-600 text-indigo-600 animate-spin" />
              <p className="text-slate-500 font-bold text-sm mt-3">Consultando repositorios federados en Internet...</p>
              <p className="text-slate-400 text-xs mt-1">RFEF, UEFA Grassroots, The FA, FootballDNA, Soccer Coach Weekly</p>
            </div>
          ) : externalResults.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-md mx-auto space-y-4">
              <Globe className="w-12 h-12 text-indigo-400 mx-auto" />
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  No se encontraron ejercicios externos
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Escribe un concepto de entrenamiento como "presión tras pérdida", "posesión infantil 12 jugadores" o "transición defensiva" y pulsa Web.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center pt-2">
                {["presión tras pérdida", "posesión infantil 12 jugadores", "transición defensiva espacio reducido"].map((sample, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setSearchTerm(sample);
                      handleSearchExternal(sample);
                    }}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    🔍 {sample}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {externalResults.map((ext) => (
                <div
                  key={ext.id}
                  className="bg-white border border-indigo-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-indigo-400 transition-all flex flex-col justify-between group relative overflow-hidden"
                >
                  {/* Top Verification Badge */}
                  <div className="absolute top-0 right-0 text-white text-[9px] font-black uppercase px-2.5 py-0.5 rounded-bl-lg flex items-center gap-1">
                    {ext.verificationStatus === "VERIFIED" ? (
                      <span className="bg-emerald-600 px-2 py-0.5 rounded-bl-lg flex items-center gap-1">
                        <Globe className="w-2.5 h-2.5" />
                        Verificado
                      </span>
                    ) : ext.verificationStatus === "UNVERIFIED" ? (
                      <span className="bg-amber-600 px-2 py-0.5 rounded-bl-lg flex items-center gap-1">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        No Verificado
                      </span>
                    ) : ext.verificationStatus === "BROKEN" ? (
                      <span className="bg-rose-600 px-2 py-0.5 rounded-bl-lg flex items-center gap-1">
                        <AlertCircle className="w-2.5 h-2.5" />
                        No Válido
                      </span>
                    ) : (
                      <span className="bg-indigo-600 px-2 py-0.5 rounded-bl-lg flex items-center gap-1">
                        <Globe className="w-2.5 h-2.5" />
                        Fuente Oficial
                      </span>
                    )}
                  </div>

                  <div className="space-y-3">
                    {/* Top Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {ext.ageCategory}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        • {ext.source} {ext.domain ? `(${ext.domain})` : ""}
                      </span>
                    </div>

                    {/* Match Relevance Explanation (FASE 49) */}
                    {scoreExplanations[ext.id] && (
                      <div className="bg-indigo-50/80 border border-indigo-200 text-indigo-900 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-indigo-600 flex-shrink-0" />
                        <span className="line-clamp-1">{scoreExplanations[ext.id]}</span>
                      </div>
                    )}

                    {/* Title */}
                    <h3 className="text-base font-black text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                      {ext.title}
                    </h3>

                    {/* Description Snippet */}
                    <p className="text-xs text-slate-500 font-medium line-clamp-3 leading-relaxed">
                      {ext.description}
                    </p>

                    {/* Objectives Chips */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {ext.dominantObjective && (
                        <span className="text-[10px] font-black bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded">
                          ⚡ Dominante: {ext.dominantObjective}
                        </span>
                      )}
                      {ext.tacticalObjective && (
                        <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                          🎯 {ext.tacticalObjective}
                        </span>
                      )}
                      {ext.technicalObjective && (
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          ⚽ {ext.technicalObjective}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions & Metrics */}
                  <div className="pt-4 mt-4 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                      <div className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        <span>{ext.players} jug.</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>{ext.duration} min</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedExternalExercise(ext)}
                        className="flex-1 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
                      >
                        Ver Detalle
                      </button>

                      <a
                        href={ext.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1"
                      >
                        Fuente <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* EXTERNAL EXERCISE DETAIL MODAL */}
      {selectedExternalExercise && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto space-y-6 my-auto">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedExternalExercise.verificationStatus === "VERIFIED" ? (
                    <span className="text-xs font-black uppercase px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      🌐 EXTERNO — VERIFICADO
                    </span>
                  ) : selectedExternalExercise.verificationStatus === "PARTIALLY_VERIFIED" ? (
                    <span className="text-xs font-black uppercase px-2.5 py-1 rounded-md bg-indigo-100 text-indigo-800 flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      🌐 EXTERNO — FUENTE OFICIAL
                    </span>
                  ) : selectedExternalExercise.verificationStatus === "UNVERIFIED" ? (
                    <span className="text-xs font-black uppercase px-2.5 py-1 rounded-md bg-amber-100 text-amber-800 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      ⚠️ NO VERIFICADO
                    </span>
                  ) : (
                    <span className="text-xs font-black uppercase px-2.5 py-1 rounded-md bg-rose-100 text-rose-800 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      ⛔ FUENTE ROTA / INCONSISTENTE
                    </span>
                  )}
                  <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md">
                    {selectedExternalExercise.ageCategory}
                  </span>
                  {selectedExternalExercise.domain && (
                    <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2.5 py-1 rounded-md">
                      🌐 {selectedExternalExercise.domain}
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-2">
                  {selectedExternalExercise.title}
                </h2>
                <div className="flex items-center gap-3 text-xs text-slate-500 font-bold mt-1">
                  <span>ID: <code className="font-mono text-slate-700">{selectedExternalExercise.id}</code></span>
                  <span>•</span>
                  <span>Fuente declarada: <strong className="text-slate-800">{selectedExternalExercise.source}</strong></span>
                </div>
              </div>
              <button
                onClick={() => setSelectedExternalExercise(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Trazabilidad y Evidencia Documental Externa (FASE 59) */}
              <div className="bg-indigo-50/80 border border-indigo-200 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-indigo-600" />
                    Auditoría de Veracidad y Evidencia Documental
                  </h4>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-indigo-200/80 text-indigo-900">
                    Tipo: {selectedExternalExercise.evidence?.type || (selectedExternalExercise.verificationStatus === "UNVERIFIED" ? "internal_record" : "official_domain_only")}
                  </span>
                </div>

                <p className="text-xs text-indigo-950 font-medium leading-relaxed bg-white/70 p-2.5 rounded-xl border border-indigo-100">
                  {selectedExternalExercise.externalEvidence || selectedExternalExercise.evidence?.quote || "Dominio oficial confirmado, pero no se ha encontrado evidencia documental específica suficiente del ejercicio."}
                </p>

                {/* Checklist de Verificación y Respaldo */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1">
                  <div className="bg-white/80 p-2 rounded-xl border border-indigo-100 text-[11px]">
                    <span className="text-slate-400 block font-bold text-[9px] uppercase">Dominio Compatible</span>
                    <span className={`font-black ${!selectedExternalExercise.sourceMismatch ? "text-emerald-700" : "text-rose-700"}`}>
                      {!selectedExternalExercise.sourceMismatch ? "✅ SÍ" : "❌ NO"}
                    </span>
                  </div>

                  <div className="bg-white/80 p-2 rounded-xl border border-indigo-100 text-[11px]">
                    <span className="text-slate-400 block font-bold text-[9px] uppercase">Evidencia Ejercicio</span>
                    <span className={`font-black ${selectedExternalExercise.evidence?.supportsExercise ? "text-emerald-700" : "text-amber-700"}`}>
                      {selectedExternalExercise.evidence?.supportsExercise ? "✅ SÍ (Verificado)" : "⚠️ NO DISPONIBLE"}
                    </span>
                  </div>

                  <div className="bg-white/80 p-2 rounded-xl border border-indigo-100 text-[11px]">
                    <span className="text-slate-400 block font-bold text-[9px] uppercase">Evidencia Fuente</span>
                    <span className={`font-black ${selectedExternalExercise.evidence?.supportsSource !== false ? "text-emerald-700" : "text-amber-700"}`}>
                      {selectedExternalExercise.evidence?.supportsSource !== false ? "✅ SÍ (Oficial)" : "❌ NO"}
                    </span>
                  </div>

                  <div className="bg-white/80 p-2 rounded-xl border border-indigo-100 text-[11px]">
                    <span className="text-slate-400 block font-bold text-[9px] uppercase">Objetivo Táctico</span>
                    <span className="font-black text-indigo-900 uppercase">
                      {selectedExternalExercise.dominantObjective || "PTP"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-indigo-100/60 text-[10px] text-indigo-700 font-bold">
                  <div className="truncate max-w-xs">
                    <span>URL: <code className="font-mono text-indigo-900">{selectedExternalExercise.evidence?.url || selectedExternalExercise.sourceUrl}</code></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Auditado: {selectedExternalExercise.evidence?.checkedAt || "2026-08-21"}</span>
                    <button
                      disabled={isRevalidatingHealth}
                      onClick={async () => {
                        setIsRevalidatingHealth(true);
                        try {
                          const res = await revalidateExternalEvidenceAction(selectedExternalExercise);
                          if (res?.success) {
                            setHealthCheckStatus(res.result);
                          }
                        } finally {
                          setIsRevalidatingHealth(false);
                        }
                      }}
                      className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isRevalidatingHealth ? (
                        <>
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          Comprobando...
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-2.5 h-2.5" />
                          Revalidar Estado
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {healthCheckStatus && healthCheckStatus.externalExerciseId === selectedExternalExercise.id && (
                  <div className="bg-white p-2.5 rounded-xl border border-indigo-200 mt-2 text-[11px] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-indigo-950">Estado de Salud: <strong className="text-emerald-700">{healthCheckStatus.healthStatus}</strong></span>
                      <span className="text-[10px] text-slate-500 font-mono">HTTP {healthCheckStatus.httpStatus || 200} • {healthCheckStatus.durationMs}ms</span>
                    </div>
                    {healthCheckStatus.contentHash && (
                      <div className="text-[9px] text-slate-500 font-mono truncate">
                        Hash SHA256: {healthCheckStatus.contentHash}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Descripción</h4>
                <p className="text-sm text-slate-700 font-medium leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  {selectedExternalExercise.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {selectedExternalExercise.tacticalObjective && (
                  <div className="bg-indigo-50/60 border border-indigo-100 p-3.5 rounded-2xl">
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-indigo-800 mb-1">Objetivo Táctico</h5>
                    <p className="text-xs font-bold text-indigo-950">{selectedExternalExercise.tacticalObjective}</p>
                  </div>
                )}
                {selectedExternalExercise.technicalObjective && (
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">Objetivo Técnico</h5>
                    <p className="text-xs font-bold text-slate-900">{selectedExternalExercise.technicalObjective}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-xs font-bold text-slate-600 bg-slate-100/70 p-3 rounded-xl">
                <span>⏱️ {selectedExternalExercise.duration} minutos</span>
                <span>👥 {selectedExternalExercise.players} jugadores</span>
                <span>🎯 Dificultad: Nivel {selectedExternalExercise.difficulty}</span>
              </div>

              {selectedExternalExercise.equipment?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Material sugerido</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedExternalExercise.equipment.map((mat, i) => (
                      <span key={i} className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-bold">
                        {mat}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => handleCopyExternalDetails(selectedExternalExercise)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copySuccess ? "¡Copiado al Portapapeles!" : "Copiar Resumen"}
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => {
                    setSessionPrompt(`Sesión de entrenamiento centrada en ${selectedExternalExercise.title} (${selectedExternalExercise.ageCategory || 'Infantil'})`);
                    setSelectedExternalExercise(null);
                    setIsSessionGeneratorOpen(true);
                  }}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-black rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Planificar Sesión con IA
                </button>

                <a
                  href={selectedExternalExercise.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl shadow-sm transition-all"
                >
                  Fuente <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedExercise && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-3xl w-full shadow-2xl max-h-[90vh] overflow-y-auto space-y-6 my-auto">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase px-2.5 py-1 rounded-md bg-blue-100 text-blue-800">
                    {selectedExercise.age_category || 'General'}
                  </span>
                  <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md">
                    {selectedExercise.familia || 'Táctica'} • {selectedExercise.tipo}
                  </span>
                  {getDifficultyBadge(selectedExercise.dificultad || 2)}
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-2">
                  {selectedExercise.nombre}
                </h2>
                <p className="text-xs text-slate-400 font-bold mt-0.5">
                  Fuente: {selectedExercise.fuente || 'Adaptación metodológica'}
                </p>
              </div>
              <button
                onClick={() => setSelectedExercise(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tactical Load Indicator Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Carga Física</div>
                {getIntensityBar(selectedExercise.carga_fisica || 2)}
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Carga Cognitiva</div>
                {getIntensityBar(selectedExercise.carga_cognitiva || 2)}
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Oposición</div>
                {getIntensityBar(selectedExercise.oposicion || 2)}
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Representatividad</div>
                {getIntensityBar(selectedExercise.representatividad || 3)}
              </div>
            </div>

            {/* Description & Organization */}
            <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-blue-600" />
                  Descripción Metodológica
                </h4>
                <p className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-slate-700">
                  {selectedExercise.descripcion}
                </p>
              </div>

              {selectedExercise.desarrollo && (
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-1">
                    Desarrollo Táctico y Rotaciones
                  </h4>
                  <p className="text-slate-600">
                    {selectedExercise.desarrollo}
                  </p>
                </div>
              )}

              {/* Success Criteria & Corrections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4">
                  <h5 className="text-xs font-black text-emerald-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Criterios de Éxito
                  </h5>
                  <ul className="space-y-1 text-xs font-medium text-emerald-800">
                    {(selectedExercise.criterios_exito || ["Ejecución técnica correcta"]).map((crit: string, i: number) => (
                      <li key={i}>• {crit}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4">
                  <h5 className="text-xs font-black text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    Intervenciones / Correcciones
                  </h5>
                  <p className="text-xs text-amber-800">
                    {selectedExercise.correcciones || selectedExercise.intervenciones || "Foco en la orientación corporal y el pase al pie alejado."}
                  </p>
                </div>
              </div>

              {/* Progressions & Regressions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[11px] font-black text-blue-700 uppercase tracking-wider block mb-1">
                    ▲ Progresión
                  </span>
                  <p className="text-xs text-slate-600">
                    {selectedExercise.progresion_descripcion || "Reducir espacio y limitar toques a 1-2."}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider block mb-1">
                    ▼ Regresión
                  </span>
                  <p className="text-xs text-slate-600">
                    {selectedExercise.regresion_descripcion || "Agrandar dimensiones y añadir comodín ofensivo."}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions Bottom */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2">
                {selectedExercise.is_verified === false ? (
                  <button
                    onClick={() => handleVerifyExercise(selectedExercise.id, true)}
                    className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    Aprobar y Homologar
                  </button>
                ) : (
                  <button
                    onClick={() => handleVerifyExercise(selectedExercise.id, false)}
                    className="py-2 px-3 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-800 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    Deshomologar
                  </button>
                )}

                <button
                  onClick={() => handleDeleteExercise(selectedExercise.id)}
                  className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedExercise(null)}
                  className="py-2.5 px-4 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cerrar
                </button>
                <a
                  href="/admin/metodologia/sesiones/nueva"
                  className="py-2.5 px-5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Añadir a Sesión
                </a>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* IMPORT MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Importador Estructurado de Ejercicios
                  </h3>
                  <p className="text-xs text-slate-500">
                    Valida campos pedagógicos, rangos y procedencia antes de insertar como candidato
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {importFeedback && (
              <div className={`p-4 rounded-2xl text-xs font-bold ${
                importFeedback.success 
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {importFeedback.message}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Pega el objeto o array JSON de ejercicios:
              </label>
              <textarea
                rows={10}
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                placeholder='[&#10;  {&#10;    "nombre": "Rondo 4v2 con Tercer Hombre",&#10;    "tipo": "rondo",&#10;    "bloque_sesion": "calentamiento",&#10;    "carga_fisica": 2,&#10;    "carga_cognitiva": 3,&#10;    "oposicion": 2,&#10;    "representatividad": 3,&#10;    "age_category": "cadete",&#10;    "source": "RFEF Curso Nivel 2",&#10;    "author": "Área Metodológica"&#10;  }&#10;]'
                className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleProcessImport}
                disabled={isImporting || !importJsonText.trim()}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer"
              >
                {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Validar e Importar Candidatos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SESSION GENERATOR MODAL (FASE 50) */}
      {isSessionGeneratorOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-4xl w-full shadow-2xl max-h-[92vh] overflow-y-auto space-y-6 my-auto">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md">
                  <Sparkles className="w-6 h-6 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800">
                      IA Metodológica
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      • Planificación Automática
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
                    Generador Inteligente de Sesiones
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Describe la sesión deseada en lenguaje natural y genera una progresión metodológica completa.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSessionGeneratorOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Input & Prompt Editing Section (FASE 55) */}
            {generatedSession && !isEditingPrompt ? (
              <div className="bg-slate-50 border border-slate-200/90 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                      Petición Activa
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      • {generatedSession.variantLabel || `Variante ${variantNumber} generada`}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-800 italic">
                    "{sessionPrompt}"
                  </p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setIsEditingPrompt(true)}
                    className="flex-1 sm:flex-initial px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                  >
                    ✏️ Modificar petición
                  </button>
                  <button
                    onClick={() => handleGenerateSession(undefined, true)}
                    disabled={isGeneratingSession}
                    className="flex-1 sm:flex-initial px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-black rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    {isGeneratingSession ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5 text-amber-300" />}
                    Regenerar (Variante {variantNumber + 1})
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 bg-slate-50 border border-slate-200/80 p-4 rounded-2xl">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 block">
                    ¿Qué tipo de entrenamiento necesitas hoy?
                  </label>
                  {generatedSession && (
                    <button
                      onClick={() => setIsEditingPrompt(false)}
                      className="text-[11px] font-bold text-slate-400 hover:text-slate-600 underline"
                    >
                      Cancelar edición
                    </button>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={sessionPrompt}
                    onChange={(e) => setSessionPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && sessionPrompt.trim()) {
                        handleGenerateSession();
                      }
                    }}
                    placeholder="Ej: Prepárame una sesión de 75 minutos para infantil centrada en presión tras pérdida con 12 jugadores."
                    className="flex-1 px-4 py-2.5 bg-white border border-indigo-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={() => handleGenerateSession()}
                    disabled={isGeneratingSession || !sessionPrompt.trim()}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-black rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    {isGeneratingSession ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Wand2 className="w-4 h-4 text-amber-300" />
                    )}
                    {isGeneratingSession ? "Planificando..." : "Generar Sesión"}
                  </button>
                </div>

                {/* Example Prompts */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px]">
                  <span className="text-slate-400 font-bold">💡 Ejemplos:</span>
                  {[
                    "Sesión de 75 min para infantil sobre presión tras pérdida con 12 jugadores",
                    "Hazla más intensa y utiliza 2 ejercicios externos de UEFA",
                    "Entrenamiento de 60 min para alevín con rondos y juego reducido"
                  ].map((exPrompt, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSessionPrompt(exPrompt);
                        handleGenerateSession(exPrompt);
                      }}
                      className="bg-white hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 px-2.5 py-1 rounded-lg text-slate-600 font-medium transition-all text-[10px] cursor-pointer"
                    >
                      {exPrompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Generated Session Plan Preview */}
            {generatedSession && (
              <div className="space-y-4 pt-2">
                {/* Session Summary Card */}
                <div className="bg-gradient-to-br from-indigo-50/70 to-purple-50/50 border border-indigo-200/80 rounded-2xl p-4.5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-purple-100 text-purple-800 border border-purple-200 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-lg inline-flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-purple-600" />
                          {generatedSession.variantLabel || `Variante ${variantNumber} generada`}
                        </span>
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-black uppercase px-2 py-0.5 rounded-lg inline-flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" />
                          Coherencia Metodológica 100%
                        </span>
                      </div>
                      <h4 className="text-base font-black text-slate-900">
                        {generatedSession.title}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">
                        {generatedSession.methodologicalSummary}
                      </p>
                    </div>

                    {/* Time Budget Indicator */}
                    <div className="flex-shrink-0">
                      {generatedSession.isDurationExact ? (
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-black px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          Duración exacta: {generatedSession.calculatedDurationMinutes} / {generatedSession.totalDurationMinutes} min
                        </span>
                      ) : (
                        <span className="bg-amber-100 text-amber-800 border border-amber-300 text-xs font-black px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                          Ajuste necesario: {generatedSession.calculatedDurationMinutes} / {generatedSession.totalDurationMinutes} min
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-bold text-slate-600 flex-wrap">
                    <span>🎯 Objetivo: <strong className="text-slate-900">{generatedSession.intent.primaryObjective}</strong></span>
                    {generatedSession.intent.ageCategory && (
                      <span>👶 Categoría: <strong className="text-slate-900">{generatedSession.intent.ageCategory}</strong></span>
                    )}
                    {generatedSession.intent.players && (
                      <span>👥 Jugadores: <strong className="text-slate-900">{generatedSession.intent.players}</strong></span>
                    )}
                    <span>⏱️ Total: <strong className="text-slate-900">{generatedSession.totalDurationMinutes} min</strong></span>
                  </div>
                </div>

                {/* Drills Progression List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-black uppercase tracking-wider text-slate-400">
                      Progresión Metodológica de Tareas ({generatedSession.drills.length} bloques)
                    </h5>
                    <span className="text-[11px] font-bold text-slate-400">
                      Puedes ajustar duraciones (+ / -) y reordenar tareas
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {generatedSession.drills.map((drill, idx) => (
                      <div
                        key={drill.id}
                        className="bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl p-4 shadow-sm transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-3 flex-1">
                          <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                            {idx + 1}
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                                {drill.phaseLabel}
                              </span>
                              {drill.source === "oficial" ? (
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                                  🏠 Oficial
                                </span>
                              ) : (
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200">
                                  🌐 Externo
                                </span>
                              )}
                            </div>

                            <h6 className="text-sm font-black text-slate-900">
                              {drill.exercise.nombre || drill.exercise.title}
                            </h6>

                            <p className="text-xs text-slate-500 font-medium line-clamp-2">
                              {drill.exercise.descripcion || drill.exercise.description}
                            </p>

                            <div className="text-[10px] font-bold text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded-md inline-block">
                              {drill.selectionRationale}
                            </div>
                          </div>
                        </div>

                        {/* Drill Controls */}
                        <div className="flex items-center gap-2 sm:self-center flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 w-full sm:w-auto justify-between sm:justify-end">
                          {/* Duration Controls */}
                          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                            <button
                              onClick={() => handleUpdateDrillDuration(drill.id, -5)}
                              className="w-6 h-6 rounded-lg bg-white hover:bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center transition-colors"
                            >
                              -
                            </button>
                            <span className="text-xs font-black text-slate-800 px-2 min-w-[50px] text-center">
                              {drill.allocatedDurationMin} min
                            </span>
                            <button
                              onClick={() => handleUpdateDrillDuration(drill.id, 5)}
                              className="w-6 h-6 rounded-lg bg-white hover:bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center transition-colors"
                            >
                              +
                            </button>
                          </div>

                          {/* Reorder Buttons */}
                          <div className="flex items-center gap-0.5">
                            <button
                              disabled={idx === 0}
                              onClick={() => handleMoveDrill(idx, "up")}
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              disabled={idx === generatedSession.drills.length - 1}
                              onClick={() => handleMoveDrill(idx, "down")}
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Delete Drill */}
                          <button
                            onClick={() => handleRemoveDrill(drill.id)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Save Feedback Banner */}
                {saveSuccessSessionId && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-emerald-800 text-xs font-bold">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>¡Sesión guardada con éxito en la base de datos de tu club!</span>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Link
                        href={`/admin/metodologia/sesiones/${saveSuccessSessionId}`}
                        className="px-3 py-1.5 bg-white text-slate-700 hover:bg-slate-100 rounded-xl border border-emerald-300 font-black text-center flex-1 sm:flex-initial"
                      >
                        Ver Detalle
                      </Link>
                      <Link
                        href={`/admin/metodologia/sesiones/${saveSuccessSessionId}/ejecucion`}
                        className="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-500 rounded-xl font-black text-center flex-1 sm:flex-initial flex items-center justify-center gap-1 shadow-sm"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        Ir a Modo Campo
                      </Link>
                    </div>
                  </div>
                )}

                {/* Modal Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                    <button
                      onClick={handleCopySessionPlan}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      {sessionCopySuccess ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {sessionCopySuccess ? "¡Copiada!" : "Copiar"}
                    </button>

                    <button
                      onClick={() => setIsEditingPrompt(true)}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      ✏️ Modificar petición
                    </button>

                    <button
                      onClick={() => handleGenerateSession(undefined, true)}
                      disabled={isGeneratingSession}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-black rounded-xl transition-all cursor-pointer"
                    >
                      {isGeneratingSession ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5 text-indigo-600" />}
                      Regenerar (Variante {variantNumber + 1})
                    </button>

                    <button
                      onClick={handleExportSessionPdf}
                      disabled={isExportingPdf}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isExportingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                      Exportar PDF con QR
                    </button>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap justify-end">
                    <button
                      onClick={() => handleSaveGeneratedSession("draft")}
                      disabled={isSavingSession}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black rounded-xl border border-slate-200 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5 text-slate-600" />
                      Guardar Borrador
                    </button>

                    <button
                      onClick={() => handleSaveGeneratedSession("planned")}
                      disabled={isSavingSession}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Guardar Planificada
                    </button>

                    <button
                      onClick={() => handleSaveGeneratedSession("planned", true)}
                      disabled={isSavingSession}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Guardar e Iniciar Campo
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
