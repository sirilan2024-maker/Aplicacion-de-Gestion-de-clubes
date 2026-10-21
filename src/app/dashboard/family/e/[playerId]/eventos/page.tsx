"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Calendar as CalendarIcon, Clock, MapPin, Star, CalendarDays, List, ChevronLeft, ChevronRight } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { CalendarGridView } from "@/components/features/events/CalendarGridView";
import { CalendarEvent } from "@/components/features/events/mock-data";

export default function FamilyEventsPage() {
  const params = useParams();
  const router = useRouter();
  const playerId = typeof params.playerId === 'string' ? params.playerId : '';

  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState("");
  const [events, setEvents] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month');

  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed

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
        // 1. Cargar entrenamientos y eventos (excluyendo partidos para evitar duplicados)
        const { data: tData, error: tError } = await supabase
          .from('team_events')
          .select('*, attendance(*)')
          .eq('team_id', pData.team_id)
          .neq('event_type', 'Partido');
            
        // 2. Cargar partidos oficiales de la temporada activa (excluyendo temporada cerrada 25/26)
        const { data: pMatches, error: pMatchesError } = await supabase
          .from('partidos')
          .select('*')
          .eq('equipo_id', pData.team_id)
          .neq('season_id', '584f508a-fc1a-4339-b5b2-4296ffde2f4c');

        if (tError) throw tError;
        
        const mergedEvents: any[] = tData ? [...tData] : [];
        
        if (!pMatchesError && pMatches) {
          pMatches.forEach(p => {
            if (!p.fecha_hora) return;
            const dt = new Date(p.fecha_hora);
            const dateStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
            const timeStr = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
            
            mergedEvents.push({
              id: p.id,
              title: `Jornada vs ${p.rival_nombre || 'Rival'}`,
              event_type: 'Partido',
              date: dateStr,
              start_time: timeStr,
              location: p.lugar || "",
              notes: "Partido oficial",
              isOfficialMatch: true,
              attendance: []
            });
          });
        }
        
        const getEventTimestamp = (e: any) => {
          if (!e.date) return 0;
          const time = (e.start_time || '00:00').substring(0, 5);
          const t = new Date(`${e.date}T${time}:00`).getTime();
          return isNaN(t) ? new Date(e.date).getTime() : t;
        };

        mergedEvents.sort((a, b) => getEventTimestamp(a) - getEventTimestamp(b));

        setEvents(mergedEvents);
      }

    } catch (err: any) {
      toast.error("Error al cargar eventos: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const goToToday = () => {
    const d = new Date();
    setCurrentYear(d.getFullYear());
    setCurrentMonth(d.getMonth());
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const calendarEvents: CalendarEvent[] = events.map(e => ({
    id: e.id,
    title: e.title || (e.event_type === 'Partido' ? 'Partido Oficial' : 'Entrenamiento'),
    date: e.date,
    time: (e.start_time || '00:00').substring(0, 5),
    type: e.event_type === 'Partido' ? 'Partido' : 'Entrenamiento',
    teamId: e.team_id || '',
    teamName: teamName,
    teamColor: e.event_type === 'Partido' ? 'bg-indigo-600' : 'bg-emerald-600',
    teamHex: e.event_type === 'Partido' ? '#4f46e5' : '#059669',
    location: e.location || (e.event_type === 'Partido' ? 'Campo Oficial' : 'Instalaciones del Club'),
    isOfficialMatch: Boolean(e.isOfficialMatch)
  }));

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      <Toaster position="top-right" />
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
            <Star size={24} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Calendario & Eventos</h1>
            <p className="text-gray-500 text-xs sm:text-sm">Agenda de partidos y entrenamientos de {teamName}</p>
          </div>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200 self-stretch sm:self-auto justify-center">
          <button
            onClick={() => setViewMode('month')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              viewMode === 'month'
                ? 'bg-white text-blue-600 shadow-sm border border-gray-200/50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <CalendarDays size={16} />
            Mes
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              viewMode === 'list'
                ? 'bg-white text-blue-600 shadow-sm border border-gray-200/50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <List size={16} />
            Lista
          </button>
        </div>
      </div>

      {viewMode === 'month' ? (
        <div className="space-y-4">
          {/* Month navigation bar */}
          <div className="flex items-center justify-between bg-white p-3 sm:p-4 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-gray-900 capitalize">
                {monthNames[currentMonth]} {currentYear}
              </h2>
              <button
                onClick={goToToday}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-md transition-colors"
              >
                Hoy
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={prevMonth}
                aria-label="Mes anterior"
                className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={nextMonth}
                aria-label="Mes siguiente"
                className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Month grid */}
          <CalendarGridView
            year={currentYear}
            month={currentMonth}
            events={calendarEvents}
            today={today}
            onEventClick={(ev) => {
              if (ev.isOfficialMatch) {
                router.push(`/dashboard/family/e/${playerId}/partidos/${ev.id}`);
              }
            }}
          />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {!events.length ? (
            <div className="p-8 text-center text-gray-500">No hay eventos programados.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {events.map((e) => {
                const date = new Date(e.date);
                const eventAttendance = e.attendance?.find((a: any) => a.player_id === playerId) || null;
                
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                const evDateOnly = new Date(e.date);
                evDateOnly.setHours(0, 0, 0, 0);
                const diffDays = Math.ceil((evDateOnly.getTime() - now.getTime()) / (1000 * 3600 * 24));
                const isFutureLocked = diffDays > 7;
                const isPast = diffDays < 0;

                return (
                  <div key={e.id} className="p-6 flex flex-col md:flex-row md:items-start justify-between gap-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0 border ${
                        e.isOfficialMatch
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                          : 'bg-amber-50 text-amber-600 border-amber-100'
                      }`}>
                        <span className="text-xs font-bold uppercase tracking-wider">{date.toLocaleDateString('es-ES', { month: 'short' })}</span>
                        <span className="text-xl font-black leading-none">{date.getDate()}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-900">{e.title || 'Evento'}</h3>
                          {e.isOfficialMatch && (
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
                              Oficial FFCV
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-1.5">
                          <div className="flex items-center gap-1.5 text-sm text-gray-500">
                            <Clock size={14} />
                            {e.start_time?.slice(0, 5) || '--:--'} {e.end_time ? `- ${e.end_time.slice(0, 5)}` : ''}
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
                    
                    {/* Attendance Controls */}
                    <div className="flex items-center gap-2 mt-4 md:mt-0 shrink-0">
                      {e.isOfficialMatch ? (
                        <button
                          onClick={() => router.push(`/dashboard/family/e/${playerId}/partidos/${e.id}`)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm transition-colors text-sm w-full md:w-auto text-center"
                        >
                          Ver Partido
                        </button>
                      ) : isFutureLocked ? (
                        <span className="text-xs font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-3 py-2 rounded-lg flex items-center gap-1.5">
                          <Clock size={13} className="text-slate-400 shrink-0" />
                          Convocatoria abierta 7 días antes
                        </span>
                      ) : isPast ? (
                        <span className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${
                          eventAttendance?.status === 'present'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : eventAttendance?.status === 'absent'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-slate-50 text-slate-500 border-slate-200'
                        }`}>
                          {eventAttendance?.status === 'present' ? '✅ Asistió' : eventAttendance?.status === 'absent' ? '❌ No asistió' : 'Finalizado'}
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={async () => {
                              const res = await fetch(`/api/events/${e.id}/attendance`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ playerId, status: 'present' })
                              });
                              if (res.ok) fetchEvents();
                              else toast.error("Error al confirmar asistencia");
                            }}
                            className={`flex-1 md:flex-none font-bold py-2 px-4 rounded-lg shadow-sm transition-colors text-sm ${
                              eventAttendance?.status === 'present' 
                                ? 'bg-emerald-600 text-white ring-2 ring-emerald-600 ring-offset-2' 
                                : 'bg-white text-gray-700 border border-gray-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
                            }`}
                          >
                            {eventAttendance?.status === 'present' ? '✅ Asistencia Confirmada' : 'Sí, asistiré'}
                          </button>
                          <button
                            onClick={async () => {
                              const res = await fetch(`/api/events/${e.id}/attendance`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ playerId, status: 'absent' })
                              });
                              if (res.ok) fetchEvents();
                              else toast.error("Error al rechazar asistencia");
                            }}
                            className={`flex-1 md:flex-none font-bold py-2 px-4 rounded-lg shadow-sm transition-colors text-sm ${
                              eventAttendance?.status === 'absent'
                                ? 'bg-rose-600 text-white ring-2 ring-rose-600 ring-offset-2'
                                : 'bg-white text-gray-700 border border-gray-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'
                            }`}
                          >
                            {eventAttendance?.status === 'absent' ? '❌ No asistiré' : 'No podré'}
                          </button>
                        </>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
