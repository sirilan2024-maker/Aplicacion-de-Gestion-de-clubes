"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Calendar as CalendarIcon, Clock, MapPin, Star } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function FamilyEventsPage() {
  const params = useParams();
  const playerId = typeof params.playerId === 'string' ? params.playerId : '';

  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState("");
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    fetchEvents();
  }, [playerId]);

  const fetchEvents = async () => {
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
          .eq('event_type', 'otro')
          .order('event_date', { ascending: false });

        if (tError) throw tError;
        setEvents(tData || []);
      }

    } catch (err: any) {
      toast.error("Error al cargar eventos: " + err.message);
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
        <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
          <Star size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Eventos de Club</h1>
          <p className="text-gray-500 text-sm">Calendario de eventos para {teamName}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {!events.length ? (
          <div className="p-8 text-center text-gray-500">No hay eventos especiales programados.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {events.map((e) => {
              const date = new Date(e.event_date);
              return (
                <div key={e.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-xl flex flex-col items-center justify-center shrink-0 border border-amber-100">
                      <span className="text-xs font-bold uppercase tracking-wider">{date.toLocaleDateString('es-ES', { month: 'short' })}</span>
                      <span className="text-xl font-black leading-none">{date.getDate()}</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{e.title || 'Evento'}</h3>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5">
                        <div className="flex items-center gap-1.5 text-sm text-gray-500">
                          <Clock size={14} />
                          {e.start_time?.slice(0, 5) || '--:--'} - {e.end_time?.slice(0, 5) || '--:--'}
                        </div>
                        {e.location && (
                          <div className="flex items-center gap-1.5 text-sm text-gray-500">
                            <MapPin size={14} />
                            {e.location}
                          </div>
                        )}
                      </div>
                      {e.notes && (
                        <p className="mt-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                          {e.notes}
                        </p>
                      )}
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
