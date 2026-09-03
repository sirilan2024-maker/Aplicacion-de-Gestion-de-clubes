'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  Plus,
  Target,
  ShieldAlert,
  Sparkles,
  ChevronRight,
  Activity,
  Layers,
} from 'lucide-react';
import {
  ANATOMICAL_ZONES,
  ANATOMICAL_TABS,
  AnatomicalZone,
  AnatomicalTabCategory,
  getTabCategoryForZone,
} from '@/hooks/useAnatomySelection';
import { PlayerInjuryDTO } from '@/app/actions/injury-actions';

interface MuscleSearchTabsPanelProps {
  selectedCode?: string | null;
  onSelectZone: (code: string) => void;
  injuries?: PlayerInjuryDTO[];
  onCustomMuscleAdd?: (name: string, region: string) => void;
  onStartNewInjury?: (code: string) => void;
}

export function MuscleSearchTabsPanel({
  selectedCode,
  onSelectZone,
  injuries = [],
  onCustomMuscleAdd,
  onStartNewInjury,
}: MuscleSearchTabsPanelProps) {
  const [activeTab, setActiveTab] = useState<AnatomicalTabCategory>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);
  const [customName, setCustomName] = useState<string>('');
  const [customRegion, setCustomRegion] = useState<string>('Muslo');

  // Mapear qué zonas tienen lesiones activas
  const activeInjuryMap = useMemo(() => {
    const map = new Set<string>();
    injuries.forEach((inj) => {
      if (inj.status === 'activa') {
        const bs = (inj.bodyStructure || '').toLowerCase();
        Object.entries(ANATOMICAL_ZONES).forEach(([code, zone]) => {
          if (bs.includes(zone.name.toLowerCase()) || zone.name.toLowerCase().includes(bs)) {
            map.add(code);
          }
        });
      }
    });
    return map;
  }, [injuries]);

  // Lista de todos los músculos disponibles
  const allZonesList = useMemo(() => {
    return Object.values(ANATOMICAL_ZONES);
  }, []);

  // Filtrado por pestaña y por término de búsqueda
  const filteredZones = useMemo(() => {
    return allZonesList.filter((zone) => {
      // Filtro de búsqueda
      const matchesSearch =
        !searchQuery.trim() ||
        zone.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        zone.muscleGroup.toLowerCase().includes(searchQuery.toLowerCase()) ||
        zone.generalRegion.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (zone.mecanismoComun && zone.mecanismoComun.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      // Filtro de pestaña
      if (activeTab === 'todos') return true;
      const category = getTabCategoryForZone(zone);
      return category === activeTab;
    });
  }, [allZonesList, activeTab, searchQuery]);

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;
    onCustomMuscleAdd?.(customName.trim(), customRegion);
    setShowCustomModal(false);
    setCustomName('');
  };

  return (
    <div className="w-full bg-[#0b0f17] border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-3 shadow-xl">
      {/* 1. Barra de Búsqueda Instantánea y Botón de Personalizado */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre (ej: bíceps, sóleo, deltoides, aductor...)"
            className="w-full pl-9 pr-8 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-0.5 rounded cursor-pointer"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowCustomModal(true)}
          className="px-2.5 py-2 rounded-xl text-[11px] font-bold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          title="Añadir Músculo o Estructura Personalizada"
        >
          <Plus size={14} className="text-emerald-400" />
          <span className="hidden sm:inline">Músculo a medida</span>
        </button>
      </div>

      {/* 2. Pestañas de Regiones Anatómicas */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-800/70">
        {ANATOMICAL_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                isActive
                  ? 'bg-emerald-950 border border-emerald-500/70 text-emerald-300 shadow-xs'
                  : 'bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800/60'
              }`}
            >
              <span>{tab.label}</span>
              {tab.id === 'todos' && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 font-mono">
                  {allZonesList.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Listado de Músculos Filtrados */}
      <div className="max-h-[280px] sm:max-h-[320px] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {filteredZones.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
            <Layers size={20} className="text-slate-600" />
            <p>No se encontraron músculos que coincidan con la búsqueda.</p>
            <button
              type="button"
              onClick={() => setShowCustomModal(true)}
              className="text-emerald-400 hover:underline font-bold text-xs"
            >
              ¿Deseas añadir "{searchQuery}" como músculo personalizado?
            </button>
          </div>
        ) : (
          filteredZones.map((zone) => {
            const isSelected = selectedCode === zone.code;
            const hasActiveInjury = activeInjuryMap.has(zone.code);

            return (
              <div
                key={zone.code}
                onClick={() => onSelectZone(zone.code)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-emerald-950/40 border-emerald-500/80 shadow-sm'
                    : hasActiveInjury
                    ? 'bg-rose-950/30 border-rose-500/50 hover:border-rose-400'
                    : 'bg-slate-950/60 hover:bg-slate-900/90 border-slate-800/70 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white truncate">
                      {zone.name}
                    </span>
                    {zone.isGoalkeeperZone && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950 border border-amber-800 text-amber-300 font-bold shrink-0">
                        🧤 Portero
                      </span>
                    )}
                    {hasActiveInjury && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-950 border border-rose-800 text-rose-300 font-extrabold shrink-0 flex items-center gap-1 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        Lesión Activa
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                    <span>{zone.generalRegion}</span>
                    <span>•</span>
                    <span className="text-slate-300 font-medium">{zone.laterality || 'Bilateral'}</span>
                    <span>•</span>
                    <span className="text-amber-400 font-bold">{zone.incidencia || 'Media'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectZone(zone.code);
                      onStartNewInjury?.(zone.code);
                    }}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-white bg-rose-600 hover:bg-rose-500 active:bg-rose-700 transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                    title="Registrar Lesión en este músculo"
                  >
                    <Target size={11} />
                    <span>Lesionar</span>
                  </button>
                  <ChevronRight size={14} className="text-slate-600" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. Modal para Añadir Músculo Personalizado */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0b0f17] border border-slate-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-emerald-400" />
                <h4 className="text-sm font-bold text-white">Añadir Músculo o Estructura Personalizada</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="text-slate-500 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateCustom} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-bold">Nombre de la Estructura / Músculo</label>
                <input
                  type="text"
                  required
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Ej: Pronador redondo, Gemelo accesorio, Fascia plantar..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-bold">Región Anatómica</label>
                <select
                  value={customRegion}
                  onChange={(e) => setCustomRegion(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Hombro y Brazo">Hombro y Brazo</option>
                  <option value="Codo y Antebrazo">Codo y Antebrazo</option>
                  <option value="Muñeca y Mano">Muñeca y Mano</option>
                  <option value="Core y Espalda">Core y Espalda</option>
                  <option value="Muslo Anterior">Muslo Anterior (Cuádriceps)</option>
                  <option value="Muslo Posterior">Muslo Posterior (Isquiotibiales)</option>
                  <option value="Ingle y Cadera">Ingle y Cadera (Aductores)</option>
                  <option value="Pantorrilla y Tobillo">Pantorrilla y Tobillo</option>
                  <option value="Pie">Pie y Tendón de Aquiles</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/30"
                >
                  <Plus size={13} />
                  <span>Guardar e Incorporar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
