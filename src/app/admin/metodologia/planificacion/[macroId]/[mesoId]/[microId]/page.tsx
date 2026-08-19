"use client";

import { useState, useEffect, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Calendar, ChevronRight, Loader2, ArrowLeft, Activity, Trophy, 
  Sparkles, CheckCircle2, AlertTriangle, RotateCw, Save, Plus, Trash2,
  Clock, ShieldAlert, Brain, Target, ArrowRight
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  generateMicrocycleProposal,
  regenerateMicrocycleDay,
  validateMicrocycleProposal,
  MicrocycleProposal,
  MicrocycleDayPlan,
  MicrocycleValidationResult
} from "@/lib/methodology/methodologyMicrocyclePlanner";
import { calculateMethodologyPriorities } from "@/lib/methodology/methodologyPriorityEngine";

export default function MicrocycleDetailPage({ params }: { params: Promise<{ macroId: string; mesoId: string; microId: string }> }) {
  const resolvedParams = use(params);
  const { macroId, mesoId, microId } = resolvedParams;
  const router = useRouter();
  const supabase = createClient();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [microcycle, setMicrocycle] = useState<any>(null);
  const [mesocycle, setMesocycle] = useState<any>(null);
  const [macrocycle, setMacrocycle] = useState<any>(null);
  const [team, setTeam] = useState<any>(null);
  const [curriculumPrinciples, setCurriculumPrinciples] = useState<any[]>([]);
  const [teamObjectives, setTeamObjectives] = useState<any[]>([]);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);

  // Estado del Planificador
  const [proposal, setProposal] = useState<MicrocycleProposal | null>(null);
  const [validation, setValidation] = useState<MicrocycleValidationResult>({
    valid: true,
    errors: [],
    warnings: [],
    metrics: { totalTrainingDays: 0, totalMinutes: 0, avgLoadPercentage: 0, principlesCount: 0 }
  });

  useEffect(() => {
    loadData();
  }, [microId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Cargar Microciclo, Mesociclo y Macrociclo
      const { data: microData } = await supabase
        .from("microcycles")
        .select("*, mesocycles(*, macrocycles(*))")
        .eq("id", microId)
        .single();

      if (microData) {
        setMicrocycle(microData);
        setMesocycle(microData.mesocycles);
        setMacrocycle(microData.mesocycles?.macrocycles);

        // 2. Cargar Equipo
        const teamId = microData.team_id || microData.mesocycles?.macrocycles?.team_id;
        if (teamId) {
          const { data: tData } = await supabase.from("teams").select("*").eq("id", teamId).single();
          setTeam(tData);

          // Cargar sesiones recientes
          const { data: sData } = await supabase
            .from("training_sessions")
            .select("*, session_evaluations(*)")
            .eq("team_id", teamId)
            .order("date_time", { ascending: false })
            .limit(5);
          setRecentSessions(sData || []);

          // Cargar objetivos del equipo
          const { data: oData } = await supabase.from("team_objectives").select("*").eq("team_id", teamId);
          setTeamObjectives(oData || []);
        }

        // 3. Cargar Principios del Currículo
        const { data: pData } = await supabase.from("methodology_principles").select("id, name, game_phase").order("sort_order");
        setCurriculumPrinciples(pData || []);

        // Generar propuesta inicial si no existe
        const initialContext = {
          teamId: teamId || "team-default",
          category: team?.category || "cadete",
          seasonId: microData.mesocycles?.macrocycles?.season_id,
          mesocycleId: mesoId,
          weekStartDate: microData.week_start_date,
          matchDayDate: microData.match_day_date || undefined,
          matchOpponent: microData.match_opponent || undefined,
          curriculumPrinciples: pData || [],
          teamObjectives: [],
          recentSessions: []
        };

        const initialProp = generateMicrocycleProposal(initialContext);
        setProposal(initialProp);
        setValidation(validateMicrocycleProposal(initialProp));
      }
    } catch (error) {
      console.error("Error cargando microciclo:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Acción de Generación Asistida del Microciclo Completo
  const handleGenerateProposal = () => {
    if (!microcycle) return;

    const priorities = calculateMethodologyPriorities({
      teamId: team?.id || "team-1",
      summary: { totalSessions: recentSessions.length, completedSessions: recentSessions.length, evaluatedSessions: recentSessions.length, avgObjectiveAchievement: 3, avgRpe: 6, avgAttendanceRate: 90, principleCoverage: [], behaviourEvolution: [] },
      history: recentSessions,
      curriculumPrinciples,
      teamObjectives
    });

    const prop = generateMicrocycleProposal({
      teamId: team?.id || "team-1",
      category: team?.category || "cadete",
      seasonId: macrocycle?.season_id,
      mesocycleId: mesoId,
      weekStartDate: microcycle.week_start_date,
      matchDayDate: microcycle.match_day_date || undefined,
      matchOpponent: microcycle.match_opponent || undefined,
      trainingDays: [2, 4, 5],
      priorities,
      curriculumPrinciples,
      teamObjectives,
      recentSessions
    });

    setProposal(prop);
    setValidation(validateMicrocycleProposal(prop));
  };

  // Regeneración determinista de un único día
  const handleRegenerateDay = (dayOfWeek: number) => {
    if (!proposal) return;
    const updated = regenerateMicrocycleDay(proposal, dayOfWeek, {
      teamId: team?.id || "team-1",
      category: team?.category || "cadete",
      weekStartDate: microcycle.week_start_date,
      curriculumPrinciples,
      recentSessions
    });
    setProposal(updated);
    setValidation(validateMicrocycleProposal(updated));
  };

  // Alternar día de entrenamiento
  const handleToggleTrainingDay = (dayOfWeek: number) => {
    if (!proposal) return;
    const updatedDays = proposal.days.map(d => {
      if (d.dayOfWeek === dayOfWeek && !d.isMatchDay) {
        const nextIsTraining = !d.isTrainingDay;
        return {
          ...d,
          isTrainingDay: nextIsTraining,
          plannedDurationMin: nextIsTraining ? 90 : 0,
          targetLoad: nextIsTraining ? ('Media' as const) : ('Descanso' as const),
          targetLoadPercentage: nextIsTraining ? 60 : 0
        };
      }
      return d;
    });

    const updatedProposal = {
      ...proposal,
      days: updatedDays,
      totalPlannedMinutes: updatedDays.reduce((s, d) => s + d.plannedDurationMin, 0)
    };

    setProposal(updatedProposal);
    setValidation(validateMicrocycleProposal(updatedProposal));
  };

  // Guardar Planificación en Supabase
  const handleSaveMicrocycle = async () => {
    if (!proposal || !validation.valid) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("microcycles")
        .update({
          total_minutes: proposal.totalPlannedMinutes,
          weekly_load_index: proposal.weeklyLoadIndex,
          objective: proposal.primaryWeeklyPriority || proposal.days.find(d => d.isTrainingDay)?.objective,
          notes: proposal.microcycleReasons.join("\n")
        })
        .eq("id", microId);

      if (error) throw error;
      alert("Planificación del microciclo guardada exitosamente.");
    } catch (err: any) {
      console.error("Error guardando microciclo:", err);
      alert("Error al guardar: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm font-bold text-slate-500">Cargando planificador de microciclo...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* BREADCRUMBS */}
      <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
        <Link href="/admin/metodologia/planificacion" className="hover:text-slate-600">Planificación</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link href={`/admin/metodologia/planificacion/${macroId}`} className="hover:text-slate-600">{macrocycle?.name || "Macrociclo"}</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link href={`/admin/metodologia/planificacion/${macroId}/${mesoId}`} className="hover:text-slate-600">{mesocycle?.name || "Mesociclo"}</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-slate-800">Semana del {microcycle?.week_start_date}</span>
      </div>

      {/* HEADER & ACTIONS */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-800">
              Microciclo Metodológico
            </span>
            <span className="text-xs font-bold text-slate-400">
              • Semana del {microcycle?.week_start_date}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-1">
            {team?.name || "Equipo"} • Planificación Semanal
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleGenerateProposal}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            Generar Propuesta Asistida
          </button>
          <button
            onClick={handleSaveMicrocycle}
            disabled={isSaving || !validation.valid}
            className={`px-4 py-2.5 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-sm ${
              !validation.valid ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500'
            }`}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Confirmar y Guardar Planificación
          </button>
        </div>
      </div>

      {/* VALIDATION NOTIFICATIONS */}
      {(!validation.valid || validation.warnings.length > 0) && (
        <div className="space-y-2">
          {validation.errors.map((err, i) => (
            <div key={`err-${i}`} className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs font-bold text-rose-800">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{err}</span>
            </div>
          ))}
          {validation.warnings.map((warn, i) => (
            <div key={`warn-${i}`} className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs font-bold text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{warn}</span>
            </div>
          ))}
        </div>
      )}

      {/* EXPLICABILIDAD DEL MICROCICLO */}
      {proposal && proposal.microcycleReasons.length > 0 && (
        <div className="bg-purple-50/60 border border-purple-100 rounded-2xl p-4 space-y-2">
          <span className="text-[11px] font-black uppercase text-purple-900 flex items-center gap-1.5">
            <Brain className="w-4 h-4 text-purple-600" />
            Justificación de la Planificación Semanal
          </span>
          <ul className="text-xs font-medium text-purple-800 space-y-1 list-disc list-inside">
            {proposal.microcycleReasons.map((r, idx) => (
              <li key={idx}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 7 DÍAS DEL MICROCICLO (LUNES A DOMINGO) */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {proposal?.days.map((day) => (
          <div 
            key={day.dayOfWeek}
            className={`flex flex-col justify-between rounded-2xl p-4 border transition-all ${
              day.isMatchDay 
                ? 'bg-amber-50/60 border-amber-200 ring-2 ring-amber-400/20' 
                : day.isTrainingDay 
                  ? 'bg-white border-slate-200 shadow-sm' 
                  : 'bg-slate-50 border-slate-200/60 opacity-75'
            }`}
          >
            <div className="space-y-2.5">
              {/* Day Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <span className="text-xs font-black text-slate-900 block">{day.dayName}</span>
                  <span className="text-[10px] font-bold text-slate-400">{day.date}</span>
                </div>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                  day.microcycleDay === 'MD' ? 'bg-amber-100 text-amber-900' :
                  day.microcycleDay === 'MD-3' ? 'bg-rose-100 text-rose-800' :
                  day.microcycleDay === 'MD-2' ? 'bg-blue-100 text-blue-800' :
                  day.microcycleDay === 'MD-1' ? 'bg-emerald-100 text-emerald-800' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {day.microcycleDay}
                </span>
              </div>

              {/* Day Status Toggle */}
              {!day.isMatchDay && (
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-500">Sesión:</span>
                  <button
                    onClick={() => handleToggleTrainingDay(day.dayOfWeek)}
                    className={`px-2 py-0.5 rounded text-[10px] font-black uppercase transition-colors ${
                      day.isTrainingDay ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {day.isTrainingDay ? 'Activa' : 'Descanso'}
                  </button>
                </div>
              )}

              {/* Target Load */}
              {day.isTrainingDay && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-slate-400">Carga: {day.targetLoad}</span>
                    <span className="text-slate-700">{day.plannedDurationMin} min</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${
                        day.targetLoad === 'Alta' ? 'bg-rose-500' :
                        day.targetLoad === 'Media-Alta' ? 'bg-blue-500' :
                        'bg-emerald-500'
                      }`}
                      style={{ width: `${day.targetLoadPercentage}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Objectives & Principles */}
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400">Objetivo Central:</span>
                <p className="text-xs font-bold text-slate-800 line-clamp-2">{day.objective}</p>
                {day.priorityContext && (
                  <span className="inline-block text-[9px] font-black bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-100">
                    ★ {day.priorityContext}
                  </span>
                )}
              </div>
            </div>

            {/* Day Actions */}
            <div className="pt-3 border-t border-slate-100 space-y-1.5 mt-3">
              {day.isTrainingDay && (
                <>
                  <button
                    onClick={() => handleRegenerateDay(day.dayOfWeek)}
                    className="w-full py-1.5 text-[10px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg flex items-center justify-center gap-1 transition-colors"
                  >
                    <RotateCw className="w-3 h-3" />
                    Regenerar Día
                  </button>
                  <Link
                    href={`/admin/metodologia/sesiones/nueva?teamId=${team?.id}&date=${day.date}&md=${day.microcycleDay}&duration=${day.plannedDurationMin}&objective=${encodeURIComponent(day.objective)}&priority=${encodeURIComponent(day.priorityContext || "")}`}
                    className="w-full py-1.5 text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center justify-center gap-1 transition-colors shadow-sm"
                  >
                    Generar Sesión Asistida
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </>
              )}
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}
