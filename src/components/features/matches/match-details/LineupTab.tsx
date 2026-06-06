"use client"

import { useState } from "react"
import { Users, X, HelpCircle, Save } from "lucide-react"
import { useUserRole } from "@/hooks/useUserRole"

interface Player {
  id: string
  name: string
  pos: string
  avatar: string
  demarcation: "Portero" | "Defensa" | "Mediocampista" | "Delantero"
}

const INITIAL_PLAYERS: Player[] = [
  { id: "lp1", name: "David García", pos: "POR", avatar: "DG", demarcation: "Portero" },
  { id: "lp2", name: "Jorge Ruiz", pos: "LD", avatar: "JR", demarcation: "Defensa" },
  { id: "lp3", name: "Miguel Sanz", pos: "DFC", avatar: "MS", demarcation: "Defensa" },
  { id: "lp4", name: "Pablo Torres", pos: "DFC", avatar: "PT", demarcation: "Defensa" },
  { id: "lp5", name: "Luis Moreno", pos: "LI", avatar: "LM", demarcation: "Defensa" },
  { id: "lp6", name: "Rubén Díaz", pos: "MC", avatar: "RD", demarcation: "Mediocampista" },
  { id: "lp7", name: "Andrés Gil", pos: "MC", avatar: "AG", demarcation: "Mediocampista" },
  { id: "lp8", name: "Sergio López", pos: "MC", avatar: "SL", demarcation: "Mediocampista" },
  { id: "lp9", name: "Carlos Pérez", pos: "MP", avatar: "CP", demarcation: "Delantero" },
  { id: "lp10", name: "Álvaro Núñez", pos: "DC", avatar: "AN", demarcation: "Delantero" },
  { id: "lp11", name: "Iván Castro", pos: "DC", avatar: "IC", demarcation: "Delantero" },
  { id: "lp12", name: "Mateo Ramos", pos: "MD", avatar: "MR", demarcation: "Mediocampista" },
  { id: "lp13", name: "Lucas Mendoza", pos: "MI", avatar: "LM", demarcation: "Mediocampista" },
  { id: "lp14", name: "Daniel Alonso", pos: "DFC", avatar: "DA", demarcation: "Defensa" }
]

interface FormationSlot {
  id: string
  label: string
  x: number // percent X
  y: number // percent Y
}

const FORMATIONS: Record<string, FormationSlot[]> = {
  "4-3-3": [
    { id: "slot-0", label: "POR", x: 50, y: 88 },
    { id: "slot-1", label: "LD", x: 15, y: 70 },
    { id: "slot-2", label: "DFC", x: 38, y: 73 },
    { id: "slot-3", label: "DFC", x: 62, y: 73 },
    { id: "slot-4", label: "LI", x: 85, y: 70 },
    { id: "slot-5", label: "MC", x: 30, y: 50 },
    { id: "slot-6", label: "MCO", x: 50, y: 53 },
    { id: "slot-7", label: "MC", x: 70, y: 50 },
    { id: "slot-8", label: "EI", x: 25, y: 25 },
    { id: "slot-9", label: "DC", x: 50, y: 20 },
    { id: "slot-10", label: "ED", x: 75, y: 25 }
  ],
  "4-4-2": [
    { id: "slot-0", label: "POR", x: 50, y: 88 },
    { id: "slot-1", label: "LD", x: 15, y: 70 },
    { id: "slot-2", label: "DFC", x: 38, y: 73 },
    { id: "slot-3", label: "DFC", x: 62, y: 73 },
    { id: "slot-4", label: "LI", x: 85, y: 70 },
    { id: "slot-5", label: "MD", x: 15, y: 48 },
    { id: "slot-6", label: "MC", x: 38, y: 50 },
    { id: "slot-7", label: "MC", x: 62, y: 50 },
    { id: "slot-8", label: "MI", x: 85, y: 48 },
    { id: "slot-9", label: "DC", x: 38, y: 22 },
    { id: "slot-10", label: "DC", x: 62, y: 22 }
  ],
  "3-5-2": [
    { id: "slot-0", label: "POR", x: 50, y: 88 },
    { id: "slot-1", label: "DFC", x: 25, y: 73 },
    { id: "slot-2", label: "DFC", x: 50, y: 75 },
    { id: "slot-3", label: "DFC", x: 75, y: 73 },
    { id: "slot-4", label: "MD", x: 15, y: 48 },
    { id: "slot-5", label: "MC", x: 35, y: 52 },
    { id: "slot-6", label: "MCD", x: 50, y: 56 },
    { id: "slot-7", label: "MC", x: 65, y: 52 },
    { id: "slot-8", label: "MI", x: 85, y: 48 },
    { id: "slot-9", label: "DC", x: 35, y: 22 },
    { id: "slot-10", label: "DC", x: 65, y: 22 }
  ]
}

export function LineupTab() {
  const { rol } = useUserRole()
  const [tactic, setTactic] = useState<string>("4-3-3")
  const [assignments, setAssignments] = useState<Record<string, Player>>({
    "slot-0": INITIAL_PLAYERS[0], // David G.
    "slot-1": INITIAL_PLAYERS[1], // Jorge R.
    "slot-2": INITIAL_PLAYERS[2], // Miguel S.
    "slot-3": INITIAL_PLAYERS[3], // Pablo T.
    "slot-4": INITIAL_PLAYERS[4], // Luis M.
    "slot-5": INITIAL_PLAYERS[5], // Rubén D.
    "slot-6": INITIAL_PLAYERS[6], // Andrés G.
    "slot-7": INITIAL_PLAYERS[7], // Sergio L.
    "slot-8": INITIAL_PLAYERS[8], // Carlos P.
    "slot-9": INITIAL_PLAYERS[9], // Álvaro N.
    "slot-10": INITIAL_PLAYERS[10] // Iván C.
  })
  const [savedAlert, setSavedAlert] = useState(false)

  const isFamilyView = rol === "familia" || rol === "jugador"

  // List of players currently not assigned to any slot
  const assignedPlayerIds = Object.values(assignments).map(p => p.id)
  const availablePlayers = INITIAL_PLAYERS.filter(p => !assignedPlayerIds.includes(p.id))

  const handleAssignPlayer = (playerId: string, slotId: string) => {
    if (isFamilyView) return
    const player = INITIAL_PLAYERS.find(p => p.id === playerId)
    if (!player) return

    // If this player is already in another slot, clear that slot
    const previousSlot = Object.keys(assignments).find(key => assignments[key].id === playerId)
    
    setAssignments(prev => {
      const updated = { ...prev }
      if (previousSlot) {
        delete updated[previousSlot]
      }
      updated[slotId] = player
      return updated
    })
  }

  const handleUnassignPlayer = (slotId: string) => {
    if (isFamilyView) return
    setAssignments(prev => {
      const updated = { ...prev }
      delete updated[slotId]
      return updated
    })
  }

  const handleSave = () => {
    if (isFamilyView) return
    setSavedAlert(true)
    setTimeout(() => setSavedAlert(false), 3000)
  }

  return (
    <div className={isFamilyView ? "max-w-xl mx-auto space-y-4" : "grid grid-cols-1 lg:grid-cols-3 gap-8"}>
      
      {/* ── Columna Izquierda / Central: Pizarra Interactiva (Lectura si familiar) ── */}
      <div className={isFamilyView ? "space-y-4" : "lg:col-span-2 space-y-4"}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Alineación Táctica</h3>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">
              {isFamilyView ? "VISTA PREVIA TÁCTICA (MODO LECTURA)" : "MODO EDICIÓN INTERACTIVO (DRAG & DROP)"}
            </p>
          </div>

          {!isFamilyView && (
            <select
              value={tactic}
              onChange={e => {
                setTactic(e.target.value)
                setAssignments({}) // reset on formation change
              }}
              className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none"
            >
              <option value="4-3-3">Táctica: 4-3-3</option>
              <option value="4-4-2">Táctica: 4-4-2</option>
              <option value="3-5-2">Táctica: 3-5-2</option>
            </select>
          )}
        </div>

        {savedAlert && (
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold px-4 py-3 rounded-xl animate-in fade-in duration-200">
            ✅ ¡Alineación táctica guardada con éxito en el servidor simulado!
          </div>
        )}

        {/* Pitch Container */}
        <div className="bg-white border border-slate-150 rounded-xl p-5 shadow-sm space-y-4">
          <div className="relative aspect-[3/4] max-w-[380px] mx-auto bg-emerald-700 rounded-xl overflow-hidden border border-emerald-800 shadow-md">
            {/* Campo de fútbol marcajes */}
            <div className="absolute inset-4 border border-white/20 pointer-events-none">
              <div className="absolute top-1/2 left-0 right-0 h-px bg-white/20" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-white/20" />
              <div className="absolute top-0 left-1/4 right-1/4 h-12 border-b border-x border-white/20" />
              <div className="absolute bottom-0 left-1/4 right-1/4 h-12 border-t border-x border-white/20" />
            </div>

            {/* Slots */}
            {FORMATIONS[tactic].map(slot => {
              const assignedPlayer = assignments[slot.id]
              
              return (
                <div
                  key={slot.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10"
                  style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                  onDragOver={isFamilyView ? undefined : e => e.preventDefault()}
                  onDrop={isFamilyView ? undefined : e => {
                    const playerId = e.dataTransfer.getData("playerId")
                    if (playerId) handleAssignPlayer(playerId, slot.id)
                  }}
                >
                  {assignedPlayer ? (
                    // Assigned Player Circle Node
                    <div className="relative group flex flex-col items-center">
                      <div
                        className={[
                          "w-10 h-10 rounded-full bg-slate-900 border-2 border-white flex items-center justify-center text-xs font-black text-white shadow-md",
                          isFamilyView ? "cursor-default select-none" : "cursor-grab active:cursor-grabbing"
                        ].join(" ")}
                        draggable={!isFamilyView}
                        onDragStart={isFamilyView ? undefined : e => e.dataTransfer.setData("playerId", assignedPlayer.id)}
                      >
                        {assignedPlayer.avatar}

                        {/* Unassign button - hidden if family view */}
                        {!isFamilyView && (
                          <button
                            onClick={() => handleUnassignPlayer(slot.id)}
                            className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 border border-white shadow-sm flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                      <span className="text-[9px] font-black text-white mt-1 bg-slate-950/80 px-1.5 py-0.5 rounded shadow-sm">
                        {assignedPlayer.name.split(" ")[0]}
                      </span>
                    </div>
                  ) : (
                    // Empty Slot (dashed border)
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full border-2 border-dashed border-white/40 bg-white/5 flex flex-col items-center justify-center text-[8px] font-black text-white/50 tracking-tighter shadow-inner">
                        {slot.label}
                      </div>
                      <span className="text-[8px] font-bold text-white/40 mt-1 uppercase tracking-widest">
                        Vacío
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Hide Save button if family view */}
          {!isFamilyView && (
            <div className="flex justify-end pt-2">
              <button
                onClick={handleSave}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm shadow-blue-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Save className="w-4 h-4" />
                Guardar alineación
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

          <div className="bg-white border border-slate-150 rounded-xl p-4 shadow-sm space-y-3">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
              Arrastra los jugadores al campo
            </p>

            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {availablePlayers.map(player => (
                <div
                  key={player.id}
                  draggable={true}
                  onDragStart={e => e.dataTransfer.setData("playerId", player.id)}
                  className="flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-slate-50/50 hover:bg-blue-50/30 hover:border-blue-200 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all duration-200 select-none"
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
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
