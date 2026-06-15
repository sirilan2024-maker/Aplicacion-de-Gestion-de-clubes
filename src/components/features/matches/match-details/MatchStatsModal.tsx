"use client"

import { useState, useTransition } from "react"
import { X, Save, BarChart2, Plus, Minus } from "lucide-react"
import { updateMatchStatsBatch } from "@/app/actions/match-actions"
import { useRouter } from "next/navigation"

interface Player {
  id: string
  first_name: string
  last_name: string
}

interface MatchStatsModalProps {
  matchId: string
  players: Player[]
  convocatorias: any[]
  onClose: () => void
}

export function MatchStatsModal({ matchId, players, convocatorias, onClose }: MatchStatsModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);

  // Filtramos solo los jugadores convocados (no ausentes)
  const playerList = players.filter(p => convocatorias.some(c => c.player_id === p.id && c.estado_asistencia !== 'Ausente' && c.status !== 'no_convocado'));

  // Estado inicial desde convocatorias
  const initialStats: Record<string, { goals: number, assists: number, minutes: number }> = {};
  playerList.forEach(p => {
    const conv = convocatorias.find(c => c.player_id === p.id);
    initialStats[p.id] = {
      goals: conv?.goals || 0,
      assists: conv?.assists || 0,
      minutes: conv?.minutes_played || 0
    };
  });

  const [stats, setStats] = useState(initialStats);

  const handleUpdate = (playerId: string, field: 'goals' | 'assists' | 'minutes', delta: number) => {
    setStats(prev => {
      const current = prev[playerId][field];
      const nextValue = Math.max(0, current + delta);
      // Validaciones simples
      if (field === 'minutes' && nextValue > 120) return prev;
      
      return {
        ...prev,
        [playerId]: { ...prev[playerId], [field]: nextValue }
      };
    });
  };

  const handleMinutesChange = (playerId: string, value: string) => {
    const num = parseInt(value);
    if (isNaN(num) || num < 0) return;
    setStats(prev => ({
      ...prev,
      [playerId]: { ...prev[playerId], minutes: Math.min(120, num) }
    }));
  };

  const handleSave = () => {
    startTransition(async () => {
      const statsArray = Object.entries(stats).map(([playerId, data]) => {
        const conv = convocatorias.find(c => c.player_id === playerId);
        return {
          playerId,
          ...data,
          yellows: conv?.yellow_cards || 0,
          reds: conv?.red_cards || 0
        };
      });
      
      await updateMatchStatsBatch(matchId, statsArray);
      
      setSuccess(true);
      router.refresh();
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    });
  };

  const StatControl = ({ playerId, field, icon, max }: { playerId: string, field: 'goals'|'assists'|'minutes', icon: string, max?: number }) => {
    const value = stats[playerId][field];
    return (
      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1">
        <button 
          onClick={() => handleUpdate(playerId, field, -1)}
          disabled={value === 0}
          className="w-5 h-5 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <Minus className="w-3 h-3" />
        </button>
        <div className="w-8 text-center text-[10px] font-black text-slate-700 flex flex-col items-center justify-center leading-tight">
          <span>{value}</span>
          <span className="text-[8px] uppercase text-slate-400">{icon}</span>
        </div>
        <button 
          onClick={() => handleUpdate(playerId, field, 1)}
          disabled={max !== undefined && value >= max}
          className="w-5 h-5 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-blue-500" />
              Estadísticas Individuales
            </h3>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5">
              Anota goles, asistencias y tarjetas
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
            <div key={player.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-slate-150 rounded-xl bg-white hover:border-slate-300 transition-colors gap-3">
              <div className="flex items-center gap-3 w-1/3 min-w-[120px]">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-black text-blue-700 shrink-0">
                  {player.first_name[0] || ''}{player.last_name[0] || ''}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">
                    {player.first_name} {player.last_name}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar justify-start sm:justify-end flex-1">
                <div className="flex flex-col items-center mr-2">
                  <span className="text-[9px] uppercase font-bold text-slate-400 mb-1">Minutos</span>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={stats[player.id].minutes || ''}
                    onChange={(e) => handleMinutesChange(player.id, e.target.value)}
                    className="w-12 h-7 text-center text-xs font-black text-slate-700 bg-slate-50 border border-slate-200 rounded-md outline-none focus:ring-2 focus:ring-blue-500/50"
                    placeholder="0"
                  />
                </div>
                <StatControl playerId={player.id} field="goals" icon="Gol" />
                <StatControl playerId={player.id} field="assists" icon="Asist" />
              </div>
            </div>
          ))}

          {playerList.length === 0 && (
            <div className="text-center py-8 text-sm font-medium text-slate-500">
              No hay jugadores convocados para añadir estadísticas.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isPending ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : success ? (
              <>Guardado con éxito</>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Guardar Estadísticas
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  )
}
