"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Database, CalendarDays, Lock, ArrowRight, Shield } from "lucide-react";

interface Season {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export default function ArchivoLandingPage() {
  const router = useRouter();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const supabase = createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth');
      return;
    }

    const { data: profile } = await supabase.from('profiles').select('club_id, role').eq('id', user.id).single();
    if (!profile?.club_id) return;
    
    // Only admins can see this page
    if (profile.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    
    setIsAdmin(true);

    const { data: seasonsData, error } = await supabase
      .from('seasons')
      .select('*')
      .eq('club_id', profile.club_id)
      .eq('is_active', false) // Solo mostrar temporadas cerradas/inactivas
      .order('start_date', { ascending: false });

    if (error) {
      console.error("Error cargando temporadas:", error.message);
    } else {
      setSeasons(seasonsData || []);
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

  if (!isAdmin) return null;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Database className="text-blue-600" size={32} />
            Archivo Histórico
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            Explora de solo lectura los datos y estadísticas de temporadas pasadas.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {seasons.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white rounded-3xl border border-slate-200 border-dashed">
            <Lock className="mx-auto text-slate-300 mb-3" size={48} />
            <h3 className="text-lg font-bold text-slate-700">No hay temporadas históricas</h3>
            <p className="text-slate-500 max-w-md mx-auto mt-2">
              Cuando cierres tu temporada actual en Administración {'>'} Temporadas, aparecerá aquí para consulta permanente.
            </p>
          </div>
        ) : (
          seasons.map((season) => (
            <div 
              key={season.id} 
              className="group bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all cursor-pointer relative overflow-hidden"
              onClick={() => router.push(`/dashboard/archivo/${season.id}`)}
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Database size={80} className="text-blue-600 transform translate-x-4 -translate-y-4" />
              </div>

              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center gap-2 mb-4">
                  <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <Lock size={12} />
                    Cerrada
                  </span>
                </div>

                <h2 className="text-2xl font-black text-slate-900 mb-1">{season.name}</h2>
                
                <div className="flex items-center gap-2 text-sm font-medium text-slate-500 mb-6">
                  <CalendarDays size={16} />
                  <span>
                    {new Date(season.start_date).getFullYear()} - {new Date(season.end_date).getFullYear()}
                  </span>
                </div>

                <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between text-blue-600 font-bold group-hover:translate-x-2 transition-transform">
                  <span className="text-sm">Explorar Temporada</span>
                  <ArrowRight size={18} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
