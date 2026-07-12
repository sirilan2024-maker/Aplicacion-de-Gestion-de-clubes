"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Target, Calendar as CalendarIcon, Clock, MapPin } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function FamilyTrainingsPage() {
  const params = useParams();
  const playerId = typeof params.playerId === 'string' ? params.playerId : '';

  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState("");
  const [trainings, setTrainings] = useState<any[]>([]);

  useEffect(() => {
    fetchTrainings();
  }, [playerId]);

  const fetchTrainings = async () => {
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
        const { data: tData, error: tError } = await supabase
          .from('team_events')
          .select('*')
          .eq('team_id', pData.team_id)
          .eq('event_type', 'Entrenamiento')
          .order('date', { ascending: false });

        if (tError) throw tError;
        setTrainings(tData || []);
      }

    } catch (err: any) {
      toast.error("Error al cargar entrenamientos: " + err.message);
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
    <div className="p-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      <Toaster position="top-right" />
      
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
          <Target size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Entrenamientos</h1>
          <p className="text-gray-500 text-sm">Sesiones del {teamName}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {!trainings.length ? (
          <div className="p-8 text-center text-gray-500">No hay entrenamientos programados.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {trainings.map((t) => {
              const date = new Date(t.date);
              return (
                <div key={t.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-xl flex flex-col items-center justify-center shrink-0 border border-blue-100">
                      <span className="text-xs font-bold uppercase tracking-wider">{date.toLocaleDateString('es-ES', { month: 'short' })}</span>
                      <span className="text-xl font-black leading-none">{date.getDate()}</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{t.title || 'Sesión de Entrenamiento'}</h3>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5">
                        <div className="flex items-center gap-1.5 text-sm text-gray-500">
                          <Clock size={14} />
                          {t.start_time?.slice(0, 5) || '--:--'} - {t.end_time?.slice(0, 5) || '--:--'}
                        </div>
                        {t.location && (
                          <div className="flex items-center gap-1.5 text-sm text-gray-500">
                            <MapPin size={14} />
                            {t.location}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
