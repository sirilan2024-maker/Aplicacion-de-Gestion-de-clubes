"use client"

import { useState, useTransition } from "react"
import { X, Save, ClipboardList, Plus, Minus, Info, CheckCircle2, AlertCircle } from "lucide-react"
import { updateMatchFullReportBatch } from "@/app/actions/match-actions"
import { useRouter } from "next/navigation"
import { ScorePickerPopover } from "./ScorePickerPopover"
import { StatPickerPopover } from "./StatPickerPopover"
import { PlayerAvatar, getPositionTheme } from "./PlayerAvatar"
import { AttendanceJustificationModal } from "./AttendanceJustificationModal"

const CLOSED_SEASON_ID = '584f508a-fc1a-4339-b5b2-4296ffde2f4c';

interface Player {
  id: string
  first_name: string
  last_name: string
  status?: string
  posicion?: string
  posicion_principal?: string
  team_id?: string
  team?: {
    id?: string
    season_id?: string
  }
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

  // 1. Filtrar estrictamente jugadores válidos (excluir temporada cerrada 25/26, bajas/inactivos y staff)
  const eligiblePlayers = (players || []).filter(p => {
    const sId = p.team?.season_id;
    if (sId === CLOSED_SEASON_ID) return false;

    const st = (p.status || '').toLowerCase().trim();
    if (st.includes('inactiv') || st.includes('baja')) return false;

    const pos = (p.posicion || p.posicion_principal || '').toLowerCase();
    if (pos.includes('entrenador') || pos.includes('delegado') || pos.includes('tecnico') || pos.includes('staff')) return false;

    return true;
  });

  // 2. Convocatorias válidas de jugadores activos
  const convocadosSet = new Set(
    (convocatorias || [])
      .filter(c => c.status !== 'no_convocado')
      .map(c => c.player_id)
  );

  const rawList = convocadosSet.size > 0
    ? eligiblePlayers.filter(p => convocadosSet.has(p.id))
    : eligiblePlayers.filter(p => p.team_id === teamId || p.team?.id === teamId || !p.team_id);

  // 3. Deduplicar por ID y por nombre normalizado
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const playerList = rawList.filter(p => {
    if (seenIds.has(p.id)) return false;
    seenIds.add(p.id);

    const normName = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase().replace(/\s+/g, ' ').trim();
    if (normName) {
      if (seenNames.has(normName)) return false;
      seenNames.add(normName);
    }

    return true;
  });

  // Estado inicial desde convocatorias
  const initialReports: Record<string, {
    status: string,
    rating: number | null,
    actitud: number | null,
    goals: number,
    assists: number,
    yellows: number,
    reds: number,
    minutes: number,
    motive?: string
  }> = {};

  playerList.forEach(p => {
    const conv = convocatorias.find(c => c.player_id === p.id);
    const initialStatus = (conv?.estado_asistencia === 'Ausente' || conv?.estado_asistencia === 'Justificado')
      ? conv.estado_asistencia
      : 'Presente';
    const hasRating = conv?.coach_rating !== null && conv?.coach_rating !== undefined && conv.coach_rating > 0;
    const hasActitud = conv?.actitud !== null && conv?.actitud !== undefined && conv.actitud > 0;

    initialReports[p.id] = {
      status: initialStatus,
      rating: hasRating ? conv.coach_rating : null,
      actitud: hasActitud ? conv.actitud : null,
      goals: conv?.goals || 0,
      assists: conv?.assists || 0,
      yellows: conv?.yellow_cards || 0,
      reds: conv?.red_cards || 0,
      minutes: conv?.minutes_played || 0,
      motive: conv?.notes || conv?.motivo || ''
    };
  });

  const [reports, setReports] = useState(initialReports);
  const [justifyingPlayerId, setJustifyingPlayerId] = useState<string | null>(null);

  const handleUpdate = (playerId: string, field: keyof typeof initialReports[string], delta: number | string) => {
    setReports(prev => {
      let nextValue: any;
      const current = prev[playerId][field];

      if (typeof delta === 'number') {
        nextValue = Math.max(0, ((current as number) || 0) + delta);
        if (field === 'yellows' && nextValue > 2) return prev;
        if (field === 'reds' && nextValue > 1) return prev;
        if (field === 'rating' && nextValue > 10) return prev;
        if (field === 'actitud' && nextValue > 10) return prev;
        if (field === 'minutes' && nextValue > 120) return prev;
      } else {
        nextValue = delta; // Para el estado de asistencia
        if (field === 'status' && (nextValue === 'Ausente' || nextValue === 'Justificado')) {
          return {
            ...prev,
            [playerId]: {
              ...prev[playerId],
              status: nextValue,
              minutes: 0,
              rating: null,
              actitud: null,
              goals: 0,
              assists: 0,
              yellows: 0,
              reds: 0
            }
          };
        }
      }

      return {
        ...prev,
        [playerId]: { ...prev[playerId], [field]: nextValue }
      };
    });

    if (field === 'status' && delta === 'Justificado') {
      setJustifyingPlayerId(playerId);
    }
  };

  const handleSaveMotive = (playerId: string, motive: string) => {
    setReports(prev => {
      const current = prev[playerId];
      if (!current) return prev;
      return {
        ...prev,
        [playerId]: {
          ...current,
          status: 'Justificado',
          motive
        }
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

  const handleScoreChange = (playerId: string, field: 'rating' | 'actitud', val: number | null) => {
    setReports(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [field]: val
      }
    }));
  };

  const handleStatSet = (playerId: string, field: 'goals' | 'yellows' | 'reds', val: number) => {
    setReports(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [field]: val
      }
    }));
  };

  // Cálculo de completitud de la evaluación
  const isPlayerEvaluated = (playerId: string) => {
    const rep = reports[playerId];
    if (!rep) return false;
    if (rep.status === 'Ausente' || rep.status === 'Justificado') return true;
    if (rep.status === 'Presente') {
      return rep.rating !== null && rep.rating !== undefined && rep.actitud !== null && rep.actitud !== undefined;
    }
    return false;
  };

  const totalPlayers = playerList.length;
  const pendingPlayers = playerList.filter(p => !isPlayerEvaluated(p.id));
  const evaluatedCount = totalPlayers - pendingPlayers.length;
  const isEvaluationComplete = totalPlayers > 0 ? pendingPlayers.length === 0 : true;

  const handleSave = () => {
    if (!isEvaluationComplete || pendingPlayers.length > 0) {
      const names = pendingPlayers.slice(0, 3).map(p => `${p.first_name} ${p.last_name}`).join(', ');
      const more = pendingPlayers.length > 3 ? ` y ${pendingPlayers.length - 3} más` : '';
      alert(`No se puede guardar el informe: faltan por evaluar ${pendingPlayers.length} jugador(es) (${names}${more}). Debes asignar Nota y Actitud a todos los jugadores que asisten.`);
      return;
    }

    startTransition(async () => {
      const reportsArray = Object.entries(reports).map(([playerId, data]) => ({
        playerId,
        ...data,
        rating: data.rating ?? 0,
        actitud: data.actitud ?? 0
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

  const NumberControl = ({ playerId, field, icon, max }: { playerId: string, field: 'goals'|'assists'|'yellows'|'reds', icon: string, max?: number }) => {
    const value = (reports[playerId][field] as number) || 0;
    return (
      <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
        <button 
          onClick={() => handleUpdate(playerId, field, -1)}
          disabled={value === 0}
          className="w-4 h-4 flex items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
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
          className="w-4 h-4 flex items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
        >
          <Plus className="w-2.5 h-2.5" />
        </button>
      </div>
    );
  };

  const ATTENDANCE_OPTIONS = [
    { value: 'Presente', label: 'Asiste', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    { value: 'Ausente', label: 'No Asiste', color: 'text-rose-700 bg-rose-50 border-rose-200' },
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
              <Info className="w-3 h-3 shrink-0" />
              Primero marca la asistencia y luego añade nota y actitud para puntuar de 0 a 10 con 1 toque. Los goles y tarjetas se añaden automáticamente desde el acta del partido, revisa si están bien.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content (Desktop Table & Mobile Cards) */}
        {/* 1. Vista Móvil (Tarjetas individuales con Avatar profesional) */}
        <div className="md:hidden flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/60 custom-scrollbar">
          {playerList.map((player, idx) => {
            const currentStatus = reports[player.id].status;
            const isNearBottom = idx >= playerList.length - 2;
            const isPresent = currentStatus === 'Presente';
            const isEvaluated = isPlayerEvaluated(player.id);
            const conv = convocatorias.find(c => c.player_id === player.id);
            const posTheme = getPositionTheme(player.posicion || player.posicion_principal);
            const dorsal = conv?.dorsal ?? player.dorsal;
            const isTitular = conv?.titular === true || conv?.titular === 1 || String(conv?.titular) === '1';

            return (
              <div 
                key={player.id} 
                className={`bg-white border rounded-3xl p-4 shadow-sm space-y-3.5 transition-all ${
                  isEvaluated 
                    ? "border-slate-200 hover:border-slate-300" 
                    : "border-amber-300 ring-2 ring-amber-200/50 bg-gradient-to-b from-white to-amber-50/20"
                }`}
              >
                {/* 1. PARTE DE ARRIBA: Avatar en grande a la izquierda + Nombre completo centrado al lado */}
                <div className="flex items-center gap-3.5 border-b border-slate-100 pb-3">
                  <PlayerAvatar
                    player={player}
                    dorsal={dorsal}
                    size="xl"
                    showDorsalBadge={true}
                  />
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-sm font-black text-slate-900 leading-snug break-words">
                        {player.first_name} {player.last_name}
                      </h4>
                      {isTitular && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                          Titular
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${posTheme.badgeBg}`}>
                        {posTheme.code} · {posTheme.label}
                      </span>
                      {dorsal !== undefined && dorsal !== null && String(dorsal).trim() !== '' && (
                        <span className="text-xs font-black text-slate-400">
                          #{dorsal}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. JUSTO DEBAJO: Asistencia (Asiste, No Asiste, Justificado) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Asistencia
                    </span>
                    {currentStatus === 'Justificado' && (
                      <button
                        type="button"
                        onClick={() => setJustifyingPlayerId(player.id)}
                        className="text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-lg flex items-center gap-1 cursor-pointer truncate max-w-[200px]"
                        title="Editar motivo de justificación"
                      >
                        <span className="truncate">{reports[player.id].motive ? `Motivo: ${reports[player.id].motive}` : "+ Añadir motivo"}</span>
                        <span className="text-amber-600 font-bold">✏️</span>
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80">
                    {ATTENDANCE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleUpdate(player.id, 'status', opt.value)}
                        className={`py-2 px-1 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          currentStatus === opt.value
                            ? opt.value === 'Presente'
                              ? 'bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-400'
                              : opt.value === 'Ausente'
                              ? 'bg-rose-600 text-white shadow-xs ring-1 ring-rose-400'
                              : 'bg-amber-500 text-white shadow-xs ring-1 ring-amber-300'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                        }`}
                      >
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. JUSTO DEBAJO: Minutos, Nota, Actitud */}
                <div className="p-3 bg-slate-50/80 border border-slate-150 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Rendimiento y Minutos
                    </span>
                    <div>
                      {renderPlayerStatusPill(player.id)}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {/* Minutos */}
                    <div className="flex flex-col items-center justify-center bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">⏱️ Minutos</span>
                      <input
                        type="number"
                        min="0"
                        max="120"
                        disabled={!isPresent}
                        value={reports[player.id].minutes || ''}
                        onChange={(e) => handleMinutesChange(player.id, e.target.value)}
                        placeholder="0"
                        className="w-14 h-8 text-center text-sm font-black text-slate-800 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-30 disabled:bg-slate-100"
                      />
                    </div>

                    {/* Nota */}
                    <div className="flex flex-col items-center justify-center bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">⭐ Nota</span>
                      <ScorePickerPopover
                        value={reports[player.id].rating}
                        onChange={(val) => handleScoreChange(player.id, 'rating', val)}
                        label="Nota"
                        disabled={!isPresent}
                        forceUpwards={isNearBottom}
                        size="md"
                      />
                    </div>

                    {/* Actitud */}
                    <div className="flex flex-col items-center justify-center bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">🔥 Actitud</span>
                      <ScorePickerPopover
                        value={reports[player.id].actitud}
                        onChange={(val) => handleScoreChange(player.id, 'actitud', val)}
                        label="Actitud"
                        disabled={!isPresent}
                        forceUpwards={isNearBottom}
                        size="md"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. JUSTO DEBAJO: Goles, Amarillas, Roja */}
                <div className="p-3 bg-gradient-to-r from-slate-50 via-blue-50/20 to-slate-50 border border-slate-150 rounded-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Estadísticas Oficiales
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">1 toque</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {/* Goles */}
                    <div className="bg-white p-2 rounded-xl border border-slate-200 flex flex-col items-center justify-center shadow-2xs">
                      <span className="text-[10px] font-black text-slate-700 mb-1 flex items-center gap-1">⚽ Goles</span>
                      <StatPickerPopover
                        value={reports[player.id].goals}
                        onChange={(val) => handleStatSet(player.id, 'goals', val)}
                        type="goals"
                        disabled={!isPresent}
                        forceUpwards={isNearBottom}
                      />
                    </div>

                    {/* Amarillas */}
                    <div className="bg-white p-2 rounded-xl border border-slate-200 flex flex-col items-center justify-center shadow-2xs">
                      <span className="text-[10px] font-black text-slate-700 mb-1 flex items-center gap-1">🟨 Amar.</span>
                      <StatPickerPopover
                        value={reports[player.id].yellows}
                        onChange={(val) => handleStatSet(player.id, 'yellows', val)}
                        type="yellows"
                        disabled={!isPresent}
                        forceUpwards={isNearBottom}
                      />
                    </div>

                    {/* Rojas */}
                    <div className="bg-white p-2 rounded-xl border border-slate-200 flex flex-col items-center justify-center shadow-2xs">
                      <span className="text-[10px] font-black text-slate-700 mb-1 flex items-center gap-1">🟥 Roja</span>
                      <StatPickerPopover
                        value={reports[player.id].reds}
                        onChange={(val) => handleStatSet(player.id, 'reds', val)}
                        type="reds"
                        disabled={!isPresent}
                        forceUpwards={isNearBottom}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {playerList.length === 0 && (
            <div className="text-center py-8 text-sm font-medium text-slate-500">
              No hay jugadores convocados.
            </div>
          )}
        </div>

        {/* 2. Vista Escritorio (Tabla completa con cabeceras fijas) */}
        <div className="hidden md:block flex-1 overflow-x-auto overflow-y-auto p-0 custom-scrollbar pb-10">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
              <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4 w-48 sticky left-0 bg-slate-50 z-20 border-r border-slate-200 shadow-[1px_0_0_0_#e2e8f0]">Jugador</th>
                <th className="py-3 px-3 text-center">Asistencia</th>
                <th className="py-3 px-3 text-center">Nota (0-10)</th>
                <th className="py-3 px-3 text-center">Actitud (0-10)</th>
                <th className="py-3 px-3 text-center">Minutos</th>
                <th className="py-3 px-3 text-center">Goles</th>
                <th className="py-3 px-3 text-center">Asistencias</th>
                <th className="py-3 px-3 text-center">Amarillas</th>
                <th className="py-3 px-3 text-center">Rojas</th>
                <th className="py-3 px-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {playerList.map((player, idx) => {
                const currentStatus = reports[player.id].status;
                const optColor = ATTENDANCE_OPTIONS.find(o => o.value === currentStatus)?.color || 'text-slate-700 bg-slate-50 border-slate-200';
                const isNearBottom = idx >= playerList.length - 2;
                const isPresent = currentStatus === 'Presente';
                const isEvaluated = isPlayerEvaluated(player.id);
                const conv = convocatorias.find(c => c.player_id === player.id);
                const posTheme = getPositionTheme(player.posicion || player.posicion_principal);
                const dorsal = conv?.dorsal ?? player.dorsal;
                const isTitular = conv?.titular === true || conv?.titular === 1 || String(conv?.titular) === '1';

                return (
                  <tr key={player.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Fila Fija - Jugador con Avatar Profesional */}
                    <td className="py-2.5 px-4 sticky left-0 bg-white z-10 border-r border-slate-100 group-hover:bg-slate-50/50 shadow-[1px_0_0_0_#f1f5f9]">
                      <div className="flex items-center gap-2.5">
                        <PlayerAvatar
                          player={player}
                          dorsal={dorsal}
                          size="md"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-black text-slate-800 truncate">
                              {player.first_name} {player.last_name}
                            </p>
                            {isTitular && (
                              <span className="text-[8px] font-black uppercase px-1 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200" title="Titular en el acta oficial">
                                TIT
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${posTheme.badgeBg}`}>
                              {posTheme.code} · {posTheme.label}
                            </span>
                          </div>
                        </div>
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
                    <td className="py-2.5 px-3">
                      <div className="flex justify-center">
                        <ScorePickerPopover
                          value={reports[player.id].rating}
                          onChange={(val) => handleScoreChange(player.id, 'rating', val)}
                          label="Nota"
                          disabled={!isPresent}
                          forceUpwards={isNearBottom}
                        />
                      </div>
                    </td>

                    {/* Actitud */}
                    <td className="py-2.5 px-3">
                      <div className="flex justify-center">
                        <ScorePickerPopover
                          value={reports[player.id].actitud}
                          onChange={(val) => handleScoreChange(player.id, 'actitud', val)}
                          label="Actitud"
                          disabled={!isPresent}
                          forceUpwards={isNearBottom}
                        />
                      </div>
                    </td>

                    {/* Minutos */}
                    <td className="py-2.5 px-3">
                      <div className="flex justify-center">
                        <input
                          type="number"
                          min="0"
                          max="120"
                          disabled={!isPresent}
                          value={reports[player.id].minutes || ''}
                          onChange={(e) => handleMinutesChange(player.id, e.target.value)}
                          className="w-10 h-7 text-center text-[11px] font-black text-slate-700 bg-slate-50 border border-slate-200 rounded-md outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-30"
                          placeholder="0"
                        />
                      </div>
                    </td>

                    {/* Goles */}
                    <td className="py-2.5 px-2">
                      <div className="flex justify-center">
                        <StatPickerPopover
                          value={reports[player.id].goals}
                          onChange={(val) => handleStatSet(player.id, 'goals', val)}
                          type="goals"
                          disabled={!isPresent}
                          forceUpwards={isNearBottom}
                        />
                      </div>
                    </td>

                    {/* Asistencias */}
                    <td className="py-2.5 px-2">
                      <div className="flex justify-center">
                        <NumberControl playerId={player.id} field="assists" icon="Asis" />
                      </div>
                    </td>

                    {/* Amarillas */}
                    <td className="py-2.5 px-2">
                      <div className="flex justify-center">
                        <StatPickerPopover
                          value={reports[player.id].yellows}
                          onChange={(val) => handleStatSet(player.id, 'yellows', val)}
                          type="yellows"
                          disabled={!isPresent}
                          forceUpwards={isNearBottom}
                        />
                      </div>
                    </td>

                    {/* Rojas */}
                    <td className="py-2.5 px-2">
                      <div className="flex justify-center">
                        <StatPickerPopover
                          value={reports[player.id].reds}
                          onChange={(val) => handleStatSet(player.id, 'reds', val)}
                          type="reds"
                          disabled={!isPresent}
                          forceUpwards={isNearBottom}
                        />
                      </div>
                    </td>

                    {/* Estado */}
                    <td className="py-2.5 px-3 text-center">
                      {isEvaluated ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Listo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 animate-pulse">
                          <AlertCircle className="w-3 h-3 text-amber-600" />
                          Puntuar
                        </span>
                      )}
                    </td>

                  </tr>
                )
              })}

              {playerList.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-sm font-medium text-slate-500">
                    No hay jugadores convocados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer con validación estricta */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
          {!isEvaluationComplete || pendingPlayers.length > 0 ? (
            <div className="flex items-center gap-2 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl w-full sm:w-auto">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Para guardar el informe, debes calificar Nota y Actitud de los <strong>{pendingPlayers.length}</strong> jugador(es) presentes pendientes.
              </span>
            </div>
          ) : (
            <div className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl w-full sm:w-auto flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Todos los jugadores evaluados correctamente ({evaluatedCount}/{totalPlayers}).</span>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={isPending || !isEvaluationComplete || pendingPlayers.length > 0}
            className={`w-full sm:w-auto px-8 py-3 text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
              isEvaluationComplete && pendingPlayers.length === 0
                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
                : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
            }`}
          >
            {isPending ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : success ? (
              <>Guardado con éxito</>
            ) : isEvaluationComplete && pendingPlayers.length === 0 ? (
              <>
                <Save className="w-4 h-4" />
                Guardar Informe Completo
              </>
            ) : (
              `Faltan ${pendingPlayers.length} por evaluar`
            )}
          </button>
        </div>

      </div>

      {/* Modal para Añadir Motivo de Justificación */}
      <AttendanceJustificationModal
        isOpen={justifyingPlayerId !== null}
        onClose={() => setJustifyingPlayerId(null)}
        player={
          justifyingPlayerId 
            ? (() => {
                const p = playerList.find(item => item.id === justifyingPlayerId);
                if (!p) return null;
                const conv = convocatorias.find(c => c.player_id === p.id);
                return {
                  ...p,
                  dorsal: conv?.dorsal ?? p.dorsal
                };
              })()
            : null
        }
        currentMotive={justifyingPlayerId ? (reports[justifyingPlayerId]?.motive || '') : ''}
        onSaveMotive={(motive) => {
          if (justifyingPlayerId) {
            handleSaveMotive(justifyingPlayerId, motive);
          }
        }}
      />

    </div>
  )
}
