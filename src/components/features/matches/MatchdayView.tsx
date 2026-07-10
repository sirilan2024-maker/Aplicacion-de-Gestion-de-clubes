"use client"

import React, { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { MatchdayCard } from "./MatchdayCard"
import { CalendarDays } from "lucide-react"

interface MatchdayViewProps {
  initialMatches: any[];
  teams: any[];
}

export function MatchdayView({ initialMatches, teams }: MatchdayViewProps) {
  const supabase = createClient()
  const [matches, setMatches] = useState<any[]>(initialMatches)

  // Compute the ±72h window matches + highlighted matches
  const jornada = React.useMemo(() => {
    const now = Date.now()
    const h72 = 72 * 60 * 60 * 1000 // 72 hours in ms
    const windowStart = now - h72
    const windowEnd = now + h72

    const inWindow = matches.filter(m => {
      const t = new Date(m.fecha_hora).getTime()
      return t >= windowStart && t <= windowEnd
    })

    // Add admin-highlighted matches that are not already in window
    const inWindowIds = new Set(inWindow.map(m => m.id))
    const highlighted = matches.filter(m => m.highlight_jornada && !inWindowIds.has(m.id))

    const combined = [...inWindow, ...highlighted]

    // Sort by date ascending (upcoming first, then finished)
    return combined.sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime())
  }, [matches])

  // Subscribe to realtime updates on partidos
  useEffect(() => {
    const channel = supabase
      .channel('matchday-partidos')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'partidos' },
        (payload) => {
          const updated = payload.new as any
          if (!updated) return

          setMatches(prev => {
            const exists = prev.find(m => m.id === updated.id)
            if (exists) {
              return prev.map(m => m.id === updated.id ? { ...m, ...updated } : m)
            } else {
              const equipo = teams.find(t => t.id === updated.equipo_id)
              return [...prev, { ...updated, equipo }]
            }
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [teams, supabase])

  if (jornada.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white rounded-2xl border border-dashed border-slate-200 animate-in fade-in">
        <div className="bg-slate-100 p-5 rounded-full mb-4">
          <CalendarDays className="w-10 h-10 text-slate-400" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">Sin partidos esta jornada</h3>
        <p className="text-slate-500 max-w-sm text-sm leading-relaxed">
          No hay partidos programados en las próximas o últimas 72 horas. Revisa el calendario para ver la agenda completa.
        </p>
      </div>
    )
  }

  // Separate live, upcoming and finished for visual grouping
  const live = jornada.filter(m => m.estado === 'En Curso')
  const upcoming = jornada.filter(m => m.estado === 'Programado')
  const finished = jornada.filter(m => m.estado === 'Finalizado')

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* EN DIRECTO */}
      {live.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <h2 className="text-sm font-bold uppercase tracking-widest text-red-600">En Directo</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {live.map(match => (
              <MatchdayCard key={match.id} match={match} />
            ))}
          </div>
        </section>
      )}

      {/* PRÓXIMOS */}
      {upcoming.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-3 w-3 rounded-full bg-blue-500"></div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-blue-600">
              {live.length > 0 ? 'Próximos' : 'Partidos de la Jornada'}
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {upcoming.map(match => (
              <MatchdayCard key={match.id} match={match} />
            ))}
          </div>
        </section>
      )}

      {/* FINALIZADOS */}
      {finished.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-3 w-3 rounded-full bg-slate-400"></div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">Finalizados</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {finished.map(match => (
              <MatchdayCard key={match.id} match={match} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
