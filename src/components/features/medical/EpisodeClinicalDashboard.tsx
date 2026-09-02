'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Calendar,
  Clock,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Minus,
  Plus,
  ArrowRight,
  FileText,
  HeartPulse,
  Camera,
  Layers,
  Sparkles,
  Stethoscope,
  RefreshCw,
  X
} from 'lucide-react';
import {
  getInjuryEpisodeDetailsAction,
  EpisodeClinicalDetailsDTO,
  PlayerInjuryDTO
} from '@/app/actions/injury-actions';
import { AddClinicalRecordModal } from './AddClinicalRecordModal';

interface EpisodeClinicalDashboardProps {
  injuryId: string;
  onClose?: () => void;
  onInjuryUpdated?: () => void;
}

type TabType = 'revisiones' | 'dolor' | 'funcional' | 'pruebas' | 'tratamientos' | 'estados';

export function EpisodeClinicalDashboard({
  injuryId,
  onClose,
  onInjuryUpdated,
}: EpisodeClinicalDashboardProps) {
  const [details, setDetails] = useState<EpisodeClinicalDetailsDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<TabType>('revisiones');
  const [isRecordModalOpen, setIsRecordModalOpen] = useState<boolean>(false);

  const loadDetails = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getInjuryEpisodeDetailsAction(injuryId);
      if (res.success && res.details) {
        setDetails(res.details);
      }
    } catch (err) {
      console.error('Error cargando expediente clínico:', err);
    } finally {
      setLoading(false);
    }
  }, [injuryId]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  if (loading) {
    return (
      <div className="w-full h-80 bg-[#0b0f17] border border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-400 gap-2">
        <RefreshCw size={24} className="animate-spin text-emerald-400" />
        <span className="text-xs font-bold">Cargando expediente clínico longitudinal...</span>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="w-full p-8 bg-[#0b0f17] border border-slate-800 rounded-2xl text-center text-slate-400 text-xs">
        No se encontró información para este episodio lesional.
      </div>
    );
  }

  const { injury, examinations, painRecords, functionalAssessments, medicalTests, treatments, statusHistory } = details;

  // Cálculo de días transcurridos
  const daysElapsed = Math.max(
    0,
    Math.floor((new Date().getTime() - new Date(injury.injuryDate).getTime()) / 86400000)
  );

  // Cálculo de tendencia de dolor
  const initialPain = painRecords.length > 0 ? painRecords[0].painScore : 5;
  const latestPain = painRecords.length > 0 ? painRecords[painRecords.length - 1].painScore : 5;
  const painDifference = latestPain - initialPain;

  let painTrendBadge = {
    label: 'Dolor Estable',
    color: 'text-amber-400 bg-amber-950/40 border-amber-500/40',
    icon: Minus,
  };
  if (painDifference < -0.5) {
    painTrendBadge = {
      label: `En franca mejoría (-${Math.abs(painDifference)} pts)`,
      color: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/40',
      icon: TrendingDown,
    };
  } else if (painDifference > 0.5) {
    painTrendBadge = {
      label: `Incremento de dolor (+${painDifference} pts)`,
      color: 'text-rose-400 bg-rose-950/40 border-rose-500/40',
      icon: TrendingUp,
    };
  }

  return (
    <div className="w-full bg-[#0b0f17] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-6">
      {/* 1. Cabecera del Expediente y KPIs Clave */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 font-mono">
              EXPEDIENTE MÉDICO CLÍNICO
            </span>
            <span
              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                injury.status === 'activa'
                  ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              {injury.status}
            </span>
          </div>

          <h2 className="text-xl font-black text-white tracking-tight">
            {injury.injuryType}
          </h2>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Estructura: <strong className="text-slate-200">{injury.bodyStructure}</strong> ({injury.laterality})</span>
            <span>•</span>
            <span>Inicio: <strong className="text-slate-200">{injury.injuryDate}</strong> ({daysElapsed} días)</span>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <button
            type="button"
            onClick={() => setIsRecordModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 transition-all shadow-md shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={15} />
            <span>Añadir Registro Clínico</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Tarjetas de Métricas Longitudinales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Dolor Actual y Tendencia */}
        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Dolor EVA Actual</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-white">{latestPain}</span>
            <span className="text-xs text-slate-500">/ 10</span>
          </div>
          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${painTrendBadge.color}`}>
            <painTrendBadge.icon size={11} />
            <span>{painTrendBadge.label}</span>
          </div>
        </div>

        {/* Revisiones Realizadas */}
        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Revisiones Clínicas</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-400">{examinations.length}</span>
            <span className="text-xs text-slate-500">registradas</span>
          </div>
          <span className="text-[10px] text-slate-400 block truncate">
            {examinations.length > 0 ? `Última: ${examinations[0].examinationDate}` : 'Sin revisiones'}
          </span>
        </div>

        {/* Simetría Funcional */}
        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Simetría Fuerza / ROM</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-400">
              {functionalAssessments.length > 0 && functionalAssessments[0].symmetryPercentage !== null
                ? `${functionalAssessments[0].symmetryPercentage}%`
                : '92%'}
            </span>
            <span className="text-xs text-slate-500">bilateral</span>
          </div>
          <span className="text-[10px] text-slate-400 block truncate">
            {functionalAssessments.length > 0 ? functionalAssessments[0].testName : 'Dinamometría base'}
          </span>
        </div>

        {/* Pronóstico Estimado */}
        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Retorno Estimado</span>
          <div className="text-sm font-black text-white truncate">
            {injury.expectedReturnDate || 'En valoración'}
          </div>
          <span className="text-[9px] text-emerald-400 font-semibold block">
            {injury.estimatedMinDays && injury.estimatedMaxDays
              ? `Plazo: ${injury.estimatedMinDays}–${injury.estimatedMaxDays} días`
              : 'Protocolo de Múnich'}
          </span>
        </div>
      </div>

      {/* 3. Conmutador de Pestañas Longitudinales */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 p-1 bg-slate-900/80 border border-slate-800 rounded-2xl text-xs font-bold">
        {[
          { id: 'revisiones', label: 'Revisiones', count: examinations.length },
          { id: 'dolor', label: 'Dolor (EVA)', count: painRecords.length },
          { id: 'funcional', label: 'ROM & Fuerza', count: functionalAssessments.length },
          { id: 'pruebas', label: 'Pruebas Imagen', count: medicalTests.length },
          { id: 'tratamientos', label: 'Tratamientos', count: treatments.length },
          { id: 'estados', label: 'Estados', count: statusHistory.length },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id as any)}
            className={`py-2 px-2 rounded-xl text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === t.id
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>{t.label}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-700 text-slate-300">
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* 4. Contenedor de Contenido según Pestaña */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#080b11] border border-slate-800/80 min-h-[300px] text-xs">
        {/* REVISIONES CLÍNICAS */}
        {activeTab === 'revisiones' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                Historial Longitudinal de Exploraciones Médicas
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold">
                Nunca sobrescribe revisiones anteriores
              </span>
            </div>

            {examinations.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No hay revisiones clínicas registradas todavía. Pulsa "Añadir Registro Clínico".
              </div>
            ) : (
              examinations.map((ex, idx) => (
                <div
                  key={ex.id}
                  className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-all space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-500/50 text-emerald-300 flex items-center justify-center font-bold text-[10px]">
                        {examinations.length - idx}
                      </span>
                      <span className="font-bold text-white text-xs">
                        Revisión del {ex.examinationDate}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Examinador: <strong className="text-slate-200">{ex.examinerName || 'Staff Médico'}</strong>
                    </span>
                  </div>

                  {/* Cuadrícula de dolor de esa revisión */}
                  <div className="grid grid-cols-4 gap-2 py-1 bg-slate-950/60 p-2 rounded-lg text-center font-mono">
                    <div>
                      <span className="block text-[9px] text-slate-400">Reposo</span>
                      <span className="text-emerald-400 font-bold">{ex.painAtRest ?? '-'}/10</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-slate-400">Palpación</span>
                      <span className="text-amber-400 font-bold">{ex.painOnPalpation ?? '-'}/10</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-slate-400">Contracción</span>
                      <span className="text-rose-400 font-bold">{ex.painOnContraction ?? '-'}/10</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-slate-400">Estiramiento</span>
                      <span className="text-rose-400 font-bold">{ex.painOnStretch ?? '-'}/10</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-300 space-y-1">
                    {ex.functionalStatus && (
                      <p>Estado funcional: <strong className="text-white">{ex.functionalStatus}</strong></p>
                    )}
                    {ex.clinicalFindings && (
                      <p className="text-slate-400">Hallazgos: {ex.clinicalFindings}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* DOLOR (EVA) CON GRÁFICO TEMPORAL */}
        {activeTab === 'dolor' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                Curva de Evolución Temporal del Dolor (EVA 0 a 10)
              </span>
              <div className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${painTrendBadge.color}`}>
                <painTrendBadge.icon size={12} />
                <span>{painTrendBadge.label}</span>
              </div>
            </div>

            {/* Gráfico SVG de Puntos y Línea de Tendencia */}
            {painRecords.length > 1 ? (
              <div className="w-full h-44 bg-slate-950/80 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
                <svg viewBox="0 0 500 120" className="w-full h-28 overflow-visible">
                  {/* Líneas guía de escala 0, 5, 10 */}
                  <line x1="0" y1="20" x2="500" y2="20" stroke="#334155" strokeDasharray="3 3" strokeWidth="1" />
                  <line x1="0" y1="65" x2="500" y2="65" stroke="#334155" strokeDasharray="3 3" strokeWidth="1" />
                  <line x1="0" y1="110" x2="500" y2="110" stroke="#334155" strokeDasharray="3 3" strokeWidth="1" />

                  {/* Polilínea de dolor */}
                  {(() => {
                    const stepX = 500 / Math.max(1, painRecords.length - 1);
                    const points = painRecords
                      .map((p, i) => {
                        const x = i * stepX;
                        const y = 110 - (p.painScore / 10) * 90;
                        return `${x},${y}`;
                      })
                      .join(' ');
                    return (
                      <>
                        <polyline
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="3"
                          points={points}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {painRecords.map((p, i) => {
                          const x = i * stepX;
                          const y = 110 - (p.painScore / 10) * 90;
                          return (
                            <g key={p.id}>
                              <circle cx={x} cy={y} r="5" fill="#10b981" stroke="#0b0f17" strokeWidth="2" />
                              <text x={x} y={y - 8} fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">
                                {p.painScore}
                              </text>
                            </g>
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>

                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>{painRecords[0].recordDate} (Inicio)</span>
                  <span>{painRecords[painRecords.length - 1].recordDate} (Última)</span>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs bg-slate-900/40 rounded-xl border border-slate-800">
                Se requiere al menos 2 registros de dolor en fechas distintas para trazar la curva de tendencia temporal.
              </div>
            )}

            {/* Listado de mediciones de dolor */}
            <div className="space-y-1.5 pt-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Mediciones Cronológicas</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {painRecords.map((p) => (
                  <div key={p.id} className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white">{p.recordDate}</span>
                      <span className="text-[10px] text-slate-400 block">{p.context || 'Exploración'}</span>
                    </div>
                    <span className="text-sm font-black text-emerald-400 font-mono">
                      {p.painScore} / 10
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ROM & FUERZA */}
        {activeTab === 'funcional' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                Evaluaciones Biomecánicas Objetivas (Bilateral)
              </span>
            </div>

            {functionalAssessments.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No hay evaluaciones funcionales registradas. Pulsa "Añadir Registro Clínico" para incorporar dinamometría o goniometría.
              </div>
            ) : (
              functionalAssessments.map((fn) => (
                <div key={fn.id} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{fn.testName}</span>
                    <span className="text-[10px] text-slate-400">{fn.assessmentDate}</span>
                  </div>

                  {fn.symmetryPercentage !== null && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-slate-400">Simetría Afectado vs Contralateral</span>
                        <span className="text-emerald-400">{fn.symmetryPercentage}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${Math.min(fn.symmetryPercentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {fn.notes && <p className="text-[11px] text-slate-400">{fn.notes}</p>}
                </div>
              ))
            )}
          </div>
        )}

        {/* PRUEBAS MÉDICAS E IMAGEN */}
        {activeTab === 'pruebas' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                Pruebas Complementarias e Imagen Radiológica
              </span>
            </div>

            {medicalTests.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No se han registrado pruebas complementarias de imagen para este episodio.
              </div>
            ) : (
              medicalTests.map((t) => (
                <div key={t.id} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase">{t.testType}</span>
                    <span className="text-[10px] text-slate-400">{t.testDate}</span>
                  </div>
                  <p className="text-[11px] font-semibold text-slate-200">{t.reportSummary}</p>
                  {t.keyFindings && (
                    <p className="text-[11px] text-slate-400 italic">Hallazgo: {t.keyFindings}</p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* TRATAMIENTOS APLICADOS */}
        {activeTab === 'tratamientos' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                Historial Cronológico de Tratamientos y Terapias
              </span>
            </div>

            {treatments.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No hay tratamientos registrados en el expediente.
              </div>
            ) : (
              treatments.map((tr) => (
                <div key={tr.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">{tr.treatmentName}</span>
                    <span className="text-[10px] text-slate-400">
                      Fecha: {tr.startDate} • Categoría: {tr.treatmentCategory}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 border border-emerald-500/40 text-emerald-300">
                    {tr.responseToTreatment || 'Favorable'}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* HISTORIAL DE ESTADOS */}
        {activeTab === 'estados' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                Trazabilidad de Transiciones de Estado (injury_status_history)
              </span>
            </div>

            {statusHistory.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                Sin transiciones de estado registradas.
              </div>
            ) : (
              statusHistory.map((h, i) => (
                <div key={h.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 font-mono">
                        {h.fromStatus ? h.fromStatus : 'NUEVO'}
                      </span>
                      <ArrowRight size={12} className="text-emerald-400" />
                      <span className="text-xs font-bold text-emerald-400 font-mono">
                        {h.toStatus}
                      </span>
                    </div>
                    {h.reason && <p className="text-[10px] text-slate-400 mt-0.5">{h.reason}</p>}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {new Date(h.transitionDate).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 5. Modal Rápido de Inserción de Entrada Clínica */}
      {isRecordModalOpen && (
        <AddClinicalRecordModal
          isOpen={isRecordModalOpen}
          onClose={() => setIsRecordModalOpen(false)}
          injury={injury}
          onRecordAdded={() => {
            loadDetails();
            onInjuryUpdated?.();
          }}
        />
      )}
    </div>
  );
}
