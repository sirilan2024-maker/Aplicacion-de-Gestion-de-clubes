import React, { useState, useTransition } from 'react';
import { updateConvocatoria, sendConvocatoriaAlerts } from '@/app/actions/match-actions';
import { Bell, Check, Loader2 } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';

export type AttendanceStatus = 'Convocado' | 'No convocado' | 'Duda' | 'Lesión' | null;

export interface Player {
  id: string;
  name: string;
  status: AttendanceStatus;
}

const initialPlayers: Player[] = [
  { id: '1', name: 'Carlos Rodríguez', status: null },
  { id: '2', name: 'Miguel Ángel', status: 'Convocado' },
  { id: '3', name: 'Javier Fernández', status: 'Duda' },
  { id: '4', name: 'Lucas Silva', status: 'No convocado' },
];

export function ConvocatoriaList({ players = [], matchId, convocatorias = [] }: { players?: any[], matchId?: string, convocatorias?: any[] }) {
  const mappedPlayers: Player[] = players.map(p => {
    // If the player is in `convocatorias`, find their status
    const conv = convocatorias.find(c => c.player_id === p.id);
    let status: AttendanceStatus = null;
    if (conv) {
      if (conv.status === 'convocado') status = 'Convocado';
      else if (conv.status === 'no_convocado') status = 'No convocado';
      else if (conv.status === 'duda') status = 'Duda';
      else if (conv.status === 'lesionado') status = 'Lesión';
    }
    return {
      id: p.id,
      name: `${p.first_name} ${p.last_name}`,
      status: status
    };
  });

  const [playerList, setPlayerList] = useState<Player[]>(mappedPlayers.length > 0 ? mappedPlayers : initialPlayers);
  const [isPending, startTransition] = useTransition();
  const [alertSent, setAlertSent] = useState(false);
  const { rol } = useUserRole();

  const isFamily = rol === 'familia' || rol === 'jugador';

  const handleStatusChange = (playerId: string, newStatus: AttendanceStatus) => {
    setPlayerList((prev) =>
      prev.map((player) =>
        player.id === playerId ? { ...player, status: newStatus } : player
      )
    );
    
    // Convert AttendanceStatus to DB status
    let dbStatus: "convocado" | "lesionado" | "duda" | "no_convocado" | null = null;
    if (newStatus === 'Convocado') dbStatus = 'convocado';
    else if (newStatus === 'No convocado') dbStatus = 'no_convocado';
    else if (newStatus === 'Duda') dbStatus = 'duda';
    else if (newStatus === 'Lesión') dbStatus = 'lesionado';

    startTransition(() => {
      if (matchId) {
        updateConvocatoria(matchId, playerId, dbStatus);
      }
    });
  };

  const handleSendAlerts = async () => {
    if (!matchId) return;
    const convocados = playerList.filter(p => p.status === 'Convocado').map(p => p.id);
    startTransition(async () => {
      await sendConvocatoriaAlerts(matchId, "teamId", convocados);
      setAlertSent(true);
      setTimeout(() => setAlertSent(false), 3000);
    });
  };

  const getStatusClasses = (currentStatus: AttendanceStatus, targetStatus: AttendanceStatus) => {
    const baseClasses = "px-3 py-1.5 text-sm font-semibold rounded-lg transition-all duration-200 active:scale-95";
    if (currentStatus !== targetStatus) {
      return `${baseClasses} bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700`;
    }
    
    switch (targetStatus) {
      case 'Convocado':
        return `${baseClasses} bg-green-100 text-green-700 ring-2 ring-green-600 ring-offset-2 shadow-sm`;
      case 'No convocado':
        return `${baseClasses} bg-gray-100 text-gray-700 ring-2 ring-gray-600 ring-offset-2 shadow-sm`;
      case 'Duda':
        return `${baseClasses} bg-amber-100 text-amber-700 ring-2 ring-amber-600 ring-offset-2 shadow-sm`;
      case 'Lesión':
        return `${baseClasses} bg-red-100 text-red-700 ring-2 ring-red-600 ring-offset-2 shadow-sm`;
      default:
        return baseClasses;
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-white/80 backdrop-blur-xl shadow-xl rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex justify-between items-center">
        <div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Disponibilidad del Equipo</h3>
          <p className="text-[10px] text-slate-400 font-bold mt-0.5">ESTADO PARA EL PARTIDO</p>
        </div>
        {!isFamily && (
          <button
            onClick={handleSendAlerts}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm shadow-blue-200 transition-colors disabled:opacity-50"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (alertSent ? <Check className="w-4 h-4" /> : <Bell className="w-4 h-4" />)}
            <span className="text-xs font-bold">{alertSent ? "Alertas Enviadas" : "Notificar Convocados"}</span>
          </button>
        )}
      </div>

      <div className="px-6 py-3 bg-slate-50 border-b border-gray-100 flex items-center justify-between text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
        <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500"></div> C = Convocado</span>
        <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-gray-400"></div> NC = No Conv.</span>
        <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500"></div> D = Duda</span>
        <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500"></div> L = Lesionado</span>
      </div>
      
      <ul className="divide-y divide-gray-50 p-2">
        {playerList.map((player) => (
          <li key={player.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50/50 rounded-xl transition-colors gap-4">
            <div className="flex items-center gap-4 min-w-0 flex-1 pr-2">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 font-bold shadow-inner ring-1 ring-black/5 shrink-0">
                {player.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <span className="font-semibold text-gray-800 block truncate">{player.name}</span>
                <span className="text-xs text-gray-400 font-medium block truncate">Jugador</span>
              </div>
            </div>
            
            <div className="flex gap-1.5 sm:gap-2 shrink-0">
              <button
                onClick={() => handleStatusChange(player.id, 'Convocado')}
                className={getStatusClasses(player.status, 'Convocado')}
                title="Convocado"
              >
                C
              </button>
              <button
                onClick={() => handleStatusChange(player.id, 'No convocado')}
                className={getStatusClasses(player.status, 'No convocado')}
                title="No convocado"
              >
                NC
              </button>
              <button
                onClick={() => handleStatusChange(player.id, 'Duda')}
                className={getStatusClasses(player.status, 'Duda')}
                title="Duda"
              >
                D
              </button>
              <button
                onClick={() => handleStatusChange(player.id, 'Lesión')}
                className={getStatusClasses(player.status, 'Lesión')}
                title="Lesionado"
              >
                L
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
