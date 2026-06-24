"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { submitTrainingFeedback } from "@/app/actions/feedback-actions";
import { Activity, Clock, CheckCircle2, Loader2, Target } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

interface Player {
  id: string;
  first_name: string;
  last_name: string;
}

export default function PlayerFeedbackPage() {
  const params = useParams();
  const eventId = typeof params.eventId === 'string' ? params.eventId : '';

  const [loading, setLoading] = useState(true);
  const [eventDetails, setEventDetails] = useState<any>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teamName, setTeamName] = useState("");

  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [rpe, setRpe] = useState<number>(0);
  const [minutes, setMinutes] = useState<number>(90); // Default to 90
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const fetchData = async () => {
    if (!eventId) return;
    const supabase = createClient();
    
    // Fetch Event
    const { data: evData, error: evErr } = await supabase
      .from('team_events')
      .select('*, teams (name)')
      .eq('id', eventId)
      .single();

    if (evErr || !evData) {
      setLoading(false);
      return;
    }

    setEventDetails(evData);
    setTeamName(evData.teams?.name || "Equipo");

    // Fetch Players
    const { data: plData } = await supabase
      .from('players')
      .select('id, first_name, last_name')
      .eq('team_id', evData.team_id)
      .order('first_name');
      
    if (plData) {
      setPlayers(plData);
    }
    
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayerId || rpe === 0) {
      toast.error("Por favor, selecciona tu nombre y tu nivel de esfuerzo.");
      return;
    }

    setSubmitting(true);
    const result = await submitTrainingFeedback(eventId, selectedPlayerId, rpe, minutes);
    setSubmitting(false);

    if (result.success) {
      setSubmitted(true);
    } else {
      toast.error(result.error || "Error al enviar los datos.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <p className="text-gray-500 font-medium">Cargando sesión...</p>
      </div>
    );
  }

  if (!eventDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md w-full">
          <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Sesión no encontrada</h2>
          <p className="text-gray-500">Este enlace ya no es válido o la sesión ha sido eliminada.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md w-full border-t-4 border-emerald-500 animate-in zoom-in duration-500">
          <CheckCircle2 className="w-20 h-20 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Datos Enviados!</h2>
          <p className="text-gray-500">
            Gracias por rellenar tu evaluación. Tus datos han sido guardados correctamente en el sistema.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans">
      <Toaster position="top-center" />
      
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 animate-in slide-in-from-bottom-8 duration-500">
        
        {/* HEADER */}
        <div className="bg-blue-600 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-blue-700 opacity-20 transform -skew-y-6 origin-top-left z-0"></div>
          <div className="relative z-10">
            <h1 className="text-2xl font-black tracking-tight mb-1">{teamName}</h1>
            <p className="text-blue-100 font-medium">Control de Carga Post-Entrenamiento</p>
          </div>
        </div>

        <div className="p-6">
          <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100 text-center">
            <h2 className="font-bold text-gray-900">{eventDetails.title}</h2>
            <div className="text-sm text-gray-500 mt-1 flex items-center justify-center gap-2">
              <CalendarDaysIcon size={14} />
              {format(parseISO(eventDetails.date), "EEEE d 'de' MMMM", { locale: es })}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* JUGADOR */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">
                1. ¿Quién eres?
              </label>
              <select
                value={selectedPlayerId}
                onChange={(e) => setSelectedPlayerId(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-medium focus:ring-0 focus:border-blue-500 outline-none transition-colors"
                required
              >
                <option value="">Selecciona tu nombre...</option>
                {players.map(p => (
                  <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                ))}
              </select>
            </div>

            {/* RPE */}
            <div className="space-y-3">
              <label className="block text-sm font-bold text-gray-700 flex items-center justify-between">
                <span>2. ¿Cómo de duro ha sido? (RPE)</span>
                <span className="text-blue-600 font-black text-lg">{rpe || '-'}</span>
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[1,2,3,4,5,6,7,8,9,10].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setRpe(val)}
                    className={`h-12 rounded-xl font-black text-lg transition-all ${
                      rpe === val 
                        ? val <= 3 ? 'bg-emerald-500 text-white transform scale-110 shadow-md' 
                          : val <= 6 ? 'bg-yellow-500 text-white transform scale-110 shadow-md'
                          : val <= 8 ? 'bg-orange-500 text-white transform scale-110 shadow-md'
                          : 'bg-red-500 text-white transform scale-110 shadow-md'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-xs font-bold text-gray-400 uppercase px-1">
                <span>Muy Suave</span>
                <span>Extremo</span>
              </div>
            </div>

            {/* MINUTOS */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700 flex items-center gap-2">
                <Clock size={16} className="text-blue-500" />
                3. Minutos entrenados
              </label>
              <input
                type="number"
                min="1"
                max="300"
                value={minutes}
                onChange={(e) => setMinutes(parseInt(e.target.value) || 0)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-bold text-lg focus:ring-0 focus:border-blue-500 outline-none transition-colors"
                required
              />
              <p className="text-xs text-gray-500">Normalmente 90 mins. Cámbialo solo si llegaste tarde o te retiraste antes.</p>
            </div>

            <button
              type="submit"
              disabled={submitting || !selectedPlayerId || rpe === 0}
              className="w-full bg-gray-900 hover:bg-black text-white font-bold text-lg py-4 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4 shadow-lg shadow-gray-200"
            >
              {submitting ? <Loader2 size={24} className="animate-spin" /> : <Activity size={24} />}
              Enviar Datos
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function CalendarDaysIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
  );
}
