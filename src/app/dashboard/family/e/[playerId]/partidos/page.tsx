"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Trophy, Calendar as CalendarIcon, MapPin, CheckCircle2, XCircle, Clock, ChevronRight } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import Link from "next/link";

export default function FamilyMatchesPage() {
  const params = useParams();
  const playerId = typeof params.playerId === 'string' ? params.playerId : '';

  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState("");
  const [matches, setMatches] = useState<any[]>([]);
  const [convocatorias, setConvocatorias] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchMatches();
  }, [playerId]);

  const fetchMatches = async () => {
    setLoading(true);
    const supabase = createClient();
    try {
      const { data: pData, error: pError } = await supabase
        .from('players')
        .select('team_id, teams(name)')
        .eq('id', playerId)
        .single();
        
      if (pError) throw pError;
      setTeamName((pData.teams as any)?.name || "Equipo");

      if (pData.team_id) {
        // Fetch matches
        const { data: mData, error: mError } = await supabase
          .from('partidos')
          .select('*, equipo:teams(id, name, color), match_events(*, player:players(first_name, last_name))')
          .eq('equipo_id', pData.team_id)
          .order('fecha_hora', { ascending: true });

        if (mError) throw mError;
        setMatches(mData || []);

        // Fetch convocatorias for this specific player to see if they were called up
        const { data: cData, error: cError } = await supabase
          .from('convocatorias')
          .select('partido_id, status, minutos_jugados, titular')
          .eq('player_id', playerId);

        if (cError) throw cError;

        const convMap: Record<string, any> = {};
        cData?.forEach(c => {
          convMap[c.partido_id] = c;
        });
        setConvocatorias(convMap);
      }

    } catch (err: any) {
      toast.error("Error al cargar partidos: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      <Toaster position="top-right" />
      
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
          <Trophy size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Partidos</h1>
          <p className="text-gray-500 text-sm">Calendario de competición del {teamName}</p>
        </div>
      </div>

      {!matches.length ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-gray-500">
          <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No hay partidos registrados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {matches.map((match) => {
            const date = new Date(match.fecha_hora);
            const myConv = convocatorias[match.id];
            
            // By default the coach view forces club on left. We'll do the same to match the aesthetic.
            const isLocal = match.lugar === 'Local' || !/\b(fuera|visitante)\b/i.test(match.lugar || '');
            const localName = isLocal ? teamName : match.rival_nombre;
            const awayName = isLocal ? match.rival_nombre : teamName;
            
            const localGoals = isLocal ? match.resultado_propio : match.resultado_rival;
            const awayGoals = isLocal ? match.resultado_rival : match.resultado_propio;

            return (
              <Link 
                key={match.id} 
                href={`/dashboard/family/e/${playerId}/partidos/${match.id}`} 
                className="flex flex-col rounded-xl bg-white shadow-sm ring-1 ring-slate-200 transition-all hover:shadow-md hover:ring-indigo-500 group relative"
              >
                <div className="p-5 flex-1 flex flex-col">
                  {/* Top Bar: Badges and Date */}
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex gap-2 flex-wrap">
                      <div className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${match.estado === 'Programado' ? "bg-slate-100 text-slate-500 border border-slate-200" : match.estado === 'Finalizado' ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-amber-50 text-amber-600 border border-amber-200"}`}>
                        {(match.estado === 'Descanso' || (match.first_half_duration_seconds !== null && match.live_timer_elapsed_seconds === match.first_half_duration_seconds && !match.live_timer_started_at)) ? 'Descanso' : match.estado}
                      </div>
                      
                      {myConv ? (
                        myConv.status === 'convocado' ? (
                          <div className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center gap-1">
                            <CheckCircle2 size={10} /> Convocado
                          </div>
                        ) : (
                          <div className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-red-50 text-red-600 border border-red-200 flex items-center gap-1">
                            <XCircle size={10} /> No Convocado
                          </div>
                        )
                      ) : (
                        <div className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                          Pendiente
                        </div>
                      )}
                    </div>
                    
                    <div className="text-xs font-bold text-slate-600 flex items-center whitespace-nowrap ml-2">
                      <Clock className="w-3.5 h-3.5 mr-1 text-indigo-500 shrink-0" />
                      <span className="capitalize">{date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                      <span className="text-slate-300 mx-1">•</span>
                      <span>{date.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})} h</span>
                    </div>
                  </div>
                  
                  {/* Scoreboard Area */}
                  <div className="flex justify-between items-center py-4">
                    {/* Home Team */}
                    <div className="flex flex-col items-center flex-1 text-center">
                      <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center mb-2 shadow-sm border border-slate-200">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: match.equipo?.color || '#4f46e5' }}
                        />
                      </div>
                      <span className="font-bold text-sm text-slate-900 leading-tight line-clamp-2 min-h-[2.5rem]">{localName}</span>
                    </div>
                    
                    {/* Score */}
                    <div className="px-4 flex flex-col items-center justify-center">
                      {match.estado === 'Programado' ? (
                        <span className="text-slate-300 font-black text-xl italic">VS</span>
                      ) : (
                        <div className="flex flex-col items-center">
                          <div className="flex items-center gap-2">
                            <span className={`text-2xl font-black ${localGoals > awayGoals ? "text-indigo-600" : "text-slate-700"}`}>{localGoals ?? 0}</span>
                            <span className="text-slate-300 font-bold">-</span>
                            <span className={`text-2xl font-black ${awayGoals > localGoals ? "text-indigo-600" : "text-slate-700"}`}>{awayGoals ?? 0}</span>
                          </div>
                          {(match.estado === 'Descanso' || (match.first_half_duration_seconds !== null && match.live_timer_elapsed_seconds === match.first_half_duration_seconds && !match.live_timer_started_at)) && (
                            <span className="text-[9px] font-black tracking-widest uppercase mt-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              Descanso
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Away Team */}
                    <div className="flex flex-col items-center flex-1 text-center">
                      <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center mb-2 shadow-sm border border-slate-200">
                        <div className="w-3 h-3 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-xs uppercase">
                          {awayName.charAt(0)}
                        </div>
                      </div>
                      <span className="font-bold text-sm text-slate-900 leading-tight line-clamp-2 min-h-[2.5rem]">{awayName}</span>
                    </div>
                  </div>

                  {/* Goleadores del Partido */}
                  {(() => {
                    const mEvents = match.match_events || [];
                    const homeGoalsList = mEvents.filter((e: any) => {
                      const t = (e.tipo_evento || e.tipo || '').toLowerCase();
                      const isGol = t.includes('gol') && !t.includes('propia');
                      const isAutogol = t.includes('propia') || t.includes('pp');
                      return (isGol && e.player_id) || (isAutogol && !e.player_id);
                    });
                    const awayGoalsList = mEvents.filter((e: any) => {
                      const t = (e.tipo_evento || e.tipo || '').toLowerCase();
                      const isGol = t.includes('gol') && !t.includes('propia');
                      const isAutogol = t.includes('propia') || t.includes('pp');
                      return (isGol && !e.player_id) || (isAutogol && e.player_id);
                    });

                    if (homeGoalsList.length === 0 && awayGoalsList.length === 0) return null;

                    return (
                      <div className="px-2 py-2 grid grid-cols-2 gap-2 text-[11px] border-t border-slate-100 bg-slate-50/50 rounded-lg my-1">
                        <div className="flex flex-col items-start gap-0.5 text-slate-700">
                          {homeGoalsList.map((g: any, i: number) => {
                            const isPP = (g.tipo_evento || '').toLowerCase().includes('propia');
                            const pName = isPP ? 'Rival (p.p.)' : (g.player?.first_name ? `${g.player.first_name} ${g.player.last_name || ''}`.trim() : 'Jugador');
                            const min = g.minuto > 120 ? Math.floor(g.minuto / 60) : (g.minuto || 0);
                            return (
                              <span key={i} className="font-bold text-slate-800 flex items-center gap-1">
                                <span>⚽ {pName}</span>
                                <span className="text-slate-400 font-normal">({min}')</span>
                              </span>
                            );
                          })}
                        </div>
                        <div className="flex flex-col items-end gap-0.5 text-slate-700 text-right">
                          {awayGoalsList.map((g: any, i: number) => {
                            const isPP = (g.tipo_evento || '').toLowerCase().includes('propia');
                            const pName = isPP ? 'Sporting (p.p.)' : 'Rival';
                            const min = g.minuto > 120 ? Math.floor(g.minuto / 60) : (g.minuto || 0);
                            return (
                              <span key={i} className="font-bold text-slate-800 flex items-center gap-1">
                                <span className="text-slate-400 font-normal">({min}')</span>
                                <span>{pName} ⚽</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Footer Area */}
                  <div className="mt-auto pt-4 border-t border-slate-100 flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center text-xs text-slate-500 font-medium">
                        <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        <span className="truncate max-w-[120px]">{match.lugar || 'Visitante'}</span>
                      </div>
                      
                      <span className="text-xs font-bold text-indigo-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        Ver Estadísticas <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
