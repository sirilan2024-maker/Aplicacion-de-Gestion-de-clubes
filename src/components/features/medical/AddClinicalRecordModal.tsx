'use client';

import React, { useState } from 'react';
import {
  X,
  Stethoscope,
  Activity,
  Camera,
  HeartPulse,
  TrendingUp,
  RotateCcw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  addInjuryExaminationAction,
  addFunctionalAssessmentAction,
  addMedicalTestAction,
  addInjuryTreatmentAction,
  transitionInjuryStatusAction,
  PlayerInjuryDTO
} from '@/app/actions/injury-actions';

interface AddClinicalRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  injury: PlayerInjuryDTO;
  onRecordAdded: () => void;
}

type RecordCategory = 'revision' | 'funcional' | 'prueba' | 'tratamiento' | 'estado';

export function AddClinicalRecordModal({
  isOpen,
  onClose,
  injury,
  onRecordAdded,
}: AddClinicalRecordModalProps) {
  const [category, setCategory] = useState<RecordCategory>('revision');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Campos para Revisión
  const [examDate, setExamDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [examinerName, setExaminerName] = useState<string>('Fisioterapeuta / Médico');
  const [painAtRest, setPainAtRest] = useState<number>(1);
  const [painOnPalpation, setPainOnPalpation] = useState<number>(4);
  const [painOnContraction, setPainOnContraction] = useState<number>(5);
  const [painOnStretch, setPainOnStretch] = useState<number>(4);
  const [functionalStatus, setFunctionalStatus] = useState<string>('Evolución favorable, menor dolor a la contracción isométrica');
  const [clinicalFindings, setClinicalFindings] = useState<string>('Cicatrización en curso, tono normorreactivo sin signos de edema agudo');

  // Campos para Funcional (ROM / Fuerza)
  const [funcType, setFuncType] = useState<'rom' | 'fuerza'>('fuerza');
  const [testName, setTestName] = useState<string>('Dinamometría Isométrica en Cadena Cerrada');
  const [metricValue, setMetricValue] = useState<number>(85);
  const [metricUnit, setMetricUnit] = useState<string>('Nm');
  const [symmetryPercentage, setSymmetryPercentage] = useState<number>(88);
  const [funcNotes, setFuncNotes] = useState<string>('Déficit de fuerza del 12% respecto al miembro contralateral sano');

  // Campos para Prueba de Imagen
  const [testType, setTestType] = useState<string>('ecografia');
  const [testDate, setTestDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [reportSummary, setReportSummary] = useState<string>('Ecografía de control evolutivo');
  const [keyFindings, setKeyFindings] = useState<string>('Tejido fibroso organizado, reducción del halo inflamatorio.');

  // Campos para Tratamiento
  const [treatmentName, setTreatmentName] = useState<string>('Terapia Manual + Carga Excéntrica Guiada');
  const [treatmentCategory, setTreatmentCategory] = useState<string>('fisioterapia');
  const [treatmentResponse, setTreatmentResponse] = useState<string>('favorable');

  // Campos para Cambio de Estado
  const [newStatus, setNewStatus] = useState<'activa' | 'recuperado'>('activa');
  const [newRtsPhase, setNewRtsPhase] = useState<string>('fase_2_rehabilitacion');
  const [statusReason, setStatusReason] = useState<string>('Progresión clínica favorable hacia trabajo de readaptación');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      if (category === 'revision') {
        const res = await addInjuryExaminationAction({
          injuryId: injury.id,
          playerId: injury.playerId,
          examinationDate: examDate,
          examinerName,
          painAtRest,
          painOnPalpation,
          painOnContraction,
          painOnStretch,
          functionalStatus,
          clinicalFindings,
        });
        if (!res.success) throw new Error(res.error);
      } else if (category === 'funcional') {
        const res = await addFunctionalAssessmentAction({
          injuryId: injury.id,
          assessmentDate: examDate,
          assessmentType: funcType,
          structureOrJoint: injury.bodyStructure || 'Músculo',
          laterality: injury.laterality || 'derecha',
          testName,
          metricValue,
          metricUnit,
          symmetryPercentage,
          notes: funcNotes,
        });
        if (!res.success) throw new Error(res.error);
      } else if (category === 'prueba') {
        const res = await addMedicalTestAction({
          injuryId: injury.id,
          testType,
          testDate,
          facilityOrDoctor: examinerName,
          reportSummary,
          keyFindings,
        });
        if (!res.success) throw new Error(res.error);
      } else if (category === 'tratamiento') {
        const res = await addInjuryTreatmentAction({
          injuryId: injury.id,
          treatmentName,
          treatmentCategory,
          startDate: examDate,
          professionalName: examinerName,
          responseToTreatment: treatmentResponse,
        });
        if (!res.success) throw new Error(res.error);
      } else if (category === 'estado') {
        const res = await transitionInjuryStatusAction({
          injuryId: injury.id,
          newStatus,
          newRtsPhase,
          reason: statusReason,
        });
        if (!res.success) throw new Error(res.error);
      }

      onRecordAdded();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar el registro clínico.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#0b0f17] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabecera */}
        <div className="px-6 py-4 bg-[#0e131d] border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-white tracking-tight">
              Añadir Entrada al Expediente Clínico
            </h2>
            <p className="text-xs text-slate-400">
              Episodio: <strong className="text-slate-200">{injury.injuryType}</strong> ({injury.bodyStructure})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Selector de Tipo de Entrada */}
        <div className="grid grid-cols-5 gap-1 p-2 bg-[#080b11] border-b border-slate-800 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setCategory('revision')}
            className={`py-2 px-1 rounded-xl text-center transition-all cursor-pointer ${
              category === 'revision'
                ? 'bg-emerald-950 border border-emerald-500/60 text-emerald-300'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Revisión
          </button>
          <button
            type="button"
            onClick={() => setCategory('funcional')}
            className={`py-2 px-1 rounded-xl text-center transition-all cursor-pointer ${
              category === 'funcional'
                ? 'bg-emerald-950 border border-emerald-500/60 text-emerald-300'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ROM / Fuerza
          </button>
          <button
            type="button"
            onClick={() => setCategory('prueba')}
            className={`py-2 px-1 rounded-xl text-center transition-all cursor-pointer ${
              category === 'prueba'
                ? 'bg-emerald-950 border border-emerald-500/60 text-emerald-300'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Prueba Imagen
          </button>
          <button
            type="button"
            onClick={() => setCategory('tratamiento')}
            className={`py-2 px-1 rounded-xl text-center transition-all cursor-pointer ${
              category === 'tratamiento'
                ? 'bg-emerald-950 border border-emerald-500/60 text-emerald-300'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Tratamiento
          </button>
          <button
            type="button"
            onClick={() => setCategory('estado')}
            className={`py-2 px-1 rounded-xl text-center transition-all cursor-pointer ${
              category === 'estado'
                ? 'bg-emerald-950 border border-emerald-500/60 text-emerald-300'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Estado
          </button>
        </div>

        {/* Formulario Dinámico */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 text-slate-200 text-xs">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/60 text-rose-300 flex items-center gap-2.5">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* REVISIÓN CLÍNICA */}
          {category === 'revision' && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Fecha de la Revisión</label>
                  <input
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Facultativo / Examinador</label>
                  <input
                    type="text"
                    value={examinerName}
                    onChange={(e) => setExaminerName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              {/* Dolor EVA */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                  Dolor en la Exploración (Escala EVA 0 a 10)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
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
                  <div>
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
                  <div>
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
                  <div>
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
                <label className="block text-slate-400 font-bold mb-1">Estado Funcional</label>
                <input
                  type="text"
                  value={functionalStatus}
                  onChange={(e) => setFunctionalStatus(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Hallazgos Clínicos y Evolución</label>
                <textarea
                  rows={2}
                  value={clinicalFindings}
                  onChange={(e) => setClinicalFindings(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>
            </div>
          )}

          {/* VALORACIÓN FUNCIONAL (ROM Y FUERZA) */}
          {category === 'funcional' && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Tipo de Evaluación</label>
                  <select
                    value={funcType}
                    onChange={(e) => setFuncType(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white cursor-pointer"
                  >
                    <option value="fuerza">Fuerza Muscular / Dinamometría</option>
                    <option value="rom">Rango de Movimiento (ROM)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Simetría Bilateral (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={symmetryPercentage}
                    onChange={(e) => setSymmetryPercentage(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Test o Maniobra Realizada</label>
                <input
                  type="text"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Observaciones Objetivas</label>
                <textarea
                  rows={2}
                  value={funcNotes}
                  onChange={(e) => setFuncNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>
            </div>
          )}

          {/* PRUEBA MÉDICA */}
          {category === 'prueba' && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Tipo de Prueba</label>
                  <select
                    value={testType}
                    onChange={(e) => setTestType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white cursor-pointer"
                  >
                    <option value="ecografia">Ecografía Musculoesquelética</option>
                    <option value="resonancia_magnetica">Resonancia Magnética (RM)</option>
                    <option value="radiografia">Radiografía Digital</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Fecha de Realización</label>
                  <input
                    type="date"
                    value={testDate}
                    onChange={(e) => setTestDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Resumen del Informe Radiológico</label>
                <input
                  type="text"
                  value={reportSummary}
                  onChange={(e) => setReportSummary(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Hallazgos Principales</label>
                <textarea
                  rows={2}
                  value={keyFindings}
                  onChange={(e) => setKeyFindings(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>
            </div>
          )}

          {/* TRATAMIENTO */}
          {category === 'tratamiento' && (
            <div className="space-y-3.5">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Tratamiento o Técnica Aplicada</label>
                <input
                  type="text"
                  value={treatmentName}
                  onChange={(e) => setTreatmentName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Categoría</label>
                  <select
                    value={treatmentCategory}
                    onChange={(e) => setTreatmentCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white cursor-pointer"
                  >
                    <option value="fisioterapia">Fisioterapia Manual</option>
                    <option value="invasiva">Fisioterapia Invasiva (EPI/Neuromodulación)</option>
                    <option value="ejercicio_terapeutico">Ejercicio Terapéutico</option>
                    <option value="medica">Atención Médica / Infiltración</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Tolerancia del Deportista</label>
                  <select
                    value={treatmentResponse}
                    onChange={(e) => setTreatmentResponse(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white cursor-pointer"
                  >
                    <option value="favorable">Favorable / Sin molestia residual</option>
                    <option value="moderada">Moderada con ligera molestia</option>
                    <option value="desfavorable">Dolor o intolerancia</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* CAMBIO DE ESTADO */}
          {category === 'estado' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Estado Actual</span>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-rose-900/60 text-rose-300 font-bold font-mono">
                    {injury.status}
                  </span>
                  <span className="text-slate-400">→</span>
                  <span className="text-slate-300 font-semibold">Selecciona el nuevo hito evolutivo</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Nuevo Estado</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white cursor-pointer"
                  >
                    <option value="activa">Baja Médica / En Tratamiento</option>
                    <option value="recuperado">Alta Médica (Apto)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Fase Return to Sport (RTS)</label>
                  <select
                    value={newRtsPhase}
                    onChange={(e) => setNewRtsPhase(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white cursor-pointer"
                  >
                    <option value="fase_1_aguda">Fase 1: Aguda / Tratamiento</option>
                    <option value="fase_2_rehabilitacion">Fase 2: Rehabilitación y Carga</option>
                    <option value="fase_3_readaptacion">Fase 3: Readaptación de Campo</option>
                    <option value="fase_4_entrenamiento_parcial">Fase 4: Entrenamiento Parcial con Grupo</option>
                    <option value="fase_5_retorno_total">Fase 5: Apto Competición</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Motivo / Criterios Clínicos del Cambio</label>
                <textarea
                  rows={2}
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 shadow-md shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 size={16} />
              <span>{submitting ? 'Guardando...' : 'Asentar en Expediente'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
