'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Activity,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Plus,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Award,
  Zap,
  Check,
  X,
  RefreshCw,
  FileText
} from 'lucide-react';
import {
  PlayerInjuryDTO,
  getInjuryRtsDetailsAction,
  addRehabilitationSessionAction,
  saveRtsMilestoneCriteriaAction,
  advanceRtsPhaseAction,
  EpisodeRtsDetailsDTO,
  RtsCriteriaItem,
  InjuryRehabSessionDTO
} from '@/app/actions/injury-actions';

interface RtsRehabilitationDashboardProps {
  injury: PlayerInjuryDTO;
  onInjuryUpdated?: () => void;
}

// Las 8 Fases Deportivas
const RTS_PHASES = [
  { id: 'fase_1_aguda', name: 'Fase 1: Aguda', desc: 'Control del dolor y protección' },
  { id: 'fase_2_rehabilitacion', name: 'Fase 2: Recuperación', desc: 'Movilidad y control inflamatorio' },
  { id: 'fase_3_fuerza', name: 'Fase 3: Rehabilitación', desc: 'Recuperación de ROM y fuerza' },
  { id: 'fase_4_readaptacion', name: 'Fase 4: Readaptación', desc: 'Carga de campo sin contacto' },
  { id: 'fase_5_entrenamiento_parcial', name: 'Fase 5: Entreno Parcial', desc: 'Integración progresiva con grupo' },
  { id: 'fase_6_entrenamiento_completo', name: 'Fase 6: Entreno Completo', desc: 'Sesiones colectivas al 100%' },
  { id: 'fase_7_rts', name: 'Fase 7: Return to Sport', desc: 'Disponibilidad competitiva' },
  { id: 'fase_8_performance', name: 'Fase 8: Performance', desc: 'Rendimiento basal óptimo' },
];

export function RtsRehabilitationDashboard({
  injury,
  onInjuryUpdated,
}: RtsRehabilitationDashboardProps) {
  const [data, setData] = useState<EpisodeRtsDetailsDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeStage, setActiveStage] = useState<string>(injury.rts_phase || 'fase_1_aguda');
  const [isSessionModalOpen, setIsSessionModalOpen] = useState<boolean>(false);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState<boolean>(false);

  // Formulario de nueva sesión de readaptación
  const [sessionDate, setSessionDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [specialistName, setSpecialistName] = useState<string>('Readaptador Físico / Fisioterapeuta');
  const [sessionType, setSessionType] = useState<string>('campo_readaptacion');
  const [totalDuration, setTotalDuration] = useState<number>(45);
  const [rpeLoad, setRpeLoad] = useState<number>(6);
  const [painExperienced, setPainExperienced] = useState<number>(1);
  const [exercisesSummary, setExercisesSummary] = useState<string>('Carrera continua + aceleraciones lineales al 75% + trabajo excéntrico');
  const [tolerance, setTolerance] = useState<string>('optima');
  const [sessionSubmitting, setSessionSubmitting] = useState<boolean>(false);

  // Formulario de avance de fase
  const [advanceReason, setAdvanceReason] = useState<string>('Criterios clínicos y de campo superados sin dolor ni derrame.');
  const [markRecovered, setMarkRecovered] = useState<boolean>(false);
  const [advanceSubmitting, setAdvanceSubmitting] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getInjuryRtsDetailsAction(injury.id);
      if (res.success && res.rtsDetails) {
        setData(res.rtsDetails);
        setActiveStage(res.rtsDetails.currentPhase);
      }
    } catch (err) {
      console.error('Error cargando RTS:', err);
    } finally {
      setLoading(false);
    }
  }, [injury.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Criterios específicos según la estructura lesional
  const defaultCriteriaForInjury: RtsCriteriaItem[] = useMemo(() => {
    const bs = (injury.bodyStructure || '').toLowerCase();
    const it = (injury.injuryType || '').toLowerCase();

    if (bs.includes('isquio') || it.includes('isquio')) {
      return [
        { id: 'crit_1', category: 'dolor', label: 'Dolor a la palpación y contracción isométrica 0/10', status: 'cumplido', evidence: 'Exploración negativa' },
        { id: 'crit_2', category: 'rom', label: 'Test de Askling H-Test (flexibilidad dinámica) sin aprensión', status: 'cumplido', evidence: 'Simétrico al contralateral' },
        { id: 'crit_3', category: 'fuerza', label: 'Fuerza excéntrica en Nordic Hamstring / dinamometría ≥90%', status: 'pendiente', evidence: 'Actual: 88% simetría' },
        { id: 'crit_4', category: 'campo', label: 'Sprint a máxima velocidad lineal (≥95% V-max) sin dolor', status: 'pendiente', evidence: 'Completado al 85%' },
        { id: 'crit_5', category: 'confianza', label: 'Escala de confianza del futbolista (ACL-RSI / I-PRRS) ≥85/100', status: 'cumplido', evidence: 'Puntuación 90/100' },
      ];
    } else if (bs.includes('recto') || bs.includes('cuad')) {
      return [
        { id: 'crit_1', category: 'dolor', label: 'Palpación y contracción en extensión de rodilla 0/10', status: 'cumplido' },
        { id: 'crit_2', category: 'rom', label: 'Flexión de rodilla en prono (Test de Ely) simétrica', status: 'cumplido' },
        { id: 'crit_3', category: 'fuerza', label: 'Dinamometría de cuádriceps ≥90% simetría bilateral', status: 'pendiente' },
        { id: 'crit_4', category: 'campo', label: 'Golpeo de balón a máxima potencia y pases largos indoloros', status: 'pendiente' },
        { id: 'crit_5', category: 'campo', label: 'Desaceleraciones bruscas reactivas sin molestia', status: 'no_cumplido' },
      ];
    } else if (bs.includes('cruzado') || bs.includes('lca') || bs.includes('menisco')) {
      return [
        { id: 'crit_1', category: 'rom', label: 'Extensión completa (0º) y flexión simétrica (≥135º)', status: 'cumplido' },
        { id: 'crit_2', category: 'campo', label: 'Batería de Saltos Unipodales (Hop Tests) ≥90% LSI', status: 'pendiente' },
        { id: 'crit_3', category: 'fuerza', label: 'Ratio Isquios/Cuádriceps ≥0.60 en dinamometría', status: 'pendiente' },
        { id: 'crit_4', category: 'campo', label: 'Agilidad en T-Test / Illinois Agility sin aprensión', status: 'pendiente' },
        { id: 'crit_5', category: 'especifico', label: 'Ausencia total de derrame articular post-esfuerzo de 48h', status: 'cumplido' },
      ];
    }

    // Genérico muscular / articular
    return [
      { id: 'crit_1', category: 'dolor', label: 'Ausencia de dolor en reposo y a la palpación', status: 'cumplido' },
      { id: 'crit_2', category: 'rom', label: 'Rango de movimiento completo y simétrico', status: 'cumplido' },
      { id: 'crit_3', category: 'fuerza', label: 'Fuerza funcional evaluada objetivamente ≥90%', status: 'pendiente' },
      { id: 'crit_4', category: 'campo', label: 'Tolerancia completa a 3 entrenamientos de alta intensidad', status: 'pendiente' },
    ];
  }, [injury]);

  // Criterios actuales del hito
  const currentMilestone = data?.milestones.find((m) => m.stage === activeStage);
  const criteriaList: RtsCriteriaItem[] = currentMilestone?.criteriaChecklist.length
    ? currentMilestone.criteriaChecklist
    : defaultCriteriaForInjury;

  // Porcentaje cumplido
  const totalCriteria = criteriaList.length;
  const fulfilledCount = criteriaList.filter((c) => c.status === 'cumplido').length;
  const percentageFulfilled = totalCriteria > 0 ? Math.round((fulfilledCount / totalCriteria) * 100) : 0;

  // Actualizar estado de un criterio individual
  const handleToggleCriterion = async (critId: string, newStatus: RtsCriteriaItem['status']) => {
    const updated = criteriaList.map((c) => (c.id === critId ? { ...c, status: newStatus } : c));
    await saveRtsMilestoneCriteriaAction({
      injuryId: injury.id,
      stage: activeStage,
      status: percentageFulfilled >= 100 ? 'cumplido' : 'pendiente',
      criteriaChecklist: updated,
    });
    loadData();
  };

  // Guardar nueva sesión de rehabilitación
  const handleSaveSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setSessionSubmitting(true);
    try {
      const res = await addRehabilitationSessionAction({
        injuryId: injury.id,
        sessionDate,
        rtsPhase: activeStage,
        specialistName,
        sessionType,
        totalDurationMinutes: totalDuration,
        rpeLoad,
        painExperienced,
        exercisesSummary,
        tolerance,
      });
      if (res.success) {
        loadData();
        setIsSessionModalOpen(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSessionSubmitting(false);
    }
  };

  // Avanzar fase RTS
  const handleAdvancePhase = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdvanceSubmitting(true);
    try {
      const currentIndex = RTS_PHASES.findIndex((p) => p.id === activeStage);
      const nextPhaseId = currentIndex < RTS_PHASES.length - 1 ? RTS_PHASES[currentIndex + 1].id : activeStage;

      const res = await advanceRtsPhaseAction({
        injuryId: injury.id,
        newPhase: nextPhaseId,
        reason: advanceReason,
        markRecoveredIfFinal: markRecovered,
      });

      if (res.success) {
        loadData();
        onInjuryUpdated?.();
        setIsAdvanceModalOpen(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAdvanceSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-80 bg-[#0b0f17] border border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-400 gap-2">
        <RefreshCw size={24} className="animate-spin text-emerald-400" />
        <span className="text-xs font-bold">Cargando progresión Return to Sport...</span>
      </div>
    );
  }

  const currentPhaseIndex = RTS_PHASES.findIndex((p) => p.id === (data?.currentPhase || 'fase_1_aguda'));

  return (
    <div className="w-full bg-[#0b0f17] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-6">
      {/* 1. Cabecera RTS con KPIs de Carga y Tolerancia */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 font-mono">
              RETURN TO SPORT & READAPTACIÓN
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">
              Progresión por Criterios
            </span>
          </div>
          <h2 className="text-lg font-black text-white tracking-tight">
            Fase Actual: {RTS_PHASES[currentPhaseIndex]?.name || 'Fase 1'}
          </h2>
          <p className="text-xs text-slate-400">
            {RTS_PHASES[currentPhaseIndex]?.desc}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsSessionModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 border border-slate-800 hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Plus size={14} />
            <span>Registrar Sesión Campo</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAdvanceModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 shadow-md shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <ShieldCheck size={15} />
            <span>Avanzar Fase / Alta</span>
          </button>
        </div>
      </div>

      {/* 2. Stepper Visual de las 8 Fases Deportivas */}
      <div className="space-y-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
          Línea de Progresión Deportiva (8 Fases)
        </span>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 p-1.5 bg-[#080b11] border border-slate-800 rounded-2xl">
          {RTS_PHASES.map((p, idx) => {
            const isCompleted = idx < currentPhaseIndex;
            const isCurrent = idx === currentPhaseIndex;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setActiveStage(p.id)}
                className={`p-2 rounded-xl text-center transition-all cursor-pointer flex flex-col items-center justify-between min-h-[64px] border ${
                  isCurrent
                    ? 'bg-emerald-950/80 border-emerald-500 text-white ring-1 ring-emerald-500/40 shadow-xs'
                    : isCompleted
                    ? 'bg-slate-900/60 border-slate-800 text-emerald-400'
                    : 'bg-slate-950 border-slate-900 text-slate-600 hover:text-slate-400'
                }`}
              >
                <span className="text-[9px] font-bold font-mono">Fase {idx + 1}</span>
                <span className="text-[10px] font-black line-clamp-1 leading-tight">
                  {p.name.split(':')[1]?.trim() || p.name}
                </span>
                <span className="text-[9px]">
                  {isCompleted ? '✓ Superada' : isCurrent ? '● Activa' : '○ Pendiente'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Panel Central de Trabajo: Criterios Objetivos + Métricas de Carga */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* COLUMNA IZQUIERDA: CHECKLIST INTELIGENTE ADAPTADO A LA LESIÓN */}
        <div className="lg:col-span-7 space-y-3.5">
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Criterios de Validación</span>
              <h3 className="text-sm font-black text-white">
                Checklist Específico: {injury.bodyStructure}
              </h3>
            </div>

            <div className="text-right">
              <span className="text-lg font-black text-emerald-400 font-mono">
                {percentageFulfilled}%
              </span>
              <span className="block text-[10px] text-slate-400">
                {fulfilledCount} de {totalCriteria} cumplidos
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {criteriaList.map((crit) => (
              <div
                key={crit.id}
                className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold uppercase px-2 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                      {crit.category}
                    </span>
                    <span className="font-bold text-white leading-tight">
                      {crit.label}
                    </span>
                  </div>
                  {crit.evidence && (
                    <span className="text-[10px] text-slate-400 block italic">
                      Evidencia registrada: {crit.evidence}
                    </span>
                  )}
                </div>

                {/* Botones de Selección de Estado */}
                <div className="flex items-center gap-1 shrink-0 bg-slate-950 p-1 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleToggleCriterion(crit.id, 'cumplido')}
                    className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      crit.status === 'cumplido'
                        ? 'bg-emerald-900 text-emerald-200 shadow-xs'
                        : 'text-slate-500 hover:text-white'
                    }`}
                  >
                    Cumplido
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleCriterion(crit.id, 'pendiente')}
                    className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      crit.status === 'pendiente'
                        ? 'bg-amber-900 text-amber-200 shadow-xs'
                        : 'text-slate-500 hover:text-white'
                    }`}
                  >
                    Pendiente
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleCriterion(crit.id, 'no_cumplido')}
                    className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      crit.status === 'no_cumplido'
                        ? 'bg-rose-900 text-rose-200 shadow-xs'
                        : 'text-slate-500 hover:text-white'
                    }`}
                  >
                    No Cumple
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-[10px] text-slate-400 leading-relaxed italic">
            Nota Ética: El porcentaje de criterios cumplidos es un soporte informativo para el cuerpo técnico. La decisión de alta y paso a competición requiere siempre la confirmación clínica explícita del profesional.
          </div>
        </div>

        {/* COLUMNA DERECHA: CARGA DE TRABAJO, RPE Y RESPUESTA AL ESFUERZO */}
        <div className="lg:col-span-5 space-y-3.5">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Tolerancia a la Carga (Últimas Sesiones)
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block">RPE Medio (Borg)</span>
                <span className="text-xl font-black text-emerald-400 font-mono">
                  {data?.averageRpe || 6.2}
                </span>
                <span className="text-[9px] text-slate-500">sobre 10</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block">Dolor Medio en Sesión</span>
                <span className="text-xl font-black text-emerald-400 font-mono">
                  {data?.averageSessionPain || 0.8}
                </span>
                <span className="text-[9px] text-slate-500">sobre 10</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-[11px] text-emerald-300 flex items-center gap-2">
              <TrendingDown size={16} className="text-emerald-400 shrink-0" />
              <span>Respuesta adaptativa favorable: la carga aumenta mientras el dolor se mantiene bajo control.</span>
            </div>
          </div>

          {/* Historial de Sesiones de Readaptación */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">
              Sesiones Registradas ({data?.sessions.length || 0})
            </span>

            {data?.sessions.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-slate-500 text-xs">
                No hay sesiones de readaptación registradas aún.
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800 text-xs">
                {data?.sessions.map((sess) => (
                  <div key={sess.id} className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">
                        {sess.sessionDate} • {sess.totalDurationMinutes || 45} min
                      </span>
                      <span className="text-[10px] font-mono font-bold text-emerald-400">
                        RPE: {sess.rpeLoad}/10 | Dolor: {sess.painExperienced}/10
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 line-clamp-2">
                      {sess.exercisesSummary}
                    </p>
                    <span className="text-[9px] text-slate-500 block">
                      Responsable: {sess.specialistName || 'Readaptador'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Modal para Añadir Sesión de Readaptación */}
      {isSessionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-lg bg-[#0b0f17] border border-slate-800 rounded-3xl shadow-2xl p-6 space-y-4 text-slate-200 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-black text-white">Registrar Sesión de Readaptación</h3>
              <button
                type="button"
                onClick={() => setIsSessionModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveSession} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Fecha</label>
                  <input
                    type="date"
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Duración (min)</label>
                  <input
                    type="number"
                    value={totalDuration}
                    onChange={(e) => setTotalDuration(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Carga RPE (Borg 1-10)</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={rpeLoad}
                    onChange={(e) => setRpeLoad(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Dolor Percibido (0-10)</label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={painExperienced}
                    onChange={(e) => setPainExperienced(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Trabajo Realizado / Tareas</label>
                <textarea
                  rows={3}
                  value={exercisesSummary}
                  onChange={(e) => setExercisesSummary(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSessionModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={sessionSubmitting}
                  className="px-5 py-2 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-500 cursor-pointer disabled:opacity-50"
                >
                  {sessionSubmitting ? 'Guardando...' : 'Asentar Sesión'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal de Decisión Profesional: Avanzar Fase / Alta */}
      {isAdvanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-lg bg-[#0b0f17] border border-slate-800 rounded-3xl shadow-2xl p-6 space-y-4 text-slate-200 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-black text-white">Registrar Decisión de Retorno / Avance de Fase</h3>
              <button
                type="button"
                onClick={() => setIsAdvanceModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAdvancePhase} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Progresión Actual</span>
                <p className="text-white font-semibold">
                  Cumplimiento de Criterios: <strong className="text-emerald-400">{percentageFulfilled}%</strong>
                </p>
                <p className="text-slate-400 text-[11px]">
                  El avance asienta la decisión clínica formal en <strong>injury_status_history</strong> vinculada a tu firma.
                </p>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Criterios Clínicos y Motivo del Avance</label>
                <textarea
                  rows={3}
                  value={advanceReason}
                  onChange={(e) => setAdvanceReason(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/40">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={markRecovered}
                    onChange={(e) => setMarkRecovered(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-700"
                  />
                  <span className="font-bold text-white">Declarar Alta Médica Completa (Apto para competir)</span>
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdvanceModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={advanceSubmitting}
                  className="px-5 py-2 rounded-xl font-black text-white bg-emerald-600 hover:bg-emerald-500 cursor-pointer disabled:opacity-50"
                >
                  {advanceSubmitting ? 'Asentando...' : 'Confirmar Decisión Clínica'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
