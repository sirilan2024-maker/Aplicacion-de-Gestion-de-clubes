import React, { useState } from 'react';

export type AttendanceStatus = 'Asiste' | 'No asiste' | 'Duda' | null;

export interface Player {
  id: string;
  name: string;
  status: AttendanceStatus;
}

const initialPlayers: Player[] = [
  { id: '1', name: 'Carlos Rodríguez', status: null },
  { id: '2', name: 'Miguel Ángel', status: 'Asiste' },
  { id: '3', name: 'Javier Fernández', status: 'Duda' },
  { id: '4', name: 'Lucas Silva', status: 'No asiste' },
];

export function ConvocatoriaList() {
  const [players, setPlayers] = useState<Player[]>(initialPlayers);

  const handleStatusChange = (playerId: string, newStatus: AttendanceStatus) => {
    setPlayers((prev) =>
      prev.map((player) =>
        player.id === playerId ? { ...player, status: newStatus } : player
      )
    );
  };

  const getStatusClasses = (currentStatus: AttendanceStatus, targetStatus: AttendanceStatus) => {
    const baseClasses = "px-3 py-1.5 text-sm font-semibold rounded-lg transition-all duration-200 active:scale-95";
    if (currentStatus !== targetStatus) {
      return `${baseClasses} bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700`;
    }
    
    switch (targetStatus) {
      case 'Asiste':
        return `${baseClasses} bg-green-100 text-green-700 ring-2 ring-green-600 ring-offset-2 shadow-sm`;
      case 'No asiste':
        return `${baseClasses} bg-red-100 text-red-700 ring-2 ring-red-600 ring-offset-2 shadow-sm`;
      case 'Duda':
        return `${baseClasses} bg-amber-100 text-amber-700 ring-2 ring-amber-600 ring-offset-2 shadow-sm`;
      default:
        return baseClasses;
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white/80 backdrop-blur-xl shadow-xl rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800 tracking-tight">Convocatoria</h2>
          <p className="text-sm text-gray-500 mt-1">Siguiente partido: Sábado 10:00h</p>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-2xl font-black text-gray-800">
            {players.filter(p => p.status === 'Asiste').length}
            <span className="text-base font-medium text-gray-400">/{players.length}</span>
          </span>
          <span className="text-xs font-semibold text-green-600 uppercase tracking-wider">Confirmados</span>
        </div>
      </div>
      
      <ul className="divide-y divide-gray-50 p-2">
        {players.map((player) => (
          <li key={player.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50/50 rounded-xl transition-colors gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 font-bold shadow-inner ring-1 ring-black/5">
                {player.name.charAt(0)}
              </div>
              <div>
                <span className="font-semibold text-gray-800 block">{player.name}</span>
                <span className="text-xs text-gray-400 font-medium">Jugador</span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => handleStatusChange(player.id, 'Asiste')}
                className={getStatusClasses(player.status, 'Asiste')}
              >
                Asiste
              </button>
              <button
                onClick={() => handleStatusChange(player.id, 'Duda')}
                className={getStatusClasses(player.status, 'Duda')}
              >
                Duda
              </button>
              <button
                onClick={() => handleStatusChange(player.id, 'No asiste')}
                className={getStatusClasses(player.status, 'No asiste')}
              >
                No asiste
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
