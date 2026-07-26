"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ClipboardCheck, CheckCircle2, XCircle, Clock } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function FamilyAttendancePage() {
  const params = useParams();
  const playerId = typeof params.playerId === 'string' ? params.playerId : '';

  const [loading, setLoading] = useState(true);
  const [playerInfo, setPlayerInfo] = useState<any>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [stats, setStats] = useState({ present: 0, absent: 0, excused: 0, total: 0 });

  useEffect(() => {
    fetchAttendance();
  }, [playerId]);

  const fetchAttendance = async () => {
    setLoading(true);
    const supabase = createClient();
    try {
      const { data: pData, error: pError } = await supabase
        .from('players')
        .select('first_name, last_name, team_id')
        .eq('id', playerId)
        .single();
        
      if (pError) throw pError;
      setPlayerInfo(pData);

      // Fetch attendance records for this player
      const { data: attData, error: attError } = await supabase
        .from('attendance')
        .select('status, notes, team_events(title, date, event_type)')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false });

      if (attError) throw attError;

      const records = attData || [];
      setAttendanceRecords(records);

      let present = 0, absent = 0, excused = 0;
      records.forEach(r => {
        if (r.status === 'Presente') present++;
        else if (r.status === 'Justificada') excused++;
        else if (r.status === 'Ausente' || r.status === 'Falta') absent++;
      });
      setStats({ present, absent, excused, total: records.length });

    } catch (err: any) {
      toast.error("Error al cargar asistencia: " + err.message);
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

  const attendanceRate = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;

  return (
    <div className="p-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      <Toaster position="top-right" />
      
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
          <ClipboardCheck size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Asistencia</h1>
          <p className="text-gray-500 text-sm">Registro exclusivo de {playerInfo?.first_name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center items-center">
          <div className="text-4xl font-bold text-blue-600 mb-2">{attendanceRate}%</div>
          <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Porcentaje</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center items-center">
          <div className="text-3xl font-bold text-green-600 mb-2">{stats.present}</div>
          <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Asistencias</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center items-center">
          <div className="text-3xl font-bold text-red-600 mb-2">{stats.absent}</div>
          <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Faltas</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center items-center">
          <div className="text-3xl font-bold text-orange-500 mb-2">{stats.excused}</div>
          <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Justificadas</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Historial Reciente</h2>
        </div>
        {!attendanceRecords.length ? (
          <div className="p-8 text-center text-gray-500">No hay registros de asistencia todavía.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {attendanceRecords.map((record, i) => {
              const eventDate = new Date(record.team_events?.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
              let statusColor = "bg-gray-100 text-gray-600";
              let StatusIcon = Clock;
              if (record.status === 'Presente') { statusColor = "bg-green-100 text-green-700"; StatusIcon = CheckCircle2; }
              else if (record.status === 'Justificada') { statusColor = "bg-orange-100 text-orange-700"; StatusIcon = Clock; }
              else if (record.status === 'Ausente' || record.status === 'Falta') { statusColor = "bg-red-100 text-red-700"; StatusIcon = XCircle; }

              return (
                <div key={i} className="p-4 px-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="font-bold text-gray-900 capitalize">{eventDate}</p>
                    <p className="text-sm text-gray-500">{record.team_events?.title || record.team_events?.event_type || 'Evento'}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase ${statusColor}`}>
                      <StatusIcon size={14} />
                      {record.status}
                    </span>
                    {record.notes && <span className="text-xs text-gray-400 mt-1">{record.notes}</span>}
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
