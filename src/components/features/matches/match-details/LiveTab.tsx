// "use client"

import { useState, useEffect, useRef } from "react";
import { useLiveTimer } from "@/hooks/useLiveTimer";
import { Trash2, Clock, X, Target, AlertTriangle, Bandage, Plus, Edit2, Mic, MicOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toggleMatchTimer, addLiveEvent, deleteLiveEvent, updateMatchState } from "@/app/actions/live-match-actions";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "react-hot-toast";

interface LiveEvent {
  id: string;
  minuto: number;
  tipo_evento: string;
  notas: string;
  player_id?: string;
  created_at?: string;
}

export const MOCK_LIVE_PLAYERS = [
  { id: "p1", name: "David García", dorsal: 1 },
  { id: "p2", name: "Jorge Ruiz", dorsal: 2 },
  { id: "p3", name: "Miguel Sanz", dorsal: 5 },
  { id: "p4", name: "Pablo Torres", dorsal: 6 },
  { id: "p5", name: "Luis Moreno", dorsal: 3 },
  { id: "p6", name: "Rubén Díaz", dorsal: 8 },
  { id: "p7", name: "Andrés Gil", dorsal: 4 },
  { id: "p8", name: "Héctor Silva", dorsal: 10 },
  { id: "p9", name: "Raúl Méndez", dorsal: 9 },
  { id: "p10", name: "Iván Cano", dorsal: 11 },
  { id: "p11", name: "Sergio Marín", dorsal: 7 },
];

interface LiveTabProps {
  matchId: string;
  match?: any;
  players?: any[];
  convocatorias?: any[];
  matchEvents?: any[];
  onEventChange: (localGoals: number, awayGoals: number, goalsList: { local: string; away: string }) => void;
}

export function LiveTab({ matchId, match, players = [], convocatorias = [], matchEvents = [], onEventChange }: LiveTabProps) {
  const { rol } = useUserRole();
  const isFamilyView = rol === "familia" || rol === "jugador";

  const [events, setEvents] = useState<LiveEvent[]>(matchEvents);
  const [activeForm, setActiveForm] = useState<string | null>(null);

  // Initialize Supabase client
  const supabase = createClient();
  
  // Hook usage (pass matchId and DB initial state)
  const initialElapsed = match?.live_timer_elapsed_seconds || 0;
  const initialStarted = match?.live_timer_started_at || null;
  const { seconds, start, pause, running } = useLiveTimer(matchId, initialElapsed, initialStarted);

  // Match State Sync
  const [partidoEstado, setPartidoEstado] = useState(match?.estado || "Programado");
  const [firstHalfDuration, setFirstHalfDuration] = useState<number | null>(match?.first_half_duration_seconds || null);

  // Category-based half length
  const getHalfLengthMinutes = () => {
    const category = (match?.equipo?.category || match?.equipo?.name || "").toLowerCase();
    if (category.includes("infantil") || category.includes("alevin") || category.includes("benjamin") || category.includes("prebenjamin")) return 35;
    if (category.includes("cadete")) return 40;
    return 45; // Juvenil, Senior, and default
  };
  const halfLengthMinutes = getHalfLengthMinutes();

  const isDescansoActive = firstHalfDuration !== null && seconds === firstHalfDuration && !running;

  // Is it injury time?
  const isFirstHalfDescuento = seconds >= halfLengthMinutes * 60 && !firstHalfDuration && !isDescansoActive;
  const isSecondHalfDescuento = seconds >= halfLengthMinutes * 2 * 60 && firstHalfDuration !== null;
  const isDescuento = (isFirstHalfDescuento || isSecondHalfDescuento) && partidoEstado !== "Finalizado";

  // Form states
  const [minuto, setMinuto] = useState<number>(85);
  const [playerId, setPlayerId] = useState<string>("");
  const [playerOutId, setPlayerOutId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [subTipoOcasion, setSubTipoOcasion] = useState<string>("Tiro al palo");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRival, setIsRival] = useState(false);

  // Frases editables del entrenador (persistencia en localStorage)
  const defaultPhrases = [
    "{TEAM} está atacando muy bien ⚡",
    "{TEAM} tiene el control total del juego 🎮",
    "Gran fase defensiva de {TEAM}, muy sólidos 🛡️",
    "El rival está apretando en estos minutos ⚠️",
    "{TEAM} presiona arriba con mucha intensidad 🔥",
    "Partido muy disputado en el centro del campo ⚖️"
  ];
  const [customPhrases, setCustomPhrases] = useState<string[]>(defaultPhrases);
  const [isEditingPhrases, setIsEditingPhrases] = useState(false);
  const [newPhraseInput, setNewPhraseInput] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("coach_quick_phrases");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCustomPhrases(parsed);
        }
      }
    } catch (e) {
      console.error("Error cargando frases de localStorage:", e);
    }
  }, []);

  const savePhrases = (newPhrases: string[]) => {
    setCustomPhrases(newPhrases);
    try {
      localStorage.setItem("coach_quick_phrases", JSON.stringify(newPhrases));
    } catch (e) {
      console.error("Error guardando frases en localStorage:", e);
    }
  };

  // Dictado por voz en directo
  const [isLiveRecording, setIsLiveRecording] = useState(false);
  const liveRecognitionRef = useRef<any>(null);

  const startLiveVoiceDictation = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error("Tu navegador no soporta el dictado por voz.");
      return;
    }
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-ES';
      recognition.continuous = true;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsLiveRecording(true);
        toast.success("🎙️ Escuchando... Dicta tu comentario del partido");
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          }
        }
        if (finalTranscript.trim()) {
          const text = finalTranscript.trim();
          const inputEl = document.getElementById('coach-custom-comment-input') as HTMLInputElement;
          if (inputEl) {
            inputEl.value = inputEl.value ? `${inputEl.value.trim()} ${text}` : text;
          }
        }
      };

      recognition.onerror = (err: any) => {
        console.error("Speech recognition error:", err);
        setIsLiveRecording(false);
        toast.error("Error en el reconocimiento de voz");
      };

      recognition.onend = () => {
        setIsLiveRecording(false);
      };

      liveRecognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error(e);
      toast.error("No se pudo iniciar el dictado por voz");
    }
  };

  const stopLiveVoiceDictation = () => {
    if (liveRecognitionRef.current) {
      liveRecognitionRef.current.stop();
      setIsLiveRecording(false);
      toast.success("Dictado finalizado");
    }
  };

  // Ref para autoscroll
  const formRef = useRef<HTMLDivElement | HTMLFormElement>(null);

  const handleSelectAction = (tipo: string) => {
    setActiveForm(tipo);
    setMinuto(Math.floor(seconds / 60));
    if (tipo === "Ocasión Peligrosa") {
      setSubTipoOcasion("Tiro al palo");
    }
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  // Realtime subscription for events and timer
  useEffect(() => {
    const channel = supabase.channel(`match-${matchId}-live-${Math.random().toString(36).substring(7)}`);
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_events', filter: `partido_id=eq.${matchId}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setEvents(prev => {
            if (prev.some(e => e.id === payload.new.id)) return prev;
            const updated = [...prev, payload.new as LiveEvent];
            return updated.sort((a, b) => {
              if (a.minuto !== b.minuto) return a.minuto - b.minuto;
              const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
              const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
              return timeA - timeB;
            });
          });
        } else if (payload.eventType === 'DELETE') {
          setEvents(prev => prev.filter(e => e.id !== payload.old.id));
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'partidos', filter: `id=eq.${matchId}` }, (payload) => {
        setPartidoEstado(payload.new.estado);
        setFirstHalfDuration(payload.new.first_half_duration_seconds);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  useEffect(() => {
    updateParentScores(events);
  }, [events]);

  const updateParentScores = (updatedEvents: LiveEvent[]) => {
    const local = updatedEvents.filter(e => (e.tipo_evento === "Gol" && e.player_id) || (e.tipo_evento === "Gol en propia puerta" && !e.player_id)).length;
    const away = updatedEvents.filter(e => (e.tipo_evento === "Gol" && !e.player_id) || (e.tipo_evento === "Gol en propia puerta" && e.player_id)).length;

    // Build scorers lists
    const localScorers = updatedEvents
      .filter(e => (e.tipo_evento === "Gol" && e.player_id) || (e.tipo_evento === "Gol en propia puerta" && !e.player_id))
      .map(e => {
        const player = players.find((p: any) => p.id === e.player_id);
        if (e.tipo_evento === "Gol en propia puerta") return `Rival PP (${e.minuto}')`;
        return player ? `${player.first_name} (${e.minuto}')` : `Sporting (${e.minuto}')`;
      })
      .join(", ");

    const awayScorers = updatedEvents
      .filter(e => (e.tipo_evento === "Gol" && !e.player_id) || (e.tipo_evento === "Gol en propia puerta" && e.player_id))
      .map(e => {
        const player = players.find((p: any) => p.id === e.player_id);
        if (e.tipo_evento === "Gol en propia puerta") return `${player?.first_name || 'Sporting'} PP (${e.minuto}')`;
        return `Rival (${e.minuto}')`;
      })
      .join(", ");

    onEventChange(local, away, { local: localScorers, away: awayScorers });
  };

  const handlePhaseChange = async (phase: "Descanso" | "Fin de Partido") => {
    if (partidoEstado === "Finalizado") {
      toast.error("El partido ya ha finalizado.");
      return;
    }
    
    if (phase === "Descanso" && firstHalfDuration !== null) {
      toast.error("El descanso ya ha sido registrado previamente.");
      return;
    }

    if (!window.confirm(`¿Seguro que deseas registrar el ${phase}? Esta acción detendrá el cronómetro.`)) {
      return;
    }

    await pause(); // always pause the timer (await to prevent DB race condition)
    
    const secondHalfDuration = firstHalfDuration !== null ? seconds - (halfLengthMinutes * 60) : seconds;
    
    // Guardar evento visual (intentamos guardarlo, pero no bloqueamos si falla)
    await addLiveEvent(matchId, {
      player_id: null,
      tipo: phase,
      minuto: Math.floor(seconds / 60),
      descripcion: phase === "Descanso" 
        ? `--- DESCANSO (Duración 1ª Parte: ${formatTime(seconds)}) ---` 
        : `--- FINAL DEL PARTIDO (Duración 2ª Parte: ${formatTime(secondHalfDuration > 0 ? secondHalfDuration : seconds)}) ---`
    });

    // Actualizar el estado del partido sin importar si el evento se insertó o no
    if (phase === "Fin de Partido") {
      const res = await updateMatchState(matchId, "Finalizado", { 
        second_half_duration_seconds: secondHalfDuration > 0 ? secondHalfDuration : null 
      });
      if (!res.success) {
        toast.error(`Error finalizando el partido: ${res.error}`);
      } else {
        setPartidoEstado("Finalizado");
        toast.success("Partido finalizado");
      }
    } else {
      const res = await updateMatchState(matchId, "Descanso", { 
        first_half_duration_seconds: seconds 
      });
      if (!res.success) {
        toast.error(`Error registrando el descanso: ${res.error}`);
      } else {
        setPartidoEstado("Descanso");
        setFirstHalfDuration(seconds);
        toast.success("Descanso registrado");
      }
    }
  };

  const handleStartSecondHalf = async () => {
    if (convocatorias.length === 0) {
      toast.error("Guarda la convocatoria y alineación primero para poder iniciar el partido.");
      return;
    }
    const targetSeconds = halfLengthMinutes * 60;
    const res = await updateMatchState(matchId, "En curso");
    if (!res.success) {
      toast.error(`Error al iniciar la segunda parte: ${res.error}`);
      return;
    }
    setPartidoEstado("En curso");
    start(targetSeconds);
    toast.success("Segunda parte iniciada");
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeForm || isSubmitting) return;

    setIsSubmitting(true);
    let desc = "";
    
    if (isRival) {
      if (activeForm === "Ocasión Peligrosa") {
        const ocasionLabel = subTipoOcasion || "Ocasión Peligrosa";
        desc = `Ocasión del rival: ${ocasionLabel} ${notes ? `(${notes})` : ""}`;
      } else {
        desc = `${activeForm} del equipo rival ${notes ? `(${notes})` : ""}`;
      }
    } else {
      const player = players.find((p: any) => p.id === playerId);
      const playerName = player ? `${player.first_name}`.trim() : "Jugador";

      if (activeForm === "Ocasión Peligrosa") {
        const ocasionLabel = subTipoOcasion || "Ocasión Peligrosa";
        desc = playerId 
          ? `Ocasión: ${ocasionLabel} de ${playerName} ${notes ? `(${notes})` : ""}`
          : `Ocasión peligrosa: ${ocasionLabel} ${notes ? `(${notes})` : ""}`;
      } else if (activeForm === "Gol") {
        desc = `Gol de ${playerName} ${notes ? `(${notes})` : ""}`;
      } else if (activeForm === "Amarilla" || activeForm === "Tarjeta Amarilla") {
        desc = `Tarjeta Amarilla para ${playerName} ${notes ? `(${notes})` : ""}`;
      } else if (activeForm === "Cambio") {
        const playerOut = players.find((p: any) => p.id === playerOutId);
        const playerOutName = playerOut ? `${playerOut.first_name}`.trim() : "Jugador";
        desc = `Cambio: Entra ${playerName} por ${playerOutName} ${notes ? `(${notes})` : ""}`;
      } else if (activeForm === "Tiro al larguero") {
        desc = `Tiro al larguero de ${playerName} ${notes ? `(${notes})` : ""}`;
      } else if (activeForm === "Tiro al palo") {
        desc = `Tiro al palo de ${playerName} ${notes ? `(${notes})` : ""}`;
      } else if (activeForm === "Penalti") {
        desc = `Penalti de ${playerName} ${notes ? `(${notes})` : ""}`;
      } else if (activeForm === "Lesión") {
        desc = `Lesión de ${playerName} ${notes ? `(${notes})` : ""}`;
      } else if (activeForm === "Gol en propia puerta") {
        desc = `Gol en propia puerta de ${playerName} ${notes ? `(${notes})` : ""}`;
      } else if (playerId) {
        desc = `${activeForm} de ${playerName} ${notes ? `(${notes})` : ""}`;
      } else {
        desc = `${activeForm} ${notes ? `(${notes})` : ""}`;
      }
    }

    const { success, data, error } = await addLiveEvent(matchId, {
      player_id: isRival ? null : (playerId || null),
      tipo: activeForm,
      minuto,
      descripcion: desc
    });

    setIsSubmitting(false);
    if (success) {
      setActiveForm(null);
      setPlayerId("");
      setPlayerOutId("");
      setNotes("");
      setIsRival(false);
      toast.success(`${activeForm} registrado correctamente`);
    } else {
      toast.error(`Error al registrar ${activeForm}: ` + (error || "Error desconocido"));
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (isFamilyView) return;
    if (window.confirm("¿Seguro que deseas borrar este evento?")) {
      await deleteLiveEvent(id, matchId);
    }
  };

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-5xl mx-auto pb-10">
      {/* ---------- Cronómetro Superior ---------- */}
      <div className={`sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 px-4 py-2 rounded-b-xl shadow-sm ${partidoEstado === "Finalizado" ? 'bg-slate-800' : (isDescuento ? 'bg-red-900' : 'bg-blue-900')} text-slate-100 transition-colors duration-500`}>
        <div className="flex items-center gap-3">
          <Clock className={`w-5 h-5 ${partidoEstado === "Finalizado" ? 'text-slate-400' : (isDescuento ? 'text-red-300' : 'text-blue-300')}`} />
          <div className="text-2xl font-black font-mono tracking-wider tabular-nums">
            {formatTime(seconds)}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${partidoEstado === "Finalizado" ? 'text-slate-300 bg-slate-700 border-slate-600' : (partidoEstado === "Descanso" || isDescansoActive ? 'text-orange-200 bg-orange-950/80 border-orange-700' : (isDescuento ? 'text-red-100 bg-red-800 border-red-700' : 'text-blue-300 bg-blue-900/50 border-blue-700'))}`}>
                {partidoEstado === "Finalizado" ? "Finalizado" : (partidoEstado === "Descanso" || isDescansoActive ? "Descanso" : (running ? (firstHalfDuration ? "2ª Parte" : "1ª Parte") : "Pausado"))}
              </span>
              {firstHalfDuration && (
                <span className="text-[10px] text-blue-200/80 font-medium">
                  1ª Parte: {formatTime(firstHalfDuration)}
                </span>
              )}
              {match?.second_half_duration_seconds && (
                <span className="text-[10px] text-blue-200/80 font-medium">
                  2ª Parte: {formatTime(match.second_half_duration_seconds)}
                </span>
              )}
            </div>
            {isDescuento && (
              <span className="text-[10px] font-bold text-red-200 mt-0.5 animate-pulse">
                TIEMPO DE DESCUENTO
              </span>
            )}
          </div>
        </div>

        {!isFamilyView && (
          <div className="flex flex-wrap items-center gap-2">
            {partidoEstado === "Finalizado" ? (
              <button
                onClick={async () => {
                  if (!window.confirm("¿Seguro que deseas REABRIR el partido? El cronómetro quedará pausado donde se quedó.")) return;
                  await updateMatchState(matchId, "Programado", { second_half_duration_seconds: null });
                  setPartidoEstado("Programado");
                  toast.success("Partido reabierto");
                }}
                className="flex items-center gap-1 rounded-lg bg-yellow-600/80 px-2.5 py-1.5 text-xs font-bold hover:bg-yellow-600 transition-colors"
              >
                <span>Reabrir Partido</span>
              </button>
            ) : (
              <>
                {(partidoEstado === "Descanso" || isDescansoActive) ? (
                  <button
                    onClick={() => {
                      if (partidoEstado === "Finalizado") {
                        toast.error("El partido ya ha finalizado.");
                        return;
                      }
                      if (!window.confirm("¿Seguro que deseas iniciar la 2ª Parte?")) return;
                      handleStartSecondHalf();
                    }}
                    className="flex items-center gap-1 rounded-lg bg-emerald-600/80 px-2.5 py-1.5 text-xs font-bold hover:bg-emerald-600 transition-colors"
                  >
                    <span>Iniciar 2ª Parte</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handlePhaseChange("Descanso")}
                    className="flex items-center gap-1 rounded-lg bg-orange-600/80 px-2.5 py-1.5 text-xs font-bold hover:bg-orange-600 transition-colors"
                  >
                    <span>Descanso</span>
                  </button>
                )}
                
                <button
                  onClick={() => handlePhaseChange("Fin de Partido")}
                  className="flex items-center gap-1 rounded-lg bg-red-600/80 px-2.5 py-1.5 text-xs font-bold hover:bg-red-600 transition-colors"
                >
                  <span>Fin de Partido</span>
                </button>
              </>
            )}
            <button
              onClick={async () => {
                try {
                  if (partidoEstado === "Finalizado") {
                    toast.error("El partido ha finalizado. El cronómetro no puede reanudarse.");
                    return;
                  }
                  if (isDescansoActive) {
                    toast.error("Estás en el descanso. Usa el botón 'Iniciar 2ª Parte' para reanudar el partido.");
                    return;
                  }
                  
                  if (!running) {
                    if (convocatorias.length === 0) {
                      toast.error("Guarda la convocatoria y alineación primero para poder iniciar el partido.");
                      return;
                    }
                    await updateMatchState(matchId, "En Curso");
                    setPartidoEstado("En Curso");
                    start();
                  } else {
                    pause();
                  }
                } catch (e: any) {
                  console.error("Crash on play button:", e);
                  toast.error("Crash: " + e.message);
                }
              }}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 transition-colors ml-2 ${isDescuento ? 'bg-red-800 hover:bg-red-700' : 'bg-blue-800 hover:bg-blue-700'}`}
            >
              {running ? (
                <>
                  <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                  <span className="text-xs font-bold">Pausar</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  <span className="text-xs font-bold">Iniciar</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* ---------- Acciones y Timeline ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">

        {/* ── Columna Izquierda: Acciones Rápidas (Sólo Entrenadores) ── */}
        {!isFamilyView ? (
          partidoEstado === "Finalizado" ? (
            <div className="bg-white border border-slate-150 rounded-xl p-8 shadow-sm text-center">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-2">Partido Finalizado</h3>
              <p className="text-xs text-slate-500">El seguimiento en directo ha concluido. Ya no se pueden registrar acciones rápidas.</p>
            </div>
          ) : (
          <div className="space-y-6">
            <div className="bg-white border border-slate-150 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                Registrar Eventos en Vivo
              </h3>

              {/* Botones principales */}
              <div className="grid grid-cols-4 gap-3">
                {([
                  { tipo: "Gol", icon: "⚽", label: "Gol", color: "hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-400 text-emerald-600 border-slate-200" },
                  { tipo: "Tarjeta Amarilla", icon: "🟨", label: "Amarilla", color: "hover:bg-amber-50 hover:text-amber-700 hover:border-amber-400 text-amber-500 border-slate-200" },
                  { tipo: "Tarjeta Roja", icon: "🟥", label: "Roja", color: "hover:bg-red-50 hover:text-red-700 hover:border-red-400 text-red-500 border-slate-200" },
                  { tipo: "Cambio", icon: "🔄", label: "Cambio", color: "hover:bg-blue-50 hover:text-blue-700 hover:border-blue-400 text-blue-600 border-slate-200" }
                ] as const).map(action => (
                  <button
                    key={action.tipo}
                    onClick={() => handleSelectAction(action.tipo)}
                    className={[
                      "flex flex-col items-center justify-center p-3 border border-dashed rounded-xl bg-slate-50/50 shadow-sm",
                      "transition-all duration-200 hover:scale-105 active:scale-95",
                      action.color
                    ].join(" ")}
                  >
                    <span className="text-2xl mb-1">{action.icon}</span>
                    <span className="text-[10px] font-black uppercase tracking-wider">{action.label}</span>
                  </button>
                ))}
              </div>

              {/* Frases rápidas del Entrenador según estado de partido */}
              <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    💬 Sensaciones / Frases Rápidas del Entrenador
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditingPhrases(!isEditingPhrases)}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100 transition-colors"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>{isEditingPhrases ? "Listo" : "Gestionar Frases"}</span>
                  </button>
                </div>

                {isEditingPhrases && (
                  <div className="bg-indigo-50/50 border border-indigo-100 p-3 rounded-xl space-y-2 animate-in fade-in duration-200">
                    <p className="text-[10px] font-bold text-indigo-900">
                      Añade o borra las frases rápidas que quieres mantener fijadas en pantalla:
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ej. El equipo necesita más intensidad en las bandas ⚡..."
                        value={newPhraseInput}
                        onChange={(e) => setNewPhraseInput(e.target.value)}
                        className="flex-1 text-xs font-medium bg-white border border-indigo-200 rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (!newPhraseInput.trim()) return;
                            savePhrases([...customPhrases, newPhraseInput.trim()]);
                            setNewPhraseInput("");
                            toast.success("Frase fijada guardada");
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!newPhraseInput.trim()) return;
                          savePhrases([...customPhrases, newPhraseInput.trim()]);
                          setNewPhraseInput("");
                          toast.success("Frase fijada guardada");
                        }}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-sm transition-colors flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Fijar</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {(() => {
                    const rawTeamName = match?.equipo?.name || 'El equipo';
                    return customPhrases.map((phraseTemplate, idx) => {
                      const fullPhrase = phraseTemplate.replace(/{TEAM}/g, rawTeamName);
                      return (
                        <div key={idx} className="relative group">
                          <button
                            type="button"
                            onClick={async () => {
                              const currentMin = Math.floor(seconds / 60);
                              const { success, error } = await addLiveEvent(matchId, {
                                player_id: null,
                                tipo: "Comentario del Entrenador",
                                minuto: currentMin,
                                descripcion: fullPhrase
                              });
                              if (success) {
                                toast.success("Comentario publicado");
                              } else {
                                toast.error("Error al publicar comentario: " + (error || "Error desconocido"));
                              }
                            }}
                            className="w-full p-2.5 text-[11px] font-bold text-slate-700 bg-slate-100/80 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 rounded-xl text-left transition-all leading-snug flex items-center justify-between pr-7"
                          >
                            <span className="line-clamp-2">{fullPhrase}</span>
                            <span className="text-xs opacity-50 shrink-0">+</span>
                          </button>
                          
                          {isEditingPhrases && (
                            <button
                              type="button"
                              onClick={() => {
                                const filtered = customPhrases.filter((_, i) => i !== idx);
                                savePhrases(filtered);
                                toast.success("Frase eliminada");
                              }}
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-red-500 hover:bg-red-100 rounded-md transition-colors"
                              title="Eliminar frase fijada"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* Entrada libre para que el entrenador ponga cualquier comentario sobre cómo va el partido */}
                <div className="mt-3 flex gap-2">
                  <div className="relative flex-1 flex items-center">
                    <input
                      type="text"
                      id="coach-custom-comment-input"
                      placeholder="Escribe o dicta un comentario libre..."
                      className="w-full text-xs font-medium bg-white border border-slate-200 rounded-xl pl-3 pr-9 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = e.currentTarget.value.trim();
                          if (!val) return;
                          const inputEl = e.currentTarget;
                          const currentMin = Math.floor(seconds / 60);
                          const { success, error } = await addLiveEvent(matchId, {
                            player_id: null,
                            tipo: "Comentario del Entrenador",
                            minuto: currentMin,
                            descripcion: `💬 ${val}`
                          });
                          if (success) {
                            toast.success("Comentario publicado");
                            inputEl.value = "";
                          } else {
                            toast.error("Error al publicar comentario: " + (error || "Error desconocido"));
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={isLiveRecording ? stopLiveVoiceDictation : startLiveVoiceDictation}
                      className={`absolute right-2 p-1.5 rounded-lg transition-colors ${
                        isLiveRecording 
                          ? "text-red-500 bg-red-100 animate-pulse" 
                          : "text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
                      }`}
                      title={isLiveRecording ? "Detener dictado por voz" : "Dictar comentario por voz"}
                    >
                      {isLiveRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const inputEl = document.getElementById('coach-custom-comment-input') as HTMLInputElement;
                      if (!inputEl || !inputEl.value.trim()) return;
                      const val = inputEl.value.trim();
                      const currentMin = Math.floor(seconds / 60);
                      const { success, error } = await addLiveEvent(matchId, {
                        player_id: null,
                        tipo: "Comentario del Entrenador",
                        minuto: currentMin,
                        descripcion: `💬 ${val}`
                      });
                      if (success) {
                        toast.success("Comentario publicado");
                        inputEl.value = "";
                      } else {
                        toast.error("Error al publicar comentario: " + (error || "Error desconocido"));
                      }
                    }}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors shrink-0"
                  >
                    Publicar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const inputEl = document.getElementById('coach-custom-comment-input') as HTMLInputElement;
                      if (!inputEl || !inputEl.value.trim()) return;
                      const val = inputEl.value.trim();
                      savePhrases([...customPhrases, val]);
                      toast.success("¡Frase fijada en pantalla para siempre!");
                    }}
                    className="px-2.5 py-2 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors shrink-0 flex items-center gap-1"
                    title="Fijar este comentario para usarlo siempre"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Fijar</span>
                  </button>
                </div>
              </div>

              {/* Botones adicionales */}
              <div className="grid grid-cols-4 gap-2 mt-4">
                {([
                  { tipo: "Ocasión Peligrosa", icon: "⚠️", label: "Ocasión", color: "bg-amber-100 text-amber-700 hover:bg-amber-200" },
                  { tipo: "Parada", icon: "🧤", label: "Parada", color: "bg-sky-100 text-sky-700 hover:bg-sky-200" },
                  { tipo: "Tiro al larguero", icon: "🥅", label: "Larguero", color: "bg-orange-100 text-orange-700 hover:bg-orange-200" },
                  { tipo: "Tiro al palo", icon: "🥅", label: "Palo", color: "bg-orange-100 text-orange-700 hover:bg-orange-200" },
                  { tipo: "Penalti", icon: "🎯", label: "Penalti", color: "bg-purple-100 text-purple-700 hover:bg-purple-200" },
                  { tipo: "Lesión", icon: "🚑", label: "Lesión", color: "bg-red-100 text-red-700 hover:bg-red-200" },
                  { tipo: "Falta", icon: "🛑", label: "Falta", color: "bg-stone-100 text-stone-700 hover:bg-stone-200" },
                  { tipo: "Fuera de juego", icon: "🚩", label: "F. Juego", color: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200" },
                  { tipo: "Gol en propia puerta", icon: "🤦‍♂️", label: "Autogol", color: "bg-rose-100 text-rose-700 hover:bg-rose-200" }
                ] as const).map(action => (
                  <button
                    key={action.tipo}
                    onClick={() => handleSelectAction(action.tipo)}
                    className={[
                      "flex flex-col items-center justify-center p-2 border border-dashed rounded-xl bg-slate-50/50 shadow-sm",
                      "transition-all duration-200 hover:scale-105 active:scale-95",
                      action.color
                    ].join(" ")}
                  >
                    <span className="text-xl">{action.icon}</span>
                    <span className="text-[8px] font-black uppercase tracking-wider mt-1">{action.label}</span>
                  </button>
                ))}
              </div>
              
              {/* Reset Match Button */}
              <div className="pt-4 mt-2 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm("¿Estás 100% seguro de que deseas REINICIAR el partido? Se borrarán todos los eventos, goles y el cronómetro volverá a 0.")) {
                      try {
                        const { resetMatchAction } = await import('@/app/actions/live-match-actions');
                        await resetMatchAction(matchId);
                        toast.success("Partido reiniciado por completo.");
                        window.location.reload();
                      } catch (err: any) {
                        toast.error("Error al reiniciar: " + err.message);
                      }
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  Reiniciar Partido
                </button>
              </div>
            </div>

            {/* Dynamic add form */}
            {activeForm && (
              <form ref={formRef as any} onSubmit={handleAddEvent} className="bg-white border border-slate-200 rounded-xl p-5 shadow-md space-y-4 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-black uppercase text-slate-400 tracking-wider">
                    Añadir {activeForm}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveForm(null)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Team Switcher */}
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setIsRival(false)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${!isRival ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Nuestro Equipo
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsRival(true)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${isRival ? 'bg-white shadow-sm text-red-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Equipo Rival
                    </button>
                  </div>

                  {/* Ocasión Selector (sólo para Ocasión Peligrosa) */}
                  {activeForm === "Ocasión Peligrosa" && (
                    <div>
                      <label className="block text-[9px] font-bold text-amber-700 uppercase tracking-widest mb-1">
                        Tipo de ocasión producida
                      </label>
                      <select
                        value={subTipoOcasion}
                        onChange={e => setSubTipoOcasion(e.target.value)}
                        className="w-full text-xs font-bold text-amber-900 bg-amber-50/60 border border-amber-200 rounded-lg px-2.5 py-2 outline-none focus:border-amber-500 focus:bg-white"
                      >
                        <option value="Tiro al palo">Tiro al palo</option>
                        <option value="Tiro al larguero">Tiro al larguero</option>
                        <option value="Remate de cabeza">Remate de cabeza</option>
                        <option value="Tiro desde fuera del área">Tiro desde fuera del área</option>
                        <option value="Mano a mano con el portero">Mano a mano con el portero</option>
                        <option value="Ocasión clara de gol">Ocasión clara de gol</option>
                      </select>
                    </div>
                  )}

                  {/* Minute */}
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Minuto del evento
                    </label>
                    <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100">
                      <span className="text-sm font-bold text-slate-700">
                        Se registrará automáticamente en el minuto
                      </span>
                      <span className="text-sm font-black text-blue-600 bg-blue-100 px-2 py-0.5 rounded-md">
                        {minuto}'
                      </span>
                    </div>
                  </div>

                  {/* Player In / General Player */}
                  {!isRival && (
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                        {activeForm === "Cambio" ? "Jugador que ENTRA" : "Jugador implicado"}
                      </label>
                      <select
                        required={activeForm === "Tarjeta Amarilla" || activeForm === "Tarjeta Roja" || activeForm === "Cambio"}
                        value={playerId}
                        onChange={e => setPlayerId(e.target.value)}
                        className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 outline-none focus:border-blue-500 focus:bg-white"
                      >
                        <option value="">— Seleccionar jugador —</option>
                        {players.map((p: any) => (
                          <option key={p.id} value={p.id}>
                            #{p.dorsal || '-'} {p.first_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Player Out (only for Cambio) */}
                  {!isRival && activeForm === "Cambio" && (
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                        Jugador que SALE
                      </label>
                      <select
                        required
                        value={playerOutId}
                        onChange={e => setPlayerOutId(e.target.value)}
                        className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 outline-none focus:border-red-500 focus:bg-white"
                      >
                        <option value="">— Seleccionar jugador que sale —</option>
                        {players.map((p: any) => (
                          <option key={p.id} value={p.id}>
                            #{p.dorsal || '-'} {p.first_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Notes */}
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Detalles / Comentarios
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Remate de córner / Falta táctica..."
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveForm(null)}
                    disabled={isSubmitting}
                    className="flex-1 py-2 rounded-lg border border-slate-200 text-slate-500 text-xs font-bold hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSubmitting ? "Registrando..." : "Registrar"}
                  </button>
                </div>
              </form>
            )}
          </div>
          )
        ) : (
          <div className="space-y-6">
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5 shadow-sm text-center">
              <h3 className="text-sm font-black text-emerald-800 uppercase tracking-wider mb-2">
                Modo Lectura
              </h3>
              <p className="text-xs text-emerald-700 font-medium">
                Estás viendo este partido en vivo. Los eventos aparecerán automáticamente a la derecha a medida que el cuerpo técnico los registre.
              </p>
            </div>
          </div>
        )}

        {/* ── Columna Derecha: Timeline Vertical ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              Cronología del Encuentro
            </h3>
          </div>

          <div className="bg-white border border-slate-150 rounded-xl p-5 shadow-sm relative overflow-hidden">
            {events.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-medium">Sin eventos registrados</p>
              </div>
            ) : (
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[34px] top-3.5 bottom-3.5 w-0.5 bg-slate-100" />

                <div className="space-y-4">
                  {events.map((ev, idx) => {
                    const icons: Record<string, string> = {
                      Gol: "⚽",
                      Amarilla: "🟨",
                      "Tarjeta Amarilla": "🟨",
                      Cambio: "🔄",
                      "Ocasión Peligrosa": "⚠️",
                      Ocasión: "⚠️",
                      Parada: "🧤",
                      "Tiro al larguero": "🎯",
                      "Tiro al palo": "🎯",
                      Penalti: "🚩",
                      Lesión: "🩹",
                      "Gol en propia puerta": "❌"
                    };
                    const icon = icons[ev.tipo_evento] || "📌";
                    
                    return (
                      <div key={ev.id ? `${ev.id}-${idx}` : idx} className="flex items-center gap-3.5 group">
                        {/* Minute */}
                        <div className="w-9 text-right shrink-0">
                          <span className="text-[10px] font-black text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded">
                            {ev.minuto}'
                          </span>
                        </div>

                        {/* Circular icon node */}
                        <div className="w-6 h-6 rounded-full bg-slate-50 border border-slate-150 shadow-sm flex items-center justify-center text-xs shrink-0 z-10">
                          {icon}
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-700 leading-tight">
                            {ev.notas || ev.tipo_evento}
                          </p>
                        </div>

                        {/* Delete */}
                        {!isFamilyView && (
                          <button
                            onClick={() => handleDeleteEvent(ev.id)}
                            className="w-6 h-6 rounded-full hover:bg-red-50 text-slate-300 hover:text-red-500 flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-all"
                            title="Borrar evento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
