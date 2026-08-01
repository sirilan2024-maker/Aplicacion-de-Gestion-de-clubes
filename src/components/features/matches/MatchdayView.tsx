"use client"

import React, { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { MatchdayCard } from "./MatchdayCard"
import { LiveMatchPanel } from "./LiveMatchPanel"
import { getPublicMatches } from "@/app/actions/match-actions"
import { CalendarDays, X, ChevronLeft, ChevronRight, Settings } from "lucide-react"
import { LiveAdManager } from "@/components/features/admin/LiveAdManager"

interface MatchdayViewProps {
  initialMatches: any[];
  teams: any[];
  ad?: any;
  isAdmin?: boolean;
}

export function MatchdayView({ initialMatches, teams, ad, isAdmin }: MatchdayViewProps) {
  const supabase = createClient()
  const [matches, setMatches] = useState<any[]>(initialMatches)
  const [selectedLiveMatchId, setSelectedLiveMatchId] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [showAdManager, setShowAdManager] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Compute the ±72h window matches + highlighted matches
  const jornada = React.useMemo(() => {
    const now = Date.now()
    const h72 = 72 * 60 * 60 * 1000 // 72 hours in ms
    const windowStart = now - h72
    const windowEnd = now + h72

    const inWindow = matches.filter(m => {
      if (m.estado !== 'Finalizado' && (m.live_timer_started_at !== null || m.live_timer_elapsed_seconds > 0)) return true;
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

  // Subscribe to realtime updates and fallback to polling
  useEffect(() => {
    let mounted = true;
    
    // Polling fallback
    const intervalId = setInterval(async () => {
      const liveData = await getPublicMatches();
      if (mounted && liveData.length > 0) {
        setMatches(prev => {
          let hasChanges = false;
          const next = [...prev];
          for (const liveMatch of liveData) {
            const idx = next.findIndex(m => m.id === liveMatch.id);
            if (idx >= 0) {
              const current = next[idx];
              if (current.estado !== liveMatch.estado || 
                  current.live_timer_started_at !== liveMatch.live_timer_started_at ||
                  current.live_timer_elapsed_seconds !== liveMatch.live_timer_elapsed_seconds) {
                next[idx] = { ...current, ...liveMatch };
                hasChanges = true;
              }
            }
          }
          return hasChanges ? next : prev;
        });
      }
    }, 5000);

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

    return () => { 
      mounted = false;
      clearInterval(intervalId);
      supabase.removeChannel(channel) 
    }
  }, [teams, supabase])

  // Deselect if the match finishes or is no longer in live array
  useEffect(() => {
    if (selectedLiveMatchId) {
      const isStillLive = matches.find(m => m.id === selectedLiveMatchId && m.estado !== 'Finalizado' && (m.live_timer_started_at !== null || m.live_timer_elapsed_seconds > 0));
      if (!isStillLive) setSelectedLiveMatchId(null);
    }
  }, [matches, selectedLiveMatchId])

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

  // Separate live
  const live = jornada.filter(m => m.estado !== 'Finalizado' && (m.live_timer_started_at !== null || m.live_timer_elapsed_seconds > 0))
  const selectedMatch = selectedLiveMatchId ? live.find(m => m.id === selectedLiveMatchId) : null;

  // Group by date
  const groupedByDate: Record<string, any[]> = {};
  if (isMounted) {
    jornada.forEach(m => {
      const dateStr = new Date(m.fecha_hora).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
      if (!groupedByDate[dateStr]) groupedByDate[dateStr] = [];
      groupedByDate[dateStr].push(m);
    });
  }

  if (!isMounted) return <div className="animate-in fade-in py-20 text-center text-slate-400">Cargando partidos...</div>;

  return (
    <div className="animate-in fade-in">
      {/* Selector Cabecera Jornada */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200">
        <button className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="px-6 py-2 rounded-full border border-slate-200 font-semibold text-slate-800 text-sm shadow-sm cursor-pointer hover:bg-slate-50 flex items-center gap-2">
          Partidos fin de semana
        </div>
        <button className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* EN DIRECTO */}
      {selectedMatch && (
        <section className="mb-8 bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden p-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <h2 className="text-sm font-bold uppercase tracking-widest text-red-600">Minuto a Minuto</h2>
          </div>
          <div className="flex flex-col lg:flex-row gap-5">
            <div className="flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 w-full lg:w-48 hide-scrollbar">
              {live.map(match => {
                const isSelected = match.id === selectedLiveMatchId;
                const ourScore = match.resultado_propio ?? 0;
                const theirScore = match.resultado_rival ?? 0;
                return (
                  <div 
                    key={match.id}
                    onClick={() => setSelectedLiveMatchId(match.id)}
                    className={`shrink-0 snap-start px-4 py-2 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${isSelected ? 'border-red-500 bg-red-50 ring-2 ring-red-200' : 'border-slate-200 bg-white hover:border-red-300'}`}
                  >
                    <div className="flex flex-col text-xs font-bold w-16 truncate">
                      <span className="truncate">{match.equipo?.category || 'SPO'}</span>
                      <span className="truncate text-slate-500 font-medium">{match.rival_nombre?.split(' ')[0] || 'RIV'}</span>
                    </div>
                    <div className="flex flex-col text-sm font-black text-slate-800 text-center bg-slate-100 rounded px-2">
                      <span>{ourScore}</span>
                      <span>{theirScore}</span>
                    </div>
                  </div>
                )
              })}
              <button 
                onClick={() => setSelectedLiveMatchId(null)}
                className="shrink-0 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 flex items-center justify-center cursor-pointer transition-all"
                title="Cerrar vista detallada"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="w-full">
              <LiveMatchPanel match={selectedMatch} />
            </div>
          </div>
        </section>
      )}

      {/* Partidos por día */}
      <div className="space-y-12 mb-12">
        {Object.entries(groupedByDate).map(([date, dayMatches]) => (
          <div key={date}>
            {/* Header del día */}
            <div className="flex items-end justify-between border-b border-slate-300 pb-2 mb-4 relative">
              <h2 className="text-sm font-black text-slate-800 tracking-wide">{date}</h2>
              {ad && ad.isActive && (
                <div className="absolute right-0 -bottom-2 md:bottom-0 bg-white pl-4 flex items-center gap-2">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold hidden md:inline">Gestionado por</span>
                  {ad.url ? (
                    <a href={ad.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                      {ad.imageUrl ? (
                        <img src={ad.imageUrl} alt={ad.text} className="h-6 object-contain" />
                      ) : (
                        <span className="bg-emerald-700 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-sm">{ad.text}</span>
                      )}
                    </a>
                  ) : (
                    <span className="shrink-0">
                      {ad.imageUrl ? (
                        <img src={ad.imageUrl} alt={ad.text} className="h-6 object-contain" />
                      ) : (
                        <span className="bg-emerald-700 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-sm">{ad.text}</span>
                      )}
                    </span>
                  )}
                  <span className="text-[8px] text-slate-300 font-bold ml-1 hidden md:inline">AD</span>
                </div>
              )}
            </div>

            {/* Grid de Partidos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0">
              {dayMatches.map(match => {
                const isLiveNow = match.estado !== 'Finalizado' && (match.live_timer_started_at !== null || match.live_timer_elapsed_seconds > 0);
                return (
                  <MatchdayCard 
                    key={match.id} 
                    match={match} 
                    onClick={isLiveNow ? (id) => setSelectedLiveMatchId(id) : undefined} 
                  />
                );
              })}
            </div>
            
            {ad && ad.isActive && (
              <div className="mt-2 text-right">
                <p className="text-[8px] text-slate-400">+18. Juega de forma responsable.</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {isAdmin && (
        <div className="mt-12 border-t-2 border-dashed border-indigo-200 pt-8 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black text-indigo-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-500" />
              Gestión de Publicidad (Solo Admins)
            </h3>
            <button 
              onClick={() => setShowAdManager(!showAdManager)}
              className="text-sm font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-colors"
            >
              {showAdManager ? 'Ocultar Panel' : 'Editar Publicidad'}
            </button>
          </div>
          
          {showAdManager && (
            <LiveAdManager initialAd={ad} />
          )}
        </div>
      )}
    </div>
  )
}
