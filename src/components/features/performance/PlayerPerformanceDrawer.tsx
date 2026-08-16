"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, User as UserIcon, X } from "lucide-react";

import { PlayerProgressView } from "@/components/features/formative/PlayerProgressView";
import { isFormativeCategory } from "@/lib/utils";

export function PlayerPerformanceDrawer({ 
  playerId, 
  teamId, 
  initialTab, 
  onClose, 
  globalTrainingStats, 
  globalMatchStats,
  onlyFormative = false
}: any) {
  const [activeTab, setActiveTab] = useState<'entrenamientos' | 'partidos' | 'formativo'>(
    onlyFormative ? 'formativo' : (initialTab || 'entrenamientos')
  );
  const [events, setEvents] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [teamCategory, setTeamCategory] = useState<string>('');
  const [teamName, setTeamName] = useState<string>('');
  const [playerInfo, setPlayerInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!playerId) return;
    const fetchData = async () => {
      setLoading(true);
      const supabase = createClient();
      
      if (teamId) {
        const { data: tData } = await supabase.from('teams').select('category, name').eq('id', teamId).single();
        if (tData) {
          setTeamCategory(tData.category || '');
          setTeamName(tData.name || '');
        }

        if (!onlyFormative) {
          const { data: allEvents } = await supabase.from('team_events').select('id, date, event_type, title').eq('team_id', teamId).order('date', { ascending: false });
          if (allEvents) setEvents(allEvents);

          try {
            const res = await fetch('/api/player-metrics', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ playerId, eventIds: allEvents?.map(e => e.id) || [] })
            });
            const json = await res.json();
            setMetrics(json.data || []);
          } catch (err) {
            console.error("Error fetching drawer metrics:", err);
          }
        }
      }

      // Si no tenemos los datos del jugador desde props, los cargamos directamente
      if (!globalTrainingStats && !globalMatchStats) {
        const { data: pData } = await supabase.from('players').select('first_name, last_name, avatar_url, dorsal').eq('id', playerId).single();
        if (pData) {
          setPlayerInfo(pData);
        }
      }

      setLoading(false);
    };
    fetchData();
  }, [playerId, teamId, onlyFormative]);

  const isFormative = isFormativeCategory(teamCategory, teamName);
  const effectivePlayer = globalTrainingStats || globalMatchStats || playerInfo;
  const pName = effectivePlayer?.first_name ? `${effectivePlayer.first_name} ${effectivePlayer.last_name || ''}` : 'Ficha del Jugador';
  const avatarUrl = effectivePlayer?.avatar_url;
  const dorsal = effectivePlayer?.dorsal;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity" onClick={onClose}></div>
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 animate-in slide-in-from-right overflow-hidden border-l border-slate-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-full border border-slate-200 shadow-sm flex items-center justify-center overflow-hidden">
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt={pName} 
                  className="w-full h-full object-cover object-[center_25%]" 
                />
              ) : (
                <UserIcon className="text-slate-400" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">{pName}</h2>
              <div className="text-xs font-bold text-slate-500 uppercase">
                {onlyFormative ? 'Informe Formativo & Evolución' : `Dorsal ${dorsal || '-'}`}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white border border-slate-200 rounded-full text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors shadow-sm">
            <X size={18} />
          </button>
        </div>

        {/* Tabs (Solo se muestran si no estamos en modo exclusivo formativo) */}
        {!onlyFormative && (
          <div className="flex border-b border-slate-100 bg-slate-50/50">
            <button onClick={() => setActiveTab('entrenamientos')} className={`flex-1 py-3.5 text-xs sm:text-sm font-bold border-b-2 transition-colors ${activeTab === 'entrenamientos' ? 'border-emerald-500 text-emerald-700 bg-white' : 'border-transparent text-slate-500 hover:bg-slate-100/50'}`}>
              Entrenamientos
            </button>
            <button onClick={() => setActiveTab('partidos')} className={`flex-1 py-3.5 text-xs sm:text-sm font-bold border-b-2 transition-colors ${activeTab === 'partidos' ? 'border-indigo-500 text-indigo-700 bg-white' : 'border-transparent text-slate-500 hover:bg-slate-100/50'}`}>
              Partidos
            </button>
            {isFormative && (
              <button onClick={() => setActiveTab('formativo')} className={`flex-1 py-3.5 text-xs sm:text-sm font-bold border-b-2 transition-colors ${activeTab === 'formativo' ? 'border-purple-500 text-purple-700 bg-white' : 'border-transparent text-slate-500 hover:bg-slate-100/50'}`}>
                🧠 Formativo
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          {(activeTab === 'formativo' || onlyFormative) && (
            <div className="animate-in fade-in">
              <PlayerProgressView playerId={playerId} playerName={pName} />
            </div>
          )}
          {!onlyFormative && activeTab === 'entrenamientos' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                  <div className="text-2xl font-black text-slate-900">{globalTrainingStats?.acwr > 0 ? globalTrainingStats.acwr.toFixed(2) : '-'}</div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Ratio ACWR</div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                  <div className="text-2xl font-black text-slate-900">{globalTrainingStats?.trainingMinutes || 0}</div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Mins Totales</div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-800 text-sm mb-3">Historial por Días</h3>
                {loading ? <div className="text-center py-8"><Loader2 className="animate-spin mx-auto text-emerald-500" /></div> : (
                  <div className="space-y-3">
                    {events.filter(e => e.event_type === 'Entrenamiento').map(ev => {
                      const m = metrics.filter(mx => mx.event_id === ev.id);
                      const rpe = m.find(x => x.club_metrics?.name?.toLowerCase().includes('rpe'))?.value_number;
                      const min = m.find(x => x.club_metrics?.name?.toLowerCase().includes('minutos'))?.value_number;
                      if (rpe === undefined && min === undefined) return null;
                      return (
                        <div key={ev.id} className="p-3 border border-slate-100 rounded-xl bg-white shadow-sm flex items-center justify-between">
                          <div>
                            <div className="text-sm font-bold text-slate-700">{new Date(ev.date).toLocaleDateString('es-ES')}</div>
                            <div className="text-xs text-slate-400">{ev.title}</div>
                          </div>
                          <div className="flex gap-4 text-center">
                            <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase">Min</div>
                              <div className="text-sm font-black text-slate-700">{min ?? '-'}</div>
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase">RPE</div>
                              <div className="text-sm font-black text-slate-700">{rpe ?? '-'}</div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* LEYENDA ACWR */}
              <div className="mt-8 pt-6 border-t border-slate-100">
                <h3 className="font-bold text-slate-800 text-sm mb-3 text-center">Leyenda de Cargas (ACWR)</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="bg-slate-50 border-t-4 border-slate-400 p-2 rounded-b-lg text-center shadow-sm">
                    <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Bajo Entrenado</div>
                    <div className="text-xs font-black text-slate-700">{'< 0.8'}</div>
                  </div>
                  <div className="bg-emerald-50 border-t-4 border-emerald-500 p-2 rounded-b-lg text-center shadow-sm">
                    <div className="text-[10px] font-bold text-emerald-700 uppercase mb-1">Óptimo</div>
                    <div className="text-xs font-black text-emerald-800">0.8 - 1.3</div>
                  </div>
                  <div className="bg-amber-50 border-t-4 border-amber-500 p-2 rounded-b-lg text-center shadow-sm">
                    <div className="text-[10px] font-bold text-amber-700 uppercase mb-1">Precaución</div>
                    <div className="text-xs font-black text-amber-800">1.3 - 1.5</div>
                  </div>
                  <div className="bg-red-50 border-t-4 border-red-500 p-2 rounded-b-lg text-center shadow-sm">
                    <div className="text-[10px] font-bold text-red-700 uppercase mb-1">Peligro</div>
                    <div className="text-xs font-black text-red-800">{'> 1.5'}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'partidos' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                  <div className="text-2xl font-black text-slate-900">{globalMatchStats?.goals ?? '-'}</div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Goles</div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                  <div className="text-2xl font-black text-slate-900">{globalMatchStats?.assists ?? '-'}</div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Asistencias</div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-800 text-sm mb-3">Historial de Partidos</h3>
                {loading ? <div className="text-center py-8"><Loader2 className="animate-spin mx-auto text-indigo-500" /></div> : (
                  <div className="space-y-3">
                    {events.filter(e => e.event_type === 'Partido').map(ev => {
                      const m = metrics.filter(mx => mx.event_id === ev.id);
                      const min = m.find(x => x.club_metrics?.name?.toLowerCase().includes('minutos'))?.value_number;
                      const gol = m.find(x => x.club_metrics?.name?.toLowerCase() === 'goles')?.value_number;
                      const ast = m.find(x => x.club_metrics?.name?.toLowerCase() === 'asistencias')?.value_number;
                      if (min === undefined && gol === undefined && ast === undefined) return null;
                      return (
                        <div key={ev.id} className="p-3 border border-slate-100 rounded-xl bg-white shadow-sm flex items-center justify-between">
                          <div>
                            <div className="text-sm font-bold text-slate-700">{new Date(ev.date).toLocaleDateString('es-ES')}</div>
                            <div className="text-xs text-slate-400">{ev.title}</div>
                          </div>
                          <div className="flex gap-3 text-center">
                            <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase">Min</div>
                              <div className="text-sm font-black text-indigo-700">{min ?? '-'}</div>
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase">Gol</div>
                              <div className="text-sm font-black text-slate-700">{gol ?? '-'}</div>
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase">Ast</div>
                              <div className="text-sm font-black text-slate-700">{ast ?? '-'}</div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
