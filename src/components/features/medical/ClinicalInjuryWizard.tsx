'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Activity,
  ShieldAlert,
  AlertCircle,
  Calendar,
  CheckCircle2,
  FileText,
  Clock,
  Layers,
  Sparkles,
  Stethoscope,
  Camera,
  HeartPulse
} from 'lucide-react';
import { ANATOMICAL_ZONES, AnatomicalZone } from '@/hooks/useAnatomySelection';
import {
  registerClinicalInjuryEpisodeAction,
  PlayerInjuryDTO
} from '@/app/actions/injury-actions';
import { estimateRecovery, RecoveryEstimationResult } from '@/lib/injuries/recovery-guidelines';

interface ClinicalInjuryWizardProps {
  isOpen: boolean;
  onClose: () => void;
  player: {
    id: string;
    name: string;
    number?: string | number;
    position?: string;
    avatarUrl?: string;
    status?: string;
  };
  initialZoneCode?: string;
  existingInjuries?: PlayerInjuryDTO[];
  onInjuryCreated: () => void;
}

export function ClinicalInjuryWizard({
  isOpen,
  onClose,
  player,
  initialZoneCode = 'isquiotibiales_der',
  existingInjuries = [],
  onInjuryCreated,
}: ClinicalInjuryWizardProps) {
  const [step, setStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Paso 1: Localización y anatomía
  const [selectedZoneCode, setSelectedZoneCode] = useState<string>(initialZoneCode);
  const [laterality, setLaterality] = useState<'derecha' | 'izquierda' | 'bilateral' | 'central' | 'no_aplica'>('derecha');
  const [bodyView, setBodyView] = useState<'front' | 'back'>('back');

  // Paso 2: Diagnóstico y clasificación
  const [injuryDate, setInjuryDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedTypeCode, setSelectedTypeCode] = useState<string>('MUNICH_3A');
  const [severity, setSeverity] = useState<'Leve' | 'Moderada' | 'Grave'>('Moderada');
  const [isRecurrence, setIsRecurrence] = useState<boolean>(false);
  const [parentInjuryId, setParentInjuryId] = useState<string>('');
  const [mechanismDetails, setMechanismDetails] = useState<string>('Sprint a máxima velocidad en transición ofensiva');
  const [diagnosisNotes, setDiagnosisNotes] = useState<string>('');

  // Paso 3: Evaluación clínica inicial
  const [examinerName, setExaminerName] = useState<string>('Dr. / Fisioterapeuta del Club');
  const [painAtRest, setPainAtRest] = useState<number>(2);
  const [painOnPalpation, setPainOnPalpation] = useState<number>(6);
  const [painOnContraction, setPainOnContraction] = useState<number>(7);
  const [painOnStretch, setPainOnStretch] = useState<number>(6);
  const [functionalStatus, setFunctionalStatus] = useState<string>('Marcha antiálgica con limitación excéntrica');
  const [clinicalFindings, setClinicalFindings] = useState<string>('Punto gatillo doloroso localizado, tumefacción local sin defecto fascial palpable.');

  // Paso 4: Pruebas complementarias
  const [hasMedicalTest, setHasMedicalTest] = useState<boolean>(false);
  const [medicalTestType, setMedicalTestType] = useState<string>('ecografia');
  const [medicalTestSummary, setMedicalTestSummary] = useState<string>('Ecografía musculoesquelética en plano longitudinal y transversal');
  const [medicalTestFindings, setMedicalTestFindings] = useState<string>('Desestructuración fibrilar con halo hipoecoico menor de 1.5 cm.');

  const defaultZone: AnatomicalZone = {
    code: 'isquiotibiales_der',
    name: 'Isquiotibiales Derecho',
    generalRegion: 'Isquiotibiales',
    muscleGroup: 'Isquiotibiales',
    laterality: 'Derecho',
    thumbnailKey: 'muslo_post',
    viewDefault: 'posterior',
    incidencia: 'Muy Alta',
    mecanismoComun: 'Sprints a máxima velocidad en fase de desaceleración / oscilación tardía.',
    munichDefault: '3B',
  };

  const currentZone: AnatomicalZone = 
    ANATOMICAL_ZONES[selectedZoneCode] || 
    ANATOMICAL_ZONES['isquiotibiales_der'] || 
    Object.values(ANATOMICAL_ZONES)[0] || 
    defaultZone;

  // Sincronizar lateralidad y vista al cambiar zona
  useEffect(() => {
    if (currentZone) {
      if (currentZone.laterality === 'Derecho') setLaterality('derecha');
      else if (currentZone.laterality === 'Izquierdo') setLaterality('izquierda');
      else if (currentZone.laterality === 'Bilateral') setLaterality('bilateral');

      if (currentZone.viewDefault === 'frontal') setBodyView('front');
      else if (currentZone.viewDefault === 'posterior') setBodyView('back');
    }
  }, [currentZone]);

  // Tipos diagnósticos canónicos según tejido
  const diagnosticTypes = [
    { code: 'MUNICH_1A', name: 'Tipo 1A — Fatiga muscular funcional', category: 'muscular', minDays: 3, maxDays: 5 },
    { code: 'MUNICH_1B', name: 'Tipo 1B — Agujetas / DOMS severo', category: 'muscular', minDays: 2, maxDays: 4 },
    { code: 'MUNICH_2A', name: 'Tipo 2A — Trastorno neuromuscular vertebral', category: 'muscular', minDays: 5, maxDays: 10 },
    { code: 'MUNICH_3A', name: 'Tipo 3A — Rotura fibrilar menor / Miofascial', category: 'muscular', minDays: 14, maxDays: 21 },
    { code: 'MUNICH_3B', name: 'Tipo 3B — Rotura fibrilar moderada / Fascicular', category: 'muscular', minDays: 21, maxDays: 42 },
    { code: 'MUNICH_4', name: 'Tipo 4 — Rotura completa / Avulsión tendinosa', category: 'muscular', minDays: 56, maxDays: 112 },
    { code: 'LCA_ROTURA_TOTAL', name: 'Rotura completa Ligamento Cruzado Anterior (LCA)', category: 'ligamentosa', minDays: 180, maxDays: 270 },
    { code: 'MENISCO_ROTURA', name: 'Rotura meniscal interna / externa', category: 'meniscal', minDays: 28, maxDays: 60 },
    { code: 'FRACTURA_JONES', name: 'Fractura 5º Metatarsiano (Jones)', category: 'osea_articular', minDays: 56, maxDays: 84 },
    { code: 'PUBALGIA_ATLETICA', name: 'Pubalgia / Osteopatía Dinámica de Pubis', category: 'osea_articular', minDays: 42, maxDays: 84 },
  ];

  const selectedType = diagnosticTypes.find((t) => t.code === selectedTypeCode) || diagnosticTypes[3];

  // Cálculo del pronóstico orientativo mediante recovery-guidelines.ts
  const recoveryEstimation: RecoveryEstimationResult = useMemo(() => {
    return estimateRecovery({
      injuryType: selectedType.name.includes('Rotura') ? 'Rotura muscular' : selectedType.name,
      structure: currentZone?.name || 'Isquiotibiales Derecho',
      severity,
      injuryDate,
    });
  }, [selectedType, currentZone, severity, injuryDate]);

  if (!isOpen) return null;

  const handleNext = () => {
    setErrorMsg(null);
    if (step < 5) setStep((s) => s + 1);
  };

  const handleBack = () => {
    setErrorMsg(null);
    if (step > 1) setStep((s) => s - 1);
  };

  const handleSave = async () => {
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await registerClinicalInjuryEpisodeAction({
        playerId: player.id,
        injuryDate,
        injuryTypeCode: selectedType.code,
        injuryTypeName: selectedType.name,
        anatomicalZoneCode: currentZone.code,
        bodyRegion: currentZone.generalRegion,
        bodyStructure: currentZone.name,
        laterality,
        bodyView,
        severity,
        isRecurrence,
        parentInjuryId: isRecurrence && parentInjuryId ? parentInjuryId : null,
        mechanismDetails,
        diagnosisNotes,
        expectedReturnDate: recoveryEstimation.estimatedReturnTo,
        estimatedMinDays: recoveryEstimation.minDays || selectedType.minDays,
        estimatedMaxDays: recoveryEstimation.maxDays || selectedType.maxDays,
        estimatedReturnFrom: recoveryEstimation.estimatedReturnFrom,
        estimatedReturnTo: recoveryEstimation.estimatedReturnTo,
        examinerName,
        painAtRest,
        painOnPalpation,
        painOnContraction,
        painOnStretch,
        functionalStatus,
        clinicalFindings,
        medicalTestType: hasMedicalTest ? medicalTestType : undefined,
        medicalTestSummary: hasMedicalTest ? medicalTestSummary : undefined,
        medicalTestFindings: hasMedicalTest ? medicalTestFindings : undefined,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Error al guardar el episodio clínico.');
        setSubmitting(false);
        return;
      }

      onInjuryCreated();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de conexión con el servidor.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-[#0b0f17] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Cabecera del Modal */}
        <div className="px-6 py-4 bg-[#0e131d] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Stethoscope size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight">
                Alta de Nuevo Episodio Lesional
              </h2>
              <p className="text-xs text-slate-400">
                Jugador: <strong className="text-slate-200">{player.name}</strong> • Registro Médico Oficial
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Stepper Clínico 1-5 */}
        <div className="px-6 py-3 bg-[#080b11] border-b border-slate-800/80 flex items-center justify-between text-xs">
          {[
            { num: 1, label: 'Anatomía' },
            { num: 2, label: 'Diagnóstico' },
            { num: 3, label: 'Evaluación' },
            { num: 4, label: 'Pronóstico' },
            { num: 5, label: 'Confirmación' },
          ].map((s) => (
            <div key={s.num} className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step === s.num
                    ? 'bg-emerald-600 text-white ring-2 ring-emerald-500/40'
                    : step > s.num
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                    : 'bg-slate-900 text-slate-500 border border-slate-800'
                }`}
              >
                {step > s.num ? '✓' : s.num}
              </div>
              <span
                className={`hidden sm:inline font-semibold ${
                  step === s.num ? 'text-white' : 'text-slate-500'
                }`}
              >
                {s.label}
              </span>
              {s.num < 5 && <span className="text-slate-800 hidden sm:inline">──</span>}
            </div>
          ))}
        </div>

        {/* Cuerpo del Asistente */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-200 text-xs">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/60 text-rose-300 flex items-center gap-2.5">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* =========================================================================
              PASO 1: LOCALIZACIÓN ANATÓMICA
              ========================================================================= */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                  Estructura Preseleccionada en el Avatar
                </span>

                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-white">{currentZone.name}</h3>
                  <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 font-bold text-xs">
                    {currentZone.generalRegion}
                  </span>
                </div>

                <p className="text-slate-400 leading-relaxed text-[11px]">
                  {currentZone.mecanismoComun || 'Zona muscular o articular de alta solicitación en competición.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-bold mb-1.5">Lateralidad</label>
                  <select
                    value={laterality}
                    onChange={(e) => setLaterality(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-semibold cursor-pointer"
                  >
                    <option value="derecha">Derecha</option>
                    <option value="izquierda">Izquierda</option>
                    <option value="bilateral">Bilateral</option>
                    <option value="central">Central</option>
                    <option value="no_aplica">No aplica</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1.5">Plano Anatómico Principal</label>
                  <select
                    value={bodyView}
                    onChange={(e) => setBodyView(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-semibold cursor-pointer"
                  >
                    <option value="back">Posterior (Dorsal)</option>
                    <option value="front">Anterior (Ventral)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              PASO 2: DIAGNÓSTICO Y CLASIFICACIÓN
              ========================================================================= */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-slate-400 font-bold mb-1.5">Fecha del Episodio</label>
                <input
                  type="date"
                  value={injuryDate}
                  onChange={(e) => setInjuryDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1.5">
                  Diagnóstico Nosológico (Consenso Múnich / UEFA / FIFA)
                </label>
                <select
                  value={selectedTypeCode}
                  onChange={(e) => setSelectedTypeCode(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-semibold cursor-pointer"
                >
                  {diagnosticTypes.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.name} ({t.minDays}–{t.maxDays} días estimados)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-bold mb-1.5">Gravedad Clínica</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Leve', 'Moderada', 'Grave'] as const).map((sev) => (
                      <button
                        key={sev}
                        type="button"
                        onClick={() => setSeverity(sev)}
                        className={`py-2 rounded-xl text-center font-bold transition-all cursor-pointer ${
                          severity === sev
                            ? 'bg-rose-950 border border-rose-500 text-rose-300'
                            : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {sev}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col justify-center">
                  <label className="flex items-center gap-2 cursor-pointer pt-4">
                    <input
                      type="checkbox"
                      checked={isRecurrence}
                      onChange={(e) => setIsRecurrence(e.target.checked)}
                      className="w-4 h-4 rounded text-rose-600 bg-slate-900 border-slate-700"
                    />
                    <span className="font-bold text-white">¿Es una recidiva / recaída?</span>
                  </label>

                  {isRecurrence && existingInjuries.length > 0 && (
                    <select
                      value={parentInjuryId}
                      onChange={(e) => setParentInjuryId(e.target.value)}
                      className="mt-2 w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-slate-300 text-xs"
                    >
                      <option value="">Seleccionar lesión previa relacionada...</option>
                      {existingInjuries.map((inj) => (
                        <option key={inj.id} value={inj.id}>
                          {inj.injuryType} ({inj.injuryDate})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1.5">Mecanismo Lesional</label>
                <textarea
                  rows={2}
                  value={mechanismDetails}
                  onChange={(e) => setMechanismDetails(e.target.value)}
                  placeholder="Detallar gesto deportivo, momento del partido/entreno y carga previa..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>
            </div>
          )}

          {/* =========================================================================
              PASO 3: EVALUACIÓN CLÍNICA INICIAL
              ========================================================================= */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                  Cuadricula de Dolor (Escala EVA 0 a 10)
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-slate-400">Reposo</span>
                      <span className="text-emerald-400">{painAtRest}/10</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      value={painAtRest}
                      onChange={(e) => setPainAtRest(Number(e.target.value))}
                      className="w-full accent-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-slate-400">Palpación</span>
                      <span className="text-amber-400">{painOnPalpation}/10</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      value={painOnPalpation}
                      onChange={(e) => setPainOnPalpation(Number(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-slate-400">Contracción</span>
                      <span className="text-rose-400">{painOnContraction}/10</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      value={painOnContraction}
                      onChange={(e) => setPainOnContraction(Number(e.target.value))}
                      className="w-full accent-rose-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-slate-400">Estiramiento</span>
                      <span className="text-rose-400">{painOnStretch}/10</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      value={painOnStretch}
                      onChange={(e) => setPainOnStretch(Number(e.target.value))}
                      className="w-full accent-rose-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1.5">Hallazgos Clínicos a la Exploración</label>
                <textarea
                  rows={2}
                  value={clinicalFindings}
                  onChange={(e) => setClinicalFindings(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1.5">Examinador / Profesional Responsable</label>
                <input
                  type="text"
                  value={examinerName}
                  onChange={(e) => setExaminerName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>
            </div>
          )}

          {/* =========================================================================
              PASO 4: PRUEBAS MÉDICAS Y PRONÓSTICO
              ========================================================================= */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <HeartPulse size={14} />
                    Pronóstico Orientativo Científico (FIFA / BJSM)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 font-mono font-bold text-[10px]">
                    {recoveryEstimation.rangeLabel || '21–42 días'}
                  </span>
                </div>

                <div className="text-[11px] text-slate-300 space-y-1">
                  <p>Previsión estimada de retorno: <strong className="text-white">{recoveryEstimation.estimatedReturnFrom}</strong> hasta <strong className="text-white">{recoveryEstimation.estimatedReturnTo}</strong></p>
                  <p className="text-[10px] text-slate-400 italic leading-relaxed">
                    {recoveryEstimation.disclaimer}
                  </p>
                </div>
              </div>

              {/* Registro opcional de prueba médica */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasMedicalTest}
                    onChange={(e) => setHasMedicalTest(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-700"
                  />
                  <span className="font-bold text-white">Adjuntar Prueba Complementaria de Imagen (Ecografía / RM)</span>
                </label>

                {hasMedicalTest && (
                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">Tipo de Prueba</label>
                        <select
                          value={medicalTestType}
                          onChange={(e) => setMedicalTestType(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white text-xs"
                        >
                          <option value="ecografia">Ecografía</option>
                          <option value="resonancia_magnetica">Resonancia Magnética (RM)</option>
                          <option value="radiografia">Radiografía</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">Resumen del Informe</label>
                        <input
                          type="text"
                          value={medicalTestSummary}
                          onChange={(e) => setMedicalTestSummary(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Hallazgo Radiológico Clave</label>
                      <input
                        type="text"
                        value={medicalTestFindings}
                        onChange={(e) => setMedicalTestFindings(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =========================================================================
              PASO 5: RESUMEN CLÍNICO Y CONFIRMACIÓN
              ========================================================================= */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#0e131d] border border-slate-800 space-y-3">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                  Resumen de la Ficha de Alta Lesional
                </span>

                <div className="grid grid-cols-2 gap-2 text-slate-300 text-[11px]">
                  <p>Jugador: <strong className="text-white">{player.name}</strong></p>
                  <p>Fecha lesión: <strong className="text-white">{injuryDate}</strong></p>
                  <p>Estructura: <strong className="text-white">{currentZone.name}</strong></p>
                  <p>Lateralidad: <strong className="text-white">{laterality}</strong></p>
                  <p>Diagnóstico: <strong className="text-emerald-400">{selectedType.name}</strong></p>
                  <p>Gravedad: <strong className="text-rose-400">{severity}</strong></p>
                  <p>Dolor palpación: <strong className="text-amber-400">{painOnPalpation}/10</strong></p>
                  <p>Retorno estimado: <strong className="text-white">{recoveryEstimation.estimatedReturnTo}</strong></p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-300 text-[11px] leading-relaxed">
                Al confirmar, se creará el episodio clínico en <strong>player_injuries</strong>, se vincularán los catálogos normalizados y se asentará la primera transición de estado en el historial médico.
              </div>
            </div>
          )}
        </div>

        {/* Barra de Navegación Inferior */}
        <div className="px-6 py-4 bg-[#0e131d] border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            disabled={step === 1 || submitting}
            onClick={handleBack}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 transition-colors"
          >
            <ChevronLeft size={16} />
            <span>Anterior</span>
          </button>

          {step < 5 ? (
            <button
              type="button"
              disabled={submitting}
              onClick={handleNext}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 transition-all shadow-md shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer"
            >
              <span>Siguiente</span>
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={handleSave}
              className="px-6 py-2 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/40 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 size={16} />
              <span>{submitting ? 'Registrando en Base de Datos...' : 'Confirmar y Dar de Alta Episodio'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
