"use client"

import React, { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { MatchdayCard } from "./MatchdayCard"
import { LiveMatchPanel } from "./LiveMatchPanel"
import { getPublicMatches, deleteMatchAction } from "@/app/actions/match-actions"
import { CalendarDays, X, ChevronLeft, ChevronRight, Settings, Trash2 } from "lucide-react"
import { LiveAdManager } from "@/components/features/admin/LiveAdManager"
import toast from "react-hot-toast"

interface MatchdayViewProps {
  initialMatches: any[];
  teams: any[];
  ads?: any[];
  isAdmin?: boolean;
  clubLogoUrl?: string | null;
  players?: any[];
  convocatorias?: any[];
  teamId?: any;
}

export function MatchdayView({ initialMatches, teams, ads, isAdmin, clubLogoUrl }: MatchdayViewProps) {
  const supabase = createClient()
  const [matches, setMatches] = useState<any[]>(initialMatches)
  const matchesRef = React.useRef(matches)
  
  useEffect(() => {
    matchesRef.current = matches
  }, [matches])

  const [selectedLiveMatchId, setSelectedLiveMatchId] = useState<string | null>(null)
  const [isClosedByUser, setIsClosedByUser] = useState<boolean>(false)
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
      if (m.estado !== 'Finalizado' && (m.estado === 'Descanso' || m.estado === 'En Curso' || m.live_timer_started_at !== null || m.live_timer_elapsed_seconds > 0)) return true;
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
                  current.live_timer_elapsed_seconds !== liveMatch.live_timer_elapsed_seconds ||
                  current.resultado_propio !== liveMatch.resultado_propio ||
                  current.resultado_rival !== liveMatch.resultado_rival ||
                  current.first_half_duration_seconds !== liveMatch.first_half_duration_seconds) {
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
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'match_events' },
        async (payload) => {
          const newEvent = payload.new as any;
          if (!newEvent || !newEvent.partido_id) return;
          
          const match = matchesRef.current.find(m => m.id === newEvent.partido_id);
          if (match) {
            const teamName = match.equipo?.name || 'Local';
            const cleanName = teamName.replace(/Sporting Saladar\s*/i, '').trim() || teamName;
            
            let playerName = '';
            if (newEvent.player_id) {
              const { data: player } = await supabase.from('players').select('first_name, last_name, nickname').eq('id', newEvent.player_id).single();
              if (player) {
                playerName = player.nickname || player.first_name || '';
              }
            }

            const isSportingAction = !!newEvent.player_id;
            const actionSuffix = isSportingAction ? (playerName ? `de ${playerName} (${cleanName})` : `de ${cleanName}`) : `del Rival`;

            let message = '';
            let icon = '⏱️';
            const evt = newEvent.tipo_evento;
            
            if (evt === 'Gol') {
              message = `¡GOL ${actionSuffix}! ${cleanName} vs ${match.rival_nombre}`;
              icon = '⚽';
            } else if (evt === 'Gol en propia puerta' || evt === 'Gol en Propia') {
              message = `¡Gol en propia ${actionSuffix}! ${cleanName} vs ${match.rival_nombre}`;
              icon = '🤦‍♂️';
            } else if (evt === 'Tarjeta Amarilla') {
              message = `Tarjeta amarilla ${actionSuffix} en ${cleanName} vs ${match.rival_nombre}`;
              icon = '🟨';
            } else if (evt === 'Tarjeta Roja') {
              message = `Tarjeta roja ${actionSuffix} en ${cleanName} vs ${match.rival_nombre}`;
              icon = '🟥';
            } else if (evt === 'Descanso') {
              message = `Descanso: ${cleanName} vs ${match.rival_nombre}`;
              icon = '⏸️';
            } else if (evt === 'Fin del Partido') {
              message = `Final: ${cleanName} vs ${match.rival_nombre}`;
              icon = '🏁';
            } else if (evt === 'Cambio' || evt === 'Cambio Entra' || evt === 'Cambio Sale') {
              message = `Cambio ${actionSuffix} en ${cleanName} vs ${match.rival_nombre}`;
              icon = '🔄';
            } else if (evt === 'Lesión') {
              message = `Lesión ${actionSuffix} en ${cleanName} vs ${match.rival_nombre}`;
              icon = '🚑';
            } else if (evt === 'Penalti' || evt === 'Penalty') {
              if (isSportingAction) {
                message = `¡Penalti en contra de ${cleanName}! Falta ${actionSuffix}`;
              } else {
                message = `¡Penalti a favor de ${cleanName}! Falta ${actionSuffix}`;
              }
              icon = '🎯';
            } else if (evt === 'Ocasión Peligrosa' || evt === 'Ocasión') {
              const descText = newEvent.notas ? `${newEvent.notas}` : `¡Ocasión peligrosa ${actionSuffix}!`;
              message = `${descText} (${cleanName} vs ${match.rival_nombre})`;
              icon = '⚠️';
            } else if (evt === 'Palo / Larguero' || evt === 'Palo' || evt === 'Larguero' || evt === 'Tiro al larguero' || evt === 'Tiro al palo') {
              message = `¡Tiro al palo ${actionSuffix}! ${cleanName} vs ${match.rival_nombre}`;
              icon = '🥅';
            } else if (evt === 'Parada') {
              message = `¡Parada ${actionSuffix}! ${cleanName} vs ${match.rival_nombre}`;
              icon = '🧤';
            } else if (evt === 'Comentario del Entrenador' || evt === 'Comentario') {
              message = newEvent.notas ? `${newEvent.notas} (${cleanName})` : `Comentario del partido (${cleanName})`;
              icon = '💬';
            } else {
              message = newEvent.notas ? `${newEvent.notas} (${cleanName})` : `${evt} ${actionSuffix}: ${cleanName} vs ${match.rival_nombre}`;
              icon = '🔔';
            }

            if (message) {
              toast(message, {
                icon,
                position: 'top-center',
                duration: 5000,
                style: {
                  borderRadius: '10px',
                  background: '#1e293b',
                  color: '#fff',
                  fontWeight: 'bold',
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)'
                }
              });
            }
          }
        }
      )
      .subscribe()

    return () => { 
      mounted = false;
      clearInterval(intervalId);
      supabase.removeChannel(channel) 
    }
  }, [teams, supabase])

  // Deselect only if selected match no longer exists in matches
  useEffect(() => {
    if (selectedLiveMatchId) {
      const exists = matches.some(m => m.id === selectedLiveMatchId);
      if (!exists) setSelectedLiveMatchId(null);
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
  const live = jornada.filter(m => m.estado !== 'Finalizado' && (m.estado === 'Descanso' || m.estado === 'En Curso' || m.live_timer_started_at !== null || m.live_timer_elapsed_seconds > 0))
  const selectedMatch = isClosedByUser 
    ? (selectedLiveMatchId ? matches.find(m => m.id === selectedLiveMatchId) : null)
    : ((selectedLiveMatchId ? matches.find(m => m.id === selectedLiveMatchId) : null) || (live.length > 0 ? live[0] : null));

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
          Partidos de la jornada
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
                const rivalName = match.rival_nombre || 'Rival';
                const isPlaying = match.live_timer_started_at !== null;
                const isSelected = match.id === selectedLiveMatchId;
                
                return (
                  <button
                    key={match.id}
                    onClick={() => setSelectedLiveMatchId(match.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all flex items-center gap-1.5 ${isSelected ? 'bg-red-500 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    {isPlaying ? (
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isSelected ? 'bg-white' : 'bg-red-400'}`}></span>
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${isSelected ? 'bg-white' : 'bg-red-500'}`}></span>
                      </span>
                    ) : (
                      <span className={`h-2 w-2 rounded-full shrink-0 ${isSelected ? 'bg-white/50' : 'bg-slate-300'}`} title="Pausado / Descanso"></span>
                    )}
                    <span className="shrink-0">{cleanName} vs</span>
                    <span>{rivalName}</span>
                  </button>
                )
              })}
              <button 
                onClick={() => {
                  setSelectedLiveMatchId(null);
                  setIsClosedByUser(true);
                }}
                className="ml-auto px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-all flex items-center gap-1"
                title="Cerrar vista detallada"
              >
                <X className="w-4 h-4" /> Cerrar
              </button>
            </div>
          </div>
          
          <div className="w-full">
            <LiveMatchPanel match={selectedMatch} clubLogoUrl={clubLogoUrl || undefined} />
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
                    const isLiveNow = match.estado !== 'Finalizado' && (match.estado === 'Descanso' || match.estado === 'En Curso' || match.live_timer_started_at !== null || match.live_timer_elapsed_seconds > 0);
                    
                    const slotAd = (ads && ads.length > 0) ? ads[globalMatchCount % ads.length] : null;
                    globalMatchCount++;

                    return (
                      <div key={match.id ? `${match.id}-${idx}` : idx} className="relative group">
                        <MatchdayCard 
                          match={match} 
                          onClick={(id) => {
                            setIsClosedByUser(false);
                            setSelectedLiveMatchId(id);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }} 
                          clubLogoUrl={clubLogoUrl}
                        />

                        {isAdmin && (
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (window.confirm(`¿Estás seguro de eliminar el partido de ${match.equipo?.name || 'Sporting'} vs ${match.rival_nombre}?`)) {
                                try {
                                  await deleteMatchAction(match.id, match.equipo_id);
                                  setMatches(prev => prev.filter(m => m.id !== match.id));
                                  toast.success("Partido eliminado correctamente");
                                } catch (err: any) {
                                  toast.error("Error al eliminar el partido: " + err.message);
                                }
                              }
                            }}
                            className="absolute top-3 right-3 p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-200 shadow-sm opacity-0 group-hover:opacity-100 transition-all z-20 flex items-center gap-1 text-[10px] font-bold"
                            title="Eliminar partido de la vista en vivo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Eliminar</span>
                          </button>
                        )}
                        
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
