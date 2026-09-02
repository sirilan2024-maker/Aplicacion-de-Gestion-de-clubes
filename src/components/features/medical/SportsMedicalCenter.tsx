'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Plus,
  Clock,
  Layers,
  Sparkles,
  RefreshCw,
  TrendingUp,
  FileText
} from 'lucide-react';
import { InteractiveAnatomyViewer } from './InteractiveAnatomyViewer';
import { AnatomicalStructureCard } from './AnatomicalStructureCard';
import {
  PlayerInjuryDTO,
  getPlayerInjuriesAction,
  resolveInjuryAction
} from '@/app/actions/injury-actions';
import { ANATOMICAL_ZONES } from '@/hooks/useAnatomySelection';
import { ClinicalInjuryWizard } from './ClinicalInjuryWizard';
import { EpisodeClinicalDashboard } from './EpisodeClinicalDashboard';
import { RtsRehabilitationDashboard } from './RtsRehabilitationDashboard';

interface SportsMedicalCenterProps {
  playerId: string;
  playerName: string;
  playerNumber?: string | number;
  playerPosition?: string;
  playerAvatarUrl?: string;
  playerStatus?: string;
  onInjuriesChange?: (hasActive: boolean) => void;
}

export function SportsMedicalCenter({
  playerId,
  playerName,
  playerNumber = '#8',
  playerPosition = 'Centrocampista',
  playerAvatarUrl,
  playerStatus = 'Disponible',
  onInjuriesChange,
}: SportsMedicalCenterProps) {
  const [injuries, setInjuries] = useState<PlayerInjuryDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedZoneCode, setSelectedZoneCode] = useState<string | null>(null);
  const [selectedSubportion, setSelectedSubportion] = useState<string>('union_miotendinosa');
  const [activeTab, setActiveTab] = useState<'estructura' | 'historial' | 'metricas'>('estructura');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedInjuryForModal, setSelectedInjuryForModal] = useState<PlayerInjuryDTO | null>(null);

  // Mapeo inteligente de lesión a zona anatómica para foco inicial
  const getZoneCodeFromInjury = (inj: PlayerInjuryDTO): string => {
    const bs = (inj.bodyStructure || '').toLowerCase();
    const lat = (inj.laterality || '').toLowerCase();
    if (bs.includes('isquio') && lat.includes('izq')) return 'isquiotibiales_izq';
    if (bs.includes('isquio')) return 'isquiotibiales_der';
    if (bs.includes('recto') && lat.includes('izq')) return 'recto_femoral_izq';
    if (bs.includes('recto') || bs.includes('cuad')) return 'recto_femoral_der';
    if (bs.includes('gemelo') && lat.includes('izq')) return 'gastrocnemio_medial_izq';
    if (bs.includes('gemelo') || bs.includes('gastro')) return 'gastrocnemio_medial_der';
    if (bs.includes('soleo') && lat.includes('izq')) return 'soleo_izq';
    if (bs.includes('soleo')) return 'soleo_der';
    if (bs.includes('pubis') || bs.includes('pubalg')) return 'pubis';
    if (bs.includes('cruzado') || bs.includes('lca')) return 'ligamento_cruzado_ant_der';
    if (bs.includes('menisco')) return 'menisco_interno_der';
    if (bs.includes('tobillo') || bs.includes('esguince')) return 'tobillo_der';
    return 'recto_femoral_der';
  };

  // Cargar lesiones reales desde Supabase a través de Server Action
  const loadInjuries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPlayerInjuriesAction(playerId);
      if (res.success && res.injuries) {
        setInjuries(res.injuries);
        const active = res.injuries.find((i) => i.status === 'activa');
        const hasActive = Boolean(active);
        onInjuriesChange?.(hasActive);

        // Si el jugador tiene lesión activa, enfocar automáticamente su zona
        if (active) {
          const zone = getZoneCodeFromInjury(active);
          setSelectedZoneCode(zone);
          if (active.subzonePortion) {
            setSelectedSubportion(active.subzonePortion);
          }
        } else {
          // Si está disponible o sin lesiones activas, dejar libre para exploración
          setSelectedZoneCode(null);
        }
      }
    } catch (err) {
      console.error('Error cargando historial de lesiones:', err);
    } finally {
      setLoading(false);
    }
  }, [playerId, onInjuriesChange]);

  useEffect(() => {
    loadInjuries();
  }, [loadInjuries]);

  const activeInjuries = injuries.filter((i) => i.status === 'activa');
  const hasActive = activeInjuries.length > 0;

  const handleSelectZone = (code: string, subportionCode?: string) => {
    setSelectedZoneCode(code);
    if (subportionCode) setSelectedSubportion(subportionCode);
    setActiveTab('estructura');
  };

  const handleStartNewInjury = (zoneCode?: string, subportionCode?: string) => {
    if (zoneCode) setSelectedZoneCode(zoneCode);
    if (subportionCode) setSelectedSubportion(subportionCode);
    setIsModalOpen(true);
  };

  return (
    <div className="w-full bg-[#080b11] border border-slate-800 rounded-3xl p-4 sm:p-6 text-slate-100 shadow-2xl space-y-6">
      {/* 1. Cabecera Médica del Jugador con Estadísticas de Disponibilidad */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#0d121c] border border-slate-800/80">
        <div className="flex items-center gap-3.5">
          <div className="w-13 h-13 rounded-full overflow-hidden border-2 border-slate-700 bg-slate-800 shrink-0 shadow-md">
            <img
              src={playerAvatarUrl || '/models/marco_sanchez.png'}
              alt={playerName}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/models/marco_sanchez.png';
              }}
            />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white tracking-tight">
                {playerName}
              </h2>
              <span className="text-xs font-bold text-emerald-400 font-mono">
                {String(playerNumber).startsWith('#') ? playerNumber : `#${playerNumber}`}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
              <span>{playerPosition}</span>
              <span>•</span>
              <span className="text-slate-300">Sporting Saladar</span>
            </div>
          </div>
        </div>

        {/* Badges de Disponibilidad y Acciones */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {hasActive ? (
            <div className="flex flex-col items-end">
              <div className="bg-[#260e15] border border-rose-500/70 text-rose-300 px-3 py-1 rounded-full text-xs font-bold tracking-wider inline-flex items-center gap-1.5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span>BAJA MÉDICA ({activeInjuries.length})</span>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold mt-0.5">
                No disponible para competir
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-end">
              <div className="bg-[#0e2417] border border-emerald-500/70 text-emerald-300 px-3 py-1 rounded-full text-xs font-bold tracking-wider inline-flex items-center gap-1.5 shadow-sm">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>APTO COMPETICIÓN</span>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold mt-0.5">
                Alta médica confirmada
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={() => handleStartNewInjury(selectedZoneCode || undefined)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 transition-all shadow-md shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus size={15} />
            <span>Registrar Lesión</span>
          </button>
        </div>
      </div>

      {/* 2. Grid de Trabajo: Visor Anatómico Multicapa (Izquierda) + Panel de Inspección (Derecha) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* COLUMNA IZQUIERDA: VISOR ANATÓMICO INTERACTIVO */}
        <div className="lg:col-span-6 flex flex-col gap-3">
          <InteractiveAnatomyViewer
            selectedCode={selectedZoneCode}
            onSelectZone={handleSelectZone}
            injuries={injuries}
            selectedSubportion={selectedSubportion}
            onSelectSubportion={setSelectedSubportion}
            onSelectInjury={(id) => {
              const inj = injuries.find((i) => i.id === id);
              if (inj) setSelectedInjuryForModal(inj);
            }}
          />
        </div>

        {/* COLUMNA DERECHA: PANEL DE INSPECCIÓN MÉDICA Y EPISODIOS */}
        <div className="lg:col-span-6 flex flex-col justify-between space-y-4">
          {/* Conmutador de Pestañas Derechas */}
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('estructura')}
              className={`py-2 px-2 rounded-lg transition-all cursor-pointer text-center ${
                activeTab === 'estructura'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Estructura
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('historial')}
              className={`py-2 px-2 rounded-lg transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${
                activeTab === 'historial'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Historial</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-700 text-slate-200">
                {injuries.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('metricas')}
              className={`py-2 px-2 rounded-lg transition-all cursor-pointer text-center ${
                activeTab === 'metricas'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Readaptación (RTS)
            </button>
          </div>

          {/* Contenido según pestaña */}
          <div className="flex-1">
            {activeTab === 'estructura' && (
              <AnatomicalStructureCard
                zoneCode={selectedZoneCode}
                injuries={injuries}
                selectedSubportion={selectedSubportion}
                onSelectSubportion={setSelectedSubportion}
                onStartNewInjury={handleStartNewInjury}
                onSelectInjuryDetails={(inj) => setSelectedInjuryForModal(inj)}
              />
            )}

            {activeTab === 'historial' && (
              <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                {injuries.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs bg-[#0b0f17] rounded-2xl border border-slate-800">
                    No hay episodios lesionales registrados para este jugador.
                  </div>
                ) : (
                  injuries.map((inj) => (
                    <div
                      key={inj.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        inj.status === 'activa'
                          ? 'bg-rose-950/20 border-rose-500/40 shadow-sm'
                          : 'bg-slate-900/60 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-white">
                          {inj.injuryType}
                        </span>
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                            inj.status === 'activa'
                              ? 'bg-rose-900 text-rose-300'
                              : 'bg-emerald-900 text-emerald-300'
                          }`}
                        >
                          {inj.status}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-400 space-y-0.5">
                        <p>Estructura: <strong className="text-slate-200">{inj.bodyStructure || 'No especificada'}</strong> ({inj.laterality || 'no aplica'})</p>
                        <p>Fecha diagnóstico: <strong className="text-slate-200">{inj.injuryDate}</strong> • Gravedad: <strong className="text-amber-400">{inj.severity}</strong></p>
                        {inj.expectedReturnDate && (
                          <p>Previsión retorno: <strong className="text-emerald-400">{inj.expectedReturnDate}</strong></p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'metricas' && (
              activeInjuries.length > 0 ? (
                <RtsRehabilitationDashboard
                  injury={activeInjuries[0]}
                  onInjuryUpdated={() => loadInjuries()}
                />
              ) : injuries.length > 0 ? (
                <RtsRehabilitationDashboard
                  injury={injuries[0]}
                  onInjuryUpdated={() => loadInjuries()}
                />
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs bg-[#0b0f17] rounded-2xl border border-slate-800">
                  No hay lesiones activas para este jugador. Registra un nuevo episodio clínico para habilitar la progresión Return to Sport.
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* 3. Asistente Profesional de Alta y Registro Clínico de Lesión */}
      {isModalOpen && (
        <ClinicalInjuryWizard
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          player={{
            id: playerId,
            name: playerName,
            number: playerNumber,
            position: playerPosition,
            avatarUrl: playerAvatarUrl,
            status: playerStatus,
          }}
          initialZoneCode={selectedZoneCode || undefined}
          initialSubportion={selectedSubportion}
          existingInjuries={injuries}
          onInjuryCreated={() => {
            loadInjuries();
            setIsModalOpen(false);
          }}
        />
      )}

      {/* 4. Dashboard Longitudinal de Expediente Clínico */}
      {selectedInjuryForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-4xl max-h-[95vh] overflow-y-auto">
            <EpisodeClinicalDashboard
              injuryId={selectedInjuryForModal.id}
              onClose={() => setSelectedInjuryForModal(null)}
              onInjuryUpdated={() => {
                loadInjuries();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
