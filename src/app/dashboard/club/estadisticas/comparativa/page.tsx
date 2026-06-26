"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area
} from "recharts";
import { History, Users, Activity, Loader2, ArrowLeft, Search, Sparkles, Send } from "lucide-react";
import Link from "next/link";

interface SeasonStat {
  season_id: string;
  season_name: string;
  total_players: number;
  total_matches: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
}

export default function ComparativaHistoricaPage() {
  const [stats, setStats] = useState<SeasonStat[]>([]);
  const [loading, setLoading] = useState(true);
  
  // n8n Search Engine State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searchError, setSearchError] = useState("");

  const handleSmartSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setSearchLoading(true);
    setSearchError("");
    setSearchResult(null);
    
    try {
      const response = await fetch('/api/asistente-ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery })
      });
      
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Error al procesar la búsqueda');
      setSearchResult(data);
    } catch (err: any) {
      setSearchError(err.message);
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    async function fetchHistoricalData() {
      const supabase = createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("club_id")
        .eq("id", user.id)
        .single();
        
      if (!profile?.club_id) return;

      // 1. Fetch seasons ordered by name or start_date
      const { data: seasons } = await supabase
        .from("seasons")
        .select("id, name")
        .eq("club_id", profile.club_id)
        .order("name", { ascending: true });

      if (!seasons) {
        setLoading(false);
        return;
      }

      // 2. Fetch all player inscriptions for this club
      const { data: history } = await supabase
        .from("player_season_history")
        .select("season_id")
        .eq("club_id", profile.club_id)
        .neq("status", "inactive");

      // 3. Fetch all matches for this club
      const { data: matches } = await supabase
        .from("partidos")
        .select("season_id, resultado_propio, resultado_rival")
        .eq("club_id", profile.club_id);

      // 4. Aggregate data by season
      const aggregated: SeasonStat[] = seasons.map(s => {
        const seasonPlayers = history?.filter(h => h.season_id === s.id).length || 0;
        const seasonMatches = matches?.filter(m => m.season_id === s.id) || [];
        
        let wins = 0, draws = 0, losses = 0, gf = 0, ga = 0;
        seasonMatches.forEach(m => {
          if (m.resultado_propio !== null && m.resultado_rival !== null) {
            gf += m.resultado_propio;
            ga += m.resultado_rival;
            if (m.resultado_propio > m.resultado_rival) wins++;
            else if (m.resultado_propio === m.resultado_rival) draws++;
            else losses++;
          }
        });

        return {
          season_id: s.id,
          season_name: s.name,
          total_players: seasonPlayers,
          total_matches: seasonMatches.length,
          wins,
          draws,
          losses,
          goals_for: gf,
          goals_against: ga
        };
      });

      setStats(aggregated);
      setLoading(false);
    }

    fetchHistoricalData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-slate-500">
        <Loader2 className="animate-spin text-blue-500 mr-2" size={32} />
        Cargando Comparativa Histórica...
      </div>
    );
  }

  // Pre-calculate derived data for charts
  const winRateData = stats.map(s => ({
    name: s.season_name,
    "Win %": s.wins + s.draws + s.losses > 0 
      ? Math.round((s.wins / (s.wins + s.draws + s.losses)) * 100) 
      : 0
  }));

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/club/estadisticas" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="text-slate-500" size={24} />
          </Link>
          <History className="text-emerald-600" size={32} />
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Comparativa Histórica</h1>
            <p className="text-slate-500">Análisis global de la evolución del club a lo largo de las temporadas.</p>
          </div>
        </div>
      </div>

      {/* AI Smart Search Engine */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-3xl p-1 relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Sparkles size={100} className="text-indigo-200" />
        </div>
        <div className="bg-slate-900/90 backdrop-blur-sm rounded-[22px] p-6 relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="text-indigo-400" size={20} />
            <h2 className="text-lg font-bold text-white">Asistente de Comparativa (Gemini AI)</h2>
          </div>
          
          <form onSubmit={handleSmartSearch} className="relative flex items-center">
            <div className="absolute left-4 text-slate-400">
              <Search size={20} />
            </div>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ej: Cuántos goles llevaba encajado el cadete a en esta fecha comparado con la 25/26..."
              className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-xl py-4 pl-12 pr-16 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500 shadow-inner"
              disabled={searchLoading}
            />
            <button 
              type="submit"
              disabled={searchLoading || !searchQuery.trim()}
              className="absolute right-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white p-2 rounded-lg transition-colors"
            >
              {searchLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
          </form>

          {/* Resultados de Gemini */}
          {searchError && (
            <div className="mt-4 p-4 bg-red-900/30 border border-red-800/50 rounded-xl text-red-200 text-sm">
              <p className="font-bold mb-1">Hubo un problema con el asistente:</p>
              {searchError}
            </div>
          )}

          {searchResult && (
            <div className="mt-6 animate-in fade-in slide-in-from-top-2">
              <div className="p-5 bg-indigo-950/50 border border-indigo-800/50 rounded-xl">
                <h3 className="text-indigo-300 font-bold mb-2 flex items-center gap-2">
                  <Activity size={16} />
                  Resultado del Análisis
                </h3>
                {searchResult.text && (
                  <div className="text-slate-200 text-lg leading-relaxed whitespace-pre-wrap mb-4">
                    {searchResult.text}
                  </div>
                )}
                {searchResult.type === 'chart' && searchResult.data && (
                  // Si n8n devuelve datos para pintar un gráfico
                  <div className="mt-4 h-64 bg-slate-900 rounded-lg p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={searchResult.data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                        <XAxis dataKey="name" tick={{fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                        <YAxis tick={{fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                        <Tooltip 
                          cursor={{fill: '#334155'}}
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 shadow-xl">
                                  <p className="text-white font-medium mb-2">{label}</p>
                                  {payload.map((entry: any, index: number) => (
                                    <p key={index} style={{ color: entry.color }} className="text-sm">
                                      {entry.name}: {entry.value}
                                    </p>
                                  ))}
                                  <div className="mt-2 pt-2 border-t border-slate-700">
                                    {Object.entries(data).map(([key, value]) => {
                                      if (key !== 'name' && key !== 'value1' && key !== 'value2') {
                                        return (
                                          <p key={key} className="text-slate-400 text-xs mt-1 capitalize">
                                            {key}: {String(value)}
                                          </p>
                                        );
                                      }
                                      return null;
                                    })}
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend />
                        <Bar dataKey="value1" name={searchResult.label1 || "Valor 1"} fill="#818cf8" radius={[4, 4, 0, 0]} />
                        {searchResult.label2 && (
                          <Bar dataKey="value2" name={searchResult.label2} fill="#34d399" radius={[4, 4, 0, 0]} />
                        )}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gráfico 1: Evolución Demográfica */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Users className="text-blue-500" size={20} />
            <h2 className="text-lg font-bold text-slate-800">Evolución Demográfica</h2>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPlayers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="season_name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="total_players" name="Jugadores Inscritos" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorPlayers)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Rendimiento Deportivo (Goles) */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="text-emerald-500" size={20} />
            <h2 className="text-lg font-bold text-slate-800">Rendimiento (Goles a Favor vs Contra)</h2>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="season_name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="goals_for" name="Goles a Favor" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="goals_against" name="Goles en Contra" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 3: Ratio de Victorias */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="text-amber-500" size={20} />
            <h2 className="text-lg font-bold text-slate-800">Evolución Porcentaje de Victorias Globales</h2>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={winRateData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} tickFormatter={(val) => `${val}%`} />
                <Tooltip 
                  formatter={(value: any) => [`${value}%`, 'Tasa de Victorias']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Line type="monotone" dataKey="Win %" stroke="#f59e0b" strokeWidth={4} dot={{r: 6, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 8}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
