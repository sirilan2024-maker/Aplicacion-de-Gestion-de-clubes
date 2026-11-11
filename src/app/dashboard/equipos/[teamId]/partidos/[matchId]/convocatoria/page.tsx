"use client"

import { useEffect, useState, use } from "react"
import { createClient } from "@/lib/supabase/client"
import { Users, AlertTriangle, ShieldAlert, CheckCircle2, User, ChevronLeft } from "lucide-react"
import Link from "next/link"
import { PlayerAvatar } from "@/components/features/matches/match-details/PlayerAvatar"

export default function MatchConvocatoriaPage({ params }: { params: Promise<{ teamId: string, matchId: string }> }) {
  const { teamId, matchId } = use(params);
  const [players, setPlayers] = useState<any[]>([])
  const [convocados, setConvocados] = useState<Set<string>>(new Set())
  const [convDetails, setConvDetails] = useState<Map<string, { estado_asistencia?: string; asistencia_confirmada_familia?: boolean }>>(new Map())
  const [matchDetails, setMatchDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      // 1. Fetch match details
      const { data: matchData } = await supabase
        .from("partidos")
        .select("*")
        .eq("id", matchId)
        .single()

      if (matchData) setMatchDetails(matchData)


      // 2. Fetch current convocados first with attendance details
      const { data: convData } = await supabase
        .from("convocatorias")
        .select("player_id, estado_asistencia, asistencia_confirmada_familia")
        .eq("partido_id", matchId)

      const convPlayerIds = (convData || []).map(c => c.player_id)
      if (convData) {
        const map = new Map<string, { estado_asistencia?: string; asistencia_confirmada_familia?: boolean }>()
        convData.forEach(c => map.set(c.player_id, c))
        setConvDetails(map)
        setConvocados(new Set(convPlayerIds))
      }

      // 3. Fetch all team players AND valid call-ups strictly in active season
      let query = supabase
        .from("players")
        .select("id, first_name, last_name, dorsal, avatar_url, posicion, posicion_principal, status, medical_notes, team_id, teams:teams!inner(name, category, season_id)")
        .neq('status', 'inactive')
        .neq('teams.season_id', '584f508a-fc1a-4339-b5b2-4296ffde2f4c')
        .order("first_name")

      if (convPlayerIds.length > 0) {
        query = query.or(`team_id.eq.${teamId},id.in.(${convPlayerIds.join(',')})`)
      } else {
        query = query.eq('team_id', teamId)
      }

      const { data: playersData } = await query
      if (playersData) setPlayers(playersData)

      setLoading(false)
    }
    fetchData()
  }, [teamId, matchId])

  const toggleConvocatoria = async (playerId: string, currentStatus: string) => {
    if (currentStatus === 'Lesionado' || currentStatus === 'Sancionado') {
      alert(`No puedes convocar a un jugador que está ${currentStatus}.`)
      return
    }

    const isConvocado = convocados.has(playerId)
    const newConvocados = new Set(convocados)

    if (isConvocado) {
      // Remover
      newConvocados.delete(playerId)
      setConvocados(newConvocados)
      await supabase.from("convocatorias").delete().match({ partido_id: matchId, player_id: playerId })
    } else {
      // Añadir
      newConvocados.add(playerId)
      setConvocados(newConvocados)
      await supabase.from("convocatorias").insert({
        partido_id: matchId,
        player_id: playerId,
        titular: false
      })
    }
  }

  if (loading) return <div className="p-8 text-center text-slate-500">Cargando convocatoria...</div>

  return (
    <div className="w-full max-w-5xl mx-auto p-6 space-y-6">
      <Link href={`/dashboard/equipos/${teamId}/partidos`} className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors mb-4">
        <ChevronLeft size={16} /> Volver a Partidos
      </Link>

      <div className="bg-white p-5 sm:p-6 rounded-xl shadow-sm border border-slate-150 flex justify-between items-center gap-4">
        <div>
          <p className="text-emerald-600 text-[10px] font-black uppercase tracking-wider mb-1">Pre-Partido: Convocatoria</p>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">{matchDetails?.rival_nombre || 'Partido'}</h1>
          <p className="text-slate-500 mt-1 text-xs font-medium">{matchDetails?.lugar} • {matchDetails ? new Date(matchDetails.fecha_hora).toLocaleString() : ''}</p>
        </div>
        <div className="text-right bg-emerald-50 border border-emerald-100 px-4 py-2.5 rounded-xl shrink-0">
          <div className="text-3xl font-black text-emerald-600 leading-none">{convocados.size}</div>
          <div className="text-emerald-700 text-[10px] font-black uppercase tracking-wider mt-1">Convocados</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-150 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Users size={16} className="text-slate-400" /> Plantilla Disponible
          </h3>
          <span className="text-[10px] font-bold text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-2xs">
            Total Plantilla: {players.length}
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {players.map(p => {
            const isConvocado = convocados.has(p.id)
            const isLesionado = p.status === 'Lesionado'
            const isSancionado = p.status === 'Sancionado'
            const isAvailable = !isLesionado && !isSancionado
            const convItem = convDetails.get(p.id)
            const isConfirmed = convItem?.estado_asistencia === 'Confirmado' || convItem?.asistencia_confirmada_familia === true
            const isAbsent = convItem?.estado_asistencia === 'Ausente'

            return (
              <div
                key={p.id}
                className={`p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between transition-colors gap-3 sm:gap-4 ${!isAvailable ? 'bg-red-50/30' : isConvocado ? 'bg-emerald-50/20 hover:bg-emerald-50/40' : 'hover:bg-slate-50'}`}
              >
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <PlayerAvatar player={p} dorsal={p.dorsal} size="md" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className={`font-bold text-sm truncate uppercase ${!isAvailable ? 'text-gray-500' : 'text-slate-900'}`}>
                        {p.first_name} {p.last_name}
                      </h4>
                      {(p.teams?.category?.toLowerCase().includes('juvenil') || p.team_id !== teamId) && (
                        <span className="px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200 shrink-0">
                          {p.teams?.name || 'Juvenil'}
                        </span>
                      )}
                    </div>
                    {isLesionado && (
                      <p className="text-red-500 text-xs font-bold flex items-center gap-1 mt-0.5">
                        <AlertTriangle size={12} /> LESIONADO {p.medical_notes && `(${p.medical_notes})`}
                      </p>
                    )}
                    {isSancionado && (
                      <p className="text-orange-500 text-xs font-bold flex items-center gap-1 mt-0.5">
                        <ShieldAlert size={12} /> SANCIONADO
                      </p>
                    )}
                    {isAvailable && (
                      <p className="text-slate-400 text-[11px] font-semibold mt-0.5">{p.posicion || p.posicion_principal || 'Disponible'}</p>
                    )}
                    {isConvocado && (
                      <div className="mt-1">
                        {isConfirmed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-700">
                            <CheckCircle2 size={12} className="text-emerald-600" /> Confirmado por familia
                          </span>
                        ) : isAbsent ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-red-100 text-red-700">
                            No asiste (Baja)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-700">
                            Pendiente confirmación
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => toggleConvocatoria(p.id, p.status)}
                  disabled={!isAvailable}
                  className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all duration-200 w-full sm:w-auto shrink-0
                    ${isConvocado
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                      : !isAvailable
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-2xs'
                    }`}
                >
                  {isConvocado ? <><CheckCircle2 size={15} /> Convocado</> : <><User size={15} /> Convocar</>}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
