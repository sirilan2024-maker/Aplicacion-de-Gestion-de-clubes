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
  ads?: any[];
  isAdmin?: boolean;
}

export function MatchdayView({ initialMatches, teams, ads, isAdmin }: MatchdayViewProps) {
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
        <section className="mb-8 bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden p-4 md:p-6 relative animate-in fade-in slide-in-from-top-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 border-b border-slate-100 pb-4 gap-4">
            <div className="flex items-center gap-2 shrink-0">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              <h2 className="text-sm font-bold uppercase tracking-widest text-red-600">Minuto a Minuto</h2>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {live.length > 1 && live.map(match => {
                const teamName = match.equipo?.name || 'SPO';
                const cleanName = teamName.replace(/Sporting Saladar\s*/i, '').trim() || teamName;
                const rivalName = match.rival_nombre?.split(' ')[0] || 'RIV';
                return (
                  <button
                    key={match.id}
                    onClick={() => setSelectedLiveMatchId(match.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${match.id === selectedLiveMatchId ? 'bg-red-500 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    {cleanName} vs {rivalName}
                  </button>
                )
              })}
              <button 
                onClick={() => setSelectedLiveMatchId(null)}
                className="ml-auto px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-all flex items-center gap-1"
                title="Cerrar vista detallada"
              >
                <X className="w-4 h-4" /> Cerrar
              </button>
            </div>
          </div>
          
          <div className="w-full">
            <LiveMatchPanel match={selectedMatch} />
          </div>
        </section>
      )}

      {/* Partidos por día */}
      <div className="space-y-8 mb-12">
        {(() => {
          let globalMatchCount = 0;
          return Object.keys(groupedByDate).map((date, dateIdx) => {
            const dayMatches = groupedByDate[date];
            return (
              <div key={date}>
                {/* Header del día */}
                <div className="flex items-end justify-between border-b border-slate-300 pb-2 mb-0 relative">
                  <h2 className="text-sm font-black text-slate-800 tracking-wide">{date}</h2>
                </div>

                {/* Lista de Partidos (1 columna) */}
                <div className="flex flex-col">
                  {dayMatches.map((match, idx) => {
                    const isLiveNow = match.estado !== 'Finalizado' && (match.live_timer_started_at !== null || match.live_timer_elapsed_seconds > 0);
                    
                    const slotAd = (ads && ads.length > 0) ? ads[globalMatchCount % ads.length] : null;
                    globalMatchCount++;

                    return (
                      <div key={match.id}>
                        <MatchdayCard 
                          match={match} 
                          onClick={isLiveNow ? (id) => setSelectedLiveMatchId(id) : undefined} 
                        />
                        
                        {/* Banner de Publicidad intercalado */}
                        {slotAd && slotAd.isActive && (
                          <div className="w-full border-b border-slate-200 bg-slate-50 hover:bg-white transition-colors group relative overflow-hidden">
                            <a href={slotAd.url || '#'} target="_blank" rel="noopener noreferrer" className={`block w-full flex flex-col items-center justify-center relative ${slotAd.textLayout === 'below' ? '' : 'h-32 md:h-40'}`}>
                              <span className="absolute top-2 right-2 text-[8px] uppercase font-bold text-slate-300 tracking-widest z-10 group-hover:text-slate-400">Publicidad</span>
                              
                              <div className={`w-full flex items-center justify-center relative ${slotAd.textLayout === 'below' ? 'h-32 md:h-40 p-4' : 'h-full p-4'}`}>
                                {slotAd.imageUrl ? (
                                  <img src={slotAd.imageUrl} alt={slotAd.text} className="w-full h-full object-contain z-0" />
                                ) : (
                                  <span className="text-xl font-black text-slate-300 tracking-widest uppercase">{slotAd.text}</span>
                                )}
                                
                                {slotAd.textLayout !== 'below' && (slotAd.text || slotAd.description) && (
                                  <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end z-0">
                                    {slotAd.text && <span className="text-white font-bold text-sm md:text-base drop-shadow-md">{slotAd.text}</span>}
                                    {slotAd.description && <span className="text-white/90 text-xs md:text-sm drop-shadow-md mt-1">{slotAd.description}</span>}
                                  </div>
                                )}
                              </div>

                              {slotAd.textLayout === 'below' && (slotAd.text || slotAd.description) && (
                                <div className="w-full bg-white p-4 border-t border-slate-100 flex flex-col justify-center text-center">
                                  {slotAd.text && <span className="text-slate-900 font-bold text-sm md:text-base">{slotAd.text}</span>}
                                  {slotAd.description && <span className="text-slate-500 text-xs md:text-sm mt-1">{slotAd.description}</span>}
                                </div>
                              )}

                              {slotAd.text.toLowerCase().includes('bet') && (
                                <span className="absolute top-2 left-2 text-[8px] text-slate-400 bg-white/80 px-1 rounded z-10">+18. Juega con responsabilidad.</span>
                              )}
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          });
        })()}
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
            <LiveAdManager initialAds={ads || []} />
          )}
        </div>
      )}
    </div>
  )
}
