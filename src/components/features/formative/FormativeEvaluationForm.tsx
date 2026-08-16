"use client";

import React, { useState, useEffect } from "react";
import { 
  EvaluationModule, 
  EvaluationConcept, 
  ConceptRubric, 
  PlayerEvaluation, 
  UpsertEvaluationDTO 
} from "@/types/formative-evaluation";
import { 
  upsertEvaluationAction, 
  getEvaluationModulesWithRubrics, 
  getPlayerEvaluation 
} from "@/app/actions/formative-actions";
import { 
  BrainCircuit, 
  CheckCircle2, 
  Sparkles, 
  Save, 
  Loader2, 
  Info, 
  ChevronRight, 
  HelpCircle, 
  Flame, 
  Compass, 
  Activity, 
  HeartHandshake,
  X,
  Layers
} from "lucide-react";
import toast from "react-hot-toast";

interface FormativeEvaluationFormProps {
  playerId: string;
  playerName: string;
  playerAvatarUrl?: string | null;
  dorsal?: number | null;
  eventId?: string | null;
  onSaved?: () => void;
  onOpenProfile?: () => void;
}

export function FormativeEvaluationForm({
  playerId,
  playerName,
  playerAvatarUrl,
  dorsal,
  eventId,
  onSaved,
  onOpenProfile
}: FormativeEvaluationFormProps) {
  const [modules, setModules] = useState<EvaluationModule[]>([]);
  const [activeModuleCode, setActiveModuleCode] = useState<string>("tecnico_analitico");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [evaluationId, setEvaluationId] = useState<string | undefined>(undefined);
  const [evaluationPeriod, setEvaluationPeriod] = useState<string>("Trimestre 1");
  const [scores, setScores] = useState<Record<string, number>>({});
  const [coachNotes, setCoachNotes] = useState<Record<string, string>>({});
  const [generalFeedback, setGeneralFeedback] = useState("");
  const [strengths, setStrengths] = useState("");
  const [areasForImprovement, setAreasForImprovement] = useState("");
  const [hoveredRubric, setHoveredRubric] = useState<{ conceptId: string; rubric: ConceptRubric } | null>(null);
  const [selectedModalLevel, setSelectedModalLevel] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, [playerId, eventId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Cargar módulos y rúbricas
      const mods = await getEvaluationModulesWithRubrics();
      setModules(mods);
      if (mods.length > 0 && !activeModuleCode) {
        setActiveModuleCode(mods[0].code);
      }

      // 2. Cargar evaluación existente si la hay
      const existing = await getPlayerEvaluation(playerId, eventId);
      if (existing) {
        setEvaluationId(existing.id);
        setEvaluationPeriod(existing.evaluation_period || "Trimestre 1");
        setGeneralFeedback(existing.general_feedback || "");
        setStrengths(existing.strengths || "");
        setAreasForImprovement(existing.areas_for_improvement || "");

        const scoreMap: Record<string, number> = {};
        const notesMap: Record<string, string> = {};
        existing.items?.forEach(item => {
          scoreMap[item.concept_id] = item.score;
          if (item.coach_notes) notesMap[item.concept_id] = item.coach_notes;
        });
        setScores(scoreMap);
        setCoachNotes(notesMap);
      } else {
        // Reset form
        setEvaluationId(undefined);
        setScores({});
        setCoachNotes({});
        setGeneralFeedback("");
        setStrengths("");
        setAreasForImprovement("");
      }
    } catch (err) {
      console.error("Error al cargar datos formativos:", err);
      toast.error("No se pudieron cargar las rúbricas formativas");
    } finally {
      setLoading(false);
    }
  };

  const handleScoreSelect = (conceptId: string, score: number) => {
    setScores(prev => ({ ...prev, [conceptId]: score }));
  };

  const handleNoteChange = (conceptId: string, notes: string) => {
    setCoachNotes(prev => ({ ...prev, [conceptId]: notes }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const itemsPayload = Object.entries(scores).map(([conceptId, score]) => ({
        concept_id: conceptId,
        score,
        coach_notes: coachNotes[conceptId] || null
      }));

      if (itemsPayload.length === 0) {
        toast.error("Debes evaluar al menos un concepto antes de guardar");
        setSaving(false);
        return;
      }

      const dto: UpsertEvaluationDTO = {
        id: evaluationId,
        player_id: playerId,
        event_id: eventId || null,
        evaluation_date: new Date().toISOString().split('T')[0],
        evaluation_period: evaluationPeriod,
        general_feedback: generalFeedback || null,
        strengths: strengths || null,
        areas_for_improvement: areasForImprovement || null,
        items: itemsPayload
      };

      const res = await upsertEvaluationAction(dto);
      if (res.success) {
        if (res.evaluationId) setEvaluationId(res.evaluationId);
        toast.success("Evaluación formativa guardada correctamente");
        if (onSaved) onSaved();
      } else {
        toast.error(res.error || "Error al guardar la evaluación");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al procesar la evaluación");
    } finally {
      setSaving(false);
    }
  };

  const getModuleIcon = (code: string) => {
    switch (code) {
      case "tecnico_analitico":
        return <Flame size={16} className="text-amber-500" />;
      case "tactico_global":
        return <Compass size={16} className="text-blue-500" />;
      case "fisico_coordinativo":
        return <Activity size={16} className="text-emerald-500" />;
      case "socio_afectivo":
        return <HeartHandshake size={16} className="text-rose-500" />;
      default:
        return <BrainCircuit size={16} className="text-purple-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-slate-200 shadow-sm">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
        <p className="text-slate-600 text-sm font-semibold">Cargando rúbricas de evaluación formativa...</p>
      </div>
    );
  }

  const activeModule = (modules && modules.length > 0) 
    ? (modules.find(m => m.code === activeModuleCode) || modules[0])
    : null;

  if (!activeModule) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-sm text-slate-500">
        <p className="font-bold text-slate-700 mb-2">No se encontraron rúbricas formativas activas.</p>
        <p className="text-xs">Por favor, asegúrate de que los módulos maestros estén inicializados.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header del Formulario Formativo con Ficha Clicable */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-3xl text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div 
          onClick={onOpenProfile}
          title={onOpenProfile ? "Haz clic para ver informe completo y evolución" : undefined}
          className={`flex items-center gap-4 ${onOpenProfile ? "cursor-pointer group hover:opacity-95 transition-all" : ""}`}
        >
          <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white/10 border-2 border-white/20 flex items-center justify-center font-black text-xl shrink-0 shadow-inner group-hover:border-emerald-400 group-hover:scale-105 transition-all">
            {playerAvatarUrl ? (
              <img src={playerAvatarUrl} alt={playerName} className="w-full h-full object-cover object-[center_25%]" />
            ) : (
              <span>{dorsal || playerName.charAt(0)}</span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <BrainCircuit size={12} />
                Evaluación Formativa
              </span>
              {dorsal && (
                <span className="text-[11px] font-extrabold text-slate-300 bg-white/10 px-2 py-0.5 rounded-md">
                  Dorsal {dorsal}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <h2 className="text-xl font-black text-white leading-tight group-hover:text-emerald-300 transition-colors">{playerName}</h2>
              {onOpenProfile && (
                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-500/40 px-2 py-0.5 rounded-lg opacity-80 group-hover:opacity-100 transition-opacity">
                  Ver Ficha ↗
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end flex-wrap sm:flex-nowrap">
          <select
            value={evaluationPeriod}
            onChange={(e) => setEvaluationPeriod(e.target.value)}
            className="bg-white/10 text-white text-xs font-bold px-3 py-2.5 rounded-xl border border-white/20 outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
          >
            <optgroup label="Trimestral / Anual" className="bg-slate-900 text-white">
              <option value="Trimestre 1">1er Trimestre (Oct - Dic)</option>
              <option value="Trimestre 2">2do Trimestre (Ene - Mar)</option>
              <option value="Trimestre 3">3er Trimestre (Abr - Jun)</option>
              <option value="Evaluacion Anual">Evaluación Anual (Final)</option>
            </optgroup>
            <optgroup label="Diario / Sesión" className="bg-slate-900 text-white">
              <option value="Sesion">Sesión del día</option>
              <option value="Evaluacion Continua">Evaluación Continua</option>
            </optgroup>
            <optgroup label="Por Semanas" className="bg-slate-900 text-white">
              {Array.from({ length: 40 }, (_, i) => i + 1).map(w => (
                <option key={w} value={`Semana ${w}`}>Semana {w}</option>
              ))}
            </optgroup>
          </select>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm shadow-md transition-all active:scale-95 disabled:opacity-50 shrink-0"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>Guardar</span>
          </button>
        </div>
      </div>

      {/* ─── Panel Explicativo y Resumen de Niveles de Aprendizaje del Jugador ─── */}
      {(() => {
        const scoreEntries = Object.entries(scores);
        const totalEvaluated = scoreEntries.length;

        // Calcular promedios por módulos
        const moduleAverages = modules.map(m => {
          const modScores = m.concepts
            ?.filter(c => scores[c.id] !== undefined)
            .map(c => scores[c.id]) || [];
          const avg = modScores.length > 0
            ? (modScores.reduce((a, b) => a + b, 0) / modScores.length).toFixed(1)
            : null;
          return {
            id: m.id,
            name: m.name,
            code: m.code,
            evaluated: modScores.length,
            total: m.concepts?.length || 0,
            avg
          };
        });

        if (totalEvaluated === 0) {
          return (
            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2">
                <BrainCircuit size={16} className="text-emerald-600 shrink-0" />
                <span className="font-semibold text-slate-700">Sin calificaciones en esta sesión. Califica los conceptos inferiores para ver su perfil.</span>
              </div>
              <span className="text-[11px] font-bold text-slate-400">Escala de 1 a 5 (Iniciación a Dominio)</span>
            </div>
          );
        }

        const scoreValues = scoreEntries.map(([, s]) => s);
        const avgNum = scoreValues.reduce((a, b) => a + b, 0) / totalEvaluated;
        const avg = avgNum.toFixed(1);
        
        const count5 = scoreValues.filter(s => s === 5).length;
        const count4 = scoreValues.filter(s => s === 4).length;
        const count3 = scoreValues.filter(s => s === 3).length;
        const count2 = scoreValues.filter(s => s === 2).length;
        const count1 = scoreValues.filter(s => s === 1).length;

        const getGlobalLevelTitle = (num: number) => {
          if (num >= 4.5) return { text: "Dominio Excepcional", color: "text-emerald-700 bg-emerald-100 border-emerald-300" };
          if (num >= 3.8) return { text: "Nivel Consolidado", color: "text-teal-700 bg-teal-100 border-teal-300" };
          if (num >= 2.8) return { text: "En Progresión Adecuada", color: "text-blue-700 bg-blue-100 border-blue-300" };
          if (num >= 1.8) return { text: "En Desarrollo Activo", color: "text-amber-700 bg-amber-100 border-amber-300" };
          return { text: "Fase de Iniciación", color: "text-rose-700 bg-rose-100 border-rose-300" };
        };

        const globalLevel = getGlobalLevelTitle(avgNum);

        return (
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 animate-in fade-in">
            {/* Header del Panel con Nota Media y Diagnóstico */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    Diagnóstico Formativo y Niveles Alcanzados
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    ({totalEvaluated} de {modules.reduce((acc, m) => acc + (m.concepts?.length || 0), 0)} conceptos evaluados)
                  </span>
                </div>
                <p className="text-slate-500 text-xs mt-0.5 font-medium">
                  Estado de aprendizaje en base a las rúbricas formativas del club
                </p>
              </div>

              <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
                <span className={`text-xs font-black px-3 py-1 rounded-xl border ${globalLevel.color}`}>
                  {globalLevel.text}
                </span>
                <span className="text-base font-black bg-slate-900 text-white px-3 py-1 rounded-xl shadow-xs">
                  {avg} <span className="text-xs text-slate-300 font-medium">/ 5</span>
                </span>
              </div>
            </div>

            {/* Barra de Distribución Porcentual Visual */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span>Distribución por Niveles:</span>
                <span>{totalEvaluated} conceptos calificados</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex gap-0.5 p-0.5">
                {count5 > 0 && <div style={{ width: `${(count5 / totalEvaluated) * 100}%` }} className="bg-emerald-500 h-full rounded-full transition-all" title={`${count5} en Nivel 5`} />}
                {count4 > 0 && <div style={{ width: `${(count4 / totalEvaluated) * 100}%` }} className="bg-teal-500 h-full rounded-full transition-all" title={`${count4} en Nivel 4`} />}
                {count3 > 0 && <div style={{ width: `${(count3 / totalEvaluated) * 100}%` }} className="bg-blue-500 h-full rounded-full transition-all" title={`${count3} en Nivel 3`} />}
                {count2 > 0 && <div style={{ width: `${(count2 / totalEvaluated) * 100}%` }} className="bg-amber-500 h-full rounded-full transition-all" title={`${count2} en Nivel 2`} />}
                {count1 > 0 && <div style={{ width: `${(count1 / totalEvaluated) * 100}%` }} className="bg-rose-500 h-full rounded-full transition-all" title={`${count1} en Nivel 1`} />}
              </div>
            </div>

            {/* Tarjetas Explicativas Clicables por Nivel (Abren Ventana Emergente de Conceptos) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-1">
              <div 
                onClick={() => setSelectedModalLevel(5)}
                title="Haz clic para ver los conceptos evaluados en Nivel 5"
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-98 ${
                  count5 > 0 ? 'bg-emerald-50/90 border-emerald-300 ring-2 ring-emerald-500/20' : 'bg-slate-50/60 border-slate-200 opacity-60 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-black flex items-center justify-center shadow-xs">5</span>
                    <span className="font-extrabold text-xs text-emerald-950">Dominio</span>
                  </div>
                  <span className="text-xs font-black text-emerald-800 bg-emerald-200/80 px-2 py-0.5 rounded-lg border border-emerald-300">{count5}</span>
                </div>
                <p className="text-[10.5px] text-emerald-900/80 font-medium leading-tight">
                  Referente y autónomo. Resuelve con maestría y creatividad bajo máxima oposición.
                </p>
                <div className="mt-2 text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                  <span>Ver conceptos</span>
                  <ChevronRight size={12} />
                </div>
              </div>

              <div 
                onClick={() => setSelectedModalLevel(4)}
                title="Haz clic para ver los conceptos evaluados en Nivel 4"
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-98 ${
                  count4 > 0 ? 'bg-teal-50/90 border-teal-300 ring-2 ring-teal-500/20' : 'bg-slate-50/60 border-slate-200 opacity-60 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[11px] font-black flex items-center justify-center shadow-xs">4</span>
                    <span className="font-extrabold text-xs text-teal-950">Consolidado</span>
                  </div>
                  <span className="text-xs font-black text-teal-800 bg-teal-200/80 px-2 py-0.5 rounded-lg border border-teal-300">{count4}</span>
                </div>
                <p className="text-[10.5px] text-teal-900/80 font-medium leading-tight">
                  Alta efectividad. Buena toma de decisiones y precisión habitual en juego real.
                </p>
                <div className="mt-2 text-[10px] font-bold text-teal-700 flex items-center gap-1">
                  <span>Ver conceptos</span>
                  <ChevronRight size={12} />
                </div>
              </div>

              <div 
                onClick={() => setSelectedModalLevel(3)}
                title="Haz clic para ver los conceptos evaluados en Nivel 3"
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-98 ${
                  count3 > 0 ? 'bg-blue-50/90 border-blue-300 ring-2 ring-blue-500/20' : 'bg-slate-50/60 border-slate-200 opacity-60 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-black flex items-center justify-center shadow-xs">3</span>
                    <span className="font-extrabold text-xs text-blue-950">En Progresión</span>
                  </div>
                  <span className="text-xs font-black text-blue-800 bg-blue-200/80 px-2 py-0.5 rounded-lg border border-blue-300">{count3}</span>
                </div>
                <p className="text-[10.5px] text-blue-900/80 font-medium leading-tight">
                  Aplica el concepto con autonomía en situaciones estándar de entrenamiento y partido.
                </p>
                <div className="mt-2 text-[10px] font-bold text-blue-700 flex items-center gap-1">
                  <span>Ver conceptos</span>
                  <ChevronRight size={12} />
                </div>
              </div>

              <div 
                onClick={() => setSelectedModalLevel(2)}
                title="Haz clic para ver los conceptos evaluados en Nivel 2"
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-98 ${
                  count2 > 0 ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-500/20' : 'bg-slate-50/60 border-slate-200 opacity-60 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-amber-600 text-white text-[11px] font-black flex items-center justify-center shadow-xs">2</span>
                    <span className="font-extrabold text-xs text-amber-950">En Desarrollo</span>
                  </div>
                  <span className="text-xs font-black text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-lg border border-amber-300">{count2}</span>
                </div>
                <p className="text-[10.5px] text-amber-900/80 font-medium leading-tight">
                  Intenta el gesto o la decisión pero muestra inconsistencias en ritmo o ejecución.
                </p>
                <div className="mt-2 text-[10px] font-bold text-amber-700 flex items-center gap-1">
                  <span>Ver conceptos</span>
                  <ChevronRight size={12} />
                </div>
              </div>

              <div 
                onClick={() => setSelectedModalLevel(1)}
                title="Haz clic para ver los conceptos evaluados en Nivel 1"
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-98 ${
                  count1 > 0 ? 'bg-rose-50/90 border-rose-300 ring-2 ring-rose-500/20' : 'bg-slate-50/60 border-slate-200 opacity-60 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[11px] font-black flex items-center justify-center shadow-xs">1</span>
                    <span className="font-extrabold text-xs text-rose-950">Iniciación</span>
                  </div>
                  <span className="text-xs font-black text-rose-800 bg-rose-200/80 px-2 py-0.5 rounded-lg border border-rose-300">{count1}</span>
                </div>
                <p className="text-[10.5px] text-rose-900/80 font-medium leading-tight">
                  Fase de descubrimiento. Requiere guía paso a paso y demostración continua.
                </p>
                <div className="mt-2 text-[10px] font-bold text-rose-700 flex items-center gap-1">
                  <span>Ver conceptos</span>
                  <ChevronRight size={12} />
                </div>
              </div>
            </div>

            {/* Mini-Desglose por Módulos Evaluados */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Medias por Módulo:</span>
              {moduleAverages.map(mod => (
                <div key={mod.id} className="flex items-center gap-1.5 bg-slate-100/80 px-2.5 py-1 rounded-xl text-xs">
                  <span className="font-bold text-slate-700">{mod.name}:</span>
                  {mod.avg ? (
                    <span className="font-black text-slate-900 bg-white px-1.5 py-0.2 rounded-md shadow-xs border border-slate-200/60">
                      {mod.avg} <span className="text-[10px] text-slate-400">/ 5</span>
                    </span>
                  ) : (
                    <span className="text-slate-400 italic text-[11px]">Sin evaluar</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Selector de Módulos (Grid Adaptable sin Scroll Obligatorio) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 shadow-inner">
        {modules.map(mod => {
          const isActive = mod.code === activeModuleCode;
          const evaluatedInMod = mod.concepts?.filter(c => scores[c.id] !== undefined).length || 0;
          const totalInMod = mod.concepts?.length || 0;

          return (
            <button
              key={mod.id}
              type="button"
              onClick={() => setActiveModuleCode(mod.code)}
              className={`flex items-center justify-between gap-1.5 px-3 py-2.5 rounded-xl font-bold text-xs transition-all ${
                isActive 
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-white/40'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                {getModuleIcon(mod.code)}
                <span className="truncate">{mod.name.replace('Módulo ', '')}</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black shrink-0 ${
                evaluatedInMod === totalInMod && totalInMod > 0
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-200 text-slate-600'
              }`}>
                {evaluatedInMod}/{totalInMod}
              </span>
            </button>
          );
        })}
      </div>

      {/* Conceptos y Rúbricas del Módulo Activo */}
      <div className="space-y-4">
        {(activeModule.concepts || []).map((concept, idx) => {
          const currentScore = scores[concept.id];
          const rubrics = concept.rubrics || [];

          return (
            <div 
              key={concept.id}
              className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm hover:border-slate-300 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-black text-xs">
                    {idx + 1}
                  </span>
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">{concept.name}</h3>
                </div>
                
                {currentScore ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 self-start sm:self-auto">
                    <CheckCircle2 size={14} /> Puntuación: {currentScore} / 5
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-slate-400 italic">Pendiente de calificar</span>
                )}
              </div>

              {/* Selector de Rúbricas 1 a 5 con Feedback Táctil y Hover */}
              <div className="grid grid-cols-5 gap-1.5 sm:gap-3 mb-3">
                {[1, 2, 3, 4, 5].map((lvl) => {
                  const rubric = rubrics.find(r => r.score_level === lvl);
                  const isSelected = currentScore === lvl;
                  const isHovered = hoveredRubric?.conceptId === concept.id && hoveredRubric.rubric.score_level === lvl;

                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => handleScoreSelect(concept.id, lvl)}
                      onMouseEnter={() => rubric && setHoveredRubric({ conceptId: concept.id, rubric })}
                      onMouseLeave={() => setHoveredRubric(null)}
                      onTouchStart={() => rubric && setHoveredRubric({ conceptId: concept.id, rubric })}
                      className={`relative flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl border-2 transition-all cursor-pointer select-none ${
                        isSelected 
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-200 scale-[1.03] z-10' 
                          : isHovered
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-base sm:text-lg font-black">{lvl}</span>
                      <span className={`text-[10px] font-bold truncate max-w-full hidden md:inline mt-0.5 ${isSelected ? 'text-emerald-100' : 'text-slate-500'}`}>
                        {rubric?.short_label || `Nivel ${lvl}`}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Explicación de la Rúbrica Seleccionada o Hover */}
              {(() => {
                const activeRubric = (hoveredRubric?.conceptId === concept.id ? hoveredRubric.rubric : null) || rubrics.find(r => r.score_level === currentScore);
                
                if (!activeRubric) {
                  return (
                    <div className="p-3 rounded-2xl bg-slate-50 text-slate-500 text-xs font-medium flex items-center gap-2 border border-dashed border-slate-200">
                      <HelpCircle size={15} className="shrink-0 text-slate-400" />
                      <span>Pasa el dedo o pulsa cualquier número (1-5) para ver su criterio pedagógico de aprendizaje.</span>
                    </div>
                  );
                }

                return (
                  <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 text-xs animate-in fade-in space-y-1">
                    <div className="flex items-center justify-between font-bold text-emerald-900">
                      <span className="flex items-center gap-1.5">
                        <Info size={14} className="text-emerald-600" />
                        Nivel {activeRubric.score_level}: {activeRubric.short_label}
                      </span>
                      {hoveredRubric?.conceptId === concept.id && (
                        <span className="text-[10px] bg-emerald-200/60 text-emerald-800 px-2 py-0.5 rounded-md font-bold">
                          Previsualizando
                        </span>
                      )}
                    </div>
                    <p className="leading-relaxed font-medium text-emerald-900/90">{activeRubric.criteria_description}</p>
                  </div>
                );
              })()}

              {/* Observación cualitativa del entrenador */}
              <div className="mt-3">
                <input
                  type="text"
                  placeholder="Nota u observación opcional sobre este concepto..."
                  value={coachNotes[concept.id] || ""}
                  onChange={(e) => handleNoteChange(concept.id, e.target.value)}
                  className="w-full text-xs bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400 text-slate-800 placeholder:text-slate-400"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Bloque Cualitativo General (Fortalezas, Áreas de Mejora y Feedback) */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
          <Sparkles className="text-amber-500" size={18} />
          Informe y Feedback Cualitativo General
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">
              🌟 Principales Fortalezas
            </label>
            <textarea
              rows={3}
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
              placeholder="Aspectos destacados en su juego (ej: Gran velocidad en toma de decisiones, excelente golpeo)..."
              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-400 text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-rose-700 uppercase tracking-wider mb-1">
              🎯 Áreas de Mejora Prioritarias
            </label>
            <textarea
              rows={3}
              value={areasForImprovement}
              onChange={(e) => setAreasForImprovement(e.target.value)}
              placeholder="Habilidades a trabajar en los próximos entrenamientos (ej: Perfilación con pierna no hábil)..."
              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-rose-400 text-slate-800"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            💬 Recomendaciones y Mensaje para el Jugador / Familia
          </label>
          <textarea
            rows={3}
            value={generalFeedback}
            onChange={(e) => setGeneralFeedback(e.target.value)}
            placeholder="Consejos de desarrollo personal, actitud y compromiso formativo..."
            className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-400 text-slate-800"
          />
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-3 rounded-2xl text-xs sm:text-sm shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>Guardar Evaluación Formativa</span>
          </button>
        </div>
      </div>

      {/* ─── Ventana Emergente (Modal) con los Conceptos del Nivel Seleccionado ─── */}
      {selectedModalLevel !== null && (() => {
        // Encontrar todos los conceptos de todos los módulos que tienen exactamente este nivel
        const conceptsInLevel: { concept: EvaluationConcept; module: EvaluationModule; rubric?: ConceptRubric; note?: string }[] = [];
        
        modules.forEach(m => {
          m.concepts?.forEach(c => {
            if (scores[c.id] === selectedModalLevel) {
              const rub = c.rubrics?.find(r => r.score_level === selectedModalLevel);
              conceptsInLevel.push({
                concept: c,
                module: m,
                rubric: rub,
                note: coachNotes[c.id]
              });
            }
          });
        });

        const levelMetadata: Record<number, { title: string; desc: string; bgBadge: string; textBadge: string; borderBadge: string }> = {
          5: { 
            title: "Nivel 5: Dominio Excepcional", 
            desc: "Conceptos en los que el jugador es referente con autonomía total, fluidez y creatividad bajo máxima oposición.",
            bgBadge: "bg-emerald-600",
            textBadge: "text-emerald-700 bg-emerald-50",
            borderBadge: "border-emerald-300"
          },
          4: { 
            title: "Nivel 4: Consolidado", 
            desc: "Conceptos aplicados con alta efectividad, precisión técnica y buena toma de decisiones en situaciones reales de juego.",
            bgBadge: "bg-teal-600",
            textBadge: "text-teal-700 bg-teal-50",
            borderBadge: "border-teal-300"
          },
          3: { 
            title: "Nivel 3: En Progresión", 
            desc: "Conceptos aplicados correctamente con autonomía en situaciones estándar de entrenamiento y competición.",
            bgBadge: "bg-blue-600",
            textBadge: "text-blue-700 bg-blue-50",
            borderBadge: "border-blue-300"
          },
          2: { 
            title: "Nivel 2: En Desarrollo", 
            desc: "Conceptos en fase de desarrollo activo. El jugador intenta la acción pero muestra inconsistencias en ritmo o ejecución.",
            bgBadge: "bg-amber-600",
            textBadge: "text-amber-700 bg-amber-50",
            borderBadge: "border-amber-300"
          },
          1: { 
            title: "Nivel 1: Iniciación", 
            desc: "Conceptos en fase de descubrimiento. Requiere orientación directa, demostración y guía constante.",
            bgBadge: "bg-rose-600",
            textBadge: "text-rose-700 bg-rose-50",
            borderBadge: "border-rose-300"
          }
        };

        const meta = levelMetadata[selectedModalLevel] || levelMetadata[3];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
              
              {/* Modal Header */}
              <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-2xl ${meta.bgBadge} text-white font-black text-lg flex items-center justify-center shadow-md shrink-0`}>
                    {selectedModalLevel}
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                      {meta.title}
                    </h3>
                    <p className="text-slate-500 text-xs font-medium mt-0.5">
                      {conceptsInLevel.length} {conceptsInLevel.length === 1 ? 'concepto evaluado' : 'conceptos evaluados'} en este nivel
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedModalLevel(null)}
                  className="p-2 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shadow-xs"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Description */}
              <div className="px-5 sm:px-6 py-3 bg-slate-50/70 border-b border-slate-100 text-xs text-slate-600 font-medium">
                💡 <span className="font-bold text-slate-700">Criterio Pedagógico:</span> {meta.desc}
              </div>

              {/* Modal List of Concepts */}
              <div className="p-5 sm:p-6 overflow-y-auto divide-y divide-slate-100 space-y-4">
                {conceptsInLevel.length > 0 ? (
                  conceptsInLevel.map(({ concept, module, rubric, note }) => (
                    <div key={concept.id} className="pt-3 first:pt-0 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-slate-900">
                            {concept.name}
                          </span>
                        </div>
                        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border self-start sm:self-auto ${meta.textBadge} ${meta.borderBadge}`}>
                          {module.name}
                        </span>
                      </div>

                      {rubric && (
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs text-slate-700 leading-relaxed font-medium">
                          <span className="font-bold text-slate-900 block mb-0.5">
                            Rúbrica ({rubric.short_label}):
                          </span>
                          {rubric.criteria_description}
                        </div>
                      )}

                      {note && (
                        <div className="p-2.5 bg-amber-50/80 rounded-xl border border-amber-200 text-xs text-amber-900 font-medium italic">
                          📝 &ldquo;{note}&rdquo;
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                      <Layers size={22} />
                    </div>
                    <p className="text-sm font-bold text-slate-700">Sin conceptos en el Nivel {selectedModalLevel}</p>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Ningún concepto ha sido calificado todavía con la puntuación {selectedModalLevel} para este jugador.
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">
                  Jugador: <strong className="text-slate-800">{playerName}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedModalLevel(null)}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-xs"
                >
                  Cerrar
                </button>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
}
