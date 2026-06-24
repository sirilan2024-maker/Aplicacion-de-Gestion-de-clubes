"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Plus, Check, Clock, Calendar as CalendarIcon, ArrowRight, Save, Lock, AlertTriangle } from "lucide-react";
import { toast } from "react-hot-toast";

interface Season {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export default function TemporadasPage() {
  const router = useRouter();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [clubId, setClubId] = useState<string | null>(null);

  // Modal de creación
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const supabase = createClient();
    
    // 1. Obtener club_id del usuario
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('profiles').select('club_id').eq('id', user.id).single();
    if (!profile?.club_id) return;
    setClubId(profile.club_id);

    // 2. Cargar temporadas
    const { data: seasonsData, error } = await supabase
      .from('seasons')
      .select('*')
      .eq('club_id', profile.club_id)
      .order('start_date', { ascending: false });

    if (error) {
      if (error.code !== '42P01') { // Ignore table not found if migration not run yet
        console.error("Error cargando temporadas:", error.message);
      }
    } else {
      setSeasons(seasonsData || []);
    }
    setLoading(false);
  };

  const handleCreateSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubId || !newName || !newStart || !newEnd) return;
    setIsSubmitting(true);
    
    const supabase = createClient();
    
    // Si es la primera temporada que se crea, la ponemos como activa por defecto
    const isActive = seasons.length === 0;

    const { error } = await supabase.from('seasons').insert({
      club_id: clubId,
      name: newName,
      start_date: newStart,
      end_date: newEnd,
      is_active: isActive
    });

    if (error) {
      toast.error("Error al crear temporada: " + error.message);
    } else {
      toast.success("Temporada creada exitosamente");
      setShowCreate(false);
      setNewName("");
      setNewStart("");
      setNewEnd("");
      fetchData();
    }
    setIsSubmitting(false);
  };

  const handleCloseSeason = async (season: Season) => {
    const daysLeft = Math.ceil(
      (new Date(season.end_date).getTime() - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24)
    );
    const msg = daysLeft > 0
      ? `¿Estás seguro de que quieres CERRAR la temporada "${season.name}"? Quedan ${daysLeft} días. Los datos quedarán archivados y no se podrán editar.`
      : `¿Estás seguro de que quieres CERRAR la temporada "${season.name}"? Los datos quedarán archivados.`;
    if (!confirm(msg)) return;

    const supabase = createClient();
    const { error } = await supabase
      .from('seasons')
      .update({ is_active: false })
      .eq('id', season.id);

    if (error) {
      toast.error('Error al cerrar la temporada: ' + error.message);
    } else {
      toast.success(`Temporada "${season.name}" cerrada y archivada. ¡Puedes crear la nueva temporada!`);
      fetchData();
    }
  };

  const handleSetActive = async (seasonId: string) => {
    if (!confirm("¿Estás seguro de que quieres marcar esta temporada como la Activa? Todas las vistas de la plataforma usarán esta temporada por defecto.")) return;
    
    const supabase = createClient();
    
    // 1. Desactivar todas las temporadas de este club
    await supabase.from('seasons').update({ is_active: false }).eq('club_id', clubId);
    
    // 2. Activar la seleccionada
    const { error } = await supabase.from('seasons').update({ is_active: true }).eq('id', seasonId);
    
    if (error) {
      toast.error("Error al activar la temporada: " + error.message);
    } else {
      toast.success("Temporada activa actualizada");
      fetchData();
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gestión de Temporadas</h1>
          <p className="text-gray-500 mt-1">Configura y administra los años deportivos de tu club</p>
        </div>
        <button 
          onClick={() => router.push('/admin/temporadas/nueva')}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors shadow-sm shadow-green-600/20"
        >
          <Plus size={16} />
          <span>Nueva Temporada</span>
        </button>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-gray-200 rounded-xl w-full"></div>
          <div className="h-24 bg-gray-200 rounded-xl w-full"></div>
        </div>
      ) : seasons.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <CalendarIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-1">Aún no hay temporadas</h3>
          <p className="text-gray-500 max-w-sm mx-auto mb-6">
            Crea tu primera temporada para empezar a organizar los equipos y jugadores por año deportivo.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
          >
            <Plus size={18} />
            Crear Primera Temporada
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {seasons.map((season) => (
            <div 
              key={season.id} 
              className={`bg-white rounded-xl shadow-sm border p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${season.is_active ? 'border-blue-500 ring-1 ring-blue-500 shadow-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${season.is_active ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                  <CalendarIcon size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-slate-900">{season.name}</h3>
                    {season.is_active && (
                      <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
                        <Check size={12} /> ACTIVA
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-sm text-gray-600">
                    <Clock size={14} className="text-gray-400" />
                    <span>Inicio: {new Date(season.start_date).toLocaleDateString()}</span>
                    <ArrowRight size={14} className="text-gray-400 mx-1" />
                    <span>Fin: {new Date(season.end_date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 border-t md:border-t-0 pt-4 md:pt-0">
                {season.is_active ? (
                  <button
                    onClick={() => handleCloseSeason(season)}
                    className="flex-1 md:flex-none text-center flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <Lock size={14} />
                    Cerrar Temporada
                  </button>
                ) : (
                  <button
                    onClick={() => handleSetActive(season.id)}
                    className="flex-1 md:flex-none text-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Establecer como Activa
                  </button>
                )}
                <button 
                  className="flex-1 md:flex-none text-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  onClick={() => router.push(`/dashboard/equipos`)}
                >
                  Ver Equipos
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Creación */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Nueva Temporada</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <form onSubmit={handleCreateSeason} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre de la Temporada</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Temporada 24/25"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-900"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Fecha de Inicio</label>
                  <input
                    type="date"
                    required
                    value={newStart}
                    onChange={(e) => setNewStart(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Fecha de Fin</label>
                  <input
                    type="date"
                    required
                    value={newEnd}
                    onChange={(e) => setNewEnd(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-900"
                  />
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-3 mt-2">
                <div className="text-blue-600 mt-0.5">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <p className="text-sm text-blue-800">
                  Una vez creada la temporada, podrás asignar los equipos y jugadores que formarán parte de este año deportivo.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-70"
                >
                  {isSubmitting ? 'Guardando...' : (
                    <>
                      <Save size={16} />
                      Crear Temporada
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
