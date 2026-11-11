"use client";

import React, { useState, useTransition, useEffect } from 'react';
import {
  getAvailableLowerCategoryPlayersAction
} from '@/app/actions/match-actions';
import { detectLowerCategoryTarget } from '@/lib/matches/category-promotion';
import { Loader2, UserPlus, X, Clock, CheckCircle2, XCircle, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { PlayerAvatar } from '@/components/features/matches/match-details/PlayerAvatar';

export type AttendanceStatus = 'Convocado' | 'No convocado' | 'Duda' | 'Lesión' | null;

export interface Player {
  id: string;
  name: string;
  position: string;
  status: AttendanceStatus;
  teamName?: string;
  isJuvenile?: boolean;
  isLowerCategory?: boolean;
  avatarUrl?: string | null;
  dorsal?: number | null;
  estadoAsistencia?: 'Confirmado' | 'Ausente' | 'Pendiente' | null;
  asistenciaConfirmadaFamilia?: boolean | null;
  rawPlayer?: any;
}

export function ConvocatoriaList({
  players = [],
  matchId,
  convocatorias = [],
  onCloseModal,
  match
}: {
  players?: any[],
  matchId?: string,
  convocatorias?: any[],
  onCloseModal?: () => void,
  match?: any
}) {
  const isModal = Boolean(onCloseModal);

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

    const estadoAsistencia = conv?.estado_asistencia
      || (conv?.asistencia_confirmada_familia === true ? 'Confirmado' : (conv?.asistencia_confirmada_familia === false ? 'Ausente' : (status === 'Convocado' ? 'Pendiente' : null)));

    mappedPlayers.push({
      id: p.id,
      name: `${p.first_name} ${p.last_name}`.toUpperCase(),
      position: (p.posicion || p.posicion_principal || 'Jugador').toLowerCase(),
      status: status,
      teamName: p.teams?.name || (isJuv ? 'Juvenil' : undefined),
      isJuvenile: isJuv,
      avatarUrl: p.avatar_url,
      dorsal: p.dorsal,
      estadoAsistencia: estadoAsistencia as any,
      asistenciaConfirmadaFamilia: conv?.asistencia_confirmada_familia ?? null,
      rawPlayer: p
    });
  });

  const [playerList, setPlayerList] = useState<Player[]>(mappedPlayers);
  const [isPending, startTransition] = useTransition();

  // Gestión de la hora de citación
  const [matchData, setMatchData] = useState<any>(match || null);
  const [horaCitacion, setHoraCitacion] = useState<string>(() => {
    if (match?.hora_citacion) {
      const c = new Date(match.hora_citacion);
      if (!isNaN(c.getTime())) return c.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (match?.fecha_hora) {
      const m = new Date(match.fecha_hora);
      if (!isNaN(m.getTime())) {
        const c = new Date(m.getTime() - 60 * 60 * 1000);
        return c.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    }
    return '';
  });

  // Detección de categoría inferior permitida (+ Juvenil en Senior, + Cadete en Juvenil, + Infantil en Cadete, ninguna en Infantil)
  const [targetCategory, setTargetCategory] = useState<'Juvenil' | 'Cadete' | 'Infantil' | null>(null);

  // Modal para añadir jugadores de categoría inferior
  const [showLowerCategoryModal, setShowLowerCategoryModal] = useState(false);
  const [candidatePlayers, setCandidatePlayers] = useState<any[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Efecto para obtener datos de partido/equipo si no vinieron en props
  useEffect(() => {
    if (!matchId) return;

    let isMounted = true;
    async function loadMatchAndCategory() {
      try {
        let currentMatch = match;
        if (!currentMatch?.fecha_hora || !currentMatch?.equipo) {
          const supabase = (await import('@/lib/supabase/client')).createClient();
          const { data } = await supabase
            .from('partidos')
            .select('fecha_hora, hora_citacion, equipo_id, equipo:teams(id, name, category)')
            .eq('id', matchId)
            .single();
          if (data && isMounted) {
            currentMatch = data;
            setMatchData(data);
          }
        }

        if (currentMatch && isMounted) {
          // Inicializar hora de citación si estaba vacía
          if (!horaCitacion) {
            if (currentMatch.hora_citacion) {
              const c = new Date(currentMatch.hora_citacion);
              if (!isNaN(c.getTime())) setHoraCitacion(c.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            } else if (currentMatch.fecha_hora) {
              const m = new Date(currentMatch.fecha_hora);
              if (!isNaN(m.getTime())) {
                const c = new Date(m.getTime() - 60 * 60 * 1000);
                setHoraCitacion(c.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
              }
            }
          }

          // Detectar qué categoría inferior corresponde
          const team = (Array.isArray(currentMatch.equipo) ? currentMatch.equipo[0] : currentMatch.equipo) as any;
          const detected = detectLowerCategoryTarget(team?.name, team?.category);
          setTargetCategory(detected ? detected.target : null);
        }
      } catch (err) {
        console.error("Error cargando detalles del partido en ConvocatoriaList:", err);
      }
    }

    loadMatchAndCategory();
    return () => { isMounted = false; };
  }, [matchId, match]);

  const openLowerCategoryModal = async () => {
    setShowLowerCategoryModal(true);
    if (matchId) {
      setLoadingCandidates(true);
      try {
        const res = await getAvailableLowerCategoryPlayersAction(matchId);
        if (res.success && res.players) {
          setCandidatePlayers(res.players);
          if (res.targetCategory) setTargetCategory(res.targetCategory);
        }
      } catch (err) {
        console.error("Error fetching lower category players:", err);
      } finally {
        setLoadingCandidates(false);
      }
    }
  };

  const handleAddCandidate = (p: any) => {
    const exists = playerList.find(item => item.id === p.id);
    if (exists) {
      handleStatusChange(p.id, 'Convocado');
    } else {
      const newPlayer: Player = {
        id: p.id,
        name: `${p.first_name} ${p.last_name}`.toUpperCase(),
        position: (p.posicion || 'Jugador').toLowerCase(),
        status: 'Convocado',
        teamName: p.teams?.name || (targetCategory ? targetCategory.toUpperCase() : 'Refuerzo'),
        isLowerCategory: true,
        avatarUrl: p.avatar_url,
        dorsal: p.dorsal,
        estadoAsistencia: 'Pendiente',
        rawPlayer: p
      };
      setPlayerList(prev => [newPlayer, ...prev]);
    }
    setShowLowerCategoryModal(false);
  };

  const handleStatusChange = (playerId: string, newStatus: AttendanceStatus) => {
    setPlayerList((prev) =>
      prev.map((player) => {
        if (player.id !== playerId) return player;
        let estadoAsistencia = player.estadoAsistencia;
        if (newStatus === 'Convocado' && !estadoAsistencia) {
          estadoAsistencia = 'Pendiente';
        } else if (newStatus !== 'Convocado') {
          estadoAsistencia = null;
        }
        return { ...player, status: newStatus, estadoAsistencia };
      })
    );
  };

  const handleConvocarTodos = () => {
    setPlayerList((prev) =>
      prev.map(p => ({
        ...p,
        status: 'Convocado',
        estadoAsistencia: p.estadoAsistencia || 'Pendiente'
      }))
    );
  };

  const handleDesmarcarTodos = () => {
    setPlayerList((prev) =>
      prev.map(p => ({
        ...p,
        status: 'No convocado',
        estadoAsistencia: null
      }))
    );
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

      // Calcular fecha ISO para hora_citacion
      let finalCitacionISO: string | null = null;
      if (horaCitacion) {
        const baseDate = matchData?.fecha_hora ? new Date(matchData.fecha_hora) : (match?.fecha_hora ? new Date(match.fecha_hora) : new Date());
        const datePart = !isNaN(baseDate.getTime()) ? baseDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        finalCitacionISO = new Date(`${datePart}T${horaCitacion}:00`).toISOString();
      }

      const { updateConvocatoriaBatch } = await import('@/app/actions/match-actions');
      const result = await updateConvocatoriaBatch(matchId, updates, { horaCitacion: finalCitacionISO });

      if (result && !result.success) {
        const errorMsg = typeof result.error === 'string' ? result.error : result.error?.message || "Error desconocido";
        toast.error("Error al guardar la convocatoria: " + errorMsg);
      } else {
        toast.success("Convocatoria guardada correctamente");
        if (onCloseModal) {
          onCloseModal();
        }
      }
    });
  };

  const getStatusClasses = (currentStatus: AttendanceStatus, targetStatus: AttendanceStatus) => {
    const baseClasses = "flex-1 sm:flex-none px-2.5 py-1.5 sm:py-1 text-[10px] font-black uppercase tracking-wide rounded-lg sm:rounded-md transition-all text-center cursor-pointer";

    if (currentStatus !== targetStatus) {
      return `${baseClasses} bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200`;
    }

    switch (targetStatus) {
      case 'Convocado':
        return `${baseClasses} bg-emerald-600 text-white shadow-xs border border-emerald-700`;
      case 'No convocado':
        return `${baseClasses} bg-slate-700 text-white shadow-xs border border-slate-800`;
      case 'Duda':
        return `${baseClasses} bg-amber-500 text-white shadow-xs border border-amber-600`;
      case 'Lesión':
        return `${baseClasses} bg-rose-600 text-white shadow-xs border border-rose-700`;
      default:
        return `${baseClasses} bg-slate-100 text-slate-500 border border-slate-200`;
    }
  };

  const getAvatarPlayerData = (player: Player) =>
    player.rawPlayer || {
      first_name: player.name,
      avatar_url: player.avatarUrl,
      posicion: player.position,
      dorsal: player.dorsal
    };

  const renderFamilyAttendanceBadge = (player: Player, compact = false) => {
    if (player.status !== 'Convocado') {
      return (
        <span className="inline-block px-2 py-0.5 text-[10px] font-black bg-slate-100 text-slate-400 rounded-md">
          -
        </span>
      );
    }

    if (player.estadoAsistencia === 'Confirmado') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
          {compact ? 'Confirmado' : 'Confirmado por familia'}
        </span>
      );
    }

    if (player.estadoAsistencia === 'Ausente') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-red-100 text-red-700">
          <XCircle className="w-3 h-3 text-red-600 shrink-0" />
          {compact ? 'Baja' : 'No asiste (Baja)'}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-700">
        <Clock className="w-3 h-3 text-amber-600 shrink-0" />
        Pendiente
      </span>
    );
  };

  const renderStatusButtons = (player: Player, gridMobile = false) => (
    <div className={gridMobile ? "grid grid-cols-4 gap-1.5 w-full" : "inline-flex items-center gap-1.5 justify-end"}>
      <button
        type="button"
        onClick={() => handleStatusChange(player.id, 'Convocado')}
        className={getStatusClasses(player.status, 'Convocado')}
      >
        Conv.
      </button>
      <button
        type="button"
        onClick={() => handleStatusChange(player.id, 'No convocado')}
        className={getStatusClasses(player.status, 'No convocado')}
      >
        No Conv.
      </button>
      <button
        type="button"
        onClick={() => handleStatusChange(player.id, 'Duda')}
        className={getStatusClasses(player.status, 'Duda')}
      >
        Duda
      </button>
      <button
        type="button"
        onClick={() => handleStatusChange(player.id, 'Lesión')}
        className={getStatusClasses(player.status, 'Lesión')}
      >
        Les.
      </button>
    </div>
  );

  const counts = playerList.reduce(
    (acc, player) => {
      if (player.status === 'Convocado') acc.convocados++;
      else if (player.status === 'Duda') acc.dudas++;
      else if (player.status === 'Lesión') acc.lesionados++;
      return acc;
    },
    { convocados: 0, dudas: 0, lesionados: 0 }
  );

  const attendanceCounts = playerList.reduce(
    (acc, player) => {
      if (player.status === 'Convocado') {
        if (player.estadoAsistencia === 'Confirmado') acc.confirmados++;
        else if (player.estadoAsistencia === 'Ausente') acc.ausentes++;
        else acc.pendientes++;
      }
      return acc;
    },
    { confirmados: 0, ausentes: 0, pendientes: 0 }
  );

  return (
    <div className={isModal ? "flex flex-col flex-1 min-h-0 space-y-4" : "space-y-4"}>
      {/* Cabecera estandarizada de pestaña (oculta en modal porque QuickConvocatoriaModal ya tiene su propia cabecera) */}
      {!isModal && (
        <div className="flex items-center justify-between border-b border-slate-100 pb-2 gap-3 flex-wrap">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Lista de Convocados</h3>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider">Citación y disponibilidad de plantilla</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">
              {playerList.length} Jugadores
            </span>
            <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              {counts.convocados} Convocados
            </span>
          </div>
        </div>
      )}

      {/* Barra superior de Resumen, Hora de Citación y Acciones */}
      <div className="bg-slate-50 rounded-xl border border-slate-150 p-3 sm:p-4 space-y-3 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">Resumen</span>
            <div className="text-[11px] font-bold flex flex-wrap gap-1.5 items-center">
              <span className="text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">Conv: {counts.convocados}</span>
              <span className="text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md">Dudas: {counts.dudas}</span>
              <span className="text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-md">Les: {counts.lesionados}</span>
              {counts.convocados > 0 && (
                <>
                  <span className="text-slate-300">|</span>
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {attendanceCounts.confirmados} Confirmados
                  </span>
                  {attendanceCounts.ausentes > 0 && (
                    <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 flex items-center gap-1">
                      <XCircle className="w-3 h-3 text-rose-600" /> {attendanceCounts.ausentes} Bajas
                    </span>
                  )}
                  {attendanceCounts.pendientes > 0 && (
                    <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-600" /> {attendanceCounts.pendientes} Pendientes
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Campo editable de Hora de Citación */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs self-start sm:self-auto">
            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="text-[11px] font-bold text-slate-600 whitespace-nowrap uppercase tracking-wide">Citación:</span>
            <input
              type="time"
              value={horaCitacion}
              onChange={(e) => setHoraCitacion(e.target.value)}
              className="text-xs font-black text-slate-900 bg-transparent outline-none cursor-pointer w-16"
              title="Hora en la que los jugadores deben estar en el campo (por defecto 1h antes del partido)"
            />
          </div>
        </div>

        {/* Botones de acción */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center justify-between gap-2 pt-2 border-t border-slate-200/70">
          <div className="col-span-2 sm:col-span-1 flex flex-wrap gap-2">
            {targetCategory && (
              <button
                onClick={openLowerCategoryModal}
                type="button"
                className="flex-1 sm:flex-none py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                title={`Convocar jugadores de categoría ${targetCategory}`}
              >
                <UserPlus className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="truncate">+ {targetCategory}</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleConvocarTodos}
              className="flex-1 sm:flex-none py-1.5 px-3 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition-colors border border-slate-200 shadow-2xs truncate"
            >
              Convocar Todos
            </button>
            <button
              type="button"
              onClick={handleDesmarcarTodos}
              className="flex-1 sm:flex-none py-1.5 px-3 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition-colors border border-slate-200 shadow-2xs truncate"
            >
              Desmarcar Todos
            </button>
          </div>

          <button
            type="button"
            onClick={handleGuardar}
            disabled={isPending}
            className="col-span-2 sm:col-span-1 py-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" /> : <Save className="w-3.5 h-3.5 shrink-0" />}
            <span>Guardar Convocatoria</span>
          </button>
        </div>
      </div>

      {/* Tabla de Plantilla (Desktop) y Tarjetas (Mobile) siguiendo el diseño de Estadísticas */}
      <div className={`border border-slate-150 rounded-xl overflow-hidden shadow-sm bg-white ${isModal ? 'flex-1 overflow-y-auto min-h-0 custom-scrollbar' : ''}`}>
        {playerList.length === 0 ? (
          <div className="text-center text-slate-400 py-12 text-xs font-bold uppercase tracking-wider">
            No hay jugadores disponibles en la plantilla.
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-3.5 px-3 text-center w-12">#</th>
                    <th className="py-3.5 px-4 min-w-[200px]">Jugador</th>
                    <th className="py-3.5 px-3 text-center">Confirmación</th>
                    <th className="py-3.5 px-4 text-right">Estado Convocatoria</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {playerList.map((player) => (
                    <tr
                      key={player.id}
                      className={`transition-colors ${
                        player.status === 'Convocado'
                          ? 'bg-emerald-50/25 hover:bg-emerald-50/50'
                          : 'hover:bg-slate-50/60'
                      }`}
                    >
                      <td className="py-3 px-3 text-center text-xs font-bold text-slate-400">
                        {player.dorsal || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <PlayerAvatar player={getAvatarPlayerData(player)} dorsal={player.dorsal} size="sm" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-xs font-bold text-slate-900 truncate uppercase" title={player.name}>
                                {player.name}
                              </p>
                              {(player.isLowerCategory || player.isJuvenile) && player.teamName && (
                                <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 rounded border border-indigo-200 shrink-0">
                                  {player.teamName}
                                </span>
                              )}
                            </div>
                            <p className={`text-[9px] font-semibold uppercase tracking-wide ${player.status === 'Convocado' ? 'text-emerald-600' : 'text-slate-400'}`}>
                              {player.position}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center">
                          {renderFamilyAttendanceBadge(player, true)}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {renderStatusButtons(player, false)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="block md:hidden space-y-3 p-3 bg-slate-50/50">
              {playerList.map((player) => (
                <div
                  key={player.id}
                  className={`bg-white p-4 rounded-xl shadow-sm border transition-all ${
                    player.status === 'Convocado' ? 'border-emerald-200' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3 min-w-0">
                      <PlayerAvatar player={getAvatarPlayerData(player)} dorsal={player.dorsal} size="md" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm block truncate uppercase" title={player.name}>
                            {player.name}
                          </span>
                          {(player.isLowerCategory || player.isJuvenile) && player.teamName && (
                            <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 rounded border border-indigo-200 shrink-0">
                              {player.teamName}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400 uppercase block mt-0.5">
                          {player.dorsal ? `#${player.dorsal} • ` : ''}{player.position}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {renderFamilyAttendanceBadge(player, true)}
                    </div>
                  </div>

                  <div className="pt-3">
                    {renderStatusButtons(player, true)}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer de guardado inferior */}
      <div className="pt-2 flex items-center justify-end gap-2 sm:gap-3 shrink-0">
        {onCloseModal && (
          <button
            type="button"
            onClick={onCloseModal}
            className="flex-1 sm:flex-none px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors border border-slate-200 shadow-xs"
          >
            Cancelar
          </button>
        )}
        <button
          type="button"
          onClick={handleGuardar}
          disabled={isPending}
          className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" /> : <Save className="w-3.5 h-3.5 shrink-0" />}
          Guardar Convocatoria
        </button>
      </div>

      {/* Modal para convocar jugadores de categoría inferior */}
      {showLowerCategoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-sm uppercase tracking-wide">Convocar Jugador {targetCategory || 'Inferior'}</h3>
                  <p className="text-[11px] text-slate-500">Sube a un jugador de categoría {targetCategory || 'inferior'} para este partido</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLowerCategoryModal(false)}
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
                placeholder={`Buscar por nombre o equipo ${targetCategory ? targetCategory.toLowerCase() : ''}...`}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="p-3 overflow-y-auto flex-1 divide-y divide-slate-100 custom-scrollbar">
              {loadingCandidates ? (
                <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                  Buscando jugadores {targetCategory ? targetCategory.toLowerCase() + 's' : ''} disponibles...
                </div>
              ) : candidatePlayers.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No se encontraron jugadores en equipos {targetCategory || 'inferiores'} del club.
                </div>
              ) : (
                candidatePlayers
                  .filter(p => {
                    const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
                    const team = (p.teams?.name || '').toLowerCase();
                    const query = searchTerm.toLowerCase();
                    return fullName.includes(query) || team.includes(query);
                  })
                  .map(p => {
                    const isAlreadyAdded = playerList.some(item => item.id === p.id && item.status === 'Convocado');
                    return (
                      <div key={p.id} className="py-2.5 flex items-center justify-between gap-2 hover:bg-slate-50 px-2 rounded-lg transition-colors">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <PlayerAvatar player={p} dorsal={p.dorsal} size="sm" />
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 text-xs uppercase truncate">{p.first_name} {p.last_name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="text-[10px] text-slate-500 font-medium">{p.posicion || 'Jugador'}</span>
                              <span className="px-1.5 py-0.2 bg-indigo-50 text-indigo-700 text-[9px] font-bold rounded border border-indigo-100">
                                {p.teams?.name || targetCategory || 'Refuerzo'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddCandidate(p)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
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
                type="button"
                onClick={() => setShowLowerCategoryModal(false)}
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
