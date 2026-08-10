"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  CalendarIcon, MapPin, Clock, Trophy, Shield, Plus, X, 
  ChevronLeft, ChevronRight, ClipboardCheck, Trash2
} from "lucide-react";
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  eachDayOfInterval, isSameMonth, isSameDay, isToday, parseISO, getDay, addDays
} from "date-fns";
import { es } from "date-fns/locale";
import toast, { Toaster } from "react-hot-toast";
import { createTeamEventAction, updateTeamEventAction } from "@/app/actions/event-actions";
import { ManageMatchModal } from "@/components/features/matches/ManageMatchModal";

interface TeamEvent {
  id: string;
  title: string;
  event_type: 'Entrenamiento' | 'Partido' | 'Reunión' | 'Otro';
  date: string;
  start_time: string;
  end_time?: string;
  location?: string;
  notes?: string;
  isOfficialMatch?: boolean;
}

export default function CalendarioEquipoPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = typeof params.teamId === "string" ? params.teamId : "";

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<TeamEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingMatch, setEditingMatch] = useState<any>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState<'Entrenamiento' | 'Partido' | 'Reunión' | 'Otro'>('Entrenamiento');
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("19:30");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [autoRsvp, setAutoRsvp] = useState(false);
  const [rsvpDate, setRsvpDate] = useState("");
  const [rsvpTime, setRsvpTime] = useState("19:00");

  // Recurring state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringDays, setRecurringDays] = useState<number[]>([]);
  const [recurringEndDate, setRecurringEndDate] = useState("");

  useEffect(() => {
    fetchEvents();
  }, [teamId, currentMonth]);

  const fetchEvents = async () => {
    if (!teamId) return;
    setLoading(true);
    const supabase = createClient();
    
    const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const end = format(endOfMonth(currentMonth), "yyyy-MM-dd");

    const { data: teamEvents, error: eventsError } = await supabase
      .from('team_events')
      .select('*')
      .eq('team_id', teamId)
      .gte('date', start)
      .lte('date', end);

    const { data: partidos, error: partidosError } = await supabase
      .from('partidos')
      .select('*')
      .eq('equipo_id', teamId);

    const mergedEvents: TeamEvent[] = [];
    const seenMatchDates = new Set<string>();

    if (!eventsError && teamEvents) {
      teamEvents.forEach(ev => {
        mergedEvents.push(ev);
        if (ev.event_type === 'Partido') {
          seenMatchDates.add(ev.date);
        }
      });
    }

    if (!partidosError && partidos) {
      partidos.forEach(p => {
        if (!p.fecha_hora) return;
        const dt = new Date(p.fecha_hora);
        const dateStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        if (seenMatchDates.has(dateStr)) return;

        const timeStr = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
        
        if (dateStr >= start && dateStr <= end) {
          mergedEvents.push({
            id: p.id,
            title: `Jornada vs ${p.rival_nombre || 'Rival'}`,
            event_type: 'Partido',
            date: dateStr,
            start_time: timeStr,
            location: p.lugar || "",
            notes: "Partido oficial",
            isOfficialMatch: true
          });
        }
      });
    }

    mergedEvents.sort((a, b) => {
      const timeA = new Date(`${a.date}T${a.start_time}:00`).getTime();
      const timeB = new Date(`${b.date}T${b.start_time}:00`).getTime();
      return timeA - timeB;
    });

    setEvents(mergedEvents);
    setLoading(false);
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este evento? Todo el registro de asistencias asociado también se borrará.")) return;
    
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from('team_events').delete().eq('id', eventId);
    
    if (error) {
      toast.error("Error al eliminar el evento");
      setLoading(false);
    } else {
      toast.success("Evento eliminado");
      fetchEvents();
    }
  };

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  // Calculate empty days to offset the first day of the month (Monday = 1, Sunday = 0)
  const firstDayOfMonth = startOfMonth(currentMonth).getDay();
  // Adjust so Monday is the first day of the grid
  const emptyDaysOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  const emptyDays = Array.from({ length: emptyDaysOffset });

  const getEventsForDay = (day: Date) => {
    const dayStr = format(day, "yyyy-MM-dd");
    return events.filter(e => e.date === dayStr);
  };

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setEditingEventId(null);
    setShowModal(true);
    // Pre-fill
    setTitle("");
    setEventType('Entrenamiento');
    setStartTime("18:00");
    setEndTime("19:30");
    setLocation("Campo Principal");
    setNotes("");
    setAutoRsvp(false);
    setRsvpDate("");
    setRsvpTime("19:00");
    setIsRecurring(false);
    setRecurringDays([]);
    setRecurringEndDate("");
  };

  const handleOpenEditModal = (event: TeamEvent) => {
    if (event.isOfficialMatch) {
      router.push(`/dashboard/matches/${event.id}`);
      return;
    }
    setSelectedDate(parseISO(event.date));
    setEditingEventId(event.id);
    setTitle(event.title);
    setEventType(event.event_type);
    setStartTime(event.start_time.substring(0, 5));
    setEndTime(event.end_time ? event.end_time.substring(0, 5) : "19:30");
    setLocation(event.location || "");
    setNotes(event.notes || "");
    
    // For now we don't fetch rsvp_reminder_time from the API in this view, 
    // but if we did, we would parse it here. We'll leave it as off for edits by default unless we add it to the fetch.
    setAutoRsvp(false);
    
    setShowModal(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !title) return;
    
    setSubmitting(true);
    const supabase = createClient();
    
    const eventData = {
      team_id: teamId,
      title,
      event_type: eventType,
      date: format(selectedDate, "yyyy-MM-dd"),
      start_time: startTime,
      end_time: endTime || null,
      location: location || null,
      notes: notes || null,
      rsvp_reminder_time: autoRsvp && rsvpDate && rsvpTime ? new Date(`${rsvpDate}T${rsvpTime}:00`).toISOString() : null
    };

    let errorMsg = null;
    try {
      if (editingEventId) {
        await updateTeamEventAction(editingEventId, teamId, eventData);
      } else {
        if (!isRecurring) {
          await createTeamEventAction(teamId, eventData);
        } else {
          if (!recurringEndDate || recurringDays.length === 0) {
            toast.error("Selecciona días y fecha fin para la recurrencia.");
            setSubmitting(false);
            return;
          }
          let currentDate = parseISO(format(selectedDate, 'yyyy-MM-dd'));
          const end = parseISO(recurringEndDate);
          let iterations = 0;
          let created = 0;
          
          while(currentDate <= end && iterations < 730) {
            if (recurringDays.includes(getDay(currentDate))) {
              await createTeamEventAction(teamId, { ...eventData, date: format(currentDate, 'yyyy-MM-dd') });
              created++;
            }
            currentDate = addDays(currentDate, 1);
            iterations++;
          }
          
          if (created === 0) {
            toast.error("No hay fechas válidas en el rango seleccionado.");
            setSubmitting(false);
            return;
          }
        }
      }
    } catch(e: any) {
      errorMsg = e.message;
    }
    
    setSubmitting(false);
    
    if (errorMsg) {
      toast.error("Error al guardar el evento: " + errorMsg);
    } else {
      toast.success(editingEventId ? "Evento actualizado" : "Evento creado exitosamente");
      setShowModal(false);
      fetchEvents();
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Toaster position="bottom-right" />
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex items-center gap-4">
          <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-white border border-transparent hover:border-gray-200 transition-colors">
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <h2 className="text-2xl font-bold text-slate-900 capitalize min-w-[180px] text-center">
            {format(currentMonth, "MMMM yyyy", { locale: es })}
          </h2>
          <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-white border border-transparent hover:border-gray-200 transition-colors">
            <ChevronRight size={20} className="text-gray-600" />
          </button>
        </div>
        
        <button 
          onClick={() => { setSelectedDate(new Date()); setShowModal(true); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus size={18} />
          Nuevo Evento
        </button>
      </div>

      {/* CALENDAR GRID */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Days of week header */}
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
          {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(day => (
            <div key={day} className="py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{day.substring(0,3)}</span>
            </div>
          ))}
        </div>
        
        {/* Days grid */}
        <div className="grid grid-cols-7 auto-rows-[minmax(120px,auto)] bg-gray-200 gap-px">
          {emptyDays.map((_, i) => (
            <div key={`empty-${i}`} className="bg-gray-50/50 min-h-[120px]"></div>
          ))}
          
          {daysInMonth.map((day, i) => {
            const dayEvents = getEventsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isTodayDate = isToday(day);
            
            return (
              <div 
                key={day.toString()} 
                onClick={() => handleDayClick(day)}
                className={`bg-white min-h-[120px] p-2 hover:bg-blue-50/30 transition-colors cursor-pointer group relative ${!isCurrentMonth ? 'opacity-50' : ''}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium ${isTodayDate ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-700 group-hover:text-blue-600'}`}>
                    {format(day, "d")}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="text-[10px] font-bold text-gray-400">{dayEvents.length} eventos</span>
                  )}
                </div>
                
                <div className="space-y-1 mt-1">
                  {dayEvents.slice(0, 3).map(event => (
                    <div 
                      key={event.id}
                      onClick={(e) => { e.stopPropagation(); handleOpenEditModal(event); }}
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] sm:text-xs font-bold truncate shadow-sm border cursor-pointer hover:opacity-90 transition-opacity ${
                        event.event_type === 'Entrenamiento' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        event.event_type === 'Partido' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                        'bg-amber-50 text-amber-700 border-amber-100'
                      }`}
                    >
                      <span className="shrink-0 flex items-center justify-center">
                        {event.event_type === "Partido" ? "⚽" : event.event_type === "Entrenamiento" ? "🏃" : "📅"}
                      </span>
                      <span className="truncate hidden md:inline">{event.start_time.substring(0,5)} • {event.title}</span>
                      <span className="truncate md:hidden">{event.title}</span>
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-[11px] text-gray-500 font-bold px-1 pt-1">
                      +{dayEvents.length - 3} más
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* EVENT LIST VIEW (Below calendar) */}
      <div className="mt-8">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <CalendarIcon className="text-blue-600" size={20} />
          Agenda del Mes
        </h3>
        
        {loading ? (
          <div className="text-center py-8 text-gray-500">Cargando eventos...</div>
        ) : events.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-500">
            No hay eventos programados en este mes.
          </div>
        ) : (
          <div className="space-y-3">
            {events.map(event => (
              <div key={event.id} className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border shadow-inner shrink-0 ${
                    event.event_type === 'Entrenamiento' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    event.event_type === 'Partido' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                    'bg-amber-50 text-amber-600 border-amber-100'
                  }`}>
                    {event.event_type === 'Partido' ? <Trophy size={22} /> : 
                     event.event_type === 'Entrenamiento' ? <Shield size={22} /> : 
                     <CalendarIcon size={22} />}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
                      {event.title}
                      <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${
                        event.event_type === 'Entrenamiento' ? 'bg-emerald-100 text-emerald-800' :
                        event.event_type === 'Partido' ? 'bg-blue-100 text-blue-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {event.event_type}
                      </span>
                    </h4>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mt-1 font-medium">
                      <span className="flex items-center gap-1.5 text-slate-700">
                        <Clock size={14} className="text-blue-500" />
                        {format(parseISO(event.date), "EEEE d 'de' MMMM", { locale: es })} • {event.start_time.substring(0,5)} {event.end_time ? `- ${event.end_time.substring(0,5)}` : ''}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1.5">
                          <MapPin size={14} className="text-red-400" />
                          {event.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* ACTION BUTTONS */}
                <div className="w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-0 border-gray-100 flex gap-2">
                  {event.isOfficialMatch ? (
                    <>
                      <button 
                        onClick={() => router.push(`/dashboard/matches/${event.id}`)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors"
                      >
                        Ver Partido
                      </button>
                      <button 
                        onClick={() => router.push(`/dashboard/equipos/${teamId}/partidos/${event.id}?tab=post-partido&action=pasar-lista`)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors"
                      >
                        <ClipboardCheck size={16} />
                        Pasar Lista
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={() => handleOpenEditModal(event)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-600 px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors"
                      >
                        Editar
                      </button>
                      <button 
                        onClick={() => router.push(`/dashboard/equipos/${teamId}/asistencia?eventId=${event.id}&date=${event.date}`)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors"
                      >
                        <ClipboardCheck size={16} />
                        Pasar Lista
                      </button>
                      <button 
                        onClick={() => handleDeleteEvent(event.id)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-lg text-sm font-bold shadow-sm border border-red-100 transition-colors"
                        title="Eliminar evento"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE / EDIT EVENT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <CalendarIcon className="text-blue-600" size={20} />
                {editingEventId ? "Editar Evento" : "Nuevo Evento"} - {selectedDate && format(selectedDate, "d MMMM", { locale: es })}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 hover:bg-gray-200 p-1 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveEvent} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Título del Evento</label>
                <input 
                  required 
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ej. Entrenamiento Técnico, Partido vs Rival..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Tipo</label>
                  <select 
                    value={eventType} 
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'Partido') {
                        setShowModal(false);
                        setEditingMatch({ id: 'new', fecha_hora: new Date(selectedDate || new Date()).toISOString() });
                        setShowMatchModal(true);
                        setEventType('Entrenamiento');
                      } else {
                        setEventType(val as any);
                      }
                    }}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Entrenamiento">Entrenamiento</option>
                    <option value="Partido">Partido</option>
                    <option value="Reunión">Reunión</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Ubicación</label>
                  <input 
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="Ej. Campo 1"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Hora Inicio</label>
                  <input 
                    type="time" 
                    required 
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Hora Fin (Opcional)</label>
                  <input 
                    type="time" 
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Notas (Opcional)</label>
                <textarea 
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Material necesario, tácticas a revisar..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-slate-900 min-h-[80px] focus:ring-2 focus:ring-blue-500 outline-none resize-none" 
                />
              </div>

              {/* RECURRENCIA */}
              {!editingEventId && (
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-3 mt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isRecurring}
                      onChange={e => setIsRecurring(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span className="font-bold text-blue-900">Evento Recurrente</span>
                  </label>
                  
                  {isRecurring && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200 mt-2">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Días de la semana</label>
                        <div className="flex flex-wrap gap-2">
                          {[{id: 1, label: 'L'}, {id: 2, label: 'M'}, {id: 3, label: 'X'}, {id: 4, label: 'J'}, {id: 5, label: 'V'}, {id: 6, label: 'S'}, {id: 0, label: 'D'}].map(day => (
                            <button
                              type="button"
                              key={day.id}
                              onClick={() => {
                                if (recurringDays.includes(day.id)) {
                                  setRecurringDays(recurringDays.filter(d => d !== day.id));
                                } else {
                                  setRecurringDays([...recurringDays, day.id]);
                                }
                              }}
                              className={`w-9 h-9 rounded-full font-bold flex items-center justify-center transition-colors ${recurringDays.includes(day.id) ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                            >
                              {day.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Repetir hasta (Fecha Fin)</label>
                        <input 
                          type="date" 
                          value={recurringEndDate}
                          onChange={(e) => setRecurringEndDate(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                          required={isRecurring}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mt-2">
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input 
                    type="checkbox" 
                    checked={autoRsvp}
                    onChange={(e) => setAutoRsvp(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="font-bold text-blue-900 text-sm">Programar petición de asistencia automática</span>
                </label>
                
                {autoRsvp && (
                  <div className="grid grid-cols-2 gap-4 mt-3 animate-in fade-in slide-in-from-top-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Día de envío</label>
                      <input 
                        type="date" 
                        required={autoRsvp}
                        value={rsvpDate}
                        onChange={e => setRsvpDate(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Hora de envío</label>
                      <input 
                        type="time" 
                        required={autoRsvp}
                        value={rsvpTime}
                        onChange={e => setRsvpTime(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? "Guardando..." : "Crear Evento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMatchModal && editingMatch && (
        <ManageMatchModal
          match={editingMatch}
          teamId={teamId}
          teams={[{ id: teamId, name: "Equipo actual", hex: "#000000" }]}
          onClose={() => {
            setShowMatchModal(false)
            setEditingMatch(null)
          }}
          onSave={() => {
            setShowMatchModal(false)
            setEditingMatch(null)
            fetchEvents()
          }}
        />
      )}
    </div>
  );
}
