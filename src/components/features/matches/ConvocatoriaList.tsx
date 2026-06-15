import React, { useState, useTransition } from 'react';
import { updateConvocatoria, sendConvocatoriaAlerts } from '@/app/actions/match-actions';
import { Loader2 } from 'lucide-react';

export type AttendanceStatus = 'Convocado' | 'No convocado' | 'Duda' | 'Lesión' | null;

export interface Player {
  id: string;
  name: string;
  position: string;
  status: AttendanceStatus;
}

export function ConvocatoriaList({ players = [], matchId, convocatorias = [], onCloseModal }: { players?: any[], matchId?: string, convocatorias?: any[], onCloseModal?: () => void }) {
  const validPlayers = players.filter(p => {
    const pos = (p.posicion || '').toLowerCase();
    return !pos.includes('entrenador') && !pos.includes('delegado') && !pos.includes('cuerpo técnico');
  });

  const mappedPlayers: Player[] = validPlayers.map(p => {
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
      name: `${p.first_name} ${p.last_name}`.toUpperCase(),
      position: (p.posicion || 'Jugador').toLowerCase(),
      status: status
    };
  });

  const [playerList, setPlayerList] = useState<Player[]>(mappedPlayers);
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = (playerId: string, newStatus: AttendanceStatus) => {
    setPlayerList((prev) =>
      prev.map((player) =>
        player.id === playerId ? { ...player, status: newStatus } : player
      )
    );
  };

  const handleConvocarTodos = () => {
    setPlayerList((prev) => prev.map(p => ({ ...p, status: 'Convocado' })));
  };

  const handleDesmarcarTodos = () => {
    setPlayerList((prev) => prev.map(p => ({ ...p, status: 'No convocado' })));
  };

  const handleGuardar = () => {
    if (!matchId) return;
    
    startTransition(async () => {
      const updates = playerList.map(p => {
        let dbStatus: "convocado" | "lesionado" | "duda" | "no_convocado" | null = null;
        if (p.status === 'Convocado') dbStatus = 'convocado';
        else if (p.status === 'No convocado') dbStatus = 'no_convocado';
        else if (p.status === 'Duda') dbStatus = 'duda';
        else if (p.status === 'Lesión') dbStatus = 'lesionado';
        
        return { playerId: p.id, status: dbStatus };
      });
      
      const { updateConvocatoriaBatch } = await import('@/app/actions/match-actions');
      const result = await updateConvocatoriaBatch(matchId, updates);
      
      if (result && !result.success) {
        alert("Error al guardar la convocatoria: " + (result.error?.message || "Error desconocido"));
      } else if (onCloseModal) {
        onCloseModal();
      }
    });
  };

  const getStatusClasses = (currentStatus: AttendanceStatus, targetStatus: AttendanceStatus) => {
    const baseClasses = "px-3 py-1 text-[11px] font-bold rounded-md transition-all shadow-sm";
    
    if (currentStatus !== targetStatus) {
      return `${baseClasses} bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200`;
    }

    switch (targetStatus) {
      case 'Convocado':
        return `${baseClasses} bg-emerald-500 text-white shadow-emerald-500/30 border border-emerald-600`;
      case 'No convocado':
        return `${baseClasses} bg-slate-700 text-white shadow-slate-700/30 border border-slate-800`;
      case 'Duda':
        return `${baseClasses} bg-amber-500 text-white shadow-amber-500/30 border border-amber-600`;
      case 'Lesión':
        return `${baseClasses} bg-rose-500 text-white shadow-rose-500/30 border border-rose-600`;
      default:
        return `${baseClasses} bg-slate-100 text-slate-500 border border-slate-200`;
    }
  };

  const counts = playerList.reduce(
    (acc, player) => {
      if (player.status === 'Convocado') acc.convocados++;
      else if (player.status === 'Duda') acc.dudas++;
      else if (player.status === 'Lesión') acc.lesionados++;
      return acc;
    },
    { convocados: 0, dudas: 0, lesionados: 0 }
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-white rounded-xl">
      <div className="flex flex-col gap-3 mb-4 shrink-0 px-1">
        <div className="flex items-center justify-between px-3 py-2.5 bg-slate-50 rounded-lg border border-slate-100">
          <span className="text-[10px] uppercase font-black tracking-wider text-slate-500">Resumen</span>
          <div className="text-xs font-bold">
            <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">Conv: {counts.convocados}</span>
            <span className="text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100 ml-2">Dudas: {counts.dudas}</span>
            <span className="text-rose-600 bg-rose-50 px-2 py-1 rounded-md border border-rose-100 ml-2">Les: {counts.lesionados}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleConvocarTodos}
            className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors border border-slate-200 shadow-sm"
          >
            Convocar a Todos
          </button>
          <button
            onClick={handleDesmarcarTodos}
            className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors border border-slate-200 shadow-sm"
          >
            Desmarcar Todos
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pr-2 custom-scrollbar px-1">
        {playerList.length === 0 ? (
          <div className="text-center text-slate-500 py-8 text-sm">
            No hay jugadores disponibles en la plantilla.
          </div>
        ) : (
          <ul className="space-y-2">
            {playerList.map((player) => (
              <li 
                key={player.id} 
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  player.status === 'Convocado' 
                    ? 'border-emerald-200 bg-emerald-50/30' 
                    : 'border-slate-100 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="min-w-0 pr-4">
                  <span className="font-bold text-slate-800 text-sm block truncate uppercase">{player.name}</span>
                  <span className={`text-[11px] font-bold block truncate mt-0.5 ${player.status === 'Convocado' ? 'text-emerald-700' : 'text-slate-500'}`}>{player.position}</span>
                </div>
                
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => handleStatusChange(player.id, 'Convocado')}
                    className={getStatusClasses(player.status, 'Convocado')}
                  >
                    Conv.
                  </button>
                  <button
                    onClick={() => handleStatusChange(player.id, 'No convocado')}
                    className={getStatusClasses(player.status, 'No convocado')}
                  >
                    No Conv.
                  </button>
                  <button
                    onClick={() => handleStatusChange(player.id, 'Duda')}
                    className={getStatusClasses(player.status, 'Duda')}
                  >
                    Duda
                  </button>
                  <button
                    onClick={() => handleStatusChange(player.id, 'Lesión')}
                    className={getStatusClasses(player.status, 'Lesión')}
                  >
                    Les.
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-2 shrink-0 bg-white border-t border-slate-200 p-4 flex items-center justify-end rounded-b-xl">
        <div className="flex gap-3">
          {onCloseModal && (
            <button 
              onClick={onCloseModal}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors border border-slate-200 shadow-sm"
            >
              Cancelar
            </button>
          )}
          <button 
            onClick={handleGuardar}
            disabled={isPending}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-colors shadow-lg shadow-emerald-500/20 flex items-center gap-2 disabled:opacity-50"
          >
            {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
            Guardar Convocatoria
          </button>
        </div>
      </div>
    </div>
  );
}
