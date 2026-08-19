"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Shield, ArrowLeft, Users, Trophy, ChevronRight, User } from "lucide-react";
import Link from "next/link";

export default function ArchivoHistoricalTeamPage() {
  const router = useRouter();
  const params = useParams();
  const seasonId = typeof params?.seasonId === 'string' ? params.seasonId : '';
  const teamId = typeof params?.teamId === 'string' ? params.teamId : '';

  const [season, setSeason] = useState<any>(null);
  const [team, setTeam] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'plantilla' | 'partidos'>('plantilla');

  useEffect(() => {
    fetchData();
  }, [seasonId, teamId]);

  const fetchData = async () => {
    setLoading(true);
    const supabase = createClient();
    
    // Auth & role check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth');
      return;
    }
    const { data: profile } = await supabase.from('profiles').select('club_id, role').eq('id', user.id).single();
    if (!profile || profile.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    // Load Season & Team
    const { data: seasonData } = await supabase.from('seasons').select('*').eq('id', seasonId).single();
    const { data: teamData } = await supabase.from('teams').select('*').eq('id', teamId).single();

    if (seasonData && teamData) {
      setSeason(seasonData);
      setTeam(teamData);
      
      // Load Historical Roster
      const { data: historyData } = await supabase
        .from('player_season_history')
        .select(`
          player_id,
          players (
            id, first_name, last_name, avatar_url, role
          )
        `)
        .eq('season_id', seasonId)
        .eq('team_id', teamId);
        
      if (historyData) {
        const mappedPlayers = historyData
          .map((h: any) => h.players)
          .filter(Boolean)
          .sort((a: any, b: any) => a.first_name.localeCompare(b.first_name));
        setPlayers(mappedPlayers);
      }

      // Load Historical Matches
      const { data: matchesData } = await supabase
        .from('partidos')
        .select('*')
        .eq('season_id', seasonId)
        .eq('team_id', teamId)
        .order('fecha_hora', { ascending: false });
      
      setMatches(matchesData || []);
    } else {
      router.push('/dashboard/archivo');
    }
    
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!season || !team) return null;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-2">
        <Link 
          href={`/dashboard/archivo/${seasonId}`}
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft size={16} />
          Volver a Equipos de la Temporada {season.name}
        </Link>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-inner"
              style={{ backgroundColor: team.color || '#3b82f6' }}
            >
              <Shield size={20} />
            </div>
            {team.name}
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            Archivo Histórico ({season.name})
          </p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('plantilla')}
          className={`pb-3 px-2 font-bold text-sm transition-colors border-b-2 ${
            activeTab === 'plantilla' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users size={16} />
            Plantilla Histórica
          </div>
        </button>
        <button
          onClick={() => setActiveTab('partidos')}
          className={`pb-3 px-2 font-bold text-sm transition-colors border-b-2 ${
            activeTab === 'partidos' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Trophy size={16} />
            Partidos Disputados
          </div>
        </button>
      </div>

      {activeTab === 'plantilla' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
          {players.length === 0 ? (
            <div className="col-span-full p-12 text-center bg-white rounded-3xl border border-slate-200 border-dashed">
              <Users className="mx-auto text-slate-300 mb-3" size={48} />
              <h3 className="text-lg font-bold text-slate-700">Sin plantilla registrada</h3>
              <p className="text-slate-500 max-w-md mx-auto mt-2">
                No hay jugadores asignados a este equipo en esta temporada específica.
              </p>
            </div>
          ) : (
            players.map((player) => (
              <div 
                key={player.id}
                onClick={() => router.push(`/dashboard/archivo/${seasonId}/jugador/${player.id}`)}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-blue-400 cursor-pointer transition-all flex items-center gap-4 group"
              >
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                  {player.avatar_url ? (
                    <img src={player.avatar_url} alt={player.first_name} className="w-full h-full object-cover" />
                  ) : (
                    <User size={24} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 text-sm truncate">
                    {player.first_name} {player.last_name}
                  </h3>
                  <p className="text-xs text-slate-500 truncate">{player.role || 'Jugador'}</p>
                </div>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'partidos' && (
        <div className="space-y-3 mt-6">
          {matches.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 border-dashed">
              <Trophy className="mx-auto text-slate-300 mb-3" size={48} />
              <h3 className="text-lg font-bold text-slate-700">Sin partidos registrados</h3>
            </div>
          ) : (
            matches.map((match) => (
              <div key={match.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                      {new Date(match.fecha_hora).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {team.name} vs {match.rival_nombre || 'Rival Desconocido'}
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 text-center min-w-[100px]">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Resultado</span>
                    <span className="font-black text-slate-800">
                      {match.estado === 'completado' ? `${match.goles_favor || 0} - ${match.goles_contra || 0}` : 'Pendiente'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
