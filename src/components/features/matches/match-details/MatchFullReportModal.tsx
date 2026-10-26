"use client"

import { useState, useTransition } from "react"
import { X, Save, ClipboardList, Plus, Minus, Info } from "lucide-react"
import { updateMatchFullReportBatch } from "@/app/actions/match-actions"
import { useRouter } from "next/navigation"

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

        {/* Content (Desktop Table & Mobile Cards) */}
        {/* 1. Vista Móvil (Tarjetas individuales sin scroll horizontal) */}
        <div className="md:hidden flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/60 custom-scrollbar">
          {playerList.map(player => {
            const currentStatus = reports[player.id].status;
            return (
              <div key={player.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs space-y-2.5">
                {/* Cabecera del Jugador */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-black text-blue-700 shrink-0">
                      {player.first_name[0] || ''}{player.last_name[0] || ''}
                    </div>
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {player.first_name} {player.last_name}
                    </p>
                  </div>
                  {/* Asistencia con botones píldora */}
                  <div className="flex items-center gap-1 shrink-0">
                    {ATTENDANCE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleUpdate(player.id, 'status', opt.value)}
                        className={`text-[10px] font-extrabold px-2 py-1 rounded-lg border transition-all ${
                          currentStatus === opt.value
                            ? (opt.value === 'Presente' ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : opt.value === 'Ausente' ? 'bg-red-600 text-white border-red-600 shadow-xs' : 'bg-amber-500 text-white border-amber-500 shadow-xs')
                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Controles de Rendimiento */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-0.5">
                  {/* Minutos */}
                  <div className="bg-slate-50 border border-slate-150 rounded-lg p-1 text-center">
                    <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Minutos</span>
                    <input
                      type="number"
                      min="0"
                      max="120"
                      value={reports[player.id].minutes || ''}
                      onChange={(e) => handleMinutesChange(player.id, e.target.value)}
                      className="w-full h-6 text-center text-xs font-black text-slate-700 bg-white border border-slate-200 rounded outline-none"
                      placeholder="0"
                    />
                  </div>

                  {/* Nota */}
                  <div className="bg-slate-50 border border-slate-150 rounded-lg p-1 flex flex-col items-center">
                    <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Nota</span>
                    <NumberControl playerId={player.id} field="rating" icon="Nota" max={10} />
                  </div>

                  {/* Actitud */}
                  <div className="bg-slate-50 border border-slate-150 rounded-lg p-1 flex flex-col items-center">
                    <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Actitud</span>
                    <NumberControl playerId={player.id} field="actitud" icon="Act" max={10} />
                  </div>

                  {/* Goles */}
                  <div className="bg-slate-50 border border-slate-150 rounded-lg p-1 flex flex-col items-center">
                    <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Goles</span>
                    <NumberControl playerId={player.id} field="goals" icon="Gol" />
                  </div>

                  {/* Asistencias */}
                  <div className="bg-slate-50 border border-slate-150 rounded-lg p-1 flex flex-col items-center">
                    <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Asist.</span>
                    <NumberControl playerId={player.id} field="assists" icon="Asis" />
                  </div>

                  {/* Tarjetas */}
                  <div className="bg-slate-50 border border-slate-150 rounded-lg p-1 flex flex-col items-center">
                    <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Tarjetas</span>
                    <div className="flex items-center gap-1">
                      <NumberControl playerId={player.id} field="yellows" icon="🟨" max={2} />
                      <NumberControl playerId={player.id} field="reds" icon="🟥" max={1} />
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
        <div className="hidden md:block flex-1 overflow-x-auto overflow-y-auto p-0 custom-scrollbar">
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
