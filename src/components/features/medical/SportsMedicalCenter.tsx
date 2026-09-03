'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  Plus,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Calendar,
  AlertTriangle,
  Layers,
  ChevronRight,
  TrendingUp,
  Award,
  CheckCircle2,
  X,
  FileCheck,
  Clock,
  Search,
} from 'lucide-react';
import { InteractiveAnatomyViewer } from './InteractiveAnatomyViewer';
import { AnatomicalStructureCard } from './AnatomicalStructureCard';
import { MuscleSearchTabsPanel } from './MuscleSearchTabsPanel';
import { ClinicalInjuryWizard } from './ClinicalInjuryWizard';
import { EpisodeClinicalDashboard } from './EpisodeClinicalDashboard';
import { RtsRehabilitationDashboard } from './RtsRehabilitationDashboard';
import {
  getPlayerInjuriesAction,
  resolveInjuryAction,
  PlayerInjuryDTO,
} from '@/app/actions/injury-actions';
import {
  ANATOMICAL_ZONES,
  getSubportionsForStructure,
} from '@/hooks/useAnatomySelection';

interface SportsMedicalCenterProps {
  playerId: string;
  playerName: string;
  playerNumber?: string | number;
  playerPosition?: string;
  playerAvatarUrl?: string;
  playerStatus?: string;
  onAvailabilityChange?: (hasActive: boolean) => void;
  onInjuriesChange?: (hasActive: boolean) => void;
}

export function SportsMedicalCenter({
  playerId,
  playerName,
  playerNumber = '—',
  playerPosition = 'Jugador',
  playerAvatarUrl,
  playerStatus = 'active',
  onAvailabilityChange,
  onInjuriesChange,
}: SportsMedicalCenterProps) {
  const [injuries, setInjuries] = useState<PlayerInjuryDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedZoneCode, setSelectedZoneCode] = useState<string | null>(null);
  const [selectedSubportion, setSelectedSubportion] = useState<string>('union_miotendinosa');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedInjuryForModal, setSelectedInjuryForModal] = useState<PlayerInjuryDTO | null>(null);
  const [activeTab, setActiveTab] = useState<'estructura' | 'buscador' | 'historial' | 'metricas'>('buscador');

  // Estado para el modal de alta médica
  const [dischargeInjury, setDischargeInjury] = useState<PlayerInjuryDTO | null>(null);
  const [dischargeDate, setDischargeDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dischargeNotes, setDischargeNotes] = useState<string>('Alta médica confirmada tras completar satisfactoriamente la progresión de readaptación. Apto para el 100% de la carga competitiva.');
  const [submittingDischarge, setSubmittingDischarge] = useState<boolean>(false);
  const [dischargeSuccessMsg, setDischargeSuccessMsg] = useState<string | null>(null);

  const loadInjuries = async () => {
    try {
      setLoading(true);
      const res = await getPlayerInjuriesAction(playerId);
      if (res.success && res.injuries) {
        setInjuries(res.injuries);

        // Si el jugador tiene lesión activa, enfocar automáticamente su zona
        const active = res.injuries.find((i) => i.status === 'activa');
        onAvailabilityChange?.(!!active);
        onInjuriesChange?.(!!active);
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
  };

  useEffect(() => {
    loadInjuries();
  }, [playerId]);

  const getZoneCodeFromInjury = (inj: PlayerInjuryDTO): string => {
    const bs = (inj.bodyStructure || '').toLowerCase();
    const lat = (inj.laterality || '').toLowerCase();

    if (bs.includes('deltoides') && bs.includes('post')) {
      return lat.includes('izq') ? 'deltoides_post_izq' : 'deltoides_post_der';
    } else if (bs.includes('deltoides')) {
      return lat.includes('izq') ? 'deltoides_ant_izq' : 'deltoides_ant_der';
    } else if (bs.includes('biceps braquial') || (bs.includes('brazo') && bs.includes('biceps'))) {
      return lat.includes('izq') ? 'biceps_braquial_izq' : 'biceps_braquial_der';
    } else if (bs.includes('triceps') || (bs.includes('brazo') && bs.includes('triceps'))) {
      return lat.includes('izq') ? 'triceps_braquial_izq' : 'triceps_braquial_der';
    } else if (bs.includes('codo')) {
      return lat.includes('izq') ? 'codo_izq' : 'codo_der';
    } else if (bs.includes('antebrazo') && bs.includes('extensor')) {
      return lat.includes('izq') ? 'antebrazo_extensores_izq' : 'antebrazo_extensores_der';
    } else if (bs.includes('antebrazo')) {
      return lat.includes('izq') ? 'antebrazo_flexores_izq' : 'antebrazo_flexores_der';
    } else if (bs.includes('muñeca') || bs.includes('mano')) {
      return lat.includes('izq') ? 'muneca_mano_izq' : 'muneca_mano_der';
    } else if (bs.includes('biceps femoral') && bs.includes('corta')) {
      return lat.includes('izq') ? 'biceps_femoral_corta_izq' : 'biceps_femoral_corta_der';
    } else if (bs.includes('biceps femoral') || (bs.includes('isquio') && bs.includes('larga'))) {
      return lat.includes('izq') ? 'biceps_femoral_larga_izq' : 'biceps_femoral_larga_der';
    } else if (bs.includes('semitendinoso')) {
      return lat.includes('izq') ? 'semitendinoso_izq' : 'semitendinoso_der';
    } else if (bs.includes('semimembranoso')) {
      return lat.includes('izq') ? 'semimembranoso_izq' : 'semimembranoso_der';
    } else if (bs.includes('isquio')) {
      return lat.includes('izq') ? 'isquiotibiales_izq' : 'isquiotibiales_der';
    } else if (bs.includes('vasto lateral')) {
      return lat.includes('izq') ? 'vasto_lateral_izq' : 'vasto_lateral_der';
    } else if (bs.includes('vasto medial')) {
      return lat.includes('izq') ? 'vasto_medial_izq' : 'vasto_medial_der';
    } else if (bs.includes('sartorio')) {
      return lat.includes('izq') ? 'sartorio_izq' : 'sartorio_der';
    } else if (bs.includes('recto') && (bs.includes('femoral') || bs.includes('anterior'))) {
      return lat.includes('izq') ? 'recto_femoral_izq' : 'recto_femoral_der';
    } else if (bs.includes('aductor mayor')) {
      return lat.includes('izq') ? 'aductor_mayor_izq' : 'aductor_mayor_der';
    } else if (bs.includes('aductor') || bs.includes('pubalgia')) {
      return lat.includes('izq') ? 'aductor_largo_izq' : 'aductor_largo_der';
    } else if (bs.includes('pectineo')) {
      return lat.includes('izq') ? 'pectineo_izq' : 'pectineo_der';
    } else if (bs.includes('gracil') || bs.includes('recto interno')) {
      return lat.includes('izq') ? 'gracil_izq' : 'gracil_der';
    } else if (bs.includes('psoas')) {
      return lat.includes('izq') ? 'psoas_iliaco_izq' : 'psoas_iliaco_der';
    } else if (bs.includes('tensor') || bs.includes('fascia lata')) {
      return lat.includes('izq') ? 'tensor_fascia_lata_izq' : 'tensor_fascia_lata_der';
    } else if (bs.includes('gemelo interno') || bs.includes('medial')) {
      return lat.includes('izq') ? 'gastrocnemio_medial_izq' : 'gastrocnemio_medial_der';
    } else if (bs.includes('gemelo externo') || bs.includes('lateral')) {
      return lat.includes('izq') ? 'gastrocnemio_lateral_izq' : 'gastrocnemio_lateral_der';
    } else if (bs.includes('soleo')) {
      return lat.includes('izq') ? 'soleo_izq' : 'soleo_der';
    } else if (bs.includes('tibial')) {
      return lat.includes('izq') ? 'tibial_anterior_izq' : 'tibial_anterior_der';
    } else if (bs.includes('peroneo')) {
      return lat.includes('izq') ? 'peroneo_lateral_izq' : 'peroneo_lateral_der';
    } else if (bs.includes('recto abdominal') || bs.includes('core')) {
      return 'recto_abdominal';
    } else if (bs.includes('oblicuo')) {
      return lat.includes('izq') ? 'oblicuo_abdomen_izq' : 'oblicuo_abdomen_der';
    } else if (bs.includes('erector') || bs.includes('lumbar')) {
      return 'erectores_columna';
    } else if (bs.includes('supraespinoso')) {
      return lat.includes('izq') ? 'supraespinoso_izq' : 'supraespinoso_der';
    } else if (bs.includes('subescapular') || bs.includes('redondo')) {
      return lat.includes('izq') ? 'subescapular_izq' : 'subescapular_der';
    } else if (bs.includes('dorsal')) {
      return lat.includes('izq') ? 'dorsal_ancho_izq' : 'dorsal_ancho_der';
    } else if (bs.includes('pectoral')) {
      return lat.includes('izq') ? 'pectoral_mayor_izq' : 'pectoral_mayor_der';
    } else if (bs.includes('pubis')) {
      return 'pubis';
    } else if (bs.includes('cruzado') || bs.includes('lca')) {
      return 'ligamento_cruzado_ant_der';
    } else if (bs.includes('menisco')) {
      return 'menisco_interno_der';
    }
    return 'recto_femoral_der';
  };

  const handleSelectZone = (code: string, subportionCode?: string) => {
    setSelectedZoneCode(code);
    if (subportionCode) {
      setSelectedSubportion(subportionCode);
    } else {
      const available = getSubportionsForStructure(code);
      setSelectedSubportion(available[1]?.code || available[0]?.code || 'union_miotendinosa');
    }
    // Si estamos en la pestaña de buscador, cambiar a estructura para ver los detalles
    setActiveTab('estructura');
  };

  const handleStartNewInjury = (zoneCode?: string) => {
    if (zoneCode) {
      setSelectedZoneCode(zoneCode);
    }
    setIsModalOpen(true);
  };

  const handleOpenDischargeModal = (injuryToDischarge?: PlayerInjuryDTO) => {
    const inj = injuryToDischarge || activeInjuries[0];
    if (inj) {
      setDischargeInjury(inj);
      setDischargeDate(new Date().toISOString().split('T')[0]);
    }
  };

  const handleConfirmDischarge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dischargeInjury) return;

    try {
      setSubmittingDischarge(true);
      const res = await resolveInjuryAction(dischargeInjury.id, dischargeDate, dischargeNotes);
      if (res.success) {
        setDischargeSuccessMsg(`¡Alta médica tramitada con éxito! ${playerName} vuelve a estar en estado APTO COMPETICIÓN.`);
        setDischargeInjury(null);
        await loadInjuries();
        setSelectedZoneCode(null);
        setTimeout(() => setDischargeSuccessMsg(null), 5000);
      } else {
        alert(res.error || 'Error al procesar el alta médica.');
      }
    } catch (err) {
      console.error('Error al dar de alta:', err);
      alert('Error inesperado al conectar con el servidor.');
    } finally {
      setSubmittingDischarge(false);
    }
  };

  const activeInjuries = injuries.filter((i) => i.status === 'activa');
  const hasActive = activeInjuries.length > 0;

  return (
    <div className="w-full space-y-6">
      {/* Notificación de Alta Exitosa */}
      {dischargeSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/70 text-emerald-200 flex items-center justify-between animate-fade-in shadow-xl">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
            <span className="text-xs sm:text-sm font-bold">{dischargeSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setDischargeSuccessMsg(null)}
            className="text-emerald-400 hover:text-white p-1 rounded-lg cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* 1. Encabezado Médico del Jugador y Estado de Disponibilidad */}
      <div className="bg-[#0b0f17] border border-slate-800/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          {playerAvatarUrl ? (
            <img
              src={playerAvatarUrl}
              alt={playerName}
              className="w-12 h-12 rounded-full object-cover border-2 border-slate-700 shadow-md"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold border border-slate-700 text-sm">
              {playerName.slice(0, 2).toUpperCase()}
            </div>
          )}

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
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          {hasActive ? (
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-end">
                <div className="bg-[#260e15] border border-rose-500/70 text-rose-300 px-3 py-1 rounded-full text-xs font-bold tracking-wider inline-flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <span>BAJA MÉDICA ({activeInjuries.length})</span>
                </div>
                <span className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  No disponible para competir
                </span>
              </div>

              {/* Botón Destacado de ALTA MÉDICA */}
              <button
                type="button"
                onClick={() => handleOpenDischargeModal()}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 transition-all shadow-md shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer shrink-0"
                title="Dar de alta médica al jugador para que vuelva a estar Apto"
              >
                <CheckCircle2 size={15} className="text-white" />
                <span>Dar de Alta Médica</span>
              </button>
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
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 active:bg-rose-700 transition-all shadow-md shadow-rose-600/30 flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus size={15} />
            <span>Registrar Lesión</span>
          </button>
        </div>
      </div>

      {/* 2. Grid de Trabajo: Visor Anatómico Multicapa (Izquierda) + Panel de Pestañas / Inspección (Derecha) */}
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
          <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('buscador')}
              className={`py-2 px-1 rounded-lg transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${
                activeTab === 'buscador'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Search size={13} className="text-emerald-400" />
              <span>Buscador</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('estructura')}
              className={`py-2 px-1 rounded-lg transition-all cursor-pointer text-center ${
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
              className={`py-2 px-1 rounded-lg transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${
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
              className={`py-2 px-1 rounded-lg transition-all cursor-pointer text-center ${
                activeTab === 'metricas'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              RTS (Campo)
            </button>
          </div>

          {/* Contenido según pestaña */}
          <div className="flex-1">
            {activeTab === 'buscador' && (
              <MuscleSearchTabsPanel
                selectedCode={selectedZoneCode}
                onSelectZone={handleSelectZone}
                injuries={injuries}
                onStartNewInjury={handleStartNewInjury}
                onCustomMuscleAdd={(name, region) => {
                  alert(`Músculo "${name}" incorporado en la región ${region}. Ahora puedes seleccionarlo.`);
                }}
              />
            )}

            {activeTab === 'estructura' && (
              <AnatomicalStructureCard
                zoneCode={selectedZoneCode}
                injuries={injuries}
                selectedSubportion={selectedSubportion}
                onSelectSubportion={setSelectedSubportion}
                onStartNewInjury={handleStartNewInjury}
                onSelectInjuryDetails={(inj) => setSelectedInjuryForModal(inj)}
                onResolveInjury={(inj) => handleOpenDischargeModal(inj)}
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
                        <div className="flex items-center gap-1.5">
                          {inj.status === 'activa' && (
                            <button
                              type="button"
                              onClick={() => handleOpenDischargeModal(inj)}
                              className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle2 size={11} />
                              <span>Dar Alta</span>
                            </button>
                          )}
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
                      </div>

                      <div className="text-[11px] text-slate-400 space-y-0.5">
                        <p>Estructura: <strong className="text-slate-200">{inj.bodyStructure || 'No especificada'}</strong> ({inj.laterality || 'no aplica'})</p>
                        <p>Fecha diagnóstico: <strong className="text-slate-200">{inj.injuryDate}</strong> • Gravedad: <strong className="text-amber-400">{inj.severity}</strong></p>
                        {inj.expectedReturnDate && (
                          <p>Previsión retorno: <strong className="text-emerald-400">{inj.expectedReturnDate}</strong></p>
                        )}
                        {inj.actualReturnDate && (
                          <p>Alta médica confirmada: <strong className="text-emerald-300">{inj.actualReturnDate}</strong></p>
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

      {/* 3. Modal de Confirmación y Trámite de ALTA MÉDICA */}
      {dischargeInjury && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0b0f17] border border-emerald-500/50 rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-950 border border-emerald-500 flex items-center justify-center">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Declarar Alta Médica (Apto para Competir)</h4>
                  <p className="text-[11px] text-slate-400">
                    {playerName} • {dischargeInjury.bodyStructure || dischargeInjury.injuryType}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDischargeInjury(null)}
                className="text-slate-500 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmDischarge} className="space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-200 text-[11px] leading-relaxed">
                Al confirmar el alta médica, el episodio lesional quedará archivado como <strong>recuperado</strong>, el jugador pasará de inmediato a estado <strong>APTO COMPETICIÓN</strong> y el avatar se limpiará de marcas de baja médica.
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-bold flex items-center gap-1.5">
                  <Calendar size={13} className="text-emerald-400" />
                  Fecha Efectiva del Alta Médica
                </label>
                <input
                  type="date"
                  required
                  value={dischargeDate}
                  onChange={(e) => setDischargeDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-bold flex items-center gap-1.5">
                  <FileCheck size={13} className="text-emerald-400" />
                  Conclusión Clínica y Notas del Alta
                </label>
                <textarea
                  rows={3}
                  value={dischargeNotes}
                  onChange={(e) => setDischargeNotes(e.target.value)}
                  placeholder="Describe la respuesta a las cargas de alta intensidad y confirmación de aptitud..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setDischargeInjury(null)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingDischarge}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/30"
                >
                  <CheckCircle2 size={14} />
                  <span>{submittingDischarge ? 'Procesando Alta...' : 'Confirmar Alta y Habilitar Jugador'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Asistente Profesional de Alta y Registro Clínico de Lesión */}
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

      {/* 5. Dashboard Longitudinal de Expediente Clínico */}
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
