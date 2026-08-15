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
  HeartHandshake 
} from "lucide-react";
import toast from "react-hot-toast";

interface FormativeEvaluationFormProps {
  playerId: string;
  playerName: string;
  playerAvatarUrl?: string | null;
  dorsal?: number | null;
  eventId?: string | null;
  onSaved?: () => void;
}

export function FormativeEvaluationForm({
  playerId,
  playerName,
  playerAvatarUrl,
  dorsal,
  eventId,
  onSaved
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
      toast.error("Error al cargar la rúbrica formativa");
    } finally {
      setLoading(false);
    }
  };

  const handleScoreSelect = (conceptId: string, level: number) => {
    setScores(prev => ({
      ...prev,
      [conceptId]: level
    }));
  };

  const handleNoteChange = (conceptId: string, text: string) => {
    setCoachNotes(prev => ({
      ...prev,
      [conceptId]: text
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const itemsPayload = Object.entries(scores).map(([conceptId, score]) => ({
        concept_id: conceptId,
        score,
        coach_notes: coachNotes[conceptId] || null
      }));

      const dto: UpsertEvaluationDTO = {
        id: evaluationId,
        player_id: playerId,
        event_id: eventId || null,
        evaluation_date: new Date().toISOString().split("T")[0],
        evaluation_period: evaluationPeriod,
        general_feedback: generalFeedback.trim() || null,
        strengths: strengths.trim() || null,
        areas_for_improvement: areasForImprovement.trim() || null,
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
      {/* Header del Formulario Formativo */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-3xl text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white/10 border-2 border-white/20 flex items-center justify-center font-black text-xl shrink-0 shadow-inner">
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
            <h2 className="text-xl font-black text-white mt-1 leading-tight">{playerName}</h2>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <select
            value={evaluationPeriod}
            onChange={(e) => setEvaluationPeriod(e.target.value)}
            className="bg-white/10 text-white text-xs font-bold px-3 py-2.5 rounded-xl border border-white/20 outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="Trimestre 1" className="text-slate-900">1er Trimestre</option>
            <option value="Trimestre 2" className="text-slate-900">2do Trimestre</option>
            <option value="Trimestre 3" className="text-slate-900">3er Trimestre</option>
            <option value="Evaluacion Continua" className="text-slate-900">Evaluación Continua</option>
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
    </div>
  );
}
