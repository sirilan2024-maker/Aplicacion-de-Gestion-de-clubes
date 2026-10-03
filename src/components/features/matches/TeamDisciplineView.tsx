"use client"

import { useState, useEffect } from "react"
import { AlertCircle, ArrowLeft, Search, Bell } from "lucide-react"
import { useRouter } from "next/navigation"
import { DisciplineModal } from "./DisciplineModal"
import { sendDisciplineAlertAction } from "@/app/actions/chat-actions"
import { createClient } from "@/lib/supabase/client"

interface TeamDisciplineViewProps {
  matches: any[]
  players: any[]
  convocatorias: any[]
  teamId: string
}

export function TeamDisciplineView({ matches, players, convocatorias, teamId }: TeamDisciplineViewProps) {
  const router = useRouter()
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [localConvocatorias, setLocalConvocatorias] = useState<any[]>(convocatorias)
  const [canSendAlerts, setCanSendAlerts] = useState(false)
  const [alertingId, setAlertingId] = useState<string | null>(null)

  useEffect(() => {
    setLocalConvocatorias(convocatorias)
  }, [convocatorias])

  useEffect(() => {
    const checkRole = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role, roles').eq('id', user.id).single()
        if (profile) {
          const hasAccess = ['admin', 'superadmin', 'coordinador'].includes(profile.role) || (profile.roles && profile.roles.some((r: string) => ['admin', 'superadmin', 'coordinador'].includes(r)))
          setCanSendAlerts(hasAccess)
        }
      }
    }
    checkRole()
  }, [])

  const handleAvisarEntrenador = async (e: React.MouseEvent, player: any) => {
    e.stopPropagation()
    const pTeamId = player.team_id || teamId
    if (pTeamId === 'all') {
      alert("No se puede determinar el equipo del jugador.")
      return
    }
    
    setAlertingId(player.id)
    try {
      const res = await sendDisciplineAlertAction(
        player.id, 
        pTeamId, 
        `${player.first_name} ${player.last_name}`, 
        player.teams?.name || "Equipo"
      )
      
      if (res.success) {
        alert("Aviso enviado correctamente al entrenador.")
      } else {
        alert("Error al enviar el aviso: " + res.error)
      }
    } catch (err) {
      alert("Error inesperado.")
    } finally {
      setAlertingId(null)
    }
  }

  // Filtrar jugadores y técnicos amonestados del equipo
  const validPlayers = players.filter(p => {
    const pos = (p.posicion || '').toLowerCase()
    const isCoachingStaff = pos.includes('entrenador') || pos.includes('delegado') || pos.includes('cuerpo técnico')

    // Si es cuerpo técnico, solo lo incluimos si tiene tarjetas registradas en convocatorias
    if (isCoachingStaff) {
      const hasCards = localConvocatorias.some(c => 
        c.player_id === p.id && ((c.yellow_cards ?? c.tarjetas_amarillas ?? 0) > 0 || (c.red_cards ?? c.tarjetas_rojas ?? 0) > 0)
      )
      if (!hasCards) return false
    }

    if (teamId === 'all') return true

    // Pertenece directamente al equipo
    if (p.team_id === teamId) return true

    // O tiene convocatorias en partidos de este equipo
    const hasConvocatoriaInTeam = localConvocatorias.some(c => {
      if (c.player_id !== p.id) return false
      const m = matches.find(match => match.id === c.partido_id)
      return m && m.equipo_id === teamId
    })

    return hasConvocatoriaInTeam
  })

// Mapeo seguro de equipos temporada 25/26 a 26/27 para evitar datos huérfanos
const TEAM_25_TO_26_MAP: Record<string, string> = {
  'ac851720-4531-4e41-97ba-f2290aea1be4': 'c29af0ae-55aa-4bd2-87f0-7697189d5293', // SENIOR
  'b895fc97-c692-4189-a385-53bebd90d262': 'f74adef3-e72b-4800-bece-5303f07d7235', // JUVENIL A
  '3b77f128-980e-4dff-9a47-1708fd029728': 'd3c2fb73-a24b-4b60-8fb9-52f13740a05a', // JUVENIL B
  'e1be067f-2b93-4aac-969a-55c7c71badb9': '67083463-be90-4b8f-b6b2-54239af1c88b', // CADETE A
  '6895bb7b-4c3f-4a78-a2fb-db94f4e5ce50': '5633f710-7707-40d7-b812-c51a44b90d9e', // CADETE B
  '9fe1ca89-d32c-4098-8e18-60981708b57e': '7d07d46f-51e4-44f6-891c-b966a86b9cae', // INFANTIL A
  'a0393d63-fa7b-40a7-97fc-60b61483babf': '7123c91a-69c1-4b94-9f85-0914dee8bbdc', // INFANTIL B
};

  // Calcular totales por jugador
  const disciplineData = validPlayers.map(player => {
    const playerConvs = localConvocatorias.filter(c => c.player_id === player.id)
    let totalYellow = 0
    let totalRed = 0
    
    const rawEvents: any[] = []

    playerConvs.forEach(conv => {
      const match = matches.find(m => m.id === conv.partido_id)
      if (!match) return
      // REGLA DE ORO: Aislamiento permanente de temporadas. Excluir estrictamente 25/26
      if (match.season_id === '584f508a-fc1a-4339-b5b2-4296ffde2f4c') return
      if (match.season_id && match.season_id !== '663ed6ef-1dab-4350-9489-ed50f9e9ac15') return
      if (match.fecha_hora && new Date(match.fecha_hora) < new Date('2026-07-01')) return

      const yellowCount = conv.yellow_cards ?? conv.tarjetas_amarillas ?? 0
      const redCount = conv.red_cards ?? conv.tarjetas_rojas ?? 0
      if (yellowCount > 0 || redCount > 0) {
        totalYellow += yellowCount
        totalRed += redCount
        rawEvents.push({
          match,
          yellow: yellowCount,
          red: redCount
        })
      }
    })

    // Partidos finalizados del equipo ordenados cronológicamente
    const rawTeamId = player.team_id || teamId;
    const teamIdToFilter = TEAM_25_TO_26_MAP[rawTeamId] || rawTeamId;
    const finishedTeamMatches = matches
      .filter(m => {
        if (m.season_id === '584f508a-fc1a-4339-b5b2-4296ffde2f4c') return false;
        if (m.season_id && m.season_id !== '663ed6ef-1dab-4350-9489-ed50f9e9ac15') return false;
        if (m.fecha_hora && new Date(m.fecha_hora) < new Date('2026-07-01')) return false;
        return (teamIdToFilter === 'all' || m.equipo_id === teamIdToFilter) && (m.estado === 'Finalizado' || new Date(m.fecha_hora) < new Date());
      })
      .sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime());

    const lastFinishedMatchId = finishedTeamMatches[finishedTeamMatches.length - 1]?.id;

    // Ordenar cronológicamente para calcular ciclos y sanciones
    const chronologicalEvents = [...rawEvents].sort((a, b) => new Date(a.match.fecha_hora).getTime() - new Date(b.match.fecha_hora).getTime());
    let cycleCards = 0;
    let cyclesCompleted = 0;
    let redSanctions = 0;
    let pendingSanction = false;
    let pendingReason = '';

    chronologicalEvents.forEach(evt => {
      const isLastFinished = evt.match.id === lastFinishedMatchId;

      if (evt.yellow === 2 || (evt.red > 0 && evt.yellow > 0)) {
        // Doble amarilla = Expulsión y 1 partido de sanción (Art. 113 FFCV/RFEF)
        redSanctions += 1;
        if (isLastFinished) {
          pendingSanction = true;
          pendingReason = 'Doble amarilla (1 partido)';
        }
      } else if (evt.red > 0 && evt.yellow === 0) {
        // Roja directa = Expulsión y al menos 1 partido de sanción
        redSanctions += 1;
        if (isLastFinished) {
          pendingSanction = true;
          pendingReason = 'Roja directa (1 partido)';
        }
      } else if (evt.yellow === 1) {
        cycleCards += 1;
        if (cycleCards === 5) {
          cyclesCompleted += 1;
          cycleCards = 0;
          if (isLastFinished) {
            pendingSanction = true;
            pendingReason = 'Ciclo de 5 amarillas';
          }
        }
      }
    });

    const totalSanctions = cyclesCompleted + redSanctions;

    return {
      player,
      totalYellow,
      totalRed,
      cycleCards,
      cyclesCompleted,
      redSanctions,
      totalSanctions,
      pendingSanction,
      pendingReason,
      cardEvents: rawEvents.sort((a, b) => new Date(b.match.fecha_hora).getTime() - new Date(a.match.fecha_hora).getTime())
    }
  })

  // Ordenar: primero los que tienen sanción activa, luego apercibidos, luego por amarillas y rojas
  disciplineData.sort((a, b) => {
    if (a.pendingSanction !== b.pendingSanction) return a.pendingSanction ? -1 : 1;
    if ((b.cycleCards === 4) !== (a.cycleCards === 4)) return b.cycleCards === 4 ? 1 : -1;
    if (b.totalYellow !== a.totalYellow) return b.totalYellow - a.totalYellow;
    if (b.totalRed !== a.totalRed) return b.totalRed - a.totalRed;
    return a.player.first_name.localeCompare(b.player.first_name);
  });

  // Filtrar por buscador
  const filteredData = disciplineData.filter(d => {
    const name = `${d.player.first_name} ${d.player.last_name}`.toLowerCase()
    return name.includes(searchQuery.toLowerCase())
  })

  const selectedPlayer = disciplineData.find(d => d.player.id === selectedPlayerId)

  const handleOpenModal = (playerId: string) => {
    setSelectedPlayerId(playerId)
  }

  const handleCloseModal = () => {
    setSelectedPlayerId(null)
    router.refresh()
  }

  // Partidos recientes específicos del jugador para el modo edición (estrictamente temporada 26/27 y equipo correspondiente)
  const getPlayerRecentMatches = (player: any) => {
    if (!player) return [];
    const rawTeamId = player.team_id || teamId;
    const effectiveTeamId = TEAM_25_TO_26_MAP[rawTeamId] || rawTeamId;

    return [...matches]
      .filter(m => {
        // Regla 1: Exclusión absoluta de temporada pasada 25/26
        if (m.season_id === '584f508a-fc1a-4339-b5b2-4296ffde2f4c') return false;
        if (m.season_id && m.season_id !== '663ed6ef-1dab-4350-9489-ed50f9e9ac15') return false;
        if (m.fecha_hora && new Date(m.fecha_hora) < new Date('2026-07-01')) return false;

        // Regla 2: El partido debe ser del equipo del jugador O el jugador debe estar convocado en ese partido
        const belongsToTeam = effectiveTeamId && effectiveTeamId !== 'all' && m.equipo_id === effectiveTeamId;
        const hasConvocatoria = localConvocatorias.some(c => c.partido_id === m.id && c.player_id === player.id);

        if (!belongsToTeam && !hasConvocatoria) return false;

        // Regla 3: Partidos disputados o programados en los próximos 7 días (para poder registrar tarjetas del partido de hoy o fin de semana)
        const matchDate = new Date(m.fecha_hora);
        const upcomingCutoff = new Date();
        upcomingCutoff.setDate(upcomingCutoff.getDate() + 7);

        return m.estado === 'Finalizado' || matchDate <= upcomingCutoff;
      })
      .sort((a, b) => new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime())
      .slice(0, 15);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-5 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="text-red-500" />
          <h3 className="text-lg font-bold text-slate-900">Historial Disciplinario</h3>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar jugador..." 
            className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* BANNER SANCIONADOS ACTIVOS */}
      {disciplineData.filter(d => d.pendingSanction).length > 0 && (
        <div className="bg-red-50 border-b border-red-200 px-5 py-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-red-600 mt-0.5 shrink-0" size={20} />
            <div>
              <h4 className="text-sm font-bold text-red-900">
                Sancionados / Suspendidos para el Próximo Partido ({disciplineData.filter(d => d.pendingSanction).length})
              </h4>
              <p className="text-sm text-red-700 mt-0.5 mb-2">
                Los siguientes miembros deben cumplir suspensión en el próximo encuentro por expulsión (doble amarilla / roja) o acumulación de tarjetas:
              </p>
              <div className="flex flex-wrap gap-2">
                {disciplineData.filter(d => d.pendingSanction).map(a => (
                  <button 
                    key={a.player.id}
                    onClick={() => handleOpenModal(a.player.id)}
                    className="bg-white border border-red-300 text-red-800 text-xs font-bold px-3 py-1 rounded-full shadow-sm hover:bg-red-100 transition-colors flex items-center gap-1.5"
                  >
                    <div className="w-2 h-3 bg-red-600 rounded-sm"></div>
                    {a.player.first_name} {a.player.last_name} ({a.pendingReason})
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BANNER APERCIBIDOS */}
      {disciplineData.filter(d => d.cycleCards === 4 && !d.pendingSanction).length > 0 && (
        <div className="bg-orange-50 border-b border-orange-200 px-5 py-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-orange-500 mt-0.5 shrink-0" size={20} />
            <div>
              <h4 className="text-sm font-bold text-orange-800">Jugadores Apercibidos ({disciplineData.filter(d => d.cycleCards === 4 && !d.pendingSanction).length})</h4>
              <p className="text-sm text-orange-700 mt-0.5 mb-2">
                Los siguientes jugadores acumulan 4 tarjetas amarillas y serán suspendidos si reciben una tarjeta más:
              </p>
              <div className="flex flex-wrap gap-2">
                {disciplineData.filter(d => d.cycleCards === 4 && !d.pendingSanction).map(a => (
                  <div key={a.player.id} className="flex items-center gap-0">
                    <button 
                      onClick={() => handleOpenModal(a.player.id)}
                      className="bg-white border border-orange-300 text-orange-800 text-xs font-bold px-3 py-1 rounded-full shadow-sm hover:bg-orange-100 transition-colors flex items-center gap-1.5"
                    >
                      <div className="w-2 h-3 bg-amber-400 rounded-sm"></div>
                      {a.player.first_name} {a.player.last_name}
                    </button>
                    {canSendAlerts && (
                      <button
                        onClick={(e) => handleAvisarEntrenador(e, a.player)}
                        disabled={alertingId === a.player.id}
                        className="bg-white border border-slate-200 text-slate-600 hover:text-blue-600 text-xs px-2 py-1 rounded-full shadow-sm hover:bg-slate-50 transition-colors flex items-center gap-1 -ml-1 disabled:opacity-50 z-10"
                        title="Avisar al entrenador"
                      >
                        <Bell size={12} className={alertingId === a.player.id ? "animate-pulse" : ""} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-0">
        {/* Vista Desktop (Tabla) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap min-w-[500px]">
            <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase font-bold text-slate-500">
              <tr>
                <th className="px-6 py-4">Jugador / Técnico</th>
                <th className="px-5 py-4 text-center w-36">
                  <div className="flex justify-center items-center gap-1">
                    <div className="w-3 h-4 bg-amber-400 rounded-sm" />
                    <span>Amarillas Totales</span>
                  </div>
                </th>
                <th className="px-5 py-4 text-center w-40">Sanciones</th>
                <th className="px-5 py-4 text-center w-44">Ciclo Actual</th>
                <th className="px-5 py-4 text-center w-24">
                  <div className="flex justify-center items-center gap-1">
                    <div className="w-3 h-4 bg-red-500 rounded-sm" />
                    <span>Rojas</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-right">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.map(d => (
                <tr 
                  key={d.player.id} 
                  onClick={() => handleOpenModal(d.player.id)}
                  className={`transition-colors cursor-pointer group ${d.pendingSanction ? 'bg-red-50/70 hover:bg-red-100/80' : d.cycleCards === 4 ? 'bg-orange-50/80 hover:bg-orange-100' : 'hover:bg-slate-50'}`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {d.player.avatar_url ? (
                        <img src={d.player.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shadow-sm" />
                      ) : (
                        <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold text-xs">
                          {d.player.first_name.charAt(0)}{d.player.last_name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          {d.player.first_name} {d.player.last_name}
                          {d.pendingSanction && (
                            <span title="Sancionado para el próximo encuentro" className="flex items-center text-red-700 bg-red-100 font-bold border border-red-200 px-2 py-0.5 rounded-md text-[10px] uppercase">
                              <AlertCircle size={10} className="mr-1"/> Sancionado
                            </span>
                          )}
                          {d.cycleCards === 4 && !d.pendingSanction && (
                            <span title="Apercibido (Próxima amarilla conlleva sanción)" className="flex items-center text-orange-700 bg-orange-100 font-bold border border-orange-200 px-2 py-0.5 rounded-md text-[10px] uppercase">
                              <AlertCircle size={10} className="mr-1"/> Apercibido
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 capitalize">{d.player.posicion || 'Sin posición'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center font-black text-slate-900 text-base">
                    {d.totalYellow > 0 ? d.totalYellow : '-'}
                  </td>
                  <td className="px-5 py-4 text-center">
                    {d.pendingSanction ? (
                      <span className="px-2.5 py-1 bg-red-100 border border-red-300 text-red-800 rounded-lg text-xs font-black inline-flex items-center gap-1 shadow-xs animate-pulse">
                        <AlertCircle size={12} className="text-red-600" /> Sanción Activa
                      </span>
                    ) : d.totalSanctions > 0 ? (
                      <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-black" title="Sanción cumplida en jornada posterior">
                        {d.totalSanctions} {d.totalSanctions === 1 ? 'sanción (cumplida)' : 'sanciones (cumplidas)'}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-medium text-xs">0</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[11px] font-bold text-slate-600">
                        Ciclo #{d.cyclesCompleted + 1} ({d.cycleCards}/5)
                      </span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(slot => (
                          <div 
                            key={slot} 
                            className={`w-3.5 h-3.5 rounded-full border ${
                              slot <= d.cycleCards 
                                ? (d.cycleCards === 4 ? 'bg-amber-500 border-amber-600 animate-pulse' : 'bg-yellow-400 border-yellow-500') 
                                : 'bg-slate-100 border-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className={`font-black ${d.totalRed > 0 ? 'text-red-500' : 'text-slate-300'}`}>
                      {d.totalRed}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {canSendAlerts && (d.cycleCards === 4 || d.pendingSanction) && (
                        <button
                          onClick={(e) => handleAvisarEntrenador(e, d.player)}
                          disabled={alertingId === d.player.id}
                          className="text-slate-400 hover:text-blue-600 transition-colors disabled:opacity-50 p-1.5 hover:bg-blue-50 rounded-full"
                          title="Avisar al entrenador"
                        >
                          <Bell size={16} className={alertingId === d.player.id ? "animate-pulse" : ""} />
                        </button>
                      )}
                      <span className="text-blue-600 font-bold text-xs uppercase opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end gap-1">
                        Ver <ArrowLeft size={14} className="rotate-180" />
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No se encontraron jugadores.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Vista Móvil (Tarjetas) */}
        <div className="block md:hidden space-y-3 p-3 bg-slate-50/50">
          {filteredData.map(d => (
            <div 
              key={d.player.id} 
              onClick={() => handleOpenModal(d.player.id)}
              className={`p-4 rounded-xl shadow-sm border transition-colors cursor-pointer group ${d.pendingSanction ? 'bg-red-50 hover:bg-red-100 border-red-200' : d.cycleCards === 4 ? 'bg-orange-50 hover:bg-orange-100 border-orange-200' : 'bg-white hover:bg-slate-50 border-slate-200'}`}
            >
              <div className="flex items-center gap-3 mb-3">
                {d.player.avatar_url ? (
                  <img src={d.player.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover shadow-sm" />
                ) : (
                  <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold text-sm">
                    {d.player.first_name.charAt(0)}{d.player.last_name.charAt(0)}
                  </div>
                )}
                <div className="flex-1">
                  <div className="font-bold text-slate-900 flex flex-wrap items-center gap-2">
                    {d.player.first_name} {d.player.last_name}
                    {d.pendingSanction && (
                      <span title="Sancionado para el próximo encuentro" className="flex items-center text-red-700 bg-red-100 font-bold border border-red-200 px-1.5 py-0.5 rounded text-[10px] uppercase">
                        <AlertCircle size={10} className="mr-1"/> Sancionado
                      </span>
                    )}
                    {d.cycleCards === 4 && !d.pendingSanction && (
                      <span title="Apercibido (Próxima amarilla conlleva sanción)" className="flex items-center text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded text-[10px] uppercase">
                        <AlertCircle size={10} className="mr-1"/> Apercibido
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 capitalize">{d.player.posicion || 'Sin posición'}</div>
                </div>
                {canSendAlerts && (d.cycleCards === 4 || d.pendingSanction) && (
                  <button
                    onClick={(e) => handleAvisarEntrenador(e, d.player)}
                    disabled={alertingId === d.player.id}
                    className="text-slate-400 hover:text-blue-600 transition-colors disabled:opacity-50 p-1.5 hover:bg-blue-50 rounded-full"
                    title="Avisar al entrenador"
                  >
                    <Bell size={16} className={alertingId === d.player.id ? "animate-pulse" : ""} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white p-2 rounded-lg text-center border border-slate-200 flex flex-col items-center justify-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <div className="w-2.5 h-3.5 bg-amber-400 rounded-sm" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Total Amarillas</span>
                  </div>
                  <div className="font-black text-slate-800 text-sm">
                    {d.totalYellow > 0 ? d.totalYellow : '-'}
                  </div>
                </div>

                <div className="bg-white p-2 rounded-lg text-center border border-slate-200 flex flex-col items-center justify-center">
                  <span className="text-[10px] font-bold text-slate-700 uppercase mb-1">Sanciones</span>
                  <div className="font-black text-sm">
                    {d.pendingSanction ? (
                      <span className="text-red-600">Activa (1p)</span>
                    ) : d.totalSanctions > 0 ? (
                      <span className="text-slate-700">{d.totalSanctions} cumplida{d.totalSanctions > 1 ? 's' : ''}</span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </div>
                </div>

                <div className="bg-white p-2 rounded-lg text-center border border-slate-200 flex flex-col items-center justify-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase mb-1">Ciclo #{d.cyclesCompleted + 1}</span>
                  <div className="font-black text-slate-800 text-sm">
                    {d.cycleCards}/5
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filteredData.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              No se encontraron jugadores.
            </div>
          )}
        </div>
      </div>

      {selectedPlayer && (
        <DisciplineModal 
          player={selectedPlayer.player}
          cardEvents={selectedPlayer.cardEvents}
          recentMatches={getPlayerRecentMatches(selectedPlayer.player)}
          convocatorias={localConvocatorias}
          onClose={handleCloseModal}
          onCardsUpdated={(yellowDelta, redDelta, matchId, yellows, reds) => {
            setLocalConvocatorias(prev => {
              const existingIdx = prev.findIndex(c => c.partido_id === matchId && c.player_id === selectedPlayer.player.id)
              if (existingIdx >= 0) {
                const next = [...prev]
                next[existingIdx] = { ...next[existingIdx], yellow_cards: yellows, red_cards: reds }
                return next
              } else {
                return [...prev, { partido_id: matchId, player_id: selectedPlayer.player.id, yellow_cards: yellows, red_cards: reds }]
              }
            })
          }}
        />
      )}
    </div>
  )
}
