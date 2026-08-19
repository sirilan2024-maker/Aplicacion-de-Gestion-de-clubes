"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Shield, ArrowLeft, Users, ChevronRight, CalendarDays, BarChart3 } from "lucide-react";
import Link from "next/link";

export default function ArchivoSeasonPage() {
  const router = useRouter();
  const params = useParams();
  const seasonId = typeof params?.seasonId === 'string' ? params.seasonId : '';

  const [season, setSeason] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [seasonId]);

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

    // Load Season
    const { data: seasonData } = await supabase
      .from('seasons')
      .select('*')
      .eq('id', seasonId)
      .eq('club_id', profile.club_id)
      .single();

    if (seasonData) {
      setSeason(seasonData);
      
      // Load Teams
      const { data: teamsData } = await supabase
        .from('teams')
        .select('*')
        .eq('season_id', seasonId)
        .order('name');
        
      setTeams(teamsData || []);
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

  if (!season) return null;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-2">
        <Link 
          href="/dashboard/archivo" 
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft size={16} />
          Volver a Temporadas Históricas
        </Link>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <CalendarDays className="text-blue-600" size={32} />
            Temporada {season.name}
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            Listado de equipos y plantillas que participaron en esta temporada.
          </p>
        </div>
        <div className="bg-slate-100 px-4 py-2 rounded-xl text-slate-600 font-bold text-sm border border-slate-200 shadow-inner">
          {new Date(season.start_date).toLocaleDateString('es-ES')} - {new Date(season.end_date).toLocaleDateString('es-ES')}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {teams.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white rounded-3xl border border-slate-200 border-dashed">
            <Shield className="mx-auto text-slate-300 mb-3" size={48} />
            <h3 className="text-lg font-bold text-slate-700">No hay equipos</h3>
            <p className="text-slate-500 max-w-md mx-auto mt-2">
              No se encontraron equipos registrados para esta temporada.
            </p>
          </div>
        ) : (
          teams.map((team) => (
            <div 
              key={team.id}
              onClick={() => router.push(`/dashboard/archivo/${seasonId}/equipos/${team.id}`)}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-blue-400 cursor-pointer transition-all flex flex-col group"
            >
              <div className="flex justify-between items-start mb-4">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold shadow-inner"
                  style={{ backgroundColor: team.color || '#3b82f6' }}
                >
                  <Shield size={24} />
                </div>
                <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded-lg">
                  {team.category}
                </span>
              </div>
              
              <h2 className="text-lg font-bold text-slate-900 line-clamp-1">{team.name}</h2>
              
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100 text-slate-500">
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <Users size={14} className="text-slate-400" />
                  <span>Plantilla</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <BarChart3 size={14} className="text-slate-400" />
                  <span>Estadísticas</span>
                </div>
                
                <ChevronRight size={16} className="ml-auto text-blue-500 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
