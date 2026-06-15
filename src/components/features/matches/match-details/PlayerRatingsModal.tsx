"use client"

import { useState, useTransition } from "react"
import { X, Save, Star } from "lucide-react"
import { updatePlayerRatingsBatch } from "@/app/actions/match-actions"
import { useRouter } from "next/navigation"

interface Player {
  id: string
  first_name: string
  last_name: string
  dorsal?: number
  avatar_url?: string
}

interface Convocatoria {
  id: string
  player_id: string
  coach_rating?: number
}

interface PlayerRatingsModalProps {
  matchId: string
  players: Player[]
  convocatorias: Convocatoria[]
  onClose: () => void
}

export function PlayerRatingsModal({ matchId, players, convocatorias, onClose }: PlayerRatingsModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);

  // Solo mostrar los jugadores que están convocados (opcional, o todos los disponibles)
  const convocadosIds = convocatorias.filter(c => c.estado_asistencia !== 'Ausente' && c.status !== 'no_convocado' && c.status !== 'lesionado').map(c => c.player_id);
  // Pero por si acaso el status está guardado distinto, mejor mostramos los que tienen registro de convocatoria
  const playerList = players.filter(p => convocatorias.some(c => c.player_id === p.id));

  // Inicializar estado con las notas actuales
  const initialRatings: Record<string, number> = {};
  playerList.forEach(p => {
    const conv = convocatorias.find(c => c.player_id === p.id);
    initialRatings[p.id] = conv?.coach_rating || 0;
  });

  const [ratings, setRatings] = useState<Record<string, number>>(initialRatings);

  const handleRatingChange = (playerId: string, rating: number) => {
    setRatings(prev => ({ ...prev, [playerId]: rating }));
  };

  const handleSave = () => {
    startTransition(async () => {
      const ratingsArray = Object.entries(ratings)
        .filter(([_, rating]) => rating > 0)
        .map(([playerId, rating]) => ({ playerId, rating }));
      
      await updatePlayerRatingsBatch(matchId, ratingsArray);
      
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
              <Star className="w-4 h-4 text-amber-500" />
              Valorar Jugadores
            </h3>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5">
              Puntúa del 1 al 10 el rendimiento individual
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
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-black text-blue-700 shrink-0">
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
                  value={ratings[player.id] || 0}
                  onChange={(e) => handleRatingChange(player.id, parseInt(e.target.value))}
                  className="w-16 text-sm font-black text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="0">-</option>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}

          {playerList.length === 0 && (
            <div className="text-center py-8 text-sm font-medium text-slate-500">
              No hay jugadores convocados para valorar.
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
                Guardar Valoraciones
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  )
}
