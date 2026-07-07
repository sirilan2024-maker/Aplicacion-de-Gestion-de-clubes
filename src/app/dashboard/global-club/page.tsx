"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/Skeleton";
import { Trophy, Clock, CalendarDays, AlertCircle } from "lucide-react";

// Types
interface Match {
  id: string;
  fecha_hora: string;
  lugar: string;
  rival_nombre: string;
  resultado_propio: number | null;
  resultado_rival: number | null;
  estado: string;
  live_timer_started_at: string | null;
  live_timer_elapsed_seconds: number | null;
  teams: {
    name: string;
    category: string;
    color: string;
  };
}

export default function GlobalClubPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    // Update 'now' every second for the live timer calculation
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setMatches([]); setLoading(false); return; }

      // Fetch user profile to get club_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("club_id")
        .eq("id", user.id)
        .single();
        
      if (!profile?.club_id) { setMatches([]); setLoading(false); return; }

      // Fetch the active season to filter matches correctly
      const { data: activeSeason } = await supabase
        .from('seasons')
        .select('id')
        .eq('club_id', profile.club_id)
        .eq('is_active', true)
        .single();

      let query = supabase
        .from('partidos')
        .select(`
          id, fecha_hora, lugar, rival_nombre, resultado_propio, resultado_rival, estado, 
          live_timer_started_at, live_timer_elapsed_seconds,
          teams(name, category, color)
        `)
        .eq("club_id", profile.club_id)
        .neq("estado", "Cancelado")
        .order("fecha_hora", { ascending: true });

      if (activeSeason?.id) {
        query = query.eq("season_id", activeSeason.id);
      }

      const { data, error } = await query;
      if (error) {
         console.error(error.message || error);
      } else {
        setMatches((data || []) as unknown as Match[]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
    
    // Set up realtime subscription for updates!
    const supabase = createClient();
    const channel = supabase.channel('global_club_matches')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos' }, () => {
        // Refresh data when a match is updated
        fetchMatches();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    }
  }, []);

  // Helper to calculate live match time
  const getLiveTimerDisplay = (match: Match) => {
    if (match.estado !== "En curso") return null;

    let totalSeconds = match.live_timer_elapsed_seconds || 0;
    
    if (match.live_timer_started_at) {
      const start = new Date(match.live_timer_started_at).getTime();
      const diffSeconds = Math.floor((now.getTime() - start) / 1000);
      totalSeconds += diffSeconds;
    }

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // Group matches
  const enCurso = matches.filter(m => m.estado === "En curso" || m.estado === "En Curso");
  
  // For "Próximos", we only want matches that haven't started yet and are coming up soon. 
  // We filter out finished matches.
  const proximos = matches.filter(m => m.estado === "Programado" || !m.estado);
  const finalizados = matches.filter(m => m.estado === "Finalizado").slice(-10); // Last 10 finished

  const renderMatchCard = (match: Match) => {
    const isHome = match.lugar === 'Local';
    const homeTeam = isHome ? match.teams?.name : match.rival_nombre;
    const awayTeam = isHome ? match.rival_nombre : match.teams?.name;
    const homeColor = isHome ? match.teams?.color : '#1E40AF'; // Default if no color
    const awayColor = isHome ? '#e5e7eb' : match.teams?.color;

    const resHome = isHome ? match.resultado_propio : match.resultado_rival;
    const resAway = isHome ? match.resultado_rival : match.resultado_propio;

    const liveTime = getLiveTimerDisplay(match);
    const isLive = match.estado === "En curso" || match.estado === "En Curso";

    return (
      <div key={match.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-50 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {match.teams?.category || 'General'}
            </span>
          </div>
          {isLive ? (
            <div className="flex items-center gap-1.5 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="text-xs font-bold text-red-600 tracking-widest">{liveTime || 'EN DIRECTO'}</span>
            </div>
          ) : match.estado === "Finalizado" ? (
            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">FINALIZADO</span>
          ) : (
            <span className="text-xs font-medium text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full flex items-center gap-1">
              <CalendarDays size={12} />
              {new Date(match.fecha_hora).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        
        <div className="p-5 flex items-center justify-between">
          {/* Home Team */}
          <div className="flex flex-col items-center flex-1">
             <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg mb-2 shadow-sm" style={{ backgroundColor: homeColor || '#64748b' }}>
                {homeTeam?.substring(0, 2).toUpperCase() || 'L'}
             </div>
             <span className="text-sm font-bold text-gray-800 text-center line-clamp-2 leading-tight">
               {homeTeam}
             </span>
             {isHome && <span className="text-[10px] text-gray-400 uppercase mt-1 tracking-widest">Local</span>}
          </div>

          {/* Score */}
          <div className="flex flex-col items-center justify-center px-6">
            <div className="flex items-center gap-3">
               <span className={`text-3xl font-black ${isLive ? 'text-gray-900' : 'text-gray-700'}`}>
                 {resHome !== null ? resHome : '-'}
               </span>
               <span className="text-gray-300 text-xl font-light">-</span>
               <span className={`text-3xl font-black ${isLive ? 'text-gray-900' : 'text-gray-700'}`}>
                 {resAway !== null ? resAway : '-'}
               </span>
            </div>
          </div>

          {/* Away Team */}
          <div className="flex flex-col items-center flex-1">
             <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg mb-2 shadow-sm" style={{ backgroundColor: awayColor || '#94a3b8' }}>
                {awayTeam?.substring(0, 2).toUpperCase() || 'V'}
             </div>
             <span className="text-sm font-bold text-gray-800 text-center line-clamp-2 leading-tight">
               {awayTeam}
             </span>
             {!isHome && <span className="text-[10px] text-gray-400 uppercase mt-1 tracking-widest">Visitante</span>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-sm">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black text-gray-900 leading-tight">Global Club</h1>
                <p className="text-xs text-gray-500 font-medium tracking-wide uppercase">Jornada en directo</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <button 
                onClick={fetchMatches}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 bg-gray-50 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors border border-gray-100"
              >
                <Clock className="w-4 h-4" />
                <span className="hidden sm:inline font-medium">Actualizar</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-40 rounded-xl w-full" />
            <Skeleton className="h-40 rounded-xl w-full" />
          </div>
        ) : (
          <>
            {/* EN DIRECTO */}
            {enCurso.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                  <h2 className="text-lg font-bold text-gray-900 uppercase tracking-wider">En Curso</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {enCurso.map(renderMatchCard)}
                </div>
              </section>
            )}

            {/* PROXIMOS */}
            {proximos.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <CalendarDays className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-bold text-gray-900 uppercase tracking-wider">Próximos Partidos</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {proximos.map(renderMatchCard)}
                </div>
              </section>
            )}

            {/* FINALIZADOS */}
            {finalizados.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                  </div>
                  <h2 className="text-lg font-bold text-gray-900 uppercase tracking-wider">Resultados Recientes</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-80 hover:opacity-100 transition-opacity">
                  {finalizados.map(renderMatchCard)}
                </div>
              </section>
            )}

            {matches.length === 0 && (
              <div className="py-16 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                  <AlertCircle className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">No hay partidos</h3>
                <p className="text-gray-500 mt-1 max-w-md mx-auto">No hay partidos programados para esta temporada en la base de datos.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
