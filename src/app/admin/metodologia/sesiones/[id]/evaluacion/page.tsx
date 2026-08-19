"use client";

import { useState, useEffect, useMemo, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  ArrowLeft, Save, CheckCircle2, AlertCircle, Clock, 
  Users, Activity, Target, Shield, Check, X, 
  HelpCircle, MessageSquare, AlertTriangle, FileText, Loader2, Sparkles, Trophy
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  getMethodologySessionById, 
  getSessionEvaluation, 
  saveSessionEvaluation,
  buildPlannedVsActualComparison,
  BehaviourEvaluationItem 
} from "@/lib/methodology/methodologyService";

export default function SessionEvaluationPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const sessionId = resolvedParams.id;
  const router = useRouter();
  const supabase = createClient();

  const [session, setSession] = useState<any>(null);
  const [teamPlayers, setTeamPlayers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [actualDuration, setActualDuration] = useState<number>(90);
  const [sessionRpe, setSessionRpe] = useState<number>(6);
  const [objectiveAchievement, setObjectiveAchievement] = useState<number>(3);
  const [coachObservations, setCoachObservations] = useState<string>("");
  const [incidentsNotes, setIncidentsNotes] = useState<string>("");

  // Attendance State: record of playerId -> 'present' | 'absent' | 'excused'
  const [attendanceMap, setAttendanceMap] = useState<Record<string, 'present' | 'absent' | 'excused'>>({});

  // Behaviours State
  const [behaviours, setBehaviours] = useState<BehaviourEvaluationItem[]>([]);

  useEffect(() => {
    loadData();
  }, [sessionId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [sessionData, evalData] = await Promise.all([
        getMethodologySessionById(sessionId),
        getSessionEvaluation(sessionId)
      ]);

      if (sessionData) {
        setSession(sessionData);
        setActualDuration(sessionData.duration_minutes || 90);

        // Fetch team players for attendance
        if (sessionData.team_id) {
          const { data: playersData } = await supabase
            .from("players")
            .select("id, first_name, last_name, dorsal, position")
            .eq("team_id", sessionData.team_id)
            .order("dorsal", { ascending: true });

          const playersList = playersData || [];
          setTeamPlayers(playersList);

          // Inicializar asistencia
          const initialAttMap: Record<string, 'present' | 'absent' | 'excused'> = {};
          playersList.forEach(p => {
            const existing = (evalData.attendance || []).find((a: any) => a.player_id === p.id);
            initialAttMap[p.id] = existing ? existing.status : 'present';
          });
          setAttendanceMap(initialAttMap);
        }

        // Extraer comportamientos taxonómicos de los ejercicios de la sesión
        const extractedBehaviours: BehaviourEvaluationItem[] = [];
        const seenDescriptions = new Set<string>();

        // Si ya había una evaluación guardada, restaurar sus comportamientos
        if (evalData.evaluation?.session_behaviour_evaluations?.length > 0) {
          evalData.evaluation.session_behaviour_evaluations.forEach((b: any) => {
            extractedBehaviours.push({
              id: b.id,
              behaviourId: b.behaviour_id,
              behaviourDescription: b.behaviour_description,
              gamePhaseOrFamily: b.game_phase_or_family,
              score: b.score,
              coachNotes: b.coach_notes || ""
            });
            seenDescriptions.add(b.behaviour_description);
          });
        } else {
          // Extraer de los ejercicios de la sesión
          Object.values(sessionData.blocks || {}).forEach((drillList: any) => {
            drillList.forEach((drill: any) => {
              (drill.criterios_exito || []).forEach((crit: string) => {
                if (!seenDescriptions.has(crit)) {
                  seenDescriptions.add(crit);
                  extractedBehaviours.push({
                    behaviourDescription: crit,
                    gamePhaseOrFamily: drill.familia || drill.game_phase || "Modelo de Juego",
                    score: 3,
                    coachNotes: ""
                  });
                }
              });
            });
          });

          // Si no hay comportamientos en los ejercicios, añadir los objetivos taxonómicos
          if (extractedBehaviours.length === 0 && sessionData.objective) {
            extractedBehaviours.push({
              behaviourDescription: sessionData.objective,
              gamePhaseOrFamily: "Objetivo Principal",
              score: 3,
              coachNotes: ""
            });
          }
        }

        setBehaviours(extractedBehaviours);

        // Restaurar campos de evaluación si existen
        if (evalData.evaluation) {
          setActualDuration(evalData.evaluation.actual_duration_min || sessionData.duration_minutes || 90);
          setSessionRpe(evalData.evaluation.session_rpe || 6);
          setObjectiveAchievement(evalData.evaluation.objective_achievement || 3);
          setCoachObservations(evalData.evaluation.coach_observations || "");
          setIncidentsNotes(evalData.evaluation.incidents_notes || "");
        }
      }
    } catch (error) {
      console.error("Error loading session evaluation:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const presentPlayersCount = useMemo(() => {
    return Object.values(attendanceMap).filter(status => status === 'present').length;
  }, [attendanceMap]);

  const comparison = useMemo(() => {
    if (!session) return null;
    return buildPlannedVsActualComparison(session, {
      actual_duration_min: actualDuration,
      players_present_count: presentPlayersCount,
      session_rpe: sessionRpe,
      objective_achievement: objectiveAchievement,
      session_behaviour_evaluations: behaviours,
      coach_observations: coachObservations,
      incidents_notes: incidentsNotes
    });
  }, [session, actualDuration, presentPlayersCount, sessionRpe, objectiveAchievement, behaviours, coachObservations, incidentsNotes]);

  const handleToggleAttendance = (playerId: string, status: 'present' | 'absent' | 'excused') => {
    setAttendanceMap(prev => ({
      ...prev,
      [playerId]: status
    }));
  };

  const handleUpdateBehaviourScore = (index: number, score: number) => {
    setBehaviours(prev => {
      const next = [...prev];
      next[index] = { ...next[index], score };
      return next;
    });
  };

  const handleUpdateBehaviourNotes = (index: number, coachNotes: string) => {
    setBehaviours(prev => {
      const next = [...prev];
      next[index] = { ...next[index], coachNotes };
      return next;
    });
  };

  const handleSaveEvaluation = async () => {
    setIsSaving(true);
    try {
      const attendanceList = Object.entries(attendanceMap).map(([playerId, status]) => ({
        playerId,
        status
      }));

      await saveSessionEvaluation({
        sessionId,
        actualDurationMin: actualDuration,
        sessionRpe,
        objectiveAchievement,
        playersPresentCount: presentPlayersCount,
        coachObservations,
        incidentsNotes,
        attendance: attendanceList,
        behaviours
      });

      alert("¡Evaluación post-sesión guardada correctamente!");
      router.push(`/admin/metodologia/sesiones/${sessionId}`);
    } catch (error) {
      console.error("Error saving evaluation:", error);
      alert("Error al guardar la evaluación");
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

  const getRpeLabel = (rpe: number) => {
    if (rpe <= 2) return "1-2 • Muy Suave / Regenerativo";
    if (rpe <= 4) return "3-4 • Suave / Capacidad";
    if (rpe <= 6) return "5-6 • Moderado / Tensión Táctica";
    if (rpe <= 8) return "7-8 • Duro / Alta Intensidad";
    return "9-10 • Máximo Esfuerzo / Exhaustivo";
  };

  const getAchievementLabel = (level: number) => {
    switch (level) {
      case 1: return "1 • No conseguido (Aparecen errores críticos)";
      case 2: return "2 • Parcialmente (Aparece de forma irregular)";
      case 3: return "3 • Conseguido (Comportamiento consistente)";
      case 4: return "4 • Superado / Automatizado (Excelente ejecución)";
      default: return "";
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
        <div className="flex items-center gap-4">
          <Link href={`/admin/metodologia/sesiones/${sessionId}`} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase px-2 py-0.5 rounded-md bg-purple-100 text-purple-800">
                Evaluación Post-Sesión
              </span>
              <span className="text-xs font-bold text-slate-400">
                • {session?.teams?.name || "Equipo"} ({session?.age_category})
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
              {session?.objective || "Cierre de Sesión Metodológica"}
            </h1>
          </div>
        </div>

        <button 
          onClick={handleSaveEvaluation}
          disabled={isSaving}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition-all flex items-center gap-2 shadow-sm shrink-0"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Guardar y Cerrar Ciclo
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT / MAIN COLUMN: EVALUATION INPUTS */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* SECTION 1: EJECUCIÓN & RPE */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
              <Activity className="w-5 h-5 text-blue-600" />
              1. Ejecución Real & Carga Percibida (RPE)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Duración Real de la Sesión
                </label>
                <div className="flex items-center gap-3">
                  <input 
                    type="number" 
                    value={actualDuration}
                    onChange={e => setActualDuration(Math.max(1, parseInt(e.target.value, 10) || 0))}
                    className="w-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-center"
                  />
                  <span className="text-sm font-bold text-slate-500">minutos (Planificado: {session?.duration_minutes}&apos;)</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  RPE de Sesión (Escala 1 - 10)
                </label>
                <input 
                  type="range"
                  min="1"
                  max="10"
                  value={sessionRpe}
                  onChange={e => setSessionRpe(parseInt(e.target.value, 10))}
                  className="w-full accent-blue-600"
                />
                <span className="text-xs font-bold text-blue-600 mt-1 block">
                  {getRpeLabel(sessionRpe)}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Consecución del Objetivo Principal
              </label>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                {[1, 2, 3, 4].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setObjectiveAchievement(val)}
                    className={`p-3 rounded-xl border text-left transition-all text-xs font-bold ${
                      objectiveAchievement === val 
                        ? 'bg-blue-50 border-blue-600 text-blue-900 ring-2 ring-blue-500/20' 
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-black text-sm mb-0.5">Nivel {val}</div>
                    <div className="text-[11px] font-medium opacity-80">{getAchievementLabel(val).split(" • ")[1]}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 2: COMPORTAMIENTOS OBSERVABLES (1-4) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                2. Valoración de Comportamientos Observables
              </h2>
              <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md">
                Taxonomía Metodológica (1-4)
              </span>
            </div>

            {behaviours.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No hay comportamientos vinculados a esta sesión.</p>
            ) : (
              <div className="space-y-4">
                {behaviours.map((b, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                          {b.gamePhaseOrFamily || "Fase de Juego"}
                        </span>
                        <h4 className="text-xs font-black text-slate-900 mt-1">
                          {b.behaviourDescription}
                        </h4>
                      </div>

                      {/* 1-4 SELECTOR */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {[1, 2, 3, 4].map(scoreVal => (
                          <button
                            key={scoreVal}
                            type="button"
                            onClick={() => handleUpdateBehaviourScore(idx, scoreVal)}
                            className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${
                              b.score === scoreVal
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {scoreVal}
                          </button>
                        ))}
                      </div>
                    </div>

                    <input 
                      type="text"
                      placeholder="Observaciones específicas sobre este comportamiento (opcional)..."
                      value={b.coachNotes || ""}
                      onChange={e => handleUpdateBehaviourNotes(idx, e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 3: ASISTENCIA DE JUGADORES */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                3. Pase de Lista y Asistencia
              </h2>
              <span className="text-xs font-bold text-slate-500">
                {presentPlayersCount} presentes de {teamPlayers.length} convocados
              </span>
            </div>

            {teamPlayers.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No se encontraron jugadores registrados en este equipo.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
                {teamPlayers.map(p => {
                  const status = attendanceMap[p.id] || 'present';
                  return (
                    <div 
                      key={p.id}
                      className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center font-black text-[11px] text-slate-700 shrink-0">
                          {p.dorsal || "-"}
                        </span>
                        <span className="font-bold text-slate-800 truncate">
                          {p.first_name} {p.last_name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleAttendance(p.id, 'present')}
                          className={`p-1.5 rounded-lg transition-colors ${
                            status === 'present' ? 'bg-emerald-600 text-white font-bold' : 'bg-white border border-slate-200 text-slate-400 hover:text-slate-600'
                          }`}
                          title="Presente"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleAttendance(p.id, 'absent')}
                          className={`p-1.5 rounded-lg transition-colors ${
                            status === 'absent' ? 'bg-rose-600 text-white font-bold' : 'bg-white border border-slate-200 text-slate-400 hover:text-slate-600'
                          }`}
                          title="Ausente"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleAttendance(p.id, 'excused')}
                          className={`p-1.5 rounded-lg transition-colors ${
                            status === 'excused' ? 'bg-amber-500 text-white font-bold' : 'bg-white border border-slate-200 text-slate-400 hover:text-slate-600'
                          }`}
                          title="Justificado"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 4: OBSERVACIONES E INCIDENCIAS */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
              <FileText className="w-5 h-5 text-blue-600" />
              4. Observaciones e Incidencias del Entrenador
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-500 mb-1 uppercase tracking-wider text-[10px]">
                  Observaciones Metodológicas Generales
                </label>
                <textarea 
                  rows={3}
                  value={coachObservations}
                  onChange={e => setCoachObservations(e.target.value)}
                  placeholder="Detalla cómo respondió el equipo a los ejercicios, ritmo de juego, adaptaciones..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-1 uppercase tracking-wider text-[10px]">
                  Incidencias / Modificaciones sobre la marcha
                </label>
                <textarea 
                  rows={2}
                  value={incidentsNotes}
                  onChange={e => setIncidentsNotes(e.target.value)}
                  placeholder="Molestias físicas, cambios por climatología, reducción de espacio..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: PLANIFICADO VS EJECUTADO COMPARISON */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 sticky top-6">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Trophy className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-black text-slate-900">
                Planificado vs Ejecutado
              </h3>
            </div>

            {comparison && (
              <div className="space-y-4 text-xs">
                
                {/* DURATION COMPARISON */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <div className="flex justify-between items-center text-slate-500 font-bold text-[11px] uppercase">
                    <span>Duración</span>
                    <span>{comparison.durationDiffMin === 0 ? "Exacta" : `${comparison.durationDiffMin > 0 ? `+${comparison.durationDiffMin}` : comparison.durationDiffMin} min`}</span>
                  </div>
                  <div className="flex justify-between items-baseline font-black text-slate-800">
                    <span className="text-sm">Plan: {comparison.plannedDurationMin}&apos;</span>
                    <span className="text-sm text-blue-600">Real: {comparison.actualDurationMin}&apos;</span>
                  </div>
                </div>

                {/* PLAYERS COMPARISON */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <div className="flex justify-between items-center text-slate-500 font-bold text-[11px] uppercase">
                    <span>Jugadores</span>
                    <span>{comparison.playersDiff === 0 ? "Completo" : `${comparison.playersDiff > 0 ? `+${comparison.playersDiff}` : comparison.playersDiff}`}</span>
                  </div>
                  <div className="flex justify-between items-baseline font-black text-slate-800">
                    <span className="text-sm">Previstos: {comparison.plannedPlayers}</span>
                    <span className="text-sm text-emerald-600">Presentes: {comparison.actualPlayers}</span>
                  </div>
                </div>

                {/* LOAD / RPE COMPARISON */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <div className="flex justify-between items-center text-slate-500 font-bold text-[11px] uppercase">
                    <span>Carga Estimada vs RPE</span>
                    <span>MD: {session?.microcycle_day}</span>
                  </div>
                  <div className="flex justify-between items-baseline font-black text-slate-800">
                    <span className="text-sm">Carga: {comparison.plannedLoad}%</span>
                    <span className="text-sm text-purple-600">RPE: {comparison.actualRpe} / 10</span>
                  </div>
                </div>

                {/* BEHAVIOURS AVERAGE */}
                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 space-y-1">
                  <div className="flex justify-between items-center text-blue-700 font-bold text-[11px] uppercase">
                    <span>Media Comportamientos</span>
                    <span>Escala 1-4</span>
                  </div>
                  <div className="text-2xl font-black text-blue-900">
                    {comparison.avgBehaviourScore} <span className="text-xs text-blue-600 font-medium">/ 4</span>
                  </div>
                </div>

                {/* DEVIATIONS ALERTS */}
                {comparison.deviations.length > 0 && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-amber-800 font-black text-[11px] uppercase">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Desviaciones Detectadas
                    </div>
                    <ul className="space-y-1 text-[11px] text-amber-700 font-medium list-disc list-inside">
                      {comparison.deviations.map((dev, i) => (
                        <li key={i}>{dev}</li>
                      ))}
                    </ul>
                  </div>
                )}

              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
