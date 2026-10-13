"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { submitTrainingFeedback } from "@/app/actions/feedback-actions";
import { calculatePlannedTrainingDuration } from "@/lib/performance/minutes-service";
import { DailyWellnessForm } from "@/components/features/performance/DailyWellnessForm";
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
  const searchParams = useSearchParams();
  const eventId = typeof params.eventId === 'string' ? params.eventId : '';

  const initialPlayerId = searchParams.get('p') || '';
  const token = searchParams.get('token') || '';
  const tokenExp = searchParams.get('exp') ? parseInt(searchParams.get('exp')!) : undefined;
  const formTypeParam = (searchParams.get('type') || 'rpe') as 'rpe' | 'wellness';

  const [loading, setLoading] = useState(true);
  const [eventDetails, setEventDetails] = useState<any>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teamName, setTeamName] = useState("");

  const [selectedPlayerId, setSelectedPlayerId] = useState(initialPlayerId);
  const [isLockedPlayer, setIsLockedPlayer] = useState(Boolean(initialPlayerId));
  const [rpe, setRpe] = useState<number>(0);
  const [minutes, setMinutes] = useState<number>(90);
  const [isFallbackDuration, setIsFallbackDuration] = useState(true);
  
  // Molestias sobrevenidas post-entrenamiento
  const [hasDiscomfort, setHasDiscomfort] = useState(false);
  const [discomfortZone, setDiscomfortZone] = useState("");
  const [discomfortIntensity, setDiscomfortIntensity] = useState<number>(5);
  const [discomfortNotes, setDiscomfortNotes] = useState("");

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

    // Calcular duración prevista a partir de horarios
    const planned = calculatePlannedTrainingDuration(evData.start_time, evData.end_time);
    setMinutes(planned.durationMinutes);
    setIsFallbackDuration(planned.isFallback);

    // Fetch Players
    const { data: plData } = await supabase
      .from('players')
      .select('id, first_name, last_name')
      .eq('team_id', evData.team_id)
      .order('first_name');
      
    if (plData) {
      setPlayers(plData);
      if (initialPlayerId && plData.some(p => p.id === initialPlayerId)) {
        setSelectedPlayerId(initialPlayerId);
        setIsLockedPlayer(true);
      }
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
    const result = await submitTrainingFeedback(
      eventId,
      selectedPlayerId,
      rpe,
      minutes,
      {
        token: token && tokenExp ? token : undefined,
        tokenExp: token && tokenExp ? tokenExp : undefined,
        discomfort: hasDiscomfort ? {
          hasDiscomfort: true,
          zone: discomfortZone || 'Sobrecarga general',
          intensity: discomfortIntensity,
          notes: discomfortNotes || null
        } : undefined
      }
    );
    setSubmitting(false);

    if (result.success) {
      setSubmitted(true);
    } else {
      toast.error(result.error || "No se pudo registrar la evaluación.");
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

  if (formTypeParam === 'wellness') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 py-8">
        <DailyWellnessForm
          eventId={eventId}
          eventDetails={eventDetails}
          players={players}
          initialPlayerId={selectedPlayerId}
          isLockedPlayer={isLockedPlayer}
          token={token || undefined}
          tokenExp={tokenExp || undefined}
          teamName={teamName}
        />
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
              {isLockedPlayer ? (
                <div className="w-full bg-slate-100 border-2 border-slate-200 rounded-xl px-4 py-3 text-gray-900 font-bold flex items-center justify-between">
                  <span>
                    {players.find(p => p.id === selectedPlayerId)?.first_name}{' '}
                    {players.find(p => p.id === selectedPlayerId)?.last_name || ''}
                  </span>
                  <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold">Verificado</span>
                </div>
              ) : (
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
              )}
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
              <p className="text-xs text-gray-500">
                {isFallbackDuration
                  ? "Duración estimada (90 min). Modifícalo si tu tiempo real de participación fue distinto."
                  : `Duración prevista de la sesión: ${minutes} min. Modifícalo si terminaste antes o llegaste tarde.`}
              </p>
            </div>

            {/* 4. MOLESTIAS SOBREVENIDAS (OPCIONAL) */}
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-gray-700">
                  4. ¿Has sentido alguna molestia durante el entreno?
                </label>
                <button
                  type="button"
                  onClick={() => setHasDiscomfort(!hasDiscomfort)}
                  className={`text-xs font-bold px-3 py-1 rounded-full transition-colors ${
                    hasDiscomfort ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {hasDiscomfort ? 'Sí, reportar' : 'No, todo bien'}
                </button>
              </div>

              {hasDiscomfort && (
                <div className="space-y-3 bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80 animate-in fade-in duration-200">
                  <div>
                    <label className="block text-xs font-bold text-amber-900 mb-1">
                      Zona anatómica de la molestia:
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Isquiotibial izquierdo, aductor, tobillo..."
                      value={discomfortZone}
                      onChange={(e) => setDiscomfortZone(e.target.value)}
                      className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-800 outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-amber-900">Intensidad del dolor/molestia:</span>
                      <span className="text-xs font-black text-amber-900">{discomfortIntensity} / 10</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={discomfortIntensity}
                      onChange={(e) => setDiscomfortIntensity(parseInt(e.target.value) || 1)}
                      className="w-full accent-amber-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-amber-700/80 font-bold">
                      <span>1 (Leve)</span>
                      <span>5 (Moderada)</span>
                      <span>10 (Muy aguda)</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-amber-900 mb-1">
                      Observaciones / Cuándo ocurrió (opcional):
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Ej: En un sprint al final del partidillo, sobrecarga tras golpe..."
                      value={discomfortNotes}
                      onChange={(e) => setDiscomfortNotes(e.target.value)}
                      className="w-full bg-white border border-amber-200 rounded-xl p-2.5 text-xs text-gray-800 outline-none focus:border-amber-400 resize-none"
                    />
                  </div>
                  <p className="text-[11px] text-amber-700 italic">
                    * Aviso preventivo para el cuerpo técnico y preparador físico. No sustituye la valoración médica.
                  </p>
                </div>
              )}
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
