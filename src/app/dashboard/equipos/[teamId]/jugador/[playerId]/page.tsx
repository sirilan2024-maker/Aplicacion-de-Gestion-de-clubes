"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  ArrowLeft, User as UserIcon, Activity, FileText, 
  Calendar, CheckCircle, Clock, HeartPulse, Edit3, 
  Save, AlertCircle, Camera, UploadCloud, Loader2, X, TrendingUp, AlertTriangle
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { differenceInDays, parseISO } from "date-fns";

interface PlayerData {
  id: string;
  first_name: string;
  last_name: string;
  posicion: string;
  dorsal: number | null;
  birth_date: string | null;
  email: string | null;
  phone: string | null;
  parent_contact: string | null;
  height: number | null;
  weight: number | null;
  medical_notes: string | null;
  accumulated_minutes: number;
  technical_rating: number | null;
  status: string;
  avatar_url: string | null;
  
  // Campos Extendidos
  nickname: string | null;
  join_year: number | null;
  license_number: string | null;
  parent1_name: string | null;
  parent1_last_name: string | null;
  parent1_email: string | null;
  parent1_phone: string | null;
  parent2_name: string | null;
  parent2_last_name: string | null;
  parent2_email: string | null;
  parent2_phone: string | null;
}

export default function PlayerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const teamId = typeof params.teamId === 'string' ? params.teamId : '';
  const playerId = typeof params.playerId === 'string' ? params.playerId : '';

  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'medico' | 'stats' | 'asistencia' | 'disciplina'>('info');

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<PlayerData>>({});
  const [saving, setSaving] = useState(false);

  // Attendance states for the individual player
  const [playerEvents, setPlayerEvents] = useState<any[]>([]);
  const [playerAttendance, setPlayerAttendance] = useState<any[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [measurementsHistory, setMeasurementsHistory] = useState<any[]>([]);

  // ACWR & History State
  const [acwrData, setAcwrData] = useState<{ acute: number, chronic: number, acwr: number } | null>(null);
  const [trainingHistory, setTrainingHistory] = useState<any[]>([]);
  const [matchHistory, setMatchHistory] = useState<any[]>([]);
  const [statsViewMode, setStatsViewMode] = useState<'entrenamientos' | 'partidos'>('entrenamientos');
  const [showAllTrainings, setShowAllTrainings] = useState(false);
  const [showAllMatches, setShowAllMatches] = useState(false);
  const [attendanceFilter, setAttendanceFilter] = useState<'todos' | 'entrenamientos' | 'partidos'>('todos');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'info' || tab === 'medico' || tab === 'stats' || tab === 'asistencia' || tab === 'disciplina') {
        setActiveTab(tab);
      }
      const view = params.get('view');
      if (view === 'entrenamientos' || view === 'partidos') {
        setStatsViewMode(view);
      }
    }
  }, []);

  useEffect(() => {
    fetchPlayer();
  }, [playerId]);

  useEffect(() => {
    if (activeTab === 'asistencia') {
      fetchPlayerAttendance();
    } else if (activeTab === 'stats') {
      fetchPlayerACWR();
    } else if (activeTab === 'medico') {
      fetchPlayerMeasurements();
    }
  }, [activeTab, playerId, teamId]);

  const fetchPlayer = async () => {
    setLoading(true);
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('id', playerId)
        .single();
        
      if (error) throw error;
      setPlayer(data);
      setEditData(data);
    } catch (err: any) {
      toast.error("Error al cargar jugador: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayerACWR = async () => {
    const supabase = createClient();
    try {
      const { data: teamData } = await supabase.from('equipos').select('club_id').eq('id', teamId).single();
      if (!teamData) return;
      
      const { data: metrics } = await supabase.from('club_metrics').select('id, name').eq('club_id', teamData.club_id);
      const rpeMetricId = metrics?.find(m => m.name.toLowerCase().includes('rpe'))?.id;
      const minMetricId = metrics?.find(m => m.name.toLowerCase().includes('minutos'))?.id;

      // Fetch all past events for this team
      const todayIso = new Date().toISOString().split('T')[0];
      const { data: allEvents } = await supabase
        .from('team_events')
        .select('id, date, title, event_type, start_time')
        .eq('team_id', teamId)
        .lte('date', todayIso)
        .order('date', { ascending: false });

      if (!allEvents || allEvents.length === 0) return;

      const eventIds = allEvents.map(e => e.id);

      // Fetch Attendance
      const { data: attData } = await supabase
        .from('attendance')
        .select('event_id, status')
        .eq('player_id', playerId)
        .in('event_id', eventIds);

      // Fetch Convocatorias for Match History
      const { data: convocatoriasData } = await supabase
        .from('convocatorias')
        .select('*, partidos:partido_id(*)')
        .eq('player_id', playerId);

      // Fetch Metrics if metrics exist
      let ptData: any[] = [];
      try {
        const res = await fetch('/api/player-metrics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId, eventIds })
        });
        const json = await res.json();
        ptData = json.data || [];
      } catch (err) {
        console.error("Error fetching player metrics via API:", err);
      }

      // Arrays for History
      const tHistory: any[] = [];
      const mHistory: any[] = [];
      const dailyLoads: Record<string, number> = {};

      allEvents.forEach(ev => {
        const att = attData?.find(a => a.event_id === ev.id);
        const rpe = ptData.find(m => m.event_id === ev.id && m.club_metrics?.name?.toLowerCase().includes('rpe'))?.value_number;
        const min = ptData.find(m => m.event_id === ev.id && m.club_metrics?.name?.toLowerCase().includes('minutos'))?.value_number;
        const goles = ptData.find(m => m.event_id === ev.id && m.club_metrics?.name?.toLowerCase() === 'goles')?.value_number;
        const asist = ptData.find(m => m.event_id === ev.id && m.club_metrics?.name?.toLowerCase() === 'asistencias')?.value_number;

        if (ev.event_type === 'Entrenamiento') {
          tHistory.push({ ...ev, attendance: att?.status, rpe, minutes: min });
          if (rpe !== undefined && min !== undefined && rpe !== null && min !== null) {
            dailyLoads[ev.date] = (dailyLoads[ev.date] || 0) + (rpe * min);
          }
        }
      });

      if (convocatoriasData) {
        convocatoriasData.forEach(c => {
          if (c.partidos) {
            mHistory.push({
              id: c.partido_id,
              date: c.partidos.fecha_hora,
              title: `vs ${c.partidos.rival_nombre} (${c.partidos.lugar})`,
              attendance: c.estado_asistencia,
              minutes: c.minutes_played,
              goles: c.goals,
              asistencias: c.assists,
              coach_rating: c.coach_rating,
              actitud: c.actitud,
              amarillas: c.yellow_cards,
              rojas: c.red_cards
            });
          }
        });
        // Sort by date descending
        mHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }

      setTrainingHistory(tHistory);
      setMatchHistory(mHistory);

      // ACWR Calc
      // Determine the reference date for ACWR (latest training date)
      const dates = Object.keys(dailyLoads).map(d => parseISO(d).getTime());
      const referenceDate = dates.length > 0 ? new Date(Math.max(...dates)) : new Date();

      let acuteSum = 0; let acuteDays = 0;
      let chronicSum = 0; let chronicDays = 0;

      Object.entries(dailyLoads).forEach(([dateStr, load]) => {
        const diff = Math.abs(differenceInDays(referenceDate, parseISO(dateStr)));
        if (diff <= 7) { acuteSum += load; acuteDays++; }
        if (diff <= 28) { chronicSum += load; chronicDays++; }
      });

      const acuteLoad = acuteDays > 0 ? acuteSum / 7 : 0;
      const chronicLoad = chronicDays > 0 ? chronicSum / 28 : 0;
      const acwr = chronicLoad > 0 ? acuteLoad / chronicLoad : 0;

      if (chronicLoad > 0 || acuteLoad > 0) {
        setAcwrData({ acute: acuteLoad, chronic: chronicLoad, acwr });
      }
    } catch (err) {
      console.error("Error fetching ACWR/Stats:", err);
    }
  };

  const fetchPlayerAttendance = async () => {
    setAttendanceLoading(true);
    const supabase = createClient();
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch all past events for this team
      const { data: events } = await supabase
        .from('team_events')
        .select('*')
        .eq('team_id', teamId)
        .lte('date', today)
        .order('date', { ascending: false });
        
      setPlayerEvents(events || []);

      // Fetch attendance records specifically for this player
      const { data: atts } = await supabase
        .from('attendance')
        .select('*')
        .eq('player_id', playerId);
        
      setPlayerAttendance(atts || []);
    } catch (err) {
      console.error(err);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const fetchPlayerMeasurements = async () => {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('player_measurements')
        .select('*')
        .eq('player_id', playerId)
        .order('date', { ascending: false });
      
      if (!error && data) {
        setMeasurementsHistory(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    if (!player) return;
    setSaving(true);
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('players')
        .update(editData)
        .eq('id', player.id);
        
      if (error) throw error;

      // Si cambió el peso o la altura, guardamos en el historial
      if (
        (editData.weight && editData.weight !== player.weight) ||
        (editData.height && editData.height !== player.height)
      ) {
        const h = editData.height || player.height;
        const w = editData.weight || player.weight;
        let bmi = null;
        if (h && w && h > 0) {
          bmi = parseFloat((w / (h * h)).toFixed(1));
        }

        const today = new Date().toISOString().split('T')[0];
        
        // Comprobar si ya hay un registro hoy
        const { data: existing } = await supabase
          .from('player_measurements')
          .select('id')
          .eq('player_id', player.id)
          .eq('date', today)
          .maybeSingle();

        if (existing) {
          await supabase.from('player_measurements').update({
            weight: w, height: h, bmi
          }).eq('id', existing.id);
        } else {
          await supabase.from('player_measurements').insert({
            player_id: player.id,
            date: today,
            weight: w, height: h, bmi
          });
        }
        
        // Refrescar historial
        if (activeTab === 'medico') {
          fetchPlayerMeasurements();
        }
      }

      toast.success("Información guardada correctamente");
      setPlayer({ ...player, ...editData } as PlayerData);
      setIsEditing(false);
    } catch (err: any) {
      toast.error("Error al guardar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const uploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !player) return;
    
    // Validar tamaño (máx 5MB) y tipo (imagen)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen es demasiado grande. Máximo 5MB.");
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error("El archivo debe ser una imagen.");
      return;
    }

    const toastId = toast.loading("Subiendo foto...");
    const supabase = createClient();
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${player.id}-${Math.random()}.${fileExt}`;
      const filePath = `jugadores/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('players')
        .update({ avatar_url: publicUrl })
        .eq('id', player.id);

      if (updateError) throw updateError;

      setPlayer({ ...player, avatar_url: publicUrl });
      toast.success("Foto actualizada", { id: toastId });
    } catch (error: any) {
      toast.error("Error al subir la foto: " + error.message, { id: toastId });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="text-center p-12">
        <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Jugador no encontrado</h2>
        <button onClick={() => router.back()} className="mt-4 text-blue-600 hover:underline">
          Volver al equipo
        </button>
      </div>
    );
  }

  const esEntrenador = player.posicion?.toLowerCase().includes('entrenador') || player.posicion?.toLowerCase().includes('delegado') || player.posicion?.toLowerCase().includes('técnico');

  const calcularEdad = (fechaNacimiento: string | null) => {
    if (!fechaNacimiento) return null;
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const m = hoy.getMonth() - nacimiento.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad;
  };

  const edadJugador = calcularEdad(player.birth_date);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Toaster position="top-right" />
      
      {/* Navegación */}
      <button 
        onClick={() => router.back()}
        className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-6 group"
      >
        <ArrowLeft size={16} className="mr-1 group-hover:-translate-x-1 transition-transform" />
        Volver a la plantilla
      </button>

      {/* Cabecera del Perfil */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6 relative">
        {player.status === 'inactive' && (
          <div className="bg-orange-50 border-b border-orange-200 p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-orange-800 font-medium">
              <AlertCircle size={20} />
              <span>Este jugador está en el Archivo Histórico. Sus datos son de solo lectura. Para editarlo, debes restaurarlo primero.</span>
            </div>
          </div>
        )}
        <div className="h-32 bg-gradient-to-r from-blue-700 to-indigo-800"></div>
        <div className="px-4 sm:px-8 pb-8">
          <div className="relative flex flex-col sm:flex-row sm:justify-between items-start sm:items-end -mt-12 mb-4 gap-4">
            <div className="flex items-end gap-4 sm:gap-6">
              <div className="relative group min-w-24 w-24 h-24 sm:min-w-28 sm:w-28 sm:h-28 bg-white rounded-2xl shadow-lg border-4 border-white flex items-center justify-center overflow-hidden">
                {player.avatar_url ? (
                  <img src={player.avatar_url} alt={player.first_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300">
                    <UserIcon size={56} />
                  </div>
                )}
                
                {/* Botón flotante para subir foto */}
                <label className="absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera size={24} className="mb-1" />
                  <span className="text-xs font-bold">Cambiar Foto</span>
                  <input type="file" className="hidden" accept="image/*" onChange={uploadPhoto} />
                </label>
              </div>
              <div className="pb-2">
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                    {player.first_name} {player.last_name}
                  </h1>
                  {player.dorsal && (
                    <span className="bg-gray-900 text-white font-bold px-2 py-0.5 rounded text-lg">
                      {player.dorsal}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 text-gray-600 font-medium">
                  <span className="capitalize">{player.posicion || 'Sin posición'}</span>
                  {edadJugador !== null && (
                    <>
                      <span>•</span>
                      <span>{edadJugador} años</span>
                    </>
                  )}
                  <span>•</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    player.status === 'Lesionado' ? 'bg-red-100 text-red-700' :
                    player.status === 'Sancionado' ? 'bg-orange-100 text-orange-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {player.status || 'Activo'}
                  </span>
                </div>
              </div>
            </div>
            {!isEditing ? (
              <button 
                onClick={() => setIsEditing(true)}
                disabled={player.status === 'inactive'}
                className="flex items-center justify-center w-full sm:w-auto gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2 sm:mt-0"
                title={player.status === 'inactive' ? 'Jugador archivado (solo lectura)' : ''}
              >
                <Edit3 size={16} /> Editar Perfil
              </button>
            ) : (
              <div className="flex w-full sm:w-auto gap-2 mt-2 sm:mt-0">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="flex-1 sm:flex-none px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors text-center"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <Save size={16} /> {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navegación por pestañas */}
      <div className="mb-6">
        {/* Selector en móvil */}
        <div className="md:hidden">
          <label htmlFor="tabs" className="sr-only">Seleccionar pestaña</label>
          <select
            id="tabs"
            name="tabs"
            className="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm bg-gray-50 font-bold text-gray-700 shadow-sm"
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value as any)}
          >
            <option value="info">Info Personal</option>
            <option value="medico">Físico & Médico</option>
            {!esEntrenador && <option value="stats">Estadísticas</option>}
            {!esEntrenador && <option value="asistencia">Asistencia</option>}
            {!esEntrenador && <option value="disciplina">Disciplina</option>}
          </select>
        </div>

        {/* Botones en desktop */}
        <div className="hidden md:flex overflow-x-auto no-scrollbar border-b border-gray-200 gap-6">
          <button 
            onClick={() => setActiveTab('info')}
            className={`pb-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'info' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText size={18} /> Info Personal
          </button>
          <button 
            onClick={() => setActiveTab('medico')}
            className={`pb-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'medico' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <HeartPulse size={18} /> Físico & Médico
          </button>
          {!esEntrenador && (
            <>
              <button 
                onClick={() => setActiveTab('stats')}
                className={`pb-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                  activeTab === 'stats' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Activity size={18} /> Estadísticas
              </button>
              <button 
                onClick={() => setActiveTab('asistencia')}
                className={`pb-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                  activeTab === 'asistencia' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Calendar size={18} /> Asistencia
              </button>
              <button 
                onClick={() => setActiveTab('disciplina')}
                className={`pb-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                  activeTab === 'disciplina' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <AlertTriangle size={18} /> Disciplina
              </button>
            </>
          )}
        </div>
      </div>

      {/* Contenido de las pestañas */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
        
        {/* PESTAÑA: INFO PERSONAL */}
        {activeTab === 'info' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-gray-900 border-b pb-2">Datos del Jugador</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Nombre</label>
                  {isEditing ? (
                    <input type="text" value={editData.first_name || ''} onChange={e => setEditData({...editData, first_name: e.target.value})} className="w-full border rounded p-2 bg-gray-50 text-sm text-slate-900" />
                  ) : <div className="text-gray-900 font-medium">{player.first_name}</div>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Apellidos</label>
                  {isEditing ? (
                    <input type="text" value={editData.last_name || ''} onChange={e => setEditData({...editData, last_name: e.target.value})} className="w-full border rounded p-2 bg-gray-50 text-sm text-slate-900" />
                  ) : <div className="text-gray-900 font-medium">{player.last_name || '-'}</div>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Apodo</label>
                  {isEditing ? (
                    <input type="text" value={editData.nickname || ''} onChange={e => setEditData({...editData, nickname: e.target.value})} className="w-full border rounded p-2 bg-gray-50 text-sm text-slate-900" />
                  ) : <div className="text-gray-900 font-medium">{player.nickname || '-'}</div>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">N° de licencia</label>
                  {isEditing ? (
                    <input type="text" value={editData.license_number || ''} onChange={e => setEditData({...editData, license_number: e.target.value})} className="w-full border rounded p-2 bg-gray-50 text-sm text-slate-900" />
                  ) : <div className="text-gray-900 font-medium">{player.license_number || '-'}</div>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Fecha Nacimiento</label>
                  {isEditing ? (
                    <input type="date" value={editData.birth_date || ''} onChange={e => setEditData({...editData, birth_date: e.target.value})} className="w-full border rounded p-2 bg-gray-50 text-sm text-slate-900" />
                  ) : <div className="text-gray-900 font-medium">{player.birth_date ? new Date(player.birth_date).toLocaleDateString() : '-'}</div>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Año de llegada</label>
                  {isEditing ? (
                    <input type="number" value={editData.join_year || ''} onChange={e => setEditData({...editData, join_year: Number(e.target.value)})} className="w-full border rounded p-2 bg-gray-50 text-sm text-slate-900" />
                  ) : <div className="text-gray-900 font-medium">{player.join_year || '-'}</div>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Dorsal / Camiseta</label>
                  {isEditing ? (
                    <input type="number" value={editData.dorsal || ''} onChange={e => setEditData({...editData, dorsal: Number(e.target.value)})} className="w-full border rounded p-2 bg-gray-50 text-sm text-slate-900" />
                  ) : <div className="text-gray-900 font-medium">{player.dorsal || '-'}</div>}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-lg font-bold text-gray-900 border-b pb-2">Información de Contacto</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Teléfono</label>
                  {isEditing ? (
                    <input type="text" value={editData.phone || ''} onChange={e => setEditData({...editData, phone: e.target.value})} className="w-full border rounded p-2 bg-gray-50 text-sm text-slate-900" />
                  ) : <div className="text-gray-900 font-medium">{player.phone || 'No especificado'}</div>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Correo Electrónico</label>
                  {isEditing ? (
                    <input type="email" value={editData.email || ''} onChange={e => setEditData({...editData, email: e.target.value})} className="w-full border rounded p-2 bg-gray-50 text-sm text-slate-900" />
                  ) : <div className="text-gray-900 font-medium">{player.email || 'No especificado'}</div>}
                </div>
                {!esEntrenador && (
                  <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 mt-6 space-y-6">
                    <h4 className="font-bold text-blue-900 border-b border-blue-200 pb-2">Información de Padres / Tutores</h4>
                    
                    {/* PADRE 1 */}
                    <div>
                      <h5 className="text-sm font-bold text-blue-800 mb-3">Padre/Tutor 1</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-blue-700 uppercase mb-1">Nombre</label>
                          {isEditing ? <input type="text" value={editData.parent1_name || ''} onChange={e => setEditData({...editData, parent1_name: e.target.value})} className="w-full border rounded p-2 text-sm text-slate-900" /> : <div className="text-gray-900 font-medium">{player.parent1_name || '-'}</div>}
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-blue-700 uppercase mb-1">Apellidos</label>
                          {isEditing ? <input type="text" value={editData.parent1_last_name || ''} onChange={e => setEditData({...editData, parent1_last_name: e.target.value})} className="w-full border rounded p-2 text-sm text-slate-900" /> : <div className="text-gray-900 font-medium">{player.parent1_last_name || '-'}</div>}
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-blue-700 uppercase mb-1">Teléfono</label>
                          {isEditing ? <input type="text" value={editData.parent1_phone || ''} onChange={e => setEditData({...editData, parent1_phone: e.target.value})} className="w-full border rounded p-2 text-sm text-slate-900" /> : <div className="text-gray-900 font-medium">{player.parent1_phone || '-'}</div>}
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-blue-700 uppercase mb-1">Email</label>
                          {isEditing ? <input type="email" value={editData.parent1_email || ''} onChange={e => setEditData({...editData, parent1_email: e.target.value})} className="w-full border rounded p-2 text-sm text-slate-900" /> : <div className="text-gray-900 font-medium">{player.parent1_email || '-'}</div>}
                        </div>
                      </div>
                    </div>

                    {/* PADRE 2 */}
                    <div className="pt-4 border-t border-blue-200">
                      <h5 className="text-sm font-bold text-blue-800 mb-3">Padre/Tutor 2</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-blue-700 uppercase mb-1">Nombre</label>
                          {isEditing ? <input type="text" value={editData.parent2_name || ''} onChange={e => setEditData({...editData, parent2_name: e.target.value})} className="w-full border rounded p-2 text-sm text-slate-900" /> : <div className="text-gray-900 font-medium">{player.parent2_name || '-'}</div>}
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-blue-700 uppercase mb-1">Apellidos</label>
                          {isEditing ? <input type="text" value={editData.parent2_last_name || ''} onChange={e => setEditData({...editData, parent2_last_name: e.target.value})} className="w-full border rounded p-2 text-sm text-slate-900" /> : <div className="text-gray-900 font-medium">{player.parent2_last_name || '-'}</div>}
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-blue-700 uppercase mb-1">Teléfono</label>
                          {isEditing ? <input type="text" value={editData.parent2_phone || ''} onChange={e => setEditData({...editData, parent2_phone: e.target.value})} className="w-full border rounded p-2 text-sm text-slate-900" /> : <div className="text-gray-900 font-medium">{player.parent2_phone || '-'}</div>}
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-blue-700 uppercase mb-1">Email</label>
                          {isEditing ? <input type="email" value={editData.parent2_email || ''} onChange={e => setEditData({...editData, parent2_email: e.target.value})} className="w-full border rounded p-2 text-sm text-slate-900" /> : <div className="text-gray-900 font-medium">{player.parent2_email || '-'}</div>}
                        </div>
                      </div>
                    </div>

                    {/* Nota antigua (Tutor Legal / Contacto genérico) - Solo si tiene datos históricos o está editando de forma rápida */}
                    {(player.parent_contact && !player.parent1_name && !player.parent2_name) && (
                      <div className="pt-4 border-t border-blue-200">
                        <label className="block text-xs font-bold text-blue-800 uppercase tracking-wider mb-1">Notas / Tutor Legal Genérico (Histórico)</label>
                        {isEditing ? (
                          <textarea value={editData.parent_contact || ''} onChange={e => setEditData({...editData, parent_contact: e.target.value})} className="w-full border-blue-200 rounded p-2 bg-white text-sm min-h-[80px] outline-none focus:ring-2 focus:ring-blue-500 text-slate-900" />
                        ) : <div className="text-blue-900 font-medium whitespace-pre-wrap">{player.parent_contact}</div>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA: FÍSICO & MÉDICO */}
        {activeTab === 'medico' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1 space-y-6">
              <h3 className="text-lg font-bold text-gray-900 border-b pb-2">Antropometría</h3>
              <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="flex-1">
                  <span className="block text-xs font-bold text-gray-500 uppercase">Altura</span>
                  {isEditing ? (
                    <input type="number" step="0.01" value={editData.height || ''} onChange={e => setEditData({...editData, height: Number(e.target.value)})} className="w-full border rounded p-1 text-lg font-bold bg-white w-24 text-slate-900" />
                  ) : <span className="text-2xl font-bold text-gray-900">{player.height ? `${player.height}m` : '-'}</span>}
                </div>
                <div className="w-px h-12 bg-gray-200"></div>
                <div className="flex-1 pl-2">
                  <span className="block text-xs font-bold text-gray-500 uppercase">Peso</span>
                  {isEditing ? (
                    <input type="number" step="0.1" value={editData.weight || ''} onChange={e => setEditData({...editData, weight: Number(e.target.value)})} className="w-full border rounded p-1 text-lg font-bold bg-white w-24 text-slate-900" />
                  ) : <span className="text-2xl font-bold text-gray-900">{player.weight ? `${player.weight}kg` : '-'}</span>}
                </div>
                <div className="w-px h-12 bg-gray-200"></div>
                <div className="flex-1 pl-2">
                  <span className="block text-xs font-bold text-gray-500 uppercase">IMC</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {player.weight && player.height && player.height > 0 ? (player.weight / (player.height * player.height)).toFixed(1) : '-'}
                  </span>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Estado Actual</label>
                {isEditing ? (
                  <select value={editData.status || ''} onChange={e => setEditData({...editData, status: e.target.value})} className="w-full border rounded p-2 bg-gray-50 text-slate-900">
                    <option value="Activo">Activo</option>
                    <option value="Lesionado">Lesionado</option>
                    <option value="Sancionado">Sancionado</option>
                  </select>
                ) : (
                  <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold ${
                    player.status === 'Lesionado' ? 'bg-red-50 text-red-700 border border-red-200' :
                    player.status === 'Sancionado' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                    'bg-green-50 text-green-700 border border-green-200'
                  }`}>
                    <CheckCircle size={16} /> {player.status || 'Activo'}
                  </span>
                )}
              </div>
            </div>

            <div className="md:col-span-2 space-y-6">
              <h3 className="text-lg font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
                <FileText size={18} className="text-gray-400" />
                Historial y Notas Médicas
              </h3>
              {isEditing ? (
                <textarea 
                  value={editData.medical_notes || ''} 
                  onChange={e => setEditData({...editData, medical_notes: e.target.value})} 
                  className="w-full h-48 border border-gray-300 rounded-xl p-4 bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  placeholder="Alergias, lesiones previas, operaciones, observaciones del fisio..."
                />
              ) : (
                <div className="w-full min-h-[192px] bg-yellow-50/50 border border-yellow-200 rounded-xl p-6">
                  {player.medical_notes ? (
                    <p className="text-gray-800 whitespace-pre-wrap text-sm leading-relaxed">{player.medical_notes}</p>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <HeartPulse className="w-10 h-10 mb-2 opacity-50" />
                      <p>No hay notas médicas registradas.</p>
                    </div>
                  )}
                </div>
              )}

              {/* TABLA HISTORIAL DE PROGRESIÓN (IMC / Peso) */}
              <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mt-8 flex items-center gap-2">
                <TrendingUp size={18} className="text-blue-500" />
                Historial de Progresión (Peso / IMC)
              </h3>
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                {measurementsHistory.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm">
                    No hay mediciones históricas. Modifica el peso o la altura para crear el primer registro.
                  </div>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase text-xs">
                      <tr>
                        <th className="px-4 py-3">Fecha</th>
                        <th className="px-4 py-3 text-center">Peso</th>
                        <th className="px-4 py-3 text-center">Altura</th>
                        <th className="px-4 py-3 text-center">IMC</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {measurementsHistory.map((m, idx) => (
                        <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-900">{new Date(m.date).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-center text-gray-700">{m.weight ? `${m.weight} kg` : '-'}</td>
                          <td className="px-4 py-3 text-center text-gray-700">{m.height ? `${m.height} m` : '-'}</td>
                          <td className="px-4 py-3 text-center font-bold text-blue-700">{m.bmi ? m.bmi : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA: ESTADÍSTICAS */}
        {activeTab === 'stats' && (
          <div className="space-y-8">
            {/* Toggle Switch */}
            <div className="flex flex-col sm:flex-row bg-gray-100 p-1 rounded-2xl sm:rounded-full border border-gray-200 shadow-inner w-full sm:w-fit mx-auto mb-6 gap-1 sm:gap-0">
              <button
                onClick={() => setStatsViewMode('entrenamientos')}
                className={`flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl sm:rounded-full text-xs sm:text-sm font-bold transition-all ${
                  statsViewMode === 'entrenamientos' 
                    ? 'bg-white text-emerald-700 shadow-sm border border-gray-200/50' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <TrendingUp size={16} /> Entrenamientos
              </button>
              <button
                onClick={() => setStatsViewMode('partidos')}
                className={`flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl sm:rounded-full text-xs sm:text-sm font-bold transition-all ${
                  statsViewMode === 'partidos' 
                    ? 'bg-white text-indigo-700 shadow-sm border border-gray-200/50' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Activity size={16} /> Partidos
              </button>
            </div>

            {/* VISTA ENTRENAMIENTOS */}
            {statsViewMode === 'entrenamientos' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* ACWR FATIGA SECTION */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mt-8">
                  <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                    <TrendingUp className="text-emerald-500" />
                    <h3 className="text-lg font-bold text-slate-900">Estado Físico y Fatiga (ACWR)</h3>
                  </div>
                  <div className="p-6">
                    {!acwrData ? (
                      <div className="text-center text-slate-500 py-8">
                        Aún no hay suficientes datos de RPE y Minutos para este jugador para calcular el ratio ACWR.
                      </div>
                    ) : (
                      <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex-1 w-full space-y-4">
                          <div className="flex justify-between items-center bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                            <span className="text-sm font-bold text-slate-600 uppercase">Carga Aguda (7 días)</span>
                            <span className="text-2xl font-black text-slate-900">{Math.round(acwrData.acute)}</span>
                          </div>
                          <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <span className="text-sm font-bold text-slate-600 uppercase">Carga Crónica (28 días)</span>
                            <span className="text-2xl font-black text-slate-900">{Math.round(acwrData.chronic)}</span>
                          </div>
                        </div>
                        
                        <div className="flex-1 w-full flex flex-col items-center justify-center border-l-0 md:border-l border-slate-200 py-4">
                          <span className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Ratio de Lesión</span>
                          <span className="text-6xl font-black text-slate-900 mb-4">{acwrData.acwr.toFixed(2)}</span>
                          <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest ${
                            acwrData.acwr >= 0.8 && acwrData.acwr <= 1.3 ? 'bg-green-100 text-green-700' :
                            acwrData.acwr > 1.3 && acwrData.acwr <= 1.5 ? 'bg-yellow-100 text-yellow-700' :
                            acwrData.acwr > 1.5 ? 'bg-red-100 text-red-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {acwrData.acwr >= 0.8 && acwrData.acwr <= 1.3 ? 'Zona Óptima' :
                             acwrData.acwr > 1.3 && acwrData.acwr <= 1.5 ? 'Peligro (Precaución)' :
                             acwrData.acwr > 1.5 ? 'Riesgo Alto de Lesión' :
                             'Infradesarrollado'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

            {/* HISTORIAL ENTRENAMIENTOS */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mt-8">
              <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                <Calendar className="text-emerald-500" />
                <h3 className="text-lg font-bold text-slate-900">Historial de Sesiones</h3>
              </div>
              <div className="p-0 overflow-x-auto">
                {trainingHistory.length === 0 ? (
                  <div className="text-center text-slate-500 py-8">No hay entrenamientos registrados.</div>
                ) : (
                  <table className="w-full min-w-max text-left text-sm text-slate-600 whitespace-nowrap">
                    <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase font-bold text-slate-500">
                      <tr>
                        <th className="px-6 py-3">Fecha</th>
                        <th className="px-6 py-3">Sesión</th>
                        <th className="px-6 py-3 text-center">Asistencia</th>
                        <th className="px-6 py-3 text-center">Minutos</th>
                        <th className="px-6 py-3 text-center">RPE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(showAllTrainings ? trainingHistory : trainingHistory.slice(0, 10)).map(t => (
                        <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-900">{new Date(t.date).toLocaleDateString()}</td>
                          <td className="px-6 py-4">{t.title}</td>
                          <td className="px-6 py-4 text-center">
                            {t.attendance === 'Presente' ? <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">Presente</span> : 
                             t.attendance === 'Ausente' ? <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">Ausente</span> : 
                             <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-bold">-</span>}
                          </td>
                          <td className="px-6 py-4 text-center font-bold">{t.minutes ?? '-'}</td>
                          <td className="px-6 py-4 text-center font-bold text-emerald-600">{t.rpe ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {trainingHistory.length > 10 && (
                  <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
                    <button 
                      onClick={() => setShowAllTrainings(!showAllTrainings)}
                      className="text-sm font-bold text-blue-600 hover:text-blue-800"
                    >
                      {showAllTrainings ? "Mostrar menos" : `Cargar historial completo (${trainingHistory.length})`}
                    </button>
                  </div>
                )}
              </div>
            </div>
            </div>
            )}

            {/* VISTA PARTIDOS */}
            {statsViewMode === 'partidos' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center">
                    <Clock className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                    <div className="text-3xl font-black text-slate-900">{player.accumulated_minutes || 0}</div>
                    <div className="text-xs font-bold text-slate-500 uppercase mt-1">Minutos Jugados</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center">
                    <Activity className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
                    <div className="text-3xl font-black text-slate-900">{player.technical_rating ? `${player.technical_rating}/10` : '-'}</div>
                    <div className="text-xs font-bold text-slate-500 uppercase mt-1">Valoración Técnica</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center">
                    <div className="text-3xl font-black text-slate-900">{matchHistory.reduce((acc, curr) => acc + (curr.goles || 0), 0)}</div>
                    <div className="text-xs font-bold text-slate-500 uppercase mt-1">Goles Totales</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center">
                    <div className="text-3xl font-black text-slate-900">{matchHistory.reduce((acc, curr) => acc + (curr.asistencias || 0), 0)}</div>
                    <div className="text-xs font-bold text-slate-500 uppercase mt-1">Asistencias</div>
                  </div>
                </div>

                {isEditing && (
                  <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-blue-900 mb-2">Ajustar Minutos Acumulados</label>
                      <input type="number" value={editData.accumulated_minutes || 0} onChange={e => setEditData({...editData, accumulated_minutes: Number(e.target.value)})} className="w-full border-blue-200 rounded-lg p-2 text-slate-900" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-blue-900 mb-2">Valoración Técnica (1-10)</label>
                      <input type="number" step="0.1" min="1" max="10" value={editData.technical_rating || ''} onChange={e => setEditData({...editData, technical_rating: Number(e.target.value)})} className="w-full border-blue-200 rounded-lg p-2 text-slate-900" />
                    </div>
                  </div>
                )}

                {/* HISTORIAL PARTIDOS */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mt-8">
                  <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                    <Calendar className="text-indigo-500" />
                    <h3 className="text-lg font-bold text-slate-900">Historial de Partidos</h3>
                  </div>
                  <div className="p-0 overflow-x-auto">
                    {matchHistory.length === 0 ? (
                      <div className="text-center text-slate-500 py-8">No hay partidos registrados.</div>
                    ) : (
                      <table className="w-full min-w-max text-left text-sm text-slate-600 whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase font-bold text-slate-500">
                          <tr>
                            <th className="px-6 py-3">Fecha</th>
                            <th className="px-6 py-3">Partido</th>
                            <th className="px-6 py-3 text-center">Asistencia</th>
                            <th className="px-6 py-3 text-center">Nota (1-10)</th>
                            <th className="px-6 py-3 text-center">Actitud (1-10)</th>
                            <th className="px-6 py-3 text-center">Minutos</th>
                            <th className="px-6 py-3 text-center">Goles</th>
                            <th className="px-6 py-3 text-center">Asistencias</th>
                            <th className="px-6 py-3 text-center">Amarillas</th>
                            <th className="px-6 py-3 text-center">Rojas</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(showAllMatches ? matchHistory : matchHistory.slice(0, 10)).map(m => (
                            <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 font-medium text-slate-900">{new Date(m.date).toLocaleDateString()}</td>
                              <td className="px-6 py-4">{m.title}</td>
                              <td className="px-6 py-4 text-center">
                                {m.attendance === 'Presente' ? <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">Asiste</span> : 
                                 m.attendance === 'Ausente' ? <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">No Asiste</span> : 
                                 m.attendance === 'Justificado' ? <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">Justificado</span> : 
                                 <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-bold">-</span>}
                              </td>
                              <td className="px-6 py-4 text-center font-bold text-blue-600">{m.coach_rating || '0'}</td>
                              <td className="px-6 py-4 text-center font-bold text-purple-600">{m.actitud || '0'}</td>
                              <td className="px-6 py-4 text-center font-bold text-indigo-600">{m.minutes > 0 ? `${m.minutes}'` : '0'}</td>
                              <td className="px-6 py-4 text-center font-bold text-slate-700">{m.goles || '0'}</td>
                              <td className="px-6 py-4 text-center font-bold text-slate-700">{m.asistencias || '0'}</td>
                              <td className="px-6 py-4 text-center font-bold text-amber-500">{m.amarillas || '0'}</td>
                              <td className="px-6 py-4 text-center font-bold text-red-500">{m.rojas || '0'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    {matchHistory.length > 10 && (
                      <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
                        <button 
                          onClick={() => setShowAllMatches(!showAllMatches)}
                          className="text-sm font-bold text-blue-600 hover:text-blue-800"
                        >
                          {showAllMatches ? "Mostrar menos" : `Cargar historial completo (${matchHistory.length})`}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA: ASISTENCIA */}
        {activeTab === 'asistencia' && (
          <div className="space-y-6">
            {attendanceLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            ) : playerEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <Calendar className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No hay eventos registrados</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Aún no se ha realizado ningún entrenamiento ni partido en este equipo.
                </p>
              </div>
            ) : (() => {
              const filteredEvents = attendanceFilter === 'todos' 
                ? playerEvents 
                : playerEvents.filter(ev => ev.event_type === (attendanceFilter === 'entrenamientos' ? 'Entrenamiento' : 'Partido'));
                
              const totalEvents = filteredEvents.length;
              
              // We must only count attendance for the filtered events
              const filteredEventIds = filteredEvents.map(e => e.id);
              const filteredAttendance = playerAttendance.filter(a => filteredEventIds.includes(a.event_id));

              const presents = filteredAttendance.filter(a => a.status?.toLowerCase() === 'presente' || a.status?.toLowerCase() === 'present').length;
              const absents = filteredAttendance.filter(a => a.status?.toLowerCase() === 'ausente' || a.status?.toLowerCase() === 'absent').length;
              const excused = filteredAttendance.filter(a => a.status?.toLowerCase() === 'lesionado' || a.status?.toLowerCase() === 'excused').length;
              const pct = totalEvents > 0 ? Math.round((presents / totalEvents) * 100) : 0;

              const faltasDetalle = filteredEvents.filter(ev => {
                const rec = filteredAttendance.find(a => a.event_id === ev.id || a.date === ev.date);
                return rec && (rec.status?.toLowerCase() === 'ausente' || rec.status?.toLowerCase() === 'absent');
              });

              return (
                <div className="space-y-8">
                  {/* Selector de Asistencia */}
                  <div className="flex flex-wrap sm:flex-nowrap justify-center bg-gray-100 p-1 rounded-2xl sm:rounded-full border border-gray-200 shadow-inner w-full sm:w-fit mx-auto mb-4 gap-1 sm:gap-0">
                    <button
                      onClick={() => setAttendanceFilter('todos')}
                      className={`flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl sm:rounded-full text-xs sm:text-sm font-bold transition-all ${
                        attendanceFilter === 'todos' 
                          ? 'bg-white text-slate-800 shadow-sm border border-gray-200/50' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      onClick={() => setAttendanceFilter('entrenamientos')}
                      className={`flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl sm:rounded-full text-xs sm:text-sm font-bold transition-all ${
                        attendanceFilter === 'entrenamientos' 
                          ? 'bg-white text-emerald-700 shadow-sm border border-gray-200/50' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Entrenamientos
                    </button>
                    <button
                      onClick={() => setAttendanceFilter('partidos')}
                      className={`flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl sm:rounded-full text-xs sm:text-sm font-bold transition-all ${
                        attendanceFilter === 'partidos' 
                          ? 'bg-white text-indigo-700 shadow-sm border border-gray-200/50' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Partidos
                    </button>
                  </div>

                  {/* Resumen General */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center">
                      <div className="text-4xl font-black text-slate-900">{totalEvents}</div>
                      <div className="text-xs font-bold text-slate-500 uppercase mt-1">Sesiones</div>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center">
                      <div className="text-4xl font-black text-emerald-700">{pct}%</div>
                      <div className="text-xs font-bold text-emerald-600 uppercase mt-1">Asistencia</div>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
                      <div className="text-4xl font-black text-red-600">{absents}</div>
                      <div className="text-xs font-bold text-red-600 uppercase mt-1">Faltas</div>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center">
                      <div className="text-4xl font-black text-amber-600">{excused}</div>
                      <div className="text-xs font-bold text-amber-600 uppercase mt-1">Lesiones</div>
                    </div>
                  </div>

                  {/* Listado de Faltas */}
                  {faltasDetalle.length > 0 && (
                    <div className="bg-red-50/50 border border-red-100 rounded-xl p-6">
                      <h4 className="font-bold text-red-900 mb-4 flex items-center gap-2">
                        <AlertCircle size={18} /> Historial de Ausencias
                      </h4>
                      <ul className="space-y-3">
                        {faltasDetalle.map(ev => (
                          <li key={ev.id} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-red-100 shadow-sm">
                            <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center font-bold">
                              <X size={18} />
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{ev.title}</div>
                              <div className="text-xs font-medium text-slate-500">{new Date(ev.date).toLocaleDateString()} {ev.start_time ? `a las ${ev.start_time.substring(0,5)}` : ''}</div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Historial Completo */}
                  <div>
                    <h4 className="font-bold text-slate-900 mb-4">Últimos Eventos Registrados</h4>
                    {filteredEvents.length === 0 ? (
                      <div className="text-center text-slate-500 py-8 bg-slate-50 rounded-xl">No hay eventos para esta categoría.</div>
                    ) : (
                    <div className="space-y-2">
                      {filteredEvents.slice(0, 10).map(ev => {
                        const rec = filteredAttendance.find(a => a.event_id === ev.id || a.date === ev.date);
                        const status = rec?.status?.toLowerCase();
                        
                        return (
                          <div key={ev.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-8 bg-gray-200 rounded-full"></div>
                              <div>
                                <div className="font-bold text-slate-800 text-sm">{ev.title}</div>
                                <div className="text-xs text-slate-500">{new Date(ev.date).toLocaleDateString()}</div>
                              </div>
                            </div>
                            <div>
                              {!status ? (
                                <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-md">Sin registrar</span>
                              ) : status === 'presente' || status === 'present' ? (
                                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md">Presente</span>
                              ) : status === 'ausente' || status === 'absent' ? (
                                <span className="text-xs font-bold text-red-700 bg-red-100 px-2.5 py-1 rounded-md">Ausente</span>
                              ) : (
                                <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-md">Lesionado</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* PESTAÑA: DISCIPLINA */}
        {activeTab === 'disciplina' && (
          <DisciplineTab playerId={playerId} teamId={teamId} />
        )}

      </div>
    </div>
  );
}

// ----------------------------------------------------
// NUEVO COMPONENTE: Pestaña de Disciplina
// ----------------------------------------------------
function DisciplineTab({ playerId, teamId }: { playerId: string, teamId: string }) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [totals, setTotals] = useState({ yellows: 0, reds: 0 })

  useEffect(() => {
    const fetchDiscipline = async () => {
      const supabase = createClient()
      
      // 1. Obtener IDs de las métricas de tarjetas
      const { data: metrics } = await supabase.from('club_metrics').select('id, name')
      const amaIds = metrics?.filter(m => m.name.toLowerCase() === 'tarjetas amarillas').map(m => m.id) || []
      const rojIds = metrics?.filter(m => m.name.toLowerCase() === 'tarjetas rojas').map(m => m.id) || []

      if (amaIds.length === 0 && rojIds.length === 0) {
        setLoading(false)
        return
      }

      // 2. Obtener todas las tarjetas de este jugador (entrenamientos y partidos)
      const { data: perf } = await supabase
        .from('player_training_metrics')
        .select('event_id, metric_id, value_number')
        .eq('player_id', playerId)
        .in('metric_id', [...amaIds, ...rojIds])

      if (!perf || perf.length === 0) {
        setLoading(false)
        return
      }

      const eventIds = [...new Set(perf.map(p => p.event_id))]

      // 3. Obtener info de los eventos correspondientes
      const { data: events } = await supabase
        .from('team_events')
        .select('id, date, title, event_type')
        .in('id', eventIds)
        .order('date', { ascending: false })

      const history: any[] = []
      let tAma = 0, tRoj = 0

      events?.forEach(ev => {
        let pAma = 0
        let pRoj = 0
        
        perf.filter(p => p.event_id === ev.id).forEach(p => {
          if (amaIds.includes(p.metric_id)) pAma += (p.value_number || 0)
          if (rojIds.includes(p.metric_id)) pRoj += (p.value_number || 0)
        })

        tAma += pAma
        tRoj += pRoj

        if (pAma > 0 || pRoj > 0) {
          history.push({
            id: ev.id,
            date: ev.date,
            title: ev.title,
            type: ev.event_type,
            yellows: pAma,
            reds: pRoj
          })
        }
      })

      setData(history)
      setTotals({ yellows: tAma, reds: tRoj })
      setLoading(false)
    }

    fetchDiscipline()
  }, [playerId])

  if (loading) {
    return <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-2"><Activity className="animate-spin text-red-500" /> Cargando historial disciplinario...</div>
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-3 border-b pb-4">
        <div className="bg-red-50 p-2 rounded-lg text-red-600">
          <AlertTriangle size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Historial Disciplinario</h2>
          <p className="text-sm text-slate-500">Resumen y registro de tarjetas del jugador.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 flex flex-col items-center justify-center">
          <p className="text-sm font-bold text-yellow-800 uppercase tracking-wide">Tarjetas Amarillas</p>
          <div className="mt-2 w-12 h-16 bg-yellow-400 rounded shadow-sm flex items-center justify-center text-3xl font-black text-yellow-900 border border-yellow-500">
            {totals.yellows}
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex flex-col items-center justify-center">
          <p className="text-sm font-bold text-red-800 uppercase tracking-wide">Tarjetas Rojas</p>
          <div className="mt-2 w-12 h-16 bg-red-500 rounded shadow-sm flex items-center justify-center text-3xl font-black text-white border border-red-600">
            {totals.reds}
          </div>
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-white">
          <h3 className="font-bold text-slate-800">Registro de Partidos con Amonestación</h3>
        </div>
        {data.length === 0 ? (
          <div className="p-8 text-center text-slate-500 bg-white">
            <CheckCircle className="mx-auto mb-2 text-green-500" size={32} />
            El jugador no ha recibido ninguna tarjeta registrada.
          </div>
        ) : (
          <div className="divide-y divide-slate-200 bg-white">
            {data.map((item, idx) => (
              <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">{item.title}</span>
                    <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{item.type}</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    {new Date(item.date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
                <div className="flex gap-2">
                  {item.yellows > 0 && (
                    <div className="w-6 h-8 bg-yellow-400 rounded-sm shadow-sm border border-yellow-500 flex items-center justify-center font-bold text-yellow-900 text-sm" title={`${item.yellows} Amarillas`}>
                      {item.yellows}
                    </div>
                  )}
                  {item.reds > 0 && (
                    <div className="w-6 h-8 bg-red-500 rounded-sm shadow-sm border border-red-600 flex items-center justify-center font-bold text-white text-sm" title={`${item.reds} Rojas`}>
                      {item.reds}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
