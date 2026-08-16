'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { WeeklyMicrocycleView } from '@/components/microcycle/WeeklyMicrocycleView';
import { TrainingAssistantModal } from '@/components/assistant/TrainingAssistantModal';
import { ImportDrillModal } from '@/components/modals/ImportDrillModal';
import { LoadTrafficLight } from '@/components/microcycle/LoadTrafficLight';
import { TacticalPitch } from '@/components/tactical/TacticalPitch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  seedClubDrillsAction,
  getClubDrillsAction,
  getClubTeamsAction,
  getTeamSessionsAction,
} from '@/actions/saveTrainingSession';
import toast from 'react-hot-toast';
import {
  Brain, Users, Calendar, Clock, MapPin, Dumbbell,
  Filter, ListFilter, LayoutGrid, List, Plus, Search,
  Sparkles, Layers, ChevronDown, ChevronUp, RefreshCw, Globe
} from 'lucide-react';
import { MICROCYCLE_DAY_LABELS, CATEGORY_PEDAGOGY } from '@/types/microcycle';
import type { MicrocycleDay, FootballCategory } from '@/types/microcycle';
import type { Ejercicio } from '@/types/exercises';

interface Team {
  id: string;
  name: string;
  age_category?: string;
  num_players?: number;
}

export function BancoTareasModule({ initialTeamId }: { initialTeamId?: string }) {
  const params = useParams();
  const routeTeamId = (params?.teamId as string) || initialTeamId || '';

  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>(routeTeamId);
  const [activeTab, setActiveTab] = useState<'microcycle' | 'drills' | 'sessions'>('microcycle');
  
  // Microcycle & Sessions state
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [defaultDay, setDefaultDay] = useState<MicrocycleDay>('MD_minus_3');
  const [filterDay, setFilterDay] = useState<string>('all');

  // Drills library state
  const [drills, setDrills] = useState<Ejercicio[]>([]);
  const [isLoadingDrills, setIsLoadingDrills] = useState(false);
  const [drillSearchTerm, setDrillSearchTerm] = useState('');
  const [drillFilterCategory, setDrillFilterCategory] = useState<string>('all');
  const [expandedDrillId, setExpandedDrillId] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // 1. Selected team memoized
  const selectedTeam = useMemo(() => {
    if (teams.length === 0) return null;
    return teams.find(t => t.id === selectedTeamId) || teams[0];
  }, [teams, selectedTeamId]);

  const effectiveTeamId = selectedTeam?.id || selectedTeamId || '';
  const ageCategory = (selectedTeam?.age_category as FootballCategory) || 'senior';
  const pedagogy = CATEGORY_PEDAGOGY[ageCategory] || CATEGORY_PEDAGOGY.senior;

  // 2. Cargar equipos una sola vez al montar
  useEffect(() => {
    let isMounted = true;
    async function loadTeams() {
      try {
        const res = await getClubTeamsAction();
        if (isMounted && res.success && res.data && res.data.length > 0) {
          setTeams(res.data);
          if (!selectedTeamId || !res.data.some(t => t.id === selectedTeamId)) {
            setSelectedTeamId(res.data[0].id);
          }
        }
      } catch (err) {
        console.error('[loadTeams] Error:', err);
      }
    }
    loadTeams();
    return () => { isMounted = false; };
  }, []);

  // 3. Cargar biblioteca de ejercicios
  const loadDrills = useCallback(async () => {
    setIsLoadingDrills(true);
    try {
      const res = await getClubDrillsAction();
      if (res.success && res.data) {
        setDrills(res.data as Ejercicio[]);
      }
    } catch (err) {
      console.error('[loadDrills] Error:', err);
    } finally {
      setIsLoadingDrills(false);
    }
  }, []);

  useEffect(() => {
    loadDrills();
  }, [loadDrills]);

  // 4. Cargar sesiones cuando cambia el equipo seleccionado
  const loadSessions = useCallback(async () => {
    if (!effectiveTeamId) return;
    setIsLoadingSessions(true);
    try {
      const res = await getTeamSessionsAction(effectiveTeamId);
      if (res.success && res.data) {
        setSessions(res.data);
      }
    } catch (err) {
      console.error('[loadSessions] Error:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  }, [effectiveTeamId]);

  useEffect(() => {
    if (effectiveTeamId) {
      loadSessions();
    }
  }, [effectiveTeamId, loadSessions]);

  const handleOpenAssistant = (day: MicrocycleDay) => {
    setDefaultDay(day);
    setIsAssistantOpen(true);
  };

  const handleSeedDefaultDrills = async () => {
    setIsSeeding(true);
    try {
      const res = await seedClubDrillsAction();
      if (res.success) {
        const insertedCount = 'inserted' in res ? res.inserted : 0;
        toast.success(`🌱 Se cargaron ${insertedCount} tareas arquetípicas.`);
        loadDrills();
      } else {
        toast.error(res.error || 'Error al cargar tareas');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al sembrar tareas');
    } finally {
      setIsSeeding(false);
    }
  };

  // Filtrado de ejercicios
  const filteredDrills = useMemo(() => {
    return drills.filter(drill => {
      const matchesSearch = drillSearchTerm === '' ||
        drill.nombre.toLowerCase().includes(drillSearchTerm.toLowerCase()) ||
        (drill.descripcion && drill.descripcion.toLowerCase().includes(drillSearchTerm.toLowerCase())) ||
        (drill.tags && drill.tags.some(t => t.toLowerCase().includes(drillSearchTerm.toLowerCase())));

      const matchesCategory = drillFilterCategory === 'all' ||
        drill.age_category === drillFilterCategory ||
        (drill.categoria_edad && drill.categoria_edad.includes(drillFilterCategory as any));

      return matchesSearch && matchesCategory;
    });
  }, [drills, drillSearchTerm, drillFilterCategory]);

  // Filtrado de sesiones
  const filteredSessions = useMemo(() => {
    if (filterDay === 'all') return sessions;
    return sessions.filter(s => s.microcycle_day === filterDay);
  }, [sessions, filterDay]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* ── Header Principal ─────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 flex items-center justify-center shadow-md shadow-blue-500/20">
            <Dumbbell className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Banco de Tareas y Entrenamientos</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-800 uppercase tracking-wider">
                IA & Periodización
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Planificación metodológica asistida por IA y biblioteca interactiva de ejercicios.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {drills.length === 0 && (
            <Button
              variant="outline"
              onClick={handleSeedDefaultDrills}
              disabled={isSeeding}
              className="gap-2 border-dashed border-emerald-500 text-emerald-700 hover:bg-emerald-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSeeding ? 'animate-spin' : ''}`} />
              Cargar Tareas de Ejemplo
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => setIsImportModalOpen(true)}
            className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
          >
            <Globe className="w-4 h-4 text-indigo-600" />
            Importar desde Web
          </Button>

          <Button
            onClick={() => setIsAssistantOpen(true)}
            className="gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white shadow-md shadow-blue-500/20"
          >
            <Brain className="w-4 h-4" />
            Asistente IA de Sesiones
          </Button>
        </div>
      </div>

      {/* ── Selector de Equipos Global ─────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <Users className="w-4 h-4 text-blue-600" />
            <span>Seleccionar Equipo:</span>
          </div>

          {/* Selector de Pestañas de Vista */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('microcycle')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'microcycle'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Microciclo Semanal
            </button>
            <button
              onClick={() => setActiveTab('drills')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'drills'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Biblioteca ({drills.length})
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'sessions'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Sesiones ({sessions.length})
            </button>
          </div>
        </div>

        {/* Lista de botones de equipos */}
        <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
          {teams.map((team) => {
            const isSelected = selectedTeamId === team.id;
            return (
              <button
                key={team.id}
                onClick={() => setSelectedTeamId(team.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-200 border border-slate-200/60'
                }`}
              >
                <span>{team.name}</span>
                {team.age_category && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  } capitalize`}>
                    {team.age_category}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Resumen Pedagógico del Equipo Activo */}
        {selectedTeam && pedagogy && (
          <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-slate-500 uppercase tracking-wide">Foco Metodológico:</span>
            {pedagogy.focus.map(f => (
              <span key={f} className="bg-blue-50 text-blue-700 font-semibold px-2.5 py-0.5 rounded-full border border-blue-100">
                {f}
              </span>
            ))}
            {!pedagogy.allowTactics && (
              <span className="bg-amber-50 text-amber-700 font-semibold px-2.5 py-0.5 rounded-full border border-amber-100">
                100% Lúdico (Sin táctica abstracta)
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── TAB 1: MICROCICLO SEMANAL ─────────────────────────── */}
      {activeTab === 'microcycle' && selectedTeam && (
        <WeeklyMicrocycleView
          teamId={effectiveTeamId}
          teamName={selectedTeam.name}
          ageCategory={ageCategory}
          sessions={sessions}
          onOpenAssistant={handleOpenAssistant}
        />
      )}

      {/* ── TAB 2: BIBLIOTECA DE TAREAS CON PIZARRA SVG ───────── */}
      {activeTab === 'drills' && (
        <div className="space-y-4">
          {/* Barra de Búsqueda y Filtros de Tareas */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar tareas por nombre, objetivo, técnica..."
                value={drillSearchTerm}
                onChange={(e) => setDrillSearchTerm(e.target.value)}
                className="pl-9 bg-slate-50 border-slate-200 text-sm rounded-xl"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
              <Button
                onClick={() => setIsImportModalOpen(true)}
                size="sm"
                variant="outline"
                className="gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs font-bold whitespace-nowrap"
              >
                <Globe className="w-3.5 h-3.5 text-indigo-600" />
                Importar URL
              </Button>
              <button
                onClick={() => setDrillFilterCategory('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  drillFilterCategory === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todas las categorías
              </button>
              {['querubin', 'prebenjamin', 'benjamin', 'alevin', 'infantil', 'cadete', 'juvenil', 'senior'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setDrillFilterCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap capitalize transition-all ${
                    drillFilterCategory === cat
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Grid de Tareas */}
          {isLoadingDrills ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-56 bg-slate-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filteredDrills.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
              <Dumbbell className="w-12 h-12 mb-3 text-slate-300" />
              <h3 className="font-bold text-slate-800 text-base">No se encontraron tareas</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm">
                Puedes importar tareas desde cualquier enlace web (como CoachTruly), crearlas con IA o cargar el catálogo de ejemplo.
              </p>
              <div className="flex items-center gap-2 mt-4 flex-wrap justify-center">
                <Button onClick={() => setIsImportModalOpen(true)} variant="outline" size="sm" className="gap-1.5 border-indigo-300 text-indigo-700">
                  <Globe className="w-3.5 h-3.5" />
                  Importar desde Web
                </Button>
                <Button onClick={handleSeedDefaultDrills} variant="outline" size="sm" className="gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Cargar Ejercicios Base
                </Button>
                <Button onClick={() => setIsAssistantOpen(true)} size="sm" className="gap-1.5 bg-blue-600">
                  <Brain className="w-3.5 h-3.5" />
                  Crear con IA
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredDrills.map((drill) => {
                const isExpanded = expandedDrillId === drill.id;
                return (
                  <div
                    key={drill.id}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col"
                  >
                    {/* Visualización de la Pizarra Táctica SVG si existe */}
                    {drill.tactical_board_data && (
                      <div className="p-3 bg-slate-900/5 border-b border-slate-100">
                        <TacticalPitch data={drill.tactical_board_data} className="rounded-xl shadow-inner" />
                      </div>
                    )}

                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">
                            {drill.age_category || (drill.categoria_edad && drill.categoria_edad[0]) || 'General'}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">
                            ⏱ {drill.duracion_recomendada || 15} min
                          </span>
                        </div>

                        <h3 className="font-bold text-slate-900 text-base leading-snug">
                          {drill.nombre}
                        </h3>

                        <p className={`text-xs text-slate-600 mt-1.5 leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                          {drill.descripcion || 'Sin descripción detallada.'}
                        </p>
                      </div>

                      {/* Detalles desplegables */}
                      {isExpanded && (
                        <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                          {drill.objetivo_tecnico && drill.objetivo_tecnico.length > 0 && (
                            <div>
                              <span className="font-bold text-slate-700">Objetivo Técnico: </span>
                              <span className="text-slate-600">{drill.objetivo_tecnico.join(', ')}</span>
                            </div>
                          )}
                          {drill.material && drill.material.length > 0 && (
                            <div>
                              <span className="font-bold text-slate-700">Material: </span>
                              <span className="text-slate-600">{drill.material.join(', ')}</span>
                            </div>
                          )}
                          {drill.microcycle_day && (
                            <div>
                              <span className="font-bold text-slate-700">Día Sugerido: </span>
                              <span className="text-blue-600 font-semibold">{MICROCYCLE_DAY_LABELS[drill.microcycle_day as MicrocycleDay] || drill.microcycle_day}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                        <button
                          onClick={() => setExpandedDrillId(isExpanded ? null : drill.id)}
                          className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          {isExpanded ? 'Ver menos' : 'Ver detalle'}
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        <div className="flex items-center gap-1">
                          {drill.intensity_level && (
                            <LoadTrafficLight level={drill.intensity_level as 1|2|3|4|5} size="sm" showLabel={false} />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: SESIONES GUARDADAS ─────────────────────────── */}
      {activeTab === 'sessions' && (
        <div className="space-y-4">
          {/* Filtros de Sesiones */}
          <div className="flex flex-wrap items-center gap-2 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <ListFilter className="w-4 h-4 text-blue-600" />
              <span>Día de Microciclo:</span>
            </div>
            <button
              onClick={() => setFilterDay('all')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                filterDay === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos
            </button>
            {Object.entries(MICROCYCLE_DAY_LABELS).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setFilterDay(value)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  filterDay === value ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {value.replace('MD_', 'MD').replace('plus_', '+').replace('minus_', '-')}
              </button>
            ))}
          </div>

          {isLoadingSessions ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-40 bg-slate-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
              <Brain className="w-12 h-12 mb-3 opacity-30 text-blue-500" />
              <p className="text-base font-bold text-slate-700">No hay sesiones registradas para este equipo</p>
              <p className="text-xs text-slate-500 mt-1">Genera tu primera sesión adaptada por IA</p>
              <Button onClick={() => setIsAssistantOpen(true)} className="mt-4 gap-2 bg-blue-600" size="sm">
                <Brain className="w-4 h-4" />
                Generar Sesión con IA
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all"
                >
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        {session.microcycle_day
                          ? MICROCYCLE_DAY_LABELS[session.microcycle_day as MicrocycleDay]
                          : 'Entrenamiento'}
                      </p>
                      <p className="text-sm font-bold text-slate-900 capitalize">
                        {session.age_category || selectedTeam?.age_category || 'General'}
                      </p>
                    </div>
                    {session.intensity_load && (
                      <LoadTrafficLight level={session.intensity_load as 1|2|3|4|5} size="sm" showLabel={false} />
                    )}
                  </div>

                  <div className="p-4 space-y-2 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span>{new Date(session.date || session.date_time || Date.now()).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span>{session.duration_minutes || (session.session_drills?.reduce((acc: number, d: any) => acc + (d.duration_min || 0), 0)) || 75} minutos</span>
                    </div>
                    {session.session_drills && (
                      <div className="flex items-center gap-2">
                        <Dumbbell className="w-4 h-4 text-blue-600" />
                        <span>{session.session_drills.length} tareas planificadas</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Modal Asistente IA ───────────────────────────────── */}
      <TrainingAssistantModal
        isOpen={isAssistantOpen}
        onClose={() => {
          setIsAssistantOpen(false);
          loadSessions();
          loadDrills();
        }}
        teamId={effectiveTeamId}
        teamName={selectedTeam?.name || 'Equipo Principal'}
        ageCategory={ageCategory}
        defaultMicrocycleDay={defaultDay}
        numPlayers={16}
      />

      {/* ── Modal Importador Web de Ejercicios ───────────────── */}
      <ImportDrillModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onDrillImported={() => {
          loadDrills();
          setActiveTab('drills');
        }}
        defaultCategory={ageCategory}
      />
    </div>
  );
}

export default BancoTareasModule;
