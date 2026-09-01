'use client';

import React, { useState, useEffect } from 'react';
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
import { useAnatomySelection, ANATOMICAL_ZONES } from '@/hooks/useAnatomySelection';
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

  const {
    selectedCode,
    selectedZone,
    hoveredCode,
    setHoveredCode,
    cameraView,
    setCameraView,
    selectZone,
  } = useAnatomySelection('');

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

  // Sincronizar selección anatómica con el formulario del wizard
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
    setCameraView('posterior');
  };

  return (
    <div className="w-full h-full max-h-[92vh] flex flex-col bg-slate-950 text-slate-100 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden font-sans">
      {/* 1. Header del Jugador */}
      <InjuryHeader
        playerName={player.name || 'Marco Sánchez'}
        playerNumber={player.number || '#8'}
        playerPosition={player.position || 'Centrocampista'}
        playerAvatarUrl={player.avatarUrl}
        isInjured={true}
        onClose={onClose}
      />

      {/* 2. Cuerpo Principal: Layout 2 Columnas (40%-45% Anatomía | 55%-60% Wizard) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 sm:p-6 overflow-y-auto lg:overflow-hidden">
        {/* COLUMNA IZQUIERDA: VISUALIZADOR ANATÓMICO */}
        <section className="lg:col-span-5 flex flex-col justify-between space-y-4">
          {/* Controles de Vista y Cámara */}
          <AnatomyControls
            mode={mode}
            onModeChange={setMode}
            cameraView={cameraView}
            onViewChange={setCameraView}
            onReset={handleResetCamera}
          />

          {/* Visor del Avatar Anatómico */}
          <div className="flex-1 flex items-center justify-center">
            <AnatomyViewer
              mode={mode}
              cameraView={cameraView}
              selectedCode={selectedCode}
              hoveredCode={hoveredCode}
              onSelect={selectZone}
              onHover={setHoveredCode}
            />
          </div>

          {/* Carrusel de Selección Rápida Inferior */}
          <AnatomyQuickSelect
            selectedCode={selectedCode}
            onSelect={selectZone}
          />
        </section>

        {/* COLUMNA DERECHA: ASISTENTE DE LESIÓN (STEPPER 1 → 2 → 3 → 4) */}
        <section className="lg:col-span-7 flex flex-col justify-between bg-slate-900/50 border border-slate-800/80 rounded-3xl p-4 sm:p-6 shadow-inner backdrop-blur-xs">
          {/* Stepper Superior */}
          <div className="shrink-0 mb-4">
            <InjuryStepper
              currentStep={currentStep}
              onStepClick={goToStep}
            />
          </div>

          {/* Contenido Dinámico según el Paso Activo */}
          <div className="flex-1 overflow-y-auto py-2">
            {currentStep === 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnatomyManualSelector
                  selectedCode={selectedCode}
                  onSelect={selectZone}
                />
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

      {/* 3. Footer Fijo con Navegación y Guardado */}
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
