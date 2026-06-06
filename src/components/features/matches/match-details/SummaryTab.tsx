"use client"

import { useState } from "react"
import { LayoutGrid, List, Lock, Unlock } from "lucide-react"
import { useUserRole } from "@/hooks/useUserRole"
import { MVPAward } from "./MVPAward"
import { MOCK_LIVE_PLAYERS } from "./LiveTab"

interface PlayerRow {
  id: string
  number: number
  name: string
  pos: string
  rating: number
  coachRating: number
  assists: number
  goals: number
  yellowCards: number
  redCards: number
  avatar: string
}

const MOCK_SUMMARY_PLAYERS: PlayerRow[] = [
  { id: "p1", number: 1, name: "David García", pos: "POR", rating: 7.2, coachRating: 7.0, assists: 0, goals: 0, yellowCards: 0, redCards: 0, avatar: "DG" },
  { id: "p2", number: 2, name: "Jorge Ruiz", pos: "LD", rating: 7.5, coachRating: 7.5, assists: 1, goals: 0, yellowCards: 1, redCards: 0, avatar: "JR" },
  { id: "p3", number: 5, name: "Miguel Sanz", pos: "DFC", rating: 8.1, coachRating: 8.0, assists: 0, goals: 0, yellowCards: 0, redCards: 0, avatar: "MS" },
  { id: "p4", number: 6, name: "Pablo Torres", pos: "DFC", rating: 7.8, coachRating: 7.5, assists: 0, goals: 0, yellowCards: 0, redCards: 0, avatar: "PT" },
  { id: "p5", number: 3, name: "Luis Moreno", pos: "LI", rating: 6.9, coachRating: 7.0, assists: 0, goals: 0, yellowCards: 0, redCards: 0, avatar: "LM" },
  { id: "p6", number: 8, name: "Rubén Díaz", pos: "MC", rating: 7.4, coachRating: 7.5, assists: 0, goals: 1, yellowCards: 0, redCards: 0, avatar: "RD" },
  { id: "p7", number: 4, name: "Andrés Gil", pos: "MC", rating: 8.3, coachRating: 8.0, assists: 0, goals: 1, yellowCards: 0, redCards: 0, avatar: "AG" },
  { id: "p8", number: 7, name: "Sergio López", pos: "MC", rating: 7.6, coachRating: 7.5, assists: 1, goals: 0, yellowCards: 0, redCards: 0, avatar: "SL" },
  { id: "p9", number: 10, name: "Carlos Pérez", pos: "MP", rating: 9.2, coachRating: 9.5, assists: 1, goals: 2, yellowCards: 0, redCards: 0, avatar: "CP" },
  { id: "p10", number: 9, name: "Álvaro Núñez", pos: "DC", rating: 7.5, coachRating: 7.0, assists: 1, goals: 0, yellowCards: 0, redCards: 0, avatar: "AN" },
  { id: "p11", number: 11, name: "Iván Castro", pos: "DC", rating: 7.0, coachRating: 6.5, assists: 0, goals: 0, yellowCards: 0, redCards: 0, avatar: "IC" },
  { id: "p12", number: 12, name: "Mateo Ramos", pos: "SUPL", rating: 6.8, coachRating: 6.0, assists: 0, goals: 0, yellowCards: 0, redCards: 0, avatar: "MR" },
  { id: "p13", number: 13, name: "Lucas Mendoza", pos: "SUPL", rating: 7.0, coachRating: 6.5, assists: 0, goals: 0, yellowCards: 0, redCards: 0, avatar: "LM" },
  { id: "p14", number: 14, name: "Daniel Alonso", pos: "SUPL", rating: 6.5, coachRating: 6.0, assists: 0, goals: 0, yellowCards: 0, redCards: 0, avatar: "DA" }
]

const PITCH_PLAYERS = [
  { id: "p1", name: "David G.", rating: 7.2, x: 50, y: 88, role: "POR" },
  { id: "p2", name: "Jorge R.", rating: 7.5, x: 15, y: 70, role: "LD" },
  { id: "p3", name: "Miguel S.", rating: 8.1, x: 38, y: 73, role: "DFC" },
  { id: "p4", name: "Pablo T.", rating: 7.8, x: 62, y: 73, role: "DFC" },
  { id: "p5", name: "Luis M.", rating: 6.9, x: 85, y: 70, role: "LI" },
  { id: "p6", name: "Rubén D.", rating: 7.4, x: 30, y: 50, role: "MC" },
  { id: "p7", name: "Andrés G.", rating: 8.3, x: 50, y: 53, role: "MC" },
  { id: "p8", name: "Sergio L.", rating: 7.6, x: 70, y: 50, role: "MC" },
  { id: "p9", name: "Carlos P.", rating: 9.2, x: 50, y: 22, role: "MP" },
  { id: "p10", name: "Álvaro N.", rating: 7.5, x: 25, y: 25, role: "DC" },
  { id: "p11", name: "Iván C.", rating: 7.0, x: 75, y: 25, role: "DC" }
]

export function SummaryTab({ matchId }: { matchId: string }) {
  const { rol } = useUserRole()
  const [tactic, setTactic] = useState("4-3-3")
  const [isPrivate, setIsPrivate] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  const isFamilyView = rol === "familia" || rol === "jugador"

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <MVPAward matchId={matchId} players={MOCK_LIVE_PLAYERS} />
      
      {/* ── Columna Izquierda: Tabla ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
            Estadísticas y Notas
          </h3>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            14 Jugadores
          </span>
        </div>

        <div className="border border-slate-150 rounded-xl overflow-hidden shadow-sm bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-3 text-center">#</th>
                  <th className="py-3 px-4">Jugador</th>
                  <th className="py-3 px-3 text-center">Media</th>
                  <th className="py-3 px-3 text-center">Mi Nota</th>
                  <th className="py-3 px-3 text-center">Asist.</th>
                  <th className="py-3 px-3 text-center">Goles</th>
                  <th className="py-3 px-3 text-center">Tarjetas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {MOCK_SUMMARY_PLAYERS.map(player => (
                  <tr key={player.id} className="hover:bg-blue-50/20 transition-colors">
                    <td className="py-3 px-3 text-center text-xs font-bold text-slate-400">
                      {player.number}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-black text-blue-700 shrink-0">
                          {player.avatar}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {player.name}
                          </p>
                          <p className="text-[9px] text-slate-400 font-semibold">
                            {player.pos}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-block px-1.5 py-0.5 text-xs font-black bg-slate-100 text-slate-700 rounded-md">
                        {player.rating.toFixed(1)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-block px-1.5 py-0.5 text-xs font-black bg-blue-50 text-blue-700 rounded-md">
                        {player.coachRating.toFixed(1)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-700 text-xs">
                      {player.assists || "—"}
                    </td>
                    <td className="py-3 px-3 text-center font-black text-emerald-600 text-xs">
                      {player.goals || "—"}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {player.yellowCards > 0 && (
                          <span className="w-2.5 h-3.5 bg-amber-400 rounded-sm inline-block shadow-sm" title="Amarilla" />
                        )}
                        {player.redCards > 0 && (
                          <span className="w-2.5 h-3.5 bg-red-500 rounded-sm inline-block shadow-sm" title="Roja" />
                        )}
                        {player.yellowCards === 0 && player.redCards === 0 && (
                          <span className="text-slate-300">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Columna Derecha: Alineación Modo Lectura ── */}
      <div className="space-y-4">
        {isFamilyView ? (
          <div className="bg-white rounded-xl border border-slate-150 p-5 shadow-sm space-y-5">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Alineación Inicial</h3>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">VISTA DE FAMILIAR (LECTURA)</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* Campo de Fútbol Verde */}
              <div className="relative aspect-[3/4] w-full max-w-[260px] mx-auto bg-emerald-700 rounded-xl overflow-hidden border border-emerald-800 shadow-md">
                {/* Marcaje de campo */}
                <div className="absolute inset-3 border border-white/20 pointer-events-none">
                  {/* Línea media */}
                  <div className="absolute top-1/2 left-0 right-0 h-px bg-white/20" />
                  {/* Círculo central */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full border border-white/20" />
                  {/* Área superior */}
                  <div className="absolute top-0 left-1/4 right-1/4 h-8 border-b border-x border-white/20" />
                  {/* Área inferior */}
                  <div className="absolute bottom-0 left-1/4 right-1/4 h-8 border-t border-x border-white/20" />
                </div>

                {/* Renderizado de jugadores con notas en badges naranjas */}
                {PITCH_PLAYERS.map(player => (
                  <div
                    key={player.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center select-none"
                    style={{ left: `${player.x}%`, top: `${player.y}%` }}
                  >
                    {/* Node circle */}
                    <div className="relative w-8 h-8 rounded-full bg-slate-900 border border-white flex items-center justify-center text-[9px] font-black text-white shadow-md">
                      {player.name.substring(0, 2).toUpperCase()}
                      
                      {/* Orange Rating Badge */}
                      <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[7px] font-extrabold px-1 rounded-full border border-white shadow-sm">
                        {player.rating}
                      </span>
                    </div>
                    {/* Name */}
                    <span className="text-[8px] font-black text-white mt-0.5 bg-slate-950/70 px-1.5 py-0.2 rounded shadow-sm">
                      {player.name}
                    </span>
                  </div>
                ))}
              </div>

              {/* Lista estática de titulares */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">
                  Jugadores Titulares
                </h4>
                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  {PITCH_PLAYERS.map(player => {
                    const matched = MOCK_SUMMARY_PLAYERS.find(p => p.name.startsWith(player.name.substring(0, player.name.indexOf(" "))))
                    const number = matched ? matched.number : 10
                    return (
                      <div key={player.id} className="flex items-center justify-between p-2 border border-slate-50 rounded-lg bg-slate-50/30">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded bg-blue-100 flex items-center justify-center text-[9px] font-black text-blue-700">
                            {number}
                          </span>
                          <span className="text-xs font-bold text-slate-700">{player.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] font-black text-slate-450 uppercase tracking-widest">{player.role}</span>
                          <span className="text-[9px] font-extrabold text-orange-600 bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded">
                            {player.rating}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-150 p-4 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Alineación</h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">VISTA PREVIA TÁCTICA</p>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Tactic Select */}
                <select
                  value={tactic}
                  onChange={e => setTactic(e.target.value)}
                  className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none"
                >
                  <option value="4-3-3">Sistema: 4-3-3</option>
                  <option value="4-4-2">Sistema: 4-4-2</option>
                  <option value="3-5-2">Sistema: 3-5-2</option>
                </select>

                {/* Privacy Toggle */}
                <button
                  onClick={() => setIsPrivate(!isPrivate)}
                  className={[
                    "p-1.5 rounded-lg border flex items-center justify-center transition-colors",
                    isPrivate
                      ? "bg-amber-50 border-amber-200 text-amber-600"
                      : "bg-slate-50 border-slate-200 text-slate-500"
                  ].join(" ")}
                  title={isPrivate ? "Alineación Privada" : "Alineación Pública"}
                >
                  {isPrivate ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                </button>

                {/* View toggle */}
                <div className="flex rounded-lg border border-slate-250 overflow-hidden">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={[
                      "p-1.5 transition-colors",
                      viewMode === "grid" ? "bg-slate-100 text-slate-700" : "bg-white text-slate-400"
                    ].join(" ")}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={[
                      "p-1.5 transition-colors",
                      viewMode === "list" ? "bg-slate-100 text-slate-700" : "bg-white text-slate-400"
                    ].join(" ")}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Soccer Field or List depending on viewMode (always static) */}
            {viewMode === "list" ? (
              <div className="space-y-2 py-2">
                {PITCH_PLAYERS.map(player => (
                  <div key={player.id} className="flex items-center justify-between p-2.5 border border-slate-100 rounded-xl bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[9px] font-black text-blue-700">
                        {player.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="text-xs font-bold text-slate-755">{player.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{player.role}</span>
                      <span className="text-[10px] font-black text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">
                        {player.rating}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Campo de Fútbol Verde */
              <div className="relative aspect-[3/4] max-w-[340px] mx-auto bg-emerald-700 rounded-xl overflow-hidden border border-emerald-800 shadow-md">
                {/* Marcaje de campo */}
                <div className="absolute inset-4 border border-white/20 pointer-events-none">
                  {/* Línea media */}
                  <div className="absolute top-1/2 left-0 right-0 h-px bg-white/20" />
                  {/* Círculo central */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-white/20" />
                  {/* Área superior */}
                  <div className="absolute top-0 left-1/4 right-1/4 h-10 border-b border-x border-white/20" />
                  {/* Área inferior */}
                  <div className="absolute bottom-0 left-1/4 right-1/4 h-10 border-t border-x border-white/20" />
                </div>

                {/* Renderizado de jugadores con notas en badges naranjas */}
                {PITCH_PLAYERS.map(player => (
                  <div
                    key={player.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center select-none"
                    style={{ left: `${player.x}%`, top: `${player.y}%` }}
                  >
                    {/* Node circle */}
                    <div className="relative w-9 h-9 rounded-full bg-slate-900 border-2 border-white flex items-center justify-center text-[10px] font-black text-white shadow-md">
                      {player.name.substring(0, 2).toUpperCase()}
                      
                      {/* Orange Rating Badge */}
                      <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-white text-[8px] font-extrabold px-1 rounded-full border border-white shadow-sm">
                        {player.rating}
                      </span>
                    </div>
                    {/* Name */}
                    <span className="text-[9px] font-black text-white mt-1 bg-slate-950/70 px-1.5 py-0.5 rounded shadow-sm">
                      {player.name}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Zona inferior de suplentes */}
            <div className="border-t border-slate-100 pt-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Banquillo de suplentes</p>
              <div className="flex flex-wrap gap-2">
                {MOCK_SUMMARY_PLAYERS.filter(p => p.pos === "SUPL").map(supl => (
                  <div key={supl.id} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 px-2 py-1 rounded-lg">
                    <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[8px] font-black text-blue-700">
                      {supl.avatar}
                    </div>
                    <span className="text-xs font-bold text-slate-700">{supl.name}</span>
                    <span className="text-[9px] font-extrabold text-orange-500 bg-orange-50 px-1 rounded border border-orange-100">
                      {supl.rating}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
