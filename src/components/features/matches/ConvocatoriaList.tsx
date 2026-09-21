"use client";

import React, { useState, useTransition, useEffect } from 'react';
import { updateConvocatoria, sendConvocatoriaAlerts, getAvailableJuvenilePlayersAction } from '@/app/actions/match-actions';
import { Loader2, UserPlus, X, ShieldCheck } from 'lucide-react';

export type AttendanceStatus = 'Convocado' | 'No convocado' | 'Duda' | 'Lesión' | null;

export interface Player {
  id: string;
  name: string;
  position: string;
  status: AttendanceStatus;
  teamName?: string;
  isJuvenile?: boolean;
}

export function ConvocatoriaList({ players = [], matchId, convocatorias = [], onCloseModal }: { players?: any[], matchId?: string, convocatorias?: any[], onCloseModal?: () => void }) {
  const validPlayers = players.filter(p => {
    const pos = (p.posicion || '').toLowerCase();
    return !pos.includes('entrenador') && !pos.includes('delegado') && !pos.includes('cuerpo técnico');
  });

  const mappedPlayers: Player[] = [];
  const seenPlayerIds = new Set<string>();
  const seenNames = new Set<string>();

  validPlayers.forEach(p => {
    const normalizedName = `${p.first_name || ''} ${p.last_name || ''}`.trim().toLowerCase().replace(/\s+/g, ' ');
    if (seenPlayerIds.has(p.id) || seenNames.has(normalizedName)) return;
    seenPlayerIds.add(p.id);
    seenNames.add(normalizedName);

    // If the player is in `convocatorias`, find their status
    const conv = convocatorias.find(c => c.player_id === p.id);
    let status: AttendanceStatus = null;
    if (conv) {
      if (conv.status === 'convocado' || conv.status === 'titular' || conv.status === 'suplente') status = 'Convocado';
      else if (conv.status === 'no_convocado') status = 'No convocado';
      else if (conv.status === 'duda') status = 'Duda';
      else if (conv.status === 'lesionado') status = 'Lesión';
    }
    const isJuv = p.teams?.category?.toLowerCase().includes('juvenil') || p.team_category?.toLowerCase().includes('juvenil');
    mappedPlayers.push({
      id: p.id,
      name: `${p.first_name} ${p.last_name}`.toUpperCase(),
      position: (p.posicion || 'Jugador').toLowerCase(),
      status: status,
      teamName: p.teams?.name || (isJuv ? 'Juvenil' : undefined),
      isJuvenile: isJuv
    });
  });

  const [playerList, setPlayerList] = useState<Player[]>(mappedPlayers);
  const [isPending, startTransition] = useTransition();

  // Modal para añadir juveniles
  const [showJuvenileModal, setShowJuvenileModal] = useState(false);
  const [juvenileCandidates, setJuvenileCandidates] = useState<any[]>([]);
  const [loadingJuveniles, setLoadingJuveniles] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const openJuvenileModal = async () => {
    setShowJuvenileModal(true);
    if (matchId) {
      setLoadingJuveniles(true);
      try {
        const res = await getAvailableJuvenilePlayersAction(matchId);
        if (res.success && res.players) {
          setJuvenileCandidates(res.players);
        }
      } catch (err) {
        console.error("Error fetching juvenile players:", err);
      } finally {
        setLoadingJuveniles(false);
      }
    }
  };

  const handleAddJuvenile = (p: any) => {
    // Si ya está en la lista, no duplicar, simplemente convocar
    const exists = playerList.find(item => item.id === p.id);
    if (exists) {
      handleStatusChange(p.id, 'Convocado');
    } else {
      const newPlayer: Player = {
        id: p.id,
        name: `${p.first_name} ${p.last_name}`.toUpperCase(),
        position: (p.posicion || 'Jugador').toLowerCase(),
        status: 'Convocado',
        teamName: p.teams?.name || 'Juvenil',
        isJuvenile: true
      };
      setPlayerList(prev => [newPlayer, ...prev]);
    }
    setShowJuvenileModal(false);
  };

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
        let dbStatus: "convocado" | "lesionado" | "duda" | "no_convocado" | "titular" | "suplente" | null = null;
        if (p.status === 'Convocado') {
          const originalConv = convocatorias?.find(c => c.player_id === p.id);
          if (originalConv && (originalConv.status === 'titular' || originalConv.status === 'suplente')) {
            dbStatus = originalConv.status;
          } else {
            dbStatus = 'convocado';
          }
        }
        else if (p.status === 'No convocado') dbStatus = 'no_convocado';
        else if (p.status === 'Duda') dbStatus = 'duda';
        else if (p.status === 'Lesión') dbStatus = 'lesionado';
        
        return { playerId: p.id, status: dbStatus };
      });
      
      const { updateConvocatoriaBatch } = await import('@/app/actions/match-actions');
      const result = await updateConvocatoriaBatch(matchId, updates);
      
      if (result && !result.success) {
        const errorMsg = typeof result.error === 'string' ? result.error : result.error?.message || "Error desconocido";
        alert("Error al guardar la convocatoria: " + errorMsg);
      } else if (onCloseModal) {
        onCloseModal();
      }
    });
  };

  const getStatusClasses = (currentStatus: AttendanceStatus, targetStatus: AttendanceStatus) => {
    const baseClasses = "flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-1 text-[11px] font-bold rounded-lg sm:rounded-md transition-all text-center";
    
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
          <div className="text-xs font-bold flex flex-wrap gap-1.5 justify-end">
            <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">Conv: {counts.convocados}</span>
            <span className="text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100">Dudas: {counts.dudas}</span>
            <span className="text-rose-600 bg-rose-50 px-2 py-1 rounded-md border border-rose-100">Les: {counts.lesionados}</span>
          </div>
        </div>

        {/* Botones de acción superiores: adaptativos a móvil con grid de 2 columnas o 1 fila en desktop */}
        <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2">
          <button
            onClick={openJuvenileModal}
            type="button"
            className="col-span-1 py-2 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="truncate">+ Juvenil</span>
          </button>
          <button
            onClick={handleConvocarTodos}
            className="col-span-1 py-2 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors border border-slate-200 shadow-xs truncate"
          >
            Convocar Todos
          </button>
          <button
            onClick={handleDesmarcarTodos}
            className="col-span-1 py-2 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors border border-slate-200 shadow-xs truncate"
          >
            Desmarcar Todos
          </button>
          <button 
            onClick={handleGuardar}
            disabled={isPending}
            className="col-span-1 py-2 px-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-colors shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
            <span className="truncate">Guardar</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pr-1 sm:pr-2 custom-scrollbar px-1">
        {playerList.length === 0 ? (
          <div className="text-center text-slate-500 py-8 text-sm">
            No hay jugadores disponibles en la plantilla.
          </div>
        ) : (
          <ul className="space-y-2">
            {playerList.map((player) => (
              <li 
                key={player.id} 
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border transition-all gap-2.5 sm:gap-0 ${
                  player.status === 'Convocado' 
                    ? 'border-emerald-200 bg-emerald-50/30' 
                    : 'border-slate-100 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="min-w-0 w-full sm:w-auto pr-0 sm:pr-4">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-slate-800 text-sm block truncate uppercase" title={player.name}>{player.name}</span>
                    {player.isJuvenile && (
                      <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 rounded border border-indigo-200 shrink-0">
                        {player.teamName || 'JUVENIL'}
                      </span>
                    )}
                  </div>
                  <span className={`text-[11px] font-bold block truncate mt-0.5 ${player.status === 'Convocado' ? 'text-emerald-700' : 'text-slate-500'}`}>{player.position}</span>
                </div>
                
                <div className="grid grid-cols-4 sm:flex sm:flex-nowrap gap-1.5 w-full sm:w-auto shrink-0 mt-1 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
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

      <div className="mt-2 shrink-0 bg-white border-t border-slate-200 p-3 sm:p-4 flex items-center justify-end rounded-b-xl">
        <div className="flex gap-2 sm:gap-3 w-full sm:w-auto justify-end">
          {onCloseModal && (
            <button 
              onClick={onCloseModal}
              className="flex-1 sm:flex-none px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors border border-slate-200 shadow-sm"
            >
              Cancelar
            </button>
          )}
          <button 
            onClick={handleGuardar}
            disabled={isPending}
            className="flex-1 sm:flex-none px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-colors shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isPending && <Loader2 className="w-3 h-3 animate-spin shrink-0" />}
            Guardar Convocatoria
          </button>
        </div>
      </div>

      {/* Modal para añadir juveniles */}
      {showJuvenileModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500 text-white flex items-center justify-center font-bold">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Convocar Jugador Juvenil</h3>
                  <p className="text-[11px] text-slate-500">Sube a un jugador de categoría Juvenil para este partido</p>
                </div>
              </div>
              <button
                onClick={() => setShowJuvenileModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 border-b border-slate-100">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre o equipo juvenil..."
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="p-3 overflow-y-auto flex-1 divide-y divide-slate-100 custom-scrollbar">
              {loadingJuveniles ? (
                <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                  Buscando juveniles disponibles...
                </div>
              ) : juvenileCandidates.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No se encontraron jugadores en equipos Juveniles del club.
                </div>
              ) : (
                juvenileCandidates
                  .filter(p => {
                    const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
                    const team = (p.teams?.name || '').toLowerCase();
                    const query = searchTerm.toLowerCase();
                    return fullName.includes(query) || team.includes(query);
                  })
                  .map(p => {
                    const isAlreadyAdded = playerList.some(item => item.id === p.id && item.status === 'Convocado');
                    return (
                      <div key={p.id} className="py-2.5 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg transition-colors">
                        <div>
                          <p className="font-bold text-slate-800 text-xs uppercase">{p.first_name} {p.last_name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-slate-500 font-medium">{p.posicion || 'Jugador'}</span>
                            <span className="px-1.5 py-0.2 bg-indigo-50 text-indigo-700 text-[9px] font-bold rounded border border-indigo-100">
                              {p.teams?.name || 'Juvenil'}
                            </span>
                            {p.dorsal && <span className="text-[10px] text-slate-400 font-semibold">#{p.dorsal}</span>}
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddJuvenile(p)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            isAlreadyAdded 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 pointer-events-none' 
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                          }`}
                        >
                          {isAlreadyAdded ? 'Ya convocado' : '+ Convocar'}
                        </button>
                      </div>
                    );
                  })
              )}
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowJuvenileModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
