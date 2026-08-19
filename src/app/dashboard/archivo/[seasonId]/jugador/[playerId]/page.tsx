"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, User, Activity, AlertTriangle, FileText, ClipboardCheck, Database, MapPin, Mail, Phone, HeartPulse } from "lucide-react";
import Link from "next/link";

export default function ArchivoHistoricalPlayerPage() {
  const router = useRouter();
  const params = useParams();
  const seasonId = typeof params?.seasonId === 'string' ? params.seasonId : '';
  const playerId = typeof params?.playerId === 'string' ? params.playerId : '';

  const [season, setSeason] = useState<any>(null);
  const [player, setPlayer] = useState<any>(null);
  const [history, setHistory] = useState<any>(null);
  
  const [discipline, setDiscipline] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [measurements, setMeasurements] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'deportivo'>('info');

  useEffect(() => {
    fetchData();
  }, [seasonId, playerId]);

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
    const { data: seasonData } = await supabase.from('seasons').select('*').eq('id', seasonId).single();
    if (!seasonData) {
      router.push('/dashboard/archivo');
      return;
    }
    setSeason(seasonData);

    // Load Player Data
    const { data: playerData } = await supabase.from('players').select('*').eq('id', playerId).single();
    setPlayer(playerData);

    // Load Player History for this season
    const { data: historyData } = await supabase
      .from('player_season_history')
      .select('*, teams(id, name)')
      .eq('season_id', seasonId)
      .eq('player_id', playerId)
      .maybeSingle();
      
    setHistory(historyData);

    // Load Discipline (Convocatorias)
    const { data: convData } = await supabase
      .from('convocatorias')
      .select(`
        yellow_cards, red_cards, minutos_jugados, rating, notes,
        partidos:partido_id(id, fecha_hora, rival_nombre, season_id)
      `)
      .eq('player_id', playerId);

    if (convData) {
      // Filter by season_id from the joined partido
      const filteredConv = convData.filter((c: any) => c.partidos && c.partidos.season_id === seasonId);
      setDiscipline(filteredConv);
    }

    // Load Attendance
    const { data: attData } = await supabase
      .from('attendance')
      .select(`
        status, minutes, rpe, created_at,
        team_events:event_id(id, date, start_time, title, event_type, season_id)
      `)
      .eq('player_id', playerId);

    if (attData) {
      const filteredAtt = attData.filter((a: any) => a.team_events && a.team_events.season_id === seasonId);
      setAttendance(filteredAtt);
    }

    // Load Measurements
    const { data: measData } = await supabase
      .from('player_measurements')
      .select('*')
      .eq('player_id', playerId)
      .gte('date', seasonData.start_date)
      .lte('date', seasonData.end_date)
      .order('date', { ascending: false });
      
    setMeasurements(measData || []);

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!season || !player) return null;

  // Cálculos Deportivos
  let totalYellows = 0;
  let totalReds = 0;
  let totalMinutes = 0;
  discipline.forEach(d => {
    totalYellows += (d.yellow_cards || 0);
    totalReds += (d.red_cards || 0);
    totalMinutes += (d.minutos_jugados || 0);
  });

  const presentCount = attendance.filter(a => a.status === 'presente' || a.status === 'present').length;
  const absentCount = attendance.filter(a => a.status === 'ausente' || a.status === 'absent').length;
  const totalAtt = presentCount + absentCount;
  const attRate = totalAtt > 0 ? Math.round((presentCount / totalAtt) * 100) : 0;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-2">
        <Link 
          href={history?.team_id ? `/dashboard/archivo/${seasonId}/equipos/${history.team_id}` : `/dashboard/archivo/${seasonId}`}
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft size={16} />
          Volver atrás
        </Link>
      </div>

      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-8 items-start">
        <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl overflow-hidden bg-slate-100 border-4 border-white shadow-lg shrink-0 flex items-center justify-center">
          {player.avatar_url ? (
            <img src={player.avatar_url} alt={player.first_name} className="w-full h-full object-cover" />
          ) : (
            <User size={48} className="text-slate-300" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <span className="bg-blue-100 text-blue-700 font-bold px-3 py-1 rounded-full text-xs">
              {history?.teams?.name || 'Sin equipo asignado'}
            </span>
            <span className="bg-slate-100 text-slate-600 font-bold px-3 py-1 rounded-full text-xs flex items-center gap-1">
              <Database size={12} />
              Archivo: {season.name}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
            {player.first_name} {player.last_name}
          </h1>
          <p className="text-slate-500 font-medium mt-1">Dorsal #{player.dorsal || '-'} • {player.role || 'Jugador'}</p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('info')}
          className={`pb-3 px-2 font-bold text-sm transition-colors border-b-2 ${
            activeTab === 'info' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <User size={16} />
            Datos Personales
          </div>
        </button>
        <button
          onClick={() => setActiveTab('deportivo')}
          className={`pb-3 px-2 font-bold text-sm transition-colors border-b-2 ${
            activeTab === 'deportivo' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Activity size={16} />
            Datos Deportivos
          </div>
        </button>
      </div>

      {activeTab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
              <FileText size={18} className="text-blue-500" />
              Información General
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">DNI / Pasaporte</label>
                <div className="font-medium text-slate-900">{player.dni || 'No especificado'}</div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Fecha de Nacimiento</label>
                <div className="font-medium text-slate-900">{player.date_of_birth ? new Date(player.date_of_birth).toLocaleDateString('es-ES') : 'No especificada'}</div>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Dirección</label>
                <div className="font-medium text-slate-900 flex items-center gap-2">
                  <MapPin size={14} className="text-slate-400" />
                  {player.address || 'No especificada'}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
              <HeartPulse size={18} className="text-rose-500" />
              Información Médica
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Alergias</label>
                {player.allergies ? (
                  <div className="p-3 bg-rose-50 text-rose-700 rounded-xl font-medium text-sm">{player.allergies}</div>
                ) : (
                  <div className="font-medium text-slate-500">Sin alergias conocidas</div>
                )}
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Condiciones Médicas</label>
                {player.medical_conditions ? (
                  <div className="p-3 bg-amber-50 text-amber-700 rounded-xl font-medium text-sm">{player.medical_conditions}</div>
                ) : (
                  <div className="font-medium text-slate-500">Ninguna documentada</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'deportivo' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-center">
              <div className="text-3xl font-black text-slate-900">{discipline.length}</div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">Partidos</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-center">
              <div className="text-3xl font-black text-slate-900">{totalMinutes}</div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">Minutos</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-center">
              <div className="text-3xl font-black text-slate-900">{attRate}%</div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">Asistencia</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-center flex items-center justify-center gap-4">
              <div>
                <div className="text-2xl font-black text-yellow-500">{totalYellows}</div>
                <div className="w-3 h-4 bg-yellow-400 rounded-sm mx-auto mt-1 shadow-sm" />
              </div>
              <div>
                <div className="text-2xl font-black text-red-500">{totalReds}</div>
                <div className="w-3 h-4 bg-red-500 rounded-sm mx-auto mt-1 shadow-sm" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
                <ClipboardCheck size={18} className="text-emerald-500" />
                Historial de Asistencia
              </h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {attendance.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">No hay registros de asistencia en esta temporada.</p>
                ) : (
                  attendance.map((att, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-xl border border-slate-100 transition-colors">
                      <div>
                        <div className="font-bold text-sm text-slate-900">
                          {att.team_events?.title || (att.team_events?.event_type === 'match' ? 'Partido' : 'Entrenamiento')}
                        </div>
                        <div className="text-xs text-slate-500">
                          {att.team_events?.date ? new Date(att.team_events.date).toLocaleDateString('es-ES') : 'Fecha desconocida'}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                        att.status === 'presente' || att.status === 'present' ? 'bg-emerald-100 text-emerald-700' : 
                        att.status === 'ausente' || att.status === 'absent' ? 'bg-rose-100 text-rose-700' : 
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {att.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
                <AlertTriangle size={18} className="text-amber-500" />
                Historial de Convocatorias
              </h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {discipline.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">No hay convocatorias registradas.</p>
                ) : (
                  discipline.map((d, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-xl border border-slate-100 transition-colors">
                      <div>
                        <div className="font-bold text-sm text-slate-900">vs {d.partidos?.rival_nombre || 'Rival'}</div>
                        <div className="text-xs text-slate-500">
                          {d.partidos?.fecha_hora ? new Date(d.partidos.fecha_hora).toLocaleDateString('es-ES') : ''} • {d.minutos_jugados || 0}'
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {Array.from({ length: d.yellow_cards || 0 }).map((_, i) => (
                          <div key={`y-${i}`} className="w-3 h-4 bg-yellow-400 rounded-sm shadow-sm" />
                        ))}
                        {Array.from({ length: d.red_cards || 0 }).map((_, i) => (
                          <div key={`r-${i}`} className="w-3 h-4 bg-red-500 rounded-sm shadow-sm" />
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
