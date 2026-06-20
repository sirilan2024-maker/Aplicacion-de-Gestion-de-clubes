"use client"

import React, { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Swords, Calendar, MapPin, User, Pencil, Trash2, Plus, Users, AlertCircle, Search, Filter, Trophy } from "lucide-react"
import { deleteMatchAction } from "@/app/actions/match-actions"
import { ManageMatchModal } from "./ManageMatchModal"
import { QuickConvocatoriaModal } from "./QuickConvocatoriaModal"
import { FFCVStandings } from "./FFCVStandings"
import { TeamDisciplineView } from "./TeamDisciplineView"

interface GlobalMatchesViewProps {
  initialMatches: any[];
  teams: any[];
  equipos?: any[];
  players?: any[];
  convocatorias?: any[];
  fixedTeamId?: string;
}

export function GlobalMatchesView({ initialMatches, teams, equipos = [], players = [], convocatorias = [], fixedTeamId }: GlobalMatchesViewProps) {
  const router = useRouter()
  const [matches, setMatches] = useState(initialMatches)
  const [selectedTeamId, setSelectedTeamId] = useState<string>(fixedTeamId || "all")
  const [viewMode, setViewMode] = useState<'partidos' | 'clasificacion' | 'disciplina'>('partidos')
  
  const [editingMatch, setEditingMatch] = useState<any>(null)
  const [convocatoriaMatch, setConvocatoriaMatch] = useState<any>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [filterLocation, setFilterLocation] = useState("all")
  const [filterResult, setFilterResult] = useState("all")

  // Calculate apercibidos
  const apercibidosCount = useMemo(() => {
    if (!players || !convocatorias || !matches) return 0;
    
    // Si hay un equipo seleccionado, filtramos por él, si no usamos todos
    const validPlayers = players.filter((p: any) => 
      (selectedTeamId === "all" || p.team_id === selectedTeamId) && 
      !(p.posicion || '').toLowerCase().includes('entrenador') && 
      !(p.posicion || '').toLowerCase().includes('delegado')
    )
    
    let count = 0;
    validPlayers.forEach((player: any) => {
      const playerConvs = convocatorias.filter((c: any) => c.player_id === player.id)
      const rawEvents: any[] = []
      playerConvs.forEach((conv: any) => {
        const match = matches.find((m: any) => m.id === conv.partido_id)
        if (match && (conv.yellow_cards > 0 || conv.red_cards > 0)) {
          rawEvents.push({ match, yellow: conv.yellow_cards || 0 })
        }
      })
      const chrono = [...rawEvents].sort((a, b) => new Date(a.match.fecha_hora).getTime() - new Date(b.match.fecha_hora).getTime())
      let cycleCards = 0;
      chrono.forEach(evt => {
        if (evt.yellow === 1) {
          cycleCards += 1;
          if (cycleCards === 5) cycleCards = 0;
        }
      })
      if (cycleCards === 4) count++;
    })
    return count;
  }, [players, convocatorias, matches, selectedTeamId]);

  const filteredMatches = matches.filter(m => {
    const matchesTeam = selectedTeamId === "all" || m.equipo_id === selectedTeamId
    const searchLower = searchQuery.toLowerCase()
    const matchesSearch = !searchLower || 
      (m.rival_nombre && m.rival_nombre.toLowerCase().includes(searchLower)) ||
      (m.equipo?.name && m.equipo.name.toLowerCase().includes(searchLower))
      
    // Filter Location
    let matchesLocation = true;
    const lugarText = (m.lugar || 'visitante').toLowerCase();
    const isLocal = lugarText.includes('local') || lugarText.includes('casa');
    if (filterLocation === 'local') matchesLocation = isLocal;
    else if (filterLocation === 'visitante') matchesLocation = !isLocal;

    // Filter Result
    let matchesResult = true;
    if (filterResult !== 'all') {
      if (m.estado !== 'Finalizado') {
        matchesResult = false;
      } else {
        const gP = m.resultado_propio ?? 0;
        const gR = m.resultado_rival ?? 0;
        if (filterResult === 'ganado') matchesResult = gP > gR;
        else if (filterResult === 'perdido') matchesResult = gP < gR;
        else if (filterResult === 'empatado') matchesResult = gP === gR;
      }
    }
      
    return matchesTeam && matchesSearch && matchesLocation && matchesResult
  })

  const handleDelete = async (e: React.MouseEvent, matchId: string, teamId: string) => {
    e.stopPropagation()
    if (confirm("¿Estás seguro de que deseas eliminar este partido? Esta acción no se puede deshacer.")) {
      try {
        setIsDeleting(matchId)
        await deleteMatchAction(matchId, teamId)
        setMatches(prev => prev.filter(m => m.id !== matchId))
      } catch (error) {
        console.error(error)
        alert("Error al eliminar el partido.")
      } finally {
        setIsDeleting(null)
      }
    }
  }

  const renderStatus = (match: any) => {
    if (match.estado === 'Finalizado') {
      const gP = match.resultado_propio ?? 0
      const gR = match.resultado_rival ?? 0
      if (gP > gR) return <span className="text-emerald-500 font-bold text-xs uppercase tracking-wider">VICTORIA</span>
      if (gP < gR) return <span className="text-red-500 font-bold text-xs uppercase tracking-wider">DERROTA</span>
      return <span className="text-gray-400 font-bold text-xs uppercase tracking-wider">EMPATE</span>
    }
    if (match.estado === 'En Curso') {
      return <span className="text-amber-500 font-bold text-xs uppercase tracking-wider animate-pulse">EN DIRECTO</span>
    }
    return <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">PROGRAMADO</span>
  }

  const renderScore = (match: any) => {
    if (match.estado === 'Programado') return "- : -"
    return `${match.resultado_propio ?? 0} - ${match.resultado_rival ?? 0}`
  }

  const teamOrder = ["senior", "juvenil a", "juvenil b", "cadete a", "cadete b", "infantil a", "infantil b", "infantil c"];
  const sortedTeams = [...teams].sort((a, b) => {
    const aIdx = teamOrder.indexOf(a.name.toLowerCase().trim());
    const bIdx = teamOrder.indexOf(b.name.toLowerCase().trim());
    if (aIdx === -1 && bIdx === -1) return a.name.localeCompare(b.name);
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">
            Partidos
          </h1>
          <p className="text-slate-500 mt-1">Gestiona el calendario de competición, convocatorias y resultados.</p>
        </div>
        <button
          onClick={() => setEditingMatch({ id: 'new', equipo_id: selectedTeamId !== 'all' ? selectedTeamId : sortedTeams[0]?.id, fecha_hora: new Date().toISOString() })}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-colors self-start sm:self-auto shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Nuevo Partido
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar por equipo o rival..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          />
        </div>
        <div className="flex gap-3 relative">
          {!fixedTeamId && (
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="block w-48 py-2.5 px-3 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos los equipos</option>
              {sortedTeams.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm transition-colors ${showFilters || filterLocation !== 'all' || filterResult !== 'all' ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-slate-200 text-slate-500 bg-white hover:bg-slate-50'}`}
          >
            <Filter className="w-4 h-4" />
            Más Filtros
            {(filterLocation !== 'all' || filterResult !== 'all') && (
              <span className="flex h-2 w-2 rounded-full bg-blue-600 ml-1"></span>
            )}
          </button>
          
          {/* Popover de Más Filtros */}
          {showFilters && (
            <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-4 flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Condición</label>
                <select 
                  value={filterLocation}
                  onChange={e => setFilterLocation(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg text-sm p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="all">Todas</option>
                  <option value="local">Local</option>
                  <option value="visitante">Visitante</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Resultado</label>
                <select 
                  value={filterResult}
                  onChange={e => setFilterResult(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg text-sm p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="all">Todos</option>
                  <option value="ganado">Victorias</option>
                  <option value="empatado">Empates</option>
                  <option value="perdido">Derrotas</option>
                </select>
              </div>
              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => {
                    setFilterLocation('all');
                    setFilterResult('all');
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium"
                >
                  Limpiar filtros
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toggle View */}
      {!fixedTeamId && (
        <div className="flex justify-center mb-6 mt-4">
          <div className="flex flex-col sm:flex-row bg-slate-100 p-1.5 rounded-2xl sm:rounded-full w-full sm:w-auto gap-1 sm:gap-0">
            <button
              onClick={() => setViewMode('partidos')}
              className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl sm:rounded-full text-sm font-bold transition-all ${
                viewMode === 'partidos'
                  ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200/50'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Calendario y Resultados
            </button>
            <button
              onClick={() => setViewMode('clasificacion')}
              className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl sm:rounded-full text-sm font-bold transition-all ${
                viewMode === 'clasificacion'
                  ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200/50'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Clasificación
            </button>
            <button
              onClick={() => setViewMode('disciplina')}
              className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl sm:rounded-full text-sm font-bold transition-all flex items-center justify-center gap-2 relative ${
                viewMode === 'disciplina'
                  ? 'bg-white text-red-600 shadow-sm ring-1 ring-slate-200/50'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <AlertCircle size={16} /> Disciplina
              {apercibidosCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                  !
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Banner de Apercibidos */}
      {viewMode === 'partidos' && apercibidosCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between bg-orange-50 border border-orange-200 rounded-2xl p-4 gap-4 animate-in fade-in slide-in-from-top-2 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 p-2 rounded-full">
              <AlertCircle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h4 className="font-bold text-orange-900 text-sm sm:text-base">Jugadores Apercibidos</h4>
              <p className="text-xs sm:text-sm text-orange-700">
                Tienes {apercibidosCount} jugador{apercibidosCount > 1 ? 'es' : ''} a punto de cumplir ciclo de tarjetas amarillas.
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push('/dashboard/club/estadisticas/disciplina')}
            className="w-full sm:w-auto px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
          >
            Ver Detalles
          </button>
        </div>
      )}

      {/* Vistas */}
      {viewMode === 'clasificacion' ? (
        selectedTeamId === 'all' ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {equipos.filter(e => e.ffcv_url).length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                <p className="text-slate-500 font-medium">No hay ningún equipo con enlace a FFCV configurado en el club.</p>
              </div>
            ) : (
              equipos.filter(e => e.ffcv_url).map(e => (
                <div key={e.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <h2 className="text-xl font-bold bg-slate-50 p-4 border-b border-slate-200 text-slate-800 flex items-center">
                    <Trophy className="w-5 h-5 text-amber-500 mr-2" />
                    {e.name}
                  </h2>
                  <div className="p-4">
                    <FFCVStandings ffcvUrl={e.ffcv_url} teamName={e.name} />
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          (() => {
            const selectedTeamName = teams.find(t => t.id === selectedTeamId)?.name || '';
            const equipoCoach = equipos.find(e => e.name?.toLowerCase() === selectedTeamName.toLowerCase());
            const ffcvUrl = equipoCoach?.ffcv_url || null;
            return <FFCVStandings ffcvUrl={ffcvUrl} teamName={selectedTeamName} />;
          })()
        )
      ) : viewMode === 'disciplina' ? (
        (() => {
          const selectedTeamName = teams.find(t => t.id === selectedTeamId)?.name || '';
          const equipoCoach = equipos.find(e => e.name?.toLowerCase() === selectedTeamName.toLowerCase());
          const actualEquipoId = selectedTeamId === 'all' ? 'all' : (equipoCoach ? equipoCoach.id : selectedTeamId);
          return (
            <div className="pt-2">
              <TeamDisciplineView 
                matches={matches}
                players={players}
                convocatorias={convocatorias}
                teamId={actualEquipoId}
              />
            </div>
          );
        })()
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredMatches.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No hay partidos programados.</p>
          </div>
        ) : (
          filteredMatches.map(match => (
            <div 
              key={match.id}
              onClick={() => {
                const teamName = match.equipo?.name || teams.find(t => t.id === match.equipo_id)?.name;
                const coachEquipo = equipos.find(e => e.name?.toLowerCase() === teamName?.toLowerCase());
                const targetTeamId = coachEquipo ? coachEquipo.id : match.equipo_id;
                router.push(`/dashboard/equipos/${targetTeamId}/partidos/${match.id}`);
              }}
              className="flex flex-col rounded-xl bg-white shadow-sm ring-1 ring-slate-200 transition-all hover:shadow-md hover:ring-[#22c55e] group cursor-pointer relative"
            >
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <div className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${match.estado === 'Programado' ? "bg-slate-100 text-slate-500 border border-slate-200" : match.estado === 'Finalizado' ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-amber-50 text-amber-600 border border-amber-200"}`}>
                    {match.estado}
                  </div>
                  <div className="text-xs font-medium text-slate-500 flex items-center">
                    <Calendar className="w-3.5 h-3.5 mr-1.5" />
                    {new Date(match.fecha_hora).toLocaleDateString('es-ES')}
                  </div>
                </div>
                
                <div className="flex justify-between items-center py-4">
                  <div className="flex flex-col items-center flex-1 text-center">
                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center mb-2 shadow-sm border border-slate-200">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: match.equipo?.color || '#22c55e' }}
                      />
                    </div>
                    <span className="font-bold text-sm text-slate-900 leading-tight">{match.equipo?.name || 'Mi Equipo'}</span>
                  </div>
                  
                  <div className="px-4 flex flex-col items-center justify-center">
                    {match.estado === 'Programado' ? (
                      <span className="text-slate-300 font-black text-xl italic">VS</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className={`text-2xl font-black ${match.resultado_propio > match.resultado_rival ? "text-emerald-600" : "text-slate-700"}`}>{match.resultado_propio ?? 0}</span>
                        <span className="text-slate-300 font-bold">-</span>
                        <span className={`text-2xl font-black ${match.resultado_rival > match.resultado_propio ? "text-emerald-600" : "text-slate-700"}`}>{match.resultado_rival ?? 0}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-center flex-1 text-center">
                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center mb-2 shadow-sm border border-slate-200">
                      <div className="w-3 h-3 rounded-full bg-slate-300" />
                    </div>
                    <span className="font-bold text-sm text-slate-900 leading-tight">{match.rival_nombre || 'Rival'}</span>
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-slate-100 flex flex-col gap-3">
                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <div className="flex items-center">
                      <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      <span className="truncate max-w-[120px]">{match.lugar || 'Visitante'}</span>
                    </div>
                  </div>

                  {/* Botonera de Acción */}
                  <div 
                    className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200 w-full justify-between"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="relative">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(openDropdownId === match.id ? null : match.id);
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors border border-slate-200 shadow-sm"
                      >
                        <Users className="w-3.5 h-3.5" />
                        Convocatoria
                        <span className="ml-0.5 text-[8px]">▼</span>
                      </button>
                      
                      {/* Dropdown flotante con la lista de jugadores */}
                      {openDropdownId === match.id && (
                        <div className="absolute left-0 bottom-full mb-1 w-56 max-h-60 overflow-y-auto custom-scrollbar bg-white border border-slate-200 rounded-xl shadow-xl z-50 flex flex-col">
                          <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 font-bold text-[10px] uppercase text-slate-500 sticky top-0">
                            Jugadores Convocados
                          </div>
                        <div className="flex flex-col py-1">
                          {(() => {
                            const matchConvs = convocatorias.filter(c => c.partido_id === match.id && c.status === 'convocado');
                            if (matchConvs.length === 0) {
                              return <span className="px-3 py-2 text-xs text-slate-400 italic">No hay convocados</span>;
                            }
                            const matchTeamName = teams.find(t => t.id === match.equipo_id)?.name;
                            const oldEquipoId = equipos.find(e => e.name?.toLowerCase() === matchTeamName?.toLowerCase())?.id;
                            
                            return matchConvs.map(c => {
                              const p = players.find(player => player.id === c.player_id);
                              if (!p) return null;
                              const pos = p.posicion?.toLowerCase() || '';
                              if (pos.includes('entrenador') || pos.includes('delegado')) return null;

                              return (
                                <div key={c.id} className="px-3 py-1.5 text-xs font-medium text-slate-700 flex items-center gap-2 hover:bg-slate-50">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                  {`${p.first_name} ${p.last_name || ''}`.trim()}
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setConvocatoriaMatch(match) }}
                        className="p-1.5 bg-white hover:bg-slate-100 text-[#22c55e] rounded-lg transition-colors border border-slate-200 shadow-sm"
                        title="Gestionar Asistencia"
                      >
                        <User className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setEditingMatch(match) }}
                        className="p-1.5 bg-white hover:bg-slate-100 text-amber-500 rounded-lg transition-colors border border-slate-200 shadow-sm"
                        title="Gestionar Partido"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => handleDelete(e, match.id, match.equipo_id)}
                        disabled={isDeleting === match.id}
                        className="p-1.5 bg-white hover:bg-red-50 text-red-500 rounded-lg transition-colors border border-slate-200 shadow-sm disabled:opacity-50"
                        title="Eliminar Partido"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      )}

      {/* Modals */}
      {editingMatch && (
        <ManageMatchModal
          match={editingMatch}
          teamId={editingMatch.equipo_id}
          teams={teams}
          onClose={() => setEditingMatch(null)}
          onSave={(updatedMatch) => {
            if (editingMatch.id === 'new') {
              // Add new match with correct formatting
              const fullMatch = { ...updatedMatch, equipo: teams.find(t => t.id === updatedMatch.equipo_id) }
              setMatches(prev => [fullMatch, ...prev].sort((a, b) => new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime()))
            } else {
              setMatches(prev => prev.map(m => m.id === updatedMatch.id ? { ...m, ...updatedMatch } : m))
            }
            setEditingMatch(null)
          }}
        />
      )}

      {convocatoriaMatch && (
        <QuickConvocatoriaModal
          matchId={convocatoriaMatch.id}
          matchSubtitle={`Sporting Saladar (${convocatoriaMatch.equipo?.name || 'General'}) vs ${convocatoriaMatch.rival_nombre}`}
          players={players.filter(p => {
            const pos = p.posicion?.toLowerCase() || '';
            if (pos.includes('entrenador') || pos.includes('delegado')) return false;
            
            const matchTeamName = teams.find(t => t.id === convocatoriaMatch.equipo_id)?.name;
            const oldEquipoId = equipos?.find(e => e.name?.toLowerCase() === matchTeamName?.toLowerCase())?.id;
            const isConvocado = (convocatorias || []).some(c => c.partido_id === convocatoriaMatch.id && c.player_id === p.id);
            return isConvocado || p.team_id === oldEquipoId || p.team_id === convocatoriaMatch.equipo_id;
          })}
          convocatorias={(convocatorias || []).filter(c => c.partido_id === convocatoriaMatch.id)}
          onClose={() => setConvocatoriaMatch(null)}
        />
      )}
    </div>
  )
}
