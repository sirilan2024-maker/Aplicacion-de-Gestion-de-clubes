// "use client"

import { useState, useEffect } from "react";
import { useLiveTimer } from "@/hooks/useLiveTimer";
import { Trash2, Clock, X, Target, AlertTriangle, Bandage } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { addLiveEvent, deleteLiveEvent } from "@/app/actions/live-match-actions";
import { useUserRole } from "@/hooks/useUserRole";

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
  { id: "p8", name: "Sergio López", dorsal: 7 },
  { id: "p9", name: "Carlos Pérez", dorsal: 10 },
  { id: "p10", name: "Álvaro Núñez", dorsal: 9 },
  { id: "p11", name: "Iván Castro", dorsal: 11 }
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

  // Form states
  const [minuto, setMinuto] = useState<number>(85);
  const [playerId, setPlayerId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeForm || isSubmitting) return;

    setIsSubmitting(true);
    const player = players.find((p: any) => p.id === playerId);
    const playerName = player ? `${player.first_name} ${player.last_name || ''}`.trim() : "Jugador";
    let desc = "";

    if (activeForm === "Gol") {
      desc = `Gol de ${playerName} ${notes ? `(${notes})` : ""}`;
    } else if (activeForm === "Amarilla" || activeForm === "Tarjeta Amarilla") {
      desc = `Tarjeta Amarilla para ${playerName} ${notes ? `(${notes})` : ""}`;
    } else if (activeForm === "Cambio") {
      desc = `Cambio realizado: Entra ${playerName} ${notes ? `(${notes})` : ""}`;
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

    const { success } = await addLiveEvent(matchId, {
      player_id: playerId || null,
      tipo: activeForm,
      minuto,
      descripcion: desc
    });

    setIsSubmitting(false);
    if (success) {
      setActiveForm(null);
      setPlayerId("");
      setNotes("");
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (isFamilyView) return;
    if (window.confirm("¿Seguro que deseas borrar este evento?")) {
      await deleteLiveEvent(id, matchId);
    }
  };

  return (
    <>
      {/* ---------- Cronómetro Superior ---------- */}
      <div className="sticky top-0 z-10 flex items-center justify-between bg-blue-900 text-slate-100 px-4 py-2 rounded-b-xl shadow-sm">
        {/* Timer display */}
        <span className="font-mono text-2xl font-bold">
          {(() => {
            const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
            const secs = String(seconds % 60).padStart(2, "0");
            return `${mins}:${secs}`;
          })()}
        </span>
        {/* Live badge (pulsing) */}
        {running && (
          <span className="ml-2 inline-flex items-center rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-semibold text-white shadow animate-pulse">
            En vivo
          </span>
        )}
        {!running && (
          <span className="ml-2 inline-flex items-center rounded-full bg-slate-500 px-2.5 py-0.5 text-xs font-semibold text-white shadow">
            Pausado
          </span>
        )}
        
        {/* Play / Pause button */}
        {!isFamilyView && (
          <button
            onClick={() => (running ? pause() : start())}
            className="flex items-center gap-2 rounded-lg bg-blue-800 px-3 py-1 hover:bg-blue-700 transition-colors"
          >
            {running ? (
              <>
                <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                <span>Pausar</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                <span>Iniciar</span>
              </>
            )}
          </button>
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
                  {/* Minute */}
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Minuto del evento
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="1"
                        max="120"
                        value={minuto}
                        onChange={e => setMinuto(Number(e.target.value))}
                        className="flex-1 h-1.5 rounded-full bg-slate-100 accent-blue-600"
                      />
                      <span className="w-12 text-center text-xs font-black text-blue-600 bg-blue-50 py-1 rounded-md">
                        {minuto}'
                      </span>
                    </div>
                  </div>

                  {/* Player */}
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Jugador implicado
                    </label>
                    <select
                      required={activeForm !== "Gol" && activeForm !== "Gol en propia puerta"}
                      value={playerId}
                      onChange={e => setPlayerId(e.target.value)}
                      className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 outline-none focus:border-blue-500 focus:bg-white"
                    >
                      <option value="">— Seleccionar jugador —</option>
                      <option value="rival">Rival (Sin jugador asignado)</option>
                      {players.map((p: any) => (
                        <option key={p.id} value={p.id}>
                          #{p.dorsal || '-'} {p.first_name} {p.last_name}
                        </option>
                      ))}
                    </select>
                  </div>

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
    </>
  );
}
