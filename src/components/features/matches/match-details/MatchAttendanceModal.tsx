"use client"

import { useState, useTransition } from "react"
import { X, Save, CalendarCheck } from "lucide-react"
import { updateMatchAttendanceBatch } from "@/app/actions/match-actions"
import { useRouter } from "next/navigation"

interface Player {
  id: string
  first_name: string
  last_name: string
}

interface MatchAttendanceModalProps {
  matchId: string
  matchDate: string
  teamId: string
  players: Player[]
  convocatorias: any[]
  onClose: () => void
}

export function MatchAttendanceModal({ matchId, matchDate, teamId, players, convocatorias, onClose }: MatchAttendanceModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);

  // Filtramos solo los jugadores que estaban convocados o de los que tenemos registro de convocatoria
  const playerList = players.filter(p => convocatorias.some(c => c.player_id === p.id && c.status !== 'no_convocado'));

  // Inicializar estado con 'Presente' por defecto
  const initialAttendance: Record<string, string> = {};
  playerList.forEach(p => {
    // Si queremos leer de un estado existente, podemos hacerlo aquí.
    // Por ahora, asumimos que todos los convocados están Presentes a menos que se cambie.
    initialAttendance[p.id] = 'Presente';
  });

  const [attendance, setAttendance] = useState<Record<string, string>>(initialAttendance);

  const handleAttendanceChange = (playerId: string, status: string) => {
    setAttendance(prev => ({ ...prev, [playerId]: status }));
  };

  const handleSave = () => {
    startTransition(async () => {
      const attendanceArray = Object.entries(attendance).map(([playerId, status]) => ({ 
        playerId, 
        status 
      }));
      
      await updateMatchAttendanceBatch(matchId, teamId, matchDate, attendanceArray);
      
      setSuccess(true);
      router.refresh();
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-emerald-500" />
              Control de Asistencia
            </h3>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5">
              Marca quién asistió realmente al partido
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {playerList.map(player => (
            <div key={player.id} className="flex items-center justify-between p-3 border border-slate-150 rounded-xl bg-white hover:border-slate-300 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] font-black text-emerald-700 shrink-0">
                  {player.first_name[0] || ''}{player.last_name[0] || ''}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">
                    {player.first_name} {player.last_name}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={attendance[player.id] || 'Presente'}
                  onChange={(e) => handleAttendanceChange(player.id, e.target.value)}
                  className="text-sm font-black text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="Presente">Presente</option>
                  <option value="Ausente">Ausente</option>
                  <option value="Lesionado">Lesionado</option>
                </select>
              </div>
            </div>
          ))}

          {playerList.length === 0 && (
            <div className="text-center py-8 text-sm font-medium text-slate-500">
              No hay jugadores convocados para evaluar asistencia.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isPending ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : success ? (
              <>Guardado con éxito</>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Guardar Asistencia
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  )
}
