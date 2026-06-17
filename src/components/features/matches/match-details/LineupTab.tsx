"use client"

import { useState, useTransition } from "react"
import { Users, Save, X, HelpCircle } from "lucide-react"
import { useUserRole } from "@/hooks/useUserRole"
import { saveLineup } from "@/app/actions/match-actions"

interface Player {
  id: string
  name: string
  pos: string
  avatar: string
  demarcation: string
  number?: number | string
}

const INITIAL_PLAYERS: Player[] = []

export const FORMATIONS: Record<string, { id: string; label: string; x: number; y: number }[]> = {
  "4-3-3": [
    { id: "slot-0", label: "POR", x: 50, y: 88 },
    { id: "slot-1", label: "LD", x: 15, y: 70 },
    { id: "slot-2", label: "DFC", x: 38, y: 75 },
    { id: "slot-3", label: "DFC", x: 62, y: 75 },
    { id: "slot-4", label: "LI", x: 85, y: 70 },
    { id: "slot-5", label: "MCD", x: 50, y: 55 },
    { id: "slot-6", label: "MC", x: 30, y: 45 },
    { id: "slot-7", label: "MC", x: 70, y: 45 },
    { id: "slot-8", label: "ED", x: 20, y: 25 },
    { id: "slot-9", label: "DC", x: 50, y: 20 },
    { id: "slot-10", label: "EI", x: 80, y: 25 }
  ],
  "4-4-2": [
    { id: "slot-0", label: "POR", x: 50, y: 88 },
    { id: "slot-1", label: "LD", x: 15, y: 70 },
    { id: "slot-2", label: "DFC", x: 38, y: 75 },
    { id: "slot-3", label: "DFC", x: 62, y: 75 },
    { id: "slot-4", label: "LI", x: 85, y: 70 },
    { id: "slot-5", label: "MD", x: 20, y: 45 },
    { id: "slot-6", label: "MC", x: 40, y: 48 },
    { id: "slot-7", label: "MC", x: 60, y: 48 },
    { id: "slot-8", label: "MI", x: 80, y: 45 },
    { id: "slot-9", label: "DC", x: 35, y: 22 },
    { id: "slot-10", label: "DC", x: 65, y: 22 }
  ],
  "3-5-2": [
    { id: "slot-0", label: "POR", x: 50, y: 88 },
    { id: "slot-1", label: "DFC", x: 25, y: 75 },
    { id: "slot-2", label: "DFC", x: 50, y: 78 },
    { id: "slot-3", label: "DFC", x: 75, y: 75 },
    { id: "slot-4", label: "CAD", x: 15, y: 50 },
    { id: "slot-5", label: "MCD", x: 50, y: 58 },
    { id: "slot-6", label: "MC", x: 35, y: 45 },
    { id: "slot-7", label: "MC", x: 65, y: 45 },
    { id: "slot-8", label: "CAI", x: 85, y: 50 },
    { id: "slot-9", label: "DC", x: 35, y: 22 },
    { id: "slot-10", label: "DC", x: 65, y: 22 }
  ],
  "4-2-3-1": [
    { id: "slot-0", label: "POR", x: 50, y: 88 },
    { id: "slot-1", label: "LD", x: 15, y: 70 },
    { id: "slot-2", label: "DFC", x: 38, y: 75 },
    { id: "slot-3", label: "DFC", x: 62, y: 75 },
    { id: "slot-4", label: "LI", x: 85, y: 70 },
    { id: "slot-5", label: "MCD", x: 38, y: 58 },
    { id: "slot-6", label: "MCD", x: 62, y: 58 },
    { id: "slot-7", label: "MD", x: 20, y: 40 },
    { id: "slot-8", label: "MCO", x: 50, y: 38 },
    { id: "slot-9", label: "MI", x: 80, y: 40 },
    { id: "slot-10", label: "DC", x: 50, y: 20 }
  ],
  "3-4-3": [
    { id: "slot-0", label: "POR", x: 50, y: 88 },
    { id: "slot-1", label: "DFC", x: 25, y: 75 },
    { id: "slot-2", label: "DFC", x: 50, y: 78 },
    { id: "slot-3", label: "DFC", x: 75, y: 75 },
    { id: "slot-4", label: "MD", x: 15, y: 48 },
    { id: "slot-5", label: "MC", x: 38, y: 50 },
    { id: "slot-6", label: "MC", x: 62, y: 50 },
    { id: "slot-7", label: "MI", x: 85, y: 48 },
    { id: "slot-8", label: "ED", x: 25, y: 25 },
    { id: "slot-9", label: "DC", x: 50, y: 20 },
    { id: "slot-10", label: "EI", x: 75, y: 25 }
  ],
  "4-1-4-1": [
    { id: "slot-0", label: "POR", x: 50, y: 88 },
    { id: "slot-1", label: "LD", x: 15, y: 70 },
    { id: "slot-2", label: "DFC", x: 38, y: 73 },
    { id: "slot-3", label: "DFC", x: 62, y: 73 },
    { id: "slot-4", label: "LI", x: 85, y: 70 },
    { id: "slot-5", label: "MCD", x: 50, y: 58 },
    { id: "slot-6", label: "MD", x: 20, y: 42 },
    { id: "slot-7", label: "MC", x: 40, y: 45 },
    { id: "slot-8", label: "MC", x: 60, y: 45 },
    { id: "slot-9", label: "MI", x: 80, y: 42 },
    { id: "slot-10", label: "DC", x: 50, y: 20 }
  ],
  "5-3-2": [
    { id: "slot-0", label: "POR", x: 50, y: 88 },
    { id: "slot-1", label: "CAD", x: 10, y: 65 },
    { id: "slot-2", label: "DFC", x: 30, y: 73 },
    { id: "slot-3", label: "DFC", x: 50, y: 75 },
    { id: "slot-4", label: "DFC", x: 70, y: 73 },
    { id: "slot-5", label: "CAI", x: 90, y: 65 },
    { id: "slot-6", label: "MC", x: 35, y: 48 },
    { id: "slot-7", label: "MCD", x: 50, y: 52 },
    { id: "slot-8", label: "MC", x: 65, y: 48 },
    { id: "slot-9", label: "DC", x: 35, y: 22 },
    { id: "slot-10", label: "DC", x: 65, y: 22 }
  ]
}

export function LineupTab({ matchId, players = [], convocatorias = [] }: { matchId?: string, players?: any[], convocatorias?: any[] }) {
  const { rol } = useUserRole()
  const [isPending, startTransition] = useTransition()
  
  const mappedPlayers: Player[] = players.map(p => ({
    id: p.id,
    name: p.first_name || "",
    pos: p.posicion_principal || "N/A",
    avatar: `${p.first_name[0] || ''}${p.last_name[0] || ''}`,
    demarcation: "Mediocampista",
    number: p.dorsal 
  }))
  
  const initialPlayersList = mappedPlayers.length > 0 ? mappedPlayers : INITIAL_PLAYERS;

  // Cargar desde base de datos usando tactical_x y tactical_y si existen
  const initialPitchPlayers: Record<string, { x: number, y: number }> = {};
  
  // Titulares
  const titularesDb = convocatorias.filter(c => c.titular);
  if (titularesDb.length > 0 && mappedPlayers.length > 0) {
    titularesDb.forEach(c => {
      initialPitchPlayers[c.player_id] = { 
        x: c.tactical_x != null ? c.tactical_x : 50, 
        y: c.tactical_y != null ? c.tactical_y : 50 
      };
    });
  } else {
    // Si no hay datos, cargar la táctica inicial
    let i = 0;
    for (const p of initialPlayersList) {
      if (i < 11 && FORMATIONS["4-3-3"][i]) {
        initialPitchPlayers[p.id] = { x: FORMATIONS["4-3-3"][i].x, y: FORMATIONS["4-3-3"][i].y };
        i++;
      }
    }
  }

  const [tactic, setTactic] = useState<string>("4-3-3")
  const [pitchPlayers, setPitchPlayers] = useState<Record<string, { x: number, y: number }>>(initialPitchPlayers)
  const [savedAlert, setSavedAlert] = useState(false)
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const isFamilyView = rol === "familia" || rol === "jugador"
  
  const assignedPlayerIds = Object.keys(pitchPlayers);
  const availablePlayers = initialPlayersList.filter(p => !assignedPlayerIds.includes(p.id));

  const handleTacticChange = (newTactic: string) => {
    setTactic(newTactic);
    const newPitchPlayers: Record<string, { x: number, y: number }> = {};
    const slots = FORMATIONS[newTactic];
    let slotIdx = 0;
    
    // Asignar los jugadores que ya están en el campo a las nuevas posiciones
    for (const playerId of assignedPlayerIds) {
      if (slotIdx < 11 && slots[slotIdx]) {
        newPitchPlayers[playerId] = { x: slots[slotIdx].x, y: slots[slotIdx].y };
        slotIdx++;
      }
    }
    setPitchPlayers(newPitchPlayers);
    setSelectedPlayerId(null);
  }

  const handleSave = () => {
    if (isFamilyView || !matchId) return
    startTransition(async () => {
      const assigned = Object.keys(pitchPlayers).map(playerId => ({
        playerId,
        x: pitchPlayers[playerId].x,
        y: pitchPlayers[playerId].y
      }));
      await saveLineup(matchId, assigned, tactic)
      setSavedAlert(true)
      setTimeout(() => setSavedAlert(false), 3000)
    })
  }

  const handlePitchDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (isFamilyView) return;
    e.preventDefault();
    const playerId = e.dataTransfer.getData("playerId");
    if (!playerId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    let x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    let y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    
    // Si estamos en Desktop (pitch horizontal), invertimos las coordenadas para guardar en formato vertical
    if (window.innerWidth >= 768) {
      const tempX = x;
      x = 100 - y;
      y = tempX;
    }
    
    setPitchPlayers(prev => ({
      ...prev,
      [playerId]: { x, y }
    }));
    setSelectedPlayerId(null);
  }

  const handlePitchClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isFamilyView || !selectedPlayerId) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    let x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    let y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    
    if (window.innerWidth >= 768) {
      const tempX = x;
      x = 100 - y;
      y = tempX;
    }
    
    setPitchPlayers(prev => ({
      ...prev,
      [selectedPlayerId]: { x, y }
    }));
    setSelectedPlayerId(null);
  }

  const handleRemoveFromPitch = (playerId: string) => {
    if (isFamilyView) return;
    setPitchPlayers(prev => {
      const next = { ...prev };
      delete next[playerId];
      return next;
    });
  }

  return (
    <div className={isFamilyView ? "max-w-xl mx-auto space-y-4" : "grid grid-cols-1 lg:grid-cols-3 gap-8"}>
      
      {/* ── Columna Izquierda / Central: Pizarra Interactiva (Lectura si familiar) ── */}
      <div className={isFamilyView ? "space-y-4" : "lg:col-span-2 space-y-4"}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Alineación Táctica</h3>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">
              {isFamilyView ? "VISTA PREVIA TÁCTICA (MODO LECTURA)" : "MODO EDICIÓN INTERACTIVO (DRAG & DROP LIBRE)"}
            </p>
          </div>

          {!isFamilyView && (
            <select
              value={tactic}
              onChange={e => handleTacticChange(e.target.value)}
              className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none"
            >
              <option value="4-3-3">Sistema: 4-3-3</option>
              <option value="4-4-2">Sistema: 4-4-2</option>
              <option value="3-5-2">Sistema: 3-5-2</option>
              <option value="4-2-3-1">Sistema: 4-2-3-1</option>
              <option value="3-4-3">Sistema: 3-4-3</option>
              <option value="4-1-4-1">Sistema: 4-1-4-1</option>
              <option value="5-3-2">Sistema: 5-3-2</option>
            </select>
          )}
        </div>

        {savedAlert && (
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold px-4 py-3 rounded-xl animate-in fade-in duration-200">
            ✅ ¡Alineación táctica guardada con éxito!
          </div>
        )}

        {/* Pitch Container */}
        <div className="bg-white border border-slate-150 rounded-xl p-5 shadow-sm space-y-4">
          <div 
            className="relative aspect-[3/4] md:aspect-auto md:w-full md:h-[380px] max-w-[380px] md:max-w-none mx-auto bg-emerald-700 rounded-xl overflow-hidden border border-emerald-800 shadow-md transition-all cursor-pointer md:cursor-default"
            onDragOver={isFamilyView ? undefined : e => e.preventDefault()}
            onDrop={handlePitchDrop}
            onClick={handlePitchClick}
          >
            {/* Campo de fútbol marcajes */}
            <div className="absolute inset-4 border border-white/20 pointer-events-none md:-rotate-90 md:origin-center md:scale-[1.3] md:w-[150%] md:-left-[25%]">
              <div className="absolute top-1/2 left-0 right-0 h-px bg-white/20" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-white/20" />
              <div className="absolute top-0 left-1/4 right-1/4 h-12 border-b border-x border-white/20" />
              <div className="absolute bottom-0 left-1/4 right-1/4 h-12 border-t border-x border-white/20" />
            </div>

            {/* Jugadores en el campo */}
            {Object.entries(pitchPlayers).map(([playerId, coords]) => {
              const player = initialPlayersList.find(p => p.id === playerId);
              if (!player) return null;
              
              return (
                <div
                  key={playerId}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10 transition-all duration-75"
                  ref={(el) => {
                    if(el) {
                      if (window.innerWidth >= 768) {
                        el.style.left = `${coords.y}%`;
                        el.style.top = `${100 - coords.x}%`;
                      } else {
                        el.style.left = `${coords.x}%`;
                        el.style.top = `${coords.y}%`;
                      }
                    }
                  }}
                >
                  <div className="relative group flex flex-col items-center">
                    <div
                      className={[
                        "w-10 h-10 rounded-full bg-slate-900 border-2 flex items-center justify-center text-sm font-black shadow-md transition-all duration-200",
                        isFamilyView ? "cursor-default select-none border-white text-white" : "cursor-grab active:cursor-grabbing",
                        selectedPlayerId === player.id ? "border-blue-400 text-blue-400 scale-110 shadow-blue-500/50 shadow-lg" : "border-white text-white"
                      ].join(" ")}
                      draggable={!isFamilyView}
                      onClick={(e) => {
                        if (!isFamilyView) {
                          e.stopPropagation();
                          setSelectedPlayerId(selectedPlayerId === player.id ? null : player.id);
                        }
                      }}
                      onDragStart={isFamilyView ? undefined : e => {
                        e.dataTransfer.setData("playerId", player.id);
                        setTimeout(() => {
                           const el = e.target as HTMLElement;
                           if(el.parentElement) el.parentElement.style.opacity = '0.5';
                        }, 0);
                      }}
                      onDragEnd={isFamilyView ? undefined : e => {
                         const el = e.target as HTMLElement;
                         if(el.parentElement) el.parentElement.style.opacity = '1';
                      }}
                    >
                      {player.number || "?"}

                      {!isFamilyView && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFromPitch(player.id);
                          }}
                          className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 border border-white shadow-sm flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                    <span className="text-[9px] font-black text-white mt-1 bg-slate-950/80 px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
                      {player.name.split(" ")[0]}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {!isFamilyView && (
            <div className="flex justify-end pt-2">
              <button
                onClick={handleSave}
                disabled={isPending}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-sm shadow-blue-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {isPending ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isPending ? "Guardando..." : "Guardar alineación"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Columna Derecha: Banquillo / Lista (Oculta si familiar) ── */}
      {!isFamilyView && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Lista de jugadores</h3>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {availablePlayers.length} Suplentes
            </span>
          </div>

          <div 
            className="bg-white border border-slate-150 rounded-xl p-4 shadow-sm space-y-3 min-h-[500px]"
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              const playerId = e.dataTransfer.getData("playerId");
              if (playerId) handleRemoveFromPitch(playerId);
            }}
          >
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
              Toca un jugador y luego el campo (o arrastra en PC)
            </p>

            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {availablePlayers.map(player => (
                <div
                  key={player.id}
                  draggable={true}
                  onClick={() => {
                    if (!isFamilyView) {
                      setSelectedPlayerId(selectedPlayerId === player.id ? null : player.id);
                    }
                  }}
                  onDragStart={e => e.dataTransfer.setData("playerId", player.id)}
                  className={`flex items-center justify-between p-3 border rounded-xl cursor-grab active:cursor-grabbing transition-all duration-200 select-none ${selectedPlayerId === player.id ? 'bg-blue-50/50 border-blue-300 ring-2 ring-blue-500 shadow-md' : 'border-slate-100 bg-slate-50/50 hover:bg-blue-50/30 hover:border-blue-200 hover:shadow-sm'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-black text-blue-700 shrink-0">
                      {player.avatar}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{player.name}</h4>
                      <span className="text-[9px] text-slate-400 font-semibold">{player.demarcation}</span>
                    </div>
                  </div>

                  <span className="text-[9px] font-extrabold uppercase tracking-wide text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                    {player.pos}
                  </span>
                </div>
              ))}

              {availablePlayers.length === 0 && (
                <div className="py-12 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-medium">Todos los jugadores colocados</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
