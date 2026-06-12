"use client"

import { useState } from "react"
import { Check, BarChart3, Award } from "lucide-react"
import { useUserRole } from "@/hooks/useUserRole"

interface StatRow {
  id: string
  number: number
  name: string
  avatar: string
  position: string
}

const MOCK_STATS_PLAYERS: StatRow[] = [
  { id: "sp1", number: 1, name: "David García", avatar: "DG", position: "Portero" },
  { id: "sp2", number: 2, name: "Jorge Ruiz", avatar: "JR", position: "Defensa" },
  { id: "sp3", number: 3, name: "Luis Moreno", avatar: "LM", position: "Defensa" },
  { id: "sp4", number: 4, name: "Andrés Gil", avatar: "AG", position: "Mediocampista" },
  { id: "sp5", number: 5, name: "Miguel Sanz", avatar: "MS", position: "Defensa" },
  { id: "sp6", number: 6, name: "Pablo Torres", avatar: "PT", position: "Defensa" },
  { id: "sp7", number: 7, name: "Sergio López", avatar: "SL", position: "Mediocampista" },
  { id: "sp8", number: 8, name: "Rubén Díaz", avatar: "RD", position: "Mediocampista" },
  { id: "sp9", number: 9, name: "Álvaro Núñez", avatar: "AN", position: "Delantero" },
  { id: "sp10", number: 10, name: "Carlos Pérez", avatar: "CP", position: "Delantero" },
  { id: "sp11", number: 11, name: "Iván Castro", avatar: "IC", position: "Delantero" },
  { id: "sp12", number: 12, name: "Mateo Ramos", avatar: "MR", position: "Mediocampista" },
  { id: "sp13", number: 13, name: "Lucas Mendoza", avatar: "LM", position: "Mediocampista" },
  { id: "sp14", number: 14, name: "Daniel Alonso", avatar: "DA", position: "Defensa" },
  { id: "sp15", number: 15, name: "Diego Vázquez", avatar: "DV", position: "Defensa" },
  { id: "sp16", number: 16, name: "Enrique Ortiz", avatar: "EO", position: "Mediocampista" },
  { id: "sp17", number: 17, name: "Felipe Romero", avatar: "FR", position: "Delantero" }
]

export function StatsTab({ players, matchEvents }: { players?: any[], matchEvents?: any[] }) {
  const { rol } = useUserRole()
  const [checkedState, setCheckedState] = useState<Record<string, boolean>>({
    // Pre-populate some stats for a premium initial dashboard look
    "sp10-titular": true, "sp10-gol": true, "sp10-mvp": true,
    "sp4-titular": true, "sp4-gol": true,
    "sp8-titular": true, "sp8-gol": true,
    "sp2-titular": true, "sp2-asistencia": true, "sp2-amarilla": true,
    "sp7-titular": true, "sp7-asistencia": true,
    "sp9-titular": true, "sp9-asistencia": true
  })
  const [alertVisible, setAlertVisible] = useState(false)

  const isFamilyView = rol === "familia" || rol === "jugador"

  const handleCheckboxChange = (playerId: string, actionType: string) => {
    if (isFamilyView) return
    const key = `${playerId}-${actionType}`
    setCheckedState(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const handleValidate = () => {
    if (isFamilyView) return
    setAlertVisible(true)
    setTimeout(() => setAlertVisible(false), 3000)
  }

  const handleCancel = () => {
    if (isFamilyView) return
    setCheckedState({})
  }

  const actions = [
    { id: "asist", label: "Asistido" },
    { id: "titular", label: "Titular" },
    { id: "gol", label: "Gol" },
    { id: "asistencia", label: "Pase Gol" },
    { id: "amarilla", label: "Amarilla" },
    { id: "roja", label: "Roja" },
    { id: "mvp", label: "MVP" }
  ]

  // Mock global team statistics comparison
  const TEAM_STATS = [
    { label: "Posesión", local: 58, away: 42, unit: "%" },
    { label: "Tiros (A puerta)", local: 14, away: 6, unit: "" },
    { label: "Córners", local: 7, away: 2, unit: "" },
    { label: "Faltas cometidas", local: 9, away: 13, unit: "" },
    { label: "Paradas del portero", local: 3, away: 6, unit: "" }
  ]

  if (isFamilyView) {
    return (
      <div className="space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Estadísticas del Partido</h3>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">RESUMEN GLOBAL Y RENDIMIENTO</p>
          </div>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            Oficial
          </span>
        </div>

        {/* Global stats block */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* COMPARISON BARS PANEL */}
          <div className="bg-slate-50/40 rounded-xl border border-slate-150 p-5 space-y-5">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              Comparativa de Equipos
            </h4>

            <div className="space-y-4">
              {TEAM_STATS.map((stat, idx) => {
                const total = stat.local + stat.away
                const localPercent = total > 0 ? (stat.local / total) * 100 : 50
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>{stat.local}{stat.unit}</span>
                      <span className="text-[10px] text-slate-450 uppercase tracking-wide font-semibold">{stat.label}</span>
                      <span>{stat.away}{stat.unit}</span>
                    </div>
                    {/* Double progress bar container */}
                    <div className="h-2 rounded-full overflow-hidden flex bg-slate-200">
                      <div 
                        className="h-full bg-blue-600 rounded-l-full transition-all duration-500" 
                        style={{ width: `${localPercent}%` }}
                      />
                      <div 
                        className="h-full bg-slate-400 rounded-r-full transition-all duration-500" 
                        style={{ width: `${100 - localPercent}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* INDIVIDUAL PERFORMANCE HIGHLIGHTS */}
          <div className="bg-slate-50/40 rounded-xl border border-slate-150 p-5 space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-500" />
              Destacados del Partido
            </h4>

            <div className="space-y-2.5">
              {/* MVP card */}
              <div className="flex items-center justify-between p-3 bg-amber-50/70 border border-amber-100 rounded-xl">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-[11px] font-black text-amber-700">
                    CP
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-800">Carlos Pérez</h5>
                    <p className="text-[9px] text-amber-700 font-extrabold uppercase tracking-widest mt-0.5">★ MVP DEL PARTIDO</p>
                  </div>
                </div>
                <div className="flex gap-1.5 items-center">
                  <span className="text-xs font-bold text-slate-700 bg-white border border-amber-100 px-2 py-0.5 rounded-md">⚽ 2 Goles</span>
                  <span className="text-xs font-bold text-slate-700 bg-white border border-amber-100 px-2 py-0.5 rounded-md">👟 1 Asist.</span>
                </div>
              </div>

              {/* Other goal scorers / cards */}
              {[
                { name: "Andrés Gil", initials: "AG", desc: "Gol anotado en min 65'", badge: "⚽ Gol" },
                { name: "Rubén Díaz", initials: "RD", desc: "Gol anotado en min 81'", badge: "⚽ Gol" },
                { name: "Jorge Ruiz", initials: "JR", desc: "Asistencia & Amarilla", badge: "👟 Asist / 🟨" }
              ].map((highlight, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-white border border-slate-100 rounded-xl">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-[9px] font-black text-blue-700">
                      {highlight.initials}
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-800">{highlight.name}</h5>
                      <p className="text-[9px] text-slate-400 font-semibold">{highlight.desc}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-650 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                    {highlight.badge}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Read-only Squad stats table */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-550 uppercase tracking-wider">Estadísticas Individuales de la Plantilla</h4>
          <div className="border border-slate-150 rounded-xl overflow-hidden shadow-sm bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-3 text-center w-12">#</th>
                  <th className="py-3 px-4">Jugador</th>
                  <th className="py-3 px-3 text-center">Goles</th>
                  <th className="py-3 px-3 text-center">Asistencias</th>
                  <th className="py-3 px-3 text-center">Tarjetas</th>
                  <th className="py-3 px-3 text-center">Titular</th>
                  <th className="py-3 px-3 text-center">Asistido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {MOCK_STATS_PLAYERS.slice(0, 11).map((player: StatRow, idx: number) => {
                  const firstName = player.name.split(" ")[0]
                  const isMVP = firstName === "Carlos"
                  const hasGoal = firstName === "Carlos" || firstName === "Andrés" || firstName === "Rubén"
                  const hasAssist = firstName === "Carlos" || firstName === "Jorge"
                  const hasYellow = firstName === "Jorge"
                  const initials = player.avatar

                  return (
                    <tr key={player.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-800 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[8px] font-black text-blue-700">
                          {initials}
                        </div>
                        {player.name}
                        {isMVP && <span className="bg-amber-100 text-amber-800 text-[8px] font-extrabold px-1 py-0.2 rounded border border-amber-200 ml-1">★ MVP</span>}
                      </td>
                      <td className="py-2.5 px-3 text-center font-black text-emerald-600">{hasGoal ? (isMVP ? "2" : "1") : "—"}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-700">{hasAssist ? "1" : "—"}</td>
                      <td className="py-2.5 px-3 text-center">
                        {hasYellow ? (
                          <span className="w-2 h-3 bg-amber-400 rounded-sm inline-block shadow-xs" title="Amarilla" />
                        ) : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">✓ Sí</td>
                      <td className="py-2.5 px-3 text-center text-slate-400">✓ Sí</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Planilla de Estadísticas</h3>
          <p className="text-[10px] text-slate-400 font-bold mt-0.5">REGISTRO MASIVO DE ACCIONES</p>
        </div>
        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
          17 Jugadores
        </span>
      </div>

      {alertVisible && (
        <div className="bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold px-4 py-3 rounded-xl animate-in fade-in duration-200">
          ✨ ¡Estadísticas registradas de forma simulada!
        </div>
      )}

      <div className="border border-slate-150 rounded-xl overflow-hidden shadow-sm bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-3 text-center w-12">#</th>
                <th className="py-3.5 px-4 min-w-[180px]">Jugador</th>
                {actions.map(action => (
                  <th key={action.id} className="py-3.5 px-3 text-center min-w-[80px]">
                    {action.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MOCK_STATS_PLAYERS.map((player: StatRow, idx: number) => {
                const initials = player.avatar
                return (
                  <tr key={player.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-3 text-center text-xs font-bold text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-black text-blue-700 shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {player.name}
                          </p>
                          <p className="text-[9px] text-slate-400 font-semibold">
                            {player.position}
                          </p>
                        </div>
                      </div>
                    </td>
                    {actions.map(action => {
                      const isChecked = !!checkedState[`${player.id}-${action.id}`]
                      return (
                        <td key={action.id} className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleCheckboxChange(player.id, action.id)}
                            className={[
                              "w-5 h-5 rounded-md border flex items-center justify-center mx-auto transition-all",
                              isChecked
                                ? "bg-blue-600 border-blue-600 text-white"
                                : "border-slate-300 hover:border-blue-500 bg-white"
                            ].join(" ")}
                          >
                            {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
        <button
          onClick={handleCancel}
          className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleValidate}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-200 transition-colors"
        >
          Validar estadísticas
        </button>
      </div>
    </div>
  )
}
