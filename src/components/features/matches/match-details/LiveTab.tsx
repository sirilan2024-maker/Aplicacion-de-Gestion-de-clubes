// "use client"

import { useState, useEffect } from "react";
import { useLiveTimer } from "@/hooks/useLiveTimer";
import { Trash2, Clock, X, Target, AlertTriangle, Bandage } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { addLiveEvent, deleteLiveEvent } from "@/app/actions/live-match-actions";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "react-hot-toast";

interface LiveEvent {
  id: string;
  minuto: number;
  tipo_evento: string;
  notas: string;
  player_id?: string;
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
  matchEvents?: any[];
  onEventChange: (localGoals: number, awayGoals: number, goalsList: { local: string; away: string }) => void;
}

export function LiveTab({ matchId, match, players = [], matchEvents = [], onEventChange }: LiveTabProps) {
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

  // Is it injury time?
  const isFirstHalfDescuento = seconds >= halfLengthMinutes * 60 && !firstHalfDuration && partidoEstado !== "Descanso";
  const isSecondHalfDescuento = seconds >= halfLengthMinutes * 2 * 60 && firstHalfDuration !== null;
  const isDescuento = (isFirstHalfDescuento || isSecondHalfDescuento) && partidoEstado !== "Finalizado";

  // Form states
  const [minuto, setMinuto] = useState<number>(85);
  const [playerId, setPlayerId] = useState<string>("");
  const [playerOutId, setPlayerOutId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRival, setIsRival] = useState(false);

  // Realtime subscription for events and timer
  useEffect(() => {
    const channel = supabase.channel(`match-${matchId}-live`);
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_events', filter: `partido_id=eq.${matchId}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setEvents(prev => [...prev, payload.new as LiveEvent].sort((a, b) => a.minuto - b.minuto));
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

    pause(); // always pause the timer
    
    const secondHalfDuration = firstHalfDuration !== null ? seconds - (halfLengthMinutes * 60) : seconds;
    
    // Guardar evento visual
    const { success } = await addLiveEvent(matchId, {
      player_id: null,
      tipo: phase,
      minuto: Math.floor(seconds / 60),
      descripcion: phase === "Descanso" 
        ? `--- DESCANSO (Duración 1ª Parte: ${formatTime(seconds)}) ---` 
        : `--- FINAL DEL PARTIDO (Duración 2ª Parte: ${formatTime(secondHalfDuration > 0 ? secondHalfDuration : seconds)}) ---`
    });

    if (success) {
      if (phase === "Fin de Partido") {
        await supabase.from("partidos").update({ 
          estado: "Finalizado",
          second_half_duration_seconds: secondHalfDuration > 0 ? secondHalfDuration : null
        }).eq("id", matchId);
        setPartidoEstado("Finalizado");
        toast.success("Partido finalizado");
      } else {
        await supabase.from("partidos").update({ 
          estado: "Descanso",
          first_half_duration_seconds: seconds
        }).eq("id", matchId);
        setPartidoEstado("Descanso");
        setFirstHalfDuration(seconds);
        toast.success("Descanso registrado");
      }
    } else {
      toast.error("Por favor, asegúrate de haber ejecutado el script SQL para habilitar estos eventos");
    }
  };

  const handleStartSecondHalf = async () => {
    const targetSeconds = halfLengthMinutes * 60;
    await supabase.from("partidos").update({ estado: "En Curso" }).eq("id", matchId);
    setPartidoEstado("En Curso");
    start(targetSeconds);
    toast.success("Segunda parte iniciada");
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeForm || isSubmitting) return;

    setIsSubmitting(true);
    let desc = "";
    
    if (isRival) {
      desc = `${activeForm} del equipo rival ${notes ? `(${notes})` : ""}`;
    } else {
      const player = players.find((p: any) => p.id === playerId);
      const playerName = player ? `${player.first_name}`.trim() : "Jugador";

      if (activeForm === "Gol") {
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
      }
    }

    const { success } = await addLiveEvent(matchId, {
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
      <div className={`sticky top-0 z-10 flex items-center justify-between px-4 py-2 rounded-b-xl shadow-sm ${partidoEstado === "Finalizado" ? 'bg-slate-800' : (isDescuento ? 'bg-red-900' : 'bg-blue-900')} text-slate-100 transition-colors duration-500`}>
        <div className="flex items-center gap-3">
          <Clock className={`w-5 h-5 ${partidoEstado === "Finalizado" ? 'text-slate-400' : (isDescuento ? 'text-red-300' : 'text-blue-300')}`} />
          <div className="text-2xl font-black font-mono tracking-wider tabular-nums">
            {formatTime(seconds)}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${partidoEstado === "Finalizado" ? 'text-slate-300 bg-slate-700 border-slate-600' : (isDescuento ? 'text-red-100 bg-red-800 border-red-700' : 'text-blue-300 bg-blue-900/50 border-blue-700')}`}>
                {partidoEstado === "Finalizado" ? "Finalizado" : (partidoEstado === "Descanso" ? "Descanso" : (running ? "En juego" : "Pausado"))}
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
          <div className="flex items-center gap-2">
            {partidoEstado === "Descanso" ? (
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
            <button
              onClick={() => {
                if (partidoEstado === "Finalizado") {
                  toast.error("El partido ha finalizado. El cronómetro no puede reanudarse.");
                  return;
                }
                if (partidoEstado === "Descanso") {
                  toast.error("Estás en el descanso. Usa el botón 'Iniciar 2ª Parte' para reanudar el partido.");
                  return;
                }
                running ? pause() : start();
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
          <div className="space-y-6">
            <div className="bg-white border border-slate-150 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                Registrar Eventos en Vivo
              </h3>

              {/* Botones principales */}
              <div className="grid grid-cols-3 gap-3">
                {([
                  { tipo: "Gol", icon: "⚽", label: "Gol", color: "hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-400 text-emerald-600 border-slate-200" },
                  { tipo: "Tarjeta Amarilla", icon: "🟨", label: "Amarilla", color: "hover:bg-amber-50 hover:text-amber-700 hover:border-amber-400 text-amber-500 border-slate-200" },
                  { tipo: "Cambio", icon: "🔄", label: "Cambio", color: "hover:bg-blue-50 hover:text-blue-700 hover:border-blue-400 text-blue-600 border-slate-200" }
                ] as const).map(action => (
                  <button
                    key={action.tipo}
                    onClick={() => { setActiveForm(action.tipo as any); setMinuto(Math.floor(seconds / 60)); }}
                    className={[
                      "flex flex-col items-center justify-center p-4 border border-dashed rounded-xl bg-slate-50/50 shadow-sm",
                      "transition-all duration-200 hover:scale-105 active:scale-95",
                      action.color
                    ].join(" ")}
                  >
                    <span className="text-2xl mb-1">{action.icon}</span>
                    <span className="text-[10px] font-black uppercase tracking-wider">{action.label}</span>
                  </button>
                ))}
              </div>

              {/* Botones adicionales */}
              <div className="grid grid-cols-5 gap-2 mt-4">
                {([
                  { tipo: "Tiro al larguero", icon: <Target className="w-5 h-5" />, label: "Larguero", color: "bg-orange-100 text-orange-700 hover:bg-orange-200" },
                  { tipo: "Tiro al palo", icon: <Target className="w-5 h-5" />, label: "Palo", color: "bg-orange-100 text-orange-700 hover:bg-orange-200" },
                  { tipo: "Penalti", icon: <AlertTriangle className="w-5 h-5" />, label: "Penalti", color: "bg-purple-100 text-purple-700 hover:bg-purple-200" },
                  { tipo: "Lesión", icon: <Bandage className="w-5 h-5" />, label: "Lesión", color: "bg-red-100 text-red-700 hover:bg-red-200" },
                  { tipo: "Gol en propia puerta", icon: <X className="w-5 h-5" />, label: "Autogol", color: "bg-gray-800 text-gray-100 hover:bg-gray-700" }
                ] as const).map(action => (
                  <button
                    key={action.tipo}
                    onClick={() => { setActiveForm(action.tipo as any); setMinuto(Math.floor(seconds / 60)); }}
                    className={[
                      "flex flex-col items-center justify-center p-2 border border-dashed rounded-xl bg-slate-50/50 shadow-sm",
                      "transition-all duration-200 hover:scale-105 active:scale-95",
                      action.color
                    ].join(" ")}
                  >
                    {action.icon}
                    <span className="text-[8px] font-black uppercase tracking-wider mt-0.5">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic add form */}
            {activeForm && (
              <form onSubmit={handleAddEvent} className="bg-white border border-slate-200 rounded-xl p-5 shadow-md space-y-4 animate-in zoom-in-95 duration-200">
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
                        required={activeForm !== "Gol" && activeForm !== "Gol en propia puerta"}
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
                  {events.map(ev => {
                    const icons: Record<string, string> = {
                      Gol: "⚽",
                      Amarilla: "🟨",
                      "Tarjeta Amarilla": "🟨",
                      Cambio: "🔄",
                      "Tiro al larguero": "🎯",
                      "Tiro al palo": "🎯",
                      Penalti: "🚩",
                      Lesión: "🩹",
                      "Gol en propia puerta": "❌"
                    };
                    const icon = icons[ev.tipo_evento] || "📌";
                    
                    return (
                      <div key={ev.id} className="flex items-center gap-3.5 group">
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
