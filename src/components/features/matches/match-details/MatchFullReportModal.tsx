"use client"

import { useState, useTransition } from "react"
import { X, Save, ClipboardList, Plus, Minus, Info } from "lucide-react"
import { updateMatchFullReportBatch } from "@/app/actions/match-actions"
import { useRouter } from "next/navigation"

interface Player {
  id: string
  first_name: string
  last_name: string
}

interface MatchFullReportModalProps {
  matchId: string
  matchDate: string
  teamId: string
  players: Player[]
  convocatorias: any[]
  onClose: () => void
}

export function MatchFullReportModal({ matchId, matchDate, teamId, players, convocatorias, onClose }: MatchFullReportModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);

  // Filtrar jugadores convocados
  const playerList = players.filter(p => convocatorias.some(c => c.player_id === p.id && c.status !== 'no_convocado'));

  // Estado inicial desde convocatorias
  const initialReports: Record<string, {
    status: string,
    rating: number,
    actitud: number,
    goals: number,
    assists: number,
    yellows: number,
    reds: number,
    minutes: number
  }> = {};

  playerList.forEach(p => {
    const conv = convocatorias.find(c => c.player_id === p.id);
    initialReports[p.id] = {
      status: conv?.estado_asistencia || 'Presente',
      rating: conv?.coach_rating || 0,
      actitud: conv?.actitud || 0,
      goals: conv?.goals || 0,
      assists: conv?.assists || 0,
      yellows: conv?.yellow_cards || 0,
      reds: conv?.red_cards || 0,
      minutes: conv?.minutes_played || 0
    };
  });

  const [reports, setReports] = useState(initialReports);

  const handleUpdate = (playerId: string, field: keyof typeof initialReports[string], delta: number | string) => {
    setReports(prev => {
      let nextValue: any;
      const current = prev[playerId][field];

      if (typeof delta === 'number') {
        nextValue = Math.max(0, (current as number) + delta);
        if (field === 'yellows' && nextValue > 2) return prev;
        if (field === 'reds' && nextValue > 1) return prev;
        if (field === 'rating' && nextValue > 10) return prev;
        if (field === 'actitud' && nextValue > 10) return prev;
        if (field === 'minutes' && nextValue > 120) return prev;
      } else {
        nextValue = delta; // Para el estado de asistencia
      }

      return {
        ...prev,
        [playerId]: { ...prev[playerId], [field]: nextValue }
      };
    });
  };

  const handleMinutesChange = (playerId: string, value: string) => {
    const num = parseInt(value);
    if (isNaN(num) || num < 0) return;
    setReports(prev => ({
      ...prev,
      [playerId]: { ...prev[playerId], minutes: Math.min(120, num) }
    }));
  };

  const handleSave = () => {
    startTransition(async () => {
      const reportsArray = Object.entries(reports).map(([playerId, data]) => ({
        playerId,
        ...data
      }));
      
      const res = await updateMatchFullReportBatch(matchId, teamId, matchDate, reportsArray);
      
      if (!res.success) {
        alert("Error al guardar: " + res.error);
        return;
      }
      
      setSuccess(true);
      router.refresh();
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    });
  };

  const NumberControl = ({ playerId, field, icon, max }: { playerId: string, field: 'goals'|'assists'|'yellows'|'reds'|'rating'|'actitud', icon: string, max?: number }) => {
    const value = reports[playerId][field];
    return (
      <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
        <button 
          onClick={() => handleUpdate(playerId, field, -1)}
          disabled={value === 0}
          className="w-4 h-4 flex items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <Minus className="w-2.5 h-2.5" />
        </button>
        <div className="w-6 text-center text-[10px] font-black text-slate-700 flex flex-col items-center justify-center leading-none">
          <span>{value}</span>
          <span className="text-[7px] uppercase text-slate-400">{icon}</span>
        </div>
        <button 
          onClick={() => handleUpdate(playerId, field, 1)}
          disabled={max !== undefined && value >= max}
          className="w-4 h-4 flex items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <Plus className="w-2.5 h-2.5" />
        </button>
      </div>
    );
  };

  const ATTENDANCE_OPTIONS = [
    { value: 'Presente', label: 'Asiste', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    { value: 'Ausente', label: 'No Asiste', color: 'text-red-700 bg-red-50 border-red-200' },
    { value: 'Justificado', label: 'Justificado', color: 'text-amber-700 bg-amber-50 border-amber-200' }
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div>
            <h3 className="text-base font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-blue-500" />
              Informe Completo del Partido
            </h3>
            <p className="text-xs font-bold text-slate-400 mt-0.5 flex items-center gap-1">
              <Info className="w-3 h-3" />
              Rellena asistencia, valoración (1-10), actitud (1-10) y estadísticas.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content (Table) */}
        <div className="flex-1 overflow-x-auto overflow-y-auto p-0 custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
              <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4 w-48 sticky left-0 bg-slate-50 z-20 border-r border-slate-200 shadow-[1px_0_0_0_#e2e8f0]">Jugador</th>
                <th className="py-3 px-3 text-center">Asistencia</th>
                <th className="py-3 px-3 text-center">Nota (1-10)</th>
                <th className="py-3 px-3 text-center">Actitud (1-10)</th>
                <th className="py-3 px-3 text-center">Minutos</th>
                <th className="py-3 px-3 text-center">Goles</th>
                <th className="py-3 px-3 text-center">Asistencias</th>
                <th className="py-3 px-3 text-center">Amarillas</th>
                <th className="py-3 px-3 text-center">Rojas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {playerList.map(player => {
                const currentStatus = reports[player.id].status;
                const optColor = ATTENDANCE_OPTIONS.find(o => o.value === currentStatus)?.color || 'text-slate-700 bg-slate-50 border-slate-200';

                return (
                  <tr key={player.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Fila Fija - Jugador */}
                    <td className="py-2.5 px-4 sticky left-0 bg-white z-10 border-r border-slate-100 group-hover:bg-slate-50/50 shadow-[1px_0_0_0_#f1f5f9]">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-[9px] font-black text-blue-700 shrink-0">
                          {player.first_name[0] || ''}{player.last_name[0] || ''}
                        </div>
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {player.first_name} {player.last_name}
                        </p>
                      </div>
                    </td>

                    {/* Asistencia */}
                    <td className="py-2.5 px-3">
                      <select
                        value={currentStatus}
                        onChange={(e) => handleUpdate(player.id, 'status', e.target.value)}
                        className={`w-full text-[10px] font-bold rounded-lg border px-2 py-1.5 outline-none cursor-pointer appearance-none ${optColor}`}
                      >
                        {ATTENDANCE_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </td>

                    {/* Nota */}
                    <td className="py-2.5 px-3 flex justify-center">
                      <NumberControl playerId={player.id} field="rating" icon="Nota" max={10} />
                    </td>

                    {/* Actitud */}
                    <td className="py-2.5 px-3">
                      <div className="flex justify-center">
                        <NumberControl playerId={player.id} field="actitud" icon="Actitud" max={10} />
                      </div>
                    </td>

                    {/* Minutos */}
                    <td className="py-2.5 px-3">
                      <div className="flex justify-center">
                        <input
                          type="number"
                          min="0"
                          max="120"
                          value={reports[player.id].minutes || ''}
                          onChange={(e) => handleMinutesChange(player.id, e.target.value)}
                          className="w-10 h-7 text-center text-[11px] font-black text-slate-700 bg-slate-50 border border-slate-200 rounded-md outline-none focus:ring-2 focus:ring-blue-500/50"
                          placeholder="0"
                        />
                      </div>
                    </td>

                    {/* Goles */}
                    <td className="py-2.5 px-3">
                      <div className="flex justify-center">
                        <NumberControl playerId={player.id} field="goals" icon="Gol" />
                      </div>
                    </td>

                    {/* Asistencias */}
                    <td className="py-2.5 px-3">
                      <div className="flex justify-center">
                        <NumberControl playerId={player.id} field="assists" icon="Asist" />
                      </div>
                    </td>

                    {/* Amarillas */}
                    <td className="py-2.5 px-3">
                      <div className="flex justify-center">
                        <NumberControl playerId={player.id} field="yellows" icon="Amar" max={2} />
                      </div>
                    </td>

                    {/* Rojas */}
                    <td className="py-2.5 px-3">
                      <div className="flex justify-center">
                        <NumberControl playerId={player.id} field="reds" icon="Roja" max={1} />
                      </div>
                    </td>

                  </tr>
                )
              })}

              {playerList.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-sm font-medium text-slate-500">
                    No hay jugadores convocados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 ml-auto disabled:opacity-50"
          >
            {isPending ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : success ? (
              <>Guardado con éxito</>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Guardar Informe Completo
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  )
}
