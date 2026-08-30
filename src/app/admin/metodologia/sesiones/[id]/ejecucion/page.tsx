"use client";

import { useState, useEffect, use, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  CheckCircle2,
  Clock,
  Users,
  Target,
  ArrowLeft,
  Activity,
  AlertCircle,
  FileText,
  Volume2,
  VolumeX,
  Sparkles,
  ExternalLink,
  Shield,
  Layers,
  Save,
  Check,
  Loader2
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { completeOperationalSessionAction } from "@/app/actions/methodology-actions";

export default function FieldExecutionPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const sessionId = resolvedParams.id;
  const router = useRouter();
  const supabase = createClient();

  const [session, setSession] = useState<any | null>(null);
  const [drills, setDrills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDrillIndex, setCurrentDrillIndex] = useState(0);

  // Timer State
  const [drillSecondsRemaining, setDrillSecondsRemaining] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [totalElapsedSeconds, setTotalElapsedSeconds] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Feedback State
  const [coachNotes, setCoachNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    fetchSessionData();
  }, [sessionId]);

  const fetchSessionData = async () => {
    setLoading(true);
    try {
      const { data: sess, error: sessErr } = await supabase
        .from("training_sessions")
        .select("*, teams(name, category)")
        .eq("id", sessionId)
        .single();

      if (sessErr) throw sessErr;
      setSession(sess);
      setCoachNotes(sess.coach_notes || "");

      // Fetch drills
      const { data: dList, error: dErr } = await supabase
        .from("session_drills")
        .select("*, banco_ejercicios(*)")
        .eq("session_id", sessionId)
        .order("order_index", { ascending: true });

      if (dErr) throw dErr;

      const formatted = (dList || []).map((d: any, idx: number) => {
        const ex = d.banco_ejercicios || {};
        const isExt = !d.drill_id || (d.notes && d.notes.includes("[🌐 EXTERNO"));
        return {
          id: d.id,
          orderIndex: d.order_index || idx + 1,
          phase: d.phase,
          durationMin: d.duration_min || 15,
          notes: d.notes,
          title: ex.nombre || d.notes?.replace(/\[🌐 EXTERNO: (.*?)\] .*/, "$1") || `Tarea ${idx + 1}`,
          description: ex.descripcion || d.notes || "",
          corrections: ex.correcciones || "",
          space: ex.espacio || sess.available_space || "No especificado",
          players: ex.min_players ? `${ex.min_players}-${ex.max_players || ex.min_players}` : `${sess.num_players || 12}`,
          tacticalObjective: ex.objetivo_tactico ? ex.objetivo_tactico.join(", ") : sess.objective,
          technicalObjective: ex.objetivo_tecnico ? ex.objetivo_tecnico.join(", ") : "",
          criterios: ex.criterios_exito || [],
          isExternal: isExt
        };
      });

      setDrills(formatted);
      if (formatted.length > 0) {
        setDrillSecondsRemaining((formatted[0].durationMin || 15) * 60);
      }
    } catch (err: any) {
      console.error("Error fetching execution data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Timer Tick
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTotalElapsedSeconds((prev) => prev + 1);
        setDrillSecondsRemaining((prev) => {
          if (prev <= 1) {
            // Drill finished
            if (soundEnabled && typeof window !== "undefined") {
              try {
                const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                const osc = ctx.createOscillator();
                osc.type = "sine";
                osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 tone
                osc.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.5);
              } catch (e) {}
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, soundEnabled]);

  const handleSelectDrill = (idx: number) => {
    if (idx < 0 || idx >= drills.length) return;
    setCurrentDrillIndex(idx);
    setDrillSecondsRemaining((drills[idx].durationMin || 15) * 60);
    setIsTimerRunning(false);
  };

  const handleNextDrill = () => {
    if (currentDrillIndex < drills.length - 1) {
      handleSelectDrill(currentDrillIndex + 1);
    }
  };

  const handlePrevDrill = () => {
    if (currentDrillIndex > 0) {
      handleSelectDrill(currentDrillIndex - 1);
    }
  };

  const handleResetCurrentDrill = () => {
    if (drills[currentDrillIndex]) {
      setDrillSecondsRemaining((drills[currentDrillIndex].durationMin || 15) * 60);
      setIsTimerRunning(false);
    }
  };

  const handleFinishSession = async () => {
    setIsSaving(true);
    try {
      await completeOperationalSessionAction(sessionId, {
        coachObservations: coachNotes
      });
      setIsFinished(true);
    } catch (err: any) {
      alert(`Error al finalizar sesión: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
        <p className="text-sm font-bold text-slate-400 mt-4">Cargando pizarra de campo...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <p className="text-base font-bold text-rose-400">Sesión no encontrada o no autorizada.</p>
        <Link href="/admin/metodologia/sesiones" className="mt-4 text-xs font-bold text-indigo-400 underline">
          Volver a Mis Sesiones
        </Link>
      </div>
    );
  }

  const currentDrill = drills[currentDrillIndex] || null;
  const nextDrill = drills[currentDrillIndex + 1] || null;
  const drillTotalSecs = (currentDrill?.durationMin || 15) * 60;
  const drillProgress = drillTotalSecs > 0 ? ((drillTotalSecs - drillSecondsRemaining) / drillTotalSecs) * 100 : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/metodologia/sesiones"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-indigo-900/80 text-indigo-300 border border-indigo-700/50 text-[10px] font-black uppercase px-2 py-0.5 rounded-md">
                ▶️ Modo Campo
              </span>
              <span className="text-xs font-bold text-slate-400">
                {session.teams?.name || session.age_category || "Sporting Saladar"}
              </span>
            </div>
            <h1 className="text-sm md:text-base font-black text-white line-clamp-1">
              {session.title || session.objective}
            </h1>
          </div>
        </div>

        {/* Global Stats */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-slate-400">Transcurrido:</span>
            <span className="text-white font-mono">{formatTime(totalElapsedSeconds)}</span>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title={soundEnabled ? "Silenciar alarmas" : "Activar alarmas"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          <button
            onClick={handleFinishSession}
            disabled={isSaving}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isSaving ? "Guardando..." : "Finalizar"}
          </button>
        </div>
      </header>

      {/* Finished Banner */}
      {isFinished && (
        <div className="bg-emerald-950/80 border-b border-emerald-700 p-4 flex items-center justify-between text-emerald-200">
          <div className="flex items-center gap-2 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>¡Sesión finalizada y registrada con éxito como completada!</span>
          </div>
          <Link
            href="/admin/metodologia/sesiones"
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold"
          >
            Volver a Sesiones
          </Link>
        </div>
      )}

      {/* Main Field Grid */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Big Stopwatch & Controls (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Stopwatch Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col items-center justify-center relative overflow-hidden">
            {/* Progress bar line */}
            <div
              className="absolute top-0 left-0 h-1.5 bg-indigo-500 transition-all duration-300"
              style={{ width: `${drillProgress}%` }}
            />

            <div className="text-center space-y-1 mt-2">
              <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-slate-800 text-indigo-400 border border-slate-700 inline-block">
                {currentDrill?.phase?.toUpperCase() || "TAREA EN CURSO"}
              </span>
              <h2 className="text-lg font-black text-white line-clamp-1">
                {currentDrill?.title}
              </h2>
            </div>

            {/* Countdown Digits */}
            <div className="my-6">
              <span
                className={`font-mono text-6xl md:text-7xl font-black tracking-tight ${
                  drillSecondsRemaining <= 60 ? "text-rose-400 animate-pulse" : "text-white"
                }`}
              >
                {formatTime(drillSecondsRemaining)}
              </span>
            </div>

            {/* Timer Actions */}
            <div className="flex items-center gap-3 w-full justify-center">
              <button
                onClick={handleResetCurrentDrill}
                className="p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
                title="Reiniciar Tarea"
              >
                <RotateCcw className="w-5 h-5" />
              </button>

              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className={`px-8 py-4 rounded-2xl text-base font-black flex items-center gap-2 shadow-lg transition-all cursor-pointer ${
                  isTimerRunning
                    ? "bg-amber-500 hover:bg-amber-400 text-slate-950"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white"
                }`}
              >
                {isTimerRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 fill-current" />}
                {isTimerRunning ? "Pausar" : "Iniciar"}
              </button>

              <button
                onClick={handleNextDrill}
                disabled={currentDrillIndex >= drills.length - 1}
                className="p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer disabled:opacity-30"
                title="Siguiente Tarea"
              >
                <SkipForward className="w-5 h-5" />
              </button>
            </div>

            {/* Step Navigation Dots */}
            <div className="flex items-center gap-1.5 mt-6 pt-4 border-t border-slate-800 w-full justify-center">
              {drills.map((_, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectDrill(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === currentDrillIndex
                      ? "w-8 bg-indigo-500"
                      : i < currentDrillIndex
                      ? "w-2 bg-emerald-500"
                      : "w-2 bg-slate-700"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Quick Notes for Coach */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-400" />
                Observaciones en Directo
              </label>
              <span className="text-[10px] text-slate-500 font-bold">Auto-guardado al finalizar</span>
            </div>
            <textarea
              rows={3}
              value={coachNotes}
              onChange={(e) => setCoachNotes(e.target.value)}
              placeholder="Anota incidencias, intensidad, rendimiento o correcciones tácticas..."
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>
        </div>

        {/* Right Column: Drill Pedagogical Details (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {currentDrill && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
              {/* Drill Meta Header */}
              <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-indigo-400">
                      Tarea {currentDrillIndex + 1} de {drills.length}
                    </span>
                    {currentDrill.isExternal ? (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-900/80 text-indigo-300 border border-indigo-700">
                        🌐 Fuente Web
                      </span>
                    ) : (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-900/80 text-blue-300 border border-blue-700">
                        🏠 Biblioteca Oficial
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl font-black text-white tracking-tight mt-1">
                    {currentDrill.title}
                  </h2>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-slate-300 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{currentDrill.durationMin} min</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Descripción de la Tarea</h4>
                <p className="text-sm text-slate-300 font-medium leading-relaxed bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  {currentDrill.description || "Sin descripción adicional."}
                </p>
              </div>

              {/* Objectives & Constraints Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentDrill.tacticalObjective && (
                  <div className="bg-indigo-950/40 border border-indigo-900/60 p-3.5 rounded-2xl">
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 mb-1">Objetivo Táctico</h5>
                    <p className="text-xs font-bold text-indigo-100">{currentDrill.tacticalObjective}</p>
                  </div>
                )}
                {currentDrill.technicalObjective && (
                  <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl">
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Objetivo Técnico</h5>
                    <p className="text-xs font-bold text-slate-200">{currentDrill.technicalObjective}</p>
                  </div>
                )}
              </div>

              {/* Pedagogical Corrections / Consignas */}
              {currentDrill.corrections && (
                <div className="bg-amber-950/30 border border-amber-900/50 p-4 rounded-2xl space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" />
                    Consignas y Correcciones Clave
                  </h4>
                  <p className="text-xs text-amber-200/90 font-medium leading-relaxed">
                    {currentDrill.corrections}
                  </p>
                </div>
              )}

              {/* Next Drill Preview */}
              {nextDrill && (
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">A continuación</span>
                    <h5 className="text-xs font-bold text-slate-300 line-clamp-1">{nextDrill.title}</h5>
                  </div>
                  <button
                    onClick={handleNextDrill}
                    className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    Pasar a esta tarea <SkipForward className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
