'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Edit2 } from 'lucide-react';
import { InjuryHeader } from './InjuryHeader';
import { InjuryStepper } from './InjuryStepper';
import { AnatomyControls } from './AnatomyControls';
import { AnatomyViewer } from './AnatomyViewer';
import { AnatomyQuickSelect } from './AnatomyQuickSelect';
import { AnatomyManualSelector } from './AnatomyManualSelector';
import { AnatomyZoneInfo } from './AnatomyZoneInfo';
import { InjuryTypeStep } from './InjuryTypeStep';
import { InjurySeverityStep } from './InjurySeverityStep';
import { InjurySummary } from './InjurySummary';
import { InjuryFooter } from './InjuryFooter';
import { useAnatomySelection } from '@/hooks/useAnatomySelection';
import { useInjuryWizard } from '@/hooks/useInjuryWizard';

interface InjuryManagementProps {
  player: {
    id: string;
    name?: string;
    number?: string | number;
    position?: string;
    avatarUrl?: string;
    status?: string;
  };
  onClose?: () => void;
  onSaved?: () => void;
}

export function InjuryManagement({
  player,
  onClose,
  onSaved,
}: InjuryManagementProps) {
  const [mode, setMode] = useState<'3D' | '2D'>('3D');

  // En el mockup exacto de Marco Sanchez, Isquiotibiales Derecho está seleccionado
  const {
    selectedCode,
    selectedZone,
    hoveredCode,
    setHoveredCode,
    cameraView,
    setCameraView,
    selectZone,
  } = useAnatomySelection('isquiotibiales_der');

  const {
    currentStep,
    form,
    saving,
    updateForm,
    nextStep,
    prevStep,
    goToStep,
    saveInjury,
  } = useInjuryWizard(player.id, () => {
    onSaved?.();
    onClose?.();
  });

  useEffect(() => {
    if (selectedZone) {
      updateForm({
        zonaAnatomica: selectedZone.name,
        regionGeneral: selectedZone.generalRegion,
        muscleGroup: selectedZone.muscleGroup,
        zonaCode: selectedZone.code,
      });
    }
  }, [selectedZone, updateForm]);

  const handleResetCamera = () => {
    setCameraView('frontal');
  };

  const playerName = player.name || 'Marco Sanchez';
  const playerNumber = player.number || '#8';
  const playerPosition = player.position || 'Centrocampista';

  return (
    <div className="w-full max-w-[1220px] bg-[#090d14] text-slate-100 rounded-2xl border border-[#1b2336] shadow-2xl overflow-hidden font-sans flex flex-col my-auto">
      {/* 1. Encabezado superior con breadcrumb */}
      <InjuryHeader
        playerName={playerName}
        onClose={onClose}
      />

      {/* 2. Cuerpo Principal en 2 Grandes Bloques (Exacto al Mockup) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 sm:p-5 flex-1 overflow-y-auto">
        {/* ============================================================
            COLUMNA IZQUIERDA: TARJETA DEL JUGADOR + VISUALIZADOR 3D/2D
            ============================================================ */}
        <section className="lg:col-span-6 flex flex-col gap-3.5">
          {/* Subtarjeta 1: Ficha del Jugador (Marco Sanchez #8) */}
          <div className="rounded-2xl bg-[#0c1017] border border-[#1c2436] p-3.5 sm:p-4 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              {/* Foto de Marco Sanchez */}
              <div className="w-13 h-13 rounded-full overflow-hidden border border-slate-700 bg-slate-800 shrink-0">
                <img
                  src={player.avatarUrl || '/models/marco_sanchez.png'}
                  alt={playerName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/models/marco_sanchez.png';
                  }}
                />
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-tight">
                    {playerName}
                  </h2>
                  <span className="text-xs sm:text-sm font-bold text-emerald-400 font-mono">
                    {String(playerNumber).startsWith('#') ? playerNumber : `#${playerNumber}`}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mt-0.5">
                  <span>{playerPosition}</span>
                  <Shield size={13} className="text-slate-400" />
                </div>
              </div>
            </div>

            {/* Estado de disponibilidad: LESIONADO */}
            <div className="flex flex-col items-end">
              <div className="bg-[#240e15] border border-rose-500/60 text-rose-400 px-3 py-1 rounded-full text-xs font-bold tracking-wider inline-flex items-center gap-1.5 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span>LESIONADO</span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium mt-1">
                Estado de disponibilidad
              </span>
            </div>
          </div>

          {/* Subtarjeta 2: Visualizador Anatómico 3D / 2D con Avatar */}
          <div className="rounded-2xl bg-[#0c1017] border border-[#1c2436] p-4 flex flex-col justify-between flex-1 shadow-xs">
            <AnatomyControls
              mode={mode}
              onModeChange={setMode}
              cameraView={cameraView}
              onViewChange={setCameraView}
              onReset={handleResetCamera}
            />

            <div className="my-2 flex-1 flex items-center justify-center">
              <AnatomyViewer
                mode={mode}
                cameraView={cameraView}
                selectedCode={selectedCode}
                hoveredCode={hoveredCode}
                onSelect={selectZone}
                onHover={setHoveredCode}
              />
            </div>

            <AnatomyQuickSelect
              selectedCode={selectedCode}
              onSelect={selectZone}
            />
          </div>
        </section>

        {/* ============================================================
            COLUMNA DERECHA: STEPPER 1 → 2 → 3 → 4 + WIZARD
            ============================================================ */}
        <section className="lg:col-span-6 flex flex-col justify-between bg-[#0c1017] border border-[#1c2436] rounded-2xl p-4 sm:p-5 shadow-xs">
          {/* 1. Stepper Superior */}
          <div className="mb-4">
            <InjuryStepper
              currentStep={currentStep}
              onStepClick={goToStep}
            />
          </div>

          {/* 2. Banner de Zona Seleccionada (Exacto al mockup) */}
          <div className="bg-[#0b0f17] border border-[#1b2334] rounded-xl px-4 py-2.5 flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-emerald-400" />
              <span className="text-xs text-slate-400">Zona seleccionada:</span>
              <span className="text-xs sm:text-sm font-bold text-emerald-400">
                {form.zonaAnatomica || selectedZone?.name || 'Isquiotibiales Derecho'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => goToStep(1)}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Edit2 size={13} />
              <span>Cambiar</span>
            </button>
          </div>

          {/* 3. Contenido según el paso activo */}
          <div className="flex-1 overflow-y-auto">
            {currentStep === 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full">
                {/* Panel izquierdo: Selector manual (Jerárquico) */}
                <AnatomyManualSelector
                  selectedCode={selectedCode}
                  onSelect={selectZone}
                />

                {/* Panel derecho: Información de la zona con imagen posterior de piernas */}
                <AnatomyZoneInfo zone={selectedZone} />
              </div>
            )}

            {currentStep === 2 && (
              <InjuryTypeStep
                form={form}
                onChange={updateForm}
              />
            )}

            {currentStep === 3 && (
              <InjurySeverityStep
                form={form}
                onChange={updateForm}
              />
            )}

            {currentStep === 4 && (
              <InjurySummary form={form} />
            )}
          </div>
        </section>
      </div>

      {/* 3. Barra de Navegación Inferior (Footer Fijo) */}
      <InjuryFooter
        currentStep={currentStep}
        totalSteps={4}
        saving={saving}
        onCancel={onClose}
        onPrev={prevStep}
        onNext={nextStep}
        onSave={saveInjury}
      />
    </div>
  );
}
