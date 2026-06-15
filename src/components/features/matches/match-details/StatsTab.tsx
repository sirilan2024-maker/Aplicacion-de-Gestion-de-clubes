"use client"

import { useState } from "react"
import { Check, BarChart3, Award } from "lucide-react"
import { useUserRole } from "@/hooks/useUserRole"
import { useParams } from "next/navigation"
import Link from "next/link"

export function StatsTab({ players = [], convocatorias = [], matchEvents }: { players?: any[], convocatorias?: any[], matchEvents?: any[] }) {
  const { rol } = useUserRole()
  const { teamId } = useParams()
  
  const mappedPlayers = players.map(p => {
    const conv = convocatorias.find(c => c.player_id === p.id);
    return {
      id: p.id,
      number: p.dorsal || '-',
      name: `${p.first_name} ${p.last_name}`,
      avatar: `${p.first_name[0] || ''}${p.last_name[0] || ''}`,
      position: p.posicion_principal || "Jugador",
      status: (conv?.estado_asistencia === 'Ausente' || conv?.estado_asistencia === 'Justificado') ? conv.estado_asistencia : 'Presente',
      coachRating: conv?.coach_rating || 0,
      actitud: conv?.actitud || 0,
      goals: conv?.goals || 0,
      assists: conv?.assists || 0,
      yellowCards: conv?.yellow_cards || 0,
      redCards: conv?.red_cards || 0,
      minutes: conv?.minutes_played || 0,
      titular: conv?.titular || false
    };
  });

  const isFamilyView = rol === "familia" || rol === "jugador"
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
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Estadísticas del Partido</h3>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">RESUMEN GLOBAL Y RENDIMIENTO</p>
          </div>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            Oficial
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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

          <div className="bg-slate-50/40 rounded-xl border border-slate-150 p-5 space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-500" />
              Destacados del Partido
            </h4>

            <div className="space-y-2.5">
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

        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-550 uppercase tracking-wider">Estadísticas Individuales de la Plantilla</h4>
          <div className="border border-slate-150 rounded-xl overflow-hidden shadow-sm bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-3 text-center w-12">#</th>
                  <th className="py-3 px-4">Jugador</th>
                  <th className="py-3 px-3 text-center">Asistencia</th>
                  <th className="py-3 px-3 text-center">Nota (1-10)</th>
                  <th className="py-3 px-3 text-center">Actitud (1-10)</th>
                  <th className="py-3 px-3 text-center">Minutos</th>
                  <th className="py-3 px-3 text-center">Goles</th>
                  <th className="py-3 px-3 text-center">Asistencias</th>
                  <th className="py-3 px-3 text-center">Amarillas</th>
                  <th className="py-3 px-3 text-center">Rojas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {mappedPlayers.map((player: any, idx: number) => {
                  return (
                    <tr key={player.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 px-3 text-center font-bold text-slate-400">{player.number}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-800">
                        <Link 
                          href={`/dashboard/equipos/${teamId}/jugador/${player.id}?view=partidos&tab=stats`}
                          className="flex items-center gap-2 hover:bg-slate-50/80 p-1 -m-1 rounded-lg transition-colors group cursor-pointer"
                        >
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[8px] font-black text-blue-700">
                            {player.avatar}
                          </div>
                          <span className="group-hover:text-blue-600 transition-colors">{player.name}</span>
                        </Link>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center">
                          {player.status === 'Presente' ? (
                            <span className="inline-block px-2 py-0.5 text-[10px] font-black bg-emerald-100 text-emerald-700 rounded-md">Asiste</span>
                          ) : player.status === 'Ausente' ? (
                            <span className="inline-block px-2 py-0.5 text-[10px] font-black bg-red-100 text-red-700 rounded-md">No Asiste</span>
                          ) : player.status === 'Justificado' ? (
                            <span className="inline-block px-2 py-0.5 text-[10px] font-black bg-amber-100 text-amber-700 rounded-md">Justificado</span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 text-[10px] font-black bg-slate-100 text-slate-500 rounded-md">-</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-block px-1.5 py-0.5 text-xs font-black bg-blue-50 text-blue-700 rounded-md">
                          {player.coachRating.toFixed(1)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-block px-1.5 py-0.5 text-xs font-black bg-purple-50 text-purple-700 rounded-md">
                          {player.actitud.toFixed(1)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-700">{player.minutes > 0 ? `${player.minutes}'` : "0"}</td>
                      <td className="py-2.5 px-3 text-center font-black text-emerald-600">{player.goals || "0"}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-700">{player.assists || "0"}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-amber-500">{player.yellowCards || "0"}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-red-500">{player.redCards || "0"}</td>
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
          {mappedPlayers.length} Jugadores
        </span>
      </div>

      <div className="border border-slate-150 rounded-xl overflow-hidden shadow-sm bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-3 text-center w-12">#</th>
                <th className="py-3.5 px-4 min-w-[180px]">Jugador</th>
                <th className="py-3.5 px-3 text-center">Asistencia</th>
                <th className="py-3.5 px-3 text-center">Nota (1-10)</th>
                <th className="py-3.5 px-3 text-center">Actitud (1-10)</th>
                <th className="py-3.5 px-3 text-center">Minutos</th>
                <th className="py-3.5 px-3 text-center">Goles</th>
                <th className="py-3.5 px-3 text-center">Asistencias</th>
                <th className="py-3.5 px-3 text-center">Amarillas</th>
                <th className="py-3.5 px-3 text-center">Rojas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mappedPlayers.map((player: any) => (
                <tr key={player.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-3 text-center text-xs font-bold text-slate-400">
                    {player.number}
                  </td>
                  <td className="py-3 px-4">
                    <Link 
                      href={`/dashboard/equipos/${teamId}/jugador/${player.id}?view=partidos&tab=stats`}
                      className="flex items-center gap-3 hover:bg-slate-50/80 p-1 -m-1 rounded-lg transition-colors group cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-black text-blue-700 shrink-0">
                        {player.avatar}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                          {player.name}
                        </p>
                        <p className="text-[9px] text-slate-400 font-semibold">
                          {player.position}
                        </p>
                      </div>
                    </Link>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <div className="flex items-center justify-center">
                      {player.status === 'Presente' ? (
                        <span className="inline-block px-2 py-0.5 text-[10px] font-black bg-emerald-100 text-emerald-700 rounded-md">Asiste</span>
                      ) : player.status === 'Ausente' ? (
                        <span className="inline-block px-2 py-0.5 text-[10px] font-black bg-red-100 text-red-700 rounded-md">No Asiste</span>
                      ) : player.status === 'Justificado' ? (
                        <span className="inline-block px-2 py-0.5 text-[10px] font-black bg-amber-100 text-amber-700 rounded-md">Justificado</span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 text-[10px] font-black bg-slate-100 text-slate-500 rounded-md">-</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="inline-block px-1.5 py-0.5 text-xs font-black bg-blue-50 text-blue-700 rounded-md">
                      {player.coachRating.toFixed(1)}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="inline-block px-1.5 py-0.5 text-xs font-black bg-purple-50 text-purple-700 rounded-md">
                      {player.actitud.toFixed(1)}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center text-xs font-bold text-slate-600">
                    {player.minutes > 0 ? `${player.minutes}'` : "0"}
                  </td>
                  <td className="py-3 px-3 text-center text-xs font-black text-emerald-600">
                    {player.goals || "0"}
                  </td>
                  <td className="py-3 px-3 text-center text-xs font-bold text-slate-600">
                    {player.assists || "0"}
                  </td>
                  <td className="py-3 px-3 text-center text-xs font-bold text-amber-500">
                    {player.yellowCards || "0"}
                  </td>
                  <td className="py-3 px-3 text-center text-xs font-bold text-red-500">
                    {player.redCards || "0"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
