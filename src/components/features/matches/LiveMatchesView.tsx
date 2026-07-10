"use client"

import React, { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { LiveMatchCard } from "./LiveMatchCard"
import { Calendar } from "lucide-react"

interface LiveMatchesViewProps {
  initialMatches: any[];
  teams: any[];
}

export function LiveMatchesView({ initialMatches, teams }: LiveMatchesViewProps) {
  const [liveMatches, setLiveMatches] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    // Filtrar los que estaban "En Curso" inicialmente, o dejar que el backend los envíe.
    // Para simplificar, confiamos en la DB y el initialMatches, pero actualizamos localmente.
    const active = initialMatches.filter(m => m.estado === 'En Curso')
    setLiveMatches(active)

    const channel = supabase
      .channel('public:partidos:live')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'partidos'
        },
        (payload) => {
          const updatedMatch = payload.new as any
          if (updatedMatch.estado === 'En Curso') {
            setLiveMatches(prev => {
              const exists = prev.find(m => m.id === updatedMatch.id)
              if (exists) {
                return prev.map(m => m.id === updatedMatch.id ? { ...m, ...updatedMatch } : m)
              } else {
                // Hay que buscar el equipo original de 'teams' para mantener la estructura
                const equipo = teams.find(t => t.id === updatedMatch.equipo_id)
                return [...prev, { ...updatedMatch, equipo }]
              }
            })
          } else {
            // Si ya no está en curso, lo quitamos
            setLiveMatches(prev => prev.filter(m => m.id !== updatedMatch.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [initialMatches, teams, supabase])

  if (liveMatches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white rounded-2xl border border-slate-200 border-dashed animate-in fade-in">
        <div className="bg-slate-100 p-4 rounded-full mb-4">
          <Calendar className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">No hay partidos en directo</h3>
        <p className="text-slate-500 max-w-md">
          En este momento no hay ningún partido marcando como "En Curso". Revisa la agenda del día para ver los próximos encuentros.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in">
      {liveMatches.map(match => (
        <LiveMatchCard key={match.id} match={match} />
      ))}
    </div>
  )
}
