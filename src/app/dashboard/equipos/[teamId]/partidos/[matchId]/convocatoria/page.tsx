"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Users, AlertTriangle, ShieldAlert, CheckCircle2, User, ChevronLeft } from "lucide-react"
import Link from "next/link"

export default function MatchConvocatoriaPage({ params }: { params: { teamId: string, matchId: string } }) {
  const [players, setPlayers] = useState<any[]>([])
  const [convocados, setConvocados] = useState<Set<string>>(new Set())
  const [matchDetails, setMatchDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      // 1. Fetch match details
      const { data: matchData } = await supabase
        .from("partidos")
        .select("*")
        .eq("id", params.matchId)
        .single()
      
      if (matchData) setMatchDetails(matchData)

      // 2. Fetch all team players
      const { data: playersData } = await supabase
        .from("players")
        .select("id, first_name, last_name, dorsal, status, medical_notes")
        .eq("team_id", params.teamId)
        .order("first_name")
      
      if (playersData) setPlayers(playersData)

      // 3. Fetch current convocados
      const { data: convData } = await supabase
        .from("convocatorias")
        .select("player_id")
        .eq("partido_id", params.matchId)

      if (convData) {
        setConvocados(new Set(convData.map(c => c.player_id)))
      }

      setLoading(false)
    }
    fetchData()
  }, [params.teamId, params.matchId])

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
      await supabase.from("convocatorias").delete().match({ partido_id: params.matchId, player_id: playerId })
    } else {
      // Añadir
      newConvocados.add(playerId)
      setConvocados(newConvocados)
      await supabase.from("convocatorias").insert({
        partido_id: params.matchId,
        player_id: playerId,
        titular: false
      })
    }
  }

  if (loading) return <div className="p-8 text-center text-slate-500">Cargando convocatoria...</div>

  return (
    <div className="w-full max-w-5xl mx-auto p-6 space-y-6">
      <Link href={`/dashboard/equipos/${params.teamId}/partidos`} className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors mb-4">
        <ChevronLeft size={16} /> Volver a Partidos
      </Link>

      <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg border border-slate-800 flex justify-between items-center">
        <div>
          <p className="text-blue-400 text-sm font-bold uppercase tracking-wider mb-1">Pre-Partido: Convocatoria</p>
          <h1 className="text-3xl font-black">{matchDetails?.rival_nombre || 'Partido'}</h1>
          <p className="text-slate-400 mt-2 text-sm">{matchDetails?.lugar} • {matchDetails ? new Date(matchDetails.fecha_hora).toLocaleString() : ''}</p>
        </div>
        <div className="text-right">
          <div className="text-5xl font-black text-blue-500">{convocados.size}</div>
          <div className="text-slate-400 text-sm font-medium uppercase mt-1">Convocados</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-slate-50 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 flex items-center gap-2"><Users size={18} className="text-slate-400"/> Plantilla Disponible</h3>
          <span className="text-xs font-semibold text-slate-500 bg-white px-3 py-1 rounded-full border shadow-sm">
            Total Plantilla: {players.length}
          </span>
        </div>
        
        <div className="divide-y divide-gray-100">
          {players.map(p => {
            const isConvocado = convocados.has(p.id)
            const isLesionado = p.status === 'Lesionado'
            const isSancionado = p.status === 'Sancionado'
            const isAvailable = !isLesionado && !isSancionado

            return (
              <div 
                key={p.id} 
                className={`p-4 flex items-center justify-between transition-colors ${!isAvailable ? 'bg-red-50/30' : 'hover:bg-slate-50'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm border-2 
                    ${isConvocado ? 'bg-blue-600 text-white border-blue-700' : 
                      !isAvailable ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-white text-slate-600 border-gray-200'}`}>
                    {p.dorsal || '-'}
                  </div>
                  <div>
                    <h4 className={`font-bold text-base ${!isAvailable ? 'text-gray-500' : 'text-slate-900'}`}>
                      {p.first_name} {p.last_name}
                    </h4>
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
                      <p className="text-slate-400 text-xs font-medium mt-0.5">Disponible</p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => toggleConvocatoria(p.id, p.status)}
                  disabled={!isAvailable}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all duration-200
                    ${isConvocado 
                      ? 'bg-green-100 text-green-700 border border-green-200 hover:bg-green-200 hover:text-green-800' 
                      : !isAvailable 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60' 
                        : 'bg-white border border-gray-300 text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 shadow-sm'
                    }`}
                >
                  {isConvocado ? <><CheckCircle2 size={16} /> Convocado</> : <><User size={16} /> Convocar</>}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
