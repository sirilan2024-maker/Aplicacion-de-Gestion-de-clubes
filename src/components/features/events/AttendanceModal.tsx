import { useState } from "react"
import { CheckCircle2, XCircle, Clock, X, Calendar, Activity } from "lucide-react"

interface AttendanceModalProps {
  player: { first_name: string; last_name: string }
  attendanceRecords: any[]
  stats: { present: number; absent: number; excused: number; late: number; total: number; ratio: number }
  onClose: () => void
}

export function AttendanceModal({ player, attendanceRecords, stats, onClose }: AttendanceModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Detalle de Asistencia</h2>
            <p className="text-sm text-slate-500">Historial de {player.first_name} {player.last_name}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-center items-center">
              <div className="text-2xl font-bold text-purple-600 mb-1">{stats.ratio}%</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ratio</div>
            </div>
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex flex-col justify-center items-center">
              <div className="text-2xl font-bold text-emerald-600 mb-1">{stats.present}</div>
              <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Asistencias</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 flex flex-col justify-center items-center">
              <div className="text-2xl font-bold text-orange-600 mb-1">{stats.late || 0}</div>
              <div className="text-[10px] font-bold text-orange-700 uppercase tracking-wider">Retrasos</div>
            </div>
            <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex flex-col justify-center items-center">
              <div className="text-2xl font-bold text-red-600 mb-1">{stats.absent}</div>
              <div className="text-[10px] font-bold text-red-700 uppercase tracking-wider">Faltas</div>
            </div>
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex flex-col justify-center items-center">
              <div className="text-2xl font-bold text-amber-600 mb-1">{stats.excused}</div>
              <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Justificadas</div>
            </div>
          </div>

          <h3 className="font-bold text-slate-900 mb-4">Historial Reciente</h3>
          {!attendanceRecords.length ? (
            <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-100">
              No hay registros de asistencia todavía.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
              {attendanceRecords.map((record, i) => {
                const eventDate = new Date(record.team_events?.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
                let statusColor = "bg-slate-100 text-slate-600";
                let StatusIcon = Clock;
                if (record.status === 'Presente' || record.status === 'present') { statusColor = "bg-emerald-100 text-emerald-700"; StatusIcon = CheckCircle2; }
                else if (record.status === 'Retraso' || record.status === 'late') { statusColor = "bg-orange-100 text-orange-700"; StatusIcon = Clock; }
                else if (record.status === 'Justificada' || record.status === 'excused') { statusColor = "bg-amber-100 text-amber-700"; StatusIcon = Clock; }
                else if (record.status === 'Ausente' || record.status === 'Falta' || record.status === 'absent') { statusColor = "bg-red-100 text-red-700"; StatusIcon = XCircle; }

                return (
                  <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="font-bold text-slate-900 capitalize text-sm">{eventDate}</p>
                      <p className="text-xs text-slate-500">{record.team_events?.title || record.team_events?.event_type || 'Evento'}</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${statusColor}`}>
                        <StatusIcon size={12} />
                        {record.status}
                      </span>
                      {record.notes && <span className="text-[10px] text-slate-400 mt-1">{record.notes}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all text-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
